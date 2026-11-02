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
      stock: 11,
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

    // Toggle bottom-right Copilot button (only visible on dashboard)
    const copilotBtn = document.getElementById('floatingCopilotBtn');
    if (copilotBtn) {
      copilotBtn.style.display = viewName === 'dashboard' ? 'flex' : 'none';
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

  // 2. INVENTORY FILTERS
  bindInventoryFilters() {
    const searchInput = document.getElementById('inventorySearchInput');
    const catSelect = document.getElementById('invCategoryFilter');

    const runFilter = () => {
      const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
      const cat = catSelect ? catSelect.value : 'all';
      this.renderInventoryTable(q, cat);
    };

    if (searchInput) searchInput.addEventListener('input', runFilter);
    if (catSelect) catSelect.addEventListener('change', runFilter);
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

  // 5. REORDER ACTIONS
  reorderItem(sku) {
    const item = MallState.products.find(p => p.sku === sku);
    if (!item) return;

    const added = item.minBuffer * 2;
    item.stock += added;
    this.renderAll();
    this.showToast(`Reordered +${added} units for ${item.name}!`, 'success');
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

  renderInventoryTable(query = '', category = 'all') {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    let items = MallState.products;

    if (query) {
      items = items.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.tenant.toLowerCase().includes(query)
      );
    }

    if (category !== 'all') {
      items = items.filter(p => p.category === category);
    }

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: #94A3B8;">No products found matching filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(p => {
      const isLow = p.stock <= p.minBuffer;
      const statusPill = isLow 
        ? `<span class="status-pill pill-cancelled">Low Stock (${p.stock})</span>` 
        : `<span class="status-pill pill-delivered">Healthy (${p.stock})</span>`;

      return `
        <tr>
          <td>
            <div class="prod-title">${this.escapeHTML(p.name)}</div>
            <div class="prod-sub">${p.tenant} • ${p.unit}</div>
          </td>
          <td><code style="color: #475569; font-weight: 600;">${p.sku}</code></td>
          <td>${this.escapeHTML(p.tenant)}</td>
          <td>${this.escapeHTML(p.category)}</td>
          <td><strong>${p.stock}</strong></td>
          <td>${p.minBuffer} min</td>
          <td>$${p.price.toFixed(2)}</td>
          <td class="text-right">
            <button class="btn-table-action" onclick="MallApp.reorderItem('${p.sku}')">
              ${isLow ? 'Restock' : '+ Add Stock'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
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
