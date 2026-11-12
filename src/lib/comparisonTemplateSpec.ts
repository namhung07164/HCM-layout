export interface ComparisonRowInput {
  // 1. Identification & Attributes (Image 2)
  'Store'?: string;
  'Floor'?: string;
  'Unit Code'?: string;
  'Brand / Shop Name'?: string;
  'Brand Code'?: string;
  'Vendor Code'?: string;
  'Class Code'?: string;
  'Shop Type'?: string;
  'Contract Size (m2)'?: number | string;
  'Year'?: number | string;

  // 2. MD Status & Task (Image 2)
  'MD Status'?: string;
  'MD Notes'?: string;
  'Task'?: string;

  // 3. Real-time Project & App Data (Image 3)
  'Project Code'?: string;
  'Project Name'?: string;
  'Project Status'?: string;
  'Act Status'?: string;
  'Start Date'?: string;
  'Handover Date'?: string;
  'Finish Date'?: string;
  'Opening Date'?: string;
  'Party / Contractor'?: string;
  'Budget'?: number | string;
  'Actual Cost'?: number | string;
  'Notes / Detail'?: string;

  // 4. Financial & Performance Metrics (Image 1)
  'Sales Amount'?: number | string;
  'Sales by CP'?: number | string;
  'Sales by HCMcate'?: number | string;
  'Profit Amount'?: number | string;
  'Profit by CP'?: number | string;
  'Profit by HCMcate'?: number | string;
  'Margin (%)'?: number | string;
  'Margin by CP (%)'?: number | string;
  'HCM Sales Effi'?: number | string;
  'HCM Margin (%)'?: number | string;

  [key: string]: any;
}

export const SAMPLE_COMPARISON_DATA: ComparisonRowInput[] = [
  {
    'Store': 'HCM',
    'Floor': 'L1',
    'Unit Code': 'L1-01',
    'Brand / Shop Name': 'Chanel Cosmetics',
    'Brand Code': 'BR_CHANEL',
    'Vendor Code': 'V_CHANEL_01',
    'Class Code': '1101',
    'Shop Type': 'Cosmetics',
    'Contract Size (m2)': 65.5,
    'Year': 2026,

    'MD Status': 'Operating',
    'MD Notes': 'Flagship booth near main entrance',
    'Task': 'Counter Remodel & Handover',

    'Project Code': 'HCM-L1-01',
    'Project Name': 'Chanel Flagship Remodel',
    'Project Status': 'Completed',
    'Act Status': 'Completed',
    'Start Date': '2026-01-10',
    'Handover Date': '2026-02-01',
    'Finish Date': '2026-02-20',
    'Opening Date': '2026-03-01',
    'Party / Contractor': 'Taka Interior',
    'Budget': 1850000000,
    'Actual Cost': 1720000000,
    'Notes / Detail': 'Premium fitout completed on schedule',

    'Sales Amount': 1850000000,
    'Sales by CP': 920000000,
    'Sales by HCMcate': 1500000000,
    'Profit Amount': 420000000,
    'Profit by CP': 210000000,
    'Profit by HCMcate': 380000000,
    'Margin (%)': 22.7,
    'Margin by CP (%)': 22.8,
    'HCM Sales Effi': 85.5,
    'HCM Margin (%)': 23.0,
  },
  {
    'Store': 'HCM',
    'Floor': 'L1',
    'Unit Code': 'L1-02',
    'Brand / Shop Name': 'Dior Beauty',
    'Brand Code': 'BR_DIOR',
    'Vendor Code': 'V_DIOR_01',
    'Class Code': '1101',
    'Shop Type': 'Cosmetics',
    'Contract Size (m2)': 58.0,
    'Year': 2026,

    'MD Status': 'Renovating',
    'MD Notes': 'Counter upgrade in progress',
    'Task': 'Lighting & Display Installation',

    'Project Code': 'HCM-L1-02',
    'Project Name': 'Dior Beauty Upgrade',
    'Project Status': 'On process',
    'Act Status': 'On process',
    'Start Date': '2026-10-15',
    'Handover Date': '2026-11-01',
    'Finish Date': '2026-11-25',
    'Opening Date': '2026-12-01',
    'Party / Contractor': 'AA Corporation',
    'Budget': 1420000000,
    'Actual Cost': 1350000000,
    'Notes / Detail': 'Lighting upgrade & counter remodel',

    'Sales Amount': 1420000000,
    'Sales by CP': 710000000,
    'Sales by HCMcate': 1200000000,
    'Profit Amount': 310000000,
    'Profit by CP': 155000000,
    'Profit by HCMcate': 290000000,
    'Margin (%)': 21.8,
    'Margin by CP (%)': 21.8,
    'HCM Sales Effi': 78.2,
    'HCM Margin (%)': 22.5,
  },
  {
    'Store': 'HCM',
    'Floor': 'B1',
    'Unit Code': 'B1-10',
    'Brand / Shop Name': 'Starbucks Reserve',
    'Brand Code': 'BR_STARBUCKS',
    'Vendor Code': 'V_SBUX_01',
    'Class Code': '2105',
    'Shop Type': 'F&B',
    'Contract Size (m2)': 120.0,
    'Year': 2026,

    'MD Status': 'Operating',
    'MD Notes': 'Long-term anchor tenant',
    'Task': 'Annual Maintenance Check',

    'Project Code': 'HCM-B1-10',
    'Project Name': 'Starbucks Reserve Store',
    'Project Status': 'Completed',
    'Act Status': 'Completed',
    'Start Date': '2026-02-01',
    'Handover Date': '2026-02-15',
    'Finish Date': '2026-03-10',
    'Opening Date': '2026-03-15',
    'Party / Contractor': 'VinaDecor',
    'Budget': 980000000,
    'Actual Cost': 950000000,
    'Notes / Detail': 'High foot-traffic corner unit',

    'Sales Amount': 980000000,
    'Sales by CP': 490000000,
    'Sales by HCMcate': 900000000,
    'Profit Amount': 245000000,
    'Profit by CP': 122500000,
    'Profit by HCMcate': 230000000,
    'Margin (%)': 25.0,
    'Margin by CP (%)': 25.0,
    'HCM Sales Effi': 62.4,
    'HCM Margin (%)': 26.0,
  },
];

export const COMPARISON_TEMPLATE_COL_WIDTHS = [
  { wch: 8 },  // Store
  { wch: 8 },  // Floor
  { wch: 14 }, // Unit Code
  { wch: 22 }, // Brand / Shop Name
  { wch: 14 }, // Brand Code
  { wch: 14 }, // Vendor Code
  { wch: 12 }, // Class Code
  { wch: 14 }, // Shop Type
  { wch: 18 }, // Contract Size (m2)
  { wch: 8 },  // Year
  { wch: 16 }, // MD Status
  { wch: 24 }, // MD Notes
  { wch: 24 }, // Task
  { wch: 16 }, // Project Code
  { wch: 26 }, // Project Name
  { wch: 16 }, // Project Status
  { wch: 14 }, // Act Status
  { wch: 14 }, // Start Date
  { wch: 14 }, // Handover Date
  { wch: 14 }, // Finish Date
  { wch: 14 }, // Opening Date
  { wch: 18 }, // Party / Contractor
  { wch: 16 }, // Budget
  { wch: 16 }, // Actual Cost
  { wch: 28 }, // Notes / Detail
  { wch: 16 }, // Sales Amount
  { wch: 16 }, // Sales by CP
  { wch: 18 }, // Sales by HCMcate
  { wch: 16 }, // Profit Amount
  { wch: 16 }, // Profit by CP
  { wch: 18 }, // Profit by HCMcate
  { wch: 14 }, // Margin (%)
  { wch: 18 }, // Margin by CP (%)
  { wch: 16 }, // HCM Sales Effi
  { wch: 16 }, // HCM Margin (%)
];
