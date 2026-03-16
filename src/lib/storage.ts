import { Vehicle, ClaimReport } from '@/types';

const VEHICLES_KEY = 'claimwise_vehicles';
const CLAIMS_KEY = 'claimwise_claims';

export function getVehicles(): Vehicle[] {
  const data = localStorage.getItem(VEHICLES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveVehicle(vehicle: Vehicle): void {
  const vehicles = getVehicles();
  const index = vehicles.findIndex(v => v.id === vehicle.id);
  if (index >= 0) {
    vehicles[index] = vehicle;
  } else {
    vehicles.push(vehicle);
  }
  localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles));
}

export function deleteVehicle(id: string): void {
  const vehicles = getVehicles().filter(v => v.id !== id);
  localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles));
}

export function getClaims(): ClaimReport[] {
  const data = localStorage.getItem(CLAIMS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveClaim(claim: ClaimReport): void {
  const claims = getClaims();
  const index = claims.findIndex(c => c.id === claim.id);
  if (index >= 0) {
    claims[index] = claim;
  } else {
    claims.push(claim);
  }
  localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
}

export function deleteClaim(id: string): void {
  const claims = getClaims().filter(c => c.id !== id);
  localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
}

export function generateId(): string {
  return crypto.randomUUID();
}
