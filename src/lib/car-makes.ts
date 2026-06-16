export type CarMake = {
  slug: string;
  name: string;
  blurb: string;
  popularModels: string[];
};

// Top vehicle makes in New Zealand by registration volume.
export const NZ_CAR_MAKES: CarMake[] = [
  { slug: 'toyota', name: 'Toyota', blurb: 'New Zealand\'s most-driven brand — Corolla, Hilux, RAV4 and Aqua dominate Kiwi roads.', popularModels: ['Corolla', 'Hilux', 'RAV4', 'Aqua', 'Camry', 'Highlander'] },
  { slug: 'ford', name: 'Ford', blurb: 'Ranger leads NZ ute sales; Mustang and Escape round out a strong local presence.', popularModels: ['Ranger', 'Mustang', 'Escape', 'Everest', 'Focus'] },
  { slug: 'holden', name: 'Holden', blurb: 'Long-loved Commodore and Captiva models still common across NZ panel shops.', popularModels: ['Commodore', 'Captiva', 'Colorado', 'Cruze', 'Astra'] },
  { slug: 'mazda', name: 'Mazda', blurb: 'Mazda3, CX-5 and BT-50 are insurance-claim regulars on Kiwi roads.', popularModels: ['Mazda3', 'CX-5', 'CX-3', 'BT-50', 'Mazda6', 'CX-9'] },
  { slug: 'nissan', name: 'Nissan', blurb: 'Navara, X-Trail and the popular Leaf EV make Nissan a top NZ make.', popularModels: ['Navara', 'X-Trail', 'Leaf', 'Qashqai', 'Tiida'] },
  { slug: 'hyundai', name: 'Hyundai', blurb: 'Tucson, Santa Fe and the i30 are mainstays for NZ families and fleets.', popularModels: ['Tucson', 'Santa Fe', 'i30', 'Kona', 'Sonata'] },
  { slug: 'mitsubishi', name: 'Mitsubishi', blurb: 'Outlander PHEV, Triton and ASX are top-sellers for Mitsubishi NZ.', popularModels: ['Outlander', 'Triton', 'ASX', 'Eclipse Cross', 'Pajero'] },
  { slug: 'honda', name: 'Honda', blurb: 'Jazz, Civic and CR-V are popular Honda picks across New Zealand.', popularModels: ['Jazz', 'Civic', 'CR-V', 'HR-V', 'Accord', 'Odyssey'] },
  { slug: 'kia', name: 'Kia', blurb: 'Sportage, Seltos and Cerato are strong sellers backed by Kia NZ\'s long warranty.', popularModels: ['Sportage', 'Seltos', 'Cerato', 'Sorento', 'Stonic', 'EV6'] },
  { slug: 'subaru', name: 'Subaru', blurb: 'Outback, Forester and Legacy — Subaru AWD is a favourite for NZ conditions.', popularModels: ['Outback', 'Forester', 'Legacy', 'XV', 'Impreza', 'WRX'] },
  { slug: 'suzuki', name: 'Suzuki', blurb: 'Swift, Vitara and Jimny are common small-car claims throughout NZ.', popularModels: ['Swift', 'Vitara', 'Jimny', 'Baleno', 'S-Cross', 'Ignis'] },
  { slug: 'volkswagen', name: 'Volkswagen', blurb: 'Golf, Tiguan and Amarok bring European engineering to NZ panel shops.', popularModels: ['Golf', 'Tiguan', 'Amarok', 'Polo', 'Touareg', 'Passat'] },
  { slug: 'bmw', name: 'BMW', blurb: '3 Series, X3 and X5 — premium repairs often require BMW-certified panel beaters.', popularModels: ['3 Series', 'X3', 'X5', '5 Series', '1 Series', 'X1'] },
  { slug: 'mercedes-benz', name: 'Mercedes-Benz', blurb: 'C-Class, GLC and E-Class — Mercedes repairs often need approved-repairer status.', popularModels: ['C-Class', 'GLC', 'E-Class', 'A-Class', 'GLA', 'S-Class'] },
  { slug: 'audi', name: 'Audi', blurb: 'A4, Q5 and A3 — Audi aluminium-body repair requires specialist panel beaters.', popularModels: ['A4', 'Q5', 'A3', 'Q3', 'A6', 'Q7'] },
  { slug: 'tesla', name: 'Tesla', blurb: 'Model 3 and Model Y — Tesla repairs require approved aluminium-body specialists.', popularModels: ['Model 3', 'Model Y', 'Model S', 'Model X'] },
  { slug: 'isuzu', name: 'Isuzu', blurb: 'D-Max and MU-X — Isuzu utes are tough but accidents still happen.', popularModels: ['D-Max', 'MU-X'] },
];

export const getMakeBySlug = (slug: string) => NZ_CAR_MAKES.find((m) => m.slug === slug);
