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

  // Tenants Information
  tenants: [
    {
      name: 'Apple Store',
      unit: '#101, Floor 1 (Central Atrium)',
      category: 'Consumer Electronics & Hardware',
      skus: '1,420 SKUs',
      stockHealth: 94,
      salesToday: '$48,200',
      manager: 'Michael Ross',
      contact: 'ext. 4101',
      status: 'Active'
    },
    {
      name: 'Zara Flagship',
      unit: '#204, Floor 2 (North Wing)',
      category: 'Fashion & Apparel',
      skus: '3,850 SKUs',
      stockHealth: 78,
      salesToday: '$32,450',
      manager: 'Clara Dubois',
      contact: 'ext. 4204',
      status: 'Active'
    },
    {
      name: 'Nike Experience',
      unit: '#112, Floor 1 (Sports Corridor)',
      category: 'Footwear & Athletic Gear',
      skus: '2,150 SKUs',
      stockHealth: 88,
      salesToday: '$24,180',
      manager: 'Marcus Sterling',
      contact: 'ext. 4112',
      status: 'Active'
    },
    {
      name: 'Sephora Luxury',
      unit: '#108, Floor 1 (Beauty Plaza)',
      category: 'Cosmetics & Fragrances',
      skus: '2,940 SKUs',
      stockHealth: 82,
      salesToday: '$19,840',
      manager: 'Hannah Vance',
      contact: 'ext. 4108',
      status: 'Active'
    },
    {
      name: 'H&M Retail',
      unit: '#201, Floor 2 (Grand Promenade)',
      category: 'Fast Fashion & Homeware',
      skus: '4,100 SKUs',
      stockHealth: 90,
      salesToday: '$16,250',
      manager: 'Liam Gallagher',
      contact: 'ext. 4201',
      status: 'Active'
    },
    {
      name: 'Starbucks Reserve',
      unit: '#G-05, Ground Floor (East Entrance)',
      category: 'Specialty Coffee & Bakery',
      skus: '480 SKUs',
      stockHealth: 96,
      salesToday: '$8,000',
      manager: 'Maya Lin',
      contact: 'ext. 4005',
      status: 'Active'
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

  init() {
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

    tbody.innerHTML = MallState.purchaseOrders.map((po, idx) => {
      const pillClass = po.status === 'Order Delivered' ? 'pill-delivered' : 'pill-pending';
      return `
        <tr>
          <td><strong>${po.id}</strong></td>
          <td>${this.escapeHTML(po.supplier)}</td>
          <td>${this.escapeHTML(po.items)}</td>
          <td>${this.escapeHTML(po.tenant)}</td>
          <td><strong>${po.value}</strong></td>
          <td><span class="status-pill ${pillClass}">${po.status}</span></td>
          <td class="text-right">
            <button class="btn-table-action" onclick="MallApp.approvePO(${idx})">
              ${po.status === 'Order Delivered' ? 'Archive' : 'Approve PO'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  approvePO(idx) {
    const po = MallState.purchaseOrders[idx];
    if (po) {
      po.status = 'Order Delivered';
      this.renderPurchaseOrders();
      this.showToast(`Purchase Order ${po.id} has been approved and delivered!`, 'success');
    }
  },

  renderSalesLeaderboard() {
    const tbody = document.getElementById('salesLeaderboardBody');
    if (!tbody) return;

    tbody.innerHTML = MallState.tenants.map((t, idx) => `
      <tr>
        <td><span class="status-pill pill-delivered">#0${idx + 1}</span></td>
        <td><strong>${this.escapeHTML(t.name)}</strong></td>
        <td>${this.escapeHTML(t.unit)}</td>
        <td>${Math.floor(140 + Math.random() * 200)} items</td>
        <td><strong style="color: var(--green-main);">${t.salesToday}</strong></td>
        <td>${t.stockHealth}%</td>
        <td><span class="status-pill pill-delivered">Online</span></td>
      </tr>
    `).join('');
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
