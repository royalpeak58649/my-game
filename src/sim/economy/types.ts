// Economy types. Definitions (Def) are static data from src/data/economy;
// everything else lives in GameState and changes every tick.

export type GoodId =
  | 'grain' | 'meat' | 'fish' | 'fruit' | 'wood'
  | 'cotton' | 'wool' | 'silk' | 'dye' | 'tea' | 'coffee' | 'sugar' | 'tobacco'
  | 'coal' | 'iron'
  | 'fabric' | 'clothes' | 'luxury_clothes' | 'furniture' | 'groceries' | 'liquor'
  | 'tools' | 'steel' | 'paper' | 'glass' | 'small_arms'
  | 'services';

export type GoodCategory = 'staple' | 'raw' | 'industrial' | 'luxury' | 'military' | 'service';

export interface GoodDef {
  id: GoodId;
  name: string;
  category: GoodCategory;
  basePrice: number; // money per unit
}

export type PopTypeId =
  | 'aristocrats' | 'capitalists' | 'bureaucrats' | 'clerks' | 'shopkeepers'
  | 'machinists' | 'laborers' | 'farmers' | 'soldiers' | 'peasants';

/** 'subsistence' is the peasants' mostly self-provided basket. */
export type WealthTier = 'subsistence' | 'lower' | 'middle' | 'upper';

export interface PopTypeDef {
  id: PopTypeId;
  name: string;
  tier: WealthTier;
  /** Wage per person per week when employed. Owners (aristocrats, capitalists) get 0 and live on profits. */
  baseWage: number;
  /** Peasants only: monetised subsistence income per person per week (untaxed). */
  subsistenceIncome?: number;
  /** Share of open jobs of this type that can be filled from peasants per week (0..1). */
  hireRate: number;
}

/** Per person per week consumption at "comfortable" level (consumption scale = 1). */
export type NeedsBasket = Partial<Record<GoodId, number>>;

/** Natural resources that cap building levels in a state. */
export type ResourceId =
  | 'arable' | 'wood' | 'fish' | 'coal' | 'iron'
  | 'cotton' | 'sugar' | 'coffee' | 'tea' | 'tobacco' | 'dye' | 'silk';

export type BuildingGroup = 'agriculture' | 'plantation' | 'extraction' | 'industry' | 'urban' | 'government';

export type OwnerKind = 'aristocrats' | 'capitalists' | 'government';

export interface ProductionMethodDef {
  id: string;
  name: string;
  /** Per building level per week. */
  inputs: Partial<Record<GoodId, number>>;
  outputs: Partial<Record<GoodId, number>>;
  /** Construction points produced per level per week (construction sector only). */
  construction?: number;
  /** Jobs per level by pop type. */
  employment: Partial<Record<PopTypeId, number>>;
}

export interface BuildingDef {
  id: string;
  name: string;
  group: BuildingGroup;
  owner: OwnerKind;
  /** Resource that caps the number of levels in a state (one level per unit). Undefined = uncapped. */
  resource?: ResourceId;
  /** Urban buildings are capped by StateEconomy.urbanCap. */
  urban?: boolean;
  /** Construction points needed for one level. */
  cost: number;
  /** First entry is the default. Exactly one is active per building. */
  methods: ProductionMethodDef[];
}

// ----------------------------------------------------------------- dynamic

export interface BuildingInstance {
  id: string; // BuildingDef id
  level: number;
  method: string; // ProductionMethodDef id
  employed: Partial<Record<PopTypeId, number>>;
  /** Last week's results, for UI and hiring decisions. */
  lastRevenue: number;
  lastCosts: number;
  lastProfit: number;
  /** Share of required inputs actually obtained last week (0..1). */
  inputFill: number;
}

export interface StateEconomy {
  pops: Record<PopTypeId, number>;
  /** Income per person per week last tick, by pop type (after tax). */
  income: Record<PopTypeId, number>;
  /** Standard of living last tick, by pop type (0..40, ~10 = subsistence, ~20 = comfortable). */
  sol: Record<PopTypeId, number>;
  buildings: Record<string, BuildingInstance>; // keyed by BuildingDef id
  resources: Partial<Record<ResourceId, number>>;
  urbanCap: number;
  coastal: boolean;
}

export interface Market {
  prices: Record<GoodId, number>;
  supply: Record<GoodId, number>;
  demand: Record<GoodId, number>;
  /** Share of demand that was satisfied (min(1, S/D)). */
  buyFill: Record<GoodId, number>;
  /** Share of supply that was sold (min(1, D/S)). */
  sellFill: Record<GoodId, number>;
  /** Amounts shipped to / received from the world market last week. */
  exports: Record<GoodId, number>;
  imports: Record<GoodId, number>;
}

export interface ConstructionItem {
  stateId: string;
  buildingId: string;
  progress: number; // construction points accumulated
}

export interface CountryEconomy {
  treasury: number;
  incomeTaxRate: number; // 0..0.5, applied to wages and dividends
  lastIncome: number;
  /** Government buildings plus upkeep. */
  lastExpenses: number;
  /** Abstracted court, army and navy upkeep, included in lastExpenses. */
  lastUpkeep: number;
  constructionPoints: number; // produced last week
  queue: ConstructionItem[];
}

export interface EconomyState {
  /** Pre-1836 calibration mode (see investment.ts); never set during play. */
  warmup?: boolean;
  states: Record<string, StateEconomy>; // only states with an owner
  markets: Record<string, Market>; // keyed by country tag
  countries: Record<string, CountryEconomy>;
}
