/**
 * MALLMATRIX — Smart Import Engine
 * Universal file ingestion, type detection, automated cleaning,
 * fuzzy column mapping, duplicate resolution, and error issue logging.
 * 
 * Never rejects fixable rows. Clean separation from UI and persistence.
 */

import * as XLSX from 'xlsx';

// Known type fingerprints (normalized header tokens required)
export const KNOWN_FINGERPRINTS = {
  tenants: ['storeid', 'unitnumber', 'leaseid'],
  sales: ['salesrecordid', 'reportdate', 'grosssalesinr'],
  inventory: ['inventoryid', 'skuid', 'qtyonhand'],
  reordering: ['reorderid', 'ponumber'],
  kpis: ['snapshotdate', 'periodtype', 'mtdnetsalesinr'],
  legacy_products: ['name', 'sku', 'tenant', 'stock', 'minbuffer', 'price']
};

// Strict processing order: Tenants -> Inventory -> Reordering -> Sales -> KPIs -> Legacy -> Custom
export const TYPE_PROCESSING_ORDER = {
  tenants: 1,
  inventory: 2,
  reordering: 3,
  sales: 4,
  kpis: 5,
  legacy_products: 6,
  custom: 7,
  unknown: 8
};

// Synonym dictionary for automatic column mapping on unknown files
export const SYNONYM_DICTIONARY = {
  name: ['name', 'product', 'item', 'title', 'product_name', 'item_name', 'description', 'label', 'product_title'],
  sku: ['sku', 'sku_id', 'code', 'barcode', 'item_code', 'identifier', 'sku_code', 'product_sku'],
  tenant: ['tenant', 'store', 'shop', 'outlet', 'retailer', 'store_name', 'merchant', 'target_store'],
  stock: ['stock', 'qty', 'quantity', 'stock_qty', 'on_hand', 'units', 'inventory', 'available', 'qty_available', 'qty_on_hand', 'qty_left'],
  minBuffer: ['minbuffer', 'min_buffer', 'buffer', 'safety_stock', 'reorder_point', 'threshold', 'min_stock', 'safety_buffer'],
  price: ['price', 'mrp', 'rate', 'selling_price', 'cost', 'unit_price', 'amount', 'retail_price'],
  category: ['category', 'cat', 'dept', 'department', 'brand', 'type', 'group'],
  unit: ['unit', 'unit_number', 'location', 'floor', 'zone', 'shop_no', 'unit_no'],
  supplier: ['supplier', 'vendor', 'distributor', 'supplier_name', 'source']
};

/**
 * Normalize a header string by converting to lowercase and stripping all non-alphanumeric characters.
 * @param {string} header 
 * @returns {string}
 */
export function normalizeHeader(header) {
  return String(header || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Generate normalized header signature key for a dataset.
 * Used for template caching.
 */
export function getHeaderSignature(headers = []) {
  return headers.map(normalizeHeader).filter(Boolean).sort().join('|');
}

/**
 * Calculate bigram Dice similarity between two strings (0.0 to 1.0).
 */
export function stringSimilarity(str1, str2) {
  const s1 = normalizeHeader(str1);
  const s2 = normalizeHeader(str2);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return s1 === s2 ? 1 : 0;

  const getBigrams = (str) => {
    const map = new Map();
    for (let i = 0; i < str.length - 1; i++) {
      const bigram = str.substring(i, i + 2);
      map.set(bigram, (map.get(bigram) || 0) + 1);
    }
    return map;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  let intersection = 0;

  for (const [bigram, count] of b1.entries()) {
    if (b2.has(bigram)) {
      intersection += Math.min(count, b2.get(bigram));
    }
  }

  return (2.0 * intersection) / ((s1.length - 1) + (s2.length - 1));
}

/**
 * Suggest a target field name for an unknown header using synonyms and fuzzy matching.
 */
export function suggestTargetField(header, targetTable = 'products') {
  const normalized = normalizeHeader(header);
  if (!normalized) return { field: 'extra', confidence: 0 };

  // 1. Direct synonym dictionary lookup
  for (const [targetField, synonyms] of Object.entries(SYNONYM_DICTIONARY)) {
    for (const syn of synonyms) {
      const normSyn = normalizeHeader(syn);
      if (normalized === normSyn || normalized.includes(normSyn) || normSyn.includes(normalized)) {
        return { field: targetField, confidence: 1.0 };
      }
    }
  }

  // 2. Fuzzy matching (> 0.8 threshold)
  let bestField = 'extra';
  let bestScore = 0.8;

  for (const [targetField, synonyms] of Object.entries(SYNONYM_DICTIONARY)) {
    for (const syn of synonyms) {
      const score = stringSimilarity(normalized, syn);
      if (score > bestScore) {
        bestScore = score;
        bestField = targetField;
      }
    }
  }

  return { field: bestField, confidence: bestScore > 0.8 ? bestScore : 0 };
}

/**
 * Detect the dataset type based on column fingerprints.
 * Accepts either an Array of string headers or a Dataset object { headers: [...] }.
 * @param {Array<string>|Object} datasetOrHeaders - Raw header names or dataset object
 * @param {Array<Object>} [savedTemplates] - Optional list of user-saved mapping templates
 * @returns {{ type: string, confidence: number, targetTable?: string, isTemplate?: boolean, template?: Object }}
 */
export function detectDatasetType(datasetOrHeaders = [], savedTemplates = []) {
  const headers = Array.isArray(datasetOrHeaders)
    ? datasetOrHeaders
    : (datasetOrHeaders && Array.isArray(datasetOrHeaders.headers) ? datasetOrHeaders.headers : []);

  const normalizedHeaders = headers.map(normalizeHeader);
  const normSet = new Set(normalizedHeaders);

  // 1. Check known fingerprints
  for (const [type, requiredTokens] of Object.entries(KNOWN_FINGERPRINTS)) {
    const allPresent = requiredTokens.every(token => normSet.has(token));
    if (allPresent) {
      let targetTable = type;
      if (type === 'tenants') targetTable = 'stores';
      else if (type === 'inventory') targetTable = 'products';
      else if (type === 'reordering') targetTable = 'purchaseOrders';
      else if (type === 'sales') targetTable = 'sales';
      else if (type === 'kpis') targetTable = 'kpis';
      else if (type === 'legacy_products') targetTable = 'products';
      return { type, confidence: 1.0, targetTable };
    }
  }

  // 2. Check saved templates by signature
  const signature = getHeaderSignature(headers);
  const matchedTemplate = (savedTemplates || []).find(t => (t.id === signature || t.headerKey === signature));
  if (matchedTemplate) {
    return {
      type: matchedTemplate.targetTable || 'custom',
      confidence: 0.95,
      isTemplate: true,
      template: matchedTemplate,
      targetTable: matchedTemplate.targetTable || 'custom'
    };
  }

  return { type: 'unknown', confidence: 0, targetTable: 'products' };
}

/**
 * Parse standard CSV with RFC 4180 quotes, commas, multiline support, and BOM handling.
 */
export function parseCSV(text) {
  // Strip UTF-8 BOM if present
  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }

  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // handle CRLF
      }
      currentRow.push(currentVal);
      currentVal = '';
      if (currentRow.some(c => c.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal);
    if (currentRow.some(c => c.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map(h => h.trim());
  const dataRows = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] !== undefined ? row[j].trim() : '';
    }
    dataRows.push(obj);
  }

  return { headers, rows: dataRows };
}

/**
 * Read and parse any file (CSV, XLSX, JSON) into one or more named datasets.
 * For XLSX, every sheet is extracted as its own dataset.
 * @param {File} file 
 * @returns {Promise<Array<{ name: string, filename: string, headers: Array<string>, rows: Array<Object>, size: number }>>}
 */
export async function parseFileToDatasets(file) {
  const extension = (file.name.split('.').pop() || '').toLowerCase();
  const filename = file.name;
  const size = file.size;

  if (extension === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : (parsed.items || parsed.data || [parsed]);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return [{ name: filename, filename, headers, rows, size }];
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const datasets = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
      if (jsonRows.length > 0) {
        const headers = Object.keys(jsonRows[0]);
        datasets.push({
          name: workbook.SheetNames.length > 1 ? `${filename} (${sheetName})` : filename,
          filename,
          sheetName,
          headers,
          rows: jsonRows,
          size
        });
      }
    }
    return datasets;
  }

  // Default to CSV / text
  const text = await file.text();
  const { headers, rows } = parseCSV(text);
  return [{ name: filename, filename, headers, rows, size }];
}

// ========================================================
// DATA CLEANING PRIMITIVES
// ========================================================

/**
 * Trim text and turn empty strings into null.
 */
export function cleanText(val) {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  return str.length === 0 ? null : str;
}

/**
 * Strip currency symbols, commas, spaces from numbers.
 * Never turns missing numbers into 0. Returns null if missing.
 */
export function cleanNumber(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).replace(/[₹$€£,\s]/g, '').trim();
  if (str === '') return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Parse any date string into ISO YYYY-MM-DD.
 */
export function cleanDate(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val)) {
    return val.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (!str) return null;

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return str;
}

/**
 * Convert Yes/No/True/False/1/0 to real booleans.
 */
export function cleanBoolean(val) {
  if (typeof val === 'boolean') return val;
  if (val === null || val === undefined) return null;
  const str = String(val).trim().toLowerCase();
  if (str === 'true' || str === 'yes' || str === '1') return true;
  if (str === 'false' || str === 'no' || str === '0') return false;
  return null;
}

/**
 * Clean and uppercase an identifier.
 */
export function cleanId(val) {
  const str = cleanText(val);
  return str ? str.toUpperCase() : null;
}

/**
 * Check if a row is completely empty across all columns.
 */
export function isRowCompletelyEmpty(row) {
  if (!row || typeof row !== 'object') return true;
  return Object.values(row).every(v => v === null || v === undefined || String(v).trim() === '');
}

/**
 * Helper to log an issue into the issues tracker.
 */
export function logIssue(issues, { file, rowNumber, recordId, field, problem, actionTaken, oldValue, newValue }) {
  issues.push({
    file: file || 'Dataset',
    rowNumber: rowNumber || 0,
    recordId: recordId || '—',
    field: field || '—',
    problem: problem || '',
    actionTaken: actionTaken || '',
    oldValue: oldValue !== undefined && oldValue !== null ? String(oldValue) : '',
    newValue: newValue !== undefined && newValue !== null ? String(newValue) : ''
  });
}

// ========================================================
// DOMAIN PROCESSORS FOR KNOWN DATA TYPES
// ========================================================

/**
 * Process Tenants CSV -> stores (all 12 malls: MALL-001 to MALL-012)
 */
export function processTenantsData(rows, filename, issues = []) {
  issues = issues || [];
  const stores = [];
  const seenIds = new Set();
  const BASE_DATE = new Date('2026-11-20');

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    if (isRowCompletelyEmpty(row)) return;

    const storeId = cleanId(row.store_id);
    if (!storeId) {
      logIssue(issues, {
        file: filename,
        rowNumber: rowNum,
        recordId: '—',
        field: 'store_id',
        problem: 'Missing store ID in tenants row',
        actionTaken: 'Skipped row',
        oldValue: '',
        newValue: ''
      });
      return;
    }

    if (seenIds.has(storeId)) {
      logIssue(issues, {
        file: filename,
        rowNumber: rowNum,
        recordId: storeId,
        field: 'store_id',
        problem: 'Duplicate tenant store_id',
        actionTaken: 'Dropped duplicate record',
        oldValue: storeId,
        newValue: '—'
      });
      return;
    }
    seenIds.add(storeId);

    // Name normalization: when store_name is "VACANT UNIT", use "Vacant - " + unit_number
    let storeName = cleanText(row.store_name) || 'Store';
    const unitNumber = cleanText(row.unit_number) || '—';
    if (storeName.toUpperCase() === 'VACANT UNIT') {
      storeName = `Vacant - ${unitNumber}`;
    }

    // Unit formatting: "#" + unit_number + ", " + floor + " (" + zone + ")"
    const floor = cleanText(row.floor) || 'Ground Floor';
    const zone = cleanText(row.zone) || 'Main';
    const unitDisplay = `#${unitNumber}, ${floor} (${zone})`;

    // Status mapping
    const rawStatus = cleanText(row.unit_status) || '';
    let status = 'Active';
    const leaseEndDateStr = cleanDate(row.lease_end_date);

    if (rawStatus.startsWith('Vacant')) {
      status = 'Vacant';
    } else if (rawStatus === 'Under Fit-Out') {
      status = 'Fit-out';
    } else if (rawStatus === 'Occupied - Notice Served' || rawStatus === 'Legal Notice') {
      status = 'Notice served';
    } else if (rawStatus === 'Occupied - Active') {
      if (leaseEndDateStr) {
        const leaseEnd = new Date(leaseEndDateStr);
        const diffDays = Math.round((leaseEnd - BASE_DATE) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 180) {
          status = 'Lease expiring';
        } else {
          status = 'Active';
        }
      } else {
        status = 'Active';
      }
    } else {
      status = rawStatus || 'Active';
    }

    // Rent status mapping
    const rawRentStatus = cleanText(row.rent_payment_status) || 'Paid';
    let rentStatus = 'Paid';
    if (rawRentStatus === 'Paid') rentStatus = 'Paid';
    else if (rawRentStatus.startsWith('Overdue')) rentStatus = 'Overdue';
    else if (rawRentStatus === 'Disputed') rentStatus = 'Disputed';
    else if (rawRentStatus === 'Rent-Free Period') rentStatus = 'Rent-free';
    else if (rawRentStatus === 'Partially Paid') rentStatus = 'Partial';
    else if (rawRentStatus === 'Vacant') rentStatus = 'Vacant';
    else rentStatus = rawRentStatus;

    // Preserve all other properties inside extra
    const extra = {};
    for (const [k, v] of Object.entries(row)) {
      if (![
        'store_id', 'mall_id', 'mall_name', 'city', 'store_name', 'unit_number',
        'floor', 'zone', 'brand_category', 'store_type', 'unit_status',
        'primary_contact_name', 'primary_phone', 'primary_email',
        'lease_start_date', 'lease_end_date', 'monthly_mg_rent_inr',
        'rent_payment_status', 'current_ar_overdue_inr'
      ].includes(k)) {
        extra[k] = cleanText(v);
      }
    }

    const storeObj = {
      id: storeId,
      mallId: cleanId(row.mall_id) || 'MALL-001',
      mallName: cleanText(row.mall_name) || 'Mall',
      city: cleanText(row.city) || '',
      name: storeName,
      unit: unitDisplay,
      unitNumber,
      floor,
      category: cleanText(row.brand_category) || 'General',
      department: cleanText(row.store_type) || 'Retail',
      status,
      manager: cleanText(row.primary_contact_name) || 'Store Manager',
      phone: cleanText(row.primary_phone) || '',
      email: cleanText(row.primary_email) || '',
      leaseStart: cleanDate(row.lease_start_date) || '',
      leaseEnd: leaseEndDateStr || '',
      monthlyRent: cleanNumber(row.monthly_mg_rent_inr) || 0,
      rentStatus,
      overdueAmount: cleanNumber(row.current_ar_overdue_inr) || 0,
      salesAmount: 0,
      salesToday: 0,
      unitsSold: 0,
      sparkline: [],
      changePct: 0,
      extra
    };

    stores.push(storeObj);
  });

  return {
    stores,
    readCount: rows.length,
    cleanedCount: stores.length,
    flaggedCount: issues.length,
    duplicateCount: rows.length - stores.length,
    issues,
    previewRows: stores.slice(0, 10)
  };
}

/**
 * Process Inventory CSV -> products (key = store_id + sku_id)
 * Handles negative stock, missing price fallback, duplicate batch merging, and placeholder stores.
 */
export function processInventoryData(rows, filename, issuesOrStores = [], maybeStores = []) {
  let issues = [];
  let existingStores = [];
  if (Array.isArray(issuesOrStores)) {
    if (issuesOrStores.length > 0 && (issuesOrStores[0].id || issuesOrStores[0].name)) {
      existingStores = issuesOrStores;
      issues = Array.isArray(maybeStores) ? maybeStores : [];
    } else {
      issues = issuesOrStores;
      existingStores = Array.isArray(maybeStores) ? maybeStores : [];
    }
  }
  let duplicateCount = 0;
  const productsMap = new Map();
  const knownStoreIds = new Set(existingStores.map(s => s.id));
  const placeholderStoresMap = new Map();

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    if (isRowCompletelyEmpty(row)) return;

    const skuId = cleanId(row.sku_id);
    const storeId = cleanId(row.store_id);

    if (!skuId || !storeId) {
      logIssue(issues, {
        file: filename,
        rowNumber: rowNum,
        recordId: skuId || storeId || '—',
        field: 'sku_id/store_id',
        problem: 'Missing sku_id or store_id',
        actionTaken: 'Skipped row',
        oldValue: '',
        newValue: ''
      });
      return;
    }

    // Check placeholder store: if store_id not in Tenants
    if (!knownStoreIds.has(storeId) && !placeholderStoresMap.has(storeId)) {
      const placeholder = {
        id: storeId,
        mallId: cleanId(row.mall_id) || 'MALL-001',
        mallName: cleanText(row.mall_name) || 'City Centre Mall',
        city: 'Kolkata',
        name: cleanText(row.store_name) || `Store ${storeId}`,
        unit: '#Unlisted, Floor 1',
        unitNumber: 'Unlisted',
        floor: 'Floor 1',
        category: cleanText(row.category) || 'General',
        department: 'Retail',
        status: 'Unlisted',
        needsReview: true,
        manager: 'Unassigned',
        phone: '',
        email: '',
        leaseStart: '2026-01-01',
        leaseEnd: '2027-01-01',
        monthlyRent: 0,
        rentStatus: 'Paid',
        overdueAmount: 0,
        salesAmount: 0,
        salesToday: 0,
        unitsSold: 0,
        sparkline: [],
        changePct: 0,
        extra: { note: 'Auto-created placeholder from Inventory file' }
      };
      placeholderStoresMap.set(storeId, placeholder);
      knownStoreIds.add(storeId);

      logIssue(issues, {
        file: filename,
        rowNumber: rowNum,
        recordId: storeId,
        field: 'store_id',
        problem: `Store ID ${storeId} not found in Tenants directory`,
        actionTaken: 'Created placeholder store with status Unlisted (needsReview: true)',
        oldValue: storeId,
        newValue: 'Unlisted Placeholder'
      });
    }

    // Stock cleaning: qty_available (never negative)
    let stock = cleanNumber(row.qty_available);
    if (stock === null) stock = 0;
    if (stock < 0) {
      logIssue(issues, {
        file: filename,
        rowNumber: rowNum,
        recordId: `${storeId}_${skuId}`,
        field: 'qty_available',
        problem: `Negative stock count (${stock})`,
        actionTaken: 'Fixed negative stock to 0',
        oldValue: stock,
        newValue: 0
      });
      stock = 0;
    }

    // Min buffer
    const minBuffer = cleanNumber(row.reorder_point) || cleanNumber(row.safety_stock) || 10;

    // Price cleaning: selling_price_inr; if 0 or missing, fallback to mrp_inr and log
    let price = cleanNumber(row.selling_price_inr);
    const mrp = cleanNumber(row.mrp_inr);
    if (!price || price <= 0) {
      const fallbackPrice = mrp || 100;
      logIssue(issues, {
        file: filename,
        rowNumber: rowNum,
        recordId: `${storeId}_${skuId}`,
        field: 'selling_price_inr',
        problem: `Selling price missing or zero (${price})`,
        actionTaken: `Fell back to MRP (${fallbackPrice})`,
        oldValue: price,
        newValue: fallbackPrice
      });
      price = fallbackPrice;
    }

    // Extra attributes preserved
    const extra = {
      barcode: cleanText(row.barcode_ean),
      brand: cleanText(row.brand),
      sub_category: cleanText(row.sub_category),
      supplier_id: cleanText(row.supplier_id),
      unit_cost_inr: cleanNumber(row.unit_cost_inr),
      mrp_inr: mrp,
      qty_reserved: cleanNumber(row.qty_reserved) || 0,
      qty_in_transit: cleanNumber(row.qty_in_transit) || 0,
      qty_damaged: cleanNumber(row.qty_damaged) || 0,
      expiry_date: cleanDate(row.expiry_date),
      avg_daily_sales_units: cleanNumber(row.avg_daily_sales_units) || 0,
      days_of_supply: cleanNumber(row.days_of_supply) || 0,
      stock_status: cleanText(row.stock_status),
      batch: cleanText(row.batch_lot_number)
    };

    const compositeKey = `${storeId}_${skuId}`;

    if (productsMap.has(compositeKey)) {
      // DUPLICATE BATCH MERGE: sum stock, highest reorder_point, price of highest-stock batch
      const existing = productsMap.get(compositeKey);
      const combinedStock = existing.stock + stock;
      const highestBuffer = Math.max(existing.minBuffer, minBuffer);
      const chosenPrice = (stock > (existing._highestBatchStock || existing.stock)) ? price : existing.price;
      const batchesCount = (existing.batches || 1) + 1;

      existing.stock = combinedStock;
      existing.minBuffer = highestBuffer;
      existing.price = chosenPrice;
      existing.batches = batchesCount;
      existing._highestBatchStock = Math.max(existing._highestBatchStock || 0, stock);

      logIssue(issues, {
        file: filename,
        rowNumber: rowNum,
        recordId: compositeKey,
        field: 'sku_id/batch_lot_number',
        problem: `Multiple batches found for SKU ${skuId} at store ${storeId}`,
        actionTaken: `Merged into single product (summed stock: ${combinedStock}, batches: ${batchesCount})`,
        oldValue: `Stock: ${stock}`,
        newValue: `Total Stock: ${combinedStock}`
      });
    } else {
      productsMap.set(compositeKey, {
        id: compositeKey,
        sku: skuId,
        name: cleanText(row.product_name) || `Product ${skuId}`,
        storeId,
        tenant: cleanText(row.store_name) || storeId,
        category: cleanText(row.category) || 'General',
        stock,
        minBuffer,
        price,
        batches: 1,
        _highestBatchStock: stock,
        mallId: cleanId(row.mall_id) || 'MALL-001',
        extra
      });
    }
  });

  const prods = Array.from(productsMap.values());
  const placeholders = Array.from(placeholderStoresMap.values());
  const computedDuplicates = rows.length - prods.length;
  return {
    products: prods,
    placeholderStores: placeholders,
    readCount: rows.length,
    cleanedCount: prods.length,
    duplicateCount: computedDuplicates > 0 ? computedDuplicates : duplicateCount,
    flaggedCount: issues.length,
    issues,
    previewRows: prods.slice(0, 10)
  };
}

/**
 * Process Reordering CSV -> purchaseOrders
 */
export function processReorderingData(rows, filename, issues = []) {
  issues = issues || [];
  const purchaseOrders = [];
  const seenIds = new Set();
  let duplicateCount = 0;

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    if (isRowCompletelyEmpty(row)) return;

    const poNumber = cleanId(row.po_number);
    if (!poNumber) return;

    if (seenIds.has(poNumber)) {
      duplicateCount++;
      logIssue(issues, {
        file: filename,
        rowNumber: rowNum,
        recordId: poNumber,
        field: 'po_number',
        problem: 'Duplicate PO number',
        actionTaken: 'Dropped duplicate PO',
        oldValue: poNumber,
        newValue: '—'
      });
      return;
    }
    seenIds.add(poNumber);

    // Status mapping
    const rawStatus = cleanText(row.po_status) || 'Pending';
    let status = 'Pending';
    let rejectionReason = null;

    if (rawStatus === 'Fulfilled - Closed' || rawStatus === 'Partially Received (GRN Shortage)') {
      status = 'Delivered';
    } else if (rawStatus === 'In Transit') {
      status = 'Shipped';
    } else if (rawStatus === 'Approved - Sent to Supplier' || rawStatus === 'Delayed - Supplier Hold') {
      status = 'Approved';
    } else if (rawStatus === 'Pending Finance Approval' || rawStatus === 'Blocked - Inventory Audit Required') {
      status = 'Pending';
    } else if (rawStatus === 'Cancelled - Store Exit Freeze') {
      status = 'Rejected';
      rejectionReason = cleanText(row.notes) || 'Cancelled - Store Exit Freeze';
    } else {
      status = rawStatus;
    }

    // Ordered Qty checking
    const orderedQty = cleanNumber(row.ordered_qty);
    const isZeroQty = orderedQty === 0;
    if (isZeroQty) {
      logIssue(issues, {
        file: filename,
        rowNumber: rowNum,
        recordId: poNumber,
        field: 'ordered_qty',
        problem: 'PO ordered quantity is 0',
        actionTaken: 'Preserved in records, marked needsReview = true',
        oldValue: 0,
        newValue: 0
      });
    }

    const unitCost = cleanNumber(row.po_unit_cost_inr) || 0;
    const subtotal = cleanNumber(row.subtotal_inr) || (orderedQty * unitCost);
    const totalValue = cleanNumber(row.total_po_value_inr) || subtotal;

    // Line items
    const lineItems = [
      {
        sku: cleanId(row.sku_id) || 'SKU-GEN',
        name: cleanText(row.product_name) || 'Product Item',
        qty: orderedQty !== null ? orderedQty : 1,
        price: unitCost,
        subtotal
      }
    ];

    const leadTimeDays = cleanText(row.supplier_lead_time_days) || '3';
    const storeName = cleanText(row.store_name) || '';
    const unit = cleanText(row.unit) || '';
    const tenantDisplay = storeName + (unit ? ` (${unit})` : '');

    const extra = {
      urgency_level: cleanText(row.urgency_level),
      auto_approved: cleanBoolean(row.auto_approved),
      ai_confidence_score: cleanNumber(row.ai_confidence_score),
      received_qty: cleanNumber(row.received_qty) || 0,
      trigger_source: cleanText(row.trigger_source)
    };

    const poObj = {
      id: poNumber,
      reorderId: cleanId(row.reorder_id),
      mallId: cleanId(row.mall_id) || 'MALL-001',
      storeId: cleanId(row.store_id),
      supplier: cleanText(row.supplier_name) || 'Supplier',
      leadTime: `${leadTimeDays} business days`,
      value: totalValue,
      tenant: tenantDisplay,
      status,
      statusDetail: rawStatus,
      rejectionReason,
      needsReview: isZeroQty,
      items: lineItems[0].name,
      lineItems,
      reason: `${cleanText(row.trigger_source) || 'Safety stock trigger'}${row.notes ? ' - ' + cleanText(row.notes) : ''}`,
      createdDate: cleanDate(row.created_date) || '2026-11-20',
      expectedDelivery: cleanDate(row.expected_delivery_date) || '',
      delivered: cleanDate(row.actual_delivery_date) || null,
      timeline: {
        created: cleanDate(row.created_date),
        approved: (status === 'Approved' || status === 'Shipped' || status === 'Delivered') ? cleanDate(row.created_date) : null,
        shipped: (status === 'Shipped' || status === 'Delivered') ? cleanDate(row.expected_delivery_date) : null,
        delivered: status === 'Delivered' ? (cleanDate(row.actual_delivery_date) || cleanDate(row.expected_delivery_date)) : null,
        rejected: status === 'Rejected' ? cleanDate(row.created_date) : null
      },
      extra
    };

    purchaseOrders.push(poObj);
  });

  return {
    purchaseOrders,
    readCount: rows.length,
    cleanedCount: purchaseOrders.length,
    duplicateCount,
    flaggedCount: issues.length,
    issues,
    previewRows: purchaseOrders.slice(0, 10)
  };
}

/**
 * Process Sales CSV -> salesHistory and update store performance metrics
 */
export function processSalesData(rows, filename, issuesOrStores = [], maybeStores = []) {
  let issues = [];
  let stores = [];
  if (Array.isArray(issuesOrStores)) {
    if (issuesOrStores.length > 0 && (issuesOrStores[0].id || issuesOrStores[0].name)) {
      stores = issuesOrStores;
      issues = Array.isArray(maybeStores) ? maybeStores : [];
    } else {
      issues = issuesOrStores;
      stores = Array.isArray(maybeStores) ? maybeStores : [];
    }
  }
  const salesHistory = [];
  const storeSalesMap = new Map(); // storeId -> Array of valid rows

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    if (isRowCompletelyEmpty(row)) return;

    const recordId = cleanId(row.sales_record_id);
    const storeId = cleanId(row.store_id);
    const date = cleanDate(row.report_date);
    const status = cleanText(row.submission_status) || 'Submitted';
    const isMissing = status.toLowerCase() === 'missing';

    if (isMissing) {
      logIssue(issues, {
        file: filename,
        rowNumber: rowNum,
        recordId: recordId || `${storeId}_${date}`,
        field: 'submission_status',
        problem: 'Submission status is Missing',
        actionTaken: 'Flagged missing sales date, preserved numbers as null (excluded from averages)',
        oldValue: 'Missing',
        newValue: 'null'
      });
    }

    const salesRecord = {
      id: recordId || `${storeId}_${date}`,
      storeId,
      mallId: cleanId(row.mall_id) || 'MALL-001',
      date,
      status,
      isMissing,
      gross: isMissing ? null : cleanNumber(row.gross_sales_inr),
      discounts: isMissing ? null : cleanNumber(row.discounts_inr),
      returns: isMissing ? null : cleanNumber(row.returns_refunds_inr),
      netSales: isMissing ? null : cleanNumber(row.taxable_net_sales_inr),
      collected: isMissing ? null : cleanNumber(row.total_net_collected_inr),
      transactions: isMissing ? null : cleanNumber(row.total_transactions),
      units: isMissing ? null : cleanNumber(row.units_sold),
      footfall: isMissing ? null : cleanNumber(row.footfall_count),
      conversion: isMissing ? null : cleanNumber(row.conversion_rate_pct),
      staffOnDuty: isMissing ? null : cleanNumber(row.staff_on_duty)
    };

    salesHistory.push(salesRecord);

    if (!isMissing && salesRecord.gross !== null && storeId) {
      if (!storeSalesMap.has(storeId)) {
        storeSalesMap.set(storeId, []);
      }
      storeSalesMap.get(storeId).push(salesRecord);
    }
  });

  // Update stores with latest sales, sparkline, and changePct
  const storeMap = new Map(stores.map(s => [s.id, s]));

  for (const [storeId, records] of storeSalesMap.entries()) {
    const store = storeMap.get(storeId);
    if (!store) continue;

    // Sort ascending by date
    records.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Latest valid record
    const latest = records[records.length - 1];
    store.salesAmount = latest.gross || 0;
    store.salesToday = latest.gross || 0;
    store.unitsSold = latest.units || 0;

    // Last 7 days sparkline
    const last7 = records.slice(-7);
    store.sparkline = last7.map(r => r.gross || 0);

    // changePct: last 7 days avg vs previous 7 days avg
    if (records.length >= 14) {
      const prev7 = records.slice(-14, -7);
      const avgLast7 = last7.reduce((s, r) => s + (r.gross || 0), 0) / 7;
      const avgPrev7 = prev7.reduce((s, r) => s + (r.gross || 0), 0) / 7;
      if (avgPrev7 > 0) {
        store.changePct = parseFloat((((avgLast7 - avgPrev7) / avgPrev7) * 100).toFixed(1));
      }
    } else if (records.length > 7) {
      const prevRecords = records.slice(0, records.length - 7);
      const avgLast7 = last7.reduce((s, r) => s + (r.gross || 0), 0) / last7.length;
      const avgPrev = prevRecords.reduce((s, r) => s + (r.gross || 0), 0) / prevRecords.length;
      if (avgPrev > 0) {
        store.changePct = parseFloat((((avgLast7 - avgPrev) / avgPrev) * 100).toFixed(1));
      }
    }
  }

  const updatedStoresList = Array.from(storeSalesMap.keys()).map(id => stores.find(s => s.id === id)).filter(Boolean);

  return {
    records: salesHistory,
    updatedStores: updatedStoresList,
    readCount: rows.length,
    cleanedCount: salesHistory.length,
    duplicateCount: 0,
    flaggedCount: issues.length,
    issues,
    previewRows: salesHistory.slice(0, 10)
  };
}

/**
 * Process KPI Snapshots CSV -> kpiSnapshots (key = snapshot_date + period_type + store_id)
 */
export function processKpisData(rows, filename, issues = []) {
  issues = issues || [];
  const snapshots = [];
  const seenKeys = new Set();
  let duplicateCount = 0;

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    if (isRowCompletelyEmpty(row)) return;

    const snapDate = cleanDate(row.snapshot_date);
    const period = cleanText(row.period_type);
    const storeId = cleanId(row.store_id);
    const mallId = cleanId(row.mall_id) || 'MALL-001';

    if (!snapDate || !period || !storeId) return;

    const compositeKey = `${mallId}_${snapDate}_${period}_${storeId}`;
    if (seenKeys.has(compositeKey)) {
      duplicateCount++;
      logIssue(issues, {
        file: filename,
        rowNumber: rowNum,
        recordId: compositeKey,
        field: 'composite_key',
        problem: 'Exact duplicate KPI snapshot',
        actionTaken: 'Dropped duplicate snapshot',
        oldValue: compositeKey,
        newValue: '—'
      });
      return;
    }
    seenKeys.add(compositeKey);

    const snapshot = {
      id: compositeKey,
      snapshot_date: snapDate,
      period_type: period,
      store_id: storeId,
      mall_id: cleanId(row.mall_id) || 'MALL-001',
      mall_name: cleanText(row.mall_name),
      floor: cleanText(row.floor),
      store_name: cleanText(row.store_name),
      brand_category: cleanText(row.brand_category),
      unit_status: cleanText(row.unit_status),
      leasable_area_sqft: cleanNumber(row.leasable_area_sqft),
      mtd_net_sales_inr: cleanNumber(row.mtd_net_sales_inr),
      sales_per_sqft_inr: cleanNumber(row.sales_per_sqft_inr),
      wow_sales_change_pct: cleanNumber(row.wow_sales_change_pct),
      yoy_sales_change_pct: cleanNumber(row.yoy_sales_change_pct),
      mtd_footfall: cleanNumber(row.mtd_footfall),
      conversion_rate_pct: cleanNumber(row.conversion_rate_pct),
      monthly_mg_rent_inr: cleanNumber(row.monthly_mg_rent_inr),
      calculated_rev_share_inr: cleanNumber(row.calculated_rev_share_inr),
      total_billed_rent_cam_inr: cleanNumber(row.total_billed_rent_cam_inr),
      ar_overdue_inr: cleanNumber(row.ar_overdue_inr),
      compliance_status: cleanText(row.compliance_status),
      inventory_health_score: cleanNumber(row.inventory_health_score),
      stockout_risk_skus: cleanNumber(row.stockout_risk_skus),
      ai_risk_level: cleanText(row.ai_risk_level),
      ai_alert_summary: cleanText(row.ai_alert_summary)
    };

    snapshots.push(snapshot);
  });

  return {
    snapshots,
    readCount: rows.length,
    cleanedCount: snapshots.length,
    duplicateCount,
    flaggedCount: issues.length,
    issues,
    previewRows: snapshots.slice(0, 10)
  };
}

/**
 * Process Legacy 7-column Products CSV
 */
export function processLegacyProductsData(rows, filename, issuesOrStores = [], maybeStores = []) {
  let issues = [];
  let stores = [];
  if (Array.isArray(issuesOrStores)) {
    if (issuesOrStores.length > 0 && (issuesOrStores[0].id || issuesOrStores[0].name)) {
      stores = issuesOrStores;
      issues = Array.isArray(maybeStores) ? maybeStores : [];
    } else {
      issues = issuesOrStores;
      stores = Array.isArray(maybeStores) ? maybeStores : [];
    }
  }
  const products = [];
  const storeMap = new Map(stores.map(s => [s.name.toLowerCase(), s]));

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    if (isRowCompletelyEmpty(row)) return;

    const sku = cleanId(row.sku || row.sku_id);
    const name = cleanText(row.name || row.product_name);
    const tenant = cleanText(row.tenant || row.store_name || row.store);

    if (!sku || !name) return;

    let stock = cleanNumber(row.stock || row.quantity || row.qty);
    if (stock === null) stock = 0;
    if (stock < 0) {
      logIssue(issues, {
        file: filename,
        rowNumber: rowNum,
        recordId: sku,
        field: 'stock',
        problem: `Negative stock (${stock}) in legacy product format`,
        actionTaken: 'Clamped negative stock to 0',
        oldValue: stock,
        newValue: 0
      });
      stock = 0;
    }

    const minBuffer = cleanNumber(row.minBuffer || row.min_buffer || row.buffer) || 10;
    const price = cleanNumber(row.price || row.rate || row.unit_price) || 100;

    let storeId = 'STR-101';
    if (tenant && storeMap.has(tenant.toLowerCase())) {
      storeId = storeMap.get(tenant.toLowerCase()).id;
    }

    products.push({
      id: `${storeId}_${sku}`,
      sku,
      name,
      tenant: tenant || 'Zara',
      storeId,
      category: cleanText(row.category) || 'General',
      stock,
      minBuffer,
      price,
      batches: 1,
      mallId: 'MALL-001',
      extra: {}
    });
  });

  return {
    products,
    readCount: rows.length,
    cleanedCount: products.length,
    duplicateCount: 0,
    flaggedCount: issues.length,
    issues,
    previewRows: products.slice(0, 10)
  };
}

/**
 * Process Custom Dataset (infers types: text, number, date, boolean)
 */
export function processCustomDataset(datasetName, filename, headers, rows) {
  const columnTypes = {};

  for (const col of headers) {
    let hasValues = false;
    let isNum = true;
    let isDate = true;
    let isBool = true;

    for (const row of rows.slice(0, 100)) {
      const v = row[col];
      if (v !== null && v !== undefined && String(v).trim() !== '') {
        hasValues = true;
        const str = String(v).trim();

        if (isNaN(Number(str.replace(/[₹$€£,]/g, '')))) isNum = false;
        if (!/^\d{4}-\d{2}-\d{2}/.test(str) && isNaN(Date.parse(str))) isDate = false;
        if (!['true', 'false', 'yes', 'no', '1', '0'].includes(str.toLowerCase())) isBool = false;
      }
    }

    if (!hasValues) {
      columnTypes[col] = 'text';
    } else if (isBool) {
      columnTypes[col] = 'boolean';
    } else if (isNum) {
      columnTypes[col] = 'number';
    } else if (isDate) {
      columnTypes[col] = 'date';
    } else {
      columnTypes[col] = 'text';
    }
  }

  const cleanedRows = rows.map((r, i) => {
    const cleaned = { _rowId: i + 1 };
    for (const col of headers) {
      const type = columnTypes[col];
      const raw = r[col];
      if (type === 'number') cleaned[col] = cleanNumber(raw);
      else if (type === 'date') cleaned[col] = cleanDate(raw);
      else if (type === 'boolean') cleaned[col] = cleanBoolean(raw);
      else cleaned[col] = cleanText(raw);
    }
    return cleaned;
  });

  const datasetId = 'DS_' + normalizeHeader(datasetName) + '_' + Date.now();

  return {
    id: datasetId,
    name: datasetName,
    filename,
    rowCount: cleanedRows.length,
    columns: headers,
    columnTypes,
    rows: cleanedRows,
    createdAt: new Date().toISOString()
  };
}

/**
 * Generate CSV text for issues log export.
 */
export function generateIssuesCSV(issues = []) {
  const headers = ['File', 'Row Number', 'Record ID', 'Field', 'Problem', 'Action Taken', 'Old Value', 'New Value'];
  const lines = [headers.join(',')];

  issues.forEach(iss => {
    const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
    lines.push([
      escape(iss.file),
      iss.rowNumber,
      escape(iss.recordId),
      escape(iss.field),
      escape(iss.problem),
      escape(iss.actionTaken),
      escape(iss.oldValue),
      escape(iss.newValue)
    ].join(','));
  });

  return lines.join('\r\n');
}
