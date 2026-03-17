import { supabase } from '@/integrations/supabase/client';
import { Vehicle, ClaimReport } from '@/types';

// ── Vehicle helpers ──

export async function getVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
  if (error) { console.error('getVehicles', error); return []; }
  return (data || []).map(dbVehicleToVehicle);
}

export async function saveVehicle(vehicle: Omit<Vehicle, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const row = {
    user_id: user.id,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    rego_number: vehicle.regoNumber,
    color: vehicle.color,
    wof_expiry: vehicle.wofExpiry,
    rego_expiry: vehicle.regoExpiry,
    finance_arrangement: vehicle.financeArrangement,
    finance_details: vehicle.financeDetails || '',
    modified: vehicle.modified,
    modification_details: vehicle.modificationDetails || '',
  };

  if (vehicle.id) {
    await supabase.from('vehicles').upsert({ ...row, id: vehicle.id });
  } else {
    await supabase.from('vehicles').insert(row);
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
    createdAt: row.created_at,
  };
}

// ── Claim helpers ──

export async function getClaims(): Promise<ClaimReport[]> {
  const { data, error } = await supabase.from('claims').select('*').order('created_at', { ascending: false });
  if (error) { console.error('getClaims', error); return []; }
  return (data || []).map(dbClaimToClaim);
}

export async function saveClaim(claim: ClaimReport): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return claim.id;

  const row = {
    user_id: user.id,
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
    damage_description: claim.damageDescription,
    vehicle_towed: claim.vehicleTowed,
    towing_company: claim.towingCompany,
    repairer_name: claim.repairerName,
    repairer_phone: claim.repairerPhone,
    repairer_address: claim.repairerAddress,
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
  await supabase.from('claims').delete().eq('id', id);
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
    damageDescription: row.damage_description,
    vehicleTowed: row.vehicle_towed,
    towingCompany: row.towing_company,
    repairerName: row.repairer_name,
    repairerPhone: row.repairer_phone,
    repairerAddress: row.repairer_address,
  };
}
