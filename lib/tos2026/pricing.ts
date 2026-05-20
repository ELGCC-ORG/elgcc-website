import { AttendeeCategory, CategoryConfig, Attendee } from './types';

export const CATEGORIES: CategoryConfig[] = [
  {
    id: 'toddler',
    label: 'Toddler',
    ageRange: '0 – 5 years',
    price: 5000,
    color: '#34D399',
    icon: '👶',
  },
  {
    id: 'child',
    label: 'Child',
    ageRange: '6 – 12 years',
    price: 7500,
    color: '#60A5FA',
    icon: '👦',
  },
  {
    id: 'secondary',
    label: 'Secondary School Student',
    ageRange: 'Secondary School',
    price: 10000,
    color: '#F472B6',
    icon: '🎒',
  },
  {
    id: 'undergraduate',
    label: 'Undergraduate',
    ageRange: 'Tertiary Institution',
    price: 15000,
    color: '#A78BFA',
    icon: '🎓',
  },
  {
    id: 'working_class',
    label: 'Working Class',
    ageRange: 'Adults',
    price: 25000,
    color: '#D4A843',
    icon: '💼',
  },
];

export function getCategoryConfig(categoryId: AttendeeCategory): CategoryConfig | undefined {
  return CATEGORIES.find((c) => c.id === categoryId);
}

export function getCategoryPrice(categoryId: AttendeeCategory): number {
  return getCategoryConfig(categoryId)?.price ?? 0;
}

export function formatPrice(amount: number): string {
  return '₦' + amount.toLocaleString('en-NG');
}

export interface PriceBreakdown {
  category: CategoryConfig;
  count: number;
  subtotal: number;
}

export function calculatePriceBreakdown(attendees: Attendee[]): {
  breakdown: PriceBreakdown[];
  total: number;
} {
  const countMap = new Map<AttendeeCategory, number>();
  for (const attendee of attendees) {
    if (attendee.category) {
      countMap.set(attendee.category, (countMap.get(attendee.category) || 0) + 1);
    }
  }
  const breakdown: PriceBreakdown[] = [];
  let total = 0;
  for (const cat of CATEGORIES) {
    const count = countMap.get(cat.id) || 0;
    if (count > 0) {
      const subtotal = count * cat.price;
      breakdown.push({ category: cat, count, subtotal });
      total += subtotal;
    }
  }
  return { breakdown, total };
}

export function generateRegistrationId(): string {
  const prefix = 'TOS26';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}
