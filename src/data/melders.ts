import type { Melder } from '../types';

export const DEFAULT_MELDERS: Melder[] = [
  { id: 'melder-aaron-trimble',       name: 'Aaron Trimble',        roleId: 'CSS',       targetCompensation: 50000, marketRate: 0, createdAt: '2022-06-20T00:00:00Z', updatedAt: '2022-06-20T00:00:00Z' },
  { id: 'melder-andrew-mcglashan',    name: 'Andrew McGlashan',     roleId: 'ASSOC-BSE', targetCompensation: 55000, marketRate: 0, createdAt: '2022-08-01T00:00:00Z', updatedAt: '2022-08-01T00:00:00Z' },
  { id: 'melder-johnathon-bintliff',  name: 'Johnathon Bintliff',   roleId: 'SR-BDR',    targetCompensation: 50000, marketRate: 0, createdAt: '2022-07-26T00:00:00Z', updatedAt: '2022-07-26T00:00:00Z' },
  { id: 'melder-deepika-yalla',       name: 'Deepika Yalla-Colomb', roleId: 'CSS',       targetCompensation: 50000, marketRate: 0, createdAt: '2023-05-15T00:00:00Z', updatedAt: '2023-05-15T00:00:00Z' },
  { id: 'melder-nathanael-hockley',   name: 'Nathanael Hockley',    roleId: 'CSS-MGR',   targetCompensation: 75000, marketRate: 0, createdAt: '2022-08-01T00:00:00Z', updatedAt: '2022-08-01T00:00:00Z' },
  { id: 'melder-kristoffer-hewlett',  name: 'Kristoffer Hewlett',   roleId: 'COM',       targetCompensation: 83000, marketRate: 0, createdAt: '2023-07-24T00:00:00Z', updatedAt: '2023-07-24T00:00:00Z' },
  { id: 'melder-aaron-costello',      name: 'Aaron Costello',       roleId: 'BSE',       targetCompensation: 80000, marketRate: 0, createdAt: '2024-07-22T00:00:00Z', updatedAt: '2024-07-22T00:00:00Z' },
  { id: 'melder-bryce-codr',          name: 'Bryce Codr',           roleId: 'CSM',       targetCompensation: 66000, marketRate: 0, createdAt: '2024-06-26T00:00:00Z', updatedAt: '2024-06-26T00:00:00Z' },
  { id: 'melder-bridget-marshall',    name: 'Bridget Marshall',     roleId: 'BDR',       targetCompensation: 47000, marketRate: 0, createdAt: '2024-10-16T00:00:00Z', updatedAt: '2024-10-16T00:00:00Z' },
  { id: 'melder-benjamin-capelle',    name: 'Benjamin Capelle',     roleId: 'CSM',       targetCompensation: 63000, marketRate: 0, createdAt: '2025-01-15T00:00:00Z', updatedAt: '2025-07-01T00:00:00Z' },
  { id: 'melder-christopher-erickson',name: 'Christopher Erickson', roleId: 'BSE',       targetCompensation: 68000, marketRate: 0, createdAt: '2025-01-06T00:00:00Z', updatedAt: '2025-01-06T00:00:00Z' },
  { id: 'melder-jace-holzer',         name: 'Jace Holzer',          roleId: 'SR-BDR',    targetCompensation: 60000, marketRate: 0, createdAt: '2025-04-01T00:00:00Z', updatedAt: '2025-04-01T00:00:00Z' },
  { id: 'melder-seth-nichols',        name: 'Seth Nichols',         roleId: 'BDA',       targetCompensation: 43900, marketRate: 0, createdAt: '2025-06-30T00:00:00Z', updatedAt: '2025-06-30T00:00:00Z' },
  { id: 'melder-anthony-drealan',     name: 'Anthony Drealan',      roleId: 'BDA',       targetCompensation: 43900, marketRate: 0, createdAt: '2025-08-25T00:00:00Z', updatedAt: '2025-08-25T00:00:00Z' },
  { id: 'melder-johnny-trokey',       name: 'Johnny Trokey',        roleId: 'CSM',       targetCompensation: 70000, marketRate: 0, createdAt: '2025-09-02T00:00:00Z', updatedAt: '2025-09-02T00:00:00Z' },
  { id: 'melder-megan-byrd',          name: 'Megan Byrd',           roleId: 'CSS',       targetCompensation: 16800, marketRate: 0, createdAt: '2025-10-15T00:00:00Z', updatedAt: '2025-10-15T00:00:00Z' },
  { id: 'melder-jessica-brown',       name: 'Jessica Brown',        roleId: 'MM-CSM',    targetCompensation: 90000, marketRate: 0, createdAt: '2025-12-29T00:00:00Z', updatedAt: '2025-12-29T00:00:00Z' },
  { id: 'melder-bailey-dunlap',       name: 'Bailey Dunlap',        roleId: 'CSM',       targetCompensation: 60000, marketRate: 0, createdAt: '2026-02-09T00:00:00Z', updatedAt: '2026-02-09T00:00:00Z' },
  { id: 'melder-jarek-glenn',         name: 'Jarek Glenn',          roleId: 'BDA',       targetCompensation: 43900, marketRate: 0, createdAt: '2026-02-17T00:00:00Z', updatedAt: '2026-02-17T00:00:00Z' },
  { id: 'melder-jeffrey-monson',      name: 'Jeffrey Monson',       roleId: 'CSS',       targetCompensation: 67000, marketRate: 0, createdAt: '2019-08-26T00:00:00Z', updatedAt: '2019-08-26T00:00:00Z' },
  { id: 'melder-molly-sperlich',      name: 'Molly Sperlich',       roleId: 'MKT-IC3',   targetCompensation: 72000, marketRate: 0, createdAt: '2022-10-21T00:00:00Z', updatedAt: '2022-10-21T00:00:00Z' },
  { id: 'melder-jonathan-martin',     name: 'Jonathan Martin',      roleId: 'MKT-IC3',   targetCompensation: 65000, marketRate: 0, createdAt: '2023-02-13T00:00:00Z', updatedAt: '2023-02-13T00:00:00Z' },
  { id: 'melder-michael-nasibog',     name: 'Michael Nasibog',      roleId: 'MKT-IC2',   targetCompensation: 53400, marketRate: 0, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'melder-madison',             name: 'Madison',              roleId: 'MKT-L4',    targetCompensation: 0,     marketRate: 0, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },

  // ── Customer Onboarding ──────────────────────────────────────────────────────
  { id: 'melder-brianna-pesek',       name: 'Brianna Pesek',        roleId: 'COM',       targetCompensation: 68000, marketRate: 0, createdAt: '2018-10-01T00:00:00Z', updatedAt: '2018-10-01T00:00:00Z' },

  // ── Customer Success ─────────────────────────────────────────────────────────
  { id: 'melder-anna-torvi',          name: 'Anna Torvi',           roleId: 'CS-MGR',    targetCompensation: 128000, marketRate: 0, createdAt: '2021-06-01T00:00:00Z', updatedAt: '2021-06-01T00:00:00Z' },
  { id: 'melder-andrew-conniff',      name: 'Andrew T Conniff',     roleId: 'MM-CSM',    targetCompensation: 70000, marketRate: 0, createdAt: '2023-02-01T00:00:00Z', updatedAt: '2023-02-01T00:00:00Z' },
  { id: 'melder-christopher-m-erickson', name: 'Christopher M Erickson', roleId: 'CSM', targetCompensation: 68000, marketRate: 0, createdAt: '2024-12-01T00:00:00Z', updatedAt: '2024-12-01T00:00:00Z' },
  { id: 'melder-kalico-jordan',       name: 'Kalico Jordan',        roleId: 'CSM',       targetCompensation: 72000, marketRate: 0, createdAt: '2024-09-01T00:00:00Z', updatedAt: '2024-09-01T00:00:00Z' },
  { id: 'melder-david-herr',          name: 'David Herr',           roleId: 'CSM',       targetCompensation: 70000, marketRate: 0, createdAt: '2025-06-01T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },

  // ── Business Development ─────────────────────────────────────────────────────
  { id: 'melder-nicholas-nagel',      name: 'Nicholas J Nagel',     roleId: 'BD-MGR',    targetCompensation: 62000, marketRate: 0, createdAt: '2022-01-01T00:00:00Z', updatedAt: '2022-01-01T00:00:00Z' },
  { id: 'melder-winston-pinto',       name: 'Winston Pinto',        roleId: 'SR-BDR',    targetCompensation: 73000, marketRate: 0, createdAt: '2022-01-01T00:00:00Z', updatedAt: '2022-01-01T00:00:00Z' },
  { id: 'melder-benjamin-echols',     name: 'Benjamin S Echols',    roleId: 'BDR',       targetCompensation: 47000, marketRate: 0, createdAt: '2022-01-01T00:00:00Z', updatedAt: '2022-01-01T00:00:00Z' },
  { id: 'melder-emilee-willey',       name: 'Emilee L Willey',      roleId: 'BDR',       targetCompensation: 47000, marketRate: 0, createdAt: '2022-01-01T00:00:00Z', updatedAt: '2022-01-01T00:00:00Z' },
  { id: 'melder-megan-golliher',      name: 'Megan Golliher',       roleId: 'BDA',       targetCompensation: 43900, marketRate: 0, createdAt: '2025-07-01T00:00:00Z', updatedAt: '2025-07-01T00:00:00Z' },

  // ── Business Solutions ───────────────────────────────────────────────────────
  { id: 'melder-john-kearns',         name: 'John Kearns',          roleId: 'BS-DIR',    targetCompensation: 126000, marketRate: 0, createdAt: '2020-11-01T00:00:00Z', updatedAt: '2020-11-01T00:00:00Z' },
  { id: 'melder-jesse-anderson',      name: 'Jesse Anderson',       roleId: 'SR-BSE',    targetCompensation: 70000, marketRate: 0, createdAt: '2023-11-01T00:00:00Z', updatedAt: '2023-11-01T00:00:00Z' },

  // ── Marketing ────────────────────────────────────────────────────────────────
  { id: 'melder-elizabeth-greenway',  name: 'Elizabeth Greenway',   roleId: 'MKT-L4',    targetCompensation: 100000, marketRate: 0, createdAt: '2021-01-01T00:00:00Z', updatedAt: '2021-01-01T00:00:00Z' },

  // ── Customer Support & Enablement ────────────────────────────────────────────
  { id: 'melder-michael-calabrese',   name: 'Michael Calabrese',    roleId: 'CSS',       targetCompensation: 72500, marketRate: 0, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },

  // ── People Ops ───────────────────────────────────────────────────────────────
  { id: 'melder-autumn-hughes',       name: 'Autumn Hughes',        roleId: 'PEOPLE-OPS-MGR', targetCompensation: 138600, marketRate: 0, createdAt: '2020-03-01T00:00:00Z', updatedAt: '2020-03-01T00:00:00Z' },
  { id: 'melder-amanda-green',        name: 'Amanda Green',         roleId: 'PEOPLE-OPS-IC', targetCompensation: 60000, marketRate: 0, createdAt: '2024-12-01T00:00:00Z', updatedAt: '2024-12-01T00:00:00Z' },

  // ── Product ──────────────────────────────────────────────────────────────────
  { id: 'melder-akinsola-ogunware',   name: 'Akinsola Ogunware',    roleId: 'PROD-IC4',  targetCompensation: 146600, marketRate: 0, createdAt: '2024-04-01T00:00:00Z', updatedAt: '2024-04-01T00:00:00Z' },
  { id: 'melder-andrew-bien',         name: 'Andrew Bien',          roleId: 'PROD-IC2',  targetCompensation: 100000, marketRate: 0, createdAt: '2019-06-01T00:00:00Z', updatedAt: '2019-06-01T00:00:00Z' },
  { id: 'melder-aruna-rao',           name: 'Aruna Rao',            roleId: 'PROD-IC3',  targetCompensation: 120000, marketRate: 0, createdAt: '2024-06-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: 'melder-elizabeth-archer',    name: 'Elizabeth Archer',     roleId: 'PROD-IC2',  targetCompensation: 95000, marketRate: 0, createdAt: '2024-10-01T00:00:00Z', updatedAt: '2024-10-01T00:00:00Z' },

  // ── Engineering & Data ───────────────────────────────────────────────────────
  { id: 'melder-david-turner',        name: 'David Turner',         roleId: 'DATA-MGR',  targetCompensation: 190000, marketRate: 0, createdAt: '2024-10-01T00:00:00Z', updatedAt: '2024-10-01T00:00:00Z' },
  { id: 'melder-khalil-rutledge',     name: 'Khalil Rutledge',      roleId: 'DATA-IC5',  targetCompensation: 160000, marketRate: 0, createdAt: '2024-10-01T00:00:00Z', updatedAt: '2024-10-01T00:00:00Z' },
  { id: 'melder-matthew-hickey',      name: 'Matthew Hickey',       roleId: 'DATA-IC5',  targetCompensation: 160000, marketRate: 0, createdAt: '2024-06-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: 'melder-zachary-levovitz',    name: 'Zachary Levovitz',     roleId: 'DATA-IC5',  targetCompensation: 161000, marketRate: 0, createdAt: '2022-05-01T00:00:00Z', updatedAt: '2022-05-01T00:00:00Z' },

  // ── Engineering ──────────────────────────────────────────────────────────────
  { id: 'melder-austin-wentz',        name: 'Austin Wentz',         roleId: 'ENG-MGR',   targetCompensation: 192000, marketRate: 0, createdAt: '2021-08-01T00:00:00Z', updatedAt: '2021-08-01T00:00:00Z' },
  { id: 'melder-cameron-powers',      name: 'Cameron Powers',       roleId: 'ENG-IC3',   targetCompensation: 125000, marketRate: 0, createdAt: '2023-11-01T00:00:00Z', updatedAt: '2023-11-01T00:00:00Z' },
  { id: 'melder-chamaka-senarath',    name: 'Chamaka Senarath',     roleId: 'ENG-IC2',   targetCompensation: 85000, marketRate: 0, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
  { id: 'melder-cody-hall',           name: 'Cody Hall',            roleId: 'ENG-IC2',   targetCompensation: 85000, marketRate: 0, createdAt: '2022-02-01T00:00:00Z', updatedAt: '2022-02-01T00:00:00Z' },
  { id: 'melder-dakota-walker',       name: 'Dakota Walker',        roleId: 'ENG-IC1',   targetCompensation: 75000, marketRate: 0, createdAt: '2023-02-01T00:00:00Z', updatedAt: '2023-02-01T00:00:00Z' },
  { id: 'melder-eric-shea',           name: 'Eric Shea',            roleId: 'ENG-IC5',   targetCompensation: 160000, marketRate: 0, createdAt: '2023-07-01T00:00:00Z', updatedAt: '2023-07-01T00:00:00Z' },
  { id: 'melder-martin-graham',       name: 'Martin Graham',        roleId: 'ENG-IC4',   targetCompensation: 134000, marketRate: 0, createdAt: '2022-11-01T00:00:00Z', updatedAt: '2022-11-01T00:00:00Z' },
  { id: 'melder-tanner-hohn',         name: 'Tanner Hohn',          roleId: 'ENG-IC3',   targetCompensation: 95000, marketRate: 0, createdAt: '2021-06-01T00:00:00Z', updatedAt: '2021-06-01T00:00:00Z' },
  { id: 'melder-rachel-terwilliger',  name: 'Rachel Terwilliger',   roleId: 'ENG-IC2',   targetCompensation: 81000, marketRate: 0, createdAt: '2022-02-01T00:00:00Z', updatedAt: '2022-02-01T00:00:00Z' },
];
