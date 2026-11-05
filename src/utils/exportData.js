/**
 * MALLMATRIX — High Performance Client-Side Data Export System
 * Pure browser-based exports: CSV (Blob + UTF-8 BOM), Excel (SheetJS), and PDF (jsPDF + autoTable)
 * Following the MallMatrix purple brand theme (#5429FF).
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ==========================================
// 1. SETTINGS & LOCAL STORAGE HELPERS
// ==========================================

const STORAGE_KEYS = {
  HISTORY: 'mallmatrix_export_history',
  TOTALS: 'mallmatrix_export_totals',
  LAST_EXPORT: 'mallmatrix_export_last_'
};

/**
 * Check if the "Include summary row (totals)" option is enabled
 * Default: true
 */
export function getExportTotalsSetting() {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.TOTALS);
    return val === null ? true : val === 'true';
  } catch (e) {
    return true;
  }
}

/**
 * Set the "Include summary row (totals)" option
 */
export function setExportTotalsSetting(enabled) {
  try {
    localStorage.setItem(STORAGE_KEYS.TOTALS, String(enabled));
  } catch (e) {}
}

/**
 * Get export history (last 10 items)
 */
export function getExportHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Record an export event in local history
 */
export function addExportHistory(record) {
  try {
    const history = getExportHistory();
    const entry = {
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      fileName: record.fileName || 'export',
      module: record.module || 'Data',
      format: record.format || 'CSV',
      recordCount: typeof record.recordCount === 'number' ? record.recordCount : 0,
      timestamp: record.timestamp || new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };

    history.unshift(entry);
    const trimmed = history.slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));

    // Also update module last-exported timestamp
    if (record.moduleKey) {
      setLastExported(record.moduleKey, entry.timestamp);
    }

    return entry;
  } catch (e) {
    console.warn('Failed to save export history:', e);
    return null;
  }
}

/**
 * Clear all export history
 */
export function clearExportHistory() {
  try {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  } catch (e) {}
}

/**
 * Get the last exported timestamp for a specific module
 */
export function getLastExported(moduleKey) {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_EXPORT + moduleKey) || 'Never';
  } catch (e) {
    return 'Never';
  }
}

/**
 * Set the last exported timestamp for a module
 */
export function setLastExported(moduleKey, timestamp) {
  try {
    const ts = timestamp || new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    localStorage.setItem(STORAGE_KEYS.LAST_EXPORT + moduleKey, ts);
  } catch (e) {}
}

/**
 * Standard filename generator: mallmatrix-<module>-<YYYY-MM-DD>.<ext>
 */
export function getExportFilename(moduleName, extension) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const cleanMod = String(moduleName || 'data').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const cleanExt = String(extension || 'dat').toLowerCase().replace(/^\./, '');
  return `mallmatrix-${cleanMod}-${yyyy}-${mm}-${dd}.${cleanExt}`;
}

// ==========================================
// 2. CSV EXPORT (Blob + UTF-8 BOM)
// ==========================================

function escapeCSVValue(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  // If string contains comma, quotes, or newlines, escape quotes by doubling them and surround with quotes
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export rows and columns to a CSV file.
 * Includes UTF-8 BOM (\uFEFF) for proper currency and symbol rendering in Excel.
 */
export function exportToCSV(rows, columns, filename, options = {}) {
  try {
    const fname = filename || getExportFilename(options.moduleName || 'dataset', 'csv');
    const headerRow = columns.map(c => escapeCSVValue(c.label || c.key)).join(',');

    const dataRows = (rows || []).map(row => {
      return columns.map(col => {
        let val = row[col.key];
        if (typeof col.format === 'function') {
          val = col.format(val, row);
        }
        return escapeCSVValue(val);
      }).join(',');
    });

    // Check if summary row should be included
    if (options.summaryRow && getExportTotalsSetting()) {
      const summaryCells = columns.map(col => {
        const val = options.summaryRow[col.key];
        return escapeCSVValue(val !== undefined ? val : '');
      });
      dataRows.push(summaryCells.join(','));
    }

    const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fname);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addExportHistory({
      fileName: fname,
      module: options.moduleTitle || options.moduleName || 'Data',
      moduleKey: options.moduleKey || options.moduleName,
      format: 'CSV',
      recordCount: (rows || []).length
    });

    return true;
  } catch (err) {
    console.error('CSV export failed:', err);
    throw err;
  }
}

// ==========================================
// 3. EXCEL EXPORT (SheetJS XLSX)
// ==========================================

/**
 * Export sheets to an Excel (.xlsx) file with auto-sizing columns, bold header row,
 * frozen top row, and real numbers/dates.
 *
 * @param {Array|Object} sheets - Single sheet { name, rows, columns, summaryRow? } or array of sheets
 * @param {string} filename - Target filename
 * @param {Object} options - Extra options
 */
export function exportToExcel(sheets, filename, options = {}) {
  try {
    const sheetList = Array.isArray(sheets) ? sheets : [sheets];
    const fname = filename || getExportFilename(options.moduleName || 'dataset', 'xlsx');
    const wb = XLSX.utils.book_new();
    let totalRecords = 0;

    sheetList.forEach((sheetConfig, sheetIdx) => {
      const { name, rows = [], columns = [], summaryRow } = sheetConfig;
      totalRecords += rows.length;
      const sheetName = (name || `Sheet${sheetIdx + 1}`)
        .substring(0, 31)
        .replace(/[\\/?*[\]]/g, '');

      // Build 2D array of data
      const headers = columns.map(c => c.label || c.key);
      const dataRows = rows.map(row => {
        return columns.map(col => {
          const rawVal = row[col.key];
          if (col.excelType === 'number' || (typeof rawVal === 'number' && !col.excelForceText)) {
            return rawVal;
          }
          if (typeof col.format === 'function') {
            const formatted = col.format(rawVal, row);
            // If formatted value represents a pure currency number and excelType is number, parse it
            if (col.excelType === 'number' && typeof formatted === 'string') {
              const parsed = parseFloat(formatted.replace(/[^0-9.-]+/g, ''));
              return isNaN(parsed) ? formatted : parsed;
            }
            return formatted;
          }
          return rawVal !== undefined && rawVal !== null ? rawVal : '';
        });
      });

      // Append summary totals row if configured and setting is enabled
      if (summaryRow && getExportTotalsSetting()) {
        const sumRow = columns.map(col => {
          const val = summaryRow[col.key];
          return val !== undefined ? val : '';
        });
        dataRows.push(sumRow);
      }

      // Convert 2D array to sheet
      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

      // 1. Calculate column widths (auto-sizing with min/max bounds)
      const colWidths = headers.map((headerText, colIdx) => {
        let maxLen = String(headerText).length;
        dataRows.forEach(row => {
          const cellVal = row[colIdx];
          if (cellVal !== undefined && cellVal !== null) {
            const len = String(cellVal).length;
            if (len > maxLen) maxLen = len;
          }
        });
        return { wch: Math.min(Math.max(maxLen + 3, 11), 45) };
      });
      ws['!cols'] = colWidths;

      // 2. Freeze top row so header stays visible on scroll
      ws['!views'] = [{ state: 'frozen', ySplit: 1 }];
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };

      // 3. Mark bold headers where supported by cell styling
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (ws[address]) {
          ws[address].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '5429FF' } },
            alignment: { vertical: 'center', horizontal: 'center' }
          };
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, fname);

    addExportHistory({
      fileName: fname,
      module: options.moduleTitle || options.moduleName || (sheetList.length > 1 ? 'Multi-Module' : sheetList[0].name),
      moduleKey: options.moduleKey || options.moduleName,
      format: 'Excel',
      recordCount: totalRecords
    });

    return true;
  } catch (err) {
    console.error('Excel export failed:', err);
    throw err;
  }
}

// ==========================================
// 4. PDF EXPORT (jsPDF + autoTable)
// ==========================================

function drawHeaderAndBranding(doc, title, subtitle, isLandscape) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Top decorative purple accent bar
  doc.setFillColor(84, 41, 255); // #5429FF
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Brand Name & Logo Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(84, 41, 255);
  doc.text('MallMatrix', 36, 30);

  // Platform tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Enterprise Mall Multi-Tenant Operations & Inventory Mesh', 115, 30);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // #0F172A
  doc.text(title, 36, 50);

  // Subtitle / Date details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) + ' • ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const subText = subtitle ? `${subtitle} | Generated on ${dateStr}` : `Generated on ${dateStr}`;
  doc.text(subText, 36, 63);

  // Thin separator line
  doc.setDrawColor(226, 232, 240); // #E2E8F0
  doc.setLineWidth(0.75);
  doc.line(36, 70, pageWidth - 36, 70);
}

function applyPageNumbers(doc) {
  const totalPages = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    // Left footer brand
    doc.text('MallMatrix Cloud Operations Platform • Confidential Internal Report', 36, pageHeight - 16);

    // Right footer page count
    const pageStr = `Page ${i} of ${totalPages}`;
    doc.text(pageStr, pageWidth - 36, pageHeight - 16, { align: 'right' });

    // Bottom subtle divider
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.5);
    doc.line(36, pageHeight - 25, pageWidth - 36, pageHeight - 25);
  }
}

/**
 * Export table data to a beautifully styled PDF document
 */
export function exportToPDF(title, rows, columns, filename, options = {}) {
  try {
    const isLandscape = options.orientation ? options.orientation === 'landscape' : columns.length > 6;
    const fname = filename || getExportFilename(options.moduleName || 'dataset', 'pdf');
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    drawHeaderAndBranding(doc, title, options.subtitle || '', isLandscape);

    // Table Headers and Body
    const headers = columns.map(c => c.label || c.key);
    const bodyRows = (rows || []).map(row => {
      return columns.map(col => {
        let val = row[col.key];
        if (typeof col.format === 'function') {
          val = col.format(val, row);
        }
        return val !== undefined && val !== null ? String(val) : '';
      });
    });

    // Add summary row if provided and setting is enabled
    if (options.summaryRow && getExportTotalsSetting()) {
      const summaryCells = columns.map(col => {
        const val = options.summaryRow[col.key];
        return val !== undefined && val !== null ? String(val) : '';
      });
      bodyRows.push(summaryCells);
    }

    const startY = 82;
    const autoTableFn = (typeof doc.autoTable === 'function') ? doc.autoTable.bind(doc) : autoTable;

    autoTableFn(doc, {
      head: [headers],
      body: bodyRows,
      startY,
      margin: { top: 76, bottom: 35, left: 36, right: 36 },
      theme: 'striped',
      styles: {
        font: 'helvetica',
        fontSize: columns.length > 7 ? 7.5 : 8.5,
        cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.5,
        valign: 'middle'
      },
      headStyles: {
        fillColor: [84, 41, 255], // #5429FF MallMatrix Brand Purple
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: columns.length > 7 ? 8 : 9,
        halign: 'left'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // #F8FAFC
      },
      didParseCell: (data) => {
        // Highlight summary total row at the end if present
        if (options.summaryRow && getExportTotalsSetting() && data.row.index === bodyRows.length - 1 && data.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [238, 242, 255]; // Indigo-50
          data.cell.styles.textColor = [67, 30, 212];
        }
      }
    });

    applyPageNumbers(doc);
    doc.save(fname);

    addExportHistory({
      fileName: fname,
      module: options.moduleTitle || options.moduleName || title,
      moduleKey: options.moduleKey || options.moduleName,
      format: 'PDF',
      recordCount: (rows || []).length
    });

    return true;
  } catch (err) {
    console.error('PDF export failed:', err);
    throw err;
  }
}

// ==========================================
// 5. SINGLE PO DOCUMENT PDF (Invoice / Purchase Order)
// ==========================================

/**
 * Creates a single formatted Purchase Order document (PDF)
 */
export function exportSinglePOToPDF(po) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;

    // Brand accent top bar
    doc.setFillColor(84, 41, 255);
    doc.rect(0, 0, pageWidth, 7, 'F');

    // Header Left: Brand Logo & System
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(84, 41, 255);
    doc.text('MallMatrix', margin, 42);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Autonomous Inventory & Reordering Engine', margin, 55);

    // Header Right: Document Title & PO ID
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('PURCHASE ORDER', pageWidth - margin, 42, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(84, 41, 255);
    doc.text(po.id, pageWidth - margin, 58, { align: 'right' });

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(margin, 70, pageWidth - margin, 70);

    // Two-Column Metadata Box: Vendor & Tenant
    const boxY = 85;
    const boxWidth = (pageWidth - margin * 2 - 16) / 2;
    const boxHeight = 76;

    // Vendor Box (Left)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, boxY, boxWidth, boxHeight, 5, 5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('VENDOR / SUPPLIER DETAILS', margin + 12, boxY + 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(po.supplier || 'Supplier Unspecified', margin + 12, boxY + 32);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(po.vendorContact || 'Tier 1 B2B Supplier Logistics', margin + 12, boxY + 46);
    doc.text(`Lead Time: ${po.leadTime || '3 business days'}`, margin + 12, boxY + 60);

    // Target Tenant Box (Right)
    const rightBoxX = margin + boxWidth + 16;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(rightBoxX, boxY, boxWidth, boxHeight, 5, 5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('DELIVERY TARGET / TENANT STORE', rightBoxX + 12, boxY + 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(po.tenant || 'Tenant Retail Store', rightBoxX + 12, boxY + 32);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Unit: ${po.unit || 'Floor 1, Retail Corridor'}`, rightBoxX + 12, boxY + 46);
    doc.text(`Expected Delivery: ${po.expectedDelivery || 'Mar 28, 2026'}`, rightBoxX + 12, boxY + 60);

    // Timeline & Order Attributes Strip
    const stripY = boxY + boxHeight + 14;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, stripY, pageWidth - margin * 2, 38, 4, 4, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);

    const dateCreated = po.createdDate || 'Mar 24, 2026, 09:30 AM';
    doc.text(`Order Created: `, margin + 12, stripY + 16);
    doc.setFont('helvetica', 'bold');
    doc.text(dateCreated, margin + 74, stripY + 16);

    doc.setFont('helvetica', 'normal');
    doc.text(`Status: `, margin + 200, stripY + 16);
    doc.setFont('helvetica', 'bold');
    let statusColor = [84, 41, 255];
    if (po.status === 'Delivered') statusColor = [16, 185, 129];
    else if (po.status === 'Pending') statusColor = [217, 119, 6];
    else if (po.status === 'Rejected') statusColor = [220, 38, 38];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(String(po.status || 'Pending').toUpperCase(), margin + 235, stripY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Replenishment Reason: `, margin + 12, stripY + 28);
    doc.setFont('helvetica', 'italic');
    doc.text(po.reason || 'Triggered: stock below safety buffer', margin + 115, stripY + 28);

    // Line items table
    const lineItems = po.lineItems && po.lineItems.length > 0 ? po.lineItems : [
      { name: po.items || 'Restock Package', sku: 'SKU-001', qty: 1, price: 100, subtotal: 100 }
    ];

    const tableStartY = stripY + 48;
    const tableHeaders = ['Item Description', 'SKU Identifier', 'Order Qty', 'Unit Price', 'Subtotal'];
    const tableBody = lineItems.map(item => [
      item.name || 'Catalog Item',
      item.sku || 'SKU-GEN',
      String(item.qty || 1),
      `$${Number(item.price || 0).toFixed(2)}`,
      `$${Number(item.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    const autoTableFn = (typeof doc.autoTable === 'function') ? doc.autoTable.bind(doc) : autoTable;
    autoTableFn(doc, {
      head: [tableHeaders],
      body: tableBody,
      startY: tableStartY,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: {
        fillColor: [84, 41, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: 7,
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 190 },
        1: { cellWidth: 100 },
        2: { cellWidth: 60, halign: 'center' },
        3: { cellWidth: 75, halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 16;

    // Total summary block on the right
    const summaryBoxW = 200;
    const summaryBoxX = pageWidth - margin - summaryBoxW;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(summaryBoxX, finalY, summaryBoxW, 58, 4, 4, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Total Order Valuation', summaryBoxX + 12, finalY + 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(84, 41, 255);
    doc.text(po.value || '$0.00', summaryBoxX + summaryBoxW - 12, finalY + 24, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Includes applicable logistics & customs fees', summaryBoxX + 12, finalY + 44);

    // Operations Sign-off & Audit Stamp (Bottom Left)
    const signY = finalY + 80;
    if (signY < pageHeight - 90) {
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, signY, margin + 170, signY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('Authorized Mall Procurement Officer', margin, signY + 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Alex Rivera • Mall Operations Lead', margin, signY + 26);
    }

    applyPageNumbers(doc);

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const fname = `mallmatrix-po-${po.id.toLowerCase()}-${yyyy}-${mm}-${dd}.pdf`;
    doc.save(fname);

    addExportHistory({
      fileName: fname,
      module: `PO: ${po.id}`,
      moduleKey: 'reorder',
      format: 'PDF',
      recordCount: lineItems.length
    });

    return true;
  } catch (err) {
    console.error('PO single PDF export failed:', err);
    throw err;
  }
}

// ==========================================
// 6. FULL MALL REPORT PDF (Multi-Section Executive Overview)
// ==========================================

export function exportFullReportToPDF(mallData) {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    const isLandscape = true;
    const pageWidth = doc.internal.pageSize.getWidth();
    const autoTableFn = (typeof doc.autoTable === 'function') ? doc.autoTable.bind(doc) : autoTable;

    // --- PAGE 1: EXECUTIVE SUMMARY & KPIS ---
    drawHeaderAndBranding(doc, 'MallMatrix Executive Operations Report', 'Comprehensive Mall Audit & Telemetry', isLandscape);

    // KPI Cards Strip
    const cardY = 85;
    const cardGap = 12;
    const cardCount = 4;
    const totalAvailW = pageWidth - 72;
    const cardW = (totalAvailW - cardGap * (cardCount - 1)) / cardCount;
    const cardH = 55;

    const kpis = [
      { label: 'Gross Sales Volume', val: `$${(mallData.totalRevenue || 148250).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'Active retail stores' },
      { label: 'Low Stock SKUs', val: String(mallData.lowStockCount || 6), sub: 'Buffer breach alerts' },
      { label: 'Pending PO Reorders', val: String(mallData.pendingPOCount || 2), sub: 'Awaiting B2B release' },
      { label: 'Staff On Shift', val: `${mallData.staffOnDuty || 3} Officers`, sub: 'Active floor auditors' }
    ];

    kpis.forEach((kpi, idx) => {
      const cx = 36 + idx * (cardW + cardGap);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cx, cardY, cardW, cardH, 4, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, cx + 10, cardY + 16);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(84, 41, 255);
      doc.text(kpi.val, cx + 10, cardY + 34);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(kpi.sub, cx + 10, cardY + 46);
    });

    // Section 1: Sales Leaderboard Table on Page 1
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Store Sales & POS Real-Time Telemetry', 36, 162);

    const salesColumns = [
      'Rank', 'Tenant Store', 'Location', 'Units Sold', 'Gross Sales', 'Turnover Velocity', 'POS Telemetry'
    ];
    const salesRows = (mallData.tenants || []).map((t, i) => [
      `#0${i + 1}`,
      t.name,
      t.unit,
      `${(t.calculatedUnits || t.unitsSold).toLocaleString()} units`,
      `$${(t.calculatedSales || t.salesAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${t.turnoverRate}%`,
      String(t.posStatus || 'Online').toUpperCase()
    ]);

    autoTableFn(doc, {
      head: [salesColumns],
      body: salesRows,
      startY: 172,
      margin: { left: 36, right: 36 },
      theme: 'striped',
      headStyles: { fillColor: [84, 41, 255], fontSize: 8.5, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 5 }
    });

    // --- PAGE 2: INVENTORY & REORDERING ---
    doc.addPage('a4', 'landscape');
    drawHeaderAndBranding(doc, 'MallMatrix Executive Operations Report', 'Catalog & Reordering Systems', isLandscape);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('2. Critical Inventory & Safety Stock Catalog', 36, 92);

    const invColumns = ['Product Name', 'SKU Identifier', 'Tenant Store', 'Category', 'Stock Qty', 'Min Buffer', 'Unit Price', 'Stock Health'];
    const invRows = (mallData.products || []).slice(0, 15).map(p => {
      let status = 'Healthy';
      if (p.stock < p.minBuffer * 0.5) status = 'Critical';
      else if (p.stock <= p.minBuffer) status = 'Low';
      return [
        p.name,
        p.sku,
        p.tenant,
        p.category,
        String(p.stock),
        String(p.minBuffer),
        `$${p.price.toFixed(2)}`,
        status
      ];
    });

    autoTableFn(doc, {
      head: [invColumns],
      body: invRows,
      startY: 102,
      margin: { left: 36, right: 36 },
      theme: 'striped',
      headStyles: { fillColor: [84, 41, 255], fontSize: 8.5, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 5 }
    });

    // --- PAGE 3: PURCHASE ORDERS & STAFF ---
    doc.addPage('a4', 'landscape');
    drawHeaderAndBranding(doc, 'MallMatrix Executive Operations Report', 'Procurement & Logistics Duty Roster', isLandscape);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('3. Purchase Orders & Automated Replenishments', 36, 92);

    const poColumns = ['PO ID', 'Vendor / Supplier', 'Requisition Items', 'Target Tenant', 'Total Valuation', 'Status', 'Expected Delivery'];
    const poRows = (mallData.purchaseOrders || []).map(po => [
      po.id,
      po.supplier,
      po.items,
      po.tenant,
      po.value,
      po.status,
      po.expectedDelivery || 'In transit'
    ]);

    autoTableFn(doc, {
      head: [poColumns],
      body: poRows,
      startY: 102,
      margin: { left: 36, right: 36 },
      theme: 'striped',
      headStyles: { fillColor: [84, 41, 255], fontSize: 8.5, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 5 }
    });

    const staffY = doc.lastAutoTable.finalY + 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('4. On-Duty Operations Staff & Compliance Roster', 36, staffY);

    const staffCols = ['Staff Name & ID', 'Role', 'Assigned Mall Zone', 'Duty Status', 'Current Audit', 'Contact'];
    const staffRows = (mallData.staff || []).map(s => [
      `${s.name} (${s.id})`,
      s.role,
      s.zone,
      s.status,
      s.audits,
      s.contact
    ]);

    autoTableFn(doc, {
      head: [staffCols],
      body: staffRows,
      startY: staffY + 10,
      margin: { left: 36, right: 36 },
      theme: 'striped',
      headStyles: { fillColor: [84, 41, 255], fontSize: 8.5, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 5 }
    });

    applyPageNumbers(doc);

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const fname = `mallmatrix-full-report-${yyyy}-${mm}-${dd}.pdf`;
    doc.save(fname);

    addExportHistory({
      fileName: fname,
      module: 'Full Mall Report',
      moduleKey: 'full_report',
      format: 'PDF',
      recordCount: (mallData.products?.length || 0) + (mallData.tenants?.length || 0)
    });

    return true;
  } catch (err) {
    console.error('Full report PDF export failed:', err);
    throw err;
  }
}
