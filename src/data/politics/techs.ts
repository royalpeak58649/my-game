import type { TechDef } from '../../sim/politics/types';

const T = (t: TechDef): [string, TechDef] => [t.id, t];

export const TECHS: Record<string, TechDef> = Object.fromEntries([
  // production
  T({ id: 'rotation_farming', name: 'Crop Rotation', category: 'production', cost: 300, requires: [], description: 'Clover and turnips restore the soil between grain years.' }),
  T({ id: 'mechanical_tools', name: 'Mechanical Tools', category: 'production', cost: 400, requires: [], description: 'Lathes and forges turn out saws, picks and files in quantity.' }),
  T({ id: 'mechanical_spinning', name: 'Mechanical Spinning', category: 'production', cost: 350, requires: [], description: 'Spinning frames and mules move thread-making into mills.' }),
  T({ id: 'canals', name: 'Canals', category: 'production', cost: 500, requires: [], description: 'Cut waterways carry bulk goods cheaply inland.', modifiers: { tradeShareAdd: 0.05 } }),
  T({ id: 'iron_construction', name: 'Iron Construction', category: 'production', cost: 550, requires: ['mechanical_tools'], description: 'Cast-iron frames and beams for mills, bridges and halls.' }),
  T({ id: 'crucible_steel', name: 'Crucible Steel', category: 'production', cost: 600, requires: ['mechanical_tools'], description: 'Steel melted in clay crucibles, hard and even.' }),
  T({ id: 'steam_engines', name: 'Stationary Steam Engines', category: 'production', cost: 900, requires: ['mechanical_spinning', 'mechanical_tools'], description: 'Engines free mills from the riverbank.', modifiers: { industryOutputMult: 1.1 } }),
  T({ id: 'interchangeable_parts', name: 'Interchangeable Parts', category: 'production', cost: 1000, requires: ['mechanical_tools'], description: 'Gauges and jigs make every part fit every copy.', modifiers: { industryOutputMult: 1.05 } }),
  T({ id: 'railways', name: 'Railways', category: 'production', cost: 1500, requires: ['steam_engines', 'iron_construction'], description: 'Locomotives on iron rails bind markets together.', modifiers: { tradeShareAdd: 0.1, outputMult: 1.03 } }),
  // society
  T({ id: 'enlightenment', name: 'Enlightenment Thought', category: 'society', cost: 200, requires: [], description: 'Reason, inquiry and the rights of man.' }),
  T({ id: 'political_economy', name: 'Political Economy', category: 'society', cost: 400, requires: ['enlightenment'], description: 'The science of wealth, trade and taxes.' }),
  T({ id: 'academies', name: 'Learned Academies', category: 'society', cost: 500, requires: ['enlightenment'], description: 'Societies and journals that share discoveries.', modifiers: { researchMult: 1.1 } }),
  T({ id: 'romanticism', name: 'Romanticism', category: 'society', cost: 400, requires: [], description: 'Art and feeling in service of the nation.', modifiers: { legitimacyAdd: 3 } }),
  T({ id: 'statistics', name: 'Statistics', category: 'society', cost: 500, requires: ['political_economy'], description: 'Counting people and goods makes administration cheaper.', modifiers: { upkeepMult: 0.95 } }),
  T({ id: 'public_education', name: 'Public Education', category: 'society', cost: 600, requires: ['enlightenment'], description: 'The case for schooling every child at public expense.' }),
  T({ id: 'popular_sovereignty', name: 'Popular Sovereignty', category: 'society', cost: 700, requires: ['enlightenment'], description: 'Government derives its authority from the governed.' }),
  T({ id: 'labor_rights', name: 'Labour Rights', category: 'society', cost: 900, requires: ['popular_sovereignty', 'political_economy'], description: 'Factory acts and the regulation of work.' }),
]);

export const TECH_IDS = Object.keys(TECHS);

/**
 * Buildings and production methods that need a technology. Anything not listed is available
 * to everyone. Existing buildings keep working; only new construction and method switches
 * are restricted.
 */
export const TECH_UNLOCKS: Record<string, string> = {
  // production methods
  farm_rotation: 'rotation_farming',
  logging_saws: 'mechanical_tools',
  coal_picks: 'mechanical_tools',
  iron_picks: 'mechanical_tools',
  construction_iron: 'iron_construction',
  // buildings
  textile_mill: 'mechanical_spinning',
  steel_mill: 'crucible_steel',
  arms_workshop: 'interchangeable_parts',
};

/** Research points per week: base + per educated person (bureaucrats count half). */
export const RESEARCH_BASE = 3;
export const RESEARCH_PER_PERSON = 0.00012;
