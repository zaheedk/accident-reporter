export interface Vehicle {
  id: string;
  year: string;
  make: string;
  model: string;
  regoNumber: string;
  color: string;
  wofExpiry: string;
  regoExpiry: string;
  financeArrangement: boolean;
  financeDetails?: string;
  modified: boolean;
  modificationDetails?: string;
  insuranceCompany: string;
  insurancePolicyNumber: string;
  insuranceExpiry: string;
  createdAt: string;
}

export interface ThirdPartyVehicle {
  ownerName: string;
  phone: string;
  address: string;
  insurer: string;
  make: string;
  model: string;
  regoNumber: string;
  damageDescription: string;
}

export interface Witness {
  name: string;
  phone: string;
  address: string;
  isPassenger: boolean;
}

export type WeatherCondition = 'rain' | 'overcast' | 'fog' | 'bright-sun' | 'clear-night';
export type RoadCondition = 'sealed' | 'metal' | 'wet' | 'dry' | 'ice';

export interface ClaimReport {
  id: string;
  status: 'draft' | 'submitted';
  createdAt: string;
  updatedAt: string;

  // Step 1: Incident Basics
  incidentDate: string;
  incidentTime: string;
  incidentLocation: string;
  vehicleUsage: string;
  journeyDetails: string;
  description: string;

  // Step 2: Your Vehicle
  vehicleId: string;
  speedBeforeBraking: string;

  // Step 3: Third Parties
  thirdParties: ThirdPartyVehicle[];
  otherPropertyDamage: string;
  otherPropertyOwner: string;

  // Step 4: Witnesses
  witnesses: Witness[];
  policeAttended: boolean;
  policeOfficerDetails: string;
  anyoneHurt: boolean;
  injuryDetails: string;

  // Step 5: Conditions
  weatherCondition: WeatherCondition | '';
  roadCondition: RoadCondition | '';
  driverConsumedSubstance: boolean;
  substanceDetails: string;
  blameDescription: string;
  liabilityAdmitted: boolean;
  liabilityDetails: string;

  // Step 6: Damage & Repairer
  damageDescription: string;
  vehicleTowed: boolean;
  towingCompany: string;
  repairerName: string;
  repairerPhone: string;
  repairerAddress: string;
  insuranceCompany: string;
  selectedPanelShopId: string;
}

export const WEATHER_OPTIONS: { value: WeatherCondition; label: string }[] = [
  { value: 'rain', label: 'Rain' },
  { value: 'overcast', label: 'Overcast' },
  { value: 'fog', label: 'Fog' },
  { value: 'bright-sun', label: 'Bright Sun' },
  { value: 'clear-night', label: 'Clear Night' },
];

export const ROAD_OPTIONS: { value: RoadCondition; label: string }[] = [
  { value: 'sealed', label: 'Sealed' },
  { value: 'metal', label: 'Metal' },
  { value: 'wet', label: 'Wet' },
  { value: 'dry', label: 'Dry' },
  { value: 'ice', label: 'Ice' },
];
