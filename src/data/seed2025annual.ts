import type { AnnualSnapshot } from '../types';

function snap(
  team: string,
  name: string,
  level: string | null,
  tenure: string | null,
  oa_pct: number | null,
  cap_pct: number | null,
  comp_ratio: number | null,
  current_salary: number | null,
  market_salary: number | null,
  total_cash_target_market: number | null,
  total_cash_actual_meld: number | null,
  ytd_cash_target: number | null,
  ytd_cash_paid: number | null,
  annual_cash_paid: number | null,
  q1: number | null,
  q2: number | null,
  q3: number | null,
  q4: number | null,
): AnnualSnapshot {
  const id = `2025-${team}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    id,
    year: 2025,
    team,
    name,
    level,
    tenure,
    oaPct: oa_pct,
    capPct: cap_pct,
    compRatio: comp_ratio,
    currentSalary: current_salary,
    marketSalary: market_salary,
    totalCashTargetMarket: total_cash_target_market,
    totalCashActualMeld: total_cash_actual_meld,
    ytdCashTarget: ytd_cash_target,
    ytdCashPaid: ytd_cash_paid,
    annualCashPaid: annual_cash_paid,
    q1Oa: q1,
    q2Oa: q2,
    q3Oa: q3,
    q4Oa: q4,
  };
}

export const SEED_2025_ANNUAL: AnnualSnapshot[] = [
  // ── Customer Onboarding ──────────────────────────────────────────────────────
  snap('Customer Onboarding', 'Aaron Seaholm',           'EX 9', '3y 8m', 101.0, 96.4,  133.0, 233000, 181000, 232000, 308000,  77000,  74208,  74208, 101.0, 101.0,  null,  null),
  snap('Customer Onboarding', 'Brianna Pesek',           'IC 3', '6y 4m',  76.0,100.0,  108.9,  68000,  83000,  99000, 107800, 107021, 107021,  74837,  76.0, 119.0, 113.0,  90.0),
  snap('Customer Onboarding', 'Kristoffer Allen Hewlett','IC 4', '1y 8m',  99.0,100.0,  105.3,  83000,  96000, 118000, 124290, 131970, 131970,  93906,  99.0, 115.0, 104.0,  93.0),

  // ── Customer Success ─────────────────────────────────────────────────────────
  snap('Customer Success', 'Aaron Seaholm',         'EX 9',  '3y 8m', 101.0,  96.4, 133.0, 233000, 181000, 232000, 308000,  77000,  74208,  74208, 101.0, 101.0,  null,  null),
  snap('Customer Success', 'Andrew T Conniff',      'IC 3',  '2y 1m', 115.0,  95.3, 107.8,  70000,  83000,  99000, 106729, 106729, 101680, 101680, 115.0,  79.0,  25.0,  null),
  snap('Customer Success', 'Anna Torvi',            'MGR 6', '3y 6m', 113.6,  75.1,  95.8, 128000, 130000, 187000, 179200, 179200, 134579, 134579, 113.6,  68.0,  93.0,  91.0),
  snap('Customer Success', 'Christopher M Erickson','IC 3',  '2m',    132.0,  87.2, 107.0,  68000,  83000,  99000, 105900,  52950,  46151,  46151, 132.0,  79.0,  null,  null),
  snap('Customer Success', 'Bryce Codr',            'IC 2',  '8m',    144.0,  87.9, 122.0,  66000,  61000,  86000, 104948, 104948,  92286,  92286, 144.0, 116.0,  44.0,  91.0),
  snap('Customer Success', 'Kalico Jordan',         'IC 3',  '5m',     58.0,  98.7, 110.6,  72000,  83000,  99000, 109500,  54750,  54065,  54065,  58.0, 108.0,  null,  null),
  snap('Customer Success', 'David Herr',            null,    null,      null,  66.9, 109.0,  70000,  83000,  99000, 107958,  62975,  42138,  42138,  null,  null,  97.0,  93.0),
  snap('Customer Success', 'Ben Capelle',           null,    null,      null,  85.2, 109.0,  63000,  61000,  86000,  93714,  78095,  66541,  66541,  null,  null, 113.0,  68.0),
  snap('Customer Success', 'Johnny Trokey',         null,    null,      null,  79.2, 109.0,  70000,  83000,  99000, 107958,  35986,  28488,  28488,  null,  null,  null, 116.0),

  // ── Business Development ─────────────────────────────────────────────────────
  snap('Business Development', 'Benjamin Capelle',    'IC 2',  null,  46.0,  70.8,  86.6,  43900,  59000,  83000,  71900,  41941,  29694,  29694,  46.0, 125.0,  null,  null),
  snap('Business Development', 'Benjamin S Echols',   'IC 2',  null,  75.0,  67.9, 102.4,  47000,  59000,  83000,  85000,  49583,  33659,  33659,  75.0,  77.0,  null,  null),
  snap('Business Development', 'Bridget Marshall',    'IC 2',  null,  64.0,  84.2,  86.6,  43900,  59000,  83000,  71900,  71900,  60541,  60541,  64.0,  66.0, 117.0,  94.0),
  snap('Business Development', 'Emilee L Willey',     'IC 2',  null,  43.0,  90.7, 102.4,  47000,  85000,  83000,  85000,  56666,  51384,  51384,  43.0, 117.0,  76.0,  null),
  snap('Business Development', 'Johnathon L Bintliff','IC 3',  null, 124.0,  85.4,  98.1,  50000,  85000, 105000, 103000, 103000,  87973,  87973, 124.0, 129.0, 148.0, 162.0),
  snap('Business Development', 'Nicholas J Nagel',    'MGR 4', null,  73.0, 105.8,  84.2,  62000,  94000, 139000, 117000, 117000, 123836, 123836,  73.0,  95.0, 100.0, 119.0),
  snap('Business Development', 'Winston Pinto',       'IC 3',  null, 120.0,  86.4,  98.1,  73000,  85000, 105000, 103000, 103000,  89028,  89028, 120.0, 101.0, 158.0, 170.0),
  snap('Business Development', 'Jace Holzer',         null,    null,   null,  97.0,  96.4,  60000,  63000, 107000, 103200,  77400,  75052,  75052,  null, 125.0, 137.0,  93.0),
  snap('Business Development', 'Seth Nichols',        null,    null,   null,  96.7,  86.6,  43900,  59000,  83000,  71900,  35950,  34753,  34753,  null,  null, 113.0, 158.0),
  snap('Business Development', 'Megan Golliher',      null,    null,   null, 111.7,  86.6,  43900,  59000,  83000,  71900,  17975,  20085,  20085,  null,  null, 120.0, 115.0),
  snap('Business Development', 'Anthony',             null,    null,   null, 109.1,  86.6,  43900,  59000,  83000,  71900,  17975,  19604,  19604,  null,  null, 109.0,  90.0),

  // ── Business Solutions ───────────────────────────────────────────────────────
  snap('Business Solutions', 'Andrew D McGlashan', 'EX 9',  '2y 8m', 100.0, 107.4,  77.2,  55000,  56000, 123000,  95000,  95000, 102036, 102036, 100.0,  90.0, 103.0, 136.0),
  snap('Business Solutions', 'Jesse Anderson',     'IC 3',  '1y 3m', 125.0, 100.1,  73.5,  70000, 110000, 211000, 155000, 129166, 129340, 129340, 125.0, 114.0, 112.0,  null),
  snap('Business Solutions', 'Christopher Erickson',null,   null,     null,  95.6,  73.5,  68000, 110000, 211000, 155000, 116250, 111169, 111169,  null,  null, 109.0, 102.0),
  snap('Business Solutions', 'Aaron Costello',     'IC 5',  '9m',     51.0,  75.4,  94.7,  81000, 121000, 243000, 230000, 230000, 173386, 173386,  51.0, 111.0,  82.0, 104.0),
  snap('Business Solutions', 'John Kearns',        'MGR 6', '5y 2m',  77.0,  69.4, 114.6, 126000, 151000, 215000, 246340, 246340, 170944, 170944,  77.0, 106.0,  87.0,  88.0),

  // ── Marketing ────────────────────────────────────────────────────────────────
  snap('Marketing', 'Elizabeth Greenway', 'MGR 5', '3y 11m',  90.2,  82.4,  72.5, 100000, 133000, 193000, 140000, 140000, 115342, 115342,  90.2,  99.0,  83.0,  69.0),
  snap('Marketing', 'Michael Nasibog',    'IC 2',  '3y 6m',  163.0, 102.7, 104.9,  53400,  63000,  68000,  71350,  71350,  73261,  73261, 102.3,  82.0, 133.0,  82.0),
  snap('Marketing', 'Jon Martin',         'IC 3',  '2y 2m',  105.0,  89.8, 106.5,  75000, 110000,  92000,  98000,  98000,  88000,  88000, 105.0, 106.0, 116.0,  85.0),
  snap('Marketing', 'Molly Sperlich',     'IC 3',  '1y 3m',  117.0,  93.6, 101.6,  62000,  84000,  92000,  93500,  93500,  87491,  87491, 117.0, 118.0, 109.0,  80.0),
  snap('Marketing', 'Madison',            'MGR 7', '4y 10m',  73.0,  79.8, 112.7, 136000, 151000, 169000, 190400, 190400, 151903, 151903,  73.0,  null,  null,  null),
];
