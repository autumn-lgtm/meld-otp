/**
 * Synthetic MonthlyReport seed data derived from the 2025 Annual Review.
 * Used to pre-populate Analytics when no live reports have been saved yet.
 * Each entry represents a melder's annual performance (December 2025).
 */
import type { MonthlyReport, OAPResult, CAPResult, RatioResult } from '../types';
import { getCAPHealth, getOAPHealth, getRatioHealth } from '../utils/calculations';

interface SeedMelder {
  id: string;
  name: string;
  roleId: string;
  oa: number;   // annual OAP %
  cap: number;  // CAP %
  ratio: number; // Comp Ratio %
  salary: number; // annual actual
  market: number; // annual market rate
}

const SEED_MELDERS: SeedMelder[] = [
  // Customer Support & Enablement (individual OAP not tracked; using team annual of 100%)
  { id: 's-nhockley',    name: 'Nathanael Hockley',       roleId: 'CSS',     oa: 100,   cap: 92.7,  ratio: 112.5, salary: 75000,  market: 90000  },
  { id: 's-jmonson',     name: 'Jeffrey Monson',           roleId: 'CSS',     oa: 100,   cap: 101.2, ratio: 89.3,  salary: 67000,  market: 82000  },
  { id: 's-atrimble',    name: 'Aaron Trimble',            roleId: 'CSS',     oa: 100,   cap: 99.5,  ratio: 98.4,  salary: 50000,  market: 57000  },
  { id: 's-dyalla',      name: 'Deepika Yalla-Colomb',     roleId: 'CSS',     oa: 100,   cap: 94.8,  ratio: 98.4,  salary: 50000,  market: 57000  },
  { id: 's-mcalabrese',  name: 'Michael Calabrese',        roleId: 'MMES',    oa: 100,   cap: 105.7, ratio: 112.5, salary: 72500,  market: 75000  },
  // Business Development
  { id: 'bd-bcapelle',   name: 'Benjamin Capelle',         roleId: 'BDA',     oa: 46,    cap: 70.8,  ratio: 86.6,  salary: 43900,  market: 59000  },
  { id: 'bd-bechols',    name: 'Benjamin S Echols',        roleId: 'BDR',     oa: 75,    cap: 67.9,  ratio: 102.4, salary: 47000,  market: 59000  },
  { id: 'bd-bmarshall',  name: 'Bridget Marshall',         roleId: 'BDA',     oa: 64,    cap: 84.2,  ratio: 86.6,  salary: 43900,  market: 59000  },
  { id: 'bd-ewilley',    name: 'Emilee L Willey',          roleId: 'BDA',     oa: 43,    cap: 90.7,  ratio: 102.4, salary: 47000,  market: 85000  },
  { id: 'bd-jbintliff',  name: 'Johnathon L Bintliff',     roleId: 'SR-BDR',  oa: 124,   cap: 85.4,  ratio: 98.1,  salary: 50000,  market: 85000  },
  { id: 'bd-nnagel',     name: 'Nicholas J Nagel',         roleId: 'BDR',     oa: 73,    cap: 105.8, ratio: 84.2,  salary: 62000,  market: 94000  },
  { id: 'bd-wpinto',     name: 'Winston Pinto',            roleId: 'SR-BDR',  oa: 120,   cap: 86.4,  ratio: 98.1,  salary: 73000,  market: 85000  },
  { id: 'bd-jholzer',    name: 'Jace Holzer',              roleId: 'SR-BDR',  oa: 118,   cap: 96.9,  ratio: 96.4,  salary: 60000,  market: 63000  },
  { id: 'bd-snichols',   name: 'Seth Nichols',             roleId: 'BDR',     oa: 136,   cap: 96.7,  ratio: 86.6,  salary: 43900,  market: 59000  },
  { id: 'bd-mgolliher',  name: 'Megan Golliher',           roleId: 'BDA',     oa: 118,   cap: 111.7, ratio: 86.6,  salary: 43900,  market: 59000  },
  { id: 'bd-anthony',    name: 'Anthony',                  roleId: 'BDA',     oa: 100,   cap: 109.1, ratio: 86.6,  salary: 43900,  market: 59000  },
  // Customer Success
  { id: 'csm-aseaholm',  name: 'Aaron Seaholm',            roleId: 'MM-CSM',  oa: 101,   cap: 96.4,  ratio: 133,   salary: 233000, market: 181000 },
  { id: 'csm-aconniff',  name: 'Andrew T Conniff',         roleId: 'CSM',     oa: 115,   cap: 95.3,  ratio: 107.8, salary: 70000,  market: 83000  },
  { id: 'csm-atorvi',    name: 'Anna Torvi',               roleId: 'MM-CSM',  oa: 113.6, cap: 75.1,  ratio: 95.8,  salary: 128000, market: 130000 },
  { id: 'csm-cerickson', name: 'Christopher M Erickson',   roleId: 'CSM',     oa: 132,   cap: 87.2,  ratio: 107,   salary: 68000,  market: 83000  },
  { id: 'csm-bcodr',     name: 'Bryce Codr',               roleId: 'CSM',     oa: 144,   cap: 87.9,  ratio: 122,   salary: 66000,  market: 61000  },
  { id: 'csm-kjordan',   name: 'Kalico Jordan',            roleId: 'CSM',     oa: 58,    cap: 98.7,  ratio: 110.6, salary: 72000,  market: 83000  },
  // Business Solutions
  { id: 'bs-amcglashan', name: 'Andrew D McGlashan',       roleId: 'BSE',     oa: 100,   cap: 107.4, ratio: 77.2,  salary: 55000,  market: 56000  },
  { id: 'bs-janderson',  name: 'Jesse Anderson',           roleId: 'SR-BSE',  oa: 125,   cap: 100.1, ratio: 73.5,  salary: 70000,  market: 110000 },
  { id: 'bs-acostello',  name: 'Aaron Costello',           roleId: 'BSE',     oa: 51,    cap: 75.4,  ratio: 94.7,  salary: 81000,  market: 121000 },
  { id: 'bs-jkearns',    name: 'John Kearns',              roleId: 'SR-BSE',  oa: 77,    cap: 69.4,  ratio: 114.6, salary: 126000, market: 151000 },
  // Marketing
  { id: 'mkt-egreenway', name: 'Elizabeth Greenway',       roleId: 'MKT-IC2', oa: 90.3,  cap: 82.4,  ratio: 72.5,  salary: 100000, market: 133000 },
  { id: 'mkt-mnasibog',  name: 'Michael Nasibog',          roleId: 'MKT-IC3', oa: 163,   cap: 102.7, ratio: 104.9, salary: 53400,  market: 63000  },
  { id: 'mkt-jmartin',   name: 'Jon Martin',               roleId: 'MKT-L4',  oa: 105,   cap: 89.8,  ratio: 106.5, salary: 75000,  market: 110000 },
  { id: 'mkt-msperlich', name: 'Molly Sperlich',           roleId: 'MKT-IC3', oa: 117,   cap: 93.6,  ratio: 101.6, salary: 62000,  market: 84000  },
  { id: 'mkt-madison',   name: 'Madison',                  roleId: 'MKT-IC2', oa: 73,    cap: 79.8,  ratio: 112.7, salary: 136000, market: 151000 },
  // Customer Onboarding
  { id: 'com-bpesek',    name: 'Brianna Pesek',            roleId: 'COM',     oa: 76,    cap: 100,   ratio: 108.9, salary: 68000,  market: 83000  },
  { id: 'com-khewlett',  name: 'Kristoffer Allen Hewlett', roleId: 'COM',     oa: 99,    cap: 100,   ratio: 105.3, salary: 83000,  market: 96000  },
];

function makeReport(m: SeedMelder): MonthlyReport {
  const monthly = m.salary / 12;
  const targetComp = monthly * (100 / m.cap);
  const marketRate = m.market / 12;

  const oapResult: OAPResult = {
    metricResults: [{
      metricId: 'seed-oap',
      metricName: 'Annual OAP',
      abbreviation: 'OAP',
      weight: 1,
      actual: m.oa,
      target: 100,
      attainmentPct: m.oa,
      weightedContribution: m.oa,
    }],
    oap: m.oa,
    health: getOAPHealth(m.oa),
  };

  const capResult: CAPResult = {
    actualCompensation: monthly,
    targetCompensation: targetComp,
    cap: m.cap,
    health: getCAPHealth(m.cap),
  };

  const ratioResult: RatioResult = {
    actualCompensation: monthly,
    marketRate,
    ratio: m.ratio,
    health: getRatioHealth(m.ratio),
  };

  return {
    id: `seed-2025-${m.id}`,
    melderId: m.id,
    melderName: m.name,
    roleId: m.roleId,
    month: 12,
    year: 2025,
    metricInputs: { 'seed-oap': { actual: m.oa, target: 100 } },
    actualCompensation: monthly,
    targetCompensation: targetComp,
    marketRate,
    oapResult,
    capResult,
    ratioResult,
    alerts: [],
    notes: '2025 Annual Review — baseline data',
    createdAt: '2025-12-31T00:00:00.000Z',
    updatedAt: '2025-12-31T00:00:00.000Z',
  };
}

export const SEED_REPORTS_2025: MonthlyReport[] = SEED_MELDERS.map(makeReport);

export const SEED_MELDER_MAP: Record<string, { name: string }> = Object.fromEntries(
  SEED_MELDERS.map((m) => [m.id, { name: m.name }])
);
