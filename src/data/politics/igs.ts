import type { IgDef, IgId, PopAffinity } from '../../sim/politics/types';

export const IGS: Record<IgId, IgDef> = {
  landowners: { id: 'landowners', name: 'Landowners', color: '#9a7b4f', description: 'Estate holders and the old nobility. Defend tradition, privilege and the land.' },
  industrialists: { id: 'industrialists', name: 'Industrialists', color: '#5f6672', description: 'Mill and mine owners. Want free labour, open markets and low taxes.' },
  clergy: { id: 'clergy', name: 'Clergy', color: '#c9a45c', description: 'The established faith and its schools. Guardians of morals and order.' },
  army: { id: 'army', name: 'Officer Corps', color: '#7a4a4a', description: 'The officer class. Values a strong crown, discipline and national power.' },
  intelligentsia: { id: 'intelligentsia', name: 'Intelligentsia', color: '#5f84a6', description: 'Professors, officials and writers. Champions of reform, science and liberty.' },
  merchants: { id: 'merchants', name: 'Merchants', color: '#5f9b8a', description: 'Traders, shopkeepers and clerks. Favour commerce, property and moderate rule.' },
  peasantry: { id: 'peasantry', name: 'Peasantry', color: '#8fa36b', description: 'The rural majority. Want land, light taxes and to be left alone.' },
  workers: { id: 'workers', name: 'Workers', color: '#b5563f', description: 'Labourers and machinists of the new towns. Seek better wages and a voice.' },
};

export const IG_IDS = Object.keys(IGS) as IgId[];

export const POP_AFFINITY: PopAffinity = {
  aristocrats: { landowners: 0.6, army: 0.25, clergy: 0.15 },
  capitalists: { industrialists: 0.8, merchants: 0.2 },
  bureaucrats: { intelligentsia: 0.5, army: 0.3, merchants: 0.2 },
  clerks: { intelligentsia: 0.5, merchants: 0.5 },
  shopkeepers: { merchants: 0.8, clergy: 0.2 },
  machinists: { workers: 0.8, intelligentsia: 0.2 },
  laborers: { workers: 0.7, clergy: 0.3 },
  farmers: { peasantry: 0.7, clergy: 0.3 },
  soldiers: { army: 0.6, peasantry: 0.4 },
  peasants: { peasantry: 0.7, clergy: 0.3 },
};

// Stance of each interest group towards each law: -2 (hates) … +2 (loves). Missing = 0.
const S = (pairs: string): Record<string, number> =>
  Object.fromEntries(pairs.trim().split(/\s+/).map((p) => { const [k, v] = p.split('='); return [k as string, Number(v)]; }));

export const STANCES: Record<IgId, Record<string, number>> = {
  landowners: S(`autocracy=2 republic=-2 no_franchise=2 wealth_franchise=1 manhood_franchise=-2
    state_church=1 secular_state=-1 mercantilism=1 free_trade=-1 serfdom=2 free_labor=-1 worker_protections=-2
    land_tax=-1 graduated_tax=-2 no_schools=1 church_schools=1 public_schools=-1 censorship=1 free_press=-1`),
  industrialists: S(`autocracy=-1 constitutional_monarchy=1 republic=1 no_franchise=-1 wealth_franchise=2 manhood_franchise=-1
    secular_state=1 isolationism=-2 free_trade=2 serfdom=-2 free_labor=2 worker_protections=-2
    land_tax=1 proportional_tax=1 graduated_tax=-2 no_schools=-1 public_schools=1 censorship=-1 free_press=1`),
  clergy: S(`autocracy=1 republic=-1 no_franchise=1 manhood_franchise=-1 state_church=2 freedom_of_conscience=-1 secular_state=-2
    worker_protections=1 no_schools=-1 church_schools=2 public_schools=-2 censorship=1 licensed_press=1 free_press=-1`),
  army: S(`autocracy=2 republic=-1 no_franchise=1 manhood_franchise=-1 state_church=1
    isolationism=1 mercantilism=1 free_trade=-1 serfdom=1 censorship=1 free_press=-1`),
  intelligentsia: S(`autocracy=-2 constitutional_monarchy=1 republic=2 no_franchise=-2 manhood_franchise=2
    state_church=-1 freedom_of_conscience=1 secular_state=2 isolationism=-1 free_trade=1 serfdom=-2 free_labor=1 worker_protections=1
    land_tax=-1 graduated_tax=1 no_schools=-2 church_schools=-1 public_schools=2 censorship=-2 free_press=2`),
  merchants: S(`autocracy=-1 constitutional_monarchy=1 republic=1 no_franchise=-1 wealth_franchise=2
    isolationism=-2 free_trade=2 serfdom=-1 free_labor=1 worker_protections=-1
    land_tax=1 graduated_tax=-1 public_schools=1 censorship=-1 free_press=1`),
  peasantry: S(`no_franchise=-1 wealth_franchise=-1 manhood_franchise=2 state_church=1 secular_state=-1
    isolationism=1 free_trade=-1 serfdom=-2 free_labor=2 worker_protections=1
    land_tax=-2 proportional_tax=1 graduated_tax=1 church_schools=1 public_schools=1`),
  workers: S(`autocracy=-1 republic=1 no_franchise=-2 wealth_franchise=-1 manhood_franchise=2 secular_state=1
    mercantilism=1 free_trade=-1 serfdom=-2 free_labor=1 worker_protections=2
    graduated_tax=2 no_schools=-1 public_schools=2 censorship=-1 free_press=1`),
};
