import type { BuildingDef, PopTypeId, ProductionMethodDef } from '../../sim/economy/types';

// All amounts are per building level per week. One level employs roughly 3,000–4,000 people.
// Numbers are the game's own and are expected to be re-tuned from simulation results.

const FARM_JOBS: Partial<Record<PopTypeId, number>> = { farmers: 3600, aristocrats: 40 };
const PLANTATION_JOBS: Partial<Record<PopTypeId, number>> = { farmers: 3800, aristocrats: 40 };
const FACTORY_JOBS: Partial<Record<PopTypeId, number>> = { laborers: 2500, machinists: 300, clerks: 150, capitalists: 40 };

function plantation(id: string, name: string, crop: 'cotton' | 'sugar' | 'coffee' | 'tea' | 'tobacco' | 'dye' | 'silk', amount: number): BuildingDef {
  return {
    id, name, group: 'plantation', owner: 'aristocrats', resource: crop, cost: 150,
    methods: [{ id: `${id}_basic`, name: 'Field Gangs', inputs: {}, outputs: { [crop]: amount }, employment: PLANTATION_JOBS }],
  };
}

function factory(id: string, name: string, methods: Omit<ProductionMethodDef, 'employment'>[]): BuildingDef {
  return {
    id, name, group: 'industry', owner: 'capitalists', cost: 300,
    methods: methods.map((m) => ({ ...m, employment: FACTORY_JOBS })),
  };
}

export const BUILDINGS: Record<string, BuildingDef> = Object.fromEntries(
  [
    // --- agriculture (capped by arable land, shared between farms and ranches)
    {
      id: 'farm', name: 'Grain Farms', group: 'agriculture', owner: 'aristocrats', resource: 'arable', cost: 120,
      methods: [
        { id: 'farm_open_field', name: 'Open Fields', inputs: {}, outputs: { grain: 12, fruit: 2 }, employment: FARM_JOBS },
        { id: 'farm_rotation', name: 'Crop Rotation', inputs: { tools: 1 }, outputs: { grain: 18, fruit: 3 }, employment: FARM_JOBS },
      ],
    },
    {
      id: 'ranch', name: 'Ranches', group: 'agriculture', owner: 'aristocrats', resource: 'arable', cost: 120,
      methods: [
        { id: 'ranch_pasture', name: 'Open Pasture', inputs: {}, outputs: { meat: 5, wool: 3 }, employment: { farmers: 3000, aristocrats: 30 } },
      ],
    },
    // --- plantations (each capped by its own crop resource)
    plantation('cotton_plantation', 'Cotton Plantations', 'cotton', 12),
    plantation('sugar_plantation', 'Sugar Plantations', 'sugar', 8),
    plantation('coffee_plantation', 'Coffee Plantations', 'coffee', 6),
    plantation('tea_plantation', 'Tea Gardens', 'tea', 6),
    plantation('tobacco_plantation', 'Tobacco Plantations', 'tobacco', 7),
    plantation('dye_plantation', 'Indigo Plantations', 'dye', 6),
    plantation('silk_plantation', 'Silk Farms', 'silk', 5),
    // --- extraction
    {
      id: 'fishing_wharf', name: 'Fishing Wharves', group: 'extraction', owner: 'capitalists', resource: 'fish', cost: 150,
      methods: [{ id: 'fishing_boats', name: 'Sail Boats', inputs: {}, outputs: { fish: 10 }, employment: { laborers: 3000, capitalists: 20 } }],
    },
    {
      id: 'logging_camp', name: 'Logging Camps', group: 'extraction', owner: 'capitalists', resource: 'wood', cost: 150,
      methods: [
        { id: 'logging_axes', name: 'Hand Axes', inputs: {}, outputs: { wood: 16 }, employment: { laborers: 3500, capitalists: 20 } },
        { id: 'logging_saws', name: 'Saw Mills', inputs: { tools: 1 }, outputs: { wood: 24 }, employment: { laborers: 3500, capitalists: 20 } },
      ],
    },
    {
      id: 'coal_mine', name: 'Coal Mines', group: 'extraction', owner: 'capitalists', resource: 'coal', cost: 150,
      methods: [
        { id: 'coal_hand', name: 'Hand Digging', inputs: {}, outputs: { coal: 9 }, employment: { laborers: 3600, capitalists: 20 } },
        { id: 'coal_picks', name: 'Picks and Shovels', inputs: { tools: 1 }, outputs: { coal: 13 }, employment: { laborers: 3600, capitalists: 20 } },
      ],
    },
    {
      id: 'iron_mine', name: 'Iron Mines', group: 'extraction', owner: 'capitalists', resource: 'iron', cost: 150,
      methods: [
        { id: 'iron_hand', name: 'Hand Digging', inputs: {}, outputs: { iron: 7 }, employment: { laborers: 3600, capitalists: 20 } },
        { id: 'iron_picks', name: 'Picks and Shovels', inputs: { tools: 1 }, outputs: { iron: 10 }, employment: { laborers: 3600, capitalists: 20 } },
      ],
    },
    // --- industry
    factory('textile_mill', 'Textile Mills', [
      { id: 'textile_cotton', name: 'Cotton Spinning', inputs: { cotton: 10 }, outputs: { fabric: 18 } },
      { id: 'textile_wool', name: 'Wool Weaving', inputs: { wool: 9 }, outputs: { fabric: 16 } },
    ]),
    factory('garment_works', 'Garment Works', [
      { id: 'garment_sewing', name: 'Hand Sewing', inputs: { fabric: 10 }, outputs: { clothes: 13 } },
      { id: 'garment_dyed', name: 'Dyed Garments', inputs: { fabric: 10, dye: 1 }, outputs: { clothes: 15 } },
    ]),
    factory('tailors', 'Fine Tailors', [
      { id: 'tailors_silk', name: 'Silk Tailoring', inputs: { silk: 4, dye: 1, fabric: 2 }, outputs: { luxury_clothes: 7 } },
      { id: 'tailors_wool', name: 'Fine Woollens', inputs: { wool: 6, dye: 1 }, outputs: { luxury_clothes: 5 } },
    ]),
    factory('furniture_workshop', 'Furniture Workshops', [
      { id: 'furniture_hand', name: 'Cabinet Making', inputs: { wood: 12, fabric: 2 }, outputs: { furniture: 14 } },
    ]),
    factory('food_industry', 'Food Industry', [
      { id: 'food_bakeries', name: 'Bakeries', inputs: { grain: 15 }, outputs: { groceries: 15 } },
      { id: 'food_sweet', name: 'Sweet Bakeries', inputs: { grain: 14, sugar: 2 }, outputs: { groceries: 17 } },
    ]),
    factory('distillery', 'Distilleries', [
      { id: 'distillery_pot', name: 'Pot Stills', inputs: { grain: 14 }, outputs: { liquor: 14 } },
      { id: 'distillery_rum', name: 'Rum Distilling', inputs: { sugar: 8 }, outputs: { liquor: 12 } },
    ]),
    factory('tool_workshop', 'Tool Workshops', [
      { id: 'tools_forge', name: 'Village Forges', inputs: { wood: 8, iron: 5 }, outputs: { tools: 12 } },
    ]),
    factory('steel_mill', 'Steel Mills', [
      { id: 'steel_blister', name: 'Blister Steel', inputs: { iron: 8, coal: 8 }, outputs: { steel: 13 } },
    ]),
    factory('paper_mill', 'Paper Mills', [
      { id: 'paper_pulp', name: 'Rag and Pulp', inputs: { wood: 12 }, outputs: { paper: 13 } },
    ]),
    factory('glassworks', 'Glassworks', [
      { id: 'glass_furnace', name: 'Wood-fired Furnaces', inputs: { wood: 8 }, outputs: { glass: 9 } },
    ]),
    factory('arms_workshop', 'Arms Workshops', [
      { id: 'arms_gunsmiths', name: 'Gunsmiths', inputs: { wood: 6 }, outputs: { small_arms: 4 } },
      { id: 'arms_muskets', name: 'Musket Making', inputs: { iron: 4, wood: 4 }, outputs: { small_arms: 7 } },
    ]),
    // --- urban
    {
      id: 'urban_center', name: 'Urban Center', group: 'urban', owner: 'capitalists', urban: true, cost: 200,
      methods: [{ id: 'urban_market_towns', name: 'Market Towns', inputs: {}, outputs: { services: 10 }, employment: { shopkeepers: 1500, laborers: 1500, capitalists: 20 } }],
    },
    // --- government (paid from the treasury, no owners)
    {
      id: 'administration', name: 'Government Administration', group: 'government', owner: 'government', cost: 250,
      methods: [{ id: 'admin_clerical', name: 'Clerical Offices', inputs: { paper: 2 }, outputs: {}, employment: { bureaucrats: 1500, clerks: 500 } }],
    },
    {
      // one level = one battalion of BATTALION_SIZE soldiers; muskets wear out and need replacing
      id: 'barracks', name: 'Barracks', group: 'government', owner: 'government', cost: 150,
      methods: [{ id: 'barracks_line', name: 'Line Infantry', inputs: { small_arms: 0.3 }, outputs: {}, employment: { soldiers: 1000 } }],
    },
    {
      // one level = one flotilla of FLOTILLA_SIZE sailors; ships need timber, canvas and repairs
      id: 'naval_base', name: 'Naval Base', group: 'government', owner: 'government', coastal: true, cost: 200,
      methods: [{ id: 'naval_sail', name: 'Ships of the Line', inputs: { wood: 0.8 }, outputs: {}, employment: { soldiers: 500 } }],
    },
    {
      // one level = CONVOYS_PER_PORT convoys for overseas states, sea trade and armies abroad
      id: 'port', name: 'Port', group: 'government', owner: 'government', coastal: true, cost: 150,
      methods: [{ id: 'port_harbour', name: 'Harbour', inputs: { wood: 1 }, outputs: {}, employment: { laborers: 1500 } }],
    },
    {
      id: 'construction_sector', name: 'Construction Sector', group: 'government', owner: 'government', cost: 150,
      methods: [
        { id: 'construction_wood', name: 'Wooden Buildings', inputs: { wood: 10, fabric: 2 }, outputs: {}, construction: 5, employment: { laborers: 4000 } },
        { id: 'construction_iron', name: 'Iron Frames', inputs: { wood: 6, iron: 4, tools: 1 }, outputs: {}, construction: 8, employment: { laborers: 4000 } },
      ],
    },
  ].map((b) => [b.id, b as BuildingDef]),
);

export const BUILDING_IDS = Object.keys(BUILDINGS);

/** Max construction points a single queued project can absorb per week. */
export const MAX_POINTS_PER_PROJECT = 10;
