/**
 * MALLMATRIX — IndexedDB Storage Layer
 * High-performance, client-side transactional storage for large datasets (up to 100MB+).
 * Stores: stores, products, purchaseOrders, salesHistory, kpiSnapshots, customDatasets,
 * mappingTemplates, importLog, and issues.
 * 
 * Separated cleanly from UI and import business logic.
 */

const DB_NAME = 'MallMatrixDB';
const DB_VERSION = 1;

let dbInstance = null;

/**
 * Open or upgrade the MallMatrix IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Stores (Tenants)
      if (!db.objectStoreNames.contains('stores')) {
        const store = db.createObjectStore('stores', { keyPath: 'id' });
        store.createIndex('mallId', 'mallId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      // 2. Products
      if (!db.objectStoreNames.contains('products')) {
        const store = db.createObjectStore('products', { keyPath: 'id' });
        store.createIndex('storeId', 'storeId', { unique: false });
        store.createIndex('sku', 'sku', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }

      // 3. Purchase Orders
      if (!db.objectStoreNames.contains('purchaseOrders')) {
        const store = db.createObjectStore('purchaseOrders', { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('supplier', 'supplier', { unique: false });
      }

      // 4. Sales History
      if (!db.objectStoreNames.contains('salesHistory')) {
        const store = db.createObjectStore('salesHistory', { keyPath: 'id' });
        store.createIndex('storeId', 'storeId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }

      // 5. KPI Snapshots
      if (!db.objectStoreNames.contains('kpiSnapshots')) {
        const store = db.createObjectStore('kpiSnapshots', { keyPath: 'id' });
        store.createIndex('store_id', 'store_id', { unique: false });
        store.createIndex('snapshot_date', 'snapshot_date', { unique: false });
        store.createIndex('mall_id', 'mall_id', { unique: false });
      }

      // 6. Custom Datasets
      if (!db.objectStoreNames.contains('customDatasets')) {
        db.createObjectStore('customDatasets', { keyPath: 'id' });
      }

      // 7. Mapping Templates
      if (!db.objectStoreNames.contains('mappingTemplates')) {
        db.createObjectStore('mappingTemplates', { keyPath: 'id' });
      }

      // 8. Import Log
      if (!db.objectStoreNames.contains('importLog')) {
        db.createObjectStore('importLog', { keyPath: 'id', autoIncrement: true });
      }

      // 9. Issues Log
      if (!db.objectStoreNames.contains('issues')) {
        const store = db.createObjectStore('issues', { keyPath: 'id', autoIncrement: true });
        store.createIndex('file', 'file', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Execute batch put operations inside 500-row chunks for high performance and responsiveness.
 * @param {string} storeName - Object store name
 * @param {Array} items - Records to save
 * @param {Function} [onProgress] - Optional callback (percent, written, total)
 * @returns {Promise<number>} - Count of written records
 */
export async function batchPut(storeName, items = [], onProgress = null) {
  if (!items || items.length === 0) return 0;
  const db = await openDB();

  const BATCH_SIZE = 500;
  const total = items.length;
  let written = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      for (const item of chunk) {
        store.put(item);
      }

      tx.oncomplete = () => {
        written += chunk.length;
        if (typeof onProgress === 'function') {
          const pct = Math.round((written / total) * 100);
          onProgress(pct, written, total);
        }
        resolve();
      };

      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('Transaction aborted'));
    });
  }

  return written;
}

/**
 * Get all records from an object store.
 * @param {string} storeName 
 * @returns {Promise<Array>}
 */
export async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single record by key.
 */
export async function get(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Put a single item into a store.
 */
export async function put(storeName, item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a single record by key.
 */
export async function deleteRecord(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear a specific object store.
 */
export async function clearStore(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if the core tables are empty (meaning initial sample data should be loaded).
 */
export async function isDBEmpty() {
  try {
    const stores = await getAll('stores');
    const products = await getAll('products');
    return stores.length === 0 && products.length === 0;
  } catch (err) {
    console.warn('Error checking isDBEmpty:', err);
    return true;
  }
}

/**
 * Load complete application state from IndexedDB.
 * Returns null if DB has no stored data, prompting initial fallback.
 */
export async function loadAllStateFromDB() {
  try {
    const [stores, products, purchaseOrders, salesHistory, kpiSnapshots, customDatasets] = await Promise.all([
      getAll('stores'),
      getAll('products'),
      getAll('purchaseOrders'),
      getAll('salesHistory'),
      getAll('kpiSnapshots'),
      getAll('customDatasets')
    ]);

    if (stores.length === 0 && products.length === 0 && purchaseOrders.length === 0) {
      return null;
    }

    return {
      stores,
      products,
      purchaseOrders,
      salesHistory,
      kpiSnapshots,
      customDatasets
    };
  } catch (err) {
    console.error('Failed to load state from IndexedDB:', err);
    return null;
  }
}

/**
 * Clear all imported and dynamic data from IndexedDB and localStorage.
 */
export async function resetAllImportedData() {
  const storesToClear = [
    'stores',
    'products',
    'purchaseOrders',
    'salesHistory',
    'kpiSnapshots',
    'customDatasets',
    'issues',
    'importLog'
  ];

  const db = await openDB();
  await Promise.all(storesToClear.map(name => {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(name, 'readwrite');
        tx.objectStore(name).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }));

  // Clear related localStorage items
  const localKeys = [
    'mallmatrix_products',
    'mallmatrix_tenants',
    'mallmatrix_purchase_orders',
    'mallmatrix_staff',
    'mallmatrix_has_imported_data',
    'mallmatrix_selected_mall'
  ];
  localKeys.forEach(k => {
    try { localStorage.removeItem(k); } catch (e) {}
  });

  return true;
}

/**
 * Save mapping template. Supports either (templateObj) or (headerKey, targetTable, mapping).
 */
export async function saveMappingTemplate(headerKeyOrTemplate, targetTable, mapping) {
  if (typeof headerKeyOrTemplate === 'object' && headerKeyOrTemplate !== null) {
    const item = { ...headerKeyOrTemplate };
    if (!item.id && item.headerKey) item.id = item.headerKey;
    return put('mappingTemplates', item);
  }
  const item = {
    id: headerKeyOrTemplate,
    headerKey: headerKeyOrTemplate,
    targetTable: targetTable || 'custom',
    mapping: mapping || {},
    createdAt: new Date().toISOString()
  };
  return put('mappingTemplates', item);
}

/**
 * Retrieve mapping template by normalized header sequence key.
 */
export async function getMappingTemplate(headerKey) {
  return get('mappingTemplates', headerKey);
}

/**
 * List all saved mapping templates.
 */
export async function getAllMappingTemplates() {
  return getAll('mappingTemplates');
}

/**
 * Delete mapping template by key.
 */
export async function deleteMappingTemplate(headerKey) {
  return deleteRecord('mappingTemplates', headerKey);
}

/**
 * Save custom dataset to customDatasets store.
 */
export async function saveCustomDataset(dataset) {
  return put('customDatasets', dataset);
}

/**
 * List all custom datasets from customDatasets store.
 */
export async function getAllCustomDatasets() {
  return getAll('customDatasets');
}

/**
 * Log import batch execution.
 */
export async function logImportRecord(record) {
  return put('importLog', record);
}


