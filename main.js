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
  ToastProvider,
  useToast
} from './src/utils/toast.js';

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
  formatShortDate,
  formatCurrency
} from './src/data/mallData.js';

import {
  login as authLogin,
  logout as authLogout,
  isAuthenticated,
  getCurrentUser
} from './src/services/auth.js';

import {
  getProfile,
  saveProfile,
  getSavedAvatar,
  saveAvatar,
  removeAvatar,
  terminateSessionById,
  terminateOtherSessions,
  DEFAULT_PROFILE
} from './src/services/profile.js';

const MallState = {
  activeView: 'dashboard',
  isLoading: false,
  hasError: false,
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
  staff: initialStaff.map(s => ({ ...s })),

  // Profile View State
  profileActiveTab: 'personal',
  profileEditSections: {},
  profileTimelineFilter: 'all',
  profileTimelineCount: 5
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
    this.initTheme();
    this.loadStateFromStorage();
    this.bindNavigation();
    this.bindModals();
    this.bindInventoryFilters();
    this.bindCopilot();
    this.bindCommandPalette();
    this.updateNotificationBadge();
    this.renderAll();
    this.initLanding();
    this.updateUserProfile();
    this.checkRoute();
    this.bindProfileDropdown();

    window.addEventListener('popstate', (e) => {
      this.checkRoute();
    });

    window.addEventListener('hashchange', () => this.checkRoute());

    // Initial 600ms load simulation with skeletons only on app views
    if (MallState.activeView !== 'landing' && MallState.activeView !== 'login' && MallState.activeView !== 'not-found') {
      this.simulateRefresh(600);
    }
  },

  loadStateFromStorage() {
    try {
      MallState.currency = localStorage.getItem('mallmatrix_currency') || 'USD';

      // Restore sidebar collapsed preference
      const isCollapsed = localStorage.getItem('mallmatrix_sidebar_collapsed') === 'true';
      if (isCollapsed) {
        document.body.classList.add('sidebar-is-collapsed');
        const btn = document.getElementById('sidebarCollapseBtn');
        if (btn) {
          const textSpan = btn.querySelector('.collapse-btn-text');
          if (textSpan) textSpan.textContent = 'Expand Sidebar';
          btn.title = 'Expand Sidebar';
        }
      }

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

  initLanding() {
    const hamburgerBtn = document.getElementById('lpHamburgerBtn');
    const closeBtn = document.getElementById('lpCloseBtn');
    const mobileMenu = document.getElementById('lpMobileMenu');
    const mobileLinks = document.querySelectorAll('.lp-mobile-link, .lp-mobile-btn');

    let isMenuOpen = false;

    const openMobileMenu = () => {
      if (!mobileMenu || !hamburgerBtn) return;
      isMenuOpen = true;
      mobileMenu.removeAttribute('hidden');
      void mobileMenu.offsetWidth;
      mobileMenu.classList.add('lp-menu-active');
      hamburgerBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    };

    const closeMobileMenu = () => {
      if (!mobileMenu || !hamburgerBtn) return;
      isMenuOpen = false;
      mobileMenu.classList.remove('lp-menu-active');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      setTimeout(() => {
        if (!isMenuOpen) {
          mobileMenu.setAttribute('hidden', '');
        }
      }, 250);
      hamburgerBtn.focus();
    };

    if (hamburgerBtn) {
      hamburgerBtn.addEventListener('click', () => {
        if (isMenuOpen) closeMobileMenu();
        else openMobileMenu();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', closeMobileMenu);
    }

    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => {
        if (isMenuOpen) closeMobileMenu();
      });
    });

    const bookDemoBtn = document.getElementById('lpBookDemoBtn');
    const demoModal = document.getElementById('lpDemoModal');
    const demoModalClose = document.getElementById('lpDemoModalClose');
    const demoForm = document.getElementById('lpDemoForm');
    const demoSuccess = document.getElementById('lpDemoSuccess');

    let isModalOpen = false;

    const openDemoModal = () => {
      if (!demoModal) return;
      isModalOpen = true;
      demoModal.removeAttribute('hidden');
      void demoModal.offsetWidth;
      demoModal.classList.add('lp-modal-open');
      document.body.style.overflow = 'hidden';
      const nameInput = document.getElementById('lpDemoName');
      if (nameInput) nameInput.focus();
    };

    const closeDemoModal = () => {
      if (!demoModal) return;
      isModalOpen = false;
      demoModal.classList.remove('lp-modal-open');
      document.body.style.overflow = '';
      setTimeout(() => {
        if (!isModalOpen) {
          demoModal.setAttribute('hidden', '');
        }
      }, 250);
      if (bookDemoBtn) bookDemoBtn.focus();
    };

    if (bookDemoBtn) {
      bookDemoBtn.addEventListener('click', openDemoModal);
    }

    if (demoModalClose) {
      demoModalClose.addEventListener('click', closeDemoModal);
    }

    if (demoModal) {
      demoModal.addEventListener('click', (e) => {
        if (e.target === demoModal) closeDemoModal();
      });
    }

    if (demoForm) {
      demoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        demoForm.style.display = 'none';
        if (demoSuccess) {
          demoSuccess.removeAttribute('hidden');
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (isModalOpen) closeDemoModal();
        else if (isMenuOpen) closeMobileMenu();
      }
    });
  },

  // 1. NAVIGATION & ROUTING
  bindNavigation() {
    const navItems = document.querySelectorAll('.sidebar-menu .menu-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetView = item.getAttribute('data-view');
        if (targetView) {
          this.switchView(targetView, true);
        }
      });
    });

    // Mobile sidebar toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => this.openMobileSidebar());
    }
    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', () => this.closeMobileSidebar());
    }

    // Keyboard shortcut for sidebar toggle (Ctrl+[ or Cmd+[)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault();
        this.toggleSidebarCollapse();
      }
    });

    // Top Create Order button
    const sidebarCreateOrderBtn = document.getElementById('sidebarCreateOrderBtn');
    if (sidebarCreateOrderBtn) {
      sidebarCreateOrderBtn.addEventListener('click', () => this.openProductModal());
    }
  },

  toggleSidebarCollapse() {
    const isCollapsed = document.body.classList.toggle('sidebar-is-collapsed');
    try {
      localStorage.setItem('mallmatrix_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    } catch (e) { }

    const btn = document.getElementById('sidebarCollapseBtn');
    if (btn) {
      const textSpan = btn.querySelector('.collapse-btn-text');
      if (textSpan) textSpan.textContent = isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar';
      btn.title = isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar';
    }
    this.showToast(isCollapsed ? 'Sidebar collapsed (icons mode)' : 'Sidebar expanded', 'info');
  },

  openMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.add('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
  },

  closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
  },

  navigateRoute(pathOrView, event) {
    if (event) {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }

    // Check unsaved profile changes
    if (MallState.activeView === 'profile' && Object.values(MallState.profileEditSections || {}).some(Boolean)) {
      if (!confirm('You have unsaved changes in your profile. Are you sure you want to discard them?')) {
        return;
      }
      MallState.profileEditSections = {};
    }

    const rawTarget = String(pathOrView || '').replace(/^\/+/, '');
    const cleanPath = rawTarget.split('?')[0].split('#')[0].toLowerCase();
    const targetQuery = rawTarget.includes('?') ? rawTarget.split('?')[1] : '';
    if (targetQuery) {
      try {
        const qParams = new URLSearchParams(targetQuery);
        const tabParam = qParams.get('tab');
        if (tabParam && ['personal', 'work', 'contact', 'security', 'preferences', 'activity'].includes(tabParam)) {
          MallState.profileActiveTab = tabParam;
        }
      } catch (e) {}
    }

    let view = cleanPath;
    if (view === 'reordering') view = 'reorder';
    if (!view || view === 'landing' || view === 'home') {
      view = 'landing';
    }

    const PROTECTED_VIEWS = ['dashboard', 'inventory', 'reorder', 'sales', 'staff', 'tenants', 'export', 'copilot', 'profile'];

    // If user is already authenticated and navigates to login, redirect to dashboard
    if (view === 'login' && isAuthenticated()) {
      view = 'dashboard';
    }

    // If user is not authenticated and attempts to access a protected view, remember path & go to login
    if (PROTECTED_VIEWS.includes(view) && !isAuthenticated()) {
      const returnPath = '/' + (view === 'reorder' ? 'reordering' : view);
      try {
        sessionStorage.setItem('mallmatrix_redirect_after_login', returnPath);
      } catch (e) {}
      view = 'login';
    }

    this.switchView(view, true);
  },

  checkRoute() {
    const hash = (window.location.hash || '').toLowerCase().replace('#', '').replace(/^\//, '');
    let path = (window.location.pathname || '').toLowerCase().replace(/^\//, '');
    if (path.endsWith('.html')) {
      path = path.replace(/\.html$/, '');
    }
    if (path.endsWith('/')) {
      path = path.replace(/\/$/, '');
    }

    // Inspect URL search params for tab state
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam && ['personal', 'work', 'contact', 'security', 'preferences', 'activity'].includes(tabParam)) {
        MallState.profileActiveTab = tabParam;
      }
    } catch (e) {}

    const target = hash || path;
    const ROUTE_MAP = {
      '': 'landing',
      'landing': 'landing',
      'home': 'landing',
      'login': 'login',
      'signin': 'login',
      'dashboard': 'dashboard',
      'inventory': 'inventory',
      'reordering': 'reorder',
      'reorder': 'reorder',
      'sales': 'sales',
      'staff': 'staff',
      'tenants': 'tenants',
      'export': 'export',
      'copilot': 'copilot',
      'profile': 'profile'
    };

    const resolved = ROUTE_MAP[target] || 'not-found';
    const PROTECTED_VIEWS = ['dashboard', 'inventory', 'reorder', 'sales', 'staff', 'tenants', 'export', 'copilot', 'profile'];

    // If user is already authenticated and visits /login, redirect to /dashboard
    if (resolved === 'login' && isAuthenticated()) {
      this.switchView('dashboard', true);
      return;
    }

    // If user is not authenticated and attempts to access a protected view, redirect to /login
    if (PROTECTED_VIEWS.includes(resolved) && !isAuthenticated()) {
      const returnPath = window.location.pathname || ('/' + (resolved === 'reorder' ? 'reordering' : resolved));
      try {
        sessionStorage.setItem('mallmatrix_redirect_after_login', returnPath);
      } catch (e) {}
      this.switchView('login', true);
      return;
    }

    this.switchView(resolved, false);
  },

  updateBreadcrumbs(viewName) {
    const catEl = document.getElementById('breadcrumbCategory');
    const currEl = document.getElementById('breadcrumbCurrent');
    if (!catEl || !currEl) return;

    const BREADCRUMB_MAP = {
      dashboard: { category: 'Overview', current: 'Dashboard' },
      inventory: { category: 'Operations', current: 'Stock Management' },
      reorder: { category: 'Procurement', current: 'Automated Reordering' },
      sales: { category: 'Analytics', current: 'Manage Sales Feed' },
      staff: { category: 'Operations', current: 'Staff & Shift Roster' },
      tenants: { category: 'Directory', current: 'Tenant Retail Stores' },
      export: { category: 'Reports', current: 'Data Export Center' },
      copilot: { category: 'Intelligence', current: 'MallMatrix AI' },
      profile: { category: 'Account', current: 'My Profile' }
    };

    const breadcrumb = BREADCRUMB_MAP[viewName] || { category: 'Overview', current: 'Dashboard' };
    catEl.textContent = breadcrumb.category;
    currEl.textContent = breadcrumb.current;
  },

  switchView(viewName, pushHistory = true) {
    if (!viewName) viewName = 'landing';
    if (viewName === 'reordering') viewName = 'reorder';
    MallState.activeView = viewName;

    // Push state to browser history for native back/forward buttons and bookmarks
    if (pushHistory) {
      let routePath = '/dashboard';
      if (viewName === 'landing') {
        routePath = '/';
      } else if (viewName === 'login') {
        routePath = '/login';
      } else if (viewName === 'reorder') {
        routePath = '/reordering';
      } else if (viewName === 'profile') {
        const tab = MallState.profileActiveTab || 'personal';
        routePath = tab === 'personal' ? '/profile' : `/profile?tab=${tab}`;
      } else if (viewName === 'not-found') {
        routePath = window.location.pathname || '/404';
      } else {
        routePath = '/' + viewName;
      }

      if (window.location.pathname !== routePath) {
        try {
          window.history.pushState({ view: viewName }, '', routePath);
        } catch (e) {
          window.location.hash = '#' + (routePath === '/' ? '' : routePath.replace(/^\//, ''));
        }
      }
    }

    const landingEl = document.getElementById('view-landing');
    const loginEl = document.getElementById('view-login');
    const appLayoutEl = document.getElementById('appLayout');
    const notFoundEl = document.getElementById('view-not-found');
    const floatingCopilotBtn = document.getElementById('floatingCopilotBtn');

    if (viewName === 'landing') {
      if (landingEl) landingEl.style.display = 'block';
      if (loginEl) loginEl.style.display = 'none';
      if (appLayoutEl) appLayoutEl.style.display = 'none';
      if (notFoundEl) notFoundEl.style.display = 'none';
      if (floatingCopilotBtn) floatingCopilotBtn.style.display = 'none';
      document.title = "MallMatrix — Orchestrate Your Mall's Inventory Instantly and Effortlessly";
      window.scrollTo(0, 0);
      return;
    }

    if (viewName === 'login') {
      if (landingEl) landingEl.style.display = 'none';
      if (loginEl) loginEl.style.display = 'flex';
      if (appLayoutEl) appLayoutEl.style.display = 'none';
      if (notFoundEl) notFoundEl.style.display = 'none';
      if (floatingCopilotBtn) floatingCopilotBtn.style.display = 'none';
      document.title = "Sign In — MallMatrix";
      this.resetLoginForm();
      window.scrollTo(0, 0);
      return;
    }

    if (viewName === 'not-found') {
      if (landingEl) landingEl.style.display = 'none';
      if (loginEl) loginEl.style.display = 'none';
      if (appLayoutEl) appLayoutEl.style.display = 'none';
      if (notFoundEl) notFoundEl.style.display = 'flex';
      if (floatingCopilotBtn) floatingCopilotBtn.style.display = 'none';
      document.title = "Page Not Found — MallMatrix";
      window.scrollTo(0, 0);
      return;
    }

    // App views
    if (landingEl) landingEl.style.display = 'none';
    if (loginEl) loginEl.style.display = 'none';
    if (notFoundEl) notFoundEl.style.display = 'none';
    if (appLayoutEl) appLayoutEl.style.display = 'flex';
    if (appLayoutEl) appLayoutEl.style.display = 'flex';

    document.title = "MallMatrix — Mall Inventory & Stock Management Platform";

    // Update active menu item
    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    // Switch view panel
    document.querySelectorAll('.view-panel').forEach(panel => {
      const isActive = panel.id === `view-${viewName}`;
      panel.classList.toggle('active', isActive);
      panel.style.display = isActive ? 'block' : 'none';
    });

    // Update Breadcrumbs
    this.updateBreadcrumbs(viewName);

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
    } else if (viewName === 'staff') {
      this.renderStaffTable();
    } else if (viewName === 'tenants') {
      this.renderTenantDirectory();
    } else if (viewName === 'profile') {
      this.renderProfileView();
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
      liveDateEl.textContent = formatShortDate(new Date());
    }

    if (mainTitle) {
      if (viewName === 'dashboard') {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning' : (hour < 18 ? 'Good afternoon' : 'Good evening');
        mainTitle.textContent = `${greeting}, Alex`;
        if (mainSubtitle) {
          const critCount = getCriticalStockCount(MallState.products);
          mainSubtitle.style.display = 'block';
          mainSubtitle.innerHTML = `<a href="/inventory" class="header-purple-link" onclick="MallApp.navigateRoute('/inventory', event)"><span id="subtitleCritCount">${critCount}</span> critical items</a> and <a href="/tenants" class="header-purple-link" onclick="MallApp.navigateRoute('/tenants', event)">2 overdue rents</a> need your attention.`;
        }
      } else {
        const titles = {
          inventory: 'Mall Multi-Tenant Stock Management',
          reorder: 'Automated Reordering System',
          sales: 'Manage Sales & POS Analytics',
          staff: 'Staff & Shift Duty Roster',
          tenants: 'Mall Tenant Stores Directory',
          copilot: 'MallMatrix AI Copilot Assistant',
          export: 'Data Export Center',
          profile: 'My Profile'
        };
        const subtitles = {
          inventory: 'Manage store SKUs, buffer thresholds, and live stock levels across all mall departments.',
          reorder: 'Safety stock triggers, lead-time analytics, and automated supplier PO replenishment.',
          sales: 'Consolidated mall sales reports, turnover velocity, and live POS telemetry for Top 6 Stores.',
          staff: 'Floor inventory auditors, dock receiving supervisors, and tenant compliance teams on active shifts.',
          tenants: 'Directory of 48 integrated retail tenants, lease compliance, and live POS sync health.',
          copilot: 'Autonomous intelligence agent for stock prediction, sales analysis, and operations.',
          export: 'Generate comprehensive reports, exports, and data snapshots across all mall operations directly in your browser.',
          profile: 'View and manage your personal details, security and preferences.'
        };
        mainTitle.textContent = titles[viewName] || 'MallMatrix Operations';
        if (mainSubtitle) {
          mainSubtitle.style.display = 'block';
          mainSubtitle.textContent = subtitles[viewName] || 'Centralized operational command & intelligence';
        }
      }
    }

    // Render header actions for this view
    this.renderHeaderActions(viewName);

    // Close mobile sidebar if open
    this.closeMobileSidebar();
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
        this.closeTenantDrawer();
        this.closeOnboardTenantModal();
        this.closeAllTenantMenus();
        const prodModal = document.getElementById('newProductModal');
        if (prodModal && prodModal.classList.contains('open')) {
          prodModal.classList.remove('open');
        }
        this.setOverlayOpen(false);
      }
    });
  },

  // 3. CREATE ORDER / ADD PRODUCT MODAL WITH INLINE VALIDATION
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
      // Attach real-time validation to all inputs
      const inputs = ['prodName', 'prodSKU', 'prodTenant', 'prodCategory', 'prodQty', 'prodMinBuffer', 'prodPrice'];
      inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', () => this.validateProductForm());
          el.addEventListener('blur', () => this.validateProductForm());
          el.addEventListener('change', () => this.validateProductForm());
        }
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!this.validateProductForm()) {
          this.showToast('Please fix validation errors before submitting', 'error');
          return;
        }

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
        this.saveProducts();
        this.renderAll();
        closeModal();
        form.reset();
        this.validateProductForm();
        this.showToast(`Order created for ${name} (${sku}) at ${tenant}!`, 'success');
      });
    }
  },

  validateProductForm() {
    const nameInput = document.getElementById('prodName');
    const skuInput = document.getElementById('prodSKU');
    const tenantInput = document.getElementById('prodTenant');
    const catInput = document.getElementById('prodCategory');
    const qtyInput = document.getElementById('prodQty');
    const minBufferInput = document.getElementById('prodMinBuffer');
    const priceInput = document.getElementById('prodPrice');
    const submitBtn = document.getElementById('submitProductBtn');

    if (!nameInput || !skuInput || !qtyInput || !minBufferInput || !priceInput || !submitBtn) {
      return false;
    }

    const nameErr = document.getElementById('prodNameError');
    const skuErr = document.getElementById('prodSKUError');
    const tenantErr = document.getElementById('prodTenantError');
    const catErr = document.getElementById('prodCategoryError');
    const qtyErr = document.getElementById('prodQtyError');
    const minBufferErr = document.getElementById('prodMinBufferError');
    const priceErr = document.getElementById('prodPriceError');

    let isValid = true;

    const setFieldError = (input, errEl, msg) => {
      if (msg) {
        isValid = false;
        if (input) input.classList.add('has-error');
        if (errEl) {
          errEl.textContent = msg;
          errEl.style.display = 'block';
        }
      } else {
        if (input) input.classList.remove('has-error');
        if (errEl) {
          errEl.textContent = '';
          errEl.style.display = 'none';
        }
      }
    };

    // 1. Name validation
    const nameVal = nameInput.value.trim();
    if (!nameVal) {
      setFieldError(nameInput, nameErr, 'Product / order title is required');
    } else if (nameVal.length < 2) {
      setFieldError(nameInput, nameErr, 'Title must be at least 2 characters');
    } else {
      setFieldError(nameInput, nameErr, null);
    }

    // 2. SKU validation (Required, min 3 chars, and UNIQUE SKU check)
    const skuVal = skuInput.value.trim().toUpperCase();
    if (!skuVal) {
      setFieldError(skuInput, skuErr, 'SKU identifier is required');
    } else if (skuVal.length < 3) {
      setFieldError(skuInput, skuErr, 'SKU must be at least 3 characters');
    } else {
      const duplicate = MallState.products.find(p => p.sku.toUpperCase() === skuVal);
      if (duplicate) {
        setFieldError(skuInput, skuErr, `SKU "${skuVal}" already assigned to ${duplicate.name}. Must be unique.`);
      } else {
        setFieldError(skuInput, skuErr, null);
      }
    }

    // 3. Tenant validation
    if (!tenantInput.value) {
      setFieldError(tenantInput, tenantErr, 'Please select a tenant store');
    } else {
      setFieldError(tenantInput, tenantErr, null);
    }

    // 4. Category validation
    if (!catInput.value) {
      setFieldError(catInput, catErr, 'Please select a department');
    } else {
      setFieldError(catInput, catErr, null);
    }

    // 5. Quantity validation (quantity > 0)
    const qtyVal = parseInt(qtyInput.value, 10);
    if (isNaN(qtyVal) || qtyInput.value === '') {
      setFieldError(qtyInput, qtyErr, 'Quantity is required');
    } else if (qtyVal <= 0) {
      setFieldError(qtyInput, qtyErr, 'Quantity must be greater than 0');
    } else {
      setFieldError(qtyInput, qtyErr, null);
    }

    // 6. Safety Buffer validation (buffer > 0)
    const minBufferVal = parseInt(minBufferInput.value, 10);
    if (isNaN(minBufferVal) || minBufferInput.value === '') {
      setFieldError(minBufferInput, minBufferErr, 'Safety buffer is required');
    } else if (minBufferVal <= 0) {
      setFieldError(minBufferInput, minBufferErr, 'Safety buffer must be greater than 0');
    } else {
      setFieldError(minBufferInput, minBufferErr, null);
    }

    // 7. Price validation (price > 0)
    const priceVal = parseFloat(priceInput.value);
    if (isNaN(priceVal) || priceInput.value === '') {
      setFieldError(priceInput, priceErr, 'Unit price is required');
    } else if (priceVal <= 0) {
      setFieldError(priceInput, priceErr, 'Unit price must be greater than 0');
    } else {
      setFieldError(priceInput, priceErr, null);
    }

    // Toggle submit button
    submitBtn.disabled = !isValid;
    submitBtn.style.opacity = isValid ? '1' : '0.5';
    submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';

    return isValid;
  },

  openProductModal() {
    const modal = document.getElementById('newProductModal');
    const form = document.getElementById('newProductForm');
    if (form) {
      form.reset();
      // Clear errors
      ['prodName', 'prodSKU', 'prodTenant', 'prodCategory', 'prodQty', 'prodMinBuffer', 'prodPrice'].forEach(id => {
        const inp = document.getElementById(id);
        const err = document.getElementById(`${id}Error`);
        if (inp) inp.classList.remove('has-error');
        if (err) {
          err.textContent = '';
          err.style.display = 'none';
        }
      });
      this.validateProductForm();
    }
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
              <strong style="color: var(--accent);">${this.formatCurrency(subtotal)}</strong>
            </td>
          </tr>
        `;
      });

      body.innerHTML = `
        <div class="batch-modal-summary-grid">
          <div class="batch-modal-kpi">
            <span class="batch-modal-kpi-label">POs to Generate</span>
            <div class="batch-modal-kpi-val" style="color: var(--accent);">${lowStockItems.length} Orders</div>
          </div>
          <div class="batch-modal-kpi">
            <span class="batch-modal-kpi-label">Total Estimated Cost</span>
            <div class="batch-modal-kpi-val" style="color: var(--success);">${this.formatCurrency(totalEstCost)}</div>
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
    this.renderTenantDirectory();
    this.renderAllExportButtons();
    this.renderExportCenter();
    this.renderProfileView();
    if (this._activeRestockSku) {
      const p = MallState.products.find(item => item.sku === this._activeRestockSku);
      const unitPriceEl = document.getElementById('invDrawerUnitPrice');
      if (p && unitPriceEl) unitPriceEl.textContent = this.formatCurrency(p.price);
      this.updateDrawerCostPreview();
    }
    if (this._activeDetailPoId) {
      this.openPODetailDrawer(this._activeDetailPoId);
    }
    this.updateCurrencyUI();
  },

  renderMetrics() {
    // 1. Live dynamic date
    const liveDateEl = document.getElementById('headerLiveDate');
    if (liveDateEl) {
      liveDateEl.textContent = formatShortDate(new Date());
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
        mainSubtitle.innerHTML = `<a href="/inventory" class="header-purple-link" onclick="MallApp.navigateRoute('/inventory', event)"><span id="subtitleCritCount">${critCount}</span> critical items</a> and <a href="/tenants" class="header-purple-link" onclick="MallApp.navigateRoute('/tenants', event)">2 overdue rents</a> need your attention.`;
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

    // 7. Estimated Retail Spending in Orchestrator summary
    const orchSpendingEl = document.getElementById('orchEstimatedSpendingVal');
    if (orchSpendingEl) {
      orchSpendingEl.textContent = MallState.currency === 'INR' ? '₹20L+' : '$240K+';
    }

    // 8. Sales Trend Graph amounts
    const trendAmountEl = document.getElementById('trendMainAmount');
    if (trendAmountEl) {
      trendAmountEl.textContent = this.formatCurrency(30000).replace(/\.00$/, '');
    }
    const trendTooltipEl = document.getElementById('trendTooltipAmount');
    if (trendTooltipEl) {
      const formatted30k = this.formatCurrency(30000).replace(/\.00$/, '');
      trendTooltipEl.textContent = `${formatted30k} / hr`;
    }
    const trendAvgEl = document.getElementById('trendAvgBasketVal');
    if (trendAvgEl) {
      trendAvgEl.textContent = this.formatCurrency(84.20);
    }

    // 9. Form & Header Currency symbols
    const isINR = MallState.currency === 'INR';
    document.querySelectorAll('.currency-symbol').forEach(el => {
      el.textContent = isINR ? '₹' : '$';
    });

    // 10. Reorder page pending value sum
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

    if (MallState.isLoading) {
      tbody.innerHTML = Array(6).fill(0).map(() => `
        <tr class="skeleton-row">
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 18px; height: 18px; border-radius: 4px;"></div></td>
          <td>
            <div style="display: flex; gap: 10px; align-items: center;">
              <div class="skeleton-shimmer skeleton-circle"></div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div class="skeleton-shimmer skeleton-bar" style="width: 140px; height: 13px;"></div>
                <div class="skeleton-shimmer skeleton-bar" style="width: 90px; height: 10px;"></div>
              </div>
            </div>
          </td>
          <td><div class="skeleton-shimmer skeleton-pill"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 110px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-pill" style="width: 80px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 50px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 40px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 65px;"></div></td>
          <td style="text-align: right;"><div class="skeleton-shimmer skeleton-pill" style="width: 75px; margin-left: auto;"></div></td>
        </tr>
      `).join('');
      return;
    }

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
      const q = (searchInput?.value || '').trim();
      const title = q ? `No results found for "${this.escapeHTML(q)}"` : 'No products found matching active filters';
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="padding: 20px 0;">
            <div class="empty-state-wrap">
              <div class="empty-state-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </div>
              <h4 class="empty-state-title">${title}</h4>
              <p class="empty-state-desc">Try clearing the search query or resetting department and buffer filters to view available SKUs.</p>
              <button type="button" class="empty-state-btn" onclick="MallApp.clearInventoryFilters()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span>Clear filters</span>
              </button>
            </div>
          </td>
        </tr>
      `;
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

    if (MallState.isLoading) {
      tbody.innerHTML = Array(4).fill(0).map(() => `
        <tr class="skeleton-row">
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 85px; height: 16px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 130px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 120px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 100px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 80px; height: 16px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-pill"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 90px; height: 12px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 90px; height: 12px;"></div></td>
          <td style="text-align: right;"><div class="skeleton-shimmer skeleton-pill" style="width: 70px; margin-left: auto;"></div></td>
        </tr>
      `).join('');
      return;
    }

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
      const q = (searchInput?.value || '').trim();
      const title = q ? `No purchase orders found for "${this.escapeHTML(q)}"` : 'No purchase orders match active status filter';
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="padding: 20px 0;">
            <div class="empty-state-wrap">
              <div class="empty-state-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                </svg>
              </div>
              <h4 class="empty-state-title">${title}</h4>
              <p class="empty-state-desc">Try clearing your search query or selecting "All Statuses" from the filter dropdown.</p>
              <button type="button" class="empty-state-btn" onclick="MallApp.clearReorderFilters()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span>Clear filters</span>
              </button>
            </div>
          </td>
        </tr>
      `;
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
          <strong style="color: var(--accent);">${this.formatCurrency(po.value)}</strong>
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
      { name: po.items, sku: 'SKU-REORDER', qty: 1, price: typeof po.value === 'number' ? po.value : (parseFloat(String(po.value || 0).replace(/[^0-9.-]+/g, '')) || 0), subtotal: typeof po.value === 'number' ? po.value : (parseFloat(String(po.value || 0).replace(/[^0-9.-]+/g, '')) || 0) }
    ];

    let lineRowsHtml = lineItems.map(item => `
      <tr>
        <td><strong class="po-item-name" style="font-weight: 700;">${this.escapeHTML(item.name)}</strong></td>
        <td><span class="po-item-sku" style="font-family: monospace; font-size: 0.74rem; padding: 2px 7px; border-radius: 4px; white-space: nowrap;">${this.escapeHTML(item.sku || 'SKU-000')}</span></td>
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
          <div class="po-meta-box-val" style="color: var(--accent);">${this.escapeHTML(po.expectedDelivery || 'In 3 business days')}</div>
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
          <button type="button" class="inv-drawer-btn-create" onclick="MallApp.shipPO('${po.id}')" style="background: var(--accent); color: var(--primary-btn-text);">
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

    const totalRev = MallState.tenants.reduce((acc, cur) => acc + Math.round((cur.salesAmount || 0) * mult), 0);
    const totalRevEl = document.getElementById('salesChartTotalRevenue');
    if (totalRevEl) {
      totalRevEl.textContent = this.formatCurrency(totalRev);
    }

    const topStores = [...MallState.tenants]
      .sort((a, b) => (b.salesAmount || 0) - (a.salesAmount || 0))
      .slice(0, 6);

    const tenants = topStores.map(t => ({
      name: t.name,
      shortName: t.name.replace(' Store', '').replace(' Flagship', '').replace(' Experience', '').replace(' Luxury', '').replace(' Retail', '').replace(' Reserve', ''),
      amount: Math.round((t.salesAmount || 0) * mult),
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

    const isDark = document.documentElement.classList.contains('dark');
    const gridStroke = isDark ? '#26262F' : '#E2E8F0';
    const axisTextFill = isDark ? '#A1A1B5' : '#94A3B8';
    const storeLabelFill = isDark ? '#F4F4F8' : '#334155';
    const baseLineStroke = isDark ? '#26262F' : '#CBD5E1';
    const gradStart = '#8F57FF';
    const gradEnd = '#5B3DF5';
    const barFill = isDark ? '#6D4DF2' : 'url(#rechartsBarGrad)';

    // Grid lines
    const gridSteps = 4;
    let gridLinesSvg = '';
    for (let i = 0; i <= gridSteps; i++) {
      const y = paddingTop + (chartH / gridSteps) * i;
      const val = Math.round(roundedMax - (roundedMax / gridSteps) * i);
      gridLinesSvg += `
        <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="${gridStroke}" stroke-dasharray="4 4" stroke-width="1" />
        <text x="${paddingLeft - 10}" y="${y + 4}" text-anchor="end" font-size="11" font-weight="600" fill="${axisTextFill}">${currencySymbol}${(val / 1000).toFixed(0)}k</text>
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
          <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" ry="4" fill="${barFill}" class="recharts-bar-rect" />
          <text x="${x + barW / 2}" y="${height - 20}" text-anchor="middle" font-size="12" font-weight="700" fill="${storeLabelFill}">${this.escapeHTML(t.shortName)}</text>
          <text x="${x + barW / 2}" y="${height - 6}" text-anchor="middle" font-size="10" font-weight="600" fill="${axisTextFill}">${currencySymbol}${(t.amount / 1000).toFixed(1)}k</text>
        </g>
      `;
    });

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="sales-recharts-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="rechartsBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${gradStart}" />
            <stop offset="100%" stop-color="${gradEnd}" />
          </linearGradient>
        </defs>
        ${gridLinesSvg}
        <line x1="${paddingLeft}" y1="${paddingTop + chartH}" x2="${width - paddingRight}" y2="${paddingTop + chartH}" stroke="${baseLineStroke}" stroke-width="1.5" />
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

    if (MallState.isLoading) {
      tbody.innerHTML = Array(6).fill(0).map(() => `
        <tr class="skeleton-row">
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 32px; height: 16px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 120px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 140px; height: 12px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 60px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 80px; height: 16px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 50px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-pill"></div></td>
        </tr>
      `).join('');
      return;
    }

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

    if (MallState.isLoading) {
      tbody.innerHTML = Array(6).fill(0).map(() => `
        <tr class="skeleton-row">
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 130px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 80px; height: 12px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 120px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-pill"></div></td>
          <td><div class="skeleton-shimmer skeleton-pill" style="width: 80px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 40px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 90px; height: 12px;"></div></td>
        </tr>
      `).join('');
      return;
    }

    if (!MallState.staff.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="padding: 20px 0;">
            <div class="empty-state-wrap">
              <div class="empty-state-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
              </div>
              <h4 class="empty-state-title">No staff members found</h4>
              <p class="empty-state-desc">The duty roster has no active auditors logged for this floor zone.</p>
              <button type="button" class="empty-state-btn" onclick="MallApp.clearStaffFilters()">Clear filters</button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

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

  // ========================================================
  // VIEW 6: MALL TENANT STORES DIRECTORY (48 INTEGRATED STORES)
  // ========================================================

  _tenantSearch: '',
  _tenantFloor: 'all',
  _tenantCategory: 'all',
  _tenantStatus: 'all',
  _tenantSort: 'name-asc',
  _tenantViewMode: localStorage.getItem('mallmatrix_tenant_view') || 'grid',
  _tenantPage: 1,
  _tenantPageSize: 12,
  _activeTenantDetailId: null,
  _activeTenantMenuId: null,
  _tenantLoading: false,
  _tenantError: null,
  _tenantControlsBound: false,

  renderTenantDirectory() {
    this.bindTenantControls();
    this.renderTenantSummaryStrip();
    this.renderTenantCards();
  },

  bindTenantControls() {
    if (this._tenantControlsBound) return;

    const searchInput = document.getElementById('tenantSearchInput');
    const floorFilter = document.getElementById('tenantFloorFilter');
    const categoryFilter = document.getElementById('tenantCategoryFilter');
    const statusFilter = document.getElementById('tenantStatusFilter');
    const sortFilter = document.getElementById('tenantSortFilter');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this._tenantSearch = e.target.value.trim().toLowerCase();
        this._tenantPage = 1;
        this.renderTenantCards();
      });
    }

    if (floorFilter) {
      floorFilter.addEventListener('change', (e) => {
        this._tenantFloor = e.target.value;
        this._tenantPage = 1;
        this.renderTenantCards();
      });
    }

    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this._tenantCategory = e.target.value;
        this._tenantPage = 1;
        this.renderTenantCards();
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this._tenantStatus = e.target.value;
        this._tenantPage = 1;
        this.renderTenantCards();
      });
    }

    if (sortFilter) {
      sortFilter.addEventListener('change', (e) => {
        this._tenantSort = e.target.value;
        this._tenantPage = 1;
        this.renderTenantCards();
      });
    }

    // Dismiss open action menus on document click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.tenant-action-menu-wrap')) {
        this.closeAllTenantMenus();
      }
    });

    this.bindOnboardTenantValidation();
    this._tenantControlsBound = true;
  },

  renderTenantSummaryStrip() {
    const strip = document.getElementById('tenantSummaryStrip');
    if (!strip) return;

    const tenants = MallState.tenants || [];
    const totalStores = tenants.length;
    const posOnline = tenants.filter(t => t.posStatus === 'online').length;
    const posOffline = tenants.filter(t => t.posStatus === 'offline').length;
    const expiringCount = tenants.filter(t => this.isLeaseExpiringSoon(t.leaseEnd)).length;

    strip.innerHTML = `
      <div class="tenant-stat-card">
        <div class="tenant-stat-card-header">
          <span class="tenant-stat-label">Total Stores</span>
          <span class="tenant-stat-badge">All Floors</span>
        </div>
        <div class="tenant-stat-number">${totalStores}</div>
        <div class="tenant-stat-subtext">Integrated retail units</div>
      </div>

      <div class="tenant-stat-card">
        <div class="tenant-stat-card-header">
          <span class="tenant-stat-label">POS Online</span>
          <span class="tenant-stat-badge badge-success">Optimal</span>
        </div>
        <div class="tenant-stat-number" style="color: var(--success);">${posOnline}</div>
        <div class="tenant-stat-subtext">Live telemetry stream active</div>
      </div>

      <div class="tenant-stat-card ${posOffline > 0 ? 'alert-danger' : ''}">
        <div class="tenant-stat-card-header">
          <span class="tenant-stat-label">POS Offline</span>
          <span class="tenant-stat-badge ${posOffline > 0 ? 'badge-danger' : 'badge-success'}">
            ${posOffline > 0 ? 'Requires Action' : 'All Connected'}
          </span>
        </div>
        <div class="tenant-stat-number" style="${posOffline > 0 ? 'color: var(--danger);' : ''}">${posOffline}</div>
        <div class="tenant-stat-subtext">${posOffline > 0 ? 'Telemetry link interrupted' : 'Zero telemetry breaches'}</div>
      </div>

      <div class="tenant-stat-card ${expiringCount > 0 ? 'alert-warning' : ''}">
        <div class="tenant-stat-card-header">
          <span class="tenant-stat-label">Leases Expiring (90d)</span>
          <span class="tenant-stat-badge ${expiringCount > 0 ? 'badge-warning' : 'badge-success'}">
            ${expiringCount > 0 ? 'Renewal Due' : 'All Current'}
          </span>
        </div>
        <div class="tenant-stat-number" style="${expiringCount > 0 ? 'color: var(--warning);' : ''}">${expiringCount}</div>
        <div class="tenant-stat-subtext">Upcoming renewals in 90 days</div>
      </div>
    `;
  },

  isLeaseExpiringSoon(leaseEndStr) {
    if (!leaseEndStr) return false;
    // Known 4 stores expiring in simulated Nov 2026 - Feb 2027 window
    const parts = leaseEndStr.split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
      const month = months[parts[1]];
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        const leaseDate = new Date(year, month, day);
        const refDate = new Date(2026, 10, 10); // Simulated mall time: Nov 10, 2026
        const diffDays = (leaseDate - refDate) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 120;
      }
    }
    return false;
  },

  clearTenantFilters() {
    this._tenantSearch = '';
    this._tenantFloor = 'all';
    this._tenantCategory = 'all';
    this._tenantStatus = 'all';
    this._tenantSort = 'name-asc';
    this._tenantPage = 1;

    const sIn = document.getElementById('tenantSearchInput');
    const fIn = document.getElementById('tenantFloorFilter');
    const cIn = document.getElementById('tenantCategoryFilter');
    const stIn = document.getElementById('tenantStatusFilter');
    const sortIn = document.getElementById('tenantSortFilter');

    if (sIn) sIn.value = '';
    if (fIn) fIn.value = 'all';
    if (cIn) cIn.value = 'all';
    if (stIn) stIn.value = 'all';
    if (sortIn) sortIn.value = 'name-asc';

    this.renderTenantCards();
    this.showToast('Tenant filters reset to default', 'info');
  },

  setTenantViewMode(mode) {
    this._tenantViewMode = mode;
    localStorage.setItem('mallmatrix_tenant_view', mode);

    const gridBtn = document.getElementById('tenantViewGridBtn');
    const listBtn = document.getElementById('tenantViewListBtn');
    if (gridBtn && listBtn) {
      gridBtn.classList.toggle('active', mode === 'grid');
      listBtn.classList.toggle('active', mode === 'list');
    }

    if (mode === 'list' && this._tenantPageSize === 12) {
      this._tenantPageSize = 15;
    } else if (mode === 'grid' && this._tenantPageSize === 15) {
      this._tenantPageSize = 12;
    }

    this._tenantPage = 1;
    this.renderTenantCards();
  },

  getFilteredTenants() {
    let list = [...(MallState.tenants || [])];

    // 1. Search Query
    if (this._tenantSearch) {
      const q = this._tenantSearch;
      list = list.filter(t => {
        return (
          t.name.toLowerCase().includes(q) ||
          t.unit.toLowerCase().includes(q) ||
          (t.floor && t.floor.toLowerCase().includes(q)) ||
          (t.manager && t.manager.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          (t.email && t.email.toLowerCase().includes(q))
        );
      });
    }

    // 2. Floor Filter
    if (this._tenantFloor && this._tenantFloor !== 'all') {
      list = list.filter(t => t.floor === this._tenantFloor);
    }

    // 3. Category Filter
    if (this._tenantCategory && this._tenantCategory !== 'all') {
      list = list.filter(t => (t.category || '').toLowerCase() === this._tenantCategory.toLowerCase());
    }

    // 4. Status Filter
    if (this._tenantStatus && this._tenantStatus !== 'all') {
      if (this._tenantStatus === 'Active') {
        list = list.filter(t => t.status === 'Active' && t.posStatus !== 'offline');
      } else if (this._tenantStatus === 'Offline') {
        list = list.filter(t => t.posStatus === 'offline' || t.status === 'Offline');
      } else if (this._tenantStatus === 'Lease Expiring') {
        list = list.filter(t => t.status === 'Lease Expiring' || this.isLeaseExpiringSoon(t.leaseEnd));
      }
    }

    // 5. Sorting
    const sort = this._tenantSort || 'name-asc';
    list.sort((a, b) => {
      if (sort === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      if (sort === 'sales-desc') {
        return (b.salesAmount || 0) - (a.salesAmount || 0);
      }
      if (sort === 'stock-desc') {
        const stockA = a.skuCount || parseInt(a.skus, 10) || 0;
        const stockB = b.skuCount || parseInt(b.skus, 10) || 0;
        return stockB - stockA;
      }
      if (sort === 'lease-asc') {
        const parseD = str => {
          if (!str) return 9999999999999;
          const p = str.split(' ');
          const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
          return new Date(parseInt(p[2], 10), months[p[1]] || 0, parseInt(p[0], 10)).getTime();
        };
        return parseD(a.leaseEnd) - parseD(b.leaseEnd);
      }
      return 0;
    });

    return list;
  },

  renderTenantCards() {
    const grid = document.getElementById('tenantCardsGrid');
    const listWrap = document.getElementById('tenantListContainer');
    const paginationBar = document.getElementById('tenantPaginationBar');
    const countEl = document.getElementById('tenantShowingCount');
    const clearBtn = document.getElementById('tenantClearFiltersBtn');

    if (!grid || !listWrap) return;

    if (MallState.isLoading || this._tenantLoading) {
      this.renderTenantSkeletons();
      return;
    }

    if (this._tenantError) {
      grid.style.display = 'grid';
      listWrap.style.display = 'none';
      grid.innerHTML = `
        <div style="grid-column: 1 / -1;">
          <div class="empty-state-wrap" style="border-color: rgba(239, 68, 68, 0.3);">
            <div class="empty-state-icon" style="color: var(--danger);">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h4 class="empty-state-title" style="color: var(--danger);">Telemetry Sync Failed</h4>
            <p class="empty-state-desc">${this.escapeHTML(this._tenantError)}</p>
            <button type="button" class="btn-table-action" style="margin-top: 12px; padding: 8px 16px;" onclick="MallApp.retryTenantLoad()">
              Retry Sync
            </button>
          </div>
        </div>
      `;
      if (paginationBar) paginationBar.innerHTML = '';
      return;
    }

    const filtered = this.getFilteredTenants();
    const totalTenants = (MallState.tenants || []).length;

    // Update Showing count
    if (countEl) {
      countEl.textContent = `Showing ${filtered.length} of ${totalTenants} stores`;
    }

    // Toggle Clear Filters link
    const isFiltered = (
      Boolean(this._tenantSearch) ||
      this._tenantFloor !== 'all' ||
      this._tenantCategory !== 'all' ||
      this._tenantStatus !== 'all' ||
      this._tenantSort !== 'name-asc'
    );
    if (clearBtn) {
      clearBtn.style.display = isFiltered ? 'inline-block' : 'none';
    }

    // Empty state
    if (!filtered.length) {
      grid.style.display = 'grid';
      listWrap.style.display = 'none';
      grid.innerHTML = `
        <div style="grid-column: 1 / -1;">
          <div class="empty-state-wrap">
            <div class="empty-state-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              </svg>
            </div>
            <h4 class="empty-state-title">No matching tenant stores found</h4>
            <p class="empty-state-desc">Try clearing or adjusting your search keyword and filter criteria.</p>
            <button type="button" class="btn-table-action" style="margin-top: 12px; padding: 6px 14px;" onclick="MallApp.clearTenantFilters()">
              Reset All Filters
            </button>
          </div>
        </div>
      `;
      if (paginationBar) paginationBar.innerHTML = '';
      return;
    }

    // Pagination calculations
    const pageSize = this._tenantPageSize;
    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    if (this._tenantPage > totalPages) this._tenantPage = totalPages;
    if (this._tenantPage < 1) this._tenantPage = 1;

    const startIndex = (this._tenantPage - 1) * pageSize;
    const pageItems = filtered.slice(startIndex, startIndex + pageSize);

    // Render Grid vs List
    if (this._tenantViewMode === 'list') {
      grid.style.display = 'none';
      listWrap.style.display = 'block';
      this.renderTenantListView(pageItems);
    } else {
      grid.style.display = 'grid';
      listWrap.style.display = 'none';
      this.renderTenantGridView(pageItems);
    }

    // Render Pagination Bar
    this.renderTenantPagination(filtered.length, startIndex, pageSize, totalPages);

    // Refresh Header Export dropdown
    this.renderTenantsExportButton();
  },

  renderTenantGridView(items) {
    const grid = document.getElementById('tenantCardsGrid');
    if (!grid) return;

    grid.innerHTML = items.map(t => {
      const isOffline = t.posStatus === 'offline' || t.status === 'Offline';
      const isExpiring = !isOffline && (t.status === 'Lease Expiring' || this.isLeaseExpiringSoon(t.leaseEnd));

      let statusBadge = `<span class="status-pill pill-delivered">Active</span>`;
      if (isOffline) {
        statusBadge = `<span class="status-pill pill-cancelled">Offline</span>`;
      } else if (isExpiring) {
        statusBadge = `<span class="status-pill pill-delayed">Lease Expiring</span>`;
      }

      const dotClass = isOffline ? 'dot-offline' : (t.posStatus === 'delayed' ? 'dot-delayed' : 'dot-online');
      const health = t.stockHealth !== undefined ? t.stockHealth : 92;
      let healthColor = 'var(--success)';
      if (health < 75) healthColor = 'var(--danger)';
      else if (health < 88) healthColor = 'var(--warning)';

      const initials = t.name.replace(/[^A-Za-z0-9]/g, '').substring(0, 2).toUpperCase();

      return `
        <div class="tenant-clean-card ${isOffline ? 'tenant-card-offline' : ''}"
          tabindex="0"
          role="button"
          aria-label="View store details for ${this.escapeHTML(t.name)}"
          onclick="MallApp.openTenantDrawer('${t.id}')"
          onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); MallApp.openTenantDrawer('${t.id}'); }">
          
          <div class="tenant-card-top">
            <div class="tenant-card-top-left">
              <div class="tenant-badge-pill">${initials}</div>
              <div>
                <div class="tenant-card-name">${this.escapeHTML(t.name)}</div>
                <div class="tenant-card-location">${this.escapeHTML(t.unit)}</div>
              </div>
            </div>
            <div class="tenant-card-top-right">
              ${statusBadge}
              <div class="tenant-action-menu-wrap">
                <button type="button" class="tenant-card-menu-btn" aria-label="Store quick actions" onclick="event.stopPropagation(); MallApp.toggleTenantCardMenu(event, '${t.id}')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="1.5"></circle>
                    <circle cx="19" cy="12" r="1.5"></circle>
                    <circle cx="5" cy="12" r="1.5"></circle>
                  </svg>
                </button>
                <div class="tenant-action-dropdown" id="tenantMenu-${t.id}" style="display: none;" onclick="event.stopPropagation()">
                  <button type="button" class="tenant-action-item" onclick="MallApp.openTenantDrawer('${t.id}'); MallApp.closeAllTenantMenus();">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    <span>View details</span>
                  </button>
                  <a href="tel:${t.phone || ''}" class="tenant-action-item" onclick="MallApp.closeAllTenantMenus()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    <span>Call manager</span>
                  </a>
                  <a href="mailto:${t.email || ''}" class="tenant-action-item" onclick="MallApp.closeAllTenantMenus()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    <span>Email manager</span>
                  </a>
                  <button type="button" class="tenant-action-item" onclick="MallApp.exportSingleStore('${t.id}', 'csv'); MallApp.closeAllTenantMenus();">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span>Export report (CSV)</span>
                  </button>
                  <button type="button" class="tenant-action-item" onclick="MallApp.exportSingleStore('${t.id}', 'pdf'); MallApp.closeAllTenantMenus();">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <span>Export report (PDF)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="tenant-card-category">${this.escapeHTML(t.category || 'Retail')}</div>

          ${isOffline ? `
            <div class="tenant-offline-strip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>POS offline since ${t.offlineSince || '14:20'}. Sales may be missing.</span>
            </div>
          ` : ''}

          <div class="tenant-card-metrics">
            <div>
              <div class="tenant-metric-label">Active Stock</div>
              <div class="tenant-metric-value">${this.escapeHTML(t.skus || (t.skuCount ? `${t.skuCount} SKUs` : 'N/A'))}</div>
            </div>
            <div style="text-align: right;">
              <div class="tenant-metric-label">Sales Today</div>
              <div class="tenant-sales-spark-wrap">
                <span class="tenant-metric-value" style="color: var(--success);">${this.formatCurrency(t.salesAmount || 0)}</span>
                ${this.renderTenantSparkline(t.sparkline, isOffline)}
              </div>
            </div>
          </div>

          <div class="tenant-stock-health-box">
            <div class="tenant-health-header">
              <span class="tenant-health-title">Stock health</span>
              <span class="tenant-health-pct" style="color: ${healthColor};">${health}%</span>
            </div>
            <div class="tenant-health-bar-track">
              <div class="tenant-health-bar-fill" style="width: ${health}%; background: ${healthColor};"></div>
            </div>
          </div>

          <div class="tenant-card-footer">
            <div class="tenant-footer-pos">
              <span class="tenant-dot ${dotClass}"></span>
              <span>POS synced ${this.escapeHTML(t.lastSync || 'Just now')}</span>
            </div>
            <div>Lease ends ${this.escapeHTML(t.leaseEnd || 'N/A')}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderTenantSparkline(sparkline = [20, 22, 21, 25, 24, 27, 26], isOffline = false) {
    if (!sparkline || sparkline.length < 2) return '';
    const min = Math.min(...sparkline);
    const max = Math.max(...sparkline);
    const range = (max - min) || 1;
    const w = 46;
    const h = 18;
    const step = w / (sparkline.length - 1);
    const points = sparkline.map((v, i) => {
      const x = (i * step).toFixed(1);
      const y = (h - ((v - min) / range) * (h - 4) - 2).toFixed(1);
      return `${x},${y}`;
    }).join(' ');

    const strokeColor = isOffline ? 'var(--danger)' : 'var(--accent)';
    return `
      <svg class="tenant-sparkline-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
        <polyline fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
      </svg>
    `;
  },

  renderTenantListView(items) {
    const listWrap = document.getElementById('tenantListContainer');
    if (!listWrap) return;

    listWrap.innerHTML = `
      <table class="tenant-table" aria-label="Tenant Stores Directory">
        <thead>
          <tr>
            <th onclick="MallApp.sortTenantTable('name')" title="Sort by Store">Store Name</th>
            <th onclick="MallApp.sortTenantTable('floor')" title="Sort by Floor">Floor</th>
            <th onclick="MallApp.sortTenantTable('category')" title="Sort by Category">Category</th>
            <th onclick="MallApp.sortTenantTable('stock')" title="Sort by Stock">Active SKUs</th>
            <th onclick="MallApp.sortTenantTable('sales')" title="Sort by Sales">Sales Today</th>
            <th onclick="MallApp.sortTenantTable('pos')" title="Sort by POS Status">POS Sync</th>
            <th onclick="MallApp.sortTenantTable('lease')" title="Sort by Lease End">Lease Ends</th>
            <th>Status</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(t => {
      const isOffline = t.posStatus === 'offline' || t.status === 'Offline';
      const isExpiring = !isOffline && (t.status === 'Lease Expiring' || this.isLeaseExpiringSoon(t.leaseEnd));

      let statusBadge = `<span class="status-pill pill-delivered">Active</span>`;
      if (isOffline) {
        statusBadge = `<span class="status-pill pill-cancelled">Offline</span>`;
      } else if (isExpiring) {
        statusBadge = `<span class="status-pill pill-delayed">Expiring</span>`;
      }

      const dotClass = isOffline ? 'dot-offline' : (t.posStatus === 'delayed' ? 'dot-delayed' : 'dot-online');
      const initials = t.name.replace(/[^A-Za-z0-9]/g, '').substring(0, 2).toUpperCase();

      return `
              <tr onclick="MallApp.openTenantDrawer('${t.id}')">
                <td>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="tenant-badge-pill" style="width: 32px; height: 32px; font-size: 0.78rem;">${initials}</div>
                    <div>
                      <div style="font-weight: 700; color: var(--text);">${this.escapeHTML(t.name)}</div>
                      <div style="font-size: 0.74rem; color: var(--text-muted);">${this.escapeHTML(t.unit)}</div>
                    </div>
                  </div>
                </td>
                <td><span style="font-weight: 500;">${this.escapeHTML(t.floor || 'Floor 1')}</span></td>
                <td><span style="font-size: 0.78rem; color: var(--accent); font-weight: 600;">${this.escapeHTML(t.category)}</span></td>
                <td><span style="font-weight: 600;">${this.escapeHTML(t.skus || `${t.skuCount} SKUs`)}</span></td>
                <td><span style="font-weight: 700; color: var(--success);">${this.formatCurrency(t.salesAmount || 0)}</span></td>
                <td>
                  <div style="display: flex; align-items: center; gap: 6px; font-size: 0.78rem;">
                    <span class="tenant-dot ${dotClass}"></span>
                    <span>${this.escapeHTML(t.posStatus ? t.posStatus.toUpperCase() : 'ONLINE')}</span>
                  </div>
                </td>
                <td><span style="font-size: 0.78rem; color: var(--text-muted);">${this.escapeHTML(t.leaseEnd || 'N/A')}</span></td>
                <td>${statusBadge}</td>
                <td style="text-align: right;" onclick="event.stopPropagation()">
                  <div class="tenant-action-menu-wrap" style="display: inline-block;">
                    <button type="button" class="tenant-card-menu-btn" aria-label="Row actions" onclick="event.stopPropagation(); MallApp.toggleTenantCardMenu(event, '${t.id}')">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <circle cx="12" cy="12" r="1.5"></circle>
                        <circle cx="19" cy="12" r="1.5"></circle>
                        <circle cx="5" cy="12" r="1.5"></circle>
                      </svg>
                    </button>
                    <div class="tenant-action-dropdown" id="tenantMenu-${t.id}" style="display: none;" onclick="event.stopPropagation()">
                      <button type="button" class="tenant-action-item" onclick="MallApp.openTenantDrawer('${t.id}'); MallApp.closeAllTenantMenus();">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <span>View details</span>
                      </button>
                      <a href="tel:${t.phone || ''}" class="tenant-action-item" onclick="MallApp.closeAllTenantMenus()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        <span>Call manager</span>
                      </a>
                      <a href="mailto:${t.email || ''}" class="tenant-action-item" onclick="MallApp.closeAllTenantMenus()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        <span>Email manager</span>
                      </a>
                      <button type="button" class="tenant-action-item" onclick="MallApp.exportSingleStore('${t.id}', 'csv'); MallApp.closeAllTenantMenus();">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <span>Export report (CSV)</span>
                      </button>
                      <button type="button" class="tenant-action-item" onclick="MallApp.exportSingleStore('${t.id}', 'pdf'); MallApp.closeAllTenantMenus();">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        <span>Export report (PDF)</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            `;
    }).join('')}
        </tbody>
      </table>
    `;
  },

  sortTenantTable(col) {
    if (col === 'name') {
      this._tenantSort = this._tenantSort === 'name-asc' ? 'name-desc' : 'name-asc';
    } else if (col === 'sales') {
      this._tenantSort = this._tenantSort === 'sales-desc' ? 'sales-asc' : 'sales-desc';
    } else if (col === 'stock') {
      this._tenantSort = this._tenantSort === 'stock-desc' ? 'stock-asc' : 'stock-desc';
    } else if (col === 'lease') {
      this._tenantSort = this._tenantSort === 'lease-asc' ? 'lease-desc' : 'lease-asc';
    } else {
      this._tenantSort = 'name-asc';
    }

    const sortFilter = document.getElementById('tenantSortFilter');
    if (sortFilter) {
      if (['name-asc', 'sales-desc', 'stock-desc', 'lease-asc'].includes(this._tenantSort)) {
        sortFilter.value = this._tenantSort;
      }
    }

    this.renderTenantCards();
  },

  renderTenantPagination(totalItems, startIndex, pageSize, totalPages) {
    const bar = document.getElementById('tenantPaginationBar');
    if (!bar) return;

    if (totalItems <= pageSize && totalPages <= 1) {
      bar.innerHTML = `
        <div class="tenant-showing-text">Showing all ${totalItems} stores</div>
        <div class="tenant-page-controls">
          <label style="font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
            Per page:
            <select class="tenant-page-size-select" onchange="MallApp.setTenantPageSize(Number(this.value))">
              <option value="12" ${pageSize === 12 ? 'selected' : ''}>12</option>
              <option value="24" ${pageSize === 24 ? 'selected' : ''}>24</option>
              <option value="48" ${pageSize === 48 ? 'selected' : ''}>48</option>
            </select>
          </label>
        </div>
      `;
      return;
    }

    const endIdx = Math.min(startIndex + pageSize, totalItems);

    let pagesHtml = '';
    for (let p = 1; p <= totalPages; p++) {
      pagesHtml += `
        <button type="button" class="tenant-page-btn ${p === this._tenantPage ? 'active' : ''}" onclick="MallApp.setTenantPage(${p})">
          ${p}
        </button>
      `;
    }

    bar.innerHTML = `
      <div class="tenant-showing-text">
        Showing <b>${startIndex + 1}–${endIdx}</b> of <b>${totalItems}</b> stores
      </div>
      <div class="tenant-page-controls">
        <label style="font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-right: 8px;">
          Per page:
          <select class="tenant-page-size-select" onchange="MallApp.setTenantPageSize(Number(this.value))">
            <option value="12" ${pageSize === 12 ? 'selected' : ''}>12</option>
            <option value="24" ${pageSize === 24 ? 'selected' : ''}>24</option>
            <option value="48" ${pageSize === 48 ? 'selected' : ''}>48</option>
          </select>
        </label>
        <button type="button" class="tenant-page-btn" ${this._tenantPage === 1 ? 'disabled' : ''} onclick="MallApp.setTenantPage(${this._tenantPage - 1})">
          Previous
        </button>
        ${pagesHtml}
        <button type="button" class="tenant-page-btn" ${this._tenantPage === totalPages ? 'disabled' : ''} onclick="MallApp.setTenantPage(${this._tenantPage + 1})">
          Next
        </button>
      </div>
    `;
  },

  setTenantPage(page) {
    this._tenantPage = page;
    this.renderTenantCards();
    const panel = document.getElementById('view-tenants');
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  setTenantPageSize(size) {
    this._tenantPageSize = size || 12;
    this._tenantPage = 1;
    this.renderTenantCards();
  },

  toggleTenantCardMenu(event, id) {
    event.stopPropagation();
    const menu = document.getElementById(`tenantMenu-${id}`);
    const isCurrentlyOpen = menu && menu.style.display === 'flex';

    this.closeAllTenantMenus();

    if (menu && !isCurrentlyOpen) {
      menu.style.display = 'flex';
      this._activeTenantMenuId = id;
    }
  },

  closeAllTenantMenus() {
    document.querySelectorAll('.tenant-action-dropdown').forEach(d => {
      d.style.display = 'none';
    });
    this._activeTenantMenuId = null;
  },

  renderTenantSkeletons() {
    const grid = document.getElementById('tenantCardsGrid');
    const listWrap = document.getElementById('tenantListContainer');
    if (grid) {
      grid.innerHTML = Array(6).fill(0).map(() => `
        <div class="tenant-clean-card" style="pointer-events: none;">
          <div class="tenant-card-top" style="justify-content: space-between;">
            <div class="skeleton-shimmer skeleton-circle" style="width: 40px; height: 40px; border-radius: 10px;"></div>
            <div class="skeleton-shimmer skeleton-pill" style="width: 70px;"></div>
          </div>
          <div class="skeleton-shimmer skeleton-bar" style="width: 140px; height: 16px; margin: 12px 0 6px 0;"></div>
          <div class="skeleton-shimmer skeleton-bar" style="width: 190px; height: 12px; margin-bottom: 16px;"></div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border); padding-top: 10px; margin-bottom: 12px;">
            <div class="skeleton-shimmer skeleton-bar" style="width: 65px; height: 18px;"></div>
            <div class="skeleton-shimmer skeleton-bar" style="width: 75px; height: 18px;"></div>
          </div>
          <div class="skeleton-shimmer skeleton-bar" style="width: 100%; height: 6px; border-radius: 999px; margin-bottom: 12px;"></div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border); padding-top: 10px;">
            <div class="skeleton-shimmer skeleton-bar" style="width: 90px; height: 12px;"></div>
            <div class="skeleton-shimmer skeleton-bar" style="width: 80px; height: 12px;"></div>
          </div>
        </div>
      `).join('');
    }
    if (listWrap && this._tenantViewMode === 'list') {
      listWrap.innerHTML = `
        <table class="tenant-table">
          <tbody>
            ${Array(6).fill(0).map(() => `
              <tr class="skeleton-row">
                <td><div class="skeleton-shimmer skeleton-bar" style="width: 140px; height: 16px;"></div></td>
                <td><div class="skeleton-shimmer skeleton-bar" style="width: 70px; height: 14px;"></div></td>
                <td><div class="skeleton-shimmer skeleton-bar" style="width: 90px; height: 14px;"></div></td>
                <td><div class="skeleton-shimmer skeleton-bar" style="width: 60px; height: 14px;"></div></td>
                <td><div class="skeleton-shimmer skeleton-bar" style="width: 70px; height: 14px;"></div></td>
                <td><div class="skeleton-shimmer skeleton-pill" style="width: 70px;"></div></td>
                <td><div class="skeleton-shimmer skeleton-bar" style="width: 80px; height: 14px;"></div></td>
                <td><div class="skeleton-shimmer skeleton-pill" style="width: 60px;"></div></td>
                <td><div class="skeleton-shimmer skeleton-circle" style="width: 24px; height: 24px; margin-left: auto;"></div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  },

  retryTenantLoad() {
    this._tenantError = null;
    this._tenantLoading = true;
    this.renderTenantSkeletons();
    setTimeout(() => {
      this._tenantLoading = false;
      this.renderTenantCards();
      this.showToast('Tenant store telemetry reconnected', 'success');
    }, 400);
  },

  // --------------------------------------------------------
  // TENANT STORE DETAIL DRAWER IMPLEMENTATION
  // --------------------------------------------------------

  openTenantDrawer(id) {
    const store = (MallState.tenants || []).find(t => t.id === id);
    if (!store) {
      this.showToast('Store details not found', 'error');
      return;
    }

    this._activeTenantDetailId = id;

    const drawer = document.getElementById('tenantDetailDrawer');
    const backdrop = document.getElementById('tenantDrawerBackdrop');
    const titleEl = document.getElementById('tenantDrawerTitle');
    const locationEl = document.getElementById('tenantDrawerLocation');
    const statusBadgeEl = document.getElementById('tenantDrawerStatusBadge');
    const bodyEl = document.getElementById('tenantDrawerBody');
    const footerEl = document.getElementById('tenantDrawerFooter');

    if (!drawer || !backdrop || !titleEl || !locationEl || !bodyEl || !footerEl) return;

    titleEl.textContent = store.name;
    locationEl.textContent = `${store.floor || 'Floor 1'} · ${store.unit || 'Unit #'} · ${store.category || 'Retail'}`;

    const isOffline = store.posStatus === 'offline' || store.status === 'Offline';
    const isExpiring = !isOffline && (store.status === 'Lease Expiring' || this.isLeaseExpiringSoon(store.leaseEnd));
    let badgeHtml = `<span class="status-pill pill-delivered">Active Lease</span>`;
    if (isOffline) {
      badgeHtml = `<span class="status-pill pill-cancelled">POS Offline</span>`;
    } else if (isExpiring) {
      badgeHtml = `<span class="status-pill pill-delayed">Lease Expiring Soon</span>`;
    }
    if (statusBadgeEl) statusBadgeEl.innerHTML = badgeHtml;

    // Related low-stock items from inventory
    const lowStockItems = (MallState.products || [])
      .filter(p => p.tenant === store.name)
      .sort((a, b) => (a.stock / (a.minBuffer || 1)) - (b.stock / (b.minBuffer || 1)))
      .slice(0, 5);

    // Build Drawer Body with 5 Sections
    bodyEl.innerHTML = `
      <!-- SECTION 1: STORE CONTACT & MANAGER -->
      <div class="tenant-drawer-section">
        <div class="tenant-drawer-section-title">
          <span>Store Management & Contact</span>
          <span style="font-size: 0.7rem; color: var(--text-muted);">${this.escapeHTML(store.contact || '')}</span>
        </div>
        <div class="tenant-drawer-contact-card">
          <div class="tenant-drawer-contact-avatar">
            ${store.manager ? store.manager.substring(0, 2).toUpperCase() : 'SM'}
          </div>
          <div>
            <div style="font-weight: 700; color: var(--text); font-size: 0.95rem;">${this.escapeHTML(store.manager || 'Store Manager')}</div>
            <div style="font-size: 0.76rem; color: var(--text-muted);">Lead Tenant Store Representative</div>
          </div>
        </div>
        <div class="tenant-drawer-kpi-grid" style="margin-bottom: 12px;">
          <div class="tenant-drawer-kpi">
            <div class="tenant-drawer-kpi-label">Phone Direct</div>
            <a href="tel:${store.phone || ''}" style="font-size: 0.82rem; color: var(--accent); font-weight: 600; text-decoration: none;">
              ${this.escapeHTML(store.phone || 'N/A')}
            </a>
          </div>
          <div class="tenant-drawer-kpi">
            <div class="tenant-drawer-kpi-label">Official Email</div>
            <a href="mailto:${store.email || ''}" style="font-size: 0.82rem; color: var(--accent); font-weight: 600; text-decoration: none; overflow: hidden; text-overflow: ellipsis; display: block;">
              ${this.escapeHTML(store.email || 'N/A')}
            </a>
          </div>
        </div>
        <div class="tenant-drawer-contact-actions">
          <a href="tel:${store.phone || ''}" class="tenant-drawer-action-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            <span>Call Manager</span>
          </a>
          <a href="mailto:${store.email || ''}" class="tenant-drawer-action-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <span>Email Manager</span>
          </a>
        </div>
      </div>

      <!-- SECTION 2: LEASE & BILLING COMPLIANCE -->
      <div class="tenant-drawer-section">
        <div class="tenant-drawer-section-title">
          <span>Lease Agreement & Billing</span>
          <span class="status-pill ${store.rentStatus === 'Overdue' ? 'pill-cancelled' : 'pill-delivered'}">
            ${store.rentStatus === 'Overdue' ? 'Rent Overdue' : 'Rent Paid'}
          </span>
        </div>
        <div class="tenant-drawer-kpi-grid">
          <div class="tenant-drawer-kpi">
            <div class="tenant-drawer-kpi-label">Lease Effective Term</div>
            <div class="tenant-drawer-kpi-value" style="font-size: 0.85rem;">${this.escapeHTML(store.leaseStart || '01 Jan 2024')} – ${this.escapeHTML(store.leaseEnd || '31 Dec 2028')}</div>
          </div>
          <div class="tenant-drawer-kpi">
            <div class="tenant-drawer-kpi-label">Monthly Base Rent</div>
            <div class="tenant-drawer-kpi-value" style="color: ${store.rentStatus === 'Overdue' ? 'var(--danger)' : 'var(--text)'};">
              ${this.formatCurrency(store.monthlyRent || 0)}
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 3: POS TELEMETRY & HARDWARE -->
      <div class="tenant-drawer-section">
        <div class="tenant-drawer-section-title">
          <span>POS Hardware & Telemetry Health</span>
          <span style="font-size: 0.72rem; color: var(--text-muted);">${store.terminals || 4} Active Terminals</span>
        </div>
        ${isOffline ? `
          <div class="tenant-offline-strip" style="margin-bottom: 12px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>POS terminal stream offline since ${store.offlineSince || '14:20'}. Telemetry packets queued locally.</span>
          </div>
        ` : ''}
        <div class="tenant-drawer-kpi-grid">
          <div class="tenant-drawer-kpi">
            <div class="tenant-drawer-kpi-label">Sync Connection</div>
            <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.85rem;">
              <span class="tenant-dot ${isOffline ? 'dot-offline' : (store.posStatus === 'delayed' ? 'dot-delayed' : 'dot-online')}"></span>
              <span>${String(store.posStatus || 'online').toUpperCase()}</span>
            </div>
          </div>
          <div class="tenant-drawer-kpi">
            <div class="tenant-drawer-kpi-label">Last Successful Heartbeat</div>
            <div class="tenant-drawer-kpi-value" style="font-size: 0.85rem;">${this.escapeHTML(store.lastSync || '4 min ago')}</div>
          </div>
        </div>
      </div>

      <!-- SECTION 4: SALES PERFORMANCE & 7-DAY MINI CHART -->
      <div class="tenant-drawer-section">
        <div class="tenant-drawer-section-title">
          <span>Today's Sales Performance</span>
          <span style="color: var(--success); font-weight: 700;">${store.changePct !== undefined ? (store.changePct >= 0 ? `+${store.changePct}%` : `${store.changePct}%`) : '+12.5%'}</span>
        </div>
        <div class="tenant-drawer-kpi-grid" style="margin-bottom: 14px;">
          <div class="tenant-drawer-kpi">
            <div class="tenant-drawer-kpi-label">Gross Revenue Today</div>
            <div class="tenant-drawer-kpi-value" style="color: var(--success);">${this.formatCurrency(store.salesAmount || 0)}</div>
          </div>
          <div class="tenant-drawer-kpi">
            <div class="tenant-drawer-kpi-label">Retail Units Sold</div>
            <div class="tenant-drawer-kpi-value">${store.unitsSold || 0} items</div>
          </div>
        </div>
        <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
          7-Day Sales Velocity (Mon – Sun)
        </div>
        ${this.renderTenantDrawerMiniChart(store.sparkline, store.salesAmount)}
      </div>

      <!-- SECTION 5: LOW-STOCK INVENTORY ALERTS (TOP 5) -->
      <div class="tenant-drawer-section">
        <div class="tenant-drawer-section-title">
          <span>Priority Low-Stock Alerts (Top 5)</span>
          <span style="font-size: 0.72rem; color: var(--text-muted);">Live SKU telemetry</span>
        </div>
        ${lowStockItems.length ? `
          <div class="tenant-drawer-items-list">
            ${lowStockItems.map(item => `
              <div class="tenant-drawer-item-card">
                <div style="flex: 1; min-width: 0; padding-right: 8px;">
                  <div style="font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${this.escapeHTML(item.name)}
                  </div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">
                    ${item.sku} · Stock: <b style="color: ${item.stock <= item.minBuffer ? 'var(--danger)' : 'var(--text)'};">${item.stock}</b> / Buffer: ${item.minBuffer}
                  </div>
                </div>
                <button type="button" class="btn-table-action" style="padding: 4px 8px; font-size: 0.72rem; white-space: nowrap;" onclick="MallApp.filterInventoryByStore('${this.escapeHTML(store.name)}', '${item.sku}')">
                  Filter in Inventory
                </button>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="font-size: 0.8rem; color: var(--text-muted); padding: 8px 0;">
            All inventory SKUs for ${this.escapeHTML(store.name)} are currently well above safety replenishment buffer levels.
          </div>
        `}
      </div>
    `;

    // Footer Buttons
    footerEl.innerHTML = `
      <button type="button" class="btn-table-action" style="padding: 8px 16px; font-size: 0.82rem;" onclick="MallApp.exportSingleStore('${store.id}', 'pdf')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; display: inline-block; vertical-align: middle;">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download Report
      </button>
      <button type="button" class="tenant-drawer-action-btn primary" onclick="MallApp.closeTenantDrawer()">
        Close
      </button>
    `;

    drawer.classList.add('open');
    backdrop.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    this.setOverlayOpen(true);

    drawer.focus();
  },

  closeTenantDrawer() {
    const drawer = document.getElementById('tenantDetailDrawer');
    const backdrop = document.getElementById('tenantDrawerBackdrop');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    }
    if (backdrop) backdrop.classList.remove('open');

    this._activeTenantDetailId = null;
    this.setOverlayOpen(false);
  },

  renderTenantDrawerMiniChart(sparkline = [20, 22, 21, 25, 24, 27, 26], salesAmount = 10000) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxVal = Math.max(...sparkline) || 1;

    return `
      <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; height: 90px; padding: 10px 8px 4px 8px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px;">
        ${sparkline.map((val, idx) => {
      const heightPct = Math.round((val / maxVal) * 65) + 15;
      const isToday = idx === sparkline.length - 1;
      const barBg = isToday ? 'var(--accent)' : 'var(--border)';
      return `
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end;">
              <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 600;">${val}</span>
              <div style="width: 100%; max-width: 24px; height: ${heightPct}%; background: ${barBg}; border-radius: 4px 4px 0 0; transition: height 0.3s;"></div>
              <span style="font-size: 0.68rem; color: ${isToday ? 'var(--accent)' : 'var(--text-muted)'}; font-weight: ${isToday ? '700' : '500'};">${days[idx] || ''}</span>
            </div>
          `;
    }).join('')}
      </div>
    `;
  },

  filterInventoryByStore(storeName, sku) {
    this.closeTenantDrawer();
    this.switchView('inventory');

    const searchInput = document.getElementById('inventorySearchInput');
    if (searchInput) {
      searchInput.value = sku || storeName;
    }

    this._invPage = 1;
    this.renderInventoryTable();
    this.showToast(`Filtered inventory by ${storeName}${sku ? ` (${sku})` : ''}`, 'info');
  },

  exportSingleStore(id, format = 'csv') {
    const store = (MallState.tenants || []).find(t => t.id === id);
    if (!store) {
      this.showToast('Store not found for export', 'error');
      return;
    }

    const columns = [
      { key: 'name', label: 'Store Name' },
      { key: 'category', label: 'Category' },
      { key: 'floor', label: 'Floor' },
      { key: 'unit', label: 'Unit Location' },
      { key: 'manager', label: 'Manager Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'skuCount', label: 'Active SKUs', excelType: 'number' },
      { key: 'salesAmount', label: 'Sales Today', format: v => this.formatCurrency(v), excelType: 'number' },
      { key: 'unitsSold', label: 'Units Sold', excelType: 'number' },
      { key: 'stockHealth', label: 'Stock Health %', format: v => `${v}%`, excelType: 'number' },
      { key: 'posStatus', label: 'POS Status', format: v => String(v || '').toUpperCase() },
      { key: 'lastSync', label: 'Last Sync' },
      { key: 'status', label: 'Status' },
      { key: 'leaseStart', label: 'Lease Start' },
      { key: 'leaseEnd', label: 'Lease End' },
      { key: 'monthlyRent', label: 'Monthly Rent', format: v => this.formatCurrency(v), excelType: 'number' },
      { key: 'rentStatus', label: 'Rent Status' }
    ];

    const cleanName = store.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `${cleanName}_summary_report.${format}`;

    try {
      if (format === 'pdf') {
        exportToPDF(`${store.name} Store Summary Report`, [store], columns, filename);
        this.showToast(`${store.name} report exported as PDF`, 'success');
      } else {
        exportToCSV([store], columns, filename);
        this.showToast(`${store.name} report exported as CSV`, 'success');
      }
    } catch (err) {
      console.error('Failed to export store:', err);
      this.showToast(`Export failed: ${err.message}`, 'error');
    }
  },

  // --------------------------------------------------------
  // ONBOARD NEW TENANT MODAL IMPLEMENTATION
  // --------------------------------------------------------

  openOnboardTenantModal() {
    const modal = document.getElementById('onboardTenantModal');
    if (!modal) return;

    const form = document.getElementById('onboardTenantForm');
    if (form) form.reset();

    // Clear inline error texts and styles
    modal.querySelectorAll('.field-error-text').forEach(el => {
      el.textContent = '';
      el.classList.remove('visible');
    });
    modal.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));

    const submitBtn = document.getElementById('onboardSubmitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
      submitBtn.style.cursor = 'not-allowed';
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    this.setOverlayOpen(true);

    const firstInput = document.getElementById('onboardStoreName');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  },

  closeOnboardTenantModal() {
    const modal = document.getElementById('onboardTenantModal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
    this.setOverlayOpen(false);
  },

  bindOnboardTenantValidation() {
    const form = document.getElementById('onboardTenantForm');
    if (!form) return;

    const fields = [
      'onboardStoreName',
      'onboardCategory',
      'onboardFloor',
      'onboardUnit',
      'onboardManager',
      'onboardPhone',
      'onboardEmail',
      'onboardLeaseStart',
      'onboardLeaseEnd',
      'onboardMonthlyRent'
    ];

    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.validateOnboardTenantForm());
        el.addEventListener('blur', () => this.validateOnboardTenantForm());
      }
    });
  },

  validateOnboardTenantForm() {
    const nameEl = document.getElementById('onboardStoreName');
    const catEl = document.getElementById('onboardCategory');
    const floorEl = document.getElementById('onboardFloor');
    const unitEl = document.getElementById('onboardUnit');
    const mgrEl = document.getElementById('onboardManager');
    const phoneEl = document.getElementById('onboardPhone');
    const emailEl = document.getElementById('onboardEmail');
    const startEl = document.getElementById('onboardLeaseStart');
    const endEl = document.getElementById('onboardLeaseEnd');
    const rentEl = document.getElementById('onboardMonthlyRent');
    const submitBtn = document.getElementById('onboardSubmitBtn');

    let isValid = true;

    const setError = (el, errorId, msg) => {
      const errEl = document.getElementById(errorId);
      if (msg) {
        isValid = false;
        if (el) el.classList.add('has-error');
        if (errEl) {
          errEl.textContent = msg;
          errEl.classList.add('visible');
        }
      } else {
        if (el) el.classList.remove('has-error');
        if (errEl) {
          errEl.textContent = '';
          errEl.classList.remove('visible');
        }
      }
    };

    // Store Name: required, min 2 chars, unique
    const nameVal = (nameEl ? nameEl.value : '').trim();
    if (!nameVal) {
      setError(nameEl, 'onboardStoreNameError', 'Store name is required');
    } else if (nameVal.length < 2) {
      setError(nameEl, 'onboardStoreNameError', 'Must be at least 2 characters');
    } else if ((MallState.tenants || []).some(t => t.name.toLowerCase() === nameVal.toLowerCase())) {
      setError(nameEl, 'onboardStoreNameError', 'A store with this name already exists');
    } else {
      setError(nameEl, 'onboardStoreNameError', '');
    }

    // Unit: required
    const unitVal = (unitEl ? unitEl.value : '').trim();
    if (!unitVal) {
      setError(unitEl, 'onboardUnitError', 'Unit number or zone is required');
    } else {
      setError(unitEl, 'onboardUnitError', '');
    }

    // Manager: required
    const mgrVal = (mgrEl ? mgrEl.value : '').trim();
    if (!mgrVal) {
      setError(mgrEl, 'onboardManagerError', 'Manager name is required');
    } else if (mgrVal.length < 2) {
      setError(mgrEl, 'onboardManagerError', 'Must be at least 2 characters');
    } else {
      setError(mgrEl, 'onboardManagerError', '');
    }

    // Phone: required, valid phone
    const phoneVal = (phoneEl ? phoneEl.value : '').trim();
    const phoneRegex = /^[\d\s\+\-\(\)]{7,20}$/;
    if (!phoneVal) {
      setError(phoneEl, 'onboardPhoneError', 'Contact phone number is required');
    } else if (!phoneRegex.test(phoneVal)) {
      setError(phoneEl, 'onboardPhoneError', 'Enter a valid telephone number (e.g. +1 555-234-5678)');
    } else {
      setError(phoneEl, 'onboardPhoneError', '');
    }

    // Email: required, valid email
    const emailVal = (emailEl ? emailEl.value : '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal) {
      setError(emailEl, 'onboardEmailError', 'Manager email address is required');
    } else if (!emailRegex.test(emailVal)) {
      setError(emailEl, 'onboardEmailError', 'Enter a valid email address');
    } else {
      setError(emailEl, 'onboardEmailError', '');
    }

    // Lease Start Date
    const startVal = startEl ? startEl.value : '';
    if (!startVal) {
      setError(startEl, 'onboardLeaseStartError', 'Lease start date is required');
    } else {
      setError(startEl, 'onboardLeaseStartError', '');
    }

    // Lease End Date
    const endVal = endEl ? endEl.value : '';
    if (!endVal) {
      setError(endEl, 'onboardLeaseEndError', 'Lease end date is required');
    } else if (startVal && new Date(endVal) <= new Date(startVal)) {
      setError(endEl, 'onboardLeaseEndError', 'End date must be after start date');
    } else {
      setError(endEl, 'onboardLeaseEndError', '');
    }

    // Monthly Rent: number >= 100
    const rentVal = parseFloat(rentEl ? rentEl.value : '');
    if (isNaN(rentVal) || rentVal < 100) {
      setError(rentEl, 'onboardMonthlyRentError', 'Enter monthly rent (minimum $100)');
    } else {
      setError(rentEl, 'onboardMonthlyRentError', '');
    }

    if (submitBtn) {
      submitBtn.disabled = !isValid;
      submitBtn.style.opacity = isValid ? '1' : '0.5';
      submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }

    return isValid;
  },

  submitOnboardTenant(event) {
    if (event) event.preventDefault();

    if (!this.validateOnboardTenantForm()) {
      this.showToast('Please resolve all form errors before submitting', 'warning');
      return;
    }

    const nameVal = document.getElementById('onboardStoreName').value.trim();
    const catVal = document.getElementById('onboardCategory').value;
    const floorVal = document.getElementById('onboardFloor').value;
    const unitVal = document.getElementById('onboardUnit').value.trim();
    const mgrVal = document.getElementById('onboardManager').value.trim();
    const phoneVal = document.getElementById('onboardPhone').value.trim();
    const emailVal = document.getElementById('onboardEmail').value.trim();
    const startVal = document.getElementById('onboardLeaseStart').value;
    const endVal = document.getElementById('onboardLeaseEnd').value;
    const rentVal = parseFloat(document.getElementById('onboardMonthlyRent').value) || 5000;

    const formatDateStr = (dStr) => {
      if (!dStr) return 'N/A';
      const d = new Date(dStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    const newTenant = {
      id: `ten-${Date.now()}`,
      name: nameVal,
      unit: `${unitVal}, ${floorVal}`,
      floor: floorVal,
      category: catVal,
      department: `${catVal} Department`,
      skus: '120 SKUs',
      skuCount: 120,
      stockHealth: 100,
      salesToday: '$0',
      salesAmount: 0,
      unitsSold: 0,
      turnoverRate: 0,
      changePct: 0,
      sparkline: [12, 14, 15, 14, 16, 18, 20],
      posStatus: 'online',
      lastSync: 'Just now',
      manager: mgrVal,
      phone: phoneVal,
      email: emailVal,
      contact: phoneVal,
      status: 'Active',
      leaseStart: formatDateStr(startVal),
      leaseEnd: formatDateStr(endVal),
      monthlyRent: rentVal,
      rentStatus: 'Paid',
      terminals: 2,
      offlineSince: null
    };

    MallState.tenants.unshift(newTenant);

    this.closeOnboardTenantModal();
    this.showToast(`Retail store "${nameVal}" onboarded successfully!`, 'success');

    this.renderTenantDirectory();
  },

  // ========================================================
  // DATA EXPORT SYSTEM & EXPORT CENTER IMPLEMENTATION
  // ========================================================

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
      getData: () => this.getFilteredTenants(),
      getAllData: () => [...MallState.tenants],
      columns: [
        { key: 'name', label: 'Store Name' },
        { key: 'category', label: 'Category' },
        { key: 'floor', label: 'Floor' },
        { key: 'unit', label: 'Unit' },
        { key: 'manager', label: 'Store Manager' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'skuCount', label: 'Active SKUs', excelType: 'number' },
        { key: 'salesAmount', label: 'Sales Today', format: val => this.formatCurrency(val), excelType: 'number' },
        { key: 'unitsSold', label: 'Units Sold', excelType: 'number' },
        { key: 'stockHealth', label: 'Stock Health %', format: val => `${val}%`, excelType: 'number' },
        { key: 'posStatus', label: 'POS Status', format: val => String(val || '').toUpperCase() },
        { key: 'lastSync', label: 'Last POS Sync' },
        { key: 'status', label: 'Status' },
        { key: 'leaseEnd', label: 'Lease Expiration' },
        { key: 'monthlyRent', label: 'Monthly Rent', format: val => this.formatCurrency(val), excelType: 'number' },
        { key: 'rentStatus', label: 'Rent Status' }
      ],
      getSummaryRow: (rows) => {
        const totalSales = rows.reduce((sum, r) => sum + (r.salesAmount || 0), 0);
        return {
          name: 'TOTALS',
          category: '',
          floor: '',
          unit: `${rows.length} Stores`,
          manager: '',
          phone: '',
          email: '',
          skuCount: rows.reduce((sum, r) => sum + (r.skuCount || 0), 0),
          salesAmount: this.formatCurrency(totalSales),
          unitsSold: rows.reduce((sum, r) => sum + (r.unitsSold || 0), 0),
          stockHealth: '',
          posStatus: '',
          lastSync: '',
          status: '',
          leaseEnd: '',
          monthlyRent: '',
          rentStatus: ''
        };
      }
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
    this.renderHeaderActions(MallState.activeView);
  },

  renderHeaderExportButton(viewName = MallState.activeView) {
    this.renderHeaderActions(viewName);
  },

  renderHeaderActions(viewName = MallState.activeView) {
    const exportWrap = document.getElementById('headerExportBtnWrap');
    const primaryWrap = document.getElementById('headerPrimaryActionWrap');
    if (!exportWrap || !primaryWrap) return;

    // 1. Single Export Button in Header
    if (viewName === 'profile') {
      exportWrap.innerHTML = `
        <button type="button" class="btn-export-profile-data" onclick="MallApp.exportProfileData('json')" aria-label="Export my data">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Export my data</span>
        </button>
      `;
    } else if (viewName === 'export' || viewName === 'copilot') {
      exportWrap.innerHTML = '';
    } else {
      let config = null;
      if (viewName === 'inventory') config = this.getInventoryExportConfig();
      else if (viewName === 'reorder') config = this.getReorderExportConfig();
      else if (viewName === 'sales') config = this.getSalesExportConfig();
      else if (viewName === 'staff') config = this.getStaffExportConfig();
      else if (viewName === 'tenants') config = this.getTenantsExportConfig();
      else config = this.getInventoryExportConfig(); // default for dashboard

      if (config) {
        this.renderExportDropdown('headerExportBtnWrap', config);
      }
    }

    // 2. Page-Specific Primary Action Button in Header (Single icon + no "+" character in label)
    if (viewName === 'dashboard') {
      primaryWrap.innerHTML = `
        <button type="button" class="btn-header-primary-action" id="headerPrimaryActionBtn" onclick="MallApp.openProductModal()" aria-label="Create New Order">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Create New Order</span>
        </button>
      `;
    } else if (viewName === 'inventory') {
      primaryWrap.innerHTML = `
        <button type="button" class="btn-header-primary-action" id="headerPrimaryActionBtn" onclick="MallApp.openProductModal()" aria-label="Add SKU Product">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Add SKU Product</span>
        </button>
      `;
    } else if (viewName === 'reorder') {
      primaryWrap.innerHTML = `
        <button type="button" class="btn-header-primary-action" id="headerPrimaryActionBtn" onclick="MallApp.openBatchReorderModal()" aria-label="Batch Reorder All Low Stock">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-.57-8.38l5.67-5.67"></path>
          </svg>
          <span>Batch Reorder All Low Stock</span>
        </button>
      `;
    } else if (viewName === 'staff') {
      primaryWrap.innerHTML = `
        <button type="button" class="btn-header-primary-action" id="headerPrimaryActionBtn" onclick="MallApp.showToast('Staff schedule dispatch active', 'info')" aria-label="Schedule Staff">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Schedule Staff</span>
        </button>
      `;
    } else if (viewName === 'tenants') {
      primaryWrap.innerHTML = `
        <button type="button" class="btn-header-primary-action" id="headerPrimaryActionBtn" onclick="MallApp.openOnboardTenantModal()" aria-label="Onboard Tenant">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Onboard Tenant</span>
        </button>
      `;
    } else {
      // Manage Sales (Export only!), Export Center, Copilot: No primary action button
      primaryWrap.innerHTML = '';
    }
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
      btnUSD.style.borderColor = isINR ? 'var(--border)' : 'var(--accent)';
      btnUSD.style.background = isINR ? 'var(--surface)' : 'var(--accent-soft)';
      btnUSD.style.color = isINR ? 'var(--text-muted)' : 'var(--accent)';

      btnINR.style.borderColor = isINR ? 'var(--accent)' : 'var(--border)';
      btnINR.style.background = isINR ? 'var(--accent-soft)' : 'var(--surface)';
      btnINR.style.color = isINR ? 'var(--accent)' : 'var(--text-muted)';
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

  showToast(msg, type = 'info', opts = {}) {
    return ToastProvider.show(msg, type, opts);
  },

  // ========================================================
  // GLOBAL UX: LOADING STATES, SKELETONS & ERROR BANNER
  // ========================================================
  simulateRefresh(duration = 600, callback) {
    MallState.isLoading = true;
    this.renderSkeletons();

    const refreshBtn = document.getElementById('headerRefreshDataBtn');
    if (refreshBtn) refreshBtn.classList.add('is-refreshing');

    setTimeout(() => {
      MallState.isLoading = false;
      if (refreshBtn) refreshBtn.classList.remove('is-refreshing');
      this.renderAll();
      if (callback) {
        callback();
      } else {
        this.showToast('Telemetry synchronized (600ms latency)', 'success');
      }
    }, duration);
  },

  renderSkeletons() {
    const invBody = document.getElementById('inventoryTableBody');
    if (invBody) {
      invBody.innerHTML = Array(6).fill(0).map(() => `
        <tr class="skeleton-row">
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 18px; height: 18px; border-radius: 4px;"></div></td>
          <td>
            <div style="display: flex; gap: 10px; align-items: center;">
              <div class="skeleton-shimmer skeleton-circle"></div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div class="skeleton-shimmer skeleton-bar" style="width: 140px; height: 13px;"></div>
                <div class="skeleton-shimmer skeleton-bar" style="width: 90px; height: 10px;"></div>
              </div>
            </div>
          </td>
          <td><div class="skeleton-shimmer skeleton-pill"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 110px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-pill" style="width: 80px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 50px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 40px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 65px;"></div></td>
          <td style="text-align: right;"><div class="skeleton-shimmer skeleton-pill" style="width: 75px; margin-left: auto;"></div></td>
        </tr>
      `).join('');
    }

    const reorderBody = document.getElementById('purchaseOrdersTableBody');
    if (reorderBody) {
      reorderBody.innerHTML = Array(4).fill(0).map(() => `
        <tr class="skeleton-row">
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 85px; height: 16px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 130px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 120px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 100px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 80px; height: 16px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-pill"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 90px; height: 12px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 90px; height: 12px;"></div></td>
          <td style="text-align: right;"><div class="skeleton-shimmer skeleton-pill" style="width: 70px; margin-left: auto;"></div></td>
        </tr>
      `).join('');
    }

    const salesBody = document.getElementById('salesLeaderboardBody');
    if (salesBody) {
      salesBody.innerHTML = Array(6).fill(0).map(() => `
        <tr class="skeleton-row">
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 32px; height: 16px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 120px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 140px; height: 12px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 60px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 80px; height: 16px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 50px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-pill"></div></td>
        </tr>
      `).join('');
    }

    const staffBody = document.getElementById('staffTableBody');
    if (staffBody) {
      staffBody.innerHTML = Array(6).fill(0).map(() => `
        <tr class="skeleton-row">
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 130px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 80px; height: 12px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 120px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-pill"></div></td>
          <td><div class="skeleton-shimmer skeleton-pill" style="width: 80px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 40px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer skeleton-bar" style="width: 90px; height: 12px;"></div></td>
        </tr>
      `).join('');
    }

    this.renderTenantSkeletons();
  },

  showErrorBanner(message) {
    MallState.hasError = true;
    const container = document.getElementById('globalErrorContainer');
    if (!container) return;

    container.style.display = 'block';
    container.innerHTML = `
      <div class="inline-error-banner" role="alert">
        <div class="inline-error-left">
          <div class="inline-error-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div class="inline-error-content">
            <strong class="inline-error-title">Data Synchronization Error</strong>
            <p class="inline-error-msg">${this.escapeHTML(message || 'Failed to stream live retail telemetry and POS transactions.')}</p>
          </div>
        </div>
        <button type="button" class="btn-error-retry" onclick="MallApp.retryDataLoad()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          <span>Retry</span>
        </button>
      </div>
    `;
  },

  hideErrorBanner() {
    MallState.hasError = false;
    const container = document.getElementById('globalErrorContainer');
    if (container) {
      container.style.display = 'none';
      container.innerHTML = '';
    }
  },

  retryDataLoad() {
    this.hideErrorBanner();
    this.simulateRefresh(600, () => {
      this.showToast('Connected: Telemetry stream re-established', 'success');
    });
  },

  simulateError() {
    this.showErrorBanner('Failed to fetch real-time POS transaction telemetry from tenant gateways (Network timeout).');
    this.showToast('Simulated data error triggered. Click "Retry" on the banner to reconnect.', 'error');
  },

  // ========================================================
  // GLOBAL SEARCH (CTRL/CMD+K) & COMMAND PALETTE
  // ========================================================
  bindCommandPalette() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openCommandPalette();
      }
      if (e.key === 'Escape' && document.getElementById('commandPaletteModal')?.classList.contains('open')) {
        this.closeCommandPalette();
      }
    });

    const input = document.getElementById('commandPaletteInput');
    if (input) {
      input.addEventListener('input', (e) => {
        this.renderCommandPaletteResults(e.target.value.trim());
      });

      input.addEventListener('keydown', (e) => {
        const items = document.querySelectorAll('.cmd-result-item');
        if (!items.length) return;

        let activeIdx = -1;
        items.forEach((item, idx) => {
          if (item.classList.contains('selected')) activeIdx = idx;
        });

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIdx = (activeIdx + 1) % items.length;
          items.forEach(i => i.classList.remove('selected'));
          items[nextIdx].classList.add('selected');
          items[nextIdx].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIdx = activeIdx <= 0 ? items.length - 1 : activeIdx - 1;
          items.forEach(i => i.classList.remove('selected'));
          items[prevIdx].classList.add('selected');
          items[prevIdx].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const selected = document.querySelector('.cmd-result-item.selected') || items[0];
          if (selected) selected.click();
        }
      });
    }
  },

  openCommandPalette() {
    const modal = document.getElementById('commandPaletteModal');
    const input = document.getElementById('commandPaletteInput');
    if (modal && input) {
      modal.classList.add('open');
      this.setOverlayOpen(true);
      input.value = '';
      this.renderCommandPaletteResults('');
      setTimeout(() => input.focus(), 60);
    }
  },

  closeCommandPalette() {
    const modal = document.getElementById('commandPaletteModal');
    if (modal) {
      modal.classList.remove('open');
      this.setOverlayOpen(false);
    }
  },

  renderCommandPaletteResults(query) {
    const resultsContainer = document.getElementById('commandPaletteResults');
    if (!resultsContainer) return;

    const lowerQ = query.toLowerCase().trim();
    let sectionsHtml = '';

    // 1. Navigation & Quick Actions
    const navActions = [
      { id: 'nav-dash', label: 'Go to Dashboard', sub: 'Overview, KPIs & telemetry stream', view: 'dashboard', icon: '📊' },
      { id: 'nav-inv', label: 'Go to Inventory', sub: 'Browse SKUs, buffer thresholds & stock levels', view: 'inventory', icon: '📦' },
      { id: 'nav-reorder', label: 'Go to Reordering System', sub: 'Automated POs & procurement engine', view: 'reorder', icon: '🔄' },
      { id: 'nav-sales', label: 'Go to Manage Sales', sub: 'Retail POS velocity & turnover analytics', view: 'sales', icon: '💰' },
      { id: 'nav-staff', label: 'Go to Staff Management', sub: 'Floor auditors & shift rosters', view: 'staff', icon: '👥' },
      { id: 'nav-tenants', label: 'Go to Tenant Stores', sub: 'Mall directory & lease tracking', view: 'tenants', icon: '🏬' },
      { id: 'nav-export', label: 'Open Data Export Center', sub: 'Generate Excel, PDF & CSV datasets', view: 'export', icon: '📥' },
      { id: 'nav-copilot', label: 'Ask MallMatrix AI Copilot', sub: 'Autonomous inventory AI assistant', view: 'copilot', icon: '✨' },
      { id: 'act-currency', label: 'Toggle Currency (USD / INR)', sub: `Current: ${MallState.currency}`, customAction: () => { this.setCurrency(MallState.currency === 'USD' ? 'INR' : 'USD'); this.closeCommandPalette(); }, icon: '💱' },
      { id: 'act-sync', label: 'Sync Telemetry (600ms latency)', sub: 'Simulate data reload with skeleton states', customAction: () => { this.simulateRefresh(600); this.closeCommandPalette(); }, icon: '⚡' },
      { id: 'act-err', label: 'Simulate Telemetry Error', sub: 'Demonstrate inline error banner and retry', customAction: () => { this.simulateError(); this.closeCommandPalette(); }, icon: '⚠️' }
    ];

    const matchedNav = navActions.filter(a => !lowerQ || a.label.toLowerCase().includes(lowerQ) || a.sub.toLowerCase().includes(lowerQ));
    if (matchedNav.length) {
      sectionsHtml += `<div class="cmd-section-label">Navigation & Actions</div>`;
      matchedNav.slice(0, 4).forEach((a, idx) => {
        sectionsHtml += `
          <div class="cmd-result-item ${idx === 0 && !lowerQ ? 'selected' : ''}" onclick="(${a.customAction ? a.customAction.toString() : `() => { MallApp.navigateRoute('/${a.view}'); MallApp.closeCommandPalette(); }`})()">
            <div class="cmd-item-left">
              <span class="cmd-item-icon">${a.icon}</span>
              <div>
                <div class="cmd-item-title">${this.escapeHTML(a.label)}</div>
                <div class="cmd-item-sub">${this.escapeHTML(a.sub)}</div>
              </div>
            </div>
            <span class="cmd-item-badge">Action</span>
          </div>
        `;
      });
    }

    // 2. SKUs & Products
    const matchedProducts = MallState.products.filter(p =>
      !lowerQ ? false : (
        p.name.toLowerCase().includes(lowerQ) ||
        p.sku.toLowerCase().includes(lowerQ) ||
        p.tenant.toLowerCase().includes(lowerQ) ||
        p.category.toLowerCase().includes(lowerQ)
      )
    );
    if (matchedProducts.length) {
      sectionsHtml += `<div class="cmd-section-label">Products & SKUs (${matchedProducts.length})</div>`;
      matchedProducts.slice(0, 4).forEach(p => {
        sectionsHtml += `
          <div class="cmd-result-item" onclick="MallApp.navigateRoute('/inventory'); MallApp.openRestockDrawer('${p.sku}'); MallApp.closeCommandPalette();">
            <div class="cmd-item-left">
              <span class="cmd-item-icon">🏷️</span>
              <div>
                <div class="cmd-item-title">${this.escapeHTML(p.name)} <span style="font-family: monospace; font-size: 0.74rem; color: #64748B;">[${p.sku}]</span></div>
                <div class="cmd-item-sub">${this.escapeHTML(p.tenant)} • Stock: ${p.stock} units • ${this.formatCurrency(p.price)}</div>
              </div>
            </div>
            <span class="cmd-item-badge">SKU</span>
          </div>
        `;
      });
    }

    // 3. Tenant Stores
    const matchedTenants = MallState.tenants.filter(t =>
      !lowerQ ? false : (
        t.name.toLowerCase().includes(lowerQ) ||
        t.unit.toLowerCase().includes(lowerQ) ||
        t.category.toLowerCase().includes(lowerQ)
      )
    );
    if (matchedTenants.length) {
      sectionsHtml += `<div class="cmd-section-label">Tenant Stores (${matchedTenants.length})</div>`;
      matchedTenants.slice(0, 3).forEach(t => {
        sectionsHtml += `
          <div class="cmd-result-item" onclick="MallApp.navigateRoute('/tenants'); MallApp.closeCommandPalette();">
            <div class="cmd-item-left">
              <span class="cmd-item-icon">🏬</span>
              <div>
                <div class="cmd-item-title">${this.escapeHTML(t.name)}</div>
                <div class="cmd-item-sub">${this.escapeHTML(t.unit)} • ${this.escapeHTML(t.category)}</div>
              </div>
            </div>
            <span class="cmd-item-badge">Store</span>
          </div>
        `;
      });
    }

    // 4. Purchase Orders
    const matchedPOs = MallState.purchaseOrders.filter(po =>
      !lowerQ ? false : (
        po.id.toLowerCase().includes(lowerQ) ||
        po.supplier.toLowerCase().includes(lowerQ) ||
        po.items.toLowerCase().includes(lowerQ) ||
        po.status.toLowerCase().includes(lowerQ)
      )
    );
    if (matchedPOs.length) {
      sectionsHtml += `<div class="cmd-section-label">Purchase Orders (${matchedPOs.length})</div>`;
      matchedPOs.slice(0, 3).forEach(po => {
        sectionsHtml += `
          <div class="cmd-result-item" onclick="MallApp.navigateRoute('/reordering'); MallApp.openPODetailDrawer('${po.id}'); MallApp.closeCommandPalette();">
            <div class="cmd-item-left">
              <span class="cmd-item-icon">📋</span>
              <div>
                <div class="cmd-item-title">${this.escapeHTML(po.id)}: ${this.escapeHTML(po.supplier)}</div>
                <div class="cmd-item-sub">${this.escapeHTML(po.items)} • ${this.formatCurrency(po.value)} • ${po.status}</div>
              </div>
            </div>
            <span class="cmd-item-badge">${po.status}</span>
          </div>
        `;
      });
    }

    // 5. Staff
    const matchedStaff = MallState.staff.filter(s =>
      !lowerQ ? false : (
        s.name.toLowerCase().includes(lowerQ) ||
        s.id.toLowerCase().includes(lowerQ) ||
        s.role.toLowerCase().includes(lowerQ) ||
        s.zone.toLowerCase().includes(lowerQ)
      )
    );
    if (matchedStaff.length) {
      sectionsHtml += `<div class="cmd-section-label">Staff Officers (${matchedStaff.length})</div>`;
      matchedStaff.slice(0, 3).forEach(s => {
        sectionsHtml += `
          <div class="cmd-result-item" onclick="MallApp.navigateRoute('/staff'); MallApp.closeCommandPalette();">
            <div class="cmd-item-left">
              <span class="cmd-item-icon">👤</span>
              <div>
                <div class="cmd-item-title">${this.escapeHTML(s.name)} [${s.id}]</div>
                <div class="cmd-item-sub">${this.escapeHTML(s.role)} • Zone: ${this.escapeHTML(s.zone)} • ${s.status}</div>
              </div>
            </div>
            <span class="cmd-item-badge">Staff</span>
          </div>
        `;
      });
    }

    if (!sectionsHtml) {
      sectionsHtml = `
        <div style="text-align: center; padding: 42px 16px; color: #94A3B8;">
          <div style="font-size: 1.8rem; margin-bottom: 8px;">🔍</div>
          <div style="font-weight: 700; color: #1E293B; margin-bottom: 4px;">No results found for "${this.escapeHTML(query)}"</div>
          <div style="font-size: 0.8rem;">Try searching for a SKU (e.g. SKU-ZAR-882), store, PO ID, or staff officer.</div>
        </div>
      `;
    }

    resultsContainer.innerHTML = sectionsHtml;

    // Default select first item
    const firstItem = resultsContainer.querySelector('.cmd-result-item');
    if (firstItem && !resultsContainer.querySelector('.cmd-result-item.selected')) {
      firstItem.classList.add('selected');
    }
  },

  // ========================================================
  // NOTIFICATIONS BELL & DROPDOWN
  // ========================================================
  getNotifications() {
    const list = [];

    // Critical stock breaches
    const critItems = MallState.products.filter(p => p.stock < (p.minBuffer * 0.5));
    critItems.forEach(p => {
      list.push({
        id: `notif-crit-${p.sku}`,
        type: 'alert',
        title: `Critical Stock: ${p.name}`,
        desc: `Only ${p.stock} units remaining at ${p.tenant} (Buffer: ${p.minBuffer}). Immediate restock advised.`,
        time: 'Just now',
        unread: !this._readNotifications?.has(`notif-crit-${p.sku}`),
        action: () => {
          this.switchView('inventory');
          this.openRestockDrawer(p.sku);
        }
      });
    });

    // Rent overdue
    list.push({
      id: 'notif-rent-1',
      type: 'rent',
      title: 'Rent Overdue: Zara Flagship',
      desc: `${this.formatCurrency(14500.00)} overdue on Unit #204. Automated grace advisory dispatched.`,
      time: '18m ago',
      unread: !this._readNotifications?.has('notif-rent-1'),
      action: () => {
        this.switchView('tenants');
      }
    });

    // Pending PO Approvals
    const pendingPOs = MallState.purchaseOrders.filter(po => po.status === 'Pending');
    pendingPOs.forEach(po => {
      list.push({
        id: `notif-po-${po.id}`,
        type: 'po',
        title: `PO Awaiting Approval: ${po.id}`,
        desc: `${po.supplier} (${po.items}) totaling ${this.formatCurrency(po.value)}. Sign-off required.`,
        time: '45m ago',
        unread: !this._readNotifications?.has(`notif-po-${po.id}`),
        action: () => {
          this.switchView('reorder');
          this.openPODetailDrawer(po.id);
        }
      });
    });

    return list;
  },

  toggleNotificationDropdown(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;

    const isVisible = dropdown.style.display !== 'none';
    if (isVisible) {
      dropdown.style.display = 'none';
    } else {
      this.renderNotificationDropdown();
      dropdown.style.display = 'flex';

      const closeHandler = (evt) => {
        if (!dropdown.contains(evt.target) && !evt.target.closest('#headerNotificationBtn')) {
          dropdown.style.display = 'none';
          document.removeEventListener('click', closeHandler);
        }
      };
      setTimeout(() => document.addEventListener('click', closeHandler), 10);
    }
  },

  renderNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;

    const notifs = this.getNotifications();
    const unreadCount = notifs.filter(n => n.unread).length;

    let itemsHtml = notifs.map(n => {
      let iconSvg = '';
      let iconClass = '';
      if (n.type === 'alert') {
        iconClass = 'notification-icon-alert';
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      } else if (n.type === 'rent') {
        iconClass = 'notification-icon-rent';
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
      } else {
        iconClass = 'notification-icon-po';
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
      }

      return `
        <div class="notification-item ${n.unread ? 'unread' : ''}" onclick="(${n.action.toString()})(); document.getElementById('notificationDropdown').style.display='none';">
          <div class="notification-icon-wrap ${iconClass}">
            ${iconSvg}
          </div>
          <div class="notification-content">
            <div class="notification-item-title">${this.escapeHTML(n.title)}</div>
            <div class="notification-item-desc">${this.escapeHTML(n.desc)}</div>
            <div class="notification-item-time">${n.time}</div>
          </div>
        </div>
      `;
    }).join('');

    dropdown.innerHTML = `
      <div class="notification-header">
        <h4 class="notification-title">Notifications (${unreadCount} new)</h4>
        <button type="button" class="notification-mark-all-btn" onclick="MallApp.markAllNotificationsRead()">Mark all as read</button>
      </div>
      <div class="notification-list">
        ${itemsHtml}
      </div>
    `;
  },

  updateNotificationBadge() {
    const notifs = this.getNotifications();
    const unreadCount = notifs.filter(n => n.unread).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
      if (unreadCount > 0) {
        badge.style.display = 'flex';
        badge.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
      } else {
        badge.style.display = 'none';
      }
    }
  },

  markAllNotificationsRead() {
    if (!this._readNotifications) this._readNotifications = new Set();
    const notifs = this.getNotifications();
    notifs.forEach(n => this._readNotifications.add(n.id));
    this.updateNotificationBadge();
    this.renderNotificationDropdown();
    this.showToast('All notifications marked as read', 'info');
  },

  bindProfileDropdown() {
    const profileDropdown = document.getElementById('headerProfileDropdown');
    if (profileDropdown) {
      profileDropdown.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.toggleProfileDropdown(false);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const items = Array.from(profileDropdown.querySelectorAll('.profile-menu-item'));
          const idx = items.indexOf(document.activeElement);
          if (e.key === 'ArrowDown') {
            const next = (idx + 1) % items.length;
            items[next].focus();
          } else {
            const prev = (idx - 1 + items.length) % items.length;
            items[prev].focus();
          }
        }
      });
    }

    // Scroll listener for sticky header subtle shadow
    window.addEventListener('scroll', () => {
      const header = document.querySelector('.dashboard-header');
      if (header) {
        header.classList.toggle('is-scrolled', window.scrollY > 10);
      }
    }, { passive: true });

    // Global escape key listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.toggleProfileDropdown(false);
        const notif = document.getElementById('notificationDropdown');
        if (notif) notif.style.display = 'none';
        this.closeDeleteAccountModal();
      }
    });
  },

  toggleProfileDropdown(eOrForce) {
    if (eOrForce && typeof eOrForce.stopPropagation === 'function') {
      eOrForce.stopPropagation();
    }
    const wrap = document.getElementById('headerProfileMenuWrap');
    const dropdown = document.getElementById('headerProfileDropdown');
    const btn = document.getElementById('headerProfileBtn');
    if (!dropdown || !btn) return;

    const isCurrentlyOpen = dropdown.style.display === 'block';
    const willOpen = typeof eOrForce === 'boolean' ? eOrForce : !isCurrentlyOpen;

    if (willOpen) {
      dropdown.style.display = 'block';
      if (wrap) wrap.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');

      // Close notification dropdown if open
      const notifMenu = document.getElementById('notificationDropdown');
      if (notifMenu) notifMenu.style.display = 'none';

      const outsideHandler = (evt) => {
        if (!dropdown.contains(evt.target) && !btn.contains(evt.target)) {
          this.toggleProfileDropdown(false);
          document.removeEventListener('click', outsideHandler);
        }
      };
      setTimeout(() => document.addEventListener('click', outsideHandler), 10);
    } else {
      dropdown.style.display = 'none';
      if (wrap) wrap.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  },

  // ========================================================
  // THEME MANAGEMENT (Light / Dark Mode)
  // ========================================================
  initTheme() {
    let savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      savedTheme = prefersDark ? 'dark' : 'light';
    }
    this.setTheme(savedTheme, false);

    // Sync with OS preference changes if user hasn't explicitly set a preference
    if (window.matchMedia) {
      try {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (!localStorage.getItem('theme')) {
            this.setTheme(e.matches ? 'dark' : 'light', false);
          }
        });
      } catch (err) { }
    }

    // Keyboard support (Enter and Space) on header button
    const headerBtn = document.getElementById('headerThemeToggleBtn');
    if (headerBtn) {
      headerBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleTheme();
        }
      });
    }
  },

  setTheme(theme, showToastNotification = true) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    // Update Header button
    const headerBtn = document.getElementById('headerThemeToggleBtn');
    if (headerBtn) {
      headerBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      const tooltip = isDark ? 'Switch to light mode' : 'Switch to dark mode';
      headerBtn.setAttribute('title', tooltip);
      headerBtn.setAttribute('aria-label', tooltip);
    }

    // Update Profile dropdown switch & row
    const switchEl = document.getElementById('profileThemeSwitch');
    if (switchEl) {
      switchEl.classList.toggle('active', isDark);
    }
    const profileBtn = document.getElementById('profileThemeToggleBtn');
    if (profileBtn) {
      profileBtn.setAttribute('aria-checked', isDark ? 'true' : 'false');
    }

    // Re-render chart canvases if visible to adapt colors
    if (typeof this.renderRevenueBarChart === 'function') {
      try { this.renderRevenueBarChart(); } catch (e) { }
    }
    if (typeof this.drawHourlyWaveChart === 'function') {
      try { this.drawHourlyWaveChart(); } catch (e) { }
    }

    if (showToastNotification) {
      this.showToast(isDark ? 'Dark mode enabled' : 'Light mode enabled', 'info');
    }
  },

  toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    this.setTheme(isDark ? 'light' : 'dark', true);
  },

  toggleDarkMode() {
    this.toggleTheme();
  },

  // ========================================================
  // CLEAR FILTER HELPERS
  // ========================================================
  clearInventoryFilters() {
    const searchInput = document.getElementById('inventorySearchInput');
    const catSelect = document.getElementById('invCategoryFilter');
    const lowStockToggle = document.getElementById('invLowStockToggle');
    if (searchInput) searchInput.value = '';
    if (catSelect) catSelect.value = 'all';
    if (lowStockToggle) lowStockToggle.checked = false;
    this._invLowStockOnly = false;
    this._invPage = 1;
    this.renderInventoryTable();
    this.showToast('Inventory filters cleared', 'info');
  },

  clearReorderFilters() {
    const searchInput = document.getElementById('reorderSearchInput');
    const statusFilter = document.getElementById('reorderStatusFilter');
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = 'all';
    this.renderPurchaseOrders();
    this.showToast('Reorder filters cleared', 'info');
  },

  clearSalesFilters() {
    this.setSalesDateRange('today');
    this.renderSalesLeaderboard();
    this.showToast('Sales filters reset to Today', 'info');
  },

  clearStaffFilters() {
    this.renderStaffTable();
    this.showToast('Staff filters reset', 'info');
  },

  // --------------------------------------------------------
  // AUTHENTICATION & LOGIN PAGE
  // --------------------------------------------------------

  validateLoginForm() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const submitBtn = document.getElementById('loginSubmitBtn');
    const emailError = document.getElementById('loginEmailError');
    const passwordError = document.getElementById('loginPasswordError');
    if (!emailInput || !passwordInput || !submitBtn) return false;

    const email = (emailInput.value || '').trim();
    const password = passwordInput.value || '';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let isEmailValid = true;
    let isPasswordValid = true;

    if (emailInput.dataset.touched === 'true') {
      if (!email) {
        if (emailError) emailError.textContent = 'Email is required';
        emailInput.classList.add('has-error');
        emailInput.setAttribute('aria-invalid', 'true');
        isEmailValid = false;
      } else if (!emailRegex.test(email)) {
        if (emailError) emailError.textContent = 'Please enter a valid email address';
        emailInput.classList.add('has-error');
        emailInput.setAttribute('aria-invalid', 'true');
        isEmailValid = false;
      } else {
        if (emailError) emailError.textContent = '';
        emailInput.classList.remove('has-error');
        emailInput.setAttribute('aria-invalid', 'false');
      }
    } else {
      isEmailValid = email && emailRegex.test(email);
    }

    if (passwordInput.dataset.touched === 'true') {
      if (!password) {
        if (passwordError) passwordError.textContent = 'Password is required';
        passwordInput.classList.add('has-error');
        passwordInput.setAttribute('aria-invalid', 'true');
        isPasswordValid = false;
      } else if (password.length < 6) {
        if (passwordError) passwordError.textContent = 'Password must be at least 6 characters';
        passwordInput.classList.add('has-error');
        passwordInput.setAttribute('aria-invalid', 'true');
        isPasswordValid = false;
      } else {
        if (passwordError) passwordError.textContent = '';
        passwordInput.classList.remove('has-error');
        passwordInput.setAttribute('aria-invalid', 'false');
      }
    } else {
      isPasswordValid = password && password.length >= 6;
    }

    const formValid = emailRegex.test(email) && password.length >= 6;
    submitBtn.disabled = !formValid;
    return formValid;
  },

  onFieldBlur(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
      field.dataset.touched = 'true';
      this.validateLoginForm();
    }
  },

  togglePasswordVisibility() {
    const passwordInput = document.getElementById('loginPassword');
    const toggleBtn = document.getElementById('loginPasswordToggleBtn');
    if (!passwordInput || !toggleBtn) return;

    const eyeOpen = toggleBtn.querySelector('.login-eye-open');
    const eyeSlashed = toggleBtn.querySelector('.login-eye-slashed');

    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    if (eyeOpen) eyeOpen.style.display = isPassword ? 'none' : 'block';
    if (eyeSlashed) eyeSlashed.style.display = isPassword ? 'block' : 'none';
    toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    toggleBtn.setAttribute('title', isPassword ? 'Hide password' : 'Show password');
  },

  handleForgotPassword(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    this.showToast('Password reset is coming soon', 'info');
  },

  fillDemoCredentials() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    if (emailInput) {
      emailInput.value = 'admin@mallmatrix.com';
      emailInput.dataset.touched = 'true';
    }
    if (passwordInput) {
      passwordInput.value = 'Admin@123';
      passwordInput.dataset.touched = 'true';
    }
    const alertBox = document.getElementById('loginAlertError');
    if (alertBox) alertBox.style.display = 'none';
    this.validateLoginForm();
  },

  async submitLogin(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const rememberInput = document.getElementById('loginRemember');
    const submitBtn = document.getElementById('loginSubmitBtn');
    const submitText = document.getElementById('loginSubmitText');
    const submitSpinner = document.getElementById('loginSubmitSpinner');
    const alertBox = document.getElementById('loginAlertError');
    const alertText = document.getElementById('loginAlertErrorText');

    if (!emailInput || !passwordInput) return;

    // Mark both fields touched so validation errors show if invalid
    emailInput.dataset.touched = 'true';
    passwordInput.dataset.touched = 'true';

    if (!this.validateLoginForm()) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const remember = rememberInput ? rememberInput.checked : false;

    // Set loading state
    if (submitBtn) submitBtn.disabled = true;
    if (submitText) submitText.style.display = 'none';
    if (submitSpinner) submitSpinner.style.display = 'inline-flex';
    if (alertBox) alertBox.style.display = 'none';

    try {
      const result = await authLogin(email, password, remember);

      if (result.success) {
        this.updateUserProfile();
        this.showToast(`Welcome back, ${result.user?.name || 'Alex'}!`, 'success');

        // Redirect to intended route or default to /dashboard
        let redirectTarget = '/dashboard';
        try {
          const saved = sessionStorage.getItem('mallmatrix_redirect_after_login');
          if (saved && saved !== '/' && saved !== '/login') {
            redirectTarget = saved;
            sessionStorage.removeItem('mallmatrix_redirect_after_login');
          }
        } catch (err) {}

        this.navigateRoute(redirectTarget);
      } else {
        if (alertBox) {
          if (alertText) alertText.textContent = result.error || 'Incorrect email or password';
          alertBox.style.display = 'flex';
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      if (alertBox) {
        if (alertText) alertText.textContent = 'An unexpected error occurred. Please try again.';
        alertBox.style.display = 'flex';
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (submitText) submitText.style.display = 'inline-block';
      if (submitSpinner) submitSpinner.style.display = 'none';
      this.validateLoginForm();
    }
  },

  resetLoginForm() {
    const form = document.getElementById('loginForm');
    if (form) form.reset();

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const emailError = document.getElementById('loginEmailError');
    const passwordError = document.getElementById('loginPasswordError');
    const alertBox = document.getElementById('loginAlertError');
    const submitBtn = document.getElementById('loginSubmitBtn');
    const submitText = document.getElementById('loginSubmitText');
    const submitSpinner = document.getElementById('loginSubmitSpinner');

    if (emailInput) {
      emailInput.dataset.touched = 'false';
      emailInput.classList.remove('has-error');
      emailInput.setAttribute('aria-invalid', 'false');
    }
    if (passwordInput) {
      passwordInput.dataset.touched = 'false';
      passwordInput.classList.remove('has-error');
      passwordInput.setAttribute('aria-invalid', 'false');
      passwordInput.type = 'password';
    }
    const toggleBtn = document.getElementById('loginPasswordToggleBtn');
    if (toggleBtn) {
      const eyeOpen = toggleBtn.querySelector('.login-eye-open');
      const eyeSlashed = toggleBtn.querySelector('.login-eye-slashed');
      if (eyeOpen) eyeOpen.style.display = 'block';
      if (eyeSlashed) eyeSlashed.style.display = 'none';
      toggleBtn.setAttribute('aria-label', 'Show password');
      toggleBtn.setAttribute('title', 'Show password');
    }
    if (emailError) emailError.textContent = '';
    if (passwordError) passwordError.textContent = '';
    if (alertBox) alertBox.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;
    if (submitText) submitText.style.display = 'inline-block';
    if (submitSpinner) submitSpinner.style.display = 'none';
  },

  logout() {
    authLogout();
    this.showToast('Logged out successfully', 'info');
    this.navigateRoute('/login');
  },

  updateUserProfile() {
    const user = getCurrentUser();
    const name = user ? user.name : 'Alex Rivera';
    const role = user ? user.role : 'Mall Operations Lead';
    const avatar = (user && user.avatar) ? user.avatar : '/mallmatrix_logo.jpg';

    document.querySelectorAll('.header-profile-name').forEach(el => el.textContent = name);
    document.querySelectorAll('.header-profile-role').forEach(el => el.textContent = role);
    document.querySelectorAll('.user-footer-name').forEach(el => el.textContent = name);
    document.querySelectorAll('.user-footer-role').forEach(el => el.textContent = role);
    document.querySelectorAll('.user-avatar-preview').forEach(el => {
      if (el.tagName === 'IMG') el.src = avatar;
    });
  },

  handleHeaderProfileClick(event) {
    if (event) event.stopPropagation();
    const target = event ? event.target : null;
    const chevron = target && target.closest('.header-chevron-icon');
    if (chevron) {
      this.toggleProfileDropdown(event);
    } else {
      this.toggleProfileDropdown(false);
      this.navigateRoute('/profile');
    }
  },

  // ========================================================
  // PROFILE PAGE CONTROLLER & TAB SYSTEM
  // ========================================================
  renderProfileView() {
    const container = document.getElementById('view-profile');
    if (!container) return;
    container.style.display = 'block';

    if (MallState.isLoading) {
      container.innerHTML = this.getProfileSkeletonHTML();
      return;
    }

    if (MallState.hasError) {
      container.innerHTML = `
        <div class="profile-card" style="text-align: center; padding: 48px 24px; max-width: 500px; margin: 40px auto;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(239,68,68,0.12); color: #EF4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text); margin-bottom: 8px;">Failed to Load Profile</h3>
          <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 24px;">An error occurred while loading your profile data. Please try again.</p>
          <button type="button" class="btn-create-order" onclick="MallApp.simulateRefresh(400)">Retry</button>
        </div>
      `;
      return;
    }

    const profile = getProfile();
    const avatar = getSavedAvatar();
    const activeTab = MallState.profileActiveTab || 'personal';

    container.innerHTML = `
      <div class="profile-page-container">
        <div class="profile-grid-layout">
          <!-- LEFT: Profile summary card -->
          ${this.getProfileSummaryCardHTML(profile, avatar)}

          <!-- RIGHT: Tabs & Panels -->
          <div class="profile-tabs-wrapper">
            <!-- Tabs Nav -->
            <nav class="profile-tabs-nav" role="tablist" aria-label="Profile Sections">
              <button type="button" role="tab" class="profile-tab-btn ${activeTab === 'personal' ? 'active' : ''}" 
                id="tab-personal" aria-selected="${activeTab === 'personal'}" aria-controls="panel-personal"
                onclick="MallApp.setProfileTab('personal')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Personal info</span>
              </button>

              <button type="button" role="tab" class="profile-tab-btn ${activeTab === 'work' ? 'active' : ''}" 
                id="tab-work" aria-selected="${activeTab === 'work'}" aria-controls="panel-work"
                onclick="MallApp.setProfileTab('work')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
                <span>Work details</span>
              </button>

              <button type="button" role="tab" class="profile-tab-btn ${activeTab === 'contact' ? 'active' : ''}" 
                id="tab-contact" aria-selected="${activeTab === 'contact'}" aria-controls="panel-contact"
                onclick="MallApp.setProfileTab('contact')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>Contact & emergency</span>
              </button>

              <button type="button" role="tab" class="profile-tab-btn ${activeTab === 'security' ? 'active' : ''}" 
                id="tab-security" aria-selected="${activeTab === 'security'}" aria-controls="panel-security"
                onclick="MallApp.setProfileTab('security')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span>Security</span>
              </button>

              <button type="button" role="tab" class="profile-tab-btn ${activeTab === 'preferences' ? 'active' : ''}" 
                id="tab-preferences" aria-selected="${activeTab === 'preferences'}" aria-controls="panel-preferences"
                onclick="MallApp.setProfileTab('preferences')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span>Preferences</span>
              </button>

              <button type="button" role="tab" class="profile-tab-btn ${activeTab === 'activity' ? 'active' : ''}" 
                id="tab-activity" aria-selected="${activeTab === 'activity'}" aria-controls="panel-activity"
                onclick="MallApp.setProfileTab('activity')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Activity</span>
              </button>
            </nav>

            <!-- Active Tab Panel -->
            <div class="profile-tab-panel active" role="tabpanel" id="panel-${activeTab}" aria-labelledby="tab-${activeTab}">
              ${this.getProfileTabContentHTML(activeTab, profile)}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  getProfileSummaryCardHTML(profile, avatar) {
    const defaultAvatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=192&auto=format&fit=crop&q=80';
    const hasPhoto = Boolean(avatar);
    const photoSrc = avatar || defaultAvatarUrl;
    const fullName = profile.displayName || `${profile.firstName} ${profile.lastName}`.trim();
    const initials = (profile.firstName?.[0] || 'A') + (profile.lastName?.[0] || 'R');

    return `
      <aside class="profile-summary-card" aria-label="Profile Summary">
        <div class="profile-avatar-center">
          <div class="profile-avatar-wrapper">
            ${hasPhoto 
              ? `<img src="${photoSrc}" alt="${this.escapeHTML(fullName)}" class="profile-avatar-img user-avatar-preview">`
              : `<div class="profile-avatar-initials">${initials}</div>`
            }
          </div>
          <div class="profile-avatar-actions">
            <button type="button" class="profile-photo-btn" onclick="document.getElementById('profileAvatarFileInput').click()" aria-label="Change photo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              <span>Change photo</span>
            </button>
            ${hasPhoto ? `
              <button type="button" class="profile-photo-remove-btn" onclick="MallApp.removeAvatarPhoto()" title="Remove photo" aria-label="Remove photo">
                Remove
              </button>
            ` : ''}
          </div>
        </div>

        <div class="profile-user-headline">
          <h2 class="profile-user-fullname">${this.escapeHTML(fullName)}</h2>
          <p class="profile-user-jobtitle">${this.escapeHTML(profile.role)}</p>
          <div style="margin-top: 8px;">
            <span class="profile-status-chip active">
              <span class="profile-status-dot"></span>
              <span>Active</span>
            </span>
          </div>
        </div>

        <div class="profile-quick-facts">
          <div class="profile-fact-row">
            <span class="profile-fact-label">Employee ID</span>
            <span class="profile-fact-val" style="font-family: monospace;">${this.escapeHTML(profile.employeeId)}</span>
          </div>
          <div class="profile-fact-row">
            <span class="profile-fact-label">Department</span>
            <span class="profile-fact-val">${this.escapeHTML(profile.department)}</span>
          </div>
          <div class="profile-fact-row">
            <span class="profile-fact-label">Location</span>
            <span class="profile-fact-val">${this.escapeHTML(profile.location)}</span>
          </div>
          <div class="profile-fact-row">
            <span class="profile-fact-label">Member since</span>
            <span class="profile-fact-val">${this.escapeHTML(profile.memberSince)}</span>
          </div>
          <div class="profile-fact-row">
            <span class="profile-fact-label">Last login</span>
            <span class="profile-fact-val">${this.escapeHTML(profile.lastLogin)}</span>
          </div>
        </div>

        <div class="profile-stats-strip">
          <div class="profile-stat-box">
            <span class="profile-stat-num">${(profile.stats?.ordersHandled || 1420).toLocaleString()}</span>
            <span class="profile-stat-label">Orders handled</span>
          </div>
          <div class="profile-stat-box">
            <span class="profile-stat-num">${(profile.stats?.posApproved || 89).toLocaleString()}</span>
            <span class="profile-stat-label">POs approved</span>
          </div>
          <div class="profile-stat-box">
            <span class="profile-stat-num">${(profile.stats?.reportsExported || 34).toLocaleString()}</span>
            <span class="profile-stat-label">Reports exported</span>
          </div>
        </div>
      </aside>
    `;
  },

  getProfileTabContentHTML(activeTab, profile) {
    const avatar = getSavedAvatar();

    if (activeTab === 'personal') {
      const isBasicEditing = Boolean(MallState.profileEditSections.personal_basic);
      const isContactEditing = Boolean(MallState.profileEditSections.personal_contact);
      const isAddressEditing = Boolean(MallState.profileEditSections.personal_address);
      const isBioEditing = Boolean(MallState.profileEditSections.personal_bio);
      const bioLen = (profile.bio || '').length;

      // Completion calculation
      const fields = [
        profile.firstName, profile.lastName, profile.displayName,
        profile.email, profile.phone, profile.address, profile.city,
        profile.country, profile.bio, profile.emergencyContactName,
        avatar ? 'photo' : null, profile.twoFactorEnabled ? '2fa' : null
      ];
      const filledCount = fields.filter(Boolean).length;
      const completionPct = Math.round((filledCount / 12) * 100);

      const recentActivities = (profile.activities || []).slice(0, 5);

      return `
        <!-- Row 1: Four compact stat cards in responsive grid -->
        <div class="profile-stat-grid">
          <div class="profile-metric-card">
            <span class="profile-metric-label">Orders Handled</span>
            <span class="profile-metric-val">${(profile.stats?.ordersHandled || 1420).toLocaleString()}</span>
            <span class="profile-metric-helper">+12% vs last month</span>
          </div>
          <div class="profile-metric-card">
            <span class="profile-metric-label">POs Approved</span>
            <span class="profile-metric-val">${(profile.stats?.posApproved || 89).toLocaleString()}</span>
            <span class="profile-metric-helper">5 pending review</span>
          </div>
          <div class="profile-metric-card">
            <span class="profile-metric-label">Reports Exported</span>
            <span class="profile-metric-val">${(profile.stats?.reportsExported || 34).toLocaleString()}</span>
            <span class="profile-metric-helper">Last exported today</span>
          </div>
          <div class="profile-metric-card">
            <span class="profile-metric-label">Last Login</span>
            <span class="profile-metric-val" style="font-size: 1.25rem;">${this.escapeHTML(profile.lastLogin || '11 Nov, 17:08')}</span>
            <span class="profile-metric-helper">Chrome on macOS (Current)</span>
          </div>
        </div>

        <!-- Row 2: Two-column grid (2fr left, 1fr right on >= 1280px) -->
        <div class="profile-row-two-grid">
          <!-- LEFT COLUMN: Separate editable cards -->
          <div class="profile-col-left">

            <!-- Card A: Basic details -->
            <div class="profile-card">
              <div class="profile-card-header">
                <div>
                  <h3 class="profile-card-title">Basic details</h3>
                  <p class="profile-card-subtitle">Official identity and personal demographic information</p>
                </div>
                <div class="profile-card-actions">
                  ${!isBasicEditing ? `
                    <button type="button" class="profile-btn-edit" onclick="MallApp.toggleProfileEdit('personal_basic', true)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      <span>Edit</span>
                    </button>
                  ` : `
                    <button type="button" class="profile-btn-cancel" onclick="MallApp.cancelProfileEdit('personal_basic')">Cancel</button>
                    <button type="button" class="profile-btn-save" id="saveBtn_personal_basic" onclick="MallApp.saveProfileSection('personal_basic')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Save</span>
                    </button>
                  `}
                </div>
              </div>

              <form id="form_personal_basic" onsubmit="event.preventDefault(); MallApp.saveProfileSection('personal_basic');" novalidate>
                <div class="profile-form-grid">
                  <div class="profile-form-group">
                    <label for="profFirstName" class="profile-form-label">First Name <span style="color:#DC2626;">*</span></label>
                    <input type="text" id="profFirstName" class="profile-form-input" value="${this.escapeHTML(profile.firstName)}" 
                      ${!isBasicEditing ? 'disabled' : ''} required oninput="MallApp.validateBasicForm()">
                    <div class="profile-field-error" id="err_profFirstName"></div>
                  </div>

                  <div class="profile-form-group">
                    <label for="profLastName" class="profile-form-label">Last Name <span style="color:#DC2626;">*</span></label>
                    <input type="text" id="profLastName" class="profile-form-input" value="${this.escapeHTML(profile.lastName)}" 
                      ${!isBasicEditing ? 'disabled' : ''} required oninput="MallApp.validateBasicForm()">
                    <div class="profile-field-error" id="err_profLastName"></div>
                  </div>

                  <div class="profile-form-group">
                    <label for="profDisplayName" class="profile-form-label">Display Name <span style="color:#DC2626;">*</span></label>
                    <input type="text" id="profDisplayName" class="profile-form-input" value="${this.escapeHTML(profile.displayName)}" 
                      ${!isBasicEditing ? 'disabled' : ''} required oninput="MallApp.validateBasicForm()">
                    <div class="profile-field-error" id="err_profDisplayName"></div>
                  </div>

                  <div class="profile-form-group">
                    <label for="profDob" class="profile-form-label">Date of Birth</label>
                    <input type="date" id="profDob" class="profile-form-input" value="${this.escapeHTML(profile.dob)}" 
                      ${!isBasicEditing ? 'disabled' : ''}>
                  </div>

                  <div class="profile-form-group profile-field-full">
                    <label for="profGender" class="profile-form-label">Gender</label>
                    <select id="profGender" class="profile-form-select" ${!isBasicEditing ? 'disabled' : ''}>
                      <option value="Male" ${profile.gender === 'Male' ? 'selected' : ''}>Male</option>
                      <option value="Female" ${profile.gender === 'Female' ? 'selected' : ''}>Female</option>
                      <option value="Non-binary" ${profile.gender === 'Non-binary' ? 'selected' : ''}>Non-binary</option>
                      <option value="Prefer not to say" ${profile.gender === 'Prefer not to say' ? 'selected' : ''}>Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>

            <!-- Card B: Contact details -->
            <div class="profile-card">
              <div class="profile-card-header">
                <div>
                  <h3 class="profile-card-title">Contact details</h3>
                  <p class="profile-card-subtitle">Primary channels for correspondence and alerts</p>
                </div>
                <div class="profile-card-actions">
                  ${!isContactEditing ? `
                    <button type="button" class="profile-btn-edit" onclick="MallApp.toggleProfileEdit('personal_contact', true)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      <span>Edit</span>
                    </button>
                  ` : `
                    <button type="button" class="profile-btn-cancel" onclick="MallApp.cancelProfileEdit('personal_contact')">Cancel</button>
                    <button type="button" class="profile-btn-save" id="saveBtn_personal_contact" onclick="MallApp.saveProfileSection('personal_contact')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Save</span>
                    </button>
                  `}
                </div>
              </div>

              <form id="form_personal_contact" onsubmit="event.preventDefault(); MallApp.saveProfileSection('personal_contact');" novalidate>
                <div class="profile-form-grid">
                  <div class="profile-form-group">
                    <label for="profEmail" class="profile-form-label">Email Address <span style="color:#DC2626;">*</span></label>
                    <input type="email" id="profEmail" class="profile-form-input" value="${this.escapeHTML(profile.email)}" 
                      ${!isContactEditing ? 'disabled' : ''} required oninput="MallApp.validatePersonalContactForm()">
                    <div class="profile-field-error" id="err_profEmail"></div>
                  </div>

                  <div class="profile-form-group">
                    <label for="profPhone" class="profile-form-label">Phone Number <span style="color:#DC2626;">*</span></label>
                    <input type="tel" id="profPhone" class="profile-form-input" value="${this.escapeHTML(profile.phone)}" 
                      ${!isContactEditing ? 'disabled' : ''} required oninput="MallApp.validatePersonalContactForm()">
                    <div class="profile-field-error" id="err_profPhone"></div>
                  </div>

                  <div class="profile-form-group">
                    <label for="profAltPhone" class="profile-form-label">Alternate Phone</label>
                    <input type="tel" id="profAltPhone" class="profile-form-input" value="${this.escapeHTML(profile.altPhone || '+1 (555) 345-6789')}" 
                      ${!isContactEditing ? 'disabled' : ''}>
                  </div>

                  <div class="profile-form-group">
                    <label for="profPrefMethod" class="profile-form-label">Preferred Contact Method</label>
                    <select id="profPrefMethod" class="profile-form-select" ${!isContactEditing ? 'disabled' : ''}>
                      <option value="Work Email & Phone" ${profile.preferredContactMethod === 'Work Email & Phone' ? 'selected' : ''}>Work Email & Phone</option>
                      <option value="Phone Call Only" ${profile.preferredContactMethod === 'Phone Call Only' ? 'selected' : ''}>Phone Call Only</option>
                      <option value="SMS Only" ${profile.preferredContactMethod === 'SMS Only' ? 'selected' : ''}>SMS Only</option>
                      <option value="Personal Email" ${profile.preferredContactMethod === 'Personal Email' ? 'selected' : ''}>Personal Email</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>

            <!-- Card C: Address -->
            <div class="profile-card">
              <div class="profile-card-header">
                <div>
                  <h3 class="profile-card-title">Address</h3>
                  <p class="profile-card-subtitle">Residential location and mailing postal address</p>
                </div>
                <div class="profile-card-actions">
                  ${!isAddressEditing ? `
                    <button type="button" class="profile-btn-edit" onclick="MallApp.toggleProfileEdit('personal_address', true)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      <span>Edit</span>
                    </button>
                  ` : `
                    <button type="button" class="profile-btn-cancel" onclick="MallApp.cancelProfileEdit('personal_address')">Cancel</button>
                    <button type="button" class="profile-btn-save" onclick="MallApp.saveProfileSection('personal_address')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Save</span>
                    </button>
                  `}
                </div>
              </div>

              <form id="form_personal_address" onsubmit="event.preventDefault(); MallApp.saveProfileSection('personal_address');">
                <div class="profile-form-grid">
                  <div class="profile-form-group profile-field-full">
                    <label for="profAddress" class="profile-form-label">Address Line</label>
                    <input type="text" id="profAddress" class="profile-form-input" value="${this.escapeHTML(profile.address)}" 
                      ${!isAddressEditing ? 'disabled' : ''}>
                  </div>

                  <div class="profile-form-group">
                    <label for="profCity" class="profile-form-label">City</label>
                    <input type="text" id="profCity" class="profile-form-input" value="${this.escapeHTML(profile.city)}" 
                      ${!isAddressEditing ? 'disabled' : ''}>
                  </div>

                  <div class="profile-form-group">
                    <label for="profState" class="profile-form-label">State / Province</label>
                    <input type="text" id="profState" class="profile-form-input" value="${this.escapeHTML(profile.state)}" 
                      ${!isAddressEditing ? 'disabled' : ''}>
                  </div>

                  <div class="profile-form-group">
                    <label for="profPinCode" class="profile-form-label">PIN / Postal Code</label>
                    <input type="text" id="profPinCode" class="profile-form-input" value="${this.escapeHTML(profile.pinCode)}" 
                      ${!isAddressEditing ? 'disabled' : ''}>
                  </div>

                  <div class="profile-form-group">
                    <label for="profCountry" class="profile-form-label">Country</label>
                    <input type="text" id="profCountry" class="profile-form-input" value="${this.escapeHTML(profile.country)}" 
                      ${!isAddressEditing ? 'disabled' : ''}>
                  </div>
                </div>
              </form>
            </div>

            <!-- Card D: About me -->
            <div class="profile-card">
              <div class="profile-card-header">
                <div>
                  <h3 class="profile-card-title">About me</h3>
                  <p class="profile-card-subtitle">Operational background and logistics bio</p>
                </div>
                <div class="profile-card-actions">
                  ${!isBioEditing ? `
                    <button type="button" class="profile-btn-edit" onclick="MallApp.toggleProfileEdit('personal_bio', true)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      <span>Edit</span>
                    </button>
                  ` : `
                    <button type="button" class="profile-btn-cancel" onclick="MallApp.cancelProfileEdit('personal_bio')">Cancel</button>
                    <button type="button" class="profile-btn-save" onclick="MallApp.saveProfileSection('personal_bio')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Save</span>
                    </button>
                  `}
                </div>
              </div>

              <form id="form_personal_bio" onsubmit="event.preventDefault(); MallApp.saveProfileSection('personal_bio');">
                <div class="profile-form-group profile-field-full">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <label for="profBio" class="profile-form-label" style="margin-bottom:0;">Professional Bio</label>
                    <span class="profile-char-counter" id="bioCounter">${bioLen} / 200</span>
                  </div>
                  <textarea id="profBio" class="profile-form-textarea" maxlength="200" rows="3" ${!isBioEditing ? 'disabled' : ''}
                    oninput="document.getElementById('bioCounter').textContent = this.value.length + ' / 200';">${this.escapeHTML(profile.bio)}</textarea>
                </div>
              </form>
            </div>

          </div>

          <!-- RIGHT COLUMN: Profile Completion, Assigned Zones, Recent Activity, Quick Actions -->
          <div class="profile-col-right">

            <!-- Card 1: Profile completion -->
            <div class="profile-card">
              <div class="profile-completion-header">
                <h3 class="profile-card-title" style="margin-bottom: 0;">Profile completion</h3>
                <span class="profile-completion-pct">${completionPct}%</span>
              </div>
              <p class="profile-card-subtitle" style="margin-bottom: 12px;">Complete all profile data points to reach 100%</p>
              <div class="profile-completion-track">
                <div class="profile-completion-bar" style="width: ${completionPct}%;"></div>
              </div>
              <div class="profile-completion-tasks">
                ${!avatar ? `
                  <div class="profile-task-item" onclick="document.getElementById('profileAvatarFileInput').click()" title="Click to upload photo">
                    <span>📷 Add profile photo</span>
                    <span style="color: var(--accent); font-weight: 600;">+10%</span>
                  </div>
                ` : `
                  <div class="profile-task-item completed">
                    <span>✓ Profile photo uploaded</span>
                    <span>Done</span>
                  </div>
                `}
                ${!profile.emergencyContactName ? `
                  <div class="profile-task-item" onclick="MallApp.setProfileTab('contact')" title="Click to add emergency contact">
                    <span>🚨 Add emergency contact</span>
                    <span style="color: var(--accent); font-weight: 600;">+10%</span>
                  </div>
                ` : `
                  <div class="profile-task-item completed">
                    <span>✓ Emergency contact added</span>
                    <span>Done</span>
                  </div>
                `}
                ${!profile.twoFactorEnabled ? `
                  <div class="profile-task-item" onclick="MallApp.setProfileTab('security')" title="Click to enable 2FA">
                    <span>🔒 Enable Two-Factor Auth</span>
                    <span style="color: var(--accent); font-weight: 600;">+10%</span>
                  </div>
                ` : `
                  <div class="profile-task-item completed">
                    <span>✓ Two-Factor Auth active</span>
                    <span>Done</span>
                  </div>
                `}
              </div>
            </div>

            <!-- Card 2: Assigned zones -->
            <div class="profile-card">
              <div class="profile-card-header" style="margin-bottom: 12px;">
                <div>
                  <h3 class="profile-card-title">Assigned zones</h3>
                  <p class="profile-card-subtitle">Operational floor sectors under your watch</p>
                </div>
              </div>
              <div class="profile-chips-wrap" style="margin-bottom: 10px;">
                ${(profile.assignedZones || []).map(z => `
                  <span class="profile-zone-chip">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>${this.escapeHTML(z)}</span>
                  </span>
                `).join('')}
              </div>
              <p style="font-size: 0.74rem; color: var(--text-muted); margin: 0;">
                4 operational sectors · 48 retail tenant stores monitored
              </p>
            </div>

            <!-- Card 3: Recent activity -->
            <div class="profile-card">
              <div class="profile-card-header" style="margin-bottom: 12px;">
                <div>
                  <h3 class="profile-card-title">Recent activity</h3>
                  <p class="profile-card-subtitle">Last 5 actions performed</p>
                </div>
                <div class="profile-card-actions">
                  <a href="#" onclick="event.preventDefault(); MallApp.setProfileTab('activity')" 
                    style="font-size: 0.8rem; font-weight: 600; color: var(--accent); text-decoration: none;">
                    View all →
                  </a>
                </div>
              </div>
              <div class="profile-mini-activity-list">
                ${recentActivities.map(act => `
                  <div class="profile-mini-activity-item">
                    <div class="profile-mini-activity-dot"></div>
                    <div class="profile-mini-activity-body">
                      <div class="profile-mini-activity-title">${this.escapeHTML(act.title)}</div>
                      <div class="profile-mini-activity-time">${this.escapeHTML(act.time)}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Card 4: Quick actions -->
            <div class="profile-card">
              <div class="profile-card-header" style="margin-bottom: 12px;">
                <div>
                  <h3 class="profile-card-title">Quick actions</h3>
                  <p class="profile-card-subtitle">Common profile and operational tasks</p>
                </div>
              </div>
              <div class="profile-quick-actions-list">
                <button type="button" class="profile-quick-action-btn" onclick="MallApp.setProfileTab('security')">
                  <span>🔑 Change password</span>
                  <span>→</span>
                </button>
                <button type="button" class="profile-quick-action-btn" onclick="MallApp.exportProfileData('json')">
                  <span>📥 Export my data</span>
                  <span>→</span>
                </button>
                <button type="button" class="profile-quick-action-btn" onclick="MallApp.setProfileTab('preferences')">
                  <span>⚙️ System preferences</span>
                  <span>→</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      `;
    }

    if (activeTab === 'work') {
      const isRoleEditing = Boolean(MallState.profileEditSections.work_role);

      return `
        <!-- Work Details: 2 paired cards on top, full-width zone & permissions cards below -->
        <div class="profile-card-grid-2">
          <!-- Card 1: Role & Organization Position -->
          <div class="profile-card">
            <div class="profile-card-header">
              <div>
                <h3 class="profile-card-title">Role & Organizational Details</h3>
                <p class="profile-card-subtitle">Your mall operational responsibilities and hierarchy</p>
              </div>
              <div class="profile-card-actions">
                ${!isRoleEditing ? `
                  <button type="button" class="profile-btn-edit" onclick="MallApp.toggleProfileEdit('work_role', true)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    <span>Edit</span>
                  </button>
                ` : `
                  <button type="button" class="profile-btn-cancel" onclick="MallApp.cancelProfileEdit('work_role')">Cancel</button>
                  <button type="button" class="profile-btn-save" onclick="MallApp.saveProfileSection('work_role')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Save</span>
                  </button>
                `}
              </div>
            </div>

            <form id="form_work_role" onsubmit="event.preventDefault(); MallApp.saveProfileSection('work_role');">
              <div class="profile-form-grid">
                <div class="profile-form-group">
                  <label for="profRole" class="profile-form-label">Role / Job Title</label>
                  <input type="text" id="profRole" class="profile-form-input" value="${this.escapeHTML(profile.role)}" ${!isRoleEditing ? 'disabled' : ''}>
                </div>

                <div class="profile-form-group">
                  <label for="profDept" class="profile-form-label">Department</label>
                  <input type="text" id="profDept" class="profile-form-input" value="${this.escapeHTML(profile.department)}" ${!isRoleEditing ? 'disabled' : ''}>
                </div>

                <div class="profile-form-group">
                  <label for="profManager" class="profile-form-label">Reporting Manager</label>
                  <input type="text" id="profManager" class="profile-form-input" value="${this.escapeHTML(profile.reportingManager)}" ${!isRoleEditing ? 'disabled' : ''}>
                </div>

                <div class="profile-form-group">
                  <label for="profShift" class="profile-form-label">Shift Timing</label>
                  <input type="text" id="profShift" class="profile-form-input" value="${this.escapeHTML(profile.shiftTiming)}" ${!isRoleEditing ? 'disabled' : ''}>
                </div>
              </div>
            </form>
          </div>

          <!-- Card 2: Enterprise Credentials & Governance -->
          <div class="profile-card">
            <div class="profile-card-header">
              <div>
                <h3 class="profile-card-title">Enterprise Governance</h3>
                <p class="profile-card-subtitle">Official corporate access tier and employment records</p>
              </div>
            </div>

            <div class="profile-form-grid">
              <div class="profile-form-group">
                <label class="profile-form-label">Employee ID <span class="profile-readonly-badge" title="Managed by your administrator">🔒 Managed</span></label>
                <input type="text" class="profile-form-input" value="${this.escapeHTML(profile.employeeId)}" disabled style="font-family: monospace; opacity: 0.85;">
              </div>

              <div class="profile-form-group">
                <label class="profile-form-label">Joining Date <span class="profile-readonly-badge" title="Managed by your administrator">🔒 Managed</span></label>
                <input type="text" class="profile-form-input" value="${this.escapeHTML(profile.joiningDate)}" disabled style="opacity: 0.85;">
              </div>

              <div class="profile-form-group">
                <label class="profile-form-label">Employment Type</label>
                <input type="text" class="profile-form-input" value="${this.escapeHTML(profile.employmentType)}" disabled style="opacity: 0.85;">
              </div>

              <div class="profile-form-group">
                <label class="profile-form-label">Access Level <span class="profile-readonly-badge" title="Managed by your administrator">🔒 Managed</span></label>
                <input type="text" class="profile-form-input" value="${this.escapeHTML(profile.accessLevel)} Tier (Full Clearance)" disabled style="opacity: 0.85; font-weight: 700; color: var(--accent);">
              </div>
            </div>
          </div>
        </div>

        <!-- Card 3: Assigned Mall Zones & Retail Coverage -->
        <div class="profile-card">
          <div class="profile-card-header">
            <div>
              <h3 class="profile-card-title">Assigned Mall Zones & Retail Coverage</h3>
              <p class="profile-card-subtitle">Sectors requiring daily telemetry inspections and automated restock sign-offs</p>
            </div>
          </div>

          <div class="profile-chips-wrap" style="margin-bottom: 16px;">
            ${(profile.assignedZones || []).map(z => `
              <span class="profile-zone-chip" style="font-size: 0.84rem; padding: 6px 14px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span>${this.escapeHTML(z)}</span>
              </span>
            `).join('')}
          </div>

          <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; margin: 0;">
            Assigned personnel have active override authorization for retail tenants situated across Ground Floor Atrium, Level 1 West Wing, Level 2 Food Court, and Logistics Bay B.
          </p>
        </div>

        <!-- Card 4: System Permissions Checklist -->
        <div class="profile-card">
          <div class="profile-card-header">
            <div>
              <h3 class="profile-card-title">System Permissions Checklist</h3>
              <p class="profile-card-subtitle">Active clearance modules managed by organization administrators</p>
            </div>
            <span class="profile-readonly-badge" title="Managed by your administrator">🔒 Admin Privileges</span>
          </div>

          <div class="profile-permissions-list" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px;">
            ${(profile.permissions || []).map(p => `
              <div class="profile-perm-item" style="border: 1px solid var(--border); border-radius: 8px; padding: 12px;">
                <div class="profile-perm-check">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div>
                  <div class="profile-perm-name">${this.escapeHTML(p.name)}</div>
                  <div class="profile-perm-desc">${this.escapeHTML(p.desc)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (activeTab === 'contact') {
      const isWorkContactEditing = Boolean(MallState.profileEditSections.contact_work);
      const isEmergEditing = Boolean(MallState.profileEditSections.contact_emerg);

      return `
        <!-- Contact & Emergency: Paired 2-column cards on top -->
        <div class="profile-card-grid-2">
          <!-- Card 1: Primary & Work Communication -->
          <div class="profile-card">
            <div class="profile-card-header">
              <div>
                <h3 class="profile-card-title">Work Communication</h3>
                <p class="profile-card-subtitle">Official operational channels for mall correspondence</p>
              </div>
              <div class="profile-card-actions">
                ${!isWorkContactEditing ? `
                  <button type="button" class="profile-btn-edit" onclick="MallApp.toggleProfileEdit('contact_work', true)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    <span>Edit</span>
                  </button>
                ` : `
                  <button type="button" class="profile-btn-cancel" onclick="MallApp.cancelProfileEdit('contact_work')">Cancel</button>
                  <button type="button" class="profile-btn-save" id="saveBtn_contact_work" onclick="MallApp.saveProfileSection('contact_work')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Save</span>
                  </button>
                `}
              </div>
            </div>

            <form id="form_contact_work" onsubmit="event.preventDefault(); MallApp.saveProfileSection('contact_work');" novalidate>
              <div class="profile-form-grid">
                <div class="profile-form-group profile-field-full">
                  <label for="profWorkEmail" class="profile-form-label">Work Email <span style="color:#DC2626;">*</span></label>
                  <input type="email" id="profWorkEmail" class="profile-form-input" value="${this.escapeHTML(profile.workEmail)}" 
                    ${!isWorkContactEditing ? 'disabled' : ''} required oninput="MallApp.validateWorkContactForm()">
                  <div class="profile-field-error" id="err_profWorkEmail"></div>
                </div>

                <div class="profile-form-group profile-field-full">
                  <label for="profPersonalEmail" class="profile-form-label">Personal Email</label>
                  <input type="email" id="profPersonalEmail" class="profile-form-input" value="${this.escapeHTML(profile.personalEmail)}" 
                    ${!isWorkContactEditing ? 'disabled' : ''} oninput="MallApp.validateWorkContactForm()">
                  <div class="profile-field-error" id="err_profPersonalEmail"></div>
                </div>

                <div class="profile-form-group">
                  <label for="profWorkPhone" class="profile-form-label">Work Phone <span style="color:#DC2626;">*</span></label>
                  <input type="tel" id="profWorkPhone" class="profile-form-input" value="${this.escapeHTML(profile.workPhone)}" 
                    ${!isWorkContactEditing ? 'disabled' : ''} required oninput="MallApp.validateWorkContactForm()">
                  <div class="profile-field-error" id="err_profWorkPhone"></div>
                </div>

                <div class="profile-form-group">
                  <label for="profPrefContact" class="profile-form-label">Preferred Method</label>
                  <select id="profPrefContact" class="profile-form-select" ${!isWorkContactEditing ? 'disabled' : ''}>
                    <option value="Work Email & Phone" ${profile.preferredContactMethod === 'Work Email & Phone' ? 'selected' : ''}>Work Email & Phone</option>
                    <option value="Phone Call Only" ${profile.preferredContactMethod === 'Phone Call Only' ? 'selected' : ''}>Phone Call Only</option>
                    <option value="SMS Only" ${profile.preferredContactMethod === 'SMS Only' ? 'selected' : ''}>SMS Only</option>
                    <option value="Personal Email" ${profile.preferredContactMethod === 'Personal Email' ? 'selected' : ''}>Personal Email</option>
                  </select>
                </div>
              </div>
            </form>
          </div>

          <!-- Card 2: Emergency Next-of-Kin Contact -->
          <div class="profile-card">
            <div class="profile-card-header">
              <div>
                <h3 class="profile-card-title">Emergency Contact</h3>
                <p class="profile-card-subtitle">Designated contact person for critical incidents</p>
              </div>
              <div class="profile-card-actions">
                ${!isEmergEditing ? `
                  <button type="button" class="profile-btn-edit" onclick="MallApp.toggleProfileEdit('contact_emerg', true)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    <span>Edit</span>
                  </button>
                ` : `
                  <button type="button" class="profile-btn-cancel" onclick="MallApp.cancelProfileEdit('contact_emerg')">Cancel</button>
                  <button type="button" class="profile-btn-save" id="saveBtn_contact_emerg" onclick="MallApp.saveProfileSection('contact_emerg')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Save</span>
                  </button>
                `}
              </div>
            </div>

            <form id="form_contact_emerg" onsubmit="event.preventDefault(); MallApp.saveProfileSection('contact_emerg');" novalidate>
              <div class="profile-form-grid">
                <div class="profile-form-group profile-field-full">
                  <label for="profEmergName" class="profile-form-label">Contact Full Name <span style="color:#DC2626;">*</span></label>
                  <input type="text" id="profEmergName" class="profile-form-input" value="${this.escapeHTML(profile.emergencyContactName)}" 
                    ${!isEmergEditing ? 'disabled' : ''} required oninput="MallApp.validateEmergencyContactForm()">
                  <div class="profile-field-error" id="err_profEmergName"></div>
                </div>

                <div class="profile-form-group">
                  <label for="profEmergRel" class="profile-form-label">Relationship</label>
                  <input type="text" id="profEmergRel" class="profile-form-input" value="${this.escapeHTML(profile.emergencyContactRelation)}" 
                    ${!isEmergEditing ? 'disabled' : ''} placeholder="e.g. Spouse, Sibling">
                </div>

                <div class="profile-form-group">
                  <label for="profEmergPhone" class="profile-form-label">Emergency Phone <span style="color:#DC2626;">*</span></label>
                  <input type="tel" id="profEmergPhone" class="profile-form-input" value="${this.escapeHTML(profile.emergencyContactPhone)}" 
                    ${!isEmergEditing ? 'disabled' : ''} required oninput="MallApp.validateEmergencyContactForm()">
                  <div class="profile-field-error" id="err_profEmergPhone"></div>
                </div>
              </div>
            </form>
          </div>
        </div>

        <!-- Card 3: Emergency Escalation Protocol & SLA -->
        <div class="profile-card">
          <div class="profile-card-header">
            <div>
              <h3 class="profile-card-title">Emergency Escalation Protocol & SLA</h3>
              <p class="profile-card-subtitle">Official procedure followed when high-priority mall alerts occur</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px;">
            <div style="background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 14px;">
              <div style="font-size: 0.86rem; font-weight: 700; color: var(--text); margin-bottom: 4px;">Tier 1: In-App Telemetry</div>
              <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.4;">
                Real-time dashboard warnings and push banners for low inventory thresholds and overdue tenant rent notices.
              </p>
            </div>
            <div style="background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 14px;">
              <div style="font-size: 0.86rem; font-weight: 700; color: var(--text); margin-bottom: 4px;">Tier 2: Urgent SMS Broadcast</div>
              <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.4;">
                Direct SMS dispatch to work phone when tenant PO replenishment buffers breach 10% safety tolerances.
              </p>
            </div>
            <div style="background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 14px;">
              <div style="font-size: 0.86rem; font-weight: 700; color: var(--text); margin-bottom: 4px;">Tier 3: Facility Dispatch</div>
              <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.4;">
                Security and emergency contact notification if facility anomalies or critical security events are triggered.
              </p>
            </div>
          </div>
        </div>
      `;
    }

    if (activeTab === 'security') {
      const sessions = profile.activeSessions || [];
      const history = profile.loginHistory || [];
      const is2FA = Boolean(profile.twoFactorEnabled);

      return `
        <!-- Security: 2-column card grid on top -->
        <div class="profile-card-grid-2">
          <!-- Card 1: Change Password -->
          <div class="profile-card">
            <div class="profile-card-header">
              <div>
                <h3 class="profile-card-title">Change Password</h3>
                <p class="profile-card-subtitle">Update your credentials to safeguard operations</p>
              </div>
            </div>

            <form id="form_password" onsubmit="event.preventDefault(); MallApp.handlePasswordChange();">
              <div class="profile-form-group" style="margin-bottom: 12px;">
                <label for="profCurrentPwd" class="profile-form-label">Current Password</label>
                <div style="position: relative;">
                  <input type="password" id="profCurrentPwd" class="profile-form-input" placeholder="Enter current password" required style="padding-right: 40px;">
                  <button type="button" class="login-eye-toggle-btn" onclick="MallApp.togglePasswordVisibility('profCurrentPwd', this)" 
                    style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted);" aria-label="Toggle password visibility">
                    👁️
                  </button>
                </div>
                <div class="profile-field-error" id="err_profCurrentPwd"></div>
              </div>

              <div class="profile-form-group" style="margin-bottom: 12px;">
                <label for="profNewPwd" class="profile-form-label">New Password</label>
                <div style="position: relative;">
                  <input type="password" id="profNewPwd" class="profile-form-input" placeholder="At least 8 characters" required 
                    oninput="MallApp.checkPasswordStrength(this.value)" style="padding-right: 40px;">
                  <button type="button" class="login-eye-toggle-btn" onclick="MallApp.togglePasswordVisibility('profNewPwd', this)" 
                    style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted);" aria-label="Toggle password visibility">
                    👁️
                  </button>
                </div>
                <div class="profile-field-error" id="err_profNewPwd"></div>

                <!-- Password Strength Meter -->
                <div class="profile-password-meter" style="margin-top: 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 0.72rem; color: var(--text-muted);">Strength:</span>
                    <span style="font-size: 0.72rem; font-weight: 700;" id="pwdStrengthLabel">Enter password</span>
                  </div>
                  <div class="profile-meter-bar-track">
                    <div class="profile-meter-bar-fill" id="pwdStrengthFill" style="width: 0%; background: #EF4444;"></div>
                  </div>
                </div>

                <!-- Password Rules Checklist -->
                <div class="profile-rules-checklist" style="margin-top: 8px;">
                  <div class="profile-rule-item" id="rule_len">
                    <span class="profile-rule-icon">○</span>
                    <span>At least 8 characters</span>
                  </div>
                  <div class="profile-rule-item" id="rule_upper">
                    <span class="profile-rule-icon">○</span>
                    <span>At least 1 uppercase letter</span>
                  </div>
                  <div class="profile-rule-item" id="rule_lower">
                    <span class="profile-rule-icon">○</span>
                    <span>At least 1 lowercase letter</span>
                  </div>
                  <div class="profile-rule-item" id="rule_num">
                    <span class="profile-rule-icon">○</span>
                    <span>At least 1 number</span>
                  </div>
                  <div class="profile-rule-item" id="rule_spec">
                    <span class="profile-rule-icon">○</span>
                    <span>At least 1 special symbol (@$!%*?&#)</span>
                  </div>
                </div>
              </div>

              <div class="profile-form-group" style="margin-bottom: 16px;">
                <label for="profConfirmPwd" class="profile-form-label">Confirm New Password</label>
                <div style="position: relative;">
                  <input type="password" id="profConfirmPwd" class="profile-form-input" placeholder="Repeat new password" required 
                    oninput="MallApp.checkPasswordMatch()" style="padding-right: 40px;">
                  <button type="button" class="login-eye-toggle-btn" onclick="MallApp.togglePasswordVisibility('profConfirmPwd', this)" 
                    style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted);" aria-label="Toggle password visibility">
                    👁️
                  </button>
                </div>
                <div class="profile-field-error" id="err_profConfirmPwd"></div>
              </div>

              <button type="submit" id="btnUpdatePassword" class="btn-create-order" disabled style="opacity: 0.5; cursor: not-allowed; width: 100%;">
                Update Password
              </button>
            </form>
          </div>

          <!-- Card 2: Two-Factor Authentication -->
          <div class="profile-card">
            <div class="profile-card-header">
              <div>
                <h3 class="profile-card-title">Two-Factor Authentication</h3>
                <p class="profile-card-subtitle">Secondary verification checkpoint on sign-in</p>
              </div>
              <div class="profile-card-actions">
                <button type="button" class="profile-btn-edit" onclick="MallApp.toggleTwoFactorAuth()" style="${is2FA ? 'background: #10B981; color: white;' : ''}">
                  ${is2FA ? 'Enabled ✓' : 'Enable 2FA'}
                </button>
              </div>
            </div>

            <div style="background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 0.84rem; font-weight: 700; color: var(--text);">Security Status:</span>
                <span style="font-size: 0.78rem; font-weight: 700; color: ${is2FA ? '#10B981' : '#EF4444'};">
                  ${is2FA ? 'Protected (Active)' : 'Disabled (Recommended)'}
                </span>
              </div>
              <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.4;">
                Requires an authenticator code (Google Authenticator, Authy, or YubiKey hardware) each time administrative operations are performed.
              </p>
            </div>

            <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5;">
              <div style="font-weight: 600; color: var(--text); margin-bottom: 6px;">Benefits of 2FA:</div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div>✓ Protects against credential stuffing and brute force</div>
                <div>✓ Enforces compliance with SOC2 retail security guidelines</div>
                <div>✓ Locks purchase order approvals behind verified tokens</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 3: Active Authorized Sessions -->
        <div class="profile-card">
          <div class="profile-card-header">
            <div>
              <h3 class="profile-card-title">Active Authorized Sessions</h3>
              <p class="profile-card-subtitle">Devices currently authenticated with your MallMatrix operational credentials</p>
            </div>
            ${sessions.length > 1 ? `
              <div class="profile-card-actions">
                <button type="button" class="profile-photo-remove-btn" onclick="MallApp.terminateAllOtherSessions()" style="color: #EF4444; border-color: rgba(239,68,68,0.3);">
                  Log out of all other devices
                </button>
              </div>
            ` : ''}
          </div>

          <div class="profile-sessions-list">
            ${sessions.map(s => `
              <div class="profile-session-item">
                <div class="profile-session-device">
                  <div class="profile-session-icon">
                    ${s.icon === 'phone' ? '📱' : '💻'}
                  </div>
                  <div>
                    <div class="profile-session-title">
                      ${this.escapeHTML(s.device)} · ${this.escapeHTML(s.browser)}
                      ${s.isCurrent ? `<span class="profile-session-badge">Current session</span>` : ''}
                    </div>
                    <div class="profile-session-meta">
                      ${this.escapeHTML(s.location)} · Last active: ${this.escapeHTML(s.lastActive)}
                    </div>
                  </div>
                </div>
                ${!s.isCurrent ? `
                  <button type="button" class="profile-session-btn" onclick="MallApp.terminateSession('${s.id}')">
                    Log out
                  </button>
                ` : `
                  <span style="font-size: 0.78rem; font-weight: 600; color: #10B981;">Online</span>
                `}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Card 4: Recent Login History -->
        <div class="profile-card">
          <div class="profile-card-header">
            <div>
              <h3 class="profile-card-title">Recent Login History</h3>
              <p class="profile-card-subtitle">Audit log of your last 10 successful authentication sessions</p>
            </div>
          </div>

          <div style="overflow-x: auto;">
            <table class="inventory-table" style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); text-align: left; color: var(--text-muted);">
                  <th style="padding: 10px 12px;">Date & Time</th>
                  <th style="padding: 10px 12px;">IP Address</th>
                  <th style="padding: 10px 12px;">Device / Client</th>
                  <th style="padding: 10px 12px; text-align: right;">Result</th>
                </tr>
              </thead>
              <tbody>
                ${history.map(h => `
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px 12px; font-weight: 600; color: var(--text);">${this.escapeHTML(h.date)}</td>
                    <td style="padding: 10px 12px; font-family: monospace; color: var(--text-muted);">${this.escapeHTML(h.ip)}</td>
                    <td style="padding: 10px 12px; color: var(--text);">${this.escapeHTML(h.device)}</td>
                    <td style="padding: 10px 12px; text-align: right;">
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 0.72rem; font-weight: 700; background: rgba(16,185,129,0.12); color: #10B981;">
                        ${this.escapeHTML(h.result)}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Card 5: Danger Zone -->
        <div class="profile-danger-card">
          <div class="profile-danger-header">
            <div>
              <h4 style="font-size: 0.96rem; font-weight: 700; color: #EF4444; margin-bottom: 4px;">Danger Zone: Delete Account</h4>
              <p style="font-size: 0.82rem; color: var(--text-muted);">
                Permanently archive your personal credentials and operational privileges. This action cannot be reversed.
              </p>
            </div>
            <button type="button" class="profile-danger-btn" onclick="MallApp.openDeleteAccountModal()">
              Delete account
            </button>
          </div>
        </div>
      `;
    }

    if (activeTab === 'preferences') {
      const isRegEditing = Boolean(MallState.profileEditSections.preferences_regional);
      const isUiEditing = Boolean(MallState.profileEditSections.preferences_interface);
      const isNotifEditing = Boolean(MallState.profileEditSections.preferences_notif);
      const prefs = profile.preferences || {};
      const notifs = prefs.notifications || {};

      return `
        <!-- Preferences: Paired cards on top, notifications below -->
        <div class="profile-card-grid-2">
          <!-- Card 1: Regional & Formatting -->
          <div class="profile-card">
            <div class="profile-card-header">
              <div>
                <h3 class="profile-card-title">Regional & Locale Formatting</h3>
                <p class="profile-card-subtitle">Currency, timezone, and calendar preferences</p>
              </div>
              <div class="profile-card-actions">
                ${!isRegEditing ? `
                  <button type="button" class="profile-btn-edit" onclick="MallApp.toggleProfileEdit('preferences_regional', true)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    <span>Edit</span>
                  </button>
                ` : `
                  <button type="button" class="profile-btn-cancel" onclick="MallApp.cancelProfileEdit('preferences_regional')">Cancel</button>
                  <button type="button" class="profile-btn-save" onclick="MallApp.saveProfileSection('preferences_regional')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Save</span>
                  </button>
                `}
              </div>
            </div>

            <form id="form_pref_regional" onsubmit="event.preventDefault(); MallApp.saveProfileSection('preferences_regional');">
              <div class="profile-form-grid">
                <div class="profile-form-group">
                  <label for="prefLanguage" class="profile-form-label">Language</label>
                  <select id="prefLanguage" class="profile-form-select" ${!isRegEditing ? 'disabled' : ''}>
                    <option value="English (US)" ${prefs.language === 'English (US)' ? 'selected' : ''}>English (US)</option>
                    <option value="Spanish" ${prefs.language === 'Spanish' ? 'selected' : ''}>Español (Spanish)</option>
                    <option value="French" ${prefs.language === 'French' ? 'selected' : ''}>Français (French)</option>
                    <option value="German" ${prefs.language === 'German' ? 'selected' : ''}>Deutsch (German)</option>
                    <option value="Hindi" ${prefs.language === 'Hindi' ? 'selected' : ''}>हिन्दी (Hindi)</option>
                    <option value="Japanese" ${prefs.language === 'Japanese' ? 'selected' : ''}>日本語 (Japanese)</option>
                  </select>
                </div>

                <div class="profile-form-group">
                  <label for="prefCurrency" class="profile-form-label">Display Currency</label>
                  <select id="prefCurrency" class="profile-form-select" ${!isRegEditing ? 'disabled' : ''}>
                    <option value="USD" ${MallState.currency === 'USD' ? 'selected' : ''}>USD ($ - US Dollar)</option>
                    <option value="INR" ${MallState.currency === 'INR' ? 'selected' : ''}>INR (₹ - Indian Rupee)</option>
                  </select>
                </div>

                <div class="profile-form-group profile-field-full">
                  <label for="prefTimezone" class="profile-form-label">Timezone</label>
                  <select id="prefTimezone" class="profile-form-select" ${!isRegEditing ? 'disabled' : ''}>
                    <option value="Pacific Time (US & Canada) (UTC-8)" ${prefs.timezone?.includes('Pacific') ? 'selected' : ''}>Pacific Time (US & Canada) (UTC-8)</option>
                    <option value="Eastern Time (US & Canada) (UTC-5)" ${prefs.timezone?.includes('Eastern') ? 'selected' : ''}>Eastern Time (US & Canada) (UTC-5)</option>
                    <option value="UTC" ${prefs.timezone === 'UTC' ? 'selected' : ''}>Universal Coordinated Time (UTC)</option>
                    <option value="India Standard Time (IST) (UTC+5:30)" ${prefs.timezone?.includes('India') ? 'selected' : ''}>India Standard Time (IST) (UTC+5:30)</option>
                    <option value="Central European Time (CET) (UTC+1)" ${prefs.timezone?.includes('Central European') ? 'selected' : ''}>Central European Time (CET) (UTC+1)</option>
                  </select>
                </div>

                <div class="profile-form-group profile-field-full">
                  <label for="prefDateFormat" class="profile-form-label">Date Format</label>
                  <select id="prefDateFormat" class="profile-form-select" ${!isRegEditing ? 'disabled' : ''}>
                    <option value="DD-MMM-YYYY" ${prefs.dateFormat === 'DD-MMM-YYYY' ? 'selected' : ''}>DD-MMM-YYYY (e.g. 11-Nov-2026)</option>
                    <option value="YYYY-MM-DD" ${prefs.dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD (e.g. 2026-11-11)</option>
                    <option value="MM/DD/YYYY" ${prefs.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY (e.g. 11/11/2026)</option>
                  </select>
                </div>
              </div>
            </form>
          </div>

          <!-- Card 2: Interface & Appearance -->
          <div class="profile-card">
            <div class="profile-card-header">
              <div>
                <h3 class="profile-card-title">Interface & Appearance</h3>
                <p class="profile-card-subtitle">Visual theme and initial dashboard landing destination</p>
              </div>
              <div class="profile-card-actions">
                ${!isUiEditing ? `
                  <button type="button" class="profile-btn-edit" onclick="MallApp.toggleProfileEdit('preferences_interface', true)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    <span>Edit</span>
                  </button>
                ` : `
                  <button type="button" class="profile-btn-cancel" onclick="MallApp.cancelProfileEdit('preferences_interface')">Cancel</button>
                  <button type="button" class="profile-btn-save" onclick="MallApp.saveProfileSection('preferences_interface')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Save</span>
                  </button>
                `}
              </div>
            </div>

            <form id="form_pref_ui" onsubmit="event.preventDefault(); MallApp.saveProfileSection('preferences_interface');">
              <div class="profile-form-grid">
                <div class="profile-form-group profile-field-full">
                  <label for="prefTheme" class="profile-form-label">Interface Theme</label>
                  <select id="prefTheme" class="profile-form-select" ${!isUiEditing ? 'disabled' : ''}>
                    <option value="dark" ${document.documentElement.classList.contains('dark') ? 'selected' : ''}>Dark Mode</option>
                    <option value="light" ${!document.documentElement.classList.contains('dark') ? 'selected' : ''}>Light Mode</option>
                  </select>
                </div>

                <div class="profile-form-group profile-field-full">
                  <label for="prefDefaultLanding" class="profile-form-label">Default Landing View</label>
                  <select id="prefDefaultLanding" class="profile-form-select" ${!isUiEditing ? 'disabled' : ''}>
                    <option value="Dashboard" ${prefs.defaultLanding === 'Dashboard' ? 'selected' : ''}>Dashboard Overview</option>
                    <option value="Inventory" ${prefs.defaultLanding === 'Inventory' ? 'selected' : ''}>Stock Inventory</option>
                    <option value="Reordering" ${prefs.defaultLanding === 'Reordering' ? 'selected' : ''}>Automated Reordering</option>
                    <option value="Sales" ${prefs.defaultLanding === 'Sales' ? 'selected' : ''}>Sales Analytics</option>
                    <option value="Tenants" ${prefs.defaultLanding === 'Tenants' ? 'selected' : ''}>Tenant Stores</option>
                  </select>
                </div>
              </div>
            </form>
          </div>
        </div>

        <!-- Card 3: Notification Channels & Subscriptions -->
        <div class="profile-card">
          <div class="profile-card-header">
            <div>
              <h3 class="profile-card-title">Notification Channels & Subscriptions</h3>
              <p class="profile-card-subtitle">Configure real-time dispatch channels for operational anomalies</p>
            </div>
            <div class="profile-card-actions">
              ${!isNotifEditing ? `
                <button type="button" class="profile-btn-edit" onclick="MallApp.toggleProfileEdit('preferences_notif', true)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>Edit</span>
                </button>
              ` : `
                <button type="button" class="profile-btn-cancel" onclick="MallApp.cancelProfileEdit('preferences_notif')">Cancel</button>
                <button type="button" class="profile-btn-save" onclick="MallApp.saveProfileSection('preferences_notif')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Save</span>
                </button>
              `}
            </div>
          </div>

          <form id="form_pref_notif" onsubmit="event.preventDefault(); MallApp.saveProfileSection('preferences_notif');">
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px;">
              <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg);">
                <div>
                  <div style="font-size: 0.86rem; font-weight: 600; color: var(--text);">Low Stock Buffer Alerts</div>
                  <div style="font-size: 0.74rem; color: var(--text-muted);">Triggered when SKU stock drops below 20% safety threshold</div>
                </div>
                <input type="checkbox" id="notif_lowStock" ${notifs.lowStockAlerts?.inApp ? 'checked' : ''} ${!isNotifEditing ? 'disabled' : ''} style="accent-color: var(--accent); width: 18px; height: 18px;">
              </label>

              <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg);">
                <div>
                  <div style="font-size: 0.86rem; font-weight: 600; color: var(--text);">Purchase Order Approvals</div>
                  <div style="font-size: 0.74rem; color: var(--text-muted);">Dispatches alerts when vendors approve restock batches</div>
                </div>
                <input type="checkbox" id="notif_po" ${notifs.poApprovals?.inApp ? 'checked' : ''} ${!isNotifEditing ? 'disabled' : ''} style="accent-color: var(--accent); width: 18px; height: 18px;">
              </label>

              <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg);">
                <div>
                  <div style="font-size: 0.86rem; font-weight: 600; color: var(--text);">Overdue Tenant Rents</div>
                  <div style="font-size: 0.74rem; color: var(--text-muted);">Notifies mall management of tenant overdue compliance</div>
                </div>
                <input type="checkbox" id="notif_overdue" ${notifs.overdueRents?.inApp ? 'checked' : ''} ${!isNotifEditing ? 'disabled' : ''} style="accent-color: var(--accent); width: 18px; height: 18px;">
              </label>

              <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg);">
                <div>
                  <div style="font-size: 0.86rem; font-weight: 600; color: var(--text);">Daily Operations Digest</div>
                  <div style="font-size: 0.74rem; color: var(--text-muted);">Morning summary of consolidated turnover and POS feeds</div>
                </div>
                <input type="checkbox" id="notif_daily" ${notifs.dailySummary?.inApp ? 'checked' : ''} ${!isNotifEditing ? 'disabled' : ''} style="accent-color: var(--accent); width: 18px; height: 18px;">
              </label>
            </div>
          </form>
        </div>
      `;
    }

    if (activeTab === 'activity') {
      const allActivities = profile.activities || [];
      const filter = MallState.profileTimelineFilter || 'all';
      const count = MallState.profileTimelineCount || 5;

      const filtered = filter === 'all' 
        ? allActivities 
        : allActivities.filter(a => (a.tag || '').toLowerCase() === filter.toLowerCase() || (a.type || '').toLowerCase() === filter.toLowerCase());

      const displayed = filtered.slice(0, count);
      const hasMore = displayed.length < filtered.length;

      const filterButtons = [
        { id: 'all', label: 'All Activities' },
        { id: 'procurement', label: 'Procurement' },
        { id: 'inventory', label: 'Inventory' },
        { id: 'compliance', label: 'Compliance' },
        { id: 'operations', label: 'Operations' },
        { id: 'security', label: 'Security' }
      ];

      return `
        <div class="profile-card">
          <div class="profile-card-header">
            <div>
              <h3 class="profile-card-title">User Activity Timeline</h3>
              <p class="profile-card-subtitle">Comprehensive operational audit log of recent transactions, approvals, and exports</p>
            </div>
          </div>

          <div class="profile-timeline-wrap">
            <div class="profile-timeline-filter-row">
              ${filterButtons.map(b => `
                <button type="button" class="lp-tag ${filter === b.id ? 'active' : ''}" 
                  style="cursor: pointer; border: 1px solid var(--border); padding: 5px 12px; border-radius: 9999px; font-size: 0.78rem; font-weight: 600; background: ${filter === b.id ? 'var(--accent)' : 'var(--surface)'}; color: ${filter === b.id ? '#ffffff' : 'var(--text)'};"
                  onclick="MallApp.filterActivityTimeline('${b.id}')">
                  ${b.label}
                </button>
              `).join('')}
            </div>

            <div class="profile-timeline-list">
              ${displayed.length === 0 ? `
                <div style="text-align: center; padding: 32px; color: var(--text-muted); font-size: 0.88rem;">
                  No activities found for category "${filter}".
                </div>
              ` : displayed.map(item => `
                <div class="profile-timeline-item">
                  <div class="profile-timeline-icon-wrap">
                    ${item.type === 'po' ? '📦' : (item.type === 'export' ? '📊' : (item.type === 'sku' ? '🏷️' : (item.type === 'tenant' ? '🏬' : '🔒')))}
                  </div>
                  <div class="profile-timeline-body">
                    <div class="profile-timeline-title">${this.escapeHTML(item.title)}</div>
                    <div class="profile-timeline-detail">${this.escapeHTML(item.detail)}</div>
                    <div class="profile-timeline-time">${this.escapeHTML(item.date)} · ${this.escapeHTML(item.time)}</div>
                  </div>
                  <span class="profile-timeline-tag">${this.escapeHTML(item.tag)}</span>
                </div>
              `).join('')}
            </div>

            ${hasMore ? `
              <div style="text-align: center; margin-top: 18px;">
                <button type="button" class="btn-create-order" style="background: var(--surface); color: var(--text); border: 1px solid var(--border);"
                  onclick="MallApp.loadMoreActivity()">
                  Load more activities
                </button>
              </div>
            ` : (displayed.length > 0 ? `
              <div style="text-align: center; margin-top: 18px; font-size: 0.78rem; color: var(--text-muted);">
                All activities in this view are loaded.
              </div>
            ` : '')}
          </div>
        </div>
      `;
    }

    return '';
  },

  getProfileSkeletonHTML() {
    return `
      <div class="profile-page-container">
        <div class="profile-grid-layout">
          <aside class="profile-summary-card">
            <div class="profile-avatar-center">
              <div class="profile-avatar-wrapper" style="background: var(--border); animation: pulse 1.5s infinite;"></div>
              <div style="width: 100px; height: 28px; background: var(--border); border-radius: 6px; margin: 12px auto; animation: pulse 1.5s infinite;"></div>
            </div>
            <div style="height: 20px; width: 60%; background: var(--border); border-radius: 4px; margin: 14px auto; animation: pulse 1.5s infinite;"></div>
            <div style="height: 14px; width: 40%; background: var(--border); border-radius: 4px; margin: 6px auto 20px; animation: pulse 1.5s infinite;"></div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div style="height: 16px; background: var(--border); border-radius: 4px; animation: pulse 1.5s infinite;"></div>
              <div style="height: 16px; background: var(--border); border-radius: 4px; animation: pulse 1.5s infinite;"></div>
              <div style="height: 16px; background: var(--border); border-radius: 4px; animation: pulse 1.5s infinite;"></div>
            </div>
          </aside>
          <div class="profile-tabs-wrapper">
            <div class="profile-card" style="height: 380px; animation: pulse 1.5s infinite; background: var(--surface); border: 1px solid var(--border); border-radius: 12px;"></div>
          </div>
        </div>
      </div>
    `;
  },

  setProfileTab(tabName, pushHistory = true) {
    if (Object.values(MallState.profileEditSections || {}).some(Boolean)) {
      if (!confirm('You have unsaved changes in your profile. Are you sure you want to discard them?')) {
        return;
      }
      MallState.profileEditSections = {};
    }

    MallState.profileActiveTab = tabName;
    if (pushHistory) {
      const url = tabName === 'personal' ? '/profile' : `/profile?tab=${tabName}`;
      try {
        window.history.pushState({ view: 'profile', tab: tabName }, '', url);
      } catch (e) {}
    }
    this.renderProfileView();
  },

  toggleProfileEdit(sectionId, enable) {
    MallState.profileEditSections[sectionId] = Boolean(enable);
    this.renderProfileView();
  },

  cancelProfileEdit(sectionId) {
    MallState.profileEditSections[sectionId] = false;
    this.renderProfileView();
  },

  validateBasicForm() {
    const fName = document.getElementById('profFirstName')?.value.trim();
    const lName = document.getElementById('profLastName')?.value.trim();
    const dName = document.getElementById('profDisplayName')?.value.trim();

    let valid = true;
    const setErr = (id, msg) => {
      const el = document.getElementById(id);
      if (el) el.textContent = msg || '';
      if (msg) valid = false;
    };

    setErr('err_profFirstName', !fName ? 'First name is required' : '');
    setErr('err_profLastName', !lName ? 'Last name is required' : '');
    setErr('err_profDisplayName', !dName ? 'Display name is required' : '');

    const saveBtn = document.getElementById('saveBtn_personal_basic');
    if (saveBtn) {
      saveBtn.disabled = !valid;
      saveBtn.style.opacity = valid ? '1' : '0.5';
      saveBtn.style.cursor = valid ? 'pointer' : 'not-allowed';
    }
    return valid;
  },

  validatePersonalContactForm() {
    const email = document.getElementById('profEmail')?.value.trim();
    const phone = document.getElementById('profPhone')?.value.trim();

    let valid = true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[+]?[\d\s().-]{7,}$/;

    const setErr = (id, msg) => {
      const el = document.getElementById(id);
      if (el) el.textContent = msg || '';
      if (msg) valid = false;
    };

    setErr('err_profEmail', !email ? 'Email is required' : (!emailRegex.test(email) ? 'Enter a valid email' : ''));
    setErr('err_profPhone', !phone ? 'Phone is required' : (!phoneRegex.test(phone) ? 'Enter a valid phone number' : ''));

    const saveBtn = document.getElementById('saveBtn_personal_contact');
    if (saveBtn) {
      saveBtn.disabled = !valid;
      saveBtn.style.opacity = valid ? '1' : '0.5';
      saveBtn.style.cursor = valid ? 'pointer' : 'not-allowed';
    }
    return valid;
  },

  validateWorkContactForm() {
    const wEmail = document.getElementById('profWorkEmail')?.value.trim();
    const pEmail = document.getElementById('profPersonalEmail')?.value.trim();
    const wPhone = document.getElementById('profWorkPhone')?.value.trim();

    let valid = true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[+]?[\d\s().-]{7,}$/;

    const setErr = (id, msg) => {
      const el = document.getElementById(id);
      if (el) el.textContent = msg || '';
      if (msg) valid = false;
    };

    setErr('err_profWorkEmail', !wEmail ? 'Work email is required' : (!emailRegex.test(wEmail) ? 'Enter a valid work email' : ''));
    if (pEmail) {
      setErr('err_profPersonalEmail', !emailRegex.test(pEmail) ? 'Enter a valid personal email' : '');
    } else {
      setErr('err_profPersonalEmail', '');
    }
    setErr('err_profWorkPhone', !wPhone ? 'Work phone is required' : (!phoneRegex.test(wPhone) ? 'Enter a valid phone' : ''));

    const saveBtn = document.getElementById('saveBtn_contact_work');
    if (saveBtn) {
      saveBtn.disabled = !valid;
      saveBtn.style.opacity = valid ? '1' : '0.5';
      saveBtn.style.cursor = valid ? 'pointer' : 'not-allowed';
    }
    return valid;
  },

  validateEmergencyContactForm() {
    const eName = document.getElementById('profEmergName')?.value.trim();
    const ePhone = document.getElementById('profEmergPhone')?.value.trim();

    let valid = true;
    const phoneRegex = /^[+]?[\d\s().-]{7,}$/;

    const setErr = (id, msg) => {
      const el = document.getElementById(id);
      if (el) el.textContent = msg || '';
      if (msg) valid = false;
    };

    setErr('err_profEmergName', !eName ? 'Emergency contact name is required' : '');
    setErr('err_profEmergPhone', !ePhone ? 'Emergency phone is required' : (!phoneRegex.test(ePhone) ? 'Enter a valid phone' : ''));

    const saveBtn = document.getElementById('saveBtn_contact_emerg');
    if (saveBtn) {
      saveBtn.disabled = !valid;
      saveBtn.style.opacity = valid ? '1' : '0.5';
      saveBtn.style.cursor = valid ? 'pointer' : 'not-allowed';
    }
    return valid;
  },

  saveProfileSection(sectionId) {
    const profile = getProfile();

    if (sectionId === 'personal_basic') {
      if (!this.validateBasicForm()) return;
      saveProfile({
        firstName: document.getElementById('profFirstName')?.value.trim(),
        lastName: document.getElementById('profLastName')?.value.trim(),
        displayName: document.getElementById('profDisplayName')?.value.trim(),
        dob: document.getElementById('profDob')?.value,
        gender: document.getElementById('profGender')?.value
      });
    } else if (sectionId === 'personal_contact') {
      if (!this.validatePersonalContactForm()) return;
      saveProfile({
        email: document.getElementById('profEmail')?.value.trim(),
        phone: document.getElementById('profPhone')?.value.trim(),
        altPhone: document.getElementById('profAltPhone')?.value.trim(),
        preferredContactMethod: document.getElementById('profPrefMethod')?.value
      });
    } else if (sectionId === 'personal_address') {
      saveProfile({
        address: document.getElementById('profAddress')?.value.trim(),
        city: document.getElementById('profCity')?.value.trim(),
        state: document.getElementById('profState')?.value.trim(),
        pinCode: document.getElementById('profPinCode')?.value.trim(),
        country: document.getElementById('profCountry')?.value.trim()
      });
    } else if (sectionId === 'personal_bio') {
      saveProfile({
        bio: document.getElementById('profBio')?.value.trim()
      });
    } else if (sectionId === 'work_role') {
      saveProfile({
        role: document.getElementById('profRole')?.value.trim() || profile.role,
        department: document.getElementById('profDept')?.value.trim() || profile.department,
        reportingManager: document.getElementById('profManager')?.value.trim() || profile.reportingManager,
        shiftTiming: document.getElementById('profShift')?.value.trim() || profile.shiftTiming
      });
    } else if (sectionId === 'contact_work') {
      if (!this.validateWorkContactForm()) return;
      saveProfile({
        workEmail: document.getElementById('profWorkEmail')?.value.trim(),
        personalEmail: document.getElementById('profPersonalEmail')?.value.trim(),
        workPhone: document.getElementById('profWorkPhone')?.value.trim(),
        preferredContactMethod: document.getElementById('profPrefContact')?.value
      });
    } else if (sectionId === 'contact_emerg') {
      if (!this.validateEmergencyContactForm()) return;
      saveProfile({
        emergencyContactName: document.getElementById('profEmergName')?.value.trim(),
        emergencyContactRelation: document.getElementById('profEmergRel')?.value.trim(),
        emergencyContactPhone: document.getElementById('profEmergPhone')?.value.trim()
      });
    } else if (sectionId === 'preferences_regional') {
      const selectedCurrency = document.getElementById('prefCurrency')?.value || 'USD';
      saveProfile({
        preferences: {
          ...profile.preferences,
          language: document.getElementById('prefLanguage')?.value,
          timezone: document.getElementById('prefTimezone')?.value,
          dateFormat: document.getElementById('prefDateFormat')?.value,
          currency: selectedCurrency
        }
      });
      if (selectedCurrency !== MallState.currency) {
        this.setCurrency(selectedCurrency);
      }
    } else if (sectionId === 'preferences_interface') {
      const selectedTheme = document.getElementById('prefTheme')?.value || 'dark';
      saveProfile({
        preferences: {
          ...profile.preferences,
          theme: selectedTheme,
          defaultLanding: document.getElementById('prefDefaultLanding')?.value
        }
      });
      const isCurrentDark = document.documentElement.classList.contains('dark');
      if ((selectedTheme === 'dark' && !isCurrentDark) || (selectedTheme === 'light' && isCurrentDark)) {
        this.setTheme(selectedTheme, false);
      }
    } else if (sectionId === 'preferences_notif') {
      saveProfile({
        preferences: {
          ...profile.preferences,
          notifications: {
            lowStockAlerts: { inApp: Boolean(document.getElementById('notif_lowStock')?.checked), email: true, sms: false },
            poApprovals: { inApp: Boolean(document.getElementById('notif_po')?.checked), email: true, sms: true },
            overdueRents: { inApp: Boolean(document.getElementById('notif_overdue')?.checked), email: true, sms: false },
            dailySummary: { inApp: Boolean(document.getElementById('notif_daily')?.checked), email: false, sms: false }
          }
        }
      });
    } else {
      // Fallback
      MallState.profileEditSections = {};
    }

    MallState.profileEditSections[sectionId] = false;
    this.updateUserProfile();
    this.renderProfileView();
    this.showToast('Profile updated successfully', 'success');
  },

  handleAvatarUpload(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.showToast('Photo must be less than 2 MB', 'error');
      event.target.value = '';
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      this.showToast('Please upload a valid JPG or PNG image', 'error');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      saveAvatar(dataUrl);
      this.updateUserProfile();
      this.renderProfileView();
      this.showToast('Profile photo updated', 'success');
      event.target.value = '';
    };
    reader.onerror = () => {
      this.showToast('Failed to read image file', 'error');
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  },

  removeAvatarPhoto() {
    removeAvatar();
    this.updateUserProfile();
    this.renderProfileView();
    this.showToast('Profile photo removed', 'info');
  },

  exportProfileData(format = 'json') {
    const profile = getProfile();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `MallMatrix_Profile_AlexRivera_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    this.showToast('Profile data exported successfully', 'success');
  },

  togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    if (btn) btn.textContent = isPassword ? '🙈' : '👁️';
  },

  checkPasswordStrength(pwd) {
    const ruleLen = pwd.length >= 8;
    const ruleUpper = /[A-Z]/.test(pwd);
    const ruleLower = /[a-z]/.test(pwd);
    const ruleNum = /[0-9]/.test(pwd);
    const ruleSpec = /[@$!%*?&#]/.test(pwd);

    const updateRuleUI = (id, passed) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('passed', passed);
      const icon = el.querySelector('.profile-rule-icon');
      if (icon) icon.textContent = passed ? '✓' : '○';
    };

    updateRuleUI('rule_len', ruleLen);
    updateRuleUI('rule_upper', ruleUpper);
    updateRuleUI('rule_lower', ruleLower);
    updateRuleUI('rule_num', ruleNum);
    updateRuleUI('rule_spec', ruleSpec);

    const score = [ruleLen, ruleUpper, ruleLower, ruleNum, ruleSpec].filter(Boolean).length;
    const label = document.getElementById('pwdStrengthLabel');
    const fill = document.getElementById('pwdStrengthFill');

    if (!pwd) {
      if (label) { label.textContent = 'Enter password'; label.style.color = 'var(--text-muted)'; }
      if (fill) { fill.style.width = '0%'; fill.style.background = '#EF4444'; }
    } else if (score <= 2) {
      if (label) { label.textContent = 'Weak'; label.style.color = '#EF4444'; }
      if (fill) { fill.style.width = '30%'; fill.style.background = '#EF4444'; }
    } else if (score <= 4) {
      if (label) { label.textContent = 'Medium'; label.style.color = '#F59E0B'; }
      if (fill) { fill.style.width = '65%'; fill.style.background = '#F59E0B'; }
    } else {
      if (label) { label.textContent = 'Strong'; label.style.color = '#10B981'; }
      if (fill) { fill.style.width = '100%'; fill.style.background = '#10B981'; }
    }

    this.checkPasswordMatch();
  },

  checkPasswordMatch() {
    const current = document.getElementById('profCurrentPwd')?.value;
    const newPwd = document.getElementById('profNewPwd')?.value || '';
    const confirmPwd = document.getElementById('profConfirmPwd')?.value || '';
    const errConfirm = document.getElementById('err_profConfirmPwd');
    const updateBtn = document.getElementById('btnUpdatePassword');

    const ruleLen = newPwd.length >= 8;
    const ruleUpper = /[A-Z]/.test(newPwd);
    const ruleLower = /[a-z]/.test(newPwd);
    const ruleNum = /[0-9]/.test(newPwd);
    const ruleSpec = /[@$!%*?&#]/.test(newPwd);
    const rulesPassed = ruleLen && ruleUpper && ruleLower && ruleNum && ruleSpec;

    let matched = true;
    if (confirmPwd && newPwd !== confirmPwd) {
      if (errConfirm) errConfirm.textContent = 'Passwords do not match';
      matched = false;
    } else {
      if (errConfirm) errConfirm.textContent = '';
    }

    const isValid = Boolean(current && rulesPassed && confirmPwd && newPwd === confirmPwd);
    if (updateBtn) {
      updateBtn.disabled = !isValid;
      updateBtn.style.opacity = isValid ? '1' : '0.5';
      updateBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }
  },

  handlePasswordChange() {
    const current = document.getElementById('profCurrentPwd')?.value;
    const newPwd = document.getElementById('profNewPwd')?.value;
    const confirmPwd = document.getElementById('profConfirmPwd')?.value;

    if (!current || !newPwd || newPwd !== confirmPwd) return;

    // Reset password form
    const form = document.getElementById('form_password');
    if (form) form.reset();
    this.checkPasswordStrength('');

    this.showToast('Password updated successfully', 'success');
  },

  toggleTwoFactorAuth() {
    const profile = getProfile();
    const nextState = !profile.twoFactorEnabled;
    saveProfile({ twoFactorEnabled: nextState });
    this.renderProfileView();
    this.showToast(`Two-factor authentication ${nextState ? 'enabled' : 'disabled'}`, 'info');
  },

  terminateSession(sessionId) {
    terminateSessionById(sessionId);
    this.renderProfileView();
    this.showToast('Session logged out successfully', 'info');
  },

  terminateAllOtherSessions() {
    terminateOtherSessions();
    this.renderProfileView();
    this.showToast('Logged out of all other devices', 'success');
  },

  openDeleteAccountModal() {
    const modal = document.getElementById('deleteAccountModal');
    if (modal) {
      modal.classList.add('open');
      const input = document.getElementById('deleteAccountInput');
      if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 50);
      }
      const btn = document.getElementById('confirmDeleteAccountBtn');
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      }
    }
    const copilot = document.getElementById('floatingCopilotBtn');
    if (copilot) copilot.style.display = 'none';
  },

  closeDeleteAccountModal() {
    const modal = document.getElementById('deleteAccountModal');
    if (modal) modal.classList.remove('open');
    const copilot = document.getElementById('floatingCopilotBtn');
    if (copilot && MallState.activeView !== 'copilot') copilot.style.display = 'flex';
  },

  handleDeleteAccountInputChange(val) {
    const btn = document.getElementById('confirmDeleteAccountBtn');
    if (!btn) return;
    const isConfirmed = (val || '').trim() === 'DELETE';
    btn.disabled = !isConfirmed;
    btn.style.opacity = isConfirmed ? '1' : '0.5';
    btn.style.cursor = isConfirmed ? 'pointer' : 'not-allowed';
  },

  confirmDeleteAccount() {
    this.closeDeleteAccountModal();
    this.showToast('Contact your administrator to delete the account', 'info');
  },

  filterActivityTimeline(filterType) {
    MallState.profileTimelineFilter = filterType;
    MallState.profileTimelineCount = 5;
    this.renderProfileView();
  },

  loadMoreActivity() {
    MallState.profileTimelineCount = (MallState.profileTimelineCount || 5) + 5;
    this.renderProfileView();
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
