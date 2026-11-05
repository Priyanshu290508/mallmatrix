// src/data/mallData.js
// Single source of truth for MallMatrix data

export const initialStores = [
  {
    id: 'ten-1',
    name: 'Apple Store',
    unit: '#101, Floor 1 (Central Atrium)',
    category: 'Consumer Electronics & Hardware',
    skus: '1,420 SKUs',
    stockHealth: 94,
    salesToday: '$48,200',
    salesAmount: 48200,
    unitsSold: 284,
    turnoverRate: 94,
    changePct: 8.4,
    sparkline: [38, 42, 45, 48, 52, 49, 58],
    posStatus: 'online',
    lastSync: '2s ago',
    manager: 'Michael Ross',
    contact: 'ext. 4101',
    status: 'Active'
  },
  {
    id: 'ten-2',
    name: 'Zara Flagship',
    unit: '#204, Floor 2 (North Wing)',
    category: 'Fashion & Apparel',
    skus: '3,850 SKUs',
    stockHealth: 78,
    salesToday: '$32,450',
    salesAmount: 32450,
    unitsSold: 196,
    turnoverRate: 78,
    changePct: 4.2,
    sparkline: [28, 30, 26, 34, 31, 35, 39],
    posStatus: 'online',
    lastSync: '5s ago',
    manager: 'Clara Dubois',
    contact: 'ext. 4204',
    status: 'Active'
  },
  {
    id: 'ten-3',
    name: 'Nike Experience',
    unit: '#112, Floor 1 (Sports Corridor)',
    category: 'Footwear & Athletic Gear',
    skus: '2,150 SKUs',
    stockHealth: 88,
    salesToday: '$24,180',
    salesAmount: 24180,
    unitsSold: 142,
    turnoverRate: 88,
    changePct: -2.1,
    sparkline: [29, 27, 28, 25, 26, 24, 23],
    posStatus: 'delayed',
    lastSync: '48s ago',
    manager: 'Marcus Sterling',
    contact: 'ext. 4112',
    status: 'Active'
  },
  {
    id: 'ten-4',
    name: 'Sephora Luxury',
    unit: '#108, Floor 1 (Beauty Plaza)',
    category: 'Cosmetics & Fragrances',
    skus: '2,940 SKUs',
    stockHealth: 82,
    salesToday: '$19,840',
    salesAmount: 19840,
    unitsSold: 168,
    turnoverRate: 82,
    changePct: 6.5,
    sparkline: [15, 17, 16, 18, 19, 21, 23],
    posStatus: 'online',
    lastSync: '3s ago',
    manager: 'Hannah Vance',
    contact: 'ext. 4108',
    status: 'Active'
  },
  {
    id: 'ten-5',
    name: 'H&M Retail',
    unit: '#201, Floor 2 (Grand Promenade)',
    category: 'Fast Fashion & Homeware',
    skus: '4,100 SKUs',
    stockHealth: 90,
    salesToday: '$16,250',
    salesAmount: 16250,
    unitsSold: 215,
    turnoverRate: 72,
    changePct: -4.8,
    sparkline: [22, 20, 19, 21, 18, 17, 16],
    posStatus: 'delayed',
    lastSync: '1m ago',
    manager: 'Liam Gallagher',
    contact: 'ext. 4201',
    status: 'Active'
  },
  {
    id: 'ten-6',
    name: 'Starbucks Reserve',
    unit: '#G-05, Ground Floor (East Entrance)',
    category: 'Specialty Coffee & Bakery',
    skus: '480 SKUs',
    stockHealth: 96,
    salesToday: '$8,000',
    salesAmount: 8000,
    unitsSold: 310,
    turnoverRate: 64,
    changePct: -11.4,
    sparkline: [14, 13, 11, 12, 10, 9, 8],
    posStatus: 'offline',
    lastSync: '14m ago',
    manager: 'Maya Lin',
    contact: 'ext. 4005',
    status: 'Offline'
  }
];

export const initialProducts = [
  {
    id: 'prod-1',
    name: 'Zara Tailored Wool Overcoat',
    sku: 'SKU-ZAR-882',
    tenant: 'Zara Flagship',
    unit: '#204',
    category: 'Fashion',
    stock: 4,
    minBuffer: 25,
    price: 189.00
  },
  {
    id: 'prod-2',
    name: 'Apple USB-C 30W Power Adapter',
    sku: 'SKU-APP-102',
    tenant: 'Apple Store',
    unit: '#101',
    category: 'Electronics',
    stock: 8,
    minBuffer: 50,
    price: 39.00
  },
  {
    id: 'prod-3',
    name: 'Nike Air Zoom Pegasus 41',
    sku: 'SKU-NIK-401',
    tenant: 'Nike Experience',
    unit: '#112',
    category: 'Footwear',
    stock: 6,
    minBuffer: 30,
    price: 140.00
  },
  {
    id: 'prod-4',
    name: 'Sephora Hydration Glow Serum 50ml',
    sku: 'SKU-SEP-309',
    tenant: 'Sephora Luxury',
    unit: '#108',
    category: 'Cosmetics',
    stock: 5,
    minBuffer: 20,
    price: 68.00
  },
  {
    id: 'prod-5',
    name: 'H&M Relaxed Fit Organic Hoodie',
    sku: 'SKU-HM-551',
    tenant: 'H&M Retail',
    unit: '#201',
    category: 'Fashion',
    stock: 12,
    minBuffer: 40,
    price: 34.99
  },
  {
    id: 'prod-6',
    name: 'Starbucks Colombian Whole Bean (1kg)',
    sku: 'SKU-SBX-012',
    tenant: 'Starbucks Reserve',
    unit: '#G-05',
    category: 'Dining',
    stock: 22,
    minBuffer: 35,
    price: 28.50
  },
  {
    id: 'prod-7',
    name: 'Apple iPhone 16 Pro 256GB Natural Titanium',
    sku: 'SKU-APP-990',
    tenant: 'Apple Store',
    unit: '#101',
    category: 'Electronics',
    stock: 64,
    minBuffer: 25,
    price: 1099.00
  },
  {
    id: 'prod-8',
    name: 'Nike Tech Fleece Windrunner',
    sku: 'SKU-NIK-884',
    tenant: 'Nike Experience',
    unit: '#112',
    category: 'Fashion',
    stock: 78,
    minBuffer: 30,
    price: 135.00
  }
];

export const initialPurchaseOrders = [
  {
    id: 'PO-8942',
    supplier: 'Inditex Global Logistics',
    vendorContact: 'Inditex Logistics EMEA (dispatch@inditex.com)',
    leadTime: '3 business days',
    items: '75x Wool Overcoats, 120x Knitwear',
    tenant: 'Zara Flagship (#204)',
    unit: '#204, Floor 2 (North Wing)',
    value: 14250.00,
    status: 'Pending',
    reason: 'Triggered: stock 4 < min buffer 25 (Autumn seasonal spike)',
    createdDate: 'Nov 05, 2026, 09:30 AM',
    expectedDelivery: 'Nov 08, 2026',
    timeline: {
      created: 'Nov 05, 2026, 09:30 AM',
      approved: null,
      shipped: null,
      delivered: null
    },
    lineItems: [
      { name: 'Wool Blend Overcoats', sku: 'SKU-ZAR-882', qty: 75, price: 110.00, subtotal: 8250.00 },
      { name: 'Fine Merino Knitwear', sku: 'SKU-ZAR-883', qty: 120, price: 50.00, subtotal: 6000.00 }
    ],
    rejectionReason: null
  },
  {
    id: 'PO-8941',
    supplier: 'Apple Retail Operations Corp',
    vendorContact: 'Apple B2B Supply (procure@apple.com)',
    leadTime: '2 business days',
    items: '120x USB-C Chargers, 40x AirPods Pro',
    tenant: 'Apple Store (#101)',
    unit: '#101, Floor 1 (Central Atrium)',
    value: 18400.00,
    status: 'Delivered',
    reason: 'Triggered: stock 8 < min buffer 50 (Safety replenishment)',
    createdDate: 'Nov 02, 2026, 08:15 AM',
    expectedDelivery: 'Delivered on Nov 04, 2026',
    timeline: {
      created: 'Nov 02, 2026, 08:15 AM',
      approved: 'Nov 02, 2026, 10:00 AM',
      shipped: 'Nov 03, 2026, 02:45 PM',
      delivered: 'Nov 04, 2026, 11:20 AM'
    },
    lineItems: [
      { name: 'USB-C 20W Power Adapters', sku: 'SKU-APP-102', qty: 120, price: 29.00, subtotal: 3480.00 },
      { name: 'AirPods Pro (2nd Gen)', sku: 'SKU-APP-103', qty: 40, price: 373.00, subtotal: 14920.00 }
    ],
    rejectionReason: null
  },
  {
    id: 'PO-8940',
    supplier: 'Nike Direct Supply EMEA',
    vendorContact: 'Nike Regional B2B Hub (orders@nike-emea.com)',
    leadTime: '4 business days',
    items: '80x Pegasus 41, 60x Metcon 9',
    tenant: 'Nike Experience (#112)',
    unit: '#112, Floor 1 (Sports Corridor)',
    value: 16100.00,
    status: 'Pending',
    reason: 'Triggered: stock 6 < min buffer 30 (Marathon promotion velocity)',
    createdDate: 'Nov 05, 2026, 10:12 AM',
    expectedDelivery: 'Nov 09, 2026',
    timeline: {
      created: 'Nov 05, 2026, 10:12 AM',
      approved: null,
      shipped: null,
      delivered: null
    },
    lineItems: [
      { name: 'Air Zoom Pegasus 41', sku: 'SKU-NIK-412', qty: 80, price: 115.00, subtotal: 9200.00 },
      { name: 'Nike Metcon 9 Training', sku: 'SKU-NIK-413', qty: 60, price: 115.00, subtotal: 6900.00 }
    ],
    rejectionReason: null
  },
  {
    id: 'PO-8939',
    supplier: 'LVMH Beauty Distribution',
    vendorContact: 'LVMH Logistics Paris (dispatch@lvmh-beauty.com)',
    leadTime: '3 business days',
    items: '100x Glow Serums, 45x Luxury Scents',
    tenant: 'Sephora Luxury (#108)',
    unit: '#108, Floor 1 (Beauty Plaza)',
    value: 8950.00,
    status: 'Delivered',
    reason: 'Triggered: stock 5 < min buffer 20 (Fragrance stock depletion)',
    createdDate: 'Nov 01, 2026, 02:30 PM',
    expectedDelivery: 'Delivered on Nov 03, 2026',
    timeline: {
      created: 'Nov 01, 2026, 02:30 PM',
      approved: 'Nov 01, 2026, 04:15 PM',
      shipped: 'Nov 02, 2026, 09:00 AM',
      delivered: 'Nov 03, 2026, 03:10 PM'
    },
    lineItems: [
      { name: 'Hydra-Luxe Glow Serums', sku: 'SKU-SEP-301', qty: 100, price: 45.00, subtotal: 4500.00 },
      { name: 'Maison Luxury Scents', sku: 'SKU-SEP-302', qty: 45, price: 98.88, subtotal: 4450.00 }
    ],
    rejectionReason: null
  }
];

export const initialStaff = [
  {
    name: 'Elena Rostova',
    id: 'STF-081',
    role: 'Lead Inventory Auditor',
    zone: 'Level 1 & Luxury Plaza',
    status: 'On Duty',
    audits: 'Apple Store & Sephora Audit',
    contact: 'elena.r@mallmatrix.com'
  },
  {
    name: 'Marcus Vance',
    id: 'STF-082',
    role: 'Dock Receiving Supervisor',
    zone: 'Central Logistics Dock B',
    status: 'On Duty',
    audits: 'Inditex Freight Inflow Ingest',
    contact: 'marcus.v@mallmatrix.com'
  },
  {
    name: 'Chloe Bennett',
    id: 'STF-083',
    role: 'Tenant Stock Compliance Officer',
    zone: 'Level 2 Fashion Promenade',
    status: 'On Duty',
    audits: 'Zara Seasonal Clearance Verify',
    contact: 'chloe.b@mallmatrix.com'
  },
  {
    name: 'David Chen',
    id: 'STF-084',
    role: 'Automated Restock Coordinator',
    zone: 'Operations Hub / Level 4',
    status: 'On Break',
    audits: 'PO-8942 Dispatch Queue',
    contact: 'david.c@mallmatrix.com'
  }
];

// Helper calculations derived from single mock source
export function getTotalGrossSales(stores = initialStores) {
  return stores.reduce((sum, s) => sum + (Number(s.salesAmount) || 0), 0);
}

export function getTotalStockValuation(products = initialProducts) {
  return products.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.price) || 0)), 0);
}

export function getCriticalStockCount(products = initialProducts) {
  return products.filter(p => p.stock < (p.minBuffer * 0.5)).length;
}

export function getLowStockCount(products = initialProducts) {
  return products.filter(p => p.stock <= p.minBuffer).length;
}

export function getPendingPOCount(orders = initialPurchaseOrders) {
  return orders.filter(p => p.status === 'Pending').length;
}

// Ordinal date formatter: "5th November 2026"
export function formatOrdinalDate(date = new Date()) {
  const day = date.getDate();
  let suffix = 'th';
  if (day % 10 === 1 && day !== 11) suffix = 'st';
  else if (day % 10 === 2 && day !== 12) suffix = 'nd';
  else if (day % 10 === 3 && day !== 13) suffix = 'rd';

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day}${suffix} ${month} ${year}`;
}

// Currency formatter: USD ($) or INR (₹ with Indian digit grouping)
export function formatCurrency(amount, currency = 'USD') {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]+/g, '')) || 0;
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

