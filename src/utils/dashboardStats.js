/**
 * MALLMATRIX — Pure Dashboard Statistics Calculator
 * Computes all live, reactive metrics for the Orchestrator Summary,
 * KPI Cards, and Agent Modules directly from application state.
 */

import {
  getCriticalStockCount,
  getLowStockCount,
  getTotalGrossSales
} from '../data/mallData.js';

/**
 * Pure function to calculate all dynamic dashboard metrics from state.
 * @param {Object} state - Application state object containing products, tenants, staff, purchaseOrders
 * @returns {Object} Calculated metrics
 */
export function getDashboardStats(state = {}) {
  const products = Array.isArray(state.products) ? state.products : [];
  const tenants = Array.isArray(state.tenants) ? state.tenants : [];
  const staff = Array.isArray(state.staff) ? state.staff : [];
  const purchaseOrders = Array.isArray(state.purchaseOrders) ? state.purchaseOrders : [];

  // 1. Inventory & Buffer Metrics
  const criticalCount = getCriticalStockCount(products);
  const lowCount = getLowStockCount(products);
  const skuCount = products.length;
  const inStockCount = products.filter(p => Number(p.stock) > Number(p.minBuffer)).length;
  const inStockRatio = skuCount > 0 ? ((inStockCount / skuCount) * 100).toFixed(1) : '0.0';

  // 2. Financial & Revenue Metrics
  const grossRevenue = getTotalGrossSales(tenants);

  const overdueTenants = tenants.filter(t => (t.rentStatus || '').trim().toLowerCase() === 'overdue');
  const overdueRentCount = overdueTenants.length;
  const overdueRentAmount = overdueTenants.reduce((sum, t) => sum + (Number(t.monthlyRent) || 0), 0);

  // 3. Tenant & Store Metrics
  const activeTenants = tenants.filter(t => (t.status || '').trim().toLowerCase() === 'active');
  const storesActive = activeTenants.length;
  const nonOfflineTenants = tenants.filter(t => (t.status || '').trim().toLowerCase() !== 'offline');
  const leaseOccupancy = tenants.length > 0 ? Math.round((nonOfflineTenants.length / tenants.length) * 100) : 0;

  // 4. Staffing & Floor Auditor Metrics
  const staffOnShift = staff.filter(s => (s.status || '').trim().toLowerCase() === 'on duty').length;
  const floorAuditors = staff.filter(s => (s.role || '').toLowerCase().includes('auditor')).length;
  const shiftCoverage = staff.length > 0 ? Math.round((staffOnShift / staff.length) * 100) : 0;

  // 5. Procurement & Reorder Metrics
  const poPending = purchaseOrders.filter(po => (po.status || '').trim().toLowerCase() === 'pending').length;
  const poInTransit = purchaseOrders.filter(po => (po.status || '').trim().toLowerCase() === 'shipped').length;
  const poInFlight = purchaseOrders.filter(po => {
    const s = (po.status || '').trim().toLowerCase();
    return s === 'pending' || s === 'approved' || s === 'shipped';
  }).length;

  let leadDaysSum = 0;
  let leadDaysCount = 0;
  purchaseOrders.forEach(po => {
    const str = String(po.leadTime || po.expectedDelivery || '');
    const match = str.match(/(\d+(\.\d+)?)/);
    if (match) {
      leadDaysSum += parseFloat(match[1]);
      leadDaysCount++;
    }
  });
  const avgLeadDays = leadDaysCount > 0 ? (leadDaysSum / leadDaysCount).toFixed(1) : '0.0';

  return {
    criticalCount,
    lowCount,
    skuCount,
    inStockRatio,
    grossRevenue,
    overdueRentAmount,
    overdueRentCount,
    storesActive,
    leaseOccupancy,
    staffOnShift,
    floorAuditors,
    shiftCoverage,
    poPending,
    poInTransit,
    poInFlight,
    avgLeadDays,
    bufferBreaches: lowCount
  };
}

