/**
 * MALLMATRIX — Product Import Utility
 * Pure JavaScript utility for importing products from CSV or Excel (.xlsx) files.
 * Provides file parsing (SheetJS), column normalization, row validation,
 * duplicate handling, preview statistics, error reporting, and safe storage execution.
 * 
 * Keep separate from UI code so that local storage can later be swapped with Supabase.
 */

import * as XLSX from 'xlsx';

// Maximum limits
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ROW_LIMIT = 5000;

// Canonical header aliases
const HEADER_ALIASES = {
  name: ['name', 'product name', 'product', 'item name', 'item', 'title', 'product title'],
  sku: ['sku', 'sku code', 'product sku', 'item sku', 'code', 'sku identifier'],
  tenant: ['tenant', 'store', 'tenant store', 'store name', 'retailer', 'target tenant store', 'target tenant'],
  category: ['category', 'cat'],
  department: ['department', 'dept'],
  stock: ['stock', 'quantity', 'qty', 'stock qty', 'current stock', 'units', 'stock quantity', 'inventory'],
  minBuffer: ['minbuffer', 'min buffer', 'safety stock', 'min stock', 'buffer', 'threshold', 'minimum buffer', 'safety buffer', 'min buffer units'],
  price: ['price', 'unit price', 'rate', 'cost'],
  unit: ['unit', 'unit number', 'store unit', 'location'],
  id: ['id', 'product id', 'prod id']
};

/**
 * Normalize arbitrary header string to lowercase letters, numbers and single spaces.
 */
function cleanHeaderString(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match raw header to canonical field name.
 */
function mapHeaderToField(rawHeader) {
  const cleaned = cleanHeaderString(rawHeader);
  if (!cleaned) return null;

  for (const [canonicalField, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(cleaned)) {
      return canonicalField;
    }
  }

  // Fallback prefix / containment match for compound headers like "min buffer (units)"
  for (const [canonicalField, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      if (cleaned.startsWith(alias) || cleaned.endsWith(alias)) {
        return canonicalField;
      }
    }
  }

  return null;
}

/**
 * Normalize any text for matching (case-insensitive, collapsed spaces).
 */
export function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Match tenant name against existing stores list.
 * Returns the matched store object or null.
 */
export function matchStoreByName(tenantName, stores = []) {
  const target = normalizeText(tenantName);
  if (!target) return null;
  return stores.find(s => normalizeText(s.name) === target) || null;
}

/**
 * Extract clean short unit from store's unit string.
 * Example: "#204, Floor 2 (North Wing)" -> "#204"
 */
export function extractStoreUnit(store) {
  if (!store || !store.unit) return '#Store';
  const parts = String(store.unit).split(',');
  return parts[0].trim() || '#Store';
}

/**
 * Strip currency symbols, commas, and whitespace from price strings.
 * Example: "$1,299.00" -> "1299.00"
 */
export function cleanPriceString(rawVal) {
  if (typeof rawVal === 'number') return rawVal;
  if (!rawVal) return '';
  return String(rawVal).replace(/[$€£₹¥,\s]/g, '').trim();
}

/**
 * Parse an uploaded CSV or XLSX File object into raw 2D row arrays.
 * Enforces file size and row count limits.
 */
export async function parseImportFile(file) {
  if (!file) {
    throw new Error('No file selected.');
  }

  // 1. File size check (Max 5 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 5 MB limit. Please upload a smaller file.`);
  }

  // 2. Read array buffer
  const arrayBuffer = await file.arrayBuffer();

  // 3. Parse with SheetJS
  let workbook;
  try {
    workbook = XLSX.read(arrayBuffer, { type: 'array' });
  } catch (err) {
    throw new Error('Unable to parse file. Please ensure it is a valid CSV or Excel (.xlsx) file.');
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded file does not contain any sheets.');
  }

  // Read only the first sheet
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The uploaded file is empty.');
  }

  // Find the header row (first non-empty row)
  let headerRowIndex = -1;
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (row && row.some(cell => String(cell).trim().length > 0)) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('The uploaded file contains no data rows.');
  }

  const rawHeaderRow = rawRows[headerRowIndex];
  const dataRows = rawRows.slice(headerRowIndex + 1).filter(r => r && r.some(c => String(c).trim().length > 0));

  // Check 5,000 row limit
  if (dataRows.length > MAX_ROW_LIMIT) {
    throw new Error(`File contains ${dataRows.length.toLocaleString()} rows, exceeding the limit of ${MAX_ROW_LIMIT.toLocaleString()} rows.`);
  }

  // Map columns
  const columnMap = {};
  rawHeaderRow.forEach((cell, colIdx) => {
    const field = mapHeaderToField(cell);
    if (field && columnMap[field] === undefined) {
      columnMap[field] = colIdx;
    }
  });

  // Verify required columns exist in headers
  const requiredFields = ['name', 'sku', 'tenant', 'stock', 'minBuffer', 'price'];
  const missingHeaders = requiredFields.filter(f => columnMap[f] === undefined);

  if (missingHeaders.length > 0) {
    throw new Error(`File is missing required column(s): ${missingHeaders.join(', ')}. Expected columns: name, sku, tenant, category, stock, minBuffer, price.`);
  }

  // Convert data rows into standardized objects
  const parsedRows = dataRows.map((row, index) => {
    const getVal = (field) => {
      const idx = columnMap[field];
      return (idx !== undefined && row[idx] !== undefined) ? String(row[idx]).trim() : '';
    };

    return {
      rowNumber: index + 2, // 1-based indexing considering header row at 1
      name: getVal('name'),
      sku: getVal('sku'),
      tenant: getVal('tenant'),
      category: getVal('category') || getVal('department'),
      stock: getVal('stock'),
      minBuffer: getVal('minBuffer'),
      price: getVal('price'),
      unit: getVal('unit'),
      id: getVal('id')
    };
  });

  return parsedRows;
}

/**
 * Validate each parsed row against business rules, detect duplicates, and classify status.
 * Returns evaluated rows and summary counters.
 */
export function validateAndPreviewRows(parsedRows, stores = [], existingProducts = [], duplicateMode = 'update') {
  const seenSkusInFile = new Map(); // normalized SKU -> first row number seen
  const evaluatedRows = [];

  let newCount = 0;
  let updateCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < parsedRows.length; i++) {
    const raw = parsedRows[i];
    const errors = [];

    // 1. Required field checks
    if (!raw.name) {
      errors.push('Missing product name');
    }

    if (!raw.sku) {
      errors.push('Missing SKU');
    }

    if (!raw.tenant) {
      errors.push('Missing tenant store');
    }

    // 2. Validate tenant store
    let matchedStore = null;
    let finalTenant = raw.tenant;
    let finalUnit = raw.unit;
    let finalCategory = raw.category;

    if (raw.tenant) {
      matchedStore = matchStoreByName(raw.tenant, stores);
      if (!matchedStore) {
        errors.push(`Unknown store: "${raw.tenant}"`);
      } else {
        // Use exact canonical store name and unit
        finalTenant = matchedStore.name;
        if (!finalUnit) {
          finalUnit = extractStoreUnit(matchedStore);
        }
        if (!finalCategory) {
          finalCategory = matchedStore.category || matchedStore.department || 'General';
        }
      }
    }

    // Default category fallback if still empty
    if (!finalCategory) {
      finalCategory = 'General';
    }

    // 3. Stock validation (whole number >= 0)
    let parsedStock = null;
    if (raw.stock === '' || raw.stock === null || raw.stock === undefined) {
      errors.push('Missing stock quantity');
    } else {
      const stockStr = String(raw.stock).trim();
      const num = Number(stockStr);
      if (!/^\d+$/.test(stockStr) || isNaN(num) || num < 0 || !Number.isInteger(num)) {
        errors.push('Stock must be a whole number ≥ 0');
      } else {
        parsedStock = num;
      }
    }

    // 4. MinBuffer validation (whole number >= 0)
    let parsedMinBuffer = null;
    if (raw.minBuffer === '' || raw.minBuffer === null || raw.minBuffer === undefined) {
      errors.push('Missing min buffer');
    } else {
      const bufStr = String(raw.minBuffer).trim();
      const num = Number(bufStr);
      if (!/^\d+$/.test(bufStr) || isNaN(num) || num < 0 || !Number.isInteger(num)) {
        errors.push('Min buffer must be a whole number ≥ 0');
      } else {
        parsedMinBuffer = num;
      }
    }

    // 5. Price validation (number >= 0, currency symbols stripped)
    let parsedPrice = null;
    if (raw.price === '' || raw.price === null || raw.price === undefined) {
      errors.push('Missing unit price');
    } else {
      const cleanedPriceStr = cleanPriceString(raw.price);
      const num = parseFloat(cleanedPriceStr);
      if (cleanedPriceStr === '' || isNaN(num) || num < 0 || !isFinite(num)) {
        errors.push('Price must be a valid number ≥ 0');
      } else {
        parsedPrice = Math.round(num * 100) / 100; // 2 decimal places
      }
    }

    // 6. Duplicate SKU within same file check
    const trimmedSku = (raw.sku || '').trim();
    const normSku = trimmedSku.toUpperCase();
    if (trimmedSku) {
      if (seenSkusInFile.has(normSku)) {
        errors.push(`Duplicate SKU in file (row ${seenSkusInFile.get(normSku)})`);
      } else {
        seenSkusInFile.set(normSku, raw.rowNumber);
      }
    }

    // Determine status & duplicate vs existing products
    let status = 'New';
    let errorMessage = '';
    let existingMatch = null;

    if (errors.length > 0) {
      status = 'Error';
      errorMessage = errors.join('; ');
      errorCount++;
    } else {
      // Check against existing products by SKU + Tenant
      const normTenant = normalizeText(finalTenant);
      existingMatch = existingProducts.find(p => {
        const pSku = (p.sku || '').trim().toUpperCase();
        const pTenant = normalizeText(p.tenant);
        return pSku === normSku && pTenant === normTenant;
      });

      if (existingMatch) {
        if (duplicateMode === 'skip') {
          status = 'Skip';
          skippedCount++;
        } else {
          status = 'Update';
          updateCount++;
        }
      } else {
        status = 'New';
        newCount++;
      }
    }

    evaluatedRows.push({
      rowNumber: raw.rowNumber,
      name: raw.name,
      sku: trimmedSku,
      tenant: finalTenant,
      unit: finalUnit || '#Store',
      category: finalCategory,
      stock: parsedStock !== null ? parsedStock : raw.stock,
      minBuffer: parsedMinBuffer !== null ? parsedMinBuffer : raw.minBuffer,
      price: parsedPrice !== null ? parsedPrice : raw.price,
      id: raw.id || (existingMatch ? existingMatch.id : null),
      status,
      errorMessage,
      existingId: existingMatch ? existingMatch.id : null
    });
  }

  return {
    rows: evaluatedRows,
    summary: {
      total: evaluatedRows.length,
      newCount,
      updateCount,
      skippedCount,
      errorCount
    },
    hasErrors: errorCount > 0,
    validRows: evaluatedRows.filter(r => r.status === 'New' || r.status === 'Update' || r.status === 'Skip')
  };
}

/**
 * Execute product import in a single pass.
 * Can be reused directly when transitioning to Supabase backend.
 * 
 * @param {Array} evaluatedRows Validated rows from validateAndPreviewRows
 * @param {Object} options Options containing { duplicateMode, existingProducts, stores }
 * @returns {Object} { added, updated, skipped, errors, products }
 */
export function importProducts(evaluatedRows, options = {}) {
  const duplicateMode = options.duplicateMode || 'update';
  const existingProducts = options.existingProducts || [];

  // Deep clone existing products to prevent mutating state if an error occurs
  const productsList = existingProducts.map(p => ({ ...p }));

  // Index existing products by SKU + Tenant for O(1) lookup
  const productIndexMap = new Map();
  productsList.forEach((p, idx) => {
    const key = `${(p.sku || '').trim().toUpperCase()}:::${normalizeText(p.tenant)}`;
    productIndexMap.set(key, idx);
  });

  let added = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  const newProductsToPrepend = [];

  for (let i = 0; i < evaluatedRows.length; i++) {
    const row = evaluatedRows[i];

    if (row.status === 'Error') {
      errors.push({ rowNumber: row.rowNumber, reason: row.errorMessage });
      continue;
    }

    const key = `${(row.sku || '').trim().toUpperCase()}:::${normalizeText(row.tenant)}`;
    const existingIndex = productIndexMap.get(key);

    if (existingIndex !== undefined) {
      if (duplicateMode === 'skip') {
        skipped++;
        continue;
      }

      // Update existing product
      const target = productsList[existingIndex];
      target.name = row.name;
      target.category = row.category;
      target.stock = Number(row.stock);
      target.minBuffer = Number(row.minBuffer);
      target.price = Number(row.price);
      if (row.unit && row.unit !== '#Store') {
        target.unit = row.unit;
      }
      updated++;
    } else {
      // Add new product
      const newProduct = {
        id: row.id || `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: row.name,
        sku: (row.sku || '').trim().toUpperCase(),
        tenant: row.tenant,
        unit: row.unit || '#Store',
        category: row.category || 'General',
        stock: Number(row.stock),
        minBuffer: Number(row.minBuffer),
        price: Number(row.price)
      };
      newProductsToPrepend.push(newProduct);
      added++;
    }
  }

  // Combine new products at the top (matches MallMatrix unshift pattern)
  const finalProducts = [...newProductsToPrepend, ...productsList];

  return {
    added,
    updated,
    skipped,
    errors,
    products: finalProducts
  };
}

/**
 * Safe localStorage write testing quota before committing.
 * If quota exceeded, returns error and leaves existing storage untouched.
 */
export function safeSaveProducts(products) {
  const jsonString = JSON.stringify(products);
  const testKey = '__mallmatrix_quota_test__';
  try {
    localStorage.setItem(testKey, jsonString);
    localStorage.removeItem(testKey);
    localStorage.setItem('mallmatrix_products', jsonString);
    return { success: true };
  } catch (err) {
    try { localStorage.removeItem(testKey); } catch (_) {}
    return {
      success: false,
      error: 'Storage quota exceeded. Your browser storage is full; product import was aborted and existing data remains unchanged.'
    };
  }
}

/**
 * Generate sample CSV template with standard header and 2 example rows.
 */
export function generateTemplateCSV() {
  const headers = ['name', 'sku', 'tenant', 'category', 'stock', 'minBuffer', 'price'];
  const row1 = ['Zara Slim Fit Chinos', 'SKU-ZAR-901', 'Zara Flagship', 'Fashion', 45, 15, 59.99];
  const row2 = ['Apple MagSafe Charger', 'SKU-APP-205', 'Apple Store', 'Electronics', 60, 20, 39.00];

  const escapeCSV = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escapeCSV).join(','),
    row1.map(escapeCSV).join(','),
    row2.map(escapeCSV).join(',')
  ];

  return lines.join('\r\n');
}

/**
 * Generate CSV error report for rows with validation issues.
 */
export function generateErrorReportCSV(evaluatedRows = []) {
  const errorRows = evaluatedRows.filter(r => r.status === 'Error');
  const headers = ['Row Number', 'Product Name', 'SKU', 'Tenant Store', 'Stock', 'Min Buffer', 'Price', 'Error Reason'];

  const escapeCSV = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.map(escapeCSV).join(',')];

  errorRows.forEach(r => {
    const row = [
      r.rowNumber,
      r.name,
      r.sku,
      r.tenant,
      r.stock,
      r.minBuffer,
      r.price,
      r.errorMessage
    ];
    lines.push(row.map(escapeCSV).join(','));
  });

  return lines.join('\r\n');
}

