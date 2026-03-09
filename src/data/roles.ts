import type { Role } from '../types';

export const DEFAULT_ROLES: Role[] = [
  // ── BD Track ────────────────────────────────────────────────────────────────
  {
    id: 'BDA',
    name: 'BDA',
    fullName: 'Business Development Associate',
    level: 'IC1',
    cadence: 'monthly',
    metrics: [
      {
        id: 'BDA-SQL',
        name: 'SQL Production',
        abbreviation: 'SQL',
        weight: 0.5,
        description: 'Sales Qualified Leads generated per month',
        defaultTarget: 8,
        targetDisplay: '8 SQLs/mo',
      },
      {
        id: 'BDA-VD',
        name: 'Value Demonstrated',
        abbreviation: 'VD',
        weight: 0.5,
        description: 'Pipeline value demonstrated through meetings and demos',
        defaultTarget: 2000,
        targetDisplay: '$2,000/mo',
      },
    ],
  },
  {
    id: 'BDR',
    name: 'BDR',
    fullName: 'Business Development Representative',
    level: 'IC2',
    cadence: 'monthly',
    metrics: [
      {
        id: 'BDR-SQL',
        name: 'SQL Production',
        abbreviation: 'SQL',
        weight: 0.5,
        description: 'Sales Qualified Leads generated per month',
        defaultTarget: 8,
        targetDisplay: '8 SQLs/mo',
      },
      {
        id: 'BDR-VD',
        name: 'Value Demonstrated',
        abbreviation: 'VD',
        weight: 0.5,
        description: 'Pipeline value demonstrated through meetings and demos',
        defaultTarget: 3000,
        targetDisplay: '$3,000/mo',
      },
    ],
  },
  {
    id: 'SR-BDR',
    name: 'SR-BDR',
    fullName: 'Senior / Principal BDR',
    level: 'IC3',
    cadence: 'monthly',
    metrics: [
      {
        id: 'SRBDR-SQL',
        name: 'SQL Production',
        abbreviation: 'SQL',
        weight: 0.5,
        description: 'Sales Qualified Leads generated per month',
        defaultTarget: 8,
        targetDisplay: '8 SQLs/mo',
      },
      {
        id: 'SRBDR-VD',
        name: 'Value Demonstrated',
        abbreviation: 'VD',
        weight: 0.5,
        description: 'Pipeline value demonstrated through meetings and demos',
        defaultTarget: 5000,
        targetDisplay: '$5,000/mo',
      },
    ],
  },

  // ── BSE Track ────────────────────────────────────────────────────────────────
  {
    id: 'ASSOC-BSE',
    name: 'ASSOC-BSE',
    fullName: 'Associate Business Solutions Executive',
    level: 'IC1',
    cadence: 'monthly',
    metrics: [
      {
        id: 'ABSE-MRR',
        name: 'Closed MRR',
        abbreviation: 'MRR',
        weight: 0.75,
        description: 'New MRR closed from net-new logos during the period',
        defaultTarget: 4500,
        targetDisplay: '$4,500/mo',
      },
      {
        id: 'ABSE-OUTBOUND',
        name: 'Outbound Conversion Rate',
        abbreviation: 'OB Conv %',
        weight: 0.125,
        description: 'Percentage of outbound opportunities converted to closed-won',
        defaultTarget: 18,
        targetDisplay: '18%',
      },
      {
        id: 'ABSE-INBOUND',
        name: 'Inbound Conversion Rate',
        abbreviation: 'IB Conv %',
        weight: 0.125,
        description: 'Percentage of inbound opportunities converted to closed-won',
        defaultTarget: 25,
        targetDisplay: '25%',
      },
    ],
  },
  {
    id: 'BSE',
    name: 'BSE',
    fullName: 'Business Solutions Executive',
    level: 'IC2',
    cadence: 'monthly',
    metrics: [
      {
        id: 'BSE-MRR',
        name: 'Closed MRR',
        abbreviation: 'MRR',
        weight: 0.75,
        description: 'New MRR closed from net-new logos during the period',
        defaultTarget: 5500,
        targetDisplay: '$5,500/mo',
      },
      {
        id: 'BSE-OUTBOUND',
        name: 'Outbound Conversion Rate',
        abbreviation: 'OB Conv %',
        weight: 0.125,
        description: 'Percentage of outbound opportunities converted to closed-won',
        defaultTarget: 20,
        targetDisplay: '20%',
      },
      {
        id: 'BSE-INBOUND',
        name: 'Inbound Conversion Rate',
        abbreviation: 'IB Conv %',
        weight: 0.125,
        description: 'Percentage of inbound opportunities converted to closed-won',
        defaultTarget: 30,
        targetDisplay: '30%',
      },
    ],
  },
  {
    id: 'SR-BSE',
    name: 'SR-BSE',
    fullName: 'Senior Business Solutions Executive',
    level: 'IC3',
    cadence: 'monthly',
    metrics: [
      {
        id: 'SRBSE-MRR',
        name: 'Closed MRR',
        abbreviation: 'MRR',
        weight: 0.75,
        description: 'New MRR closed from net-new logos during the period',
        defaultTarget: 6500,
        targetDisplay: '$6,500/mo',
      },
      {
        id: 'SRBSE-CONV',
        name: 'Total Conversion Rate',
        abbreviation: 'Conv %',
        weight: 0.25,
        description: 'Overall percentage of qualified opportunities converted to closed-won',
        defaultTarget: 35,
        targetDisplay: '35%',
      },
    ],
  },

  // ── Customer Success Track ───────────────────────────────────────────────────
  {
    id: 'CSM',
    name: 'CSM',
    fullName: 'Customer Success Manager (SMB)',
    level: 'IC2',
    cadence: 'monthly',
    metrics: [
      {
        id: 'CSM-GRR',
        name: 'Gross Revenue Retention',
        abbreviation: 'GRR',
        weight: 0.65,
        description: 'Percentage of recurring revenue retained from existing customers (excluding expansion)',
        defaultTarget: 98,
        targetDisplay: '98%',
      },
      {
        id: 'CSM-UCR',
        name: 'Upsell Closed Revenue',
        abbreviation: 'UCR',
        weight: 0.35,
        description: 'Revenue from upsells and expansions closed during the period',
        defaultTarget: 15000,
        targetDisplay: '$15,000/mo',
      },
    ],
  },
  {
    id: 'MM-CSM',
    name: 'MM-CSM',
    fullName: 'Mid Market Customer Success Manager',
    level: 'IC4',
    cadence: 'monthly',
    metrics: [
      {
        id: 'MMCSM-GRR',
        name: 'Gross Revenue Retention',
        abbreviation: 'GRR',
        weight: 0.8,
        description: 'Percentage of recurring revenue retained from existing customers',
        defaultTarget: 99,
        targetDisplay: '99%',
      },
      {
        id: 'MMCSM-NRR',
        name: 'Net Revenue Retention',
        abbreviation: 'NRR',
        weight: 0.2,
        description: 'Net revenue retained including expansion (upsell captured in NRR)',
        defaultTarget: 105,
        targetDisplay: '105%',
      },
    ],
  },

  // ── Customer Support Track ───────────────────────────────────────────────────
  {
    id: 'CSS',
    name: 'CSS',
    fullName: 'Customer Support Specialist',
    level: 'IC2',
    cadence: 'monthly',
    metrics: [
      {
        id: 'CSS-CSAT',
        name: 'Customer Satisfaction Score (CSAT)',
        abbreviation: 'CSAT',
        weight: 0.5,
        description: 'Customer satisfaction score as a percentage',
        defaultTarget: 97.99,
        targetDisplay: '97.99%',
      },
      {
        id: 'CSS-CRT',
        name: 'Chat Response Time',
        abbreviation: 'Chat RT',
        weight: 0.5,
        description: 'Average chat response time in minutes — lower is better (attainment = Target ÷ Actual)',
        defaultTarget: 0.4,
        targetDisplay: '0.4 min',
        inverse: true,
      },
    ],
  },
  {
    id: 'MMES',
    name: 'MMES',
    fullName: 'Mid Market Customer Enablement Specialist',
    level: 'IC4',
    cadence: 'monthly',
    metrics: [
      {
        id: 'MMES-GRR',
        name: 'Mid Market Gross Revenue Retention',
        abbreviation: 'MM GRR',
        weight: 0.5,
        description: 'Gross revenue retained from Mid Market customers (excluding expansion)',
        defaultTarget: 94,
        targetDisplay: '94%',
      },
      {
        id: 'MMES-CSAT',
        name: 'Customer Satisfaction Score (CSAT)',
        abbreviation: 'CSAT',
        weight: 0.5,
        description: 'Customer satisfaction score as a percentage',
        defaultTarget: 97.99,
        targetDisplay: '97.99%',
      },
    ],
  },

  // ── Marketing Track (comp-tracking only — OAP metrics TBD) ─────────────────
  {
    id: 'MKT-IC2',
    name: 'MKT-IC2',
    fullName: 'Marketing Specialist',
    cadence: 'monthly',
    metrics: [],
  },
  {
    id: 'MKT-IC3',
    name: 'MKT-IC3',
    fullName: 'Senior Marketing Manager',
    cadence: 'monthly',
    metrics: [],
  },
  {
    id: 'MKT-L4',
    name: 'MKT-L4',
    fullName: 'Director of Marketing',
    cadence: 'monthly',
    metrics: [],
  },

  // ── Customer Support Manager ─────────────────────────────────────────────────
  {
    id: 'CSS-MGR',
    name: 'CSS-MGR',
    fullName: 'Customer Support Manager',
    cadence: 'monthly',
    metrics: [],
  },

  // ── Customer Success Leader ───────────────────────────────────────────────────
  {
    id: 'CS-MGR',
    name: 'CS-MGR',
    fullName: 'Customer Success Team Lead',
    cadence: 'monthly',
    metrics: [],
  },

  // ── Business Development Manager ─────────────────────────────────────────────
  {
    id: 'BD-MGR',
    name: 'BD-MGR',
    fullName: 'Business Development Manager',
    cadence: 'monthly',
    metrics: [],
  },

  // ── Business Solutions Director ───────────────────────────────────────────────
  {
    id: 'BS-DIR',
    name: 'BS-DIR',
    fullName: 'Business Solutions Director',
    cadence: 'monthly',
    metrics: [],
  },

  // ── People Ops ────────────────────────────────────────────────────────────────
  {
    id: 'PEOPLE-OPS-IC',
    name: 'PEOPLE-OPS-IC',
    fullName: 'People Operations Specialist',
    cadence: 'monthly',
    metrics: [],
  },
  {
    id: 'PEOPLE-OPS-MGR',
    name: 'PEOPLE-OPS-MGR',
    fullName: 'People Operations Manager',
    cadence: 'monthly',
    metrics: [],
  },

  // ── Product ───────────────────────────────────────────────────────────────────
  {
    id: 'PROD-IC2',
    name: 'PROD-IC2',
    fullName: 'Product Manager',
    cadence: 'monthly',
    metrics: [],
  },
  {
    id: 'PROD-IC3',
    name: 'PROD-IC3',
    fullName: 'Senior Product Manager',
    cadence: 'monthly',
    metrics: [],
  },
  {
    id: 'PROD-IC4',
    name: 'PROD-IC4',
    fullName: 'Staff Product Manager',
    cadence: 'monthly',
    metrics: [],
  },

  // ── Engineering & Data ────────────────────────────────────────────────────────
  {
    id: 'DATA-IC5',
    name: 'DATA-IC5',
    fullName: 'Principal Data Engineer',
    cadence: 'monthly',
    metrics: [],
  },
  {
    id: 'DATA-MGR',
    name: 'DATA-MGR',
    fullName: 'Engineering & Data Manager',
    cadence: 'monthly',
    metrics: [],
  },

  // ── Engineering ───────────────────────────────────────────────────────────────
  {
    id: 'ENG-IC1',
    name: 'ENG-IC1',
    fullName: 'Software Engineer',
    cadence: 'monthly',
    metrics: [],
  },
  {
    id: 'ENG-IC2',
    name: 'ENG-IC2',
    fullName: 'Software Engineer II',
    cadence: 'monthly',
    metrics: [],
  },
  {
    id: 'ENG-IC3',
    name: 'ENG-IC3',
    fullName: 'Senior Software Engineer',
    cadence: 'monthly',
    metrics: [],
  },
  {
    id: 'ENG-IC4',
    name: 'ENG-IC4',
    fullName: 'Staff Software Engineer',
    cadence: 'monthly',
    metrics: [],
  },
  {
    id: 'ENG-IC5',
    name: 'ENG-IC5',
    fullName: 'Principal Software Engineer',
    cadence: 'monthly',
    metrics: [],
  },
  {
    id: 'ENG-MGR',
    name: 'ENG-MGR',
    fullName: 'Engineering Manager',
    cadence: 'monthly',
    metrics: [],
  },

  // ── Associate Customer Success ────────────────────────────────────────────
  {
    id: 'ASSOC-CSM',
    name: 'ASSOC-CSM',
    fullName: 'Associate Customer Success Manager',
    level: 'IC1',
    cadence: 'monthly',
    metrics: [],
  },

  // ── UI/UX Design ──────────────────────────────────────────────────────────
  {
    id: 'UXUI-IC',
    name: 'UXUI-IC',
    fullName: 'UI/UX Designer',
    cadence: 'monthly',
    metrics: [],
  },

  // ── Sales Leadership ──────────────────────────────────────────────────────
  {
    id: 'SALES-DIR',
    name: 'SALES-DIR',
    fullName: 'Director of Sales',
    cadence: 'monthly',
    metrics: [],
  },

  // ── Intern ────────────────────────────────────────────────────────────────
  {
    id: 'INTERN',
    name: 'INTERN',
    fullName: 'Intern',
    cadence: 'monthly',
    metrics: [],
  },

  // ── Administrative ────────────────────────────────────────────────────────
  {
    id: 'ADMIN-IC',
    name: 'ADMIN-IC',
    fullName: 'Administrative Staff',
    cadence: 'monthly',
    metrics: [],
  },
  {
    id: 'EXEC',
    name: 'EXEC',
    fullName: 'Executive',
    cadence: 'monthly',
    metrics: [],
  },

  // ── Onboarding Track ────────────────────────────────────────────────────────
  {
    id: 'COM',
    name: 'COM',
    fullName: 'Customer Onboarding Manager',
    level: 'IC2',
    cadence: 'quarterly',
    metrics: [
      {
        id: 'COM-14DAY',
        name: '14-Day Conversion Rate',
        abbreviation: '14-Day Conv',
        weight: 0.5,
        description: 'Average 14-day conversion rate across the quarter',
        defaultTarget: 75,
        targetDisplay: '75%',
      },
      {
        id: 'COM-90DAY',
        name: '90-Day Conversion Rate',
        abbreviation: '90-Day Conv',
        weight: 0.5,
        description: 'Percentage of onboarded customers fully converted at 90 days',
        defaultTarget: 85,
        targetDisplay: '85%',
      },
    ],
  },
];
