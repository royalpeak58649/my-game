import type { GoodDef, GoodId } from '../../sim/economy/types';

// Base prices are the game's own; the market moves prices between 25% and 175% of base.
export const GOODS: Record<GoodId, GoodDef> = {
  grain: { id: 'grain', name: 'Grain', category: 'staple', basePrice: 18 },
  meat: { id: 'meat', name: 'Meat', category: 'staple', basePrice: 28 },
  fish: { id: 'fish', name: 'Fish', category: 'staple', basePrice: 22 },
  fruit: { id: 'fruit', name: 'Fruit', category: 'staple', basePrice: 26 },
  wood: { id: 'wood', name: 'Wood', category: 'raw', basePrice: 16 },
  cotton: { id: 'cotton', name: 'Cotton', category: 'raw', basePrice: 20 },
  wool: { id: 'wool', name: 'Wool', category: 'raw', basePrice: 22 },
  silk: { id: 'silk', name: 'Silk', category: 'raw', basePrice: 48 },
  dye: { id: 'dye', name: 'Dye', category: 'raw', basePrice: 42 },
  tea: { id: 'tea', name: 'Tea', category: 'luxury', basePrice: 46 },
  coffee: { id: 'coffee', name: 'Coffee', category: 'luxury', basePrice: 44 },
  sugar: { id: 'sugar', name: 'Sugar', category: 'staple', basePrice: 30 },
  tobacco: { id: 'tobacco', name: 'Tobacco', category: 'luxury', basePrice: 34 },
  coal: { id: 'coal', name: 'Coal', category: 'raw', basePrice: 28 },
  iron: { id: 'iron', name: 'Iron', category: 'raw', basePrice: 38 },
  fabric: { id: 'fabric', name: 'Fabric', category: 'industrial', basePrice: 24 },
  clothes: { id: 'clothes', name: 'Clothes', category: 'staple', basePrice: 34 },
  luxury_clothes: { id: 'luxury_clothes', name: 'Fine Clothes', category: 'luxury', basePrice: 70 },
  furniture: { id: 'furniture', name: 'Furniture', category: 'staple', basePrice: 32 },
  groceries: { id: 'groceries', name: 'Groceries', category: 'staple', basePrice: 30 },
  liquor: { id: 'liquor', name: 'Liquor', category: 'staple', basePrice: 32 },
  tools: { id: 'tools', name: 'Tools', category: 'industrial', basePrice: 42 },
  steel: { id: 'steel', name: 'Steel', category: 'industrial', basePrice: 56 },
  paper: { id: 'paper', name: 'Paper', category: 'industrial', basePrice: 30 },
  glass: { id: 'glass', name: 'Glass', category: 'industrial', basePrice: 36 },
  small_arms: { id: 'small_arms', name: 'Small Arms', category: 'military', basePrice: 60 },
  services: { id: 'services', name: 'Services', category: 'service', basePrice: 26 },
};

export const GOOD_IDS = Object.keys(GOODS) as GoodId[];

/** Prices are clamped to [MIN, MAX] × basePrice. */
export const PRICE_MIN_FACTOR = 0.25;
export const PRICE_MAX_FACTOR = 1.75;
/** How strongly the supply/demand imbalance moves the target price. */
export const PRICE_ELASTICITY = 0.75;
/** Fraction of the gap to the target price closed each week (smoothing). */
export const PRICE_SMOOTHING = 0.25;

/** Share of a market's surplus (or shortage) that is offered to (or sought from) the world market. */
export const WORLD_TRADE_SHARE = 0.5;
