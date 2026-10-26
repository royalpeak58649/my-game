// Laws and technologies on 1 January 1836. Approximate, like the map.
import type { LawGroupId } from '../../sim/politics/types';

export const DEFAULT_LAWS: Record<LawGroupId, string> = {
  governance: 'autocracy',
  franchise: 'no_franchise',
  church: 'state_church',
  trade: 'mercantilism',
  labor: 'free_labor',
  taxation: 'land_tax',
  education: 'no_schools',
  press: 'censorship',
};

type LawOverrides = Partial<Record<LawGroupId, string>>;

const CONSTITUTIONAL: LawOverrides = { governance: 'constitutional_monarchy', franchise: 'wealth_franchise', press: 'licensed_press' };
const LATIN_REPUBLIC: LawOverrides = { governance: 'republic', franchise: 'wealth_franchise', press: 'licensed_press' };

export const START_LAWS: Record<string, LawOverrides> = {
  GBR: { ...CONSTITUTIONAL, taxation: 'proportional_tax', education: 'church_schools', press: 'free_press' },
  FRA: { ...CONSTITUTIONAL, church: 'freedom_of_conscience', education: 'church_schools' },
  BEL: { ...CONSTITUTIONAL, church: 'freedom_of_conscience', taxation: 'proportional_tax', press: 'free_press' },
  NET: { ...CONSTITUTIONAL, church: 'freedom_of_conscience', taxation: 'proportional_tax', education: 'church_schools' },
  SWE: { ...CONSTITUTIONAL, education: 'church_schools' },
  NOR: { ...CONSTITUTIONAL, education: 'church_schools', press: 'free_press' },
  SPA: { ...CONSTITUTIONAL },
  POR: { ...CONSTITUTIONAL },
  BAV: { ...CONSTITUTIONAL, education: 'public_schools' },
  WUR: { ...CONSTITUTIONAL, education: 'public_schools' },
  SAX: { ...CONSTITUTIONAL, education: 'public_schools' },
  HAN: { ...CONSTITUTIONAL, education: 'church_schools' },
  HES: { ...CONSTITUTIONAL, education: 'church_schools' },
  BRZ: { ...CONSTITUTIONAL },
  PRU: { education: 'public_schools' },
  DEN: { education: 'church_schools' },
  AUS: { labor: 'serfdom', education: 'church_schools' },
  RUS: { labor: 'serfdom' },
  MOL: { labor: 'serfdom' },
  WAL: { labor: 'serfdom' },
  JAP: { labor: 'serfdom', trade: 'isolationism', education: 'church_schools' },
  JOS: { labor: 'serfdom', trade: 'isolationism' },
  QNG: { trade: 'isolationism' },
  USA: { governance: 'republic', franchise: 'manhood_franchise', church: 'secular_state', education: 'church_schools', press: 'free_press' },
  SWI: { governance: 'republic', franchise: 'wealth_franchise', church: 'freedom_of_conscience', education: 'church_schools', press: 'licensed_press' },
  MEX: LATIN_REPUBLIC, FCA: LATIN_REPUBLIC, NGR: LATIN_REPUBLIC, VNZ: LATIN_REPUBLIC, ECU: LATIN_REPUBLIC,
  PEU: LATIN_REPUBLIC, BOL: LATIN_REPUBLIC, CHL: LATIN_REPUBLIC, ARG: LATIN_REPUBLIC, URU: LATIN_REPUBLIC,
  HAI: LATIN_REPUBLIC, LIB: LATIN_REPUBLIC,
};

const TIER_A = ['line_drill', 'enlightenment', 'political_economy', 'academies', 'rotation_farming', 'mechanical_tools', 'mechanical_spinning', 'steam_engines', 'canals', 'iron_construction'];
const TIER_B = ['line_drill', 'enlightenment', 'political_economy', 'academies', 'rotation_farming', 'mechanical_tools', 'mechanical_spinning', 'canals'];
const TIER_C = ['enlightenment', 'rotation_farming', 'mechanical_tools'];

export const START_TECHS: Record<string, string[]> = {
  GBR: TIER_A, BEL: TIER_A,
  FRA: TIER_B, PRU: TIER_B, NET: TIER_B, USA: TIER_B, SWI: TIER_B, SAX: TIER_B,
  AUS: [...TIER_C, 'mechanical_spinning', 'line_drill'], RUS: [...TIER_C, 'mechanical_spinning', 'line_drill'],
  EGY: [...TIER_C, 'mechanical_spinning', 'line_drill'], OTT: ['line_drill'],
  BAV: TIER_C, WUR: TIER_C, HAN: TIER_C, HES: TIER_C, THU: TIER_C, MEC: TIER_C, DEN: TIER_C, SWE: TIER_C, NOR: TIER_C,
  SAR: TIER_C, TUS: TIER_C, PAP: TIER_C, SIC: TIER_C, PRM: TIER_C, MOD: TIER_C, SPA: TIER_C, POR: TIER_C,
};
