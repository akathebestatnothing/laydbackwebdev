export type AloraService = {
  code: string;
  name: string;
  category: string;
  durationMinutes: number;
  priceAUD: number;
  description: string | null;
  variants: readonly [];
};

export type AloraSalonData = {
  businessName: string;
  bookingUrl: string;
  address: string;
  openingHours: Readonly<Record<string, string>>;
  stylists: readonly string[];
  policies: readonly string[];
  services: readonly AloraService[];
};

// Source: live Simple Salon portal, inspected 16 Nov 2026.
// The portal exposed no descriptions, tier/length variants, stylist names,
// deposit notes, or booking-policy text; those fields intentionally stay null/empty.
export const aloraSalon: AloraSalonData = {
  businessName: 'Hair By Alora',
  bookingUrl: 'https://www.makeonlinebooking.com/location/66147/hair-by-alora',
  address: '7/17 Laycock Street, Carey Bay NSW 2283',
  openingHours: {
    Monday: 'Closed',
    Tuesday: '10:00AM - 9:00PM',
    Wednesday: 'Closed',
    Thursday: '10:00AM - 5:00PM',
    Friday: '10:00AM - 4:00PM',
    Saturday: 'Closed',
    Sunday: 'Closed',
  },
  stylists: [],
  policies: [],
  services: [
    { code: 'HS', name: 'high school boys haircut', category: "Children's Haircuts", durationMinutes: 30, priceAUD: 30, description: null, variants: [] },
    { code: 'HS', name: 'high school girl haircut', category: "Children's Haircuts", durationMinutes: 45, priceAUD: 45, description: null, variants: [] },
    { code: 'HS', name: 'high school girls wash/cut/style', category: "Children's Haircuts", durationMinutes: 60, priceAUD: 55, description: null, variants: [] },
    { code: 'KC', name: 'kids cut -under 6', category: "Children's Haircuts", durationMinutes: 30, priceAUD: 20, description: null, variants: [] },
    { code: 'PS', name: 'primary school boys cut', category: "Children's Haircuts", durationMinutes: 30, priceAUD: 25, description: null, variants: [] },
    { code: 'PS', name: 'primary school girls cut', category: "Children's Haircuts", durationMinutes: 30, priceAUD: 35, description: null, variants: [] },
    { code: 'CO', name: 'Curls only', category: 'Hair Styling', durationMinutes: 30, priceAUD: 55, description: null, variants: [] },
    { code: 'LC', name: 'Ladies cut,style after col (medium/long)', category: 'Ladies Haircuts', durationMinutes: 45, priceAUD: 65, description: null, variants: [] },
    { code: 'LC', name: 'Ladies cut,style after col (short )', category: 'Ladies Haircuts', durationMinutes: 45, priceAUD: 55, description: null, variants: [] },
    { code: 'LS', name: 'Ladies shampoo,cut,style', category: 'Ladies Haircuts', durationMinutes: 45, priceAUD: 70, description: null, variants: [] },
    { code: 'LT', name: 'Ladies trim/cut', category: 'Ladies Haircuts', durationMinutes: 45, priceAUD: 50, description: null, variants: [] },
    { code: 'SL', name: 'Senior ladies cut', category: 'Ladies Haircuts', durationMinutes: 30, priceAUD: 45, description: null, variants: [] },
    { code: 'SL', name: 'Senior ladies shampoo,cut,style', category: 'Ladies Haircuts', durationMinutes: 45, priceAUD: 60, description: null, variants: [] },
    { code: 'WT', name: 'Wedding trial- upstyle', category: 'Wedding Hair', durationMinutes: 60, priceAUD: 75, description: null, variants: [] },
  ],
};

export default aloraSalon;
