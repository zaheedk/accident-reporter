import { supabase } from '@/integrations/supabase/client';
import { Vehicle, ClaimReport } from '@/types';

// Helper to resolve user id – skips the network call when already known
async function resolveUserId(userId?: string): Promise<string | null> {
  if (userId) return userId;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── Vehicle helpers ──

export async function getVehicles(userId?: string): Promise<Vehicle[]> {
  const uid = await resolveUserId(userId);
  if (!uid) return [];
  const { data, error } = await supabase.from('vehicles').select('*').eq('user_id', uid).order('created_at', { ascending: false });
  if (error) { console.error('getVehicles', error); return []; }
  return (data || []).map(dbVehicleToVehicle);
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
    photo_url: vehicle.photoUrl || '',
    is_active: vehicle.isActive ?? true,
  };

  if (vehicle.id) {
    const { error } = await supabase.from('vehicles').upsert({ ...row, id: vehicle.id });
    if (error) { console.error('saveVehicle upsert', error); throw error; }
  } else {
    const { error } = await supabase.from('vehicles').insert(row);
    if (error) { console.error('saveVehicle insert', error); throw error; }
  }
}

export async function deleteVehicle(id: string): Promise<void> {
  await supabase.from('vehicles').delete().eq('id', id);
}

function dbVehicleToVehicle(row: any): Vehicle {
  return {
    id: row.id,
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
    photoUrl: row.photo_url || '',
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
  };
}

// ── Claim helpers ──

export async function getClaims(userId?: string): Promise<ClaimReport[]> {
  const uid = await resolveUserId(userId);
  if (!uid) return [];
  const { data, error } = await supabase.from('claims').select('*').eq('user_id', uid).order('created_at', { ascending: false });
  if (error) { console.error('getClaims', error); return []; }
  return (data || []).map(dbClaimToClaim);
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
  };

  if (claim.id) {
    const { data } = await supabase.from('claims').upsert({ ...row, id: claim.id }).select('id').single();
    return data?.id || claim.id;
  } else {
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
