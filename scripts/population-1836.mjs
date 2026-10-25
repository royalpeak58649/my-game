// Rough population estimates for 1836, in millions, by MODERN country (Natural Earth adm0_a3).
// Sources are general historical estimates (Maddison-style reconstructions and census-era
// figures) rounded heavily; they only need to be plausible relative to each other.
// Countries not listed use a default density for their continent (people per km²).

export const POP_1836 = {
  // Europe
  GBR: 19.0, IRL: 6.5, FRA: 33.5, DEU: 30.0, NLD: 2.8, BEL: 4.2, LUX: 0.17, CHE: 2.2,
  AUT: 3.6, CZE: 6.5, SVK: 2.1, HUN: 4.6, SVN: 1.0, HRV: 1.9, BIH: 1.1, SRB: 1.3, MNE: 0.12,
  KOS: 0.35, MKD: 0.55, ALB: 0.5, GRC: 1.9, BGR: 2.2, ROU: 6.6, MDA: 0.8,
  ITA: 22.0, ESP: 13.0, PRT: 3.4, DNK: 1.25, SWE: 3.0, NOR: 1.15, FIN: 1.4, ISL: 0.06,
  POL: 9.0, LTU: 1.6, LVA: 0.9, EST: 0.65, BLR: 3.5, UKR: 12.5, RUS: 44.0,
  TUR: 11.0, CYP: 0.12, CYN: 0.05, MLT: 0.12,
  GEO: 0.75, ARM: 0.35, AZE: 0.8,
  // Asia
  CHN: 400.0, TWN: 2.0, HKG: 0.02, MAC: 0.03, MNG: 0.6, JPN: 31.5, KOR: 6.5, PRK: 3.2,
  IND: 185.0, PAK: 14.0, BGD: 26.0, NPL: 3.5, BTN: 0.15, LKA: 1.2,
  MMR: 4.0, THA: 5.0, LAO: 0.9, KHM: 1.0, VNM: 7.0, MYS: 0.4, SGP: 0.03, IDN: 12.0, PHL: 3.6, BRN: 0.03, TLS: 0.15,
  IRN: 7.0, AFG: 4.0, IRQ: 1.3, SYR: 1.4, LBN: 0.3, ISR: 0.25, PSX: 0.08, JOR: 0.2,
  SAU: 2.5, YEM: 2.5, OMN: 0.35, ARE: 0.06, QAT: 0.02, KWT: 0.02, BHR: 0.04,
  KAZ: 2.0, UZB: 3.0, TKM: 0.6, TJK: 0.8, KGZ: 0.5,
  // Africa
  EGY: 4.5, LBY: 0.7, TUN: 1.0, DZA: 3.0, MAR: 3.5, SDN: 3.0, SDS: 1.5, ETH: 7.0, ERI: 0.5,
  SOM: 1.0, SOL: 0.5, KEN: 2.5, TZA: 3.5, UGA: 2.5, NGA: 15.0, GHA: 2.0, CIV: 1.5, SEN: 1.0,
  MLI: 2.5, NER: 1.5, BFA: 2.0, CMR: 2.5, COD: 8.0, AGO: 2.5, MOZ: 2.5, MDG: 2.5,
  ZAF: 1.1, ZWE: 1.0, ZMB: 1.0, MWI: 1.0,
  // Americas
  USA: 15.3, CAN: 1.3, MEX: 7.5, GTM: 0.65, SLV: 0.3, HND: 0.3, NIC: 0.25, CRI: 0.08, PAN: 0.12,
  CUB: 0.85, HTI: 0.6, DOM: 0.12, JAM: 0.38, PRI: 0.36,
  COL: 1.8, VEN: 0.9, ECU: 0.6, PER: 1.6, BOL: 1.1, CHL: 1.1, ARG: 0.8, URY: 0.1, PRY: 0.35, BRA: 5.5,
  GUY: 0.1, SUR: 0.06,
  // Oceania
  AUS: 0.4, NZL: 0.1, PNG: 1.0,
};

export const DEFAULT_DENSITY = {
  Europe: 25, Asia: 12, Africa: 4, 'North America': 3, 'South America': 0.8, Oceania: 1,
  'Seven seas (open ocean)': 1,
};

// Fixed populations for specific states ("adm0:state name"), taken out of their modern
// country's total before it is distributed. Mostly overseas territories that Natural Earth
// files under the metropole.
export const STATE_POP = {
  'FRA:Guyane française': 20000,
  'FRA:Martinique': 120000,
  'FRA:Guadeloupe': 130000,
  'FRA:La Réunion': 105000,
  'FRA:Mayotte': 10000,
};
