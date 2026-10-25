// Starting economic development per country, used only to seed the 1836 economy.
// employment: share of the population working in buildings (the rest are peasants).
// industry:   share of those workers in industry (factories); the rest are in agriculture,
//             extraction, urban services and government.
export interface Development {
  employment: number;
  industry: number;
}

const D = (employment: number, industry: number): Development => ({ employment, industry });

export const DEVELOPMENT: Record<string, Development> = {
  GBR: D(0.3, 0.25),
  BEL: D(0.26, 0.2),
  SAX: D(0.22, 0.15),
  NET: D(0.24, 0.12),
  USA: D(0.22, 0.1),
  FRA: D(0.2, 0.12),
  PRU: D(0.2, 0.12),
  SWI: D(0.2, 0.12),
  BAV: D(0.18, 0.08), WUR: D(0.18, 0.08), HAN: D(0.18, 0.08), HES: D(0.18, 0.08),
  MEC: D(0.16, 0.05), THU: D(0.18, 0.08),
  AUS: D(0.16, 0.08),
  DEN: D(0.15, 0.06), SWE: D(0.14, 0.06), NOR: D(0.14, 0.05),
  SAR: D(0.15, 0.07), TUS: D(0.14, 0.06), PAP: D(0.12, 0.04), SIC: D(0.12, 0.04), PRM: D(0.13, 0.05), MOD: D(0.13, 0.05),
  SPA: D(0.12, 0.05), POR: D(0.12, 0.05),
  RUS: D(0.08, 0.04),
  EGY: D(0.08, 0.05),
  OTT: D(0.07, 0.03), GRE: D(0.08, 0.02), SER: D(0.07, 0.02), WAL: D(0.07, 0.02), MOL: D(0.07, 0.02),
  JAP: D(0.08, 0.04),
  QNG: D(0.06, 0.03),
  EIC: D(0.06, 0.02),
  MEX: D(0.07, 0.02), BRZ: D(0.08, 0.02), ARG: D(0.07, 0.02), CHL: D(0.07, 0.02),
  NGR: D(0.06, 0.02), VNZ: D(0.06, 0.02), PEU: D(0.06, 0.02), BOL: D(0.05, 0.01),
  HAI: D(0.06, 0.01), URU: D(0.07, 0.02), PRY: D(0.05, 0.01), ECU: D(0.05, 0.01), FCA: D(0.05, 0.01),
};

export const DEFAULT_DEVELOPMENT: Development = D(0.05, 0.01);

/** Starting treasury per inhabitant. */
export const TREASURY_PER_CAPITA = 0.002;
export const DEFAULT_INCOME_TAX = 0.1;

/** Weekly government upkeep per inhabitant (court, army, navy — abstracted until later systems). */
export const UPKEEP_PER_CAPITA = 0.0002;
