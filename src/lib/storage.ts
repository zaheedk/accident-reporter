import { supabase } from '@/integrations/supabase/client';
import { Vehicle, ClaimReport } from '@/types';
import { getCached, setCache } from '@/lib/offline-cache';
import {
  offlineInsert,
  offlineUpdate,
  offlineUpsert,
  offlineDelete,
} from '@/lib/offline-mutations';
import { isOnline } from '@/lib/sync-engine';
import { writeWidgetVehiclesToDevice } from '@/lib/widget-setup';

// Helper to resolve user id – uses getSession() (reads from local storage,
// no Web Lock) instead of getUser() to avoid "Lock was stolen by another
// request" AbortErrors when many callers race in parallel.
let _sessionUidPromise: Promise<string | null> | null = null;
async function resolveUserId(userId?: string): Promise<string | null> {
  if (userId) return userId;
  if (!_sessionUidPromise) {
    _sessionUidPromise = supabase.auth
      .getSession()
      .then(({ data }) => data.session?.user?.id ?? null)
      .finally(() => {
        // Release shortly after so a fresh login is picked up
        setTimeout(() => { _sessionUidPromise = null; }, 1000);
      });
  }
  return _sessionUidPromise;
}

// ── Vehicle helpers ──

export async function getVehicles(userId?: string): Promise<Vehicle[]> {
  const uid = await resolveUserId(userId);
  if (!uid) return [];
  const cacheKey = `vehicles:${uid}`;

  // Online → fetch fresh from server so callers (e.g. React Query) get the
  // canonical truth. Falls back to the IndexedDB cache only on error/offline.
  if (isOnline()) {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      // Hydrate rental partner branding for any rental-attached vehicles
      const partnerIds = Array.from(new Set(
        data.map((r: any) => r.rental_partner_id).filter(Boolean)
      ));
      const partnerMap: Record<string, any> = {};
      if (partnerIds.length) {
        const { data: partners } = await supabase
          .from('rental_partners')
          .select('id, company_name, logo_url, brand_color')
          .in('id', partnerIds);
        partners?.forEach((p: any) => { partnerMap[p.id] = p; });
      }
      const enriched = data.map((r: any) => ({ ...r, _partner: partnerMap[r.rental_partner_id] }));
      void setCache(cacheKey, enriched);
      void writeWidgetVehiclesToDevice(data);
      return enriched.map(dbVehicleToVehicle);
    }
    if (error) console.error('getVehicles', error);
    // fall through to cache on error
  }

  const cached = await getCached<any[]>(cacheKey);
  if (cached) {
    void writeWidgetVehiclesToDevice(cached);
    return cached.map((r: any) => (r.regoNumber ? r as Vehicle : dbVehicleToVehicle(r)));
  }
  return [];
}

export async function saveVehicle(vehicle: Omit<Vehicle, 'id' | 'createdAt'> & { id?: string; createdAt?: string }, userId?: string): Promise<void> {
  const uid = await resolveUserId(userId);
  if (!uid) return;

  const row = {
    user_id: uid,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    rego_number: vehicle.regoNumber,
    color: vehicle.color,
    wof_expiry: vehicle.wofExpiry || '',
    rego_expiry: vehicle.regoExpiry || '',
    finance_arrangement: vehicle.financeArrangement,
    finance_details: vehicle.financeDetails || '',
    modified: vehicle.modified,
    modification_details: vehicle.modificationDetails || '',
    insurance_company: vehicle.insuranceCompany || '',
    insurance_policy_number: vehicle.insurancePolicyNumber || '',
    insurance_expiry: vehicle.insuranceExpiry || '',
    broker_name: vehicle.brokerName || '',
    broker_email: vehicle.brokerEmail || '',
    roadside_provider: vehicle.roadsideProvider || '',
    roadside_phone: vehicle.roadsidePhone || '',
    photo_url: vehicle.photoUrl || '',
    is_active: vehicle.isActive ?? true,
    is_default: vehicle.isDefault ?? false,
  };

  if (vehicle.id) {
    await offlineUpsert('vehicles', { ...row, id: vehicle.id });
  } else {
    await offlineInsert('vehicles', row);
  }
}

export async function deleteVehicle(id: string): Promise<void> {
  await offlineDelete('vehicles', { id });
}

function dbVehicleToVehicle(row: any): Vehicle {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug || '',
    year: row.year,
    make: row.make,
    model: row.model,
    regoNumber: row.rego_number,
    color: row.color,
    wofExpiry: row.wof_expiry,
    regoExpiry: row.rego_expiry,
    financeArrangement: row.finance_arrangement,
    financeDetails: row.finance_details,
    modified: row.modified,
    modificationDetails: row.modification_details,
    insuranceCompany: row.insurance_company || '',
    insurancePolicyNumber: row.insurance_policy_number || '',
    insuranceExpiry: row.insurance_expiry || '',
    brokerName: row.broker_name || '',
    brokerEmail: row.broker_email || '',
    roadsideProvider: row.roadside_provider || '',
    roadsidePhone: row.roadside_phone || '',
    photoUrl: row.photo_url || '',
    isActive: row.is_active ?? true,
    isDefault: row.is_default ?? false,
    createdAt: row.created_at,
    rentalPartnerId: row.rental_partner_id || undefined,
    isRental: row.is_rental ?? false,
    hireStartDate: row.hire_start_date || '',
    hireEndDate: row.hire_end_date || '',
  };
}

// Set a vehicle as the default for a user. Trigger ensures uniqueness.
export async function setDefaultVehicle(vehicleId: string): Promise<void> {
  await offlineUpdate('vehicles', { is_default: true }, { id: vehicleId });
}

// ── Claim helpers ──

export async function getClaims(userId?: string): Promise<ClaimReport[]> {
  const uid = await resolveUserId(userId);
  if (!uid) return [];
  const cacheKey = `claims:${uid}`;

  // Online → fetch fresh; fall back to IndexedDB cache only on error/offline.
  if (isOnline()) {
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      void setCache(cacheKey, data);
      return data.map(dbClaimToClaim);
    }
    if (error) console.error('getClaims', error);
  }

  const cached = await getCached<any[]>(cacheKey);
  if (cached) return cached.map((r: any) => (r.incidentDate !== undefined ? (r as ClaimReport) : dbClaimToClaim(r)));
  return [];
}

export async function saveClaim(claim: ClaimReport, userId?: string): Promise<string> {
  const uid = await resolveUserId(userId);
  if (!uid) return claim.id;

  const row = {
    user_id: uid,
    status: claim.status,
    incident_date: claim.incidentDate,
    incident_time: claim.incidentTime,
    incident_location: claim.incidentLocation,
    vehicle_usage: claim.vehicleUsage,
    journey_details: claim.journeyDetails,
    description: claim.description,
    vehicle_id: claim.vehicleId,
    speed_before_braking: claim.speedBeforeBraking,
    third_parties: JSON.parse(JSON.stringify(claim.thirdParties)),
    other_property_damage: claim.otherPropertyDamage,
    other_property_owner: claim.otherPropertyOwner,
    witnesses: JSON.parse(JSON.stringify(claim.witnesses)),
    police_attended: claim.policeAttended,
    police_officer_details: claim.policeOfficerDetails,
    anyone_hurt: claim.anyoneHurt,
    injury_details: claim.injuryDetails,
    weather_condition: claim.weatherCondition,
    road_condition: claim.roadCondition,
    driver_consumed_substance: claim.driverConsumedSubstance,
    substance_details: claim.substanceDetails,
    blame_description: claim.blameDescription,
    liability_admitted: claim.liabilityAdmitted,
    liability_details: claim.liabilityDetails,
    at_fault: claim.atFault || '',
    courtesy_car_requested: claim.courtesyCarRequested || false,
    damage_description: claim.damageDescription,
    vehicle_towed: claim.vehicleTowed,
    towing_company: claim.towingCompany,
    repairer_name: claim.repairerName,
    repairer_phone: claim.repairerPhone,
    repairer_address: claim.repairerAddress,
    insurance_company: claim.insuranceCompany,
    selected_panel_shop_id: claim.selectedPanelShopId || null,
    user_claim_number: claim.userClaimNumber || '',
    incident_type: (claim as any).incidentType || '',
  };

  if (claim.id) {
    if (!isOnline()) {
      // Offline edit — queue the upsert. We can't return a fresh id, so reuse the existing one.
      await offlineUpsert('claims', { ...row, id: claim.id });
      return claim.id;
    }
    const { data } = await supabase.from('claims').upsert({ ...row, id: claim.id }).select('id').single();
    return data?.id || claim.id;
  } else {
    if (!isOnline()) {
      // Offline create — assign a client-side UUID so dependent rows can reference it.
      const tempId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await offlineInsert('claims', { ...row, id: tempId });
      return tempId;
    }
    const { data } = await supabase.from('claims').insert(row).select('id').single();
    return data?.id || '';
  }
}

export async function deleteClaim(id: string): Promise<void> {
  // Claims can have dependent rows (photos, messages, repair requests, etc.).
  // Delete dependents first to avoid FK constraint failures.
  try {
    const { data: claimPhotos, error: claimPhotosSelectError } = await supabase
      .from('claim_photos')
      .select('file_path')
      .eq('claim_id', id);

    if (!claimPhotosSelectError && claimPhotos && claimPhotos.length > 0) {
      await supabase.storage.from('claim-photos').remove(claimPhotos.map((p: any) => p.file_path));
    }
    await supabase.from('claim_photos').delete().eq('claim_id', id);

    const { data: tpPhotos, error: tpPhotosSelectError } = await supabase
      .from('tp_photos')
      .select('file_path')
      .eq('claim_id', id);

    if (!tpPhotosSelectError && tpPhotos && tpPhotos.length > 0) {
      await supabase.storage.from('tp-photos').remove(tpPhotos.map((p: any) => p.file_path));
    }
    await supabase.from('tp_photos').delete().eq('claim_id', id);

    await supabase.from('claim_messages').delete().eq('claim_id', id);
    await supabase.from('repair_requests').delete().eq('claim_id', id);

    // Delete call recordings
    const { data: callRecs } = await supabase
      .from('call_recordings')
      .select('file_path')
      .eq('claim_id', id);
    if (callRecs && callRecs.length > 0) {
      await supabase.storage.from('call-recordings').remove(callRecs.map((r: any) => r.file_path));
    }
    await supabase.from('call_recordings').delete().eq('claim_id', id);

    const { error } = await supabase.from('claims').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error('deleteClaim', error);
    throw error;
  }
}

function dbClaimToClaim(row: any): ClaimReport {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    incidentDate: row.incident_date,
    incidentTime: row.incident_time,
    incidentLocation: row.incident_location,
    vehicleUsage: row.vehicle_usage,
    journeyDetails: row.journey_details,
    description: row.description,
    vehicleId: row.vehicle_id,
    speedBeforeBraking: row.speed_before_braking,
    thirdParties: row.third_parties || [],
    otherPropertyDamage: row.other_property_damage,
    otherPropertyOwner: row.other_property_owner,
    witnesses: row.witnesses || [],
    policeAttended: row.police_attended,
    policeOfficerDetails: row.police_officer_details,
    anyoneHurt: row.anyone_hurt,
    injuryDetails: row.injury_details,
    weatherCondition: row.weather_condition,
    roadCondition: row.road_condition,
    driverConsumedSubstance: row.driver_consumed_substance,
    substanceDetails: row.substance_details,
    blameDescription: row.blame_description,
    liabilityAdmitted: row.liability_admitted,
    liabilityDetails: row.liability_details,
    atFault: row.at_fault || '',
    courtesyCarRequested: row.courtesy_car_requested || false,
    damageDescription: row.damage_description,
    vehicleTowed: row.vehicle_towed,
    towingCompany: row.towing_company,
    repairerName: row.repairer_name,
    repairerPhone: row.repairer_phone,
    repairerAddress: row.repairer_address,
    insuranceCompany: row.insurance_company || '',
    selectedPanelShopId: row.selected_panel_shop_id || '',
    userClaimNumber: row.user_claim_number || '',
  };
}
