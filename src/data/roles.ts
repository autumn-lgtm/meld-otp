import type { Role } from '../types';

export const DEFAULT_ROLES: Role[] = [
  // ── BD Track ────────────────────────────────────────────────────────────────
  {
    id: 'BDA',
    name: 'BDA',
    fullName: 'Business Development Associate',
    cadence: 'monthly',
    metrics: [
      {
        id: 'BDA-SQL',
        name: 'SQL Production',
        abbreviation: 'SQL',
        weight: 0.5,
        description: 'Sales Qualified Leads generated per month',
        defaultTarget: 8,
      },
      {
        id: 'BDA-VD',
        name: 'Value Demonstrated',
        abbreviation: 'VD',
        weight: 0.5,
        description: 'Pipeline value demonstrated through meetings and demos',
        defaultTarget: 2000,
      },
    ],
  },
  {
    id: 'BDR',
    name: 'BDR',
    fullName: 'Business Development Representative',
    cadence: 'monthly',
    metrics: [
      {
        id: 'BDR-SQL',
        name: 'SQL Production',
        abbreviation: 'SQL',
        weight: 0.5,
        description: 'Sales Qualified Leads generated per month',
        defaultTarget: 8,
      },
      {
        id: 'BDR-VD',
        name: 'Value Demonstrated',
        abbreviation: 'VD',
        weight: 0.5,
        description: 'Pipeline value demonstrated through meetings and demos',
        defaultTarget: 3000,
      },
    ],
  },
  {
    id: 'SR-BDR',
    name: 'SR-BDR',
    fullName: 'Senior / Principal BDR',
    cadence: 'monthly',
    metrics: [
      {
        id: 'SRBDR-SQL',
        name: 'SQL Production',
        abbreviation: 'SQL',
        weight: 0.5,
        description: 'Sales Qualified Leads generated per month',
        defaultTarget: 8,
      },
      {
        id: 'SRBDR-VD',
        name: 'Value Demonstrated',
        abbreviation: 'VD',
        weight: 0.5,
        description: 'Pipeline value demonstrated through meetings and demos',
        defaultTarget: 5000,
      },
    ],
  },

  // ── BSE Track ────────────────────────────────────────────────────────────────
  {
    id: 'ASSOC-BSE',
    name: 'ASSOC-BSE',
    fullName: 'Associate Business Solutions Executive',
    cadence: 'monthly',
    metrics: [
      {
        id: 'ABSE-MRR',
        name: 'Closed MRR',
        abbreviation: 'MRR',
        weight: 0.75,
        description: 'New MRR closed from net-new logos during the period',
        defaultTarget: 4500,
      },
      {
        id: 'ABSE-OUTBOUND',
        name: 'Outbound Conversion Rate',
        abbreviation: 'OB Conv %',
        weight: 0.125,
        description: 'Percentage of outbound opportunities converted to closed-won',
        defaultTarget: 18,
      },
      {
        id: 'ABSE-INBOUND',
        name: 'Inbound Conversion Rate',
        abbreviation: 'IB Conv %',
        weight: 0.125,
        description: 'Percentage of inbound opportunities converted to closed-won',
        defaultTarget: 25,
      },
    ],
  },
  {
    id: 'BSE',
    name: 'BSE',
    fullName: 'Business Solutions Executive',
    cadence: 'monthly',
    metrics: [
      {
        id: 'BSE-MRR',
        name: 'Closed MRR',
        abbreviation: 'MRR',
        weight: 0.75,
        description: 'New MRR closed from net-new logos during the period',
        defaultTarget: 5500,
      },
      {
        id: 'BSE-OUTBOUND',
        name: 'Outbound Conversion Rate',
        abbreviation: 'OB Conv %',
        weight: 0.125,
        description: 'Percentage of outbound opportunities converted to closed-won',
        defaultTarget: 20,
      },
      {
        id: 'BSE-INBOUND',
        name: 'Inbound Conversion Rate',
        abbreviation: 'IB Conv %',
        weight: 0.125,
        description: 'Percentage of inbound opportunities converted to closed-won',
        defaultTarget: 30,
      },
    ],
  },
  {
    id: 'SR-BSE',
    name: 'SR-BSE',
    fullName: 'Senior Business Solutions Executive',
    cadence: 'monthly',
    metrics: [
      {
        id: 'SRBSE-MRR',
        name: 'Closed MRR',
        abbreviation: 'MRR',
        weight: 0.75,
        description: 'New MRR closed from net-new logos during the period',
        defaultTarget: 6500,
      },
      {
        id: 'SRBSE-CONV',
        name: 'Total Conversion Rate',
        abbreviation: 'Conv %',
        weight: 0.25,
        description: 'Overall percentage of qualified opportunities converted to closed-won',
        defaultTarget: 35,
      },
    ],
  },

  // ── Customer Success Track ───────────────────────────────────────────────────
  {
    id: 'CSM',
    name: 'CSM',
    fullName: 'Customer Success Manager (SMB)',
    cadence: 'monthly',
    metrics: [
      {
        id: 'CSM-GRR',
        name: 'Gross Revenue Retention',
        abbreviation: 'GRR',
        weight: 0.65,
        description: 'Percentage of recurring revenue retained from existing customers (excluding expansion)',
      },
      {
        id: 'CSM-UCR',
        name: 'Upsell Closed Revenue',
        abbreviation: 'UCR',
        weight: 0.35,
        description: 'Revenue from upsells and expansions closed during the period',
      },
    ],
  },
  {
    id: 'MM-CSM',
    name: 'MM-CSM',
    fullName: 'Mid Market Customer Success Manager',
    cadence: 'monthly',
    metrics: [
      {
        id: 'MMCSM-GRR',
        name: 'Gross Revenue Retention',
        abbreviation: 'GRR',
        weight: 0.8,
        description: 'Percentage of recurring revenue retained from existing customers',
      },
      {
        id: 'MMCSM-NRR',
        name: 'Net Revenue Retention',
        abbreviation: 'NRR',
        weight: 0.2,
        description: 'Net revenue retained including expansion (upsell captured in NRR)',
      },
    ],
  },

  // ── Customer Support Track ───────────────────────────────────────────────────
  {
    id: 'CSS',
    name: 'CSS',
    fullName: 'Customer Support Specialist',
    cadence: 'monthly',
    metrics: [
      {
        id: 'CSS-CSAT',
        name: 'Customer Satisfaction Score (CSAT)',
        abbreviation: 'CSAT',
        weight: 0.5,
        description: 'Customer satisfaction score as a percentage',
        defaultTarget: 97.99,
      },
      {
        id: 'CSS-CRT',
        name: 'Chat Response Time',
        abbreviation: 'Chat RT',
        weight: 0.5,
        description: 'Average chat response time in minutes — lower is better (attainment = Target ÷ Actual)',
        defaultTarget: 0.4,
        inverse: true,
      },
    ],
  },
  {
    id: 'MMES',
    name: 'MMES',
    fullName: 'Mid Market Customer Enablement Specialist',
    cadence: 'monthly',
    metrics: [
      {
        id: 'MMES-GRR',
        name: 'Mid Market Gross Revenue Retention',
        abbreviation: 'MM GRR',
        weight: 0.5,
        description: 'Gross revenue retained from Mid Market customers (excluding expansion)',
        defaultTarget: 94,
      },
      {
        id: 'MMES-CSAT',
        name: 'Customer Satisfaction Score (CSAT)',
        abbreviation: 'CSAT',
        weight: 0.5,
        description: 'Customer satisfaction score as a percentage',
        defaultTarget: 97.99,
      },
    ],
  },

  // ── Onboarding Track ────────────────────────────────────────────────────────
  {
    id: 'COM',
    name: 'COM',
    fullName: 'Customer Onboarding Manager',
    cadence: 'quarterly',
    metrics: [
      {
        id: 'COM-14DAY',
        name: '14-Day Conversion Rate',
        abbreviation: '14-Day Conv',
        weight: 0.5,
        description: 'Average 14-day conversion rate across the quarter',
      },
      {
        id: 'COM-90DAY',
        name: '90-Day Conversion Rate',
        abbreviation: '90-Day Conv',
        weight: 0.5,
        description: 'Percentage of onboarded customers fully converted at 90 days',
      },
    ],
  },
];
