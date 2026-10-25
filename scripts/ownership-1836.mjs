// Approximate political map of the world on 1 January 1836.
// Hand-authored for this game. Accuracy is approximate: modern admin-1 units are the
// smallest building block, so historical borders that cut through a modern province
// are rounded to whichever owner held most of it.
//
// COUNTRIES: tag -> [name, capital (admin-1 name, "ADM0:name"), optional color]
// DEFAULTS:  modern adm0_a3 -> 1836 tag (null = decentralized / unclaimed lands)
// OVERRIDES: "ADM0:admin-1 name" -> tag (or null)
// DROP:      adm0 codes excluded from the map entirely (uninhabited specks, Antarctica)

export const COUNTRIES = {
  // --- Western & Central Europe
  GBR: ['United Kingdom', 'GBR:Westminster'],
  FRA: ['France', 'FRA:Paris'],
  SPA: ['Spain', 'ESP:Madrid'],
  POR: ['Portugal', 'PRT:Lisboa'],
  NET: ['Netherlands', 'NLD:Noord-Holland'],
  BEL: ['Belgium', 'BEL:Brussels'],
  SWI: ['Switzerland', 'CHE:Bern'],
  PRU: ['Prussia', 'DEU:Berlin'],
  BAV: ['Bavaria', 'DEU:Bayern'],
  WUR: ['Württemberg', 'DEU:Baden-Württemberg'],
  SAX: ['Saxony', 'DEU:Sachsen'],
  HAN: ['Hanover', 'DEU:Niedersachsen'],
  HES: ['Hesse', 'DEU:Hessen'],
  MEC: ['Mecklenburg', 'DEU:Mecklenburg-Vorpommern'],
  THU: ['Thuringian States', 'DEU:Thüringen'],
  AUS: ['Austrian Empire', 'AUT:Wien'],
  DEN: ['Denmark', 'DNK:Hovedstaden'],
  SWE: ['Sweden', 'SWE:Stockholm'],
  NOR: ['Norway', 'NOR:Oslo'],
  // --- Italy
  SAR: ['Sardinia-Piedmont', 'ITA:Turin'],
  TUS: ['Tuscany', 'ITA:Firenze'],
  PAP: ['Papal States', 'ITA:Roma'],
  SIC: ['Two Sicilies', 'ITA:Napoli'],
  PRM: ['Parma', 'ITA:Parma'],
  MOD: ['Modena', 'ITA:Modena'],
  // --- Eastern Europe & Balkans
  RUS: ['Russian Empire', 'RUS:City of St. Petersburg'],
  OTT: ['Ottoman Empire', 'TUR:Istanbul'],
  GRE: ['Greece', 'GRC:Attiki'],
  SER: ['Serbia', 'SRB:Šumadijski'],
  MON: ['Montenegro', 'MNE:Cetinje'],
  WAL: ['Wallachia', 'ROU:Bucharest'],
  MOL: ['Moldavia', 'ROU:Iasi'],
  // --- Middle East & North Africa
  EGY: ['Egypt', 'EGY:Al Qahirah'],
  PER: ['Persia', 'IRN:Tehran'],
  NEJ: ['Nejd', 'SAU:Ar Riyad'],
  YEM: ['Yemen', 'YEM:Amanat Al Asimah'],
  OMA: ['Oman', 'OMN:Muscat'],
  MOR: ['Morocco', 'MAR:Fès - Boulemane'],
  TUN: ['Tunis', 'TUN:Tunis'],
  // --- Central & South Asia
  AFG: ['Kabul', 'AFG:Kabul'],
  HER: ['Herat', 'AFG:Hirat'],
  KHI: ['Khiva', 'UZB:Khorezm'],
  BUK: ['Bukhara', 'UZB:Bukhoro'],
  KOK: ['Kokand', 'UZB:Ferghana'],
  EIC: ['East India Company', 'IND:West Bengal'],
  SIK: ['Sikh Empire', 'PAK:Punjab'],
  SIN: ['Sindh', 'PAK:Sind'],
  KAL: ['Kalat', 'PAK:Baluchistan'],
  HYD: ['Hyderabad', 'IND:Telangana'],
  GWA: ['Gwalior', 'IND:Madhya Pradesh'],
  NAG: ['Nagpur', 'IND:Chhattisgarh'],
  RAJ: ['Rajput States', 'IND:Rajasthan'],
  NEP: ['Nepal', 'NPL:Bagmati'],
  BHU: ['Bhutan', 'BTN:Thimphu'],
  // --- East & Southeast Asia
  QNG: ['Qing Empire', 'CHN:Beijing'],
  JAP: ['Japan', 'JPN:Tokyo'],
  RYU: ['Ryukyu', 'JPN:Okinawa'],
  JOS: ['Joseon', 'KOR:Seoul'],
  BUR: ['Burma', 'MMR:Mandalay'],
  SIA: ['Siam', 'THA:Bangkok Metropolis'],
  DAI: ['Dai Nam', 'VNM:Thừa Thiên - Huế'],
  JOH: ['Johor', 'MYS:Johor'],
  BRN: ['Brunei', 'BRN:Brunei and Muara'],
  ACE: ['Aceh', 'IDN:Aceh'],
  SUL: ['Sulu', 'PHL:Sulu'],
  // --- Sub-Saharan Africa
  ETH: ['Ethiopia', 'ETH:Amhara'],
  MAD: ['Madagascar', 'MDG:Analamanga'],
  ZUL: ['Zulu Kingdom', 'ZAF:KwaZulu-Natal'],
  SOK: ['Sokoto', 'NGA:Sokoto'],
  ASH: ['Ashanti', 'GHA:Ashanti'],
  DAH: ['Dahomey', 'BEN:Zou'],
  LIB: ['Liberia', 'LBR:Montserrado'],
  MAS: ['Massina', 'MLI:Mopti'],
  // --- Americas
  USA: ['United States', 'USA:District of Columbia'],
  MEX: ['Mexico', 'MEX:Distrito Federal'],
  FCA: ['Central America', 'GTM:Guatemala'],
  NGR: ['New Granada', 'COL:Bogota'],
  VNZ: ['Venezuela', 'VEN:Distrito Capital'],
  ECU: ['Ecuador', 'ECU:Pichincha'],
  PEU: ['Peru', 'PER:Lima'],
  BOL: ['Bolivia', 'BOL:Chuquisaca'],
  CHL: ['Chile', 'CHL:Región Metropolitana de Santiago'],
  ARG: ['Argentine Confederation', 'ARG:Ciudad de Buenos Aires'],
  URU: ['Uruguay', 'URY:Montevideo'],
  PRY: ['Paraguay', 'PRY:Asunción'],
  BRZ: ['Empire of Brazil', 'BRA:Rio de Janeiro'],
  HAI: ['Haiti', 'HTI:Ouest'],
  HAW: ['Hawaii', 'USA:Hawaii'],
};

export const DROP = ['ATA', 'ATF', 'HMD', 'SGS', 'ATC', 'CSI', 'CLP', 'PGA', 'UMI', 'IOA', 'IOT', 'KAB', 'USG', 'ESB', 'WSB', 'PCN', 'NFK'];

const nul = null;

export const DEFAULTS = {
  // Europe
  GBR: 'GBR', IRL: 'GBR', IMN: 'GBR', GGY: 'GBR', JEY: 'GBR', GIB: 'GBR', MLT: 'GBR',
  FRA: 'FRA', MCO: 'SAR', AND: nul,
  ESP: 'SPA', PRT: 'POR',
  NLD: 'NET', LUX: 'NET', BEL: 'BEL', CHE: 'SWI', LIE: 'AUS',
  DEU: 'PRU', AUT: 'AUS', CZE: 'AUS', SVK: 'AUS', HUN: 'AUS', SVN: 'AUS', HRV: 'AUS',
  DNK: 'DEN', ISL: 'DEN', FRO: 'DEN', GRL: 'DEN',
  SWE: 'SWE', ALD: 'RUS', NOR: 'NOR', FIN: 'RUS',
  ITA: 'SAR', SMR: 'PAP', VAT: 'PAP',
  POL: 'RUS', LTU: 'RUS', LVA: 'RUS', EST: 'RUS', BLR: 'RUS', UKR: 'RUS', MDA: 'RUS', RUS: 'RUS',
  ROU: 'WAL', BGR: 'OTT', SRB: 'SER', KOS: 'OTT', MNE: 'MON', BIH: 'OTT', ALB: 'OTT', MKD: 'OTT',
  GRC: 'OTT', CYP: 'OTT', CYN: 'OTT', TUR: 'OTT',
  GEO: 'RUS', ARM: 'RUS', AZE: 'RUS',
  // Middle East
  IRQ: 'OTT', SYR: 'EGY', LBN: 'EGY', ISR: 'EGY', PSX: 'EGY', JOR: 'EGY',
  SAU: nul, YEM: 'YEM', OMN: 'OMA', ARE: nul, QAT: nul, BHR: nul, KWT: nul,
  IRN: 'PER', AFG: 'AFG',
  // Central Asia
  KAZ: nul, UZB: 'BUK', TKM: 'KHI', TJK: 'BUK', KGZ: 'KOK',
  // South Asia
  IND: 'EIC', PAK: 'SIK', BGD: 'EIC', LKA: 'GBR', NPL: 'NEP', BTN: 'BHU', MDV: nul, KAS: 'SIK',
  // East & SE Asia
  CHN: 'QNG', TWN: 'QNG', HKG: 'QNG', MAC: 'POR', MNG: 'QNG',
  JPN: 'JAP', KOR: 'JOS', PRK: 'JOS',
  MMR: 'BUR', THA: 'SIA', LAO: 'SIA', KHM: 'DAI', VNM: 'DAI',
  MYS: nul, SGP: 'GBR', BRN: 'BRN', IDN: nul, TLS: 'POR', PHL: 'SPA', PNG: nul,
  // Oceania
  AUS: nul, NZL: nul, FJI: nul, NCL: nul, VUT: nul, SLB: nul, PYF: nul, WSM: nul, TON: nul,
  ASM: nul, COK: nul, NIU: nul, WLF: nul, KIR: nul, TUV: nul, NRU: nul, MHL: nul, FSM: nul,
  PLW: nul, GUM: 'SPA', MNP: 'SPA',
  // Africa
  MAR: 'MOR', SAH: nul, DZA: nul, TUN: 'TUN', LBY: 'OTT', EGY: 'EGY',
  SDN: nul, SDS: nul, ERI: nul, DJI: nul, ETH: nul, SOM: nul, SOL: nul,
  KEN: nul, TZA: nul, UGA: nul, RWA: nul, BDI: nul,
  MRT: nul, SEN: nul, GMB: 'GBR', GNB: 'POR', GIN: nul, SLE: nul, LBR: 'LIB', CIV: nul,
  GHA: 'ASH', TGO: nul, BEN: nul, NGA: nul, NER: nul, MLI: nul, BFA: nul, TCD: nul,
  CMR: nul, CAF: nul, GNQ: 'SPA', GAB: nul, COG: nul, COD: nul, STP: 'POR', CPV: 'POR',
  AGO: nul, ZMB: nul, MWI: nul, MOZ: nul, ZWE: nul, BWA: nul, NAM: nul,
  ZAF: nul, LSO: nul, SWZ: nul,
  MDG: 'MAD', COM: nul, MUS: 'GBR', SYC: 'GBR', SHN: 'GBR',
  // North America
  USA: 'USA', CAN: 'GBR', MEX: 'MEX', SPM: 'FRA', BMU: 'GBR',
  GTM: 'FCA', SLV: 'FCA', HND: 'FCA', NIC: 'FCA', CRI: 'FCA', BLZ: 'GBR', PAN: 'NGR',
  CUB: 'SPA', PRI: 'SPA', HTI: 'HAI', DOM: 'HAI', JAM: 'GBR', BHS: 'GBR', TCA: 'GBR', CYM: 'GBR',
  ATG: 'GBR', KNA: 'GBR', DMA: 'GBR', LCA: 'GBR', VCT: 'GBR', GRD: 'GBR', BRB: 'GBR', TTO: 'GBR',
  AIA: 'GBR', MSR: 'GBR', VGB: 'GBR', VIR: 'DEN', ABW: 'NET', CUW: 'NET', SXM: 'NET', MAF: 'FRA', BLM: 'SWE',
  // South America
  COL: 'NGR', VEN: 'VNZ', ECU: 'ECU', PER: 'PEU', BOL: 'BOL', CHL: 'CHL', ARG: 'ARG', URY: 'URU',
  PRY: 'PRY', BRA: 'BRZ', GUY: 'GBR', SUR: 'NET', FLK: 'GBR',
};

function many(adm0, tag, names) {
  return Object.fromEntries(names.split('|').map((n) => [`${adm0}:${n}`, tag]));
}

export const OVERRIDES = {
  // France: Savoy and Nice belonged to Sardinia-Piedmont
  ...many('FRA', 'SAR', 'Savoie|Haute-Savoie|Alpes-Maritimes'),
  // Germany (Länder are the smallest unit available)
  ...many('DEU', 'BAV', 'Bayern'),
  ...many('DEU', 'WUR', 'Baden-Württemberg'),
  ...many('DEU', 'SAX', 'Sachsen'),
  ...many('DEU', 'HAN', 'Niedersachsen|Bremen|Hamburg'),
  ...many('DEU', 'HES', 'Hessen'),
  ...many('DEU', 'MEC', 'Mecklenburg-Vorpommern'),
  ...many('DEU', 'THU', 'Thüringen'),
  ...many('DEU', 'DEN', 'Schleswig-Holstein'),
  // Poland: partitions
  ...many('POL', 'PRU', 'Silesian|Lower Silesian|Opole|Warmian-Masurian|Lubusz|West Pomeranian|Pomeranian|Kuyavian-Pomeranian|Greater Poland'),
  ...many('POL', 'AUS', 'Lesser Poland|Subcarpathian'),
  ...many('LTU', 'PRU', 'Klaipedos'),
  ...many('RUS', 'PRU', 'Kaliningrad'),
  // Ukraine: Galicia, Bukovina, Carpathian Ruthenia were Austrian
  ...many('UKR', 'AUS', "L'viv|Ternopil'|Ivano-Frankivs'k|Chernivtsi|Transcarpathia"),
  // Romania: Transylvania/Banat (Austria), Moldavia, Dobruja (Ottoman); default = Wallachia
  ...many('ROU', 'AUS', 'Satu Mare|Arad|Bihor|Timis|Caras-Severin|Maramures|Cluj|Bistrita-Nasaud|Salaj|Hunedoara|Covasna|Brasov|Sibiu|Mures|Harghita|Alba'),
  ...many('ROU', 'MOL', 'Botosani|Iasi|Vaslui|Galati|Suceava|Neamt|Bacau|Vrancea'),
  ...many('ROU', 'OTT', 'Constanta|Tulcea'),
  // Serbia: Vojvodina (Austria), south (Ottoman)
  ...many('SRB', 'AUS', 'Severno-Backi|Zapadno-Backi|Severno-Banatski|Sremski|Južno-Backi|Srednje-Banatski|Južno-Banatski'),
  ...many('SRB', 'OTT', 'Pcinjski|Pirotski|Jablanicki|Toplicki|Nišavski|Raški'),
  // Greece: the 1832 kingdom; Ionian Islands under British protection; Crete under Egypt
  ...many('GRC', 'GRE', 'Stereá Elláda|Attiki|Peloponnisos|Dytiki Ellada|Notio Aigaio'),
  ...many('GRC', 'GBR', 'Ionioi Nisoi'),
  ...many('GRC', 'EGY', 'Kriti'),
  // Italy (provinces)
  ...many('ITA', 'AUS', 'Varese|Como|Sondrio|Bozen|Belluno|Udine|Gorizia|Trieste|Venezia|Padova|Rovigo|Bergamo|Brescia|Cremona|Mantova|Milano|Lecco|Monza e Brianza|Lodi|Trento|Vicenza|Verona|Treviso|Pordenone'),
  ...many('ITA', 'PRM', 'Piacenza|Parma'),
  ...many('ITA', 'MOD', 'Reggio Emilia|Modena|Massa-Carrara'),
  ...many('ITA', 'PAP', 'Rimini|Pesaro e Urbino|Ferrara|Ravenna|Forlì-Cesena|Ancona|Macerata|Fermo|Ascoli Piceno|Latina|Roma|Viterbo|Rieti|Bologna|Terni|Perugia|Frosinone'),
  ...many('ITA', 'TUS', 'Grosseto|Livorno|Pisa|Lucca|Siena|Arezzo|Firenze|Pistoia|Prato'),
  ...many('ITA', 'SIC', 'Teramo|Pescara|Chieti|Campobasso|Foggia|Barletta-Andria Trani|Bari|Brindisi|Lecce|Taranto|Matera|Cosenza|Crotene|Catanzaro|Reggio Calabria|Vibo Valentia|Potenza|Salerno|Napoli|Caserta|Trapani|Messina|Palermo|Agrigento|Caltanissetta|Ragusa|Siracusa|Catania|Enna|Benevento|Avellino|L\'Aquila|Isernia'),
  // Russia: Qing Manchuria south of the Amur; unconquered North Caucasus; Tuva under Qing
  ...many('RUS', 'QNG', "Primor'ye|Yevrey|Tuva"),
  ...many('RUS', null, 'Chechnya|Dagestan|Ingush|Karachay-Cherkess|Kabardin-Balkar|Adygey|Sakhalin'),
  ...many('GEO', 'OTT', 'Ajaria'),
  // Kazakhstan: northern steppe under Russia, south under Kokand
  ...many('KAZ', 'RUS', 'North Kazakhstan|Qostanay|Pavlodar|East Kazakhstan|Aqmola|Astana'),
  ...many('KAZ', 'KOK', 'South Kazakhstan|Zhambyl|Almaty|Almaty City|Qyzylorda'),
  // Uzbekistan
  ...many('UZB', 'KHI', 'Khorezm|Karakalpakstan'),
  ...many('UZB', 'KOK', 'Ferghana|Andijon|Namangan|Tashkent|Sirdaryo'),
  ...many('TJK', 'KOK', 'Leninabad'),
  // Afghanistan
  ...many('AFG', 'HER', 'Hirat|Badghis|Farah'),
  // Arabia
  ...many('SAU', 'EGY', 'Makkah|Al Madinah|Tabuk|Al Bahah'),
  ...many('SAU', 'NEJ', 'Ar Riyad|Al Quassim|Ash Sharqiyah|Ha\'il'),
  ...many('YEM', null, 'Hadramawt|Al Mahrah|`Adan|Lahij|Abyan|Shabwah'),
  // South Asia
  ...many('IND', 'SIK', 'Ladakh|Punjab|Himachal Pradesh|Jammu and Kashmir|Chandigarh'),
  ...many('IND', 'RAJ', 'Rajasthan'),
  ...many('IND', 'HYD', 'Telangana'),
  ...many('IND', 'GWA', 'Madhya Pradesh'),
  ...many('IND', 'NAG', 'Chhattisgarh'),
  ...many('IND', 'POR', 'Goa|Dadra and Nagar Haveli and Daman and Diu'),
  ...many('IND', 'FRA', 'Puducherry'),
  ...many('IND', null, 'Sikkim|Andaman and Nicobar|Arunachal Pradesh|Nagaland|Mizoram'),
  ...many('PAK', 'SIN', 'Sind'),
  ...many('PAK', 'KAL', 'Baluchistan'),
  ...many('PAK', null, 'Northern Areas|F.A.T.A.'),
  ...many('MMR', 'EIC', 'Rakhine|Tanintharyi'),
  // Southeast Asia
  ...many('MYS', 'GBR', 'Pulau Pinang|Melaka'),
  ...many('MYS', 'SIA', 'Perlis|Kedah|Kelantan|Terengganu'),
  ...many('MYS', 'JOH', 'Johor|Pahang'),
  ...many('MYS', 'BRN', 'Sarawak|Sabah|Labuan'),
  ...many('IDN', 'NET', 'Jawa Timur|Jawa Tengah|Jawa Barat|Jakarta Raya|Banten|Yogyakarta|Maluku|Sulawesi Selatan|Sumatera Barat|Sumatera Selatan|Bengkulu|Lampung|Bangka-Belitung|Sulawesi Utara'),
  ...many('IDN', 'ACE', 'Aceh'),
  ...many('PHL', 'SUL', 'Sulu|Tawi-Tawi|Basilan'),
  ...many('JPN', 'RYU', 'Okinawa'),
  // Africa
  ...many('DZA', 'FRA', 'Alger|Oran|Annaba|Blida|Boumerdès|Tipaza|Mostaganem'),
  ...many('LBY', null, 'Murzuq|Ghat|Sabha|Wadi al Hayaa|Al Kufrah|Ash Shati\'|Al Jufrah'),
  ...many('SDN', 'EGY', 'Northern|River Nile|Khartoum|Kassala|Sennar|Gezira|Gedarif|North Kordufan|White Nile|Red Sea'),
  ...many('ETH', 'ETH', 'Amhara|Tigray'),
  ...many('KEN', 'OMA', 'Coast'),
  ...many('TZA', 'OMA', 'Zanzibar South and Central|Kaskazini-Unguja|Zanzibar West|Kusini-Pemba|Kaskazini-Pemba|Dar-Es-Salaam|Pwani|Tanga'),
  ...many('ZAF', 'GBR', 'Western Cape|Eastern Cape'),
  ...many('ZAF', 'ZUL', 'KwaZulu-Natal'),
  ...many('NGA', 'SOK', 'Sokoto|Kebbi|Zamfara|Katsina|Kano|Jigawa|Kaduna|Bauchi|Gombe|Niger|Kwara|Nassarawa|Federal Capital Territory|Kogi|Adamawa'),
  ...many('BEN', 'DAH', 'Zou|Atlantique|Littoral|Ouémé|Plateau|Mono|Kouffo|Collines'),
  ...many('MLI', 'MAS', 'Mopti|Ségou'),
  ...many('SEN', 'FRA', 'Saint-Louis'),
  ...many('SLE', 'GBR', 'Western'),
  ...many('AGO', 'POR', 'Luanda|Bengo|Benguela|Cuanza Norte|Cuanza Sul'),
  ...many('MOZ', 'POR', 'Maputo|Inhambane|Sofala|Zambezia|Nampula|Cabo Delgado'),
  // North America (1836): Mexico still holds the whole Southwest incl. Texas;
  // Oregon Country under joint British-American occupation.
  ...many('USA', 'MEX', 'California|Nevada|Utah|Arizona|New Mexico|Texas'),
  ...many('USA', null, 'Washington|Oregon|Idaho'),
  ...many('USA', 'RUS', 'Alaska'),
  ...many('USA', 'HAW', 'Hawaii'),
  ...many('CAN', null, 'British Columbia|Yukon|Nunavut|Northwest Territories'),
  // Australia: NSW (incl. Port Phillip), Van Diemen's Land, Swan River
  ...many('AUS', 'GBR', 'New South Wales|Victoria|Tasmania|Western Australia|Australian Capital Territory|Jervis Bay Territory|Queensland'),
  // South America
  ...many('CHL', null, 'La Araucanía|Los Ríos|Aisén del General Carlos Ibáñez del Campo|Magallanes y Antártica Chilena'),
  ...many('CHL', 'BOL', 'Antofagasta'),
  ...many('CHL', 'PEU', 'Tarapacá|Arica y Parinacota'),
  ...many('ARG', null, 'Neuquén|Chubut|Río Negro|Santa Cruz|Tierra del Fuego|La Pampa|Chaco|Formosa|Misiones'),
};

// Hand-picked muted map colors for major countries (neighbors kept distinct).
// Countries not listed get a generated muted color.
export const COLORS = {
  GBR: '#b5563f', FRA: '#5470a6', SPA: '#c9a43a', POR: '#5f8e4e', NET: '#d98a45', BEL: '#a7a253',
  SWI: '#c25f5f', PRU: '#5f6672', BAV: '#7ea3c9', WUR: '#b88b5e', SAX: '#7b9f7a', HAN: '#c9b77a',
  HES: '#9c7aa6', MEC: '#5c8f8c', THU: '#c48a9a', AUS: '#d4bd72', DEN: '#c77575', SWE: '#4f82a6',
  NOR: '#9a5656', SAR: '#6c93a8', TUS: '#80a07f', PAP: '#e3d498', SIC: '#8ea66b', PRM: '#c79a6a',
  MOD: '#8a7fb0', RUS: '#4f8a5b', OTT: '#9e4252', GRE: '#6fa3c7', SER: '#a8786a', MON: '#c9a36b',
  WAL: '#c7a85a', MOL: '#7c9cb8', EGY: '#b5a463', PER: '#7f6ca8', NEJ: '#c08c5a', YEM: '#8f9a5e',
  OMA: '#b06a5e', MOR: '#a97640', TUN: '#5f9b8a', AFG: '#8b905b', HER: '#b39a6b', KHI: '#9a8456',
  BUK: '#6d9e86', KOK: '#c38e70', EIC: '#d48b52', SIK: '#c4a24a', SIN: '#7da37b', KAL: '#a3896b',
  HYD: '#6b8f5e', GWA: '#9c6f8f', NAG: '#7f9fb0', RAJ: '#c27b62', NEP: '#8e6a9b', BHU: '#b49a5e',
  QNG: '#d9ab4a', JAP: '#c47a8c', RYU: '#7fb0a6', JOS: '#8bb3a0', BUR: '#b07d55', SIA: '#68a48f',
  DAI: '#b8a455', JOH: '#9b7c5f', BRN: '#8fa36b', ACE: '#6e9a75', SUL: '#b48870',
  ETH: '#7f9e5c', MAD: '#6fa08a', ZUL: '#a87b53', SOK: '#b38f5a', ASH: '#8ba36a', DAH: '#a46a6a',
  LIB: '#7c95b5', MAS: '#9b8d5c', USA: '#7192c4', MEX: '#7ba35d', FCA: '#6a7fb0', NGR: '#d0b04f',
  VNZ: '#9b7c52', ECU: '#c9a46b', PEU: '#8f71a0', BOL: '#6a8fa3', CHL: '#b45252', ARG: '#8fbad3',
  URU: '#6b78a8', PRY: '#a6b06a', BRZ: '#479c8b', HAI: '#5d7ea6', HAW: '#a8b56f',
};
