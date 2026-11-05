/**
 * MALLMATRIX — Stock & Inventory Management Platform
 * Production Core Logic & Reactive State Management
 */

import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  exportSinglePOToPDF,
  exportFullReportToPDF,
  getExportHistory,
  clearExportHistory,
  getLastExported,
  setLastExported,
  getExportTotalsSetting,
  setExportTotalsSetting,
  getExportFilename
} from './src/utils/exportData.js';

import {
  initialStores,
  initialProducts,
  initialPurchaseOrders,
  initialStaff,
  getTotalGrossSales,
  getTotalStockValuation,
  getCriticalStockCount,
  getLowStockCount,
  getPendingPOCount,
  formatOrdinalDate,
  formatCurrency
} from './src/data/mallData.js';

const MallState = {
  activeView: 'dashboard',
  currency: localStorage.getItem('mallmatrix_currency') || 'USD',
  totalSKUs: 18450,
  salesAmount: 2500.00,
  taxesAmount: 470.00,
  netIncome: 57000,
  stockValuation: getTotalStockValuation(initialProducts),

  // Real-time Inventory Catalog across Mall Tenants (Derived from single source)
  products: initialProducts.map(p => ({ ...p })),

  // Reorder Purchase Orders (Derived from single source)
  purchaseOrders: initialPurchaseOrders.map(po => ({ ...po })),

  // Tenants Information & POS Real-time Telemetry (Derived from single source)
  tenants: initialStores.map(t => ({ ...t })),

  // Staff Directory (Derived from single source)
  staff: initialStaff.map(s => ({ ...s }))
};

// Global Application Controller
window.MallApp = {
  _invSort: { col: null, dir: 'asc' },
  _invPage: 1,
  _invRowsPerPage: 10,
  _invSelected: new Set(),
  _invLowStockOnly: false,
  _activeRestockSku: null,
  _lastFocusedElement: null,
  _drawerKeydownHandler: null,
  _salesDateRange: 'today',
  _salesDateMultiplier: 1.0,
  _salesSort: { col: 'salesAmount', dir: 'desc' },
  _activeDetailPoId: null,
  _activeRejectPoId: null,
  _poDrawerKeydownHandler: null,
  _batchModalKeydownHandler: null,
  _rejectModalKeydownHandler: null,
  _exportDateRange: 'today',
  _exportDateMultiplier: 1.0,
  _currentFilteredInventory: null,
  _currentFilteredPOs: null,
  _currentSalesRows: null,
  _currentPODetail: null,

  init() {
    this.loadStateFromStorage();
    this.bindNavigation();
    this.bindModals();
    this.bindInventoryFilters();
    this.bindCopilot();
    this.renderAll();
    this.checkRoute();

    window.addEventListener('hashchange', () => this.checkRoute());

    // Ensure Copilot button is visible on initial dashboard load
    const copilotBtn = document.getElementById('floatingCopilotBtn');
    if (copilotBtn) {
      copilotBtn.style.display = 'flex';
    }
  },

  loadStateFromStorage() {
    try {
      MallState.currency = localStorage.getItem('mallmatrix_currency') || 'USD';
      const savedPOs = localStorage.getItem('mallmatrix_purchase_orders');
      if (savedPOs) {
        const parsed = JSON.parse(savedPOs);
        MallState.purchaseOrders = parsed.map(po => {
          let status = po.status;
          if (status === 'On Pending') status = 'Pending';
          if (status === 'Order Delivered') status = 'Delivered';

          const createdDate = po.createdDate || 'Nov 05, 2026, 09:30 AM';
          const expectedDelivery = po.expectedDelivery || 'Nov 08, 2026 (3 days)';
          const reason = po.reason || 'Triggered: stock below safety buffer';
          const lineItems = po.lineItems && po.lineItems.length > 0 ? po.lineItems : [
            { name: po.items || 'Requisition Batch', sku: 'SKU-GEN-01', qty: 1, price: parseFloat((po.value || '$0').replace(/[^0-9.-]+/g, '')) || 0, subtotal: parseFloat((po.value || '$0').replace(/[^0-9.-]+/g, '')) || 0 }
          ];

          const timeline = po.timeline || {
            created: createdDate,
            approved: (status === 'Approved' || status === 'Shipped' || status === 'Delivered') ? 'Nov 05, 2026, 11:30 AM' : null,
            shipped: (status === 'Shipped' || status === 'Delivered') ? 'Nov 06, 2026, 02:00 PM' : null,
            delivered: (status === 'Delivered') ? 'Nov 07, 2026, 10:45 AM' : null,
            rejected: (status === 'Rejected') ? 'Nov 05, 2026, 12:15 PM' : null
          };

          return {
            ...po,
            status,
            reason,
            createdDate,
            expectedDelivery,
            lineItems,
            timeline,
            rejectionReason: po.rejectionReason || null
          };
        });
      }
      const savedProds = localStorage.getItem('mallmatrix_products');
      if (savedProds) {
        MallState.products = JSON.parse(savedProds);
      }
    } catch (e) {
      console.warn('Storage restore error:', e);
    }
  },

  savePurchaseOrders() {
    try {
      localStorage.setItem('mallmatrix_purchase_orders', JSON.stringify(MallState.purchaseOrders));
    } catch (e) { }
  },

  saveProducts() {
    try {
      localStorage.setItem('mallmatrix_products', JSON.stringify(MallState.products));
    } catch (e) { }
  },

  // 1. NAVIGATION
  bindNavigation() {
    const navItems = document.querySelectorAll('.sidebar-menu .menu-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetView = item.getAttribute('data-view');
        if (targetView) {
          this.switchView(targetView);
        }
      });
    });

    // Mobile sidebar toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    if (mobileMenuBtn && sidebar && sidebarBackdrop) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        sidebarBackdrop.classList.add('active');
      });

      const closeSidebar = () => {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('active');
      };

      sidebarBackdrop.addEventListener('click', closeSidebar);
    }

    // Top Create Order button
    const sidebarCreateOrderBtn = document.getElementById('sidebarCreateOrderBtn');
    if (sidebarCreateOrderBtn) {
      sidebarCreateOrderBtn.addEventListener('click', () => this.openProductModal());
    }
  },

  switchView(viewName) {
    MallState.activeView = viewName;

    // Update active menu item
    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    // Switch view panel
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${viewName}`);
    });

    // Ensure view tables refresh when navigated to
    if (viewName === 'reorder') {
      this.renderPurchaseOrders();
    } else if (viewName === 'inventory') {
      this.renderInventoryTable();
    } else if (viewName === 'sales') {
      this.renderSalesLeaderboard();
      this.renderRevenueBarChart();
    } else if (viewName === 'export') {
      this.renderExportCenter();
    }

    // Keep bottom-right Copilot button visible on all views except the copilot view itself
    const copilotBtn = document.getElementById('floatingCopilotBtn');
    if (copilotBtn) {
      copilotBtn.style.display = viewName === 'copilot' ? 'none' : 'flex';
    }
    this.updateOverlayState();

    // Update main header title and dynamic greeting
    const mainTitle = document.getElementById('pageMainTitle');
    const mainSubtitle = document.getElementById('pageMainSubtitle');
    const liveDateEl = document.getElementById('headerLiveDate');

    if (liveDateEl) {
      liveDateEl.textContent = formatOrdinalDate(new Date());
    }

    if (mainTitle) {
      if (viewName === 'dashboard') {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning' : (hour < 18 ? 'Good afternoon' : 'Good evening');
        mainTitle.textContent = `${greeting}, Alex`;
        if (mainSubtitle) {
          const critCount = getCriticalStockCount(MallState.products);
          mainSubtitle.style.display = 'block';
          mainSubtitle.textContent = `${critCount} critical items and 2 overdue rents need your attention.`;
        }
      } else {
        const titles = {
          inventory: 'Mall Inventory & Stock Management',
          reorder: 'Automated Reordering System',
          sales: 'Manage Sales & POS Analytics',
          staff: 'Staff & Shift Duty Roster',
          tenants: 'Mall Tenant Stores Directory',
          copilot: 'MallMatrix AI Copilot Assistant',
          export: 'Data Export Center'
        };
        mainTitle.textContent = titles[viewName] || 'MallMatrix Operations';
        if (mainSubtitle) {
          mainSubtitle.style.display = 'none';
        }
      }
    }

    // Close mobile sidebar if open
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    if (sidebar && sidebarBackdrop) {
      sidebar.classList.remove('open');
      sidebarBackdrop.classList.remove('active');
    }
  },

  // OVERLAY & FLOATING COPILOT SHARED STATE
  isOverlayOpen: false,

  setOverlayOpen(isOpen) {
    this.isOverlayOpen = Boolean(isOpen);
    this.updateOverlayState();
  },

  updateOverlayState() {
    // Check if any drawer or modal is currently visible/open in DOM
    const openOverlays = document.querySelectorAll(
      '#poDetailDrawer.open, #invRestockDrawer.open, #batchReorderModal.open, #poRejectModal.open, #newProductModal.open, .modal-backdrop.open, .inv-restock-drawer.open, .inv-drawer-backdrop.open'
    );
    const isOpen = Boolean(this.isOverlayOpen || openOverlays.length > 0);
    this.isOverlayOpen = isOpen;

    const floatingBtn = document.getElementById('floatingCopilotBtn');
    if (floatingBtn) {
      if (isOpen) {
        floatingBtn.classList.add('copilot-overlay-hidden');
      } else {
        floatingBtn.classList.remove('copilot-overlay-hidden');
      }
    }

    if (document.body) {
      document.body.classList.toggle('has-overlay-open', isOpen);
    }
  },

  // 2. INVENTORY FILTERS & CONTROLS
  bindInventoryFilters() {
    const searchInput = document.getElementById('inventorySearchInput');
    const catSelect = document.getElementById('invCategoryFilter');
    const lowStockToggle = document.getElementById('invLowStockToggle');
    const selectAllCheck = document.getElementById('invSelectAll');
    const rowsPerPageSelect = document.getElementById('invRowsPerPage');

    const runFilter = () => {
      this._invPage = 1;
      this.renderInventoryTable();
    };

    if (searchInput) searchInput.addEventListener('input', runFilter);
    if (catSelect) catSelect.addEventListener('change', runFilter);

    if (lowStockToggle) {
      lowStockToggle.addEventListener('change', (e) => {
        this._invLowStockOnly = e.target.checked;
        this._invPage = 1;
        this.renderInventoryTable();
      });
    }

    if (selectAllCheck) {
      selectAllCheck.addEventListener('change', (e) => {
        this.toggleSelectAll(e.target.checked);
      });
    }

    if (rowsPerPageSelect) {
      rowsPerPageSelect.addEventListener('change', (e) => {
        this._invRowsPerPage = parseInt(e.target.value, 10) || 10;
        this._invPage = 1;
        this.renderInventoryTable();
      });
    }

    // Sortable column headers
    document.querySelectorAll('.inv-th-sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-col');
        if (!col) return;
        if (this._invSort.col === col) {
          this._invSort.dir = this._invSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          this._invSort.col = col;
          this._invSort.dir = 'asc';
        }
        this.renderInventoryTable();
      });
    });

    // Drawer quantity live calculation
    const qtyInput = document.getElementById('invDrawerQty');
    if (qtyInput) {
      qtyInput.addEventListener('input', () => this.updateDrawerCostPreview());
    }

    // Global Escape key to dismiss all drawers and modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeRestockDrawer();
        this.closePODetailDrawer();
        this.closeBatchReorderModal();
        this.closeRejectModal();
        const prodModal = document.getElementById('newProductModal');
        if (prodModal && prodModal.classList.contains('open')) {
          prodModal.classList.remove('open');
        }
        this.setOverlayOpen(false);
      }
    });
  },

  // 3. MODALS
  bindModals() {
    const modal = document.getElementById('newProductModal');
    const closeBtn = document.getElementById('closeProductModalBtn');
    const cancelBtn = document.getElementById('cancelProductModalBtn');
    const form = document.getElementById('newProductForm');

    const closeModal = () => {
      if (modal) modal.classList.remove('open');
      this.setOverlayOpen(false);
    };
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('prodName').value.trim();
        const sku = document.getElementById('prodSKU').value.trim().toUpperCase();
        const tenant = document.getElementById('prodTenant').value;
        const category = document.getElementById('prodCategory').value;
        const stock = parseInt(document.getElementById('prodQty').value, 10);
        const minBuffer = parseInt(document.getElementById('prodMinBuffer').value, 10);
        const price = parseFloat(document.getElementById('prodPrice').value);

        const newProd = {
          id: `prod-${Date.now()}`,
          name,
          sku,
          tenant,
          unit: '#Store',
          category,
          stock,
          minBuffer,
          price
        };

        MallState.products.unshift(newProd);
        MallState.stockValuation += (stock * price);
        this.renderAll();
        closeModal();
        form.reset();
        this.showToast(`Order created for ${name} (${sku}) at ${tenant}!`, 'success');
      });
    }
  },

  openProductModal() {
    const modal = document.getElementById('newProductModal');
    if (modal) {
      modal.classList.add('open');
      this.setOverlayOpen(true);
    }
  },

  // 4. AI COPILOT
  bindCopilot() {
    const chatForm = document.getElementById('copilotChatForm');
    const chatInput = document.getElementById('copilotInput');

    if (chatForm && chatInput) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (text) {
          this.handleCopilotQuery(text);
          chatInput.value = '';
          chatInput.style.height = 'auto';
        }
      });

      // Submit on Enter (without Shift)
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          chatForm.dispatchEvent(new Event('submit'));
        }
      });

      // Dynamic auto-grow
      chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + 'px';
      });
    }
  },

  askCopilotDirect(query) {
    this.switchView('copilot');
    this.handleCopilotQuery(query);
  },

  resetCopilotChat() {
    const container = document.getElementById('copilotChatMessages');
    if (container) container.innerHTML = '';
    const footer = document.getElementById('copilotThreadFooter');
    if (footer) footer.style.display = 'none';
    const input = document.getElementById('copilotInput');
    if (input) {
      input.value = '';
      input.style.height = 'auto';
      input.focus();
    }
    this.showToast('Started a new Copilot topic.', 'info');
  },

  handleCopilotQuery(userText) {
    const container = document.getElementById('copilotChatMessages');
    if (!container) return;

    // Show thread reset footer
    const footer = document.getElementById('copilotThreadFooter');
    if (footer) footer.style.display = 'flex';

    // User message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg user-msg';
    userMsg.innerHTML = `
      <div class="msg-bubble">
        <div class="msg-text">${this.escapeHTML(userText)}</div>
      </div>
    `;
    container.appendChild(userMsg);
    container.scrollTop = container.scrollHeight;

    // Simulated intelligent answer
    setTimeout(() => {
      const lower = userText.toLowerCase();
      let answer = `I analyzed the mall telemetry mesh for "<em>${this.escapeHTML(userText)}</em>". All 18,450 SKUs across 48 tenant stores are actively monitored with zero dropped events.`;

      if (lower.includes('stock out') || (lower.includes('which stores') && lower.includes('stock'))) {
        answer = `<strong>Weekly Stock-out & Safety Buffer Risk Forecast:</strong><br>
        Based on live POS velocity and warehouse stock levels, <strong>3 stores</strong> require immediate replenishment:<br>
        • <strong>Zara Flagship (#204):</strong> Wool Overcoats (SKU-ZAR-882) at 4 units (buffer 25). Projected stock-out in <strong>1.5 days</strong>.<br>
        • <strong>Nike Experience (#112):</strong> Air Zoom Pegasus (SKU-NIK-401) at 6 units (buffer 30). Projected stock-out in <strong>2 days</strong>.<br>
        • <strong>Sephora Luxury (#108):</strong> Hydration Glow Serum (SKU-SEP-309) at 5 units (buffer 20). Projected stock-out in <strong>2.5 days</strong>.<br><br>
        Recommendation: Run the automated batch reorder to generate POs and prevent weekend sales loss.`;
      } else if (lower.includes('zara') && (lower.includes('turnover') || lower.includes('drop'))) {
        answer = `<strong>Zara Flagship Turnover & Velocity Analysis:</strong><br>
        • <strong>Turnover Velocity:</strong> 78% (down 4.2% week-on-week from 82.2%).<br>
        • <strong>Root Cause:</strong> Severe stock depletion in high-margin outerwear (only 4 units of SKU-ZAR-882 remaining), causing dropped basket conversions during peak shopping hours.<br>
        • <strong>Purchase Order Status:</strong> PO #8942 (${this.formatCurrency(14250.00)}) is currently <em>Pending</em> approval for Inditex supplier dispatch. Approving this PO will restore optimal safety buffer within 3 business days.`;
      } else if (lower.includes('overdue') || (lower.includes('po') && lower.includes('summarize')) || (lower.includes('purchase order') && lower.includes('summarize'))) {
        answer = `<strong>Today's Purchase Order Audit & Exceptions:</strong><br>
        • <strong>Pending POs (2):</strong> PO-8942 (Zara Flagship, ${this.formatCurrency(14250.00)}) and PO-8940 (Nike Experience, ${this.formatCurrency(16100.00)}) are awaiting approval.<br>
        • <strong>Delivered This Week (2):</strong> PO-8941 (${this.formatCurrency(18400.00)}) and PO-8939 (${this.formatCurrency(8950.00)}) cleared dock receiving with 100% SKU match.<br>
        • <strong>Overdue Status:</strong> Zero POs are currently past contractual SLA. Next vendor lead-time window is Nov 08, 2026.`;
      } else if (lower.includes('trend') || lower.includes('analyze') || lower.includes('quarterly')) {
        answer = `<strong>Quarterly Performance & Trend Insights (Q3-Q4 Telemetry):</strong><br>
        • <strong>Revenue Velocity:</strong> Gross mall transaction volume grew <strong>+18.4%</strong> QoQ (${this.formatCurrency(getTotalGrossSales(MallState.tenants))} today).<br>
        • <strong>Peak Conversion Hours:</strong> 14:00 – 18:00 on Saturdays generate 42% of weekend revenue.<br>
        • <strong>Turnover Velocity:</strong> Consumer Electronics leads at 4.2x velocity, followed closely by Fast Fashion at 3.8x.<br>
        • <strong>Strategic Recommendation:</strong> Reallocate 15% safety stock buffer toward winter apparel and high-density weekend footfall categories.`;
      } else if (lower.includes('proposal') || lower.includes('draft') || lower.includes('client')) {
        answer = `<strong>Retail Tenant Autonomous Inventory Proposal Draft:</strong><br>
        <strong>Document Title:</strong> MallMatrix Continuous Buffer Management Framework<br>
        <strong>Target Partner:</strong> New Retail Tenant Onboarding<br><br>
        • <strong>Executive Overview:</strong> Integrated POS telemetry eliminates store stockouts by up to 94% using real-time buffer safety thresholds.<br>
        • <strong>Service Level Agreement (SLA):</strong> Automated batch PO dispatch initiates within 120 seconds of threshold breach.<br>
        • <strong>Operational Tier:</strong> Mesh Autonomous Inflow (automated dock receiving, supplier webhook sync, and Copilot trend tracking).<br>
        • <strong>Immediate Action:</strong> Proposal packet draft ready for export to PDF / Tenant Management review.`;
      } else if (lower.includes('summarize') || lower.includes('document') || lower.includes('report')) {
        answer = `<strong>Executive Digest & Operations Document Summary:</strong><br>
        <strong>Source File:</strong> <code>MallMatrix-Operations-Audit-Nov2026.pdf</code><br><br>
        • <strong>Lease & Safety Compliance:</strong> 46 of 48 tenant retail stores maintain 100% adherence.<br>
        • <strong>Critical Replenishment:</strong> 4 SKUs require immediate supplier reordering (Zara Wool Overcoat, Apple 30W Adapter, Nike Pegasus 41, Sephora Serum).<br>
        • <strong>Financial Health:</strong> Today's Gross Mall Volume is <strong>${this.formatCurrency(getTotalGrossSales(MallState.tenants))}</strong> with 99.8% POS uptime.<br>
        • <strong>Receiving Dock Schedule:</strong> Next multi-vendor dock window opens tomorrow at 06:00 AM EST (Zones A & B).`;
      } else if (lower.includes('urgent') || lower.includes('low stock')) {
        answer = `<strong>Urgent Restock Advisory:</strong><br>
        • <strong>Zara Wool Overcoat</strong> (SKU-ZAR-882): 4 units remaining (Buffer: 25)<br>
        • <strong>Apple 30W Adapter</strong> (SKU-APP-102): 8 units remaining (Buffer: 50)<br>
        • <strong>Nike Pegasus 41</strong> (SKU-NIK-401): 6 units remaining (Buffer: 30)<br><br>
        Recommendation: Run automated batch reorder now to secure Friday delivery.`;
      } else if (lower.includes('zara')) {
        answer = `<strong>Zara Flagship (#204):</strong><br>
        Current sales velocity is 18 units/day. PO #8942 has been generated for 75 units (${this.formatCurrency(14250.00)} total) and is currently <em>Pending</em> for vendor dispatch.`;
      } else if (lower.includes('food') || lower.includes('dining')) {
        answer = `<strong>Food Court Demand Projection:</strong><br>
        Weekend mall footfall is expected to increase by +35%. Coffee beans and fresh perishables are scheduled for early Friday dock delivery. Compliance score is 96%.`;
      }

      const aiMsg = document.createElement('div');
      aiMsg.className = 'chat-msg ai-msg';
      aiMsg.innerHTML = `
        <div class="msg-avatar copilot-avatar">
          <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
            <path d="M34 65C23 65 15 57 15 45C15 32 23 21 37 21C48 21 57 28 62 36L74 24C65 14 52 9 37 9C17 9 3 24 3 45C3 64 16 78 34 78C46 78 57 71 64 62L52 51C47 60 41 65 34 65Z" fill="url(#copilotRibbonGrad1)"/>
            <path d="M66 35C77 35 85 43 85 55C85 68 77 79 63 79C52 79 43 72 38 64L26 76C35 86 48 91 63 91C83 91 97 76 97 55C97 36 84 22 66 22C54 22 43 29 36 38L48 49C53 40 59 35 66 35Z" fill="url(#copilotRibbonGrad2)"/>
          </svg>
        </div>
        <div class="msg-bubble">
          <div class="msg-author">MallMatrix AI</div>
          <div class="msg-text">${answer}</div>
        </div>
      `;
      container.appendChild(aiMsg);
      container.scrollTop = container.scrollHeight;
    }, 400);
  },

  // 5. REORDER & DRAWER ACTIONS
  reorderItem(sku) {
    this.openRestockDrawer(sku);
  },

  adjustRestockQty(delta) {
    const qtyInput = document.getElementById('invDrawerQty');
    if (!qtyInput) return;
    let curr = parseInt(qtyInput.value, 10) || 0;
    curr = Math.max(1, curr + delta);
    qtyInput.value = curr;
    this.updateDrawerCostPreview();
  },

  onDrawerVendorChange() {
    const vendorSelect = document.getElementById('invDrawerVendor');
    const leadDaysEl = document.getElementById('invDrawerLeadDays');
    if (!vendorSelect || !leadDaysEl) return;
    const selectedOpt = vendorSelect.options[vendorSelect.selectedIndex];
    const lead = selectedOpt ? selectedOpt.getAttribute('data-lead') : '3';
    leadDaysEl.textContent = `${lead} business days`;
  },

  trapDrawerFocus(drawer) {
    if (this._drawerKeydownHandler) {
      document.removeEventListener('keydown', this._drawerKeydownHandler);
      this._drawerKeydownHandler = null;
    }

    const focusableSelectors = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    this._drawerKeydownHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeRestockDrawer();
        return;
      }
      if (e.key === 'Tab') {
        const focusables = Array.from(drawer.querySelectorAll(focusableSelectors))
          .filter(el => el.offsetParent !== null);
        if (focusables.length === 0) return;

        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];

        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstEl || !drawer.contains(document.activeElement)) {
            e.preventDefault();
            lastEl.focus();
          }
        } else { // Tab
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', this._drawerKeydownHandler);
  },

  openRestockDrawer(sku) {
    const p = MallState.products.find(item => item.sku === sku);
    if (!p) return;

    this._lastFocusedElement = document.activeElement;
    this._activeRestockSku = sku;

    const drawer = document.getElementById('invRestockDrawer');
    const backdrop = document.getElementById('invDrawerBackdrop');
    if (!drawer || !backdrop) return;

    // Suggested reorder quantity formula: (min buffer x 3) - current stock
    const calculatedSuggested = (p.minBuffer * 3) - p.stock;
    const suggestedQty = Math.max(1, calculatedSuggested);

    const titleEl = document.getElementById('invDrawerTitle');
    const skuEl = document.getElementById('invDrawerSku');
    const prodNameEl = document.getElementById('invDrawerProdName');
    const skuBadgeEl = document.getElementById('invDrawerSkuBadge');
    const tenantEl = document.getElementById('invDrawerTenant');
    const currStockEl = document.getElementById('invDrawerCurrentStock');
    const minBufferEl = document.getElementById('invDrawerMinBuffer');
    const unitPriceEl = document.getElementById('invDrawerUnitPrice');
    const statusWrap = document.getElementById('invDrawerStatusPill');
    const qtyInput = document.getElementById('invDrawerQty');
    const formulaBadgeEl = document.getElementById('invDrawerFormulaBadge');
    const suggestedNoteEl = document.getElementById('invDrawerSuggestedNote');
    const vendorSelect = document.getElementById('invDrawerVendor');

    if (titleEl) titleEl.textContent = `Restock ${p.name}`;
    if (skuEl) skuEl.textContent = `${p.sku} • ${p.tenant} (${p.unit})`;
    if (prodNameEl) prodNameEl.textContent = p.name;
    if (skuBadgeEl) skuBadgeEl.textContent = p.sku;
    if (tenantEl) tenantEl.textContent = `${p.tenant} (${p.unit})`;
    if (currStockEl) currStockEl.textContent = p.stock;
    if (minBufferEl) minBufferEl.textContent = p.minBuffer;
    if (unitPriceEl) unitPriceEl.textContent = this.formatCurrency(p.price);

    if (formulaBadgeEl) {
      formulaBadgeEl.textContent = `Suggested: ${suggestedQty} units`;
    }
    if (suggestedNoteEl) {
      suggestedNoteEl.textContent = `Calculated: (${p.minBuffer} min buffer × 3) - ${p.stock} current stock = ${suggestedQty} units`;
    }

    const status = this.getProductStatus(p);
    if (statusWrap) {
      statusWrap.innerHTML = `
        <span class="inv-status-pill ${status.pillClass}">
          ${status.label} (${p.stock} / ${p.minBuffer})
        </span>
      `;
    }

    if (qtyInput) {
      qtyInput.value = suggestedQty;
    }

    // Pre-select matching vendor by tenant
    if (vendorSelect) {
      const tenantPrefix = p.tenant.split(' ')[0].toLowerCase();
      let matchedIndex = 0;
      for (let i = 0; i < vendorSelect.options.length; i++) {
        if (vendorSelect.options[i].value.toLowerCase().includes(tenantPrefix)) {
          matchedIndex = i;
          break;
        }
      }
      vendorSelect.selectedIndex = matchedIndex;
      this.onDrawerVendorChange();
    }

    this.updateDrawerCostPreview();

    backdrop.classList.add('open');
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    this.setOverlayOpen(true);

    this.trapDrawerFocus(drawer);

    setTimeout(() => {
      if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
      }
    }, 120);
  },

  closeRestockDrawer() {
    const drawer = document.getElementById('invRestockDrawer');
    const backdrop = document.getElementById('invDrawerBackdrop');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    }
    if (backdrop) {
      backdrop.classList.remove('open');
    }

    if (this._drawerKeydownHandler) {
      document.removeEventListener('keydown', this._drawerKeydownHandler);
      this._drawerKeydownHandler = null;
    }

    if (this._lastFocusedElement && typeof this._lastFocusedElement.focus === 'function') {
      this._lastFocusedElement.focus();
      this._lastFocusedElement = null;
    }

    this._activeRestockSku = null;
    this.setOverlayOpen(false);
  },

  updateDrawerCostPreview() {
    const p = MallState.products.find(item => item.sku === this._activeRestockSku);
    const qtyInput = document.getElementById('invDrawerQty');
    const costVal = document.getElementById('invDrawerCostVal');
    const formulaEl = document.getElementById('invDrawerCalcFormula');
    if (!p || !qtyInput || !costVal) return;

    let qty = parseInt(qtyInput.value, 10);
    if (isNaN(qty) || qty < 1) qty = 0;
    const total = Math.max(0, qty * p.price);

    costVal.textContent = this.formatCurrency(total);
    if (formulaEl) {
      formulaEl.textContent = `${qty} units × ${this.formatCurrency(p.price)}`;
    }
  },

  createPOFromDrawer() {
    if (!this._activeRestockSku) return;
    const p = MallState.products.find(item => item.sku === this._activeRestockSku);
    if (!p) return;

    const qtyInput = document.getElementById('invDrawerQty');
    const vendorSelect = document.getElementById('invDrawerVendor');
    const qty = parseInt(qtyInput ? qtyInput.value : 0, 10);

    if (isNaN(qty) || qty <= 0) {
      this.showToast('Please enter a valid reorder quantity (at least 1 unit).', 'info');
      return;
    }

    const vendor = vendorSelect ? vendorSelect.value : `${p.tenant} Logistics Hub`;
    const totalCost = qty * p.price;
    const nowStr = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 3);
    const expDateStr = expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Add new PO to Reordering page list with status "Pending" and rich details
    const newPO = {
      id: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
      supplier: vendor,
      vendorContact: `${vendor} Direct Dispatch (${vendor.toLowerCase().replace(/[^a-z]/g, '')}@mallmatrix-b2b.com)`,
      leadTime: '3 business days',
      items: `${qty}x ${p.name}`,
      tenant: `${p.tenant} (${p.unit})`,
      unit: p.unit,
      value: totalCost,
      status: 'Pending',
      reason: `Triggered: stock ${p.stock} < min buffer ${p.minBuffer}`,
      createdDate: nowStr,
      expectedDelivery: `${expDateStr} (3 days)`,
      timeline: {
        created: nowStr,
        approved: null,
        shipped: null,
        delivered: null
      },
      lineItems: [
        { name: p.name, sku: p.sku, qty: qty, price: p.price, subtotal: totalCost }
      ],
      rejectionReason: null
    };

    MallState.purchaseOrders.unshift(newPO);
    this.savePurchaseOrders();

    // Close the drawer
    this.closeRestockDrawer();

    // Re-render Reordering list and Inventory view
    this.renderPurchaseOrders();
    this.renderInventoryTable();

    // Show exact success toast requested: "PO created for <product>"
    this.showToast(`PO created for ${p.name}`, 'success');
  },

  confirmRestockFromDrawer() {
    this.createPOFromDrawer();
  },

  // BATCH REORDER CONFIRMATION MODAL & EXECUTION
  openBatchReorderModal() {
    const modal = document.getElementById('batchReorderModal');
    const body = document.getElementById('batchReorderModalBody');
    const confirmBtn = document.getElementById('btnConfirmBatchReorder');
    if (!modal || !body) return;

    // Scan for low stock products (stock <= minBuffer)
    const lowStockItems = MallState.products.filter(p => p.stock <= p.minBuffer);

    if (lowStockItems.length === 0) {
      body.innerHTML = `
        <div style="text-align: center; padding: 36px 16px;">
          <div style="width: 54px; height: 54px; border-radius: 50%; background: #D1FAE5; color: #059669; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px auto; font-size: 1.6rem;">✓</div>
          <h4 style="font-size: 1.05rem; font-weight: 800; color: #0F172A; margin: 0 0 6px 0;">All Inventory Levels Healthy</h4>
          <p style="font-size: 0.84rem; color: #64748B; max-width: 420px; margin: 0 auto;">No SKUs are currently below safety buffer thresholds. There are no pending purchase orders required at this time.</p>
        </div>
      `;
      if (confirmBtn) confirmBtn.disabled = true;
    } else {
      let totalEstCost = 0;
      let skuRowsHtml = '';

      lowStockItems.forEach(p => {
        const suggestedQty = Math.max(1, (p.minBuffer * 3) - p.stock);
        const subtotal = suggestedQty * p.price;
        totalEstCost += subtotal;

        skuRowsHtml += `
          <tr>
            <td>
              <div style="display: flex; flex-direction: column;">
                <strong style="color: #0F172A; font-weight: 700;">${this.escapeHTML(p.name)}</strong>
                <span style="font-family: monospace; font-size: 0.72rem; color: #64748B;">${this.escapeHTML(p.sku)}</span>
              </div>
            </td>
            <td>
              <span style="font-size: 0.78rem; font-weight: 600; color: #475569;">${this.escapeHTML(p.tenant)}</span>
            </td>
            <td>
              <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 6px; font-size: 0.74rem; font-weight: 800; background: ${p.stock < p.minBuffer * 0.5 ? '#FEE2E2' : '#FEF3C7'}; color: ${p.stock < p.minBuffer * 0.5 ? '#DC2626' : '#D97706'};">
                ${p.stock} / ${p.minBuffer}
              </span>
            </td>
            <td>
              <strong style="color: #334155;">+${suggestedQty} units</strong>
            </td>
            <td>
              <span style="color: #64748B;">${this.formatCurrency(p.price)}</span>
            </td>
            <td style="text-align: right;">
              <strong style="color: var(--solar-primary, #5429FF);">${this.formatCurrency(subtotal)}</strong>
            </td>
          </tr>
        `;
      });

      body.innerHTML = `
        <div class="batch-modal-summary-grid">
          <div class="batch-modal-kpi">
            <span class="batch-modal-kpi-label">POs to Generate</span>
            <div class="batch-modal-kpi-val" style="color: var(--solar-primary, #5429FF);">${lowStockItems.length} Orders</div>
          </div>
          <div class="batch-modal-kpi">
            <span class="batch-modal-kpi-label">Total Estimated Cost</span>
            <div class="batch-modal-kpi-val" style="color: #059669;">${this.formatCurrency(totalEstCost)}</div>
          </div>
          <div class="batch-modal-kpi">
            <span class="batch-modal-kpi-label">Buffer Policy</span>
            <div class="batch-modal-kpi-val" style="font-size: 0.95rem; color: #475569;">Target 3x Safety Stock</div>
          </div>
        </div>

        <div style="margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 0.78rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.04em;">Affected Low-Stock SKUs (${lowStockItems.length})</span>
          <span style="font-size: 0.72rem; color: #64748B;">Auto-calculated reorder volumes</span>
        </div>

        <div class="batch-modal-table-wrap">
          <table class="batch-sku-table">
            <thead>
              <tr>
                <th>Product / SKU</th>
                <th>Tenant Store</th>
                <th>Stock / Buffer</th>
                <th>Reorder Qty</th>
                <th>Unit Price</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${skuRowsHtml}
            </tbody>
          </table>
        </div>
      `;
      if (confirmBtn) confirmBtn.disabled = false;
    }

    modal.classList.add('open');
    this.setOverlayOpen(true);

    if (this._batchModalKeydownHandler) {
      document.removeEventListener('keydown', this._batchModalKeydownHandler);
    }
    this._batchModalKeydownHandler = (e) => {
      if (e.key === 'Escape') this.closeBatchReorderModal();
    };
    document.addEventListener('keydown', this._batchModalKeydownHandler);
  },

  closeBatchReorderModal() {
    const modal = document.getElementById('batchReorderModal');
    if (modal) modal.classList.remove('open');

    if (this._batchModalKeydownHandler) {
      document.removeEventListener('keydown', this._batchModalKeydownHandler);
      this._batchModalKeydownHandler = null;
    }
    this.setOverlayOpen(false);
  },

  confirmBatchReorder() {
    const lowStockItems = MallState.products.filter(p => p.stock <= p.minBuffer);
    if (lowStockItems.length === 0) {
      this.closeBatchReorderModal();
      return;
    }

    let createdCount = 0;
    let totalVal = 0;
    const nowStr = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 3);
    const expDateStr = expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    lowStockItems.forEach(p => {
      const suggestedQty = Math.max(1, (p.minBuffer * 3) - p.stock);
      const subtotal = suggestedQty * p.price;
      totalVal += subtotal;

      // Update in-memory stock
      p.stock += suggestedQty;

      // Create new PO with Pending status
      const newPO = {
        id: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
        supplier: `${p.tenant} Logistics Hub`,
        vendorContact: `${p.tenant} Wholesale Dispatch (dispatch@${p.tenant.toLowerCase().replace(/[^a-z]/g, '')}.com)`,
        leadTime: '3 business days',
        items: `${suggestedQty}x ${p.name}`,
        tenant: `${p.tenant} (${p.unit})`,
        unit: p.unit,
        value: subtotal,
        status: 'Pending',
        reason: `Triggered: stock ${p.stock - suggestedQty} < min buffer ${p.minBuffer}`,
        createdDate: nowStr,
        expectedDelivery: `${expDateStr} (3 days)`,
        timeline: {
          created: nowStr,
          approved: null,
          shipped: null,
          delivered: null
        },
        lineItems: [
          { name: p.name, sku: p.sku, qty: suggestedQty, price: p.price, subtotal: subtotal }
        ],
        rejectionReason: null
      };

      MallState.purchaseOrders.unshift(newPO);
      createdCount++;
    });

    this.saveProducts();
    this.savePurchaseOrders();
    this.renderAll();
    this.closeBatchReorderModal();

    this.showToast(`Batch Reorder confirmed! Created ${createdCount} Purchase Orders (${this.formatCurrency(totalVal)}).`, 'success');
  },

  generateBatchReorder() {
    this.openBatchReorderModal();
  },

  // 6. RENDER DATA
  renderAll() {
    this.renderMetrics();
    this.renderInventoryTable();
    this.renderPurchaseOrders();
    this.renderRevenueBarChart();
    this.renderSalesLeaderboard();
    this.renderStaffTable();
    this.renderTenantCards();
    this.renderAllExportButtons();
    this.renderExportCenter();
    this.updateCurrencyUI();
  },

  renderMetrics() {
    // 1. Live dynamic date
    const liveDateEl = document.getElementById('headerLiveDate');
    if (liveDateEl) {
      liveDateEl.textContent = formatOrdinalDate(new Date());
    }

    // 2. Dynamic greeting & status subtitle
    const mainTitle = document.getElementById('pageMainTitle');
    const mainSubtitle = document.getElementById('pageMainSubtitle');
    if (MallState.activeView === 'dashboard') {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : (hour < 18 ? 'Good afternoon' : 'Good evening');
      if (mainTitle) mainTitle.textContent = `${greeting}, Alex`;
      if (mainSubtitle) {
        const critCount = getCriticalStockCount(MallState.products);
        mainSubtitle.style.display = 'block';
        mainSubtitle.textContent = `${critCount} critical items and 2 overdue rents need your attention.`;
      }
    }

    // 3. Gross Revenue Today (equal to sum of all store sales!)
    const totalRev = getTotalGrossSales(MallState.tenants);
    const revEl = document.getElementById('kpiRevenueVal');
    if (revEl) {
      revEl.textContent = this.formatCurrency(totalRev);
    }

    // 4. Rent overdue
    const rentEl = document.getElementById('kpiRentOverdueVal');
    if (rentEl) {
      rentEl.textContent = this.formatCurrency(14500.00);
    }

    // 5. Stock-out card
    const critCount = getCriticalStockCount(MallState.products);
    const lowCount = getLowStockCount(MallState.products);
    const critEl = document.getElementById('kpiCriticalStockVal');
    const lowEl = document.getElementById('kpiLowBufferVal');
    if (critEl) critEl.textContent = `${critCount} Critical Items`;
    if (lowEl) lowEl.textContent = `${lowCount} Low Buffer`;

    // 6. Sales Agent Gross Volume
    const salesAgentGrossEl = document.getElementById('salesAgentGrossVal');
    if (salesAgentGrossEl) {
      salesAgentGrossEl.textContent = MallState.currency === 'INR' ? '₹1.49L' : '$148.9K';
    }

    // 7. Reorder page pending value sum
    const pendingOrders = MallState.purchaseOrders.filter(po => po.status === 'Pending');
    const pendingValSum = pendingOrders.reduce((sum, po) => {
      const num = typeof po.value === 'number' ? po.value : (parseFloat(String(po.value).replace(/[^0-9.-]+/g, '')) || 0);
      return sum + num;
    }, 0);
    const pendingValEl = document.getElementById('reorderPendingVal');
    if (pendingValEl) {
      pendingValEl.textContent = this.formatCurrency(pendingValSum);
    }
  },

  getProductStatus(p) {
    if (p.stock < (p.minBuffer * 0.5)) {
      return {
        label: 'Critical',
        level: 'critical',
        pillClass: 'inv-pill-critical',
        stockNumClass: 'stock-num-critical'
      };
    }
    if (p.stock <= p.minBuffer) {
      return {
        label: 'Low',
        level: 'low',
        pillClass: 'inv-pill-low',
        stockNumClass: 'stock-num-low'
      };
    }
    return {
      label: 'Healthy',
      level: 'healthy',
      pillClass: 'inv-pill-healthy',
      stockNumClass: 'stock-num-healthy'
    };
  },

  getCategoryIcon(category) {
    const cat = (category || '').toLowerCase();
    if (cat === 'fashion') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>`;
    }
    if (cat === 'electronics') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`;
    }
    if (cat === 'footwear') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 17l4-2 6 2 8-3v4H2v-1z"/><path d="M8 15V9l3 2 4-2v6"/><circle cx="5" cy="8" r="1.5"/></svg>`;
    }
    if (cat === 'cosmetics') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.4 7.2L21.6 12l-7.2 2.4L12 21.6l-2.4-7.2L2.4 12l7.2-2.4z"/><path d="M19 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/></svg>`;
    }
    if (cat === 'dining') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`;
    }
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`;
  },

  renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    const searchInput = document.getElementById('inventorySearchInput');
    const catSelect = document.getElementById('invCategoryFilter');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const category = catSelect ? catSelect.value : 'all';

    let items = [...MallState.products];

    // Search filter across SKU, Name, Tenant
    if (query) {
      items = items.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.tenant.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }

    // Department category filter
    if (category !== 'all') {
      items = items.filter(p => p.category === category);
    }

    // "Low stock only" toggle filter
    if (this._invLowStockOnly) {
      items = items.filter(p => p.stock <= p.minBuffer);
    }

    // Sortable columns (Product, Stock Qty, Min Buffer, Unit Price)
    if (this._invSort.col) {
      const { col, dir } = this._invSort;
      const mult = dir === 'asc' ? 1 : -1;
      items.sort((a, b) => {
        if (col === 'name') {
          return mult * a.name.localeCompare(b.name);
        }
        if (col === 'stock') {
          return mult * (a.stock - b.stock);
        }
        if (col === 'minBuffer') {
          return mult * (a.minBuffer - b.minBuffer);
        }
        if (col === 'price') {
          return mult * (a.price - b.price);
        }
        return 0;
      });
    }

    // Update sort arrow icons
    ['name', 'stock', 'minBuffer', 'price'].forEach(c => {
      const icon = document.getElementById(`sort-icon-${c}`);
      if (icon) {
        if (this._invSort.col === c) {
          icon.textContent = this._invSort.dir === 'asc' ? '↑' : '↓';
          icon.classList.add('active');
        } else {
          icon.textContent = '↕';
          icon.classList.remove('active');
        }
      }
    });

    // Store filtered and sorted inventory for data export
    this._currentFilteredInventory = items;
    this.renderInventoryExportButton();

    // Pagination calculations
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / this._invRowsPerPage));
    if (this._invPage > totalPages) {
      this._invPage = totalPages;
    }
    const startIndex = (this._invPage - 1) * this._invRowsPerPage;
    const endIndex = Math.min(startIndex + this._invRowsPerPage, totalItems);
    const paginatedItems = items.slice(startIndex, endIndex);

    if (paginatedItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 36px 16px; color: #94A3B8; font-weight: 500;">No products found matching filters.</td></tr>`;
      this.renderPagination(totalItems, 0, 0);
      this.updateBulkBar();
      this.updateSelectAllCheckbox([]);
      return;
    }

    tbody.innerHTML = paginatedItems.map(p => {
      const status = this.getProductStatus(p);
      const isSelected = this._invSelected.has(p.sku);
      const isLowOrCritical = p.stock <= p.minBuffer;
      const catClass = `inv-cat-${(p.category || '').toLowerCase()}`;

      return `
        <tr class="inv-table-row ${isSelected ? 'row-selected' : ''}">
          <td class="inv-td-check">
            <input type="checkbox" class="inv-checkbox inv-row-check" data-sku="${p.sku}" ${isSelected ? 'checked' : ''} aria-label="Select ${this.escapeHTML(p.name)}">
          </td>
          <td class="inv-prod-cell">
            <div class="inv-thumb-wrapper">
              <div class="inv-thumb ${catClass}">
                ${this.getCategoryIcon(p.category)}
              </div>
              <div class="inv-prod-meta">
                <div class="prod-title">${this.escapeHTML(p.name)}</div>
                <div class="prod-sub">${this.escapeHTML(p.tenant)} • ${this.escapeHTML(p.unit)}</div>
              </div>
            </div>
          </td>
          <td class="inv-sku-cell"><code>${p.sku}</code></td>
          <td>${this.escapeHTML(p.tenant)}</td>
          <td><span class="inv-cat-pill ${catClass}">${this.escapeHTML(p.category)}</span></td>
          <td class="inv-stock-td">
            <div class="inv-stock-cluster">
              <strong class="inv-stock-num ${status.stockNumClass}">${p.stock}</strong>
              <span class="inv-status-pill ${status.pillClass}">${status.label}</span>
            </div>
          </td>
          <td><span class="inv-buffer-val">${p.minBuffer}</span></td>
          <td><span class="inv-price-val">${this.formatCurrency(p.price)}</span></td>
          <td class="text-right">
            <button class="btn-table-action ${isLowOrCritical ? 'btn-action-restock' : ''}" onclick="MallApp.openRestockDrawer('${p.sku}')">
              ${isLowOrCritical ? 'Restock' : '+ Add Stock'}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row checkbox handlers
    tbody.querySelectorAll('.inv-row-check').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const sku = e.target.getAttribute('data-sku');
        this.toggleRowSelection(sku, e.target.checked);
      });
    });

    this.renderPagination(totalItems, startIndex, endIndex);
    this.updateBulkBar();
    this.updateSelectAllCheckbox(paginatedItems);
  },

  renderPagination(totalItems, start, end) {
    const pageInfo = document.getElementById('invPageInfo');
    const pageBtns = document.getElementById('invPageBtns');
    if (!pageInfo || !pageBtns) return;

    if (totalItems === 0) {
      pageInfo.textContent = 'Showing 0 items';
      pageBtns.innerHTML = '';
      return;
    }

    pageInfo.textContent = `Showing ${start + 1} to ${end} of ${totalItems} products`;

    const totalPages = Math.ceil(totalItems / this._invRowsPerPage);
    if (totalPages <= 1) {
      pageBtns.innerHTML = '';
      return;
    }

    let buttonsHtml = '';
    // Previous button
    buttonsHtml += `
      <button class="inv-page-btn" ${this._invPage === 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''} onclick="MallApp.goToPage(${this._invPage - 1})" aria-label="Previous page">
        ‹
      </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      buttonsHtml += `
        <button class="inv-page-btn ${i === this._invPage ? 'active' : ''}" onclick="MallApp.goToPage(${i})" aria-label="Page ${i}">
          ${i}
        </button>
      `;
    }

    // Next button
    buttonsHtml += `
      <button class="inv-page-btn" ${this._invPage === totalPages ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''} onclick="MallApp.goToPage(${this._invPage + 1})" aria-label="Next page">
        ›
      </button>
    `;

    pageBtns.innerHTML = buttonsHtml;
  },

  goToPage(pageNum) {
    const totalPages = Math.max(1, Math.ceil(MallState.products.length / this._invRowsPerPage));
    if (pageNum < 1 || pageNum > totalPages) return;
    this._invPage = pageNum;
    this.renderInventoryTable();
  },

  toggleRowSelection(sku, isChecked) {
    if (isChecked) {
      this._invSelected.add(sku);
    } else {
      this._invSelected.delete(sku);
    }
    this.updateBulkBar();
    this.updateSelectAllCheckbox();
  },

  toggleSelectAll(isChecked) {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;
    tbody.querySelectorAll('.inv-row-check').forEach(chk => {
      const sku = chk.getAttribute('data-sku');
      chk.checked = isChecked;
      if (isChecked) {
        this._invSelected.add(sku);
      } else {
        this._invSelected.delete(sku);
      }
    });
    this.updateBulkBar();
  },

  updateSelectAllCheckbox() {
    const selectAllCheck = document.getElementById('invSelectAll');
    if (!selectAllCheck) return;

    const visibleChecks = document.querySelectorAll('.inv-row-check');
    if (visibleChecks.length === 0) {
      selectAllCheck.checked = false;
      selectAllCheck.indeterminate = false;
      return;
    }

    let checkedCount = 0;
    visibleChecks.forEach(c => {
      if (c.checked) checkedCount++;
    });

    if (checkedCount === 0) {
      selectAllCheck.checked = false;
      selectAllCheck.indeterminate = false;
    } else if (checkedCount === visibleChecks.length) {
      selectAllCheck.checked = true;
      selectAllCheck.indeterminate = false;
    } else {
      selectAllCheck.checked = false;
      selectAllCheck.indeterminate = true;
    }
  },

  clearSelection() {
    this._invSelected.clear();
    const selectAllCheck = document.getElementById('invSelectAll');
    if (selectAllCheck) {
      selectAllCheck.checked = false;
      selectAllCheck.indeterminate = false;
    }
    document.querySelectorAll('.inv-row-check').forEach(c => c.checked = false);
    this.updateBulkBar();
  },

  updateBulkBar() {
    const bar = document.getElementById('invBulkBar');
    const badge = document.getElementById('invBulkBadge');
    const label = document.getElementById('invBulkLabel');
    const restockText = document.getElementById('invBulkRestockText');
    if (!bar) return;

    const count = this._invSelected.size;
    if (count > 0) {
      bar.style.display = 'flex';
      if (badge) badge.textContent = count;
      if (label) label.textContent = count === 1 ? 'row selected' : 'rows selected';
      if (restockText) restockText.textContent = `Restock selected (${count})`;
    } else {
      bar.style.display = 'none';
    }
  },

  bulkRestockSelected() {
    const count = this._invSelected.size;
    if (count === 0) return;

    let restockedCount = 0;
    MallState.products.forEach(p => {
      if (this._invSelected.has(p.sku)) {
        const addAmount = Math.max(20, p.minBuffer * 2);
        p.stock += addAmount;
        restockedCount++;
      }
    });

    this.clearSelection();
    this.renderAll();
    this.showToast(`Batch restock complete! Replenished stock for ${restockedCount} selected products.`, 'success');
  },

  getPOStatusBadge(status) {
    switch (status) {
      case 'Pending':
        return `<span class="po-badge po-badge-pending">⏳ Pending</span>`;
      case 'Approved':
        return `<span class="po-badge po-badge-approved">✓ Approved</span>`;
      case 'Shipped':
        return `<span class="po-badge po-badge-shipped">🚚 Shipped</span>`;
      case 'Delivered':
      case 'Order Delivered':
        return `<span class="po-badge po-badge-delivered">✓ Delivered</span>`;
      case 'Rejected':
        return `<span class="po-badge po-badge-rejected">✕ Rejected</span>`;
      default:
        return `<span class="po-badge po-badge-pending">⏳ ${this.escapeHTML(status)}</span>`;
    }
  },

  renderPurchaseOrders() {
    const tbody = document.getElementById('purchaseOrdersTableBody');
    if (!tbody) return;

    const searchInput = document.getElementById('reorderSearchInput');
    const statusFilter = document.getElementById('reorderStatusFilter');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const statusVal = statusFilter ? statusFilter.value : 'all';

    let orders = [...MallState.purchaseOrders];

    if (query) {
      orders = orders.filter(po =>
        (po.id && po.id.toLowerCase().includes(query)) ||
        (po.supplier && po.supplier.toLowerCase().includes(query)) ||
        (po.items && po.items.toLowerCase().includes(query)) ||
        (po.tenant && po.tenant.toLowerCase().includes(query)) ||
        (po.reason && po.reason.toLowerCase().includes(query)) ||
        (po.status && po.status.toLowerCase().includes(query))
      );
    }

    if (statusVal !== 'all') {
      if (statusVal === 'Pending') {
        orders = orders.filter(po => po.status === 'Pending');
      } else if (statusVal === 'Delivered') {
        orders = orders.filter(po => po.status === 'Delivered');
      } else {
        orders = orders.filter(po => po.status === statusVal);
      }
    }

    // Store filtered POs and render export button
    this._currentFilteredPOs = orders;
    this.renderReorderExportButton();

    // Update summary metrics
    const pendingOrders = MallState.purchaseOrders.filter(po => po.status === 'Pending');
    const deliveredOrders = MallState.purchaseOrders.filter(po => po.status === 'Delivered');

    let pendingValSum = 0;
    pendingOrders.forEach(po => {
      const num = typeof po.value === 'number' ? po.value : (parseFloat(String(po.value).replace(/[^0-9.-]+/g, '')) || 0);
      pendingValSum += num;
    });

    const pendingCountEl = document.getElementById('reorderPendingCount');
    const pendingValEl = document.getElementById('reorderPendingVal');
    const deliveredCountEl = document.getElementById('reorderDeliveredCount');
    const totalBadgeEl = document.getElementById('reorderTotalBadge');

    if (pendingCountEl) pendingCountEl.textContent = `${pendingOrders.length} Orders`;
    if (pendingValEl) pendingValEl.textContent = this.formatCurrency(pendingValSum);
    if (deliveredCountEl) deliveredCountEl.textContent = `${deliveredOrders.length} Completed`;
    if (totalBadgeEl) totalBadgeEl.textContent = `${MallState.purchaseOrders.length} Requisitions Tracked`;

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 36px 16px; color: #94A3B8; font-weight: 500;">No purchase orders match your filter criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(po => {
      const isPending = po.status === 'Pending';
      const isDelivered = po.status === 'Delivered';
      const isApproved = po.status === 'Approved';
      const isShipped = po.status === 'Shipped';
      const isRejected = po.status === 'Rejected';

      const statusBadge = this.getPOStatusBadge(po.status);
      const reasonText = po.reason || 'Triggered: stock below minimum safety buffer';

      let actionButtons = '';
      if (isPending) {
        actionButtons = `
          <div class="reorder-actions-wrap">
            <button type="button" class="btn-table-action btn-action-approve" onclick="event.stopPropagation(); MallApp.approvePO('${po.id}')" title="Approve this Purchase Order">
              Approve
            </button>
            <button type="button" class="btn-table-action btn-action-reject" onclick="event.stopPropagation(); MallApp.openRejectModal('${po.id}')" title="Reject with comments">
              Reject
            </button>
          </div>
        `;
      } else if (isApproved) {
        actionButtons = `
          <div class="reorder-actions-wrap">
            <button type="button" class="btn-table-action btn-action-ship" onclick="event.stopPropagation(); MallApp.shipPO('${po.id}')" title="Mark as dispatched / in transit">
              Ship
            </button>
          </div>
        `;
      } else if (isShipped) {
        actionButtons = `
          <div class="reorder-actions-wrap">
            <button type="button" class="btn-table-action btn-action-deliver" onclick="event.stopPropagation(); MallApp.deliverPO('${po.id}')" title="Confirm physical receipt and update inventory">
              Deliver
            </button>
          </div>
        `;
      } else {
        // Delivered or Rejected: keeps only Archive
        actionButtons = `
          <div class="reorder-actions-wrap">
            <button type="button" class="btn-table-action btn-action-archive" onclick="event.stopPropagation(); MallApp.archivePO('${po.id}')" title="Archive order record">
              Archive
            </button>
          </div>
        `;
      }

      return `
        <tr class="reorder-table-row" onclick="MallApp.openPODetailDrawer('${po.id}')" title="Click to view full PO details and fulfillment timeline">
          <td>
            <code class="reorder-po-code">${this.escapeHTML(po.id)}</code>
          </td>
          <td>
            <div class="reorder-vendor-cell">
              <strong>${this.escapeHTML(po.supplier)}</strong>
              <span class="reorder-sub-tenant">${this.escapeHTML(po.vendorContact ? po.vendorContact.split('(')[0].trim() : 'Approved B2B Vendor')}</span>
            </div>
          </td>
          <td>
            <div class="reorder-items-cell">
              <span class="reorder-items-text">${this.escapeHTML(po.items)}</span>
              <!-- 4. REASON LINE ON EACH PO -->
              <span class="reorder-reason-text">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>${this.escapeHTML(reasonText)}</span>
              </span>
            </div>
          </td>
          <td>
            <span class="reorder-tenant-badge">${this.escapeHTML(po.tenant)}</span>
          </td>
          <td>
            <strong class="reorder-value-text">${this.formatCurrency(po.value)}</strong>
          </td>
          <td>
            ${statusBadge}
          </td>
          <td class="text-right">
            ${actionButtons}
          </td>
        </tr>
      `;
    }).join('');
  },

  // PO ACTION HANDLERS WITH TOAST NOTIFICATIONS
  approvePO(poId) {
    const po = MallState.purchaseOrders.find(item => item.id === poId);
    if (!po) return;

    po.status = 'Approved';
    const nowStr = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (!po.timeline) po.timeline = { created: po.createdDate || nowStr };
    po.timeline.approved = nowStr;

    this.savePurchaseOrders();
    this.renderPurchaseOrders();

    // If detail drawer is showing this PO, re-render drawer
    if (this._activeDetailPoId === poId) {
      this.openPODetailDrawer(poId);
    }

    this.showToast(`Purchase Order ${po.id} approved successfully!`, 'success');
  },

  shipPO(poId) {
    const po = MallState.purchaseOrders.find(item => item.id === poId);
    if (!po) return;

    po.status = 'Shipped';
    const nowStr = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (!po.timeline) po.timeline = { created: po.createdDate || nowStr };
    po.timeline.shipped = nowStr;

    this.savePurchaseOrders();
    this.renderPurchaseOrders();

    if (this._activeDetailPoId === poId) {
      this.openPODetailDrawer(poId);
    }

    this.showToast(`Purchase Order ${po.id} marked as Shipped! In transit.`, 'info');
  },

  deliverPO(poId) {
    const po = MallState.purchaseOrders.find(item => item.id === poId);
    if (!po) return;

    po.status = 'Delivered';
    const nowStr = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (!po.timeline) po.timeline = { created: po.createdDate || nowStr };
    po.timeline.delivered = nowStr;

    this.savePurchaseOrders();
    this.renderPurchaseOrders();

    if (this._activeDetailPoId === poId) {
      this.openPODetailDrawer(poId);
    }

    this.showToast(`Purchase Order ${po.id} delivered! Stock updated.`, 'success');
  },

  archivePO(poId) {
    const idx = MallState.purchaseOrders.findIndex(item => item.id === poId);
    if (idx !== -1) {
      const po = MallState.purchaseOrders[idx];
      MallState.purchaseOrders.splice(idx, 1);
      this.savePurchaseOrders();
      this.renderPurchaseOrders();

      if (this._activeDetailPoId === poId) {
        this.closePODetailDrawer();
      }

      this.showToast(`Purchase Order ${po.id} archived.`, 'info');
    }
  },

  // 5. REJECT PO MODAL (REQUIRED COMMENT)
  openRejectModal(poId) {
    const po = MallState.purchaseOrders.find(item => item.id === poId);
    if (!po) return;

    this._activeRejectPoId = poId;

    const modal = document.getElementById('poRejectModal');
    const summary = document.getElementById('rejectModalSummary');
    const textarea = document.getElementById('rejectModalComment');
    const err = document.getElementById('rejectModalError');

    if (summary) {
      summary.innerHTML = `
        <div class="po-reject-summary-row">
          <span style="color: #64748B;">PO Identifier:</span>
          <strong style="font-family: monospace; color: #0F172A;">${this.escapeHTML(po.id)}</strong>
        </div>
        <div class="po-reject-summary-row">
          <span style="color: #64748B;">Vendor / Supplier:</span>
          <strong>${this.escapeHTML(po.supplier)}</strong>
        </div>
        <div class="po-reject-summary-row">
          <span style="color: #64748B;">Target Tenant:</span>
          <strong>${this.escapeHTML(po.tenant)}</strong>
        </div>
        <div class="po-reject-summary-row">
          <span style="color: #64748B;">Order Valuation:</span>
          <strong style="color: var(--solar-primary, #5429FF);">${this.formatCurrency(po.value)}</strong>
        </div>
      `;
    }

    if (textarea) {
      textarea.value = '';
      textarea.classList.remove('has-error');
    }
    if (err) err.style.display = 'none';

    if (modal) modal.classList.add('open');
    this.setOverlayOpen(true);

    if (this._rejectModalKeydownHandler) {
      document.removeEventListener('keydown', this._rejectModalKeydownHandler);
    }
    this._rejectModalKeydownHandler = (e) => {
      if (e.key === 'Escape') this.closeRejectModal();
    };
    document.addEventListener('keydown', this._rejectModalKeydownHandler);

    setTimeout(() => {
      if (textarea) textarea.focus();
    }, 100);
  },

  closeRejectModal() {
    const modal = document.getElementById('poRejectModal');
    if (modal) modal.classList.remove('open');

    if (this._rejectModalKeydownHandler) {
      document.removeEventListener('keydown', this._rejectModalKeydownHandler);
      this._rejectModalKeydownHandler = null;
    }
    this._activeRejectPoId = null;
    this.setOverlayOpen(false);
  },

  confirmRejectPO() {
    if (!this._activeRejectPoId) return;
    const po = MallState.purchaseOrders.find(item => item.id === this._activeRejectPoId);
    if (!po) return;

    const textarea = document.getElementById('rejectModalComment');
    const err = document.getElementById('rejectModalError');
    const comment = textarea ? textarea.value.trim() : '';

    if (!comment) {
      if (err) err.style.display = 'block';
      if (textarea) {
        textarea.classList.add('has-error');
        textarea.focus();
      }
      this.showToast('Please provide a mandatory reason for rejecting this PO.', 'warning');
      return;
    }

    const nowStr = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    po.status = 'Rejected';
    po.rejectionReason = comment;
    if (!po.timeline) po.timeline = { created: po.createdDate || nowStr };
    po.timeline.rejected = nowStr;

    this.savePurchaseOrders();
    this.renderPurchaseOrders();

    if (this._activeDetailPoId === po.id) {
      this.openPODetailDrawer(po.id);
    }

    this.closeRejectModal();
    this.showToast(`Purchase Order ${po.id} rejected. Reason: ${comment}`, 'warning');
  },

  // 3. PO DETAIL SLIDE-OVER DRAWER (TIMELINE, REASON, VENDOR, ITEMS, TOTAL)
  openPODetailDrawer(poId) {
    const po = MallState.purchaseOrders.find(item => item.id === poId);
    if (!po) return;

    this._activeDetailPoId = poId;
    this._currentPODetail = po;

    const drawer = document.getElementById('poDetailDrawer');
    const backdrop = document.getElementById('poDrawerBackdrop');
    const titleEl = document.getElementById('poDrawerTitle');
    const tenantEl = document.getElementById('poDrawerTenant');
    const statusBadgeEl = document.getElementById('poDrawerStatusBadge');
    const bodyEl = document.getElementById('poDrawerBody');
    const footerEl = document.getElementById('poDrawerFooter');

    if (!drawer || !backdrop || !bodyEl) return;

    if (titleEl) titleEl.textContent = po.id;
    if (tenantEl) tenantEl.textContent = `${po.tenant} • ${po.unit || 'Floor 1'}`;
    if (statusBadgeEl) statusBadgeEl.innerHTML = this.getPOStatusBadge(po.status);

    const isPending = po.status === 'Pending';
    const isApproved = po.status === 'Approved';
    const isShipped = po.status === 'Shipped';
    const isDelivered = po.status === 'Delivered';
    const isRejected = po.status === 'Rejected';

    const timeline = po.timeline || {
      created: po.createdDate || 'Mar 24, 2026, 09:30 AM',
      approved: isApproved || isShipped || isDelivered ? 'Mar 24, 2026, 11:30 AM' : null,
      shipped: isShipped || isDelivered ? 'Mar 25, 2026, 02:00 PM' : null,
      delivered: isDelivered ? 'Mar 26, 2026, 10:45 AM' : null,
      rejected: isRejected ? (po.timeline?.rejected || 'Mar 24, 2026, 12:15 PM') : null
    };

    // Build timeline HTML
    let timelineHtml = '';
    if (isRejected) {
      timelineHtml = `
        <div class="po-timeline-block">
          <h4 class="po-section-heading">Fulfillment Timeline</h4>
          <div class="po-stepper">
            <div class="po-step completed">
              <div class="po-step-marker">✓</div>
              <span class="po-step-label">Created</span>
              <span class="po-step-time">${timeline.created || 'Recorded'}</span>
            </div>
            <div class="po-step-line" style="background: #F87171;">
              <div class="po-step-line-fill" style="width: 100%; background: #EF4444;"></div>
            </div>
            <div class="po-step rejected-step">
              <div class="po-step-marker">✕</div>
              <span class="po-step-label" style="color: #DC2626;">Rejected</span>
              <span class="po-step-time" style="color: #DC2626;">${timeline.rejected || 'Rejected'}</span>
            </div>
          </div>
        </div>
      `;
    } else {
      const step1Done = true;
      const step2Done = isApproved || isShipped || isDelivered;
      const step3Done = isShipped || isDelivered;
      const step4Done = isDelivered;

      const step1Class = step2Done ? 'completed' : 'current';
      const step2Class = step3Done ? 'completed' : (step2Done ? 'current' : (isPending ? 'pending-step' : ''));
      const step3Class = step4Done ? 'completed' : (step3Done ? 'current' : '');
      const step4Class = step4Done ? 'completed' : '';

      let progressWidth = '0%';
      if (isDelivered) progressWidth = '100%';
      else if (isShipped) progressWidth = '66%';
      else if (isApproved) progressWidth = '33%';

      timelineHtml = `
        <div class="po-timeline-block">
          <h4 class="po-section-heading">Fulfillment Timeline</h4>
          <div class="po-stepper">
            <div class="po-step-line">
              <div class="po-step-line-fill" style="width: ${progressWidth};"></div>
            </div>
            <div class="po-step ${step1Class}">
              <div class="po-step-marker">${step1Done && step2Done ? '✓' : '1'}</div>
              <span class="po-step-label">Created</span>
              <span class="po-step-time">${timeline.created || 'Recorded'}</span>
            </div>
            <div class="po-step ${step2Class}">
              <div class="po-step-marker">${step2Done ? '✓' : '2'}</div>
              <span class="po-step-label">Approved</span>
              <span class="po-step-time">${timeline.approved || (isPending ? 'Awaiting Sign-off' : '—')}</span>
            </div>
            <div class="po-step ${step3Class}">
              <div class="po-step-marker">${step3Done ? '✓' : '3'}</div>
              <span class="po-step-label">Shipped</span>
              <span class="po-step-time">${timeline.shipped || (isApproved ? 'In Dispatch Queue' : '—')}</span>
            </div>
            <div class="po-step ${step4Class}">
              <div class="po-step-marker">${step4Done ? '✓' : '4'}</div>
              <span class="po-step-label">Delivered</span>
              <span class="po-step-time">${timeline.delivered || (isShipped ? `Est: ${po.expectedDelivery}` : '—')}</span>
            </div>
          </div>
        </div>
      `;
    }

    // Line items table HTML
    const lineItems = po.lineItems && po.lineItems.length > 0 ? po.lineItems : [
      { name: po.items, sku: 'SKU-REORDER', qty: 1, price: parseFloat((po.value || '$0').replace(/[^0-9.-]+/g, '')) || 0, subtotal: parseFloat((po.value || '$0').replace(/[^0-9.-]+/g, '')) || 0 }
    ];

    let lineRowsHtml = lineItems.map(item => `
      <tr>
        <td><strong style="font-weight: 700; color: #0F172A;">${this.escapeHTML(item.name)}</strong></td>
        <td><span style="font-family: monospace; font-size: 0.74rem; color: #475569; background: #F1F5F9; padding: 2px 7px; border-radius: 4px; white-space: nowrap;">${this.escapeHTML(item.sku || 'SKU-000')}</span></td>
        <td><strong>${item.qty}</strong></td>
        <td style="white-space: nowrap;">${this.formatCurrency(item.price)}</td>
        <td style="text-align: right; font-weight: 700; white-space: nowrap;">${this.formatCurrency(item.subtotal)}</td>
      </tr>
    `).join('');

    bodyEl.innerHTML = `
      <!-- REASON CALLOUT -->
      <div class="po-reason-callout">
        <div class="po-reason-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>Automated Replenishment Trigger</span>
        </div>
        <p class="po-reason-text">${this.escapeHTML(po.reason || 'Triggered: stock below safety buffer target')}</p>
      </div>

      ${isRejected ? `
        <!-- REJECTION AUDIT CALLOUT -->
        <div class="po-rejection-callout">
          <div class="po-rejection-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>PO Rejection Recorded (${timeline.rejected || 'Audit Log'})</span>
          </div>
          <p class="po-rejection-comment">${this.escapeHTML(po.rejectionReason || 'No comment recorded.')}</p>
        </div>
      ` : ''}

      <!-- TIMELINE -->
      ${timelineHtml}

      <!-- LOGISTICS & VENDOR METADATA -->
      <div class="po-meta-grid">
        <div class="po-meta-box">
          <span class="po-meta-box-label">Vendor / Supplier</span>
          <div class="po-meta-box-val">${this.escapeHTML(po.supplier)}</div>
          <span class="po-meta-box-sub">${this.escapeHTML(po.vendorContact || 'Tier 1 B2B Supplier')}</span>
        </div>
        <div class="po-meta-box">
          <span class="po-meta-box-label">Expected Delivery</span>
          <div class="po-meta-box-val" style="color: var(--solar-primary, #5429FF);">${this.escapeHTML(po.expectedDelivery || 'In 3 business days')}</div>
          <span class="po-meta-box-sub">SLA: ${this.escapeHTML(po.leadTime || '3 days lead time')}</span>
        </div>
      </div>

      <!-- LINE ITEMS TABLE -->
      <div class="po-line-items-block">
        <table class="po-line-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${lineRowsHtml}
            <tr class="po-line-total-row">
              <td colspan="4">Total Order Valuation</td>
              <td style="text-align: right;">${this.formatCurrency(po.value)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    // Footer actions
    if (footerEl) {
      const downloadBtnHtml = `
        <button type="button" class="po-btn-download-pdf" onclick="MallApp.downloadCurrentPOPDF('${po.id}')" title="Download Formatted Purchase Order (PDF)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Download PO (PDF)</span>
        </button>
      `;

      if (isPending) {
        footerEl.innerHTML = `
          <button type="button" class="inv-drawer-btn-cancel" onclick="MallApp.openRejectModal('${po.id}')" style="color: #DC2626; border-color: rgba(220, 38, 38, 0.35);">
            Reject PO
          </button>
          ${downloadBtnHtml}
          <button type="button" class="inv-drawer-btn-create" onclick="MallApp.approvePO('${po.id}')">
            Approve PO
          </button>
        `;
      } else if (isApproved) {
        footerEl.innerHTML = `
          <button type="button" class="inv-drawer-btn-cancel" onclick="MallApp.closePODetailDrawer()">
            Close
          </button>
          ${downloadBtnHtml}
          <button type="button" class="inv-drawer-btn-create" onclick="MallApp.shipPO('${po.id}')" style="background: #7E22CE;">
            Mark as Shipped
          </button>
        `;
      } else if (isShipped) {
        footerEl.innerHTML = `
          <button type="button" class="inv-drawer-btn-cancel" onclick="MallApp.closePODetailDrawer()">
            Close
          </button>
          ${downloadBtnHtml}
          <button type="button" class="inv-drawer-btn-create" onclick="MallApp.deliverPO('${po.id}')" style="background: #10B981;">
            Mark as Delivered
          </button>
        `;
      } else {
        // Delivered or Rejected (or default)
        footerEl.innerHTML = `
          <button type="button" class="inv-drawer-btn-cancel" onclick="MallApp.archivePO('${po.id}')">
            Archive PO
          </button>
          ${downloadBtnHtml}
          <button type="button" class="inv-drawer-btn-create" onclick="MallApp.closePODetailDrawer()">
            Close
          </button>
        `;
      }
    }

    drawer.classList.add('open');
    backdrop.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    this.setOverlayOpen(true);

    if (this._poDrawerKeydownHandler) {
      document.removeEventListener('keydown', this._poDrawerKeydownHandler);
    }
    this._poDrawerKeydownHandler = (e) => {
      if (e.key === 'Escape') this.closePODetailDrawer();
    };
    document.addEventListener('keydown', this._poDrawerKeydownHandler);
  },

  closePODetailDrawer() {
    const drawer = document.getElementById('poDetailDrawer');
    const backdrop = document.getElementById('poDrawerBackdrop');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    }
    if (backdrop) backdrop.classList.remove('open');

    if (this._poDrawerKeydownHandler) {
      document.removeEventListener('keydown', this._poDrawerKeydownHandler);
      this._poDrawerKeydownHandler = null;
    }
    this._activeDetailPoId = null;
    this.setOverlayOpen(false);
  },

  // SALES DATE RANGE, RECHARTS BAR CHART & ANALYTICS
  setSalesDateRange(range) {
    this._salesDateRange = range;

    const group = document.getElementById('salesDateRangeGroup');
    if (group) {
      group.querySelectorAll('.sales-date-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-range') === range);
      });
    }

    const customBox = document.getElementById('salesCustomDateBox');
    if (customBox) {
      customBox.style.display = range === 'custom' ? 'inline-flex' : 'none';
    }

    const rangeLabels = {
      today: { mult: 1.0, label: 'Today', header: "Today's Gross Sales" },
      '7d': { mult: 6.8, label: 'Last 7 Days', header: '7-Day Gross Sales' },
      '30d': { mult: 28.5, label: 'Last 30 Days', header: '30-Day Gross Sales' },
      custom: { mult: 14.0, label: 'Custom Range (Mar 01 - Mar 24)', header: 'Custom Period Sales' }
    };

    const config = rangeLabels[range] || rangeLabels.today;
    this._salesDateMultiplier = config.mult;

    const chartRangeLabel = document.getElementById('salesChartRangeLabel');
    if (chartRangeLabel) chartRangeLabel.textContent = config.label;

    const headerTitle = document.getElementById('salesHeaderPeriodTitle');
    if (headerTitle) headerTitle.textContent = config.header;

    this.renderRevenueBarChart();
    this.renderSalesLeaderboard();
  },

  applyCustomDateRange() {
    const start = document.getElementById('salesDateStart')?.value || '2026-03-01';
    const end = document.getElementById('salesDateEnd')?.value || '2026-03-24';
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffDays = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24))) + 1;

    this._salesDateMultiplier = Number((diffDays * 0.95).toFixed(1));
    const label = `${start.substring(5)} to ${end.substring(5)} (${diffDays} days)`;

    const chartRangeLabel = document.getElementById('salesChartRangeLabel');
    if (chartRangeLabel) chartRangeLabel.textContent = label;

    const headerTitle = document.getElementById('salesHeaderPeriodTitle');
    if (headerTitle) headerTitle.textContent = `Custom (${diffDays}d) Sales`;

    this.renderRevenueBarChart();
    this.renderSalesLeaderboard();
    this.showToast(`Updated analytics for custom range: ${diffDays} days`, 'info');
  },

  sortSalesTable(col) {
    if (this._salesSort.col === col) {
      this._salesSort.dir = this._salesSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      this._salesSort.col = col;
      this._salesSort.dir = (col === 'name' || col === 'unit') ? 'asc' : 'desc';
    }
    this.renderSalesLeaderboard();
  },

  generateSparklineSvg(points, isPositive) {
    if (!points || points.length === 0) return '';
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = (max - min) || 1;
    const w = 75;
    const h = 24;
    const pad = 3;

    const coords = points.map((p, i) => {
      const x = pad + (i / (points.length - 1)) * (w - 2 * pad);
      const y = (h - pad) - ((p - min) / range) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const polyline = coords.join(' ');
    const strokeColor = isPositive ? '#10B981' : '#EF4444';
    const fillColor = isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';

    const firstX = coords[0].split(',')[0];
    const lastX = coords[coords.length - 1].split(',')[0];
    const areaPath = `M ${coords[0]} L ${coords.join(' L ')} L ${lastX},${h} L ${firstX},${h} Z`;

    return `
      <svg width="${w}" height="${h}" class="sales-sparkline-svg" viewBox="0 0 ${w} ${h}">
        <path d="${areaPath}" fill="${fillColor}" />
        <polyline fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${polyline}" />
        <circle cx="${coords[coords.length - 1].split(',')[0]}" cy="${coords[coords.length - 1].split(',')[1]}" r="2.5" fill="${strokeColor}" />
      </svg>
    `;
  },

  renderRevenueBarChart() {
    const container = document.getElementById('salesBarChartContainer');
    if (!container) return;

    const mult = this._salesDateMultiplier || 1.0;
    const isINR = MallState.currency === 'INR';
    const currencySymbol = isINR ? '₹' : '$';
    const tenants = MallState.tenants.map(t => ({
      name: t.name,
      shortName: t.name.replace(' Store', '').replace(' Flagship', '').replace(' Experience', '').replace(' Luxury', '').replace(' Retail', '').replace(' Reserve', ''),
      amount: Math.round(t.salesAmount * mult),
      unit: t.unit
    }));

    const maxVal = Math.max(...tenants.map(t => t.amount), 1000);
    const roundedMax = Math.ceil(maxVal / 10000) * 10000;

    const width = 800;
    const height = 230;
    const paddingLeft = 65;
    const paddingRight = 30;
    const paddingTop = 25;
    const paddingBottom = 45;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    // Grid lines
    const gridSteps = 4;
    let gridLinesSvg = '';
    for (let i = 0; i <= gridSteps; i++) {
      const y = paddingTop + (chartH / gridSteps) * i;
      const val = Math.round(roundedMax - (roundedMax / gridSteps) * i);
      gridLinesSvg += `
        <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="#E2E8F0" stroke-dasharray="4 4" stroke-width="1" />
        <text x="${paddingLeft - 10}" y="${y + 4}" text-anchor="end" font-size="11" font-weight="600" fill="#94A3B8">${currencySymbol}${(val / 1000).toFixed(0)}k</text>
      `;
    }

    // Bars
    const barCount = tenants.length;
    const slotW = chartW / barCount;
    const barW = Math.min(54, slotW * 0.55);

    let barsSvg = '';
    tenants.forEach((t, i) => {
      const x = paddingLeft + slotW * i + (slotW - barW) / 2;
      const barH = (t.amount / roundedMax) * chartH;
      const y = paddingTop + chartH - barH;

      barsSvg += `
        <g class="recharts-bar-group" data-store="${this.escapeHTML(t.name)}" data-revenue="${this.formatCurrency(t.amount)}" data-unit="${this.escapeHTML(t.unit)}">
          <rect x="${paddingLeft + slotW * i}" y="${paddingTop}" width="${slotW}" height="${chartH}" fill="transparent" class="bar-slot-hover" />
          <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="5" ry="5" fill="url(#rechartsBarGrad)" class="recharts-bar-rect" />
          <text x="${x + barW / 2}" y="${height - 20}" text-anchor="middle" font-size="12" font-weight="700" fill="#334155">${this.escapeHTML(t.shortName)}</text>
          <text x="${x + barW / 2}" y="${height - 6}" text-anchor="middle" font-size="10" font-weight="600" fill="#94A3B8">${currencySymbol}${(t.amount / 1000).toFixed(1)}k</text>
        </g>
      `;
    });

    const totalRev = tenants.reduce((acc, cur) => acc + cur.amount, 0);
    const totalRevEl = document.getElementById('salesChartTotalRevenue');
    if (totalRevEl) {
      totalRevEl.textContent = this.formatCurrency(totalRev);
    }

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="sales-recharts-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="rechartsBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#8F57FF" />
            <stop offset="100%" stop-color="#5429FF" />
          </linearGradient>
        </defs>
        ${gridLinesSvg}
        <line x1="${paddingLeft}" y1="${paddingTop + chartH}" x2="${width - paddingRight}" y2="${paddingTop + chartH}" stroke="#CBD5E1" stroke-width="1.5" />
        ${barsSvg}
      </svg>
      <div class="recharts-tooltip-box" id="salesBarTooltip" style="display: none;"></div>
    `;

    // Tooltip interaction
    const tooltip = document.getElementById('salesBarTooltip');
    if (tooltip) {
      container.querySelectorAll('.recharts-bar-group').forEach(grp => {
        grp.addEventListener('mouseenter', () => {
          const store = grp.getAttribute('data-store');
          const revenue = grp.getAttribute('data-revenue');
          const unit = grp.getAttribute('data-unit');
          tooltip.innerHTML = `
            <div class="tooltip-store">${store}</div>
            <div class="tooltip-unit">${unit}</div>
            <div class="tooltip-rev"><span class="tooltip-dot"></span> <strong>${revenue}</strong></div>
          `;
          tooltip.style.display = 'block';
        });

        grp.addEventListener('mousemove', (e) => {
          const rect = container.getBoundingClientRect();
          const x = e.clientX - rect.left + 15;
          const y = e.clientY - rect.top - 40;
          tooltip.style.left = `${Math.min(x, rect.width - 150)}px`;
          tooltip.style.top = `${Math.max(10, y)}px`;
        });

        grp.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });
      });
    }
  },

  renderSalesLeaderboard() {
    const tbody = document.getElementById('salesLeaderboardBody');
    if (!tbody) return;

    const mult = this._salesDateMultiplier || 1.0;
    const sortCol = this._salesSort.col || 'salesAmount';
    const sortDir = this._salesSort.dir || 'desc';

    // Update sort arrow icons
    ['rank', 'name', 'unit', 'unitsSold', 'salesAmount', 'changePct', 'turnoverRate', 'posStatus'].forEach(c => {
      const icon = document.getElementById(`sales-sort-${c}`);
      if (icon) {
        if (sortCol === c) {
          icon.textContent = sortDir === 'asc' ? '↑' : '↓';
          icon.classList.add('active');
        } else {
          icon.textContent = '↕';
          icon.classList.remove('active');
        }
      }
    });

    let tenants = MallState.tenants.map((t, idx) => {
      const calculatedSales = Math.round(t.salesAmount * mult);
      const calculatedUnits = Math.round(t.unitsSold * mult);
      return {
        ...t,
        originalRank: idx + 1,
        calculatedSales,
        calculatedUnits
      };
    });

    // Sorting
    const sign = sortDir === 'asc' ? 1 : -1;
    tenants.sort((a, b) => {
      if (sortCol === 'rank') return sign * (a.originalRank - b.originalRank);
      if (sortCol === 'name') return sign * a.name.localeCompare(b.name);
      if (sortCol === 'unit') return sign * a.unit.localeCompare(b.unit);
      if (sortCol === 'unitsSold') return sign * (a.calculatedUnits - b.calculatedUnits);
      if (sortCol === 'salesAmount') return sign * (a.calculatedSales - b.calculatedSales);
      if (sortCol === 'changePct') return sign * (a.changePct - b.changePct);
      if (sortCol === 'turnoverRate') return sign * (a.turnoverRate - b.turnoverRate);
      if (sortCol === 'posStatus') return sign * a.posStatus.localeCompare(b.posStatus);
      return 0;
    });

    // Store sorted & calculated sales rows for export
    this._currentSalesRows = tenants;
    this.renderSalesExportButton();

    tbody.innerHTML = tenants.map((t, idx) => {
      const isOffline = t.posStatus === 'offline';
      const isPositiveChange = t.changePct >= 0;

      // Turnover rate color classes (green above 85%, amber 70-85%, red below 70%)
      let turnoverClass = 'turnover-green';
      if (t.turnoverRate < 70) {
        turnoverClass = 'turnover-red';
      } else if (t.turnoverRate <= 85) {
        turnoverClass = 'turnover-amber';
      }

      // POS status dot
      let dotClass = 'dot-online';
      let statusLabel = 'Online';
      if (t.posStatus === 'delayed') {
        dotClass = 'dot-delayed';
        statusLabel = 'Delayed';
      } else if (t.posStatus === 'offline') {
        dotClass = 'dot-offline';
        statusLabel = 'Offline';
      }

      return `
        <tr class="sales-row ${isOffline ? 'row-pos-offline' : ''}">
          <td>
            <span class="status-pill pill-delivered" style="font-weight: 800; min-width: 38px;">#0${idx + 1}</span>
          </td>
          <td>
            <div class="sales-store-meta">
              <strong class="sales-store-name">${this.escapeHTML(t.name)}</strong>
              <span class="sales-store-cat">${this.escapeHTML(t.category)}</span>
            </div>
          </td>
          <td>
            <span class="sales-unit-text">${this.escapeHTML(t.unit)}</span>
          </td>
          <td>
            <strong class="sales-units-val">${t.calculatedUnits.toLocaleString()} units</strong>
          </td>
          <td>
            <strong class="sales-gross-val">${this.formatCurrency(t.calculatedSales)}</strong>
          </td>
          <td>
            <div class="sales-trend-cluster">
              ${this.generateSparklineSvg(t.sparkline, isPositiveChange)}
              <span class="change-indicator ${isPositiveChange ? 'positive' : 'negative'}">
                ${isPositiveChange ? '▲ +' : '▼ '}${Math.abs(t.changePct)}%
              </span>
            </div>
          </td>
          <td>
            <div class="turnover-cell">
              <div class="turnover-header">
                <span class="turnover-val ${turnoverClass}">${t.turnoverRate}%</span>
                <span class="turnover-status-text ${turnoverClass}">
                  ${t.turnoverRate > 85 ? 'Optimal' : (t.turnoverRate >= 70 ? 'Moderate' : 'Low')}
                </span>
              </div>
              <div class="turnover-bar-track">
                <div class="turnover-bar-fill ${turnoverClass}" style="width: ${Math.min(100, t.turnoverRate)}%;"></div>
              </div>
            </div>
          </td>
          <td>
            <div class="pos-status-cell">
              <div class="pos-status-line">
                <span class="pos-status-dot ${dotClass}"></span>
                <span class="pos-status-name">${statusLabel}</span>
              </div>
              <span class="pos-sync-time">last sync ${t.lastSync}</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderStaffTable() {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;

    tbody.innerHTML = MallState.staff.map(s => `
      <tr>
        <td>
          <div class="prod-title">${this.escapeHTML(s.name)}</div>
          <div class="prod-sub">${s.id}</div>
        </td>
        <td>${this.escapeHTML(s.role)}</td>
        <td>${this.escapeHTML(s.zone)}</td>
        <td><span class="status-pill pill-delivered">${s.status}</span></td>
        <td>${this.escapeHTML(s.audits)}</td>
        <td><a href="mailto:${s.contact}" style="color: var(--green-main); text-decoration: none; font-weight: 600;">${s.contact}</a></td>
      </tr>
    `).join('');

    this.renderStaffExportButton();
  },

  renderTenantCards() {
    const grid = document.getElementById('tenantCardsGrid');
    if (!grid) return;

    grid.innerHTML = MallState.tenants.map(t => `
      <div class="tenant-clean-card">
        <div class="tenant-card-top">
          <div class="tenant-badge-pill">${t.name.substring(0, 2).toUpperCase()}</div>
          <span class="status-pill pill-delivered">${t.status}</span>
        </div>
        <div style="font-size: 1.05rem; font-weight: 700; color: #111827; margin-bottom: 2px;">${this.escapeHTML(t.name)}</div>
        <div style="font-size: 0.76rem; color: #94A3B8; margin-bottom: 12px;">${this.escapeHTML(t.unit)}</div>
        <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-light); padding-top: 10px;">
          <div>
            <div style="font-size: 0.72rem; color: #8A98A5;">Active Stock</div>
            <div style="font-weight: 700;">${t.skus}</div>
          </div>
          <div>
            <div style="font-size: 0.72rem; color: #8A98A5;">Sales Today</div>
            <div style="font-weight: 700; color: var(--green-main);">${t.salesToday}</div>
          </div>
        </div>
      </div>
    `).join('');

    this.renderTenantsExportButton();
  },

  // ========================================================
  // DATA EXPORT SYSTEM & EXPORT CENTER IMPLEMENTATION
  // ========================================================

  checkRoute() {
    const hash = (window.location.hash || '').toLowerCase().replace('#', '');
    const path = (window.location.pathname || '').toLowerCase();
    if (hash === 'export' || path.endsWith('/export')) {
      this.switchView('export');
    }
  },

  // 1. MODULE EXPORT CONFIGURATIONS
  getInventoryExportConfig() {
    return {
      moduleKey: 'inventory',
      moduleTitle: 'Inventory Catalog',
      getData: () => this._currentFilteredInventory || [...MallState.products],
      getAllData: () => [...MallState.products],
      columns: [
        { key: 'name', label: 'Product' },
        { key: 'sku', label: 'SKU' },
        { key: 'tenant', label: 'Tenant Store' },
        { key: 'category', label: 'Category' },
        { key: 'stock', label: 'Stock Qty', excelType: 'number' },
        { key: 'minBuffer', label: 'Min Buffer', excelType: 'number' },
        {
          key: 'price',
          label: 'Unit Price',
          excelType: 'number',
          format: val => this.formatCurrency(val)
        },
        {
          key: 'status',
          label: 'Status',
          format: (_, row) => {
            if (row.stock < row.minBuffer * 0.5) return 'Critical';
            if (row.stock <= row.minBuffer) return 'Low';
            return 'Healthy';
          }
        }
      ],
      getSummaryRow: null
    };
  },

  getReorderExportConfig() {
    return {
      moduleKey: 'reorder',
      moduleTitle: 'Purchase Orders',
      getData: () => this._currentFilteredPOs || [...MallState.purchaseOrders],
      getAllData: () => [...MallState.purchaseOrders],
      columns: [
        { key: 'id', label: 'PO ID' },
        { key: 'supplier', label: 'Vendor' },
        { key: 'items', label: 'Items' },
        { key: 'tenant', label: 'Target Tenant' },
        {
          key: 'value',
          label: 'Total',
          excelType: 'number',
          format: val => this.formatCurrency(val)
        },
        { key: 'status', label: 'Status' },
        { key: 'createdDate', label: 'Created Date' },
        { key: 'expectedDelivery', label: 'Expected Delivery' }
      ],
      getSummaryRow: (rows) => {
        let totalVal = 0;
        rows.forEach(r => {
          const num = parseFloat(String(r.value || '').replace(/[^0-9.-]+/g, '')) || 0;
          totalVal += num;
        });
        return {
          id: 'TOTALS',
          supplier: `${rows.length} Orders`,
          items: '',
          tenant: '',
          value: this.formatCurrency(totalVal),
          status: '',
          createdDate: '',
          expectedDelivery: ''
        };
      }
    };
  },

  getSalesExportConfig() {
    return {
      moduleKey: 'sales',
      moduleTitle: 'Sales & POS Analytics',
      getData: () => this.getCalculatedSalesRows(),
      getAllData: () => this.getCalculatedSalesRows(),
      columns: [
        { key: 'rank', label: 'Rank', format: (val, _, idx) => `#0${idx + 1}` },
        { key: 'name', label: 'Store' },
        { key: 'unit', label: 'Location' },
        {
          key: 'calculatedUnits',
          label: 'Units Sold',
          excelType: 'number',
          format: val => `${Number(val || 0).toLocaleString()} units`
        },
        {
          key: 'calculatedSales',
          label: 'Gross Sales',
          excelType: 'number',
          format: val => this.formatCurrency(val)
        },
        {
          key: 'turnoverRate',
          label: 'Turnover Rate',
          excelType: 'number',
          format: val => `${val}%`
        },
        {
          key: 'posStatus',
          label: 'POS Status',
          format: val => String(val || 'online').toUpperCase()
        }
      ],
      getSummaryRow: (rows) => {
        const sumUnits = rows.reduce((acc, r) => acc + (r.calculatedUnits || 0), 0);
        const sumSales = rows.reduce((acc, r) => acc + (r.calculatedSales || 0), 0);
        return {
          rank: 'TOTAL',
          name: `${rows.length} Stores`,
          unit: 'All Mall Wings',
          calculatedUnits: `${sumUnits.toLocaleString()} units`,
          calculatedSales: this.formatCurrency(sumSales),
          turnoverRate: '',
          posStatus: 'All Synced'
        };
      }
    };
  },

  getStaffExportConfig() {
    return {
      moduleKey: 'staff',
      moduleTitle: 'Staff Directory',
      getData: () => [...MallState.staff],
      getAllData: () => [...MallState.staff],
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'id', label: 'ID' },
        { key: 'role', label: 'Role' },
        { key: 'zone', label: 'Zone' },
        { key: 'status', label: 'Shift Status' },
        { key: 'audits', label: 'Active Audits' },
        { key: 'contact', label: 'Contact' }
      ],
      getSummaryRow: null
    };
  },

  getTenantsExportConfig() {
    return {
      moduleKey: 'tenants',
      moduleTitle: 'Tenant Stores',
      getData: () => [...MallState.tenants],
      getAllData: () => [...MallState.tenants],
      columns: [
        { key: 'name', label: 'Store' },
        { key: 'unit', label: 'Location' },
        { key: 'manager', label: 'Manager' },
        { key: 'contact', label: 'Contact' },
        {
          key: 'posStatus',
          label: 'POS Sync Status',
          format: val => String(val || 'online').toUpperCase()
        },
        { key: 'status', label: 'Lease status' }
      ],
      getSummaryRow: null
    };
  },

  getCalculatedSalesRows(multiplierOverride) {
    const mult = multiplierOverride !== undefined ? multiplierOverride : (this._salesDateMultiplier || 1.0);
    const sortCol = this._salesSort?.col || 'salesAmount';
    const sortDir = this._salesSort?.dir || 'desc';

    let tenants = MallState.tenants.map((t, idx) => {
      const calculatedSales = Math.round(t.salesAmount * mult);
      const calculatedUnits = Math.round(t.unitsSold * mult);
      return {
        ...t,
        originalRank: idx + 1,
        calculatedSales,
        calculatedUnits
      };
    });

    const sign = sortDir === 'asc' ? 1 : -1;
    tenants.sort((a, b) => {
      if (sortCol === 'rank') return sign * (a.originalRank - b.originalRank);
      if (sortCol === 'name') return sign * a.name.localeCompare(b.name);
      if (sortCol === 'unit') return sign * a.unit.localeCompare(b.unit);
      if (sortCol === 'unitsSold') return sign * (a.calculatedUnits - b.calculatedUnits);
      if (sortCol === 'salesAmount') return sign * (a.calculatedSales - b.calculatedSales);
      if (sortCol === 'changePct') return sign * (a.changePct - b.changePct);
      if (sortCol === 'turnoverRate') return sign * (a.turnoverRate - b.turnoverRate);
      if (sortCol === 'posStatus') return sign * a.posStatus.localeCompare(b.posStatus);
      return 0;
    });

    return tenants;
  },

  // 2. REUSABLE EXPORT BUTTON COMPONENT RENDERER
  renderExportDropdown(containerId, config) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const {
      moduleKey,
      moduleTitle,
      getData,
      getAllData,
      columns,
      getSummaryRow
    } = config;

    const data = getData ? getData() : [];
    const allData = getAllData ? getAllData() : data;
    const isFiltered = (allData.length > 0 && data.length !== allData.length);
    const isDisabled = data.length === 0 && allData.length === 0;

    let currentScope = isFiltered ? 'view' : 'all';

    container.innerHTML = `
      <div class="export-dropdown-wrap" id="exportWrap_${moduleKey}">
        <button type="button" 
          class="export-dropdown-btn" 
          id="exportBtn_${moduleKey}"
          aria-haspopup="menu"
          aria-expanded="false"
          aria-label="Export ${moduleTitle} data"
          ${isDisabled ? 'disabled title="No data to export"' : ''}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span class="export-btn-text">Export</span>
          <svg width="12" height="12" class="export-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        <div class="export-dropdown-menu" id="exportMenu_${moduleKey}" role="menu">
          ${isFiltered ? `
            <div class="export-menu-badge">
              <span>Exporting ${data.length} filtered rows</span>
              <span style="font-size:0.7rem; color:#64748B;">Total: ${allData.length}</span>
            </div>
            <div class="export-scope-toggle" id="exportScopeToggle_${moduleKey}">
              <button type="button" class="export-scope-btn active" data-scope="view">Current view (${data.length})</button>
              <button type="button" class="export-scope-btn" data-scope="all">All rows (${allData.length})</button>
            </div>
          ` : ''}

          <button type="button" class="export-menu-item" role="menuitem" data-format="csv">
            <span class="export-item-icon export-icon-csv">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </span>
            <span>Export as CSV</span>
          </button>

          <button type="button" class="export-menu-item" role="menuitem" data-format="xlsx">
            <span class="export-item-icon export-icon-xlsx">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </span>
            <span>Export as Excel (.xlsx)</span>
          </button>

          <button type="button" class="export-menu-item" role="menuitem" data-format="pdf">
            <span class="export-item-icon export-icon-pdf">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </span>
            <span>Export as PDF</span>
          </button>
        </div>
      </div>
    `;

    const wrap = document.getElementById(`exportWrap_${moduleKey}`);
    const btn = document.getElementById(`exportBtn_${moduleKey}`);
    const menu = document.getElementById(`exportMenu_${moduleKey}`);
    if (!wrap || !btn || !menu) return;

    const toggleMenu = (open) => {
      const isOpen = open !== undefined ? open : !wrap.classList.contains('open');
      wrap.classList.toggle('open', isOpen);
      btn.setAttribute('aria-expanded', String(isOpen));
    };

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.export-dropdown-wrap.open').forEach(w => {
        if (w !== wrap) w.classList.remove('open');
      });
      toggleMenu();
    });

    const scopeToggle = document.getElementById(`exportScopeToggle_${moduleKey}`);
    if (scopeToggle) {
      scopeToggle.querySelectorAll('.export-scope-btn').forEach(sBtn => {
        sBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          scopeToggle.querySelectorAll('.export-scope-btn').forEach(b => b.classList.remove('active'));
          sBtn.classList.add('active');
          currentScope = sBtn.getAttribute('data-scope');
        });
      });
    }

    menu.querySelectorAll('.export-menu-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        const format = item.getAttribute('data-format');
        toggleMenu(false);

        const rowsToExport = currentScope === 'all'
          ? (getAllData ? getAllData() : data)
          : (getData ? getData() : data);

        if (!rowsToExport || rowsToExport.length === 0) {
          this.showToast('No data rows to export', 'warning');
          return;
        }

        const summaryRow = getSummaryRow ? getSummaryRow(rowsToExport) : null;
        const textSpan = btn.querySelector('.export-btn-text');
        const origText = textSpan ? textSpan.textContent : 'Export';
        if (textSpan) textSpan.innerHTML = '<span class="export-spinner"></span> Generating...';
        btn.disabled = true;

        try {
          await new Promise(r => setTimeout(r, 60));
          const filename = getExportFilename(moduleKey, format);

          if (format === 'csv') {
            exportToCSV(rowsToExport, columns, filename, {
              moduleName: moduleKey,
              moduleTitle,
              summaryRow
            });
            this.showToast(`${moduleTitle} exported as CSV`, 'success');
          } else if (format === 'xlsx') {
            exportToExcel({
              name: moduleTitle.substring(0, 31),
              rows: rowsToExport,
              columns,
              summaryRow
            }, filename, {
              moduleName: moduleKey,
              moduleTitle
            });
            this.showToast(`${moduleTitle} exported as Excel`, 'success');
          } else if (format === 'pdf') {
            exportToPDF(`${moduleTitle} Report`, rowsToExport, columns, filename, {
              moduleName: moduleKey,
              moduleTitle,
              summaryRow
            });
            this.showToast(`${moduleTitle} exported as PDF`, 'success');
          }

          this.renderExportCenter();
        } catch (err) {
          console.error('Export error:', err);
          this.showToast(`Export failed: ${err.message || 'Unknown error'}`, 'error');
        } finally {
          if (textSpan) textSpan.textContent = origText;
          btn.disabled = false;
        }
      });
    });

    const outsideClickListener = (e) => {
      if (!wrap.contains(e.target)) {
        toggleMenu(false);
      }
    };
    document.addEventListener('click', outsideClickListener);

    const escapeListener = (e) => {
      if (e.key === 'Escape' && wrap.classList.contains('open')) {
        toggleMenu(false);
        btn.focus();
      }
    };
    document.addEventListener('keydown', escapeListener);
  },

  renderAllExportButtons() {
    this.renderInventoryExportButton();
    this.renderReorderExportButton();
    this.renderSalesExportButton();
    this.renderStaffExportButton();
    this.renderTenantsExportButton();
  },

  renderInventoryExportButton() {
    this.renderExportDropdown('exportBtnInventoryWrap', this.getInventoryExportConfig());
  },

  renderReorderExportButton() {
    this.renderExportDropdown('exportBtnReorderWrap', this.getReorderExportConfig());
  },

  renderSalesExportButton() {
    this.renderExportDropdown('exportBtnSalesWrap', this.getSalesExportConfig());
  },

  renderStaffExportButton() {
    this.renderExportDropdown('exportBtnStaffWrap', this.getStaffExportConfig());
  },

  renderTenantsExportButton() {
    this.renderExportDropdown('exportBtnTenantsWrap', this.getTenantsExportConfig());
  },

  // 3. SINGLE PO DOCUMENT EXPORT
  downloadCurrentPOPDF(poId) {
    const po = MallState.purchaseOrders.find(item => item.id === poId) || this._currentPODetail;
    if (!po) {
      this.showToast('Purchase Order not found', 'error');
      return;
    }
    try {
      exportSinglePOToPDF(po);
      this.showToast(`PO ${po.id} document exported as PDF`, 'success');
      this.renderExportCenter();
    } catch (err) {
      console.error('Single PO export failed:', err);
      this.showToast(`Export failed: ${err.message}`, 'error');
    }
  },

  // 4. EXPORT CENTER PAGE IMPLEMENTATION
  renderExportCenter() {
    const grid = document.getElementById('exportDatasetsGrid');
    const historyContainer = document.getElementById('exportHistoryContainer');
    const totalsSwitch = document.getElementById('exportIncludeTotalsSwitch');

    if (totalsSwitch) {
      totalsSwitch.checked = getExportTotalsSetting();
    }

    if (grid) {
      const mult = this._exportDateMultiplier || 1.0;
      const calculatedSalesCount = MallState.tenants.length;

      const datasets = [
        {
          key: 'inventory',
          title: 'Inventory Catalog',
          desc: 'Stock buffer limits, SKU thresholds, product pricing, and health metrics.',
          count: `${MallState.products.length} SKUs`,
          lastExport: getLastExported('inventory'),
          iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`
        },
        {
          key: 'reorder',
          title: 'Purchase Orders',
          desc: 'Safety stock replenishment queue, supplier SLAs, approval audit logs, and lead times.',
          count: `${MallState.purchaseOrders.length} Orders`,
          lastExport: getLastExported('reorder'),
          iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`
        },
        {
          key: 'sales',
          title: 'Sales & POS Analytics',
          desc: `Store revenue, units sold, turnover velocity, and terminal status (${this._exportDateRange || 'today'}).`,
          count: `${calculatedSalesCount} Stores`,
          lastExport: getLastExported('sales'),
          iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`
        },
        {
          key: 'staff',
          title: 'Staff Directory',
          desc: 'Duty rosters, assigned mall corridors, active audit allocations, and contact data.',
          count: `${MallState.staff.length} Officers`,
          lastExport: getLastExported('staff'),
          iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
        },
        {
          key: 'tenants',
          title: 'Tenant Stores Directory',
          desc: 'Retail tenants, assigned unit locations, managers, contact details, and POS link status.',
          count: `${MallState.tenants.length} Tenants`,
          lastExport: getLastExported('tenants'),
          iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
        }
      ];

      grid.innerHTML = datasets.map(d => `
        <div class="export-dataset-card">
          <div>
            <div class="export-card-head">
              <div class="export-card-icon-title">
                <div class="export-card-icon">${d.iconSvg}</div>
                <div>
                  <h4 class="export-card-title">${this.escapeHTML(d.title)}</h4>
                  <div class="export-card-meta">
                    <span>🕒 Last: ${this.escapeHTML(d.lastExport)}</span>
                  </div>
                </div>
              </div>
              <span class="export-card-count">${d.count}</span>
            </div>
            <p class="export-card-desc" style="margin-top: 10px;">${this.escapeHTML(d.desc)}</p>
          </div>

          <div class="export-card-format-group">
            <button type="button" class="export-btn-card-format format-csv" onclick="MallApp.exportDataset('${d.key}', 'csv')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              CSV
            </button>
            <button type="button" class="export-btn-card-format format-xlsx" onclick="MallApp.exportDataset('${d.key}', 'xlsx')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              Excel
            </button>
            <button type="button" class="export-btn-card-format format-pdf" onclick="MallApp.exportDataset('${d.key}', 'pdf')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
              PDF
            </button>
          </div>
        </div>
      `).join('');
    }

    if (historyContainer) {
      const history = getExportHistory();
      if (!history || history.length === 0) {
        historyContainer.innerHTML = `
          <div class="export-history-empty">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.8" style="margin: 0 auto 10px auto; display: block;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            No export downloads recorded in this session yet. Choose an export option above to generate files.
          </div>
        `;
      } else {
        const rowsHtml = history.map(h => {
          let badgeClass = 'badge-csv';
          const fmt = String(h.format || '').toLowerCase();
          if (fmt.includes('excel') || fmt.includes('xlsx')) badgeClass = 'badge-excel';
          else if (fmt.includes('pdf')) badgeClass = 'badge-pdf';

          return `
            <tr>
              <td>
                <div style="font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span>${this.escapeHTML(h.fileName)}</span>
                </div>
              </td>
              <td><span style="font-weight: 600; color: #475569;">${this.escapeHTML(h.module)}</span></td>
              <td><span class="export-format-badge ${badgeClass}">${this.escapeHTML(h.format)}</span></td>
              <td><strong style="color: #334155;">${h.recordCount} rows</strong></td>
              <td style="color: #64748B; font-size: 0.78rem;">${this.escapeHTML(h.timestamp)}</td>
            </tr>
          `;
        }).join('');

        historyContainer.innerHTML = `
          <div class="table-responsive">
            <table class="clean-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Dataset / Scope</th>
                  <th>Format</th>
                  <th>Record Count</th>
                  <th>Generated Timestamp</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        `;
      }
    }
  },

  setExportDateRange(range) {
    this._exportDateRange = range;
    const group = document.getElementById('exportCenterDateGroup');
    const customBox = document.getElementById('exportCenterCustomDates');

    if (group) {
      group.querySelectorAll('.export-date-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-range') === range);
      });
    }

    if (range === 'custom') {
      if (customBox) customBox.style.display = 'flex';
      return;
    } else {
      if (customBox) customBox.style.display = 'none';
    }

    if (range === 'today') this._exportDateMultiplier = 1.0;
    else if (range === '7d') this._exportDateMultiplier = 6.8;
    else if (range === '30d') this._exportDateMultiplier = 28.5;

    this.renderExportCenter();
    this.showToast(`Export scope set to ${range.toUpperCase()}`, 'info');
  },

  applyExportCustomDateRange() {
    const start = document.getElementById('exportDateStart')?.value || '2026-03-01';
    const end = document.getElementById('exportDateEnd')?.value || '2026-03-24';
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffDays = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24))) + 1;

    this._exportDateMultiplier = Number((diffDays * 0.95).toFixed(1));
    this.renderExportCenter();
    this.showToast(`Export range updated: ${diffDays} days`, 'info');
  },

  exportDataset(moduleKey, format) {
    let config = null;
    if (moduleKey === 'inventory') config = this.getInventoryExportConfig();
    else if (moduleKey === 'reorder') config = this.getReorderExportConfig();
    else if (moduleKey === 'sales') {
      config = this.getSalesExportConfig();
      config.getData = () => this.getCalculatedSalesRows(this._exportDateMultiplier);
    } else if (moduleKey === 'staff') config = this.getStaffExportConfig();
    else if (moduleKey === 'tenants') config = this.getTenantsExportConfig();

    if (!config) return;

    try {
      const rows = config.getData();
      const filename = getExportFilename(moduleKey, format);
      const summaryRow = config.getSummaryRow ? config.getSummaryRow(rows) : null;

      if (format === 'csv') {
        exportToCSV(rows, config.columns, filename, {
          moduleName: moduleKey,
          moduleTitle: config.moduleTitle,
          summaryRow
        });
        this.showToast(`${config.moduleTitle} exported as CSV`, 'success');
      } else if (format === 'xlsx') {
        exportToExcel({
          name: config.moduleTitle.substring(0, 31),
          rows,
          columns: config.columns,
          summaryRow
        }, filename, {
          moduleName: moduleKey,
          moduleTitle: config.moduleTitle
        });
        this.showToast(`${config.moduleTitle} exported as Excel`, 'success');
      } else if (format === 'pdf') {
        exportToPDF(`${config.moduleTitle} Report`, rows, config.columns, filename, {
          moduleName: moduleKey,
          moduleTitle: config.moduleTitle,
          summaryRow
        });
        this.showToast(`${config.moduleTitle} exported as PDF`, 'success');
      }

      this.renderExportCenter();
    } catch (err) {
      console.error('Export dataset failed:', err);
      this.showToast(`Export failed: ${err.message}`, 'error');
    }
  },

  exportEverythingExcel() {
    try {
      const filename = getExportFilename('all-modules', 'xlsx');
      const salesRows = this.getCalculatedSalesRows(this._exportDateMultiplier);
      const poRows = [...MallState.purchaseOrders];
      const invRows = [...MallState.products];
      const staffRows = [...MallState.staff];
      const tenantRows = [...MallState.tenants];

      const sheets = [
        {
          name: 'Inventory Catalog',
          rows: invRows,
          columns: this.getInventoryExportConfig().columns
        },
        {
          name: 'Purchase Orders',
          rows: poRows,
          columns: this.getReorderExportConfig().columns,
          summaryRow: this.getReorderExportConfig().getSummaryRow(poRows)
        },
        {
          name: 'Store Sales POS',
          rows: salesRows,
          columns: this.getSalesExportConfig().columns,
          summaryRow: this.getSalesExportConfig().getSummaryRow(salesRows)
        },
        {
          name: 'Staff Directory',
          rows: staffRows,
          columns: this.getStaffExportConfig().columns
        },
        {
          name: 'Tenant Stores Directory',
          rows: tenantRows,
          columns: this.getTenantsExportConfig().columns
        }
      ];

      exportToExcel(sheets, filename, {
        moduleName: 'all-modules',
        moduleTitle: 'Complete Mall Operations'
      });

      this.showToast('All 5 MallMatrix modules exported as multi-sheet Excel workbook!', 'success');
      this.renderExportCenter();
    } catch (err) {
      console.error('Export everything failed:', err);
      this.showToast(`Export failed: ${err.message}`, 'error');
    }
  },

  exportFullReportPDF() {
    try {
      const salesRows = this.getCalculatedSalesRows(this._exportDateMultiplier);
      const totalRev = salesRows.reduce((acc, cur) => acc + (cur.calculatedSales || cur.salesAmount), 0);
      const lowStockCount = MallState.products.filter(p => p.stock <= p.minBuffer).length;
      const pendingPOCount = MallState.purchaseOrders.filter(p => p.status === 'Pending').length;
      const staffOnDuty = MallState.staff.filter(s => s.status === 'On Duty').length;

      const mallData = {
        totalRevenue: totalRev,
        lowStockCount,
        pendingPOCount,
        staffOnDuty,
        tenants: salesRows,
        products: MallState.products,
        purchaseOrders: MallState.purchaseOrders,
        staff: MallState.staff
      };

      exportFullReportToPDF(mallData);
      this.showToast('Full Mall Operations Report exported as PDF!', 'success');
      this.renderExportCenter();
    } catch (err) {
      console.error('Full report export failed:', err);
      this.showToast(`Export failed: ${err.message}`, 'error');
    }
  },

  handleClearExportHistory() {
    clearExportHistory();
    this.renderExportCenter();
    this.showToast('Export history cleared', 'info');
  },

  // 5. SETTINGS MODAL & TOTALS CONFIGURATION
  openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const switchInModal = document.getElementById('settingsModalTotalsSwitch');
    if (switchInModal) {
      switchInModal.checked = getExportTotalsSetting();
    }
    this.updateCurrencyUI();
    if (modal) {
      modal.classList.add('open');
      modal.style.display = 'flex';
      this.setOverlayOpen(true);
    }
  },

  closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
      this.setOverlayOpen(false);
    }
  },

  setCurrency(curr) {
    if (curr !== 'USD' && curr !== 'INR') return;
    MallState.currency = curr;
    try {
      localStorage.setItem('mallmatrix_currency', curr);
    } catch (e) {
      console.warn('Currency storage failed', e);
    }
    this.updateCurrencyUI();
    this.renderAll();
    this.showToast(`Display currency changed to ${curr === 'INR' ? 'INR (₹)' : 'USD ($)'}`, 'success');
  },

  updateCurrencyUI() {
    const isINR = MallState.currency === 'INR';
    const btnUSD = document.getElementById('currencyBtnUSD');
    const btnINR = document.getElementById('currencyBtnINR');
    const checkUSD = document.getElementById('currencyCheckUSD');
    const checkINR = document.getElementById('currencyCheckINR');

    if (btnUSD && btnINR) {
      btnUSD.style.borderColor = isINR ? '#CBD5E1' : '#5429FF';
      btnUSD.style.background = isINR ? '#FFFFFF' : '#F5F3FF';
      btnUSD.style.color = isINR ? '#475569' : '#5429FF';

      btnINR.style.borderColor = isINR ? '#5429FF' : '#CBD5E1';
      btnINR.style.background = isINR ? '#F5F3FF' : '#FFFFFF';
      btnINR.style.color = isINR ? '#5429FF' : '#475569';
    }
    if (checkUSD) checkUSD.style.display = isINR ? 'none' : 'inline';
    if (checkINR) checkINR.style.display = isINR ? 'inline' : 'none';

    const legendText = document.getElementById('salesChartLegendText');
    if (legendText) {
      legendText.textContent = `Gross Sales (${isINR ? '₹' : '$'})`;
    }
  },

  formatCurrency(amount) {
    return formatCurrency(amount, MallState.currency);
  },

  toggleTotalsSetting(checked) {
    setExportTotalsSetting(checked);
    const sw1 = document.getElementById('exportIncludeTotalsSwitch');
    const sw2 = document.getElementById('settingsModalTotalsSwitch');
    if (sw1) sw1.checked = checked;
    if (sw2) sw2.checked = checked;
    this.showToast(`Summary totals row ${checked ? 'enabled' : 'disabled'} for exports`, 'info');
  },

  showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    let icon = 'ℹ';
    if (type === 'success') icon = '✓';
    else if (type === 'warning') icon = '⚠️';
    else if (type === 'danger' || type === 'error') icon = '✕';

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${this.escapeHTML(msg)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  },

  escapeHTML(str) {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  MallApp.init();
});
