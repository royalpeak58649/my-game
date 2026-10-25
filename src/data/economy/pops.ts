import type { NeedsBasket, PopTypeDef, PopTypeId, WealthTier } from '../../sim/economy/types';

export const POP_TYPES: Record<PopTypeId, PopTypeDef> = {
  aristocrats: { id: 'aristocrats', name: 'Aristocrats', tier: 'upper', baseWage: 0, hireRate: 0.2 },
  capitalists: { id: 'capitalists', name: 'Capitalists', tier: 'upper', baseWage: 0, hireRate: 0.2 },
  bureaucrats: { id: 'bureaucrats', name: 'Bureaucrats', tier: 'middle', baseWage: 0.11, hireRate: 0.04 },
  clerks: { id: 'clerks', name: 'Clerks', tier: 'middle', baseWage: 0.09, hireRate: 0.04 },
  shopkeepers: { id: 'shopkeepers', name: 'Shopkeepers', tier: 'middle', baseWage: 0.09, hireRate: 0.06 },
  machinists: { id: 'machinists', name: 'Machinists', tier: 'lower', baseWage: 0.08, hireRate: 0.04 },
  laborers: { id: 'laborers', name: 'Laborers', tier: 'lower', baseWage: 0.05, hireRate: 0.1 },
  farmers: { id: 'farmers', name: 'Farmers', tier: 'lower', baseWage: 0.04, hireRate: 0.1 },
  peasants: { id: 'peasants', name: 'Peasants', tier: 'subsistence', baseWage: 0, subsistenceIncome: 0.013, hireRate: 0 },
};

export const POP_TYPE_IDS = Object.keys(POP_TYPES) as PopTypeId[];

// Per person per week at consumption scale 1 ("comfortable").
// Lower basket costs ≈ 0.04 at base prices; middle ≈ 0.16; upper ≈ 0.9.
export const NEEDS: Record<WealthTier, NeedsBasket> = {
  // Peasants grow most of what they need; this is only what they buy (≈ 0.029 at base prices).
  // Firewood, cloth and most food were still gathered, spun and grown at home.
  subsistence: {
    grain: 0.0012, fish: 0.00002, wood: 0.00003, fabric: 0.00002, liquor: 0.00002,
  },
  lower: {
    grain: 0.0012, meat: 0.0002, fish: 0.00008, wood: 0.00008,
    fabric: 0.0001, clothes: 0.00005, liquor: 0.00005, groceries: 0.0001,
    services: 0.0001, sugar: 0.00003, tobacco: 0.00002, tea: 0.00001, coffee: 0.00001, furniture: 0.00003,
  },
  middle: {
    grain: 0.0012, meat: 0.0006, fish: 0.0003, fruit: 0.0003, wood: 0.0004,
    fabric: 0.0003, clothes: 0.0005, liquor: 0.0002, groceries: 0.0005,
    services: 0.0008, sugar: 0.0002, tobacco: 0.0002, tea: 0.0002, coffee: 0.0002,
    furniture: 0.0004, paper: 0.0002, glass: 0.0002,
  },
  upper: {
    grain: 0.0015, meat: 0.0015, fish: 0.0005, fruit: 0.001, wood: 0.001,
    clothes: 0.001, luxury_clothes: 0.002, liquor: 0.0006, groceries: 0.0015,
    services: 0.005, sugar: 0.0006, tobacco: 0.0008, tea: 0.0008, coffee: 0.0008,
    furniture: 0.002, paper: 0.0006, glass: 0.0008,
  },
};

/** Consumption scale is capped; income above this is saved. */
export const MAX_CONSUMPTION_SCALE = 3;

/**
 * Standard of living from consumption scale s: SOL = 20 + 8·log2(s), clamped to [0, 40].
 * s = 1 (comfortable basket) → 20; s = 0.5 → 12; s = 2 → 28.
 */
export function standardOfLiving(scale: number): number {
  if (scale <= 0) return 0;
  return Math.max(0, Math.min(40, 20 + 8 * Math.log2(scale)));
}

/** Yearly natural growth at SOL s: 0.2% at SOL 5, rising to 1.2% at SOL 25 and above. */
export function yearlyGrowth(sol: number): number {
  const t = Math.max(0, Math.min(1, (sol - 5) / 20));
  return 0.002 + 0.01 * t;
}
