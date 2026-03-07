import type { Role } from '../types';

export const DEFAULT_ROLES: Role[] = [
  {
    id: 'CSM',
    name: 'CSM',
    fullName: 'Customer Success Manager',
    cadence: 'monthly',
    metrics: [
      {
        id: 'GRR',
        name: 'Gross Revenue Retention',
        abbreviation: 'GRR',
        weight: 0.65,
        description: 'Percentage of recurring revenue retained from existing customers (excluding expansion)',
      },
      {
        id: 'UCR',
        name: 'Upsell Closed Revenue',
        abbreviation: 'UCR',
        weight: 0.35,
        description: 'Revenue from upsells and expansions closed during the period',
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
        id: 'MRR',
        name: 'Closed Monthly Recurring Revenue',
        abbreviation: 'MRR',
        weight: 0.75,
        description: 'New MRR closed from net-new logos during the period',
      },
      {
        id: 'ACR',
        name: 'Average Conversion Rate',
        abbreviation: 'ACR',
        weight: 0.25,
        description: 'Percentage of qualified opportunities converted to closed-won',
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
        id: 'SQL-A',
        name: 'SQL Attainment',
        abbreviation: 'SQL-A',
        weight: 0.5,
        description: 'Number of Sales Qualified Leads generated vs. target',
      },
      {
        id: 'OVD',
        name: 'Outbound Value Demonstrated',
        abbreviation: 'OVD',
        weight: 0.5,
        description: 'Meetings booked or pipeline value from outbound activity vs. target',
      },
    ],
  },
];
