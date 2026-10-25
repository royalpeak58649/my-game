import type { LawDef, LawGroupDef, LawGroupId } from '../../sim/politics/types';

const L = (l: LawDef): [string, LawDef] => [l.id, l];

export const LAWS: Record<string, LawDef> = Object.fromEntries([
  // governance
  L({ id: 'autocracy', group: 'governance', name: 'Autocracy', description: 'The sovereign rules; advisors serve at pleasure.',
    modifiers: { legitimacyAdd: 10 }, igCloutMult: { landowners: 1.5, army: 1.5, clergy: 1.2 } }),
  L({ id: 'constitutional_monarchy', group: 'governance', name: 'Constitutional Monarchy', description: 'A crown bound by a charter and a chamber.',
    modifiers: { legitimacyAdd: 5 }, igCloutMult: { landowners: 1.2, industrialists: 1.2, merchants: 1.2 } }),
  L({ id: 'republic', group: 'governance', name: 'Republic', description: 'Elected officials govern in the name of the people.', requiresTech: 'popular_sovereignty',
    modifiers: { radicalismMult: 0.9 }, igCloutMult: { intelligentsia: 1.3, merchants: 1.2, industrialists: 1.2 } }),
  // franchise
  L({ id: 'no_franchise', group: 'franchise', name: 'No Elections', description: 'Power follows rank and property alone.',
    modifiers: {}, tierWeights: { subsistence: 0.05, lower: 0.2, middle: 3, upper: 60 } }),
  L({ id: 'wealth_franchise', group: 'franchise', name: 'Property Franchise', description: 'Only taxpayers of means may vote.',
    modifiers: {}, tierWeights: { subsistence: 0.1, lower: 0.5, middle: 10, upper: 40 } }),
  L({ id: 'manhood_franchise', group: 'franchise', name: 'Manhood Suffrage', description: 'Every grown man has a vote.', requiresTech: 'popular_sovereignty',
    modifiers: {}, tierWeights: { subsistence: 0.6, lower: 2, middle: 6, upper: 15 } }),
  // church
  L({ id: 'state_church', group: 'church', name: 'State Church', description: 'One faith, upheld and funded by the state.', modifiers: { legitimacyAdd: 5, researchMult: 0.95 } }),
  L({ id: 'freedom_of_conscience', group: 'church', name: 'Freedom of Conscience', description: 'An official faith, but others are tolerated.', modifiers: {} }),
  L({ id: 'secular_state', group: 'church', name: 'Secular State', description: 'Church and state are separate.', modifiers: { researchMult: 1.1, legitimacyAdd: -3 } }),
  // trade
  L({ id: 'isolationism', group: 'trade', name: 'Isolationism', description: 'Foreign trade is confined to a few licensed ports.', modifiers: { tradeShare: 0.1 } }),
  L({ id: 'mercantilism', group: 'trade', name: 'Mercantilism', description: 'Tariffs and monopolies shelter home industry.', modifiers: { tradeShare: 0.35 } }),
  L({ id: 'free_trade', group: 'trade', name: 'Free Trade', description: 'Goods flow freely across borders.', requiresTech: 'political_economy', modifiers: { tradeShare: 0.7 } }),
  // labor
  L({ id: 'serfdom', group: 'labor', name: 'Serfdom', description: 'Peasants are bound to their lords’ land.', modifiers: { hireRateMult: 0.35 } }),
  L({ id: 'free_labor', group: 'labor', name: 'Free Labour', description: 'Workers may sell their labour where they choose.', modifiers: {} }),
  L({ id: 'worker_protections', group: 'labor', name: 'Worker Protections', description: 'Hours, child labour and safety are regulated.', requiresTech: 'labor_rights',
    modifiers: { wageMult: 1.15, radicalismMult: 0.7 } }),
  // taxation
  L({ id: 'land_tax', group: 'taxation', name: 'Land and Excise Taxes', description: 'Revenue from land, salt and drink; much is lost to collectors.', modifiers: { taxEfficiency: 0.7 } }),
  L({ id: 'proportional_tax', group: 'taxation', name: 'Proportional Income Tax', description: 'A flat share of every income.', modifiers: { taxEfficiency: 0.9, upkeepMult: 1.05 } }),
  L({ id: 'graduated_tax', group: 'taxation', name: 'Graduated Income Tax', description: 'Higher incomes pay higher rates.', requiresTech: 'political_economy',
    modifiers: { taxEfficiency: 1, upkeepMult: 1.1 } }),
  // education
  L({ id: 'no_schools', group: 'education', name: 'No Schooling', description: 'Learning is a private matter for those who can afford it.', modifiers: { researchMult: 0.8 } }),
  L({ id: 'church_schools', group: 'education', name: 'Church Schools', description: 'Parishes teach letters and catechism.', modifiers: { upkeepMult: 1.05 } }),
  L({ id: 'public_schools', group: 'education', name: 'Public Schools', description: 'The state provides elementary schooling for all.', requiresTech: 'public_education',
    modifiers: { researchMult: 1.3, upkeepMult: 1.2 } }),
  // press
  L({ id: 'censorship', group: 'press', name: 'Censorship', description: 'Every printed word needs the censor’s stamp.', modifiers: { radicalismMult: 0.8, researchMult: 0.9 } }),
  L({ id: 'licensed_press', group: 'press', name: 'Licensed Press', description: 'Newspapers need a licence and a bond.', modifiers: {} }),
  L({ id: 'free_press', group: 'press', name: 'Free Press', description: 'Anyone may print and publish.', modifiers: { radicalismMult: 1.2, legitimacyAdd: 5, researchMult: 1.1 } }),
]);

export const LAW_GROUPS: Record<LawGroupId, LawGroupDef> = {
  governance: { id: 'governance', name: 'Governance', laws: ['autocracy', 'constitutional_monarchy', 'republic'] },
  franchise: { id: 'franchise', name: 'Franchise', laws: ['no_franchise', 'wealth_franchise', 'manhood_franchise'] },
  church: { id: 'church', name: 'Church and State', laws: ['state_church', 'freedom_of_conscience', 'secular_state'] },
  trade: { id: 'trade', name: 'Trade Policy', laws: ['isolationism', 'mercantilism', 'free_trade'] },
  labor: { id: 'labor', name: 'Labour', laws: ['serfdom', 'free_labor', 'worker_protections'] },
  taxation: { id: 'taxation', name: 'Taxation', laws: ['land_tax', 'proportional_tax', 'graduated_tax'] },
  education: { id: 'education', name: 'Education', laws: ['no_schools', 'church_schools', 'public_schools'] },
  press: { id: 'press', name: 'Press', laws: ['censorship', 'licensed_press', 'free_press'] },
};

export const LAW_GROUP_IDS = Object.keys(LAW_GROUPS) as LawGroupId[];

/** Base weeks to enact a law at speed factor 1. */
export const ENACTMENT_WEEKS = 26;
