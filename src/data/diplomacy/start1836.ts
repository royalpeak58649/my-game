// Diplomatic situation and armies on 1 January 1836 (approximate).

/** Defensive alliances (both directions). */
export const START_ALLIANCES: [string, string][] = [
  // Münchengrätz (1833): the eastern monarchies
  ['RUS', 'AUS'], ['RUS', 'PRU'], ['AUS', 'PRU'],
  // Quadruple Alliance (1834): the western constitutional powers
  ['GBR', 'FRA'], ['GBR', 'SPA'], ['GBR', 'POR'], ['FRA', 'SPA'], ['FRA', 'POR'], ['SPA', 'POR'],
];

/** subject -> overlord */
export const START_SUBJECTS: Record<string, string> = {
  // Ottoman tributary principalities
  MOL: 'OTT', WAL: 'OTT', SER: 'OTT',
  // princely states under East India Company protection; the Company answers to Britain
  HYD: 'EIC', GWA: 'EIC', NAG: 'EIC', RAJ: 'EIC', EIC: 'GBR',
  // Habsburg secundogenitures in Italy
  TUS: 'AUS', PRM: 'AUS', MOD: 'AUS',
};

/** One-way rivalries (listed both ways where mutual). */
export const START_RIVALRIES: [string, string][] = [
  ['GBR', 'RUS'], ['RUS', 'GBR'],
  ['EGY', 'OTT'], ['OTT', 'EGY'],
  ['FRA', 'AUS'],
  ['MEX', 'USA'],
  ['PER', 'AFG'], ['AFG', 'SIK'], ['SIK', 'AFG'],
];

/** Men under arms in thousands (≈ battalions). Countries not listed use DEFAULT_ARMY_SHARE. */
export const START_ARMIES: Record<string, number> = {
  RUS: 600, QNG: 600, AUS: 300, FRA: 300, EIC: 200, OTT: 150, EGY: 130, PRU: 130, GBR: 100,
  SPA: 100, JAP: 80, PER: 60, SIK: 70, SAR: 40, SIC: 40, BAV: 40, SWE: 30, NET: 30, BEL: 30,
  MEX: 30, BRZ: 20, POR: 20, DEN: 15, USA: 35, HAN: 15, WUR: 15, SAX: 12, SWI: 10, GRE: 8,
};

/** Share of the population under arms for unlisted countries. */
export const DEFAULT_ARMY_SHARE = 0.003;

/** Standing of the traditional powers of the Concert of Europe (permanent base prestige). */
export const BASE_PRESTIGE: Record<string, number> = {
  GBR: 300, FRA: 200, RUS: 200, AUS: 200, PRU: 120, OTT: 60, SPA: 40, USA: 40, QNG: 40, NET: 30, SWE: 20,
};
