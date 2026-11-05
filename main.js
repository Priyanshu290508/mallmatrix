/**
 * MALLMATRIX — Stock & Inventory Management Platform
 * Production Core Logic & Reactive State Management
 */

const MallState = {
  activeView: 'dashboard',
  totalSKUs: 18450,
  salesAmount: 2500.00,
  taxesAmount: 470.00,
  netIncome: 57000,
  stockValuation: 586.14,

  // Real-time Inventory Catalog across Mall Tenants
  products: [
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
  ],

  // Reorder Purchase Orders
  purchaseOrders: [
    {
      id: 'PO-8942',
      supplier: 'Inditex Global Logistics',
      items: '75x Wool Overcoats, 120x Knitwear',
      tenant: 'Zara Flagship (#204)',
      value: '$14,250',
      status: 'On Pending'
    },
    {
      id: 'PO-8941',
      supplier: 'Apple Retail Operations Corp',
      items: '120x USB-C Chargers, 40x AirPods Pro',
      tenant: 'Apple Store (#101)',
      value: '$18,400',
      status: 'Order Delivered'
    },
    {
      id: 'PO-8940',
      supplier: 'Nike Direct Supply EMEA',
      items: '80x Pegasus 41, 60x Metcon 9',
      tenant: 'Nike Experience (#112)',
      value: '$16,100',
      status: 'On Pending'
    },
    {
      id: 'PO-8939',
      supplier: 'LVMH Beauty Distribution',
      items: '100x Glow Serums, 45x Luxury Scents',
      tenant: 'Sephora Luxury (#108)',
      value: '$8,950',
      status: 'Order Delivered'
    }
  ],

  // Tenants Information & POS Real-time Telemetry
  tenants: [
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
  ],

  // Staff Directory
  staff: [
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
  ]
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

  init() {
    this.loadStateFromStorage();
    this.bindNavigation();
    this.bindModals();
    this.bindInventoryFilters();
    this.bindCopilot();
    this.renderAll();

    // Ensure Copilot button is visible on initial dashboard load
    const copilotBtn = document.getElementById('floatingCopilotBtn');
    if (copilotBtn) {
      copilotBtn.style.display = 'flex';
    }
  },

  loadStateFromStorage() {
    try {
      const savedPOs = localStorage.getItem('mallmatrix_purchase_orders');
      if (savedPOs) {
        MallState.purchaseOrders = JSON.parse(savedPOs);
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
    }

    // Keep bottom-right Copilot button visible on all views except the copilot view itself
    const copilotBtn = document.getElementById('floatingCopilotBtn');
    if (copilotBtn) {
      copilotBtn.style.display = viewName === 'copilot' ? 'none' : 'flex';
    }

    // Update main header title
    const mainTitle = document.getElementById('pageMainTitle');
    if (mainTitle) {
      const titles = {
        dashboard: 'Welcome To Stock Management',
        inventory: 'Mall Inventory & Stock Management',
        reorder: 'Automated Reordering System',
        sales: 'Manage Sales & POS Analytics',
        staff: 'Staff & Shift Duty Roster',
        tenants: 'Mall Tenant Stores Directory',
        copilot: 'MallMatrix AI Copilot Assistant'
      };
      mainTitle.textContent = titles[viewName] || 'Welcome To Stock Management';
    }

    // Close mobile sidebar if open
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    if (sidebar && sidebarBackdrop) {
      sidebar.classList.remove('open');
      sidebarBackdrop.classList.remove('active');
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

    // Global Escape key to dismiss drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeRestockDrawer();
      }
    });
  },

  // 3. MODALS
  bindModals() {
    const modal = document.getElementById('newProductModal');
    const closeBtn = document.getElementById('closeProductModalBtn');
    const cancelBtn = document.getElementById('cancelProductModalBtn');
    const form = document.getElementById('newProductForm');

    const closeModal = () => modal.classList.remove('open');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

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
    if (modal) modal.classList.add('open');
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

      if (lower.includes('trend') || lower.includes('analyze') || lower.includes('quarterly')) {
        answer = `<strong>Quarterly Performance & Trend Insights (Q3-Q4 Telemetry):</strong><br>
        • <strong>Revenue Velocity:</strong> Gross mall transaction volume grew <strong>+18.4%</strong> QoQ ($148,250.00 today).<br>
        • <strong>Peak Conversion Hours:</strong> 14:00 – 18:00 on Saturdays generate 42% of weekend revenue ($62,265 avg).<br>
        • <strong>Turnover Velocity:</strong> Consumer Electronics leads at 4.2x velocity, followed closely by Fast Fashion at 3.8x.<br>
        • <strong>Strategic Recommendation:</strong> Reallocate 15% safety stock buffer toward winter apparel and high-density weekend footfall categories to capture an estimated +$32,000 in uncaptured demand.`;
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
        <strong>Source File:</strong> <code>MallMatrix-Operations-Audit-Oct2026.pdf</code> (42 pages)<br><br>
        • <strong>Lease & Safety Compliance:</strong> 46 of 48 tenant retail stores maintain 100% adherence.<br>
        • <strong>Critical Replenishment:</strong> 4 SKUs require immediate supplier reordering (Zara Wool Overcoat, Apple 30W Adapter, Nike Pegasus 41, H&M Denim Jacket).<br>
        • <strong>Financial Health:</strong> Today's Gross Mall Volume is <strong>$148,250.00</strong> with 99.8% POS uptime.<br>
        • <strong>Receiving Dock Schedule:</strong> Next multi-vendor dock window opens tomorrow at 06:00 AM EST (Zones A & B).`;
      } else if (lower.includes('urgent') || lower.includes('low stock')) {
        answer = `<strong>Urgent Restock Advisory:</strong><br>
        • <strong>Zara Wool Overcoat</strong> (SKU-ZAR-882): 4 units remaining (Buffer: 25)<br>
        • <strong>Apple 30W Adapter</strong> (SKU-APP-102): 8 units remaining (Buffer: 50)<br>
        • <strong>Nike Pegasus 41</strong> (SKU-NIK-401): 6 units remaining (Buffer: 30)<br><br>
        Recommendation: Run automated batch reorder now to secure Friday delivery.`;
      } else if (lower.includes('zara')) {
        answer = `<strong>Zara Flagship (#204):</strong><br>
        Current sales velocity is 18 units/day. PO #8942 has been generated for 75 units ($14,250 total) and is currently <em>On Pending</em> for vendor dispatch.`;
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
          <div class="msg-author">M365 Copilot</div>
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
    if (unitPriceEl) unitPriceEl.textContent = `$${p.price.toFixed(2)}`;

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
          ${status.label} (${p.stock} / ${p.minBuffer} min)
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

    costVal.textContent = `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (formulaEl) {
      formulaEl.textContent = `${qty} units × $${p.price.toFixed(2)}`;
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

    // Add new PO to Reordering page list with status "Pending"
    const newPO = {
      id: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
      supplier: vendor,
      items: `${qty}x ${p.name}`,
      tenant: `${p.tenant} (${p.unit})`,
      value: `$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      status: 'Pending'
    };

    MallState.purchaseOrders.unshift(newPO);

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

  generateBatchReorder() {
    let count = 0;
    MallState.products.forEach(p => {
      if (p.stock <= p.minBuffer) {
        p.stock += (p.minBuffer * 2);
        count++;
      }
    });
    this.renderAll();
    this.showToast(`Batch Reorder completed! Restocked ${count} items.`, 'success');
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
  },

  renderMetrics() {
    const revEl = document.getElementById('kpiRevenueVal');
    if (revEl) {
      const totalRev = 148250 + (MallState.salesAmount - 2500);
      revEl.textContent = `$${totalRev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
          <td><span class="inv-buffer-val">${p.minBuffer} min</span></td>
          <td><span class="inv-price-val">$${p.price.toFixed(2)}</span></td>
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
        (po.tenant && po.tenant.toLowerCase().includes(query))
      );
    }

    if (statusVal === 'Pending') {
      orders = orders.filter(po => po.status === 'Pending' || po.status === 'On Pending');
    } else if (statusVal === 'Delivered') {
      orders = orders.filter(po => po.status === 'Order Delivered');
    }

    // Update summary metrics
    const pendingOrders = MallState.purchaseOrders.filter(po => po.status === 'Pending' || po.status === 'On Pending');
    const deliveredOrders = MallState.purchaseOrders.filter(po => po.status === 'Order Delivered');

    let pendingValSum = 0;
    pendingOrders.forEach(po => {
      const num = parseFloat((po.value || '').replace(/[^0-9.-]+/g, '')) || 0;
      pendingValSum += num;
    });

    const pendingCountEl = document.getElementById('reorderPendingCount');
    const pendingValEl = document.getElementById('reorderPendingVal');
    const deliveredCountEl = document.getElementById('reorderDeliveredCount');
    const totalBadgeEl = document.getElementById('reorderTotalBadge');

    if (pendingCountEl) pendingCountEl.textContent = `${pendingOrders.length} Orders`;
    if (pendingValEl) pendingValEl.textContent = `$${pendingValSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (deliveredCountEl) deliveredCountEl.textContent = `${deliveredOrders.length} Completed`;
    if (totalBadgeEl) totalBadgeEl.textContent = `${MallState.purchaseOrders.length} Requisitions Tracked`;

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 36px 16px; color: #94A3B8; font-weight: 500;">No purchase orders match your filter criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(po => {
      const isDelivered = po.status === 'Order Delivered';
      const pillClass = isDelivered ? 'pill-delivered' : 'pill-pending';
      const displayStatus = (po.status === 'On Pending' || po.status === 'Pending') ? 'Pending' : po.status;
      const actualIdx = MallState.purchaseOrders.indexOf(po);

      return `
        <tr class="reorder-table-row">
          <td>
            <code class="reorder-po-code">${this.escapeHTML(po.id)}</code>
          </td>
          <td>
            <div class="reorder-vendor-cell">
              <strong>${this.escapeHTML(po.supplier)}</strong>
              <span class="reorder-sub-tenant">Approved Vendor</span>
            </div>
          </td>
          <td>
            <div class="reorder-items-cell">
              <span class="reorder-items-text">${this.escapeHTML(po.items)}</span>
            </div>
          </td>
          <td>
            <span class="reorder-tenant-badge">${this.escapeHTML(po.tenant)}</span>
          </td>
          <td>
            <strong class="reorder-value-text">${this.escapeHTML(po.value)}</strong>
          </td>
          <td>
            <span class="status-pill ${pillClass}">
              ${isDelivered ? '✓ ' : '⏳ '}${displayStatus}
            </span>
          </td>
          <td class="text-right">
            <button class="btn-table-action ${isDelivered ? 'btn-action-archive' : 'btn-action-approve'}" onclick="MallApp.approvePO(${actualIdx})">
              ${isDelivered ? 'Archive' : 'Approve PO'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  approvePO(idx) {
    const po = MallState.purchaseOrders[idx];
    if (po) {
      if (po.status === 'Order Delivered') {
        MallState.purchaseOrders.splice(idx, 1);
        this.savePurchaseOrders();
        this.renderPurchaseOrders();
        this.showToast(`Purchase Order ${po.id} archived.`, 'info');
      } else {
        po.status = 'Order Delivered';
        this.savePurchaseOrders();
        this.renderPurchaseOrders();
        this.showToast(`Purchase Order ${po.id} approved and marked Delivered!`, 'success');
      }
    }
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
        <text x="${paddingLeft - 10}" y="${y + 4}" text-anchor="end" font-size="11" font-weight="600" fill="#94A3B8">$${(val / 1000).toFixed(0)}k</text>
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
        <g class="recharts-bar-group" data-store="${this.escapeHTML(t.name)}" data-revenue="$${t.amount.toLocaleString()}" data-unit="${this.escapeHTML(t.unit)}">
          <rect x="${paddingLeft + slotW * i}" y="${paddingTop}" width="${slotW}" height="${chartH}" fill="transparent" class="bar-slot-hover" />
          <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="5" ry="5" fill="url(#rechartsBarGrad)" class="recharts-bar-rect" />
          <text x="${x + barW / 2}" y="${height - 20}" text-anchor="middle" font-size="12" font-weight="700" fill="#334155">${this.escapeHTML(t.shortName)}</text>
          <text x="${x + barW / 2}" y="${height - 6}" text-anchor="middle" font-size="10" font-weight="600" fill="#94A3B8">$${(t.amount / 1000).toFixed(1)}k</text>
        </g>
      `;
    });

    const totalRev = tenants.reduce((acc, cur) => acc + cur.amount, 0);
    const totalRevEl = document.getElementById('salesChartTotalRevenue');
    if (totalRevEl) {
      totalRevEl.textContent = `$${totalRev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
            <strong class="sales-gross-val">$${t.calculatedSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
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
  },

  showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${type === 'success' ? '✓' : 'ℹ'}</span><span>${this.escapeHTML(msg)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
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
