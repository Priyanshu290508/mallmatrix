/**
 * MallMatrix Landing Page Script
 * Vanilla JavaScript strictly scoped to landing.html
 * - Violet Pulse Theme switcher with localStorage persistence (Dark default)
 * - Accessible mobile navigation drawer
 * - Smooth anchor scrolling
 * - FAQ interactive accordion
 * - Animated stats counters with IntersectionObserver & Supabase RPC live loader
 * - Scroll reveal micro-animations
 */

import { fetchPublicStats } from './src/utils/publicStats.js';

(function () {
  'use strict';

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ========================================================
  // 1. THEME CONTROLLER (Dark mode default)
  // ========================================================
  const THEME_KEY = 'mallmatrix_landing_theme';

  function initTheme() {
    let savedTheme = null;
    try {
      savedTheme = localStorage.getItem(THEME_KEY);
    } catch (e) {
      // Storage unavailable fallback
    }

    // Default to dark mode
    const activeTheme = savedTheme === 'light' ? 'light' : 'dark';
    applyTheme(activeTheme);

    const desktopToggle = document.getElementById('mmThemeToggle');
    const drawerToggle = document.getElementById('mmDrawerThemeToggle');

    if (desktopToggle) {
      desktopToggle.addEventListener('click', toggleTheme);
    }
    if (drawerToggle) {
      drawerToggle.addEventListener('click', toggleTheme);
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}

    const isDark = theme === 'dark';
    const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

    const desktopToggle = document.getElementById('mmThemeToggle');
    if (desktopToggle) {
      desktopToggle.setAttribute('aria-label', label);
      desktopToggle.setAttribute('title', label);
    }

    const drawerToggle = document.getElementById('mmDrawerThemeToggle');
    if (drawerToggle) {
      drawerToggle.setAttribute('aria-label', label);
      drawerToggle.setAttribute('title', label);
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  }

  // ========================================================
  // 2. MOBILE NAVIGATION DRAWER
  // ========================================================
  function initMobileDrawer() {
    const hamburger = document.getElementById('mmHamburger');
    const drawer = document.getElementById('mmDrawer');
    const closeBtn = document.getElementById('mmDrawerClose');
    const drawerLinks = document.querySelectorAll('.mm-mobile-link');

    if (!hamburger || !drawer) return;

    function openDrawer() {
      drawer.removeAttribute('hidden');
      // Trigger reflow for CSS transition
      void drawer.offsetWidth;
      drawer.classList.add('is-open');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';

      if (closeBtn) {
        closeBtn.focus();
      }
    }

    function closeDrawer() {
      drawer.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';

      setTimeout(() => {
        if (!drawer.classList.contains('is-open')) {
          drawer.setAttribute('hidden', '');
        }
      }, 260);

      hamburger.focus();
    }

    hamburger.addEventListener('click', () => {
      const isOpen = drawer.classList.contains('is-open');
      if (isOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeDrawer);
    }

    // Backdrop click
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) {
        closeDrawer();
      }
    });

    // Close on any link click
    drawerLinks.forEach((link) => {
      link.addEventListener('click', closeDrawer);
    });

    // Keyboard Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });
  }

  // ========================================================
  // 3. FAQ ACCORDION
  // ========================================================
  function initAccordion() {
    const accordion = document.getElementById('mmAccordion');
    if (!accordion) return;

    const items = accordion.querySelectorAll('.mm-accordion-item');

    items.forEach((item) => {
      const button = item.querySelector('.mm-accordion-btn');
      if (!button) return;

      button.addEventListener('click', () => {
        const isExpanded = item.classList.contains('is-expanded');

        // Optional single-expand behavior: close siblings
        items.forEach((other) => {
          if (other !== item) {
            other.classList.remove('is-expanded');
            const otherBtn = other.querySelector('.mm-accordion-btn');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          }
        });

        if (isExpanded) {
          item.classList.remove('is-expanded');
          button.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('is-expanded');
          button.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  // ========================================================
  // 4. ANIMATED STATS COUNTERS & SUPABASE STATS LOADER
  // ========================================================
  const DEFAULT_DEMO_CAPTION = '* Demo figures representing real-time telemetry across simulated mall zones and tenant stores.';
  let hasAnimatedInitialCounters = false;
  let currentStoresCount = 48;
  let lastStatsData = null;
  let statsRefreshTimer = null;

  function animateNumber(element, startVal, endVal, duration = 1200) {
    if (!element) return;
    if (prefersReducedMotion || duration <= 0 || startVal === endVal) {
      element.textContent = String(endVal);
      element.setAttribute('data-target', String(endVal));
      return;
    }

    const range = endVal - startVal;
    const startTime = performance.now();

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (range * eased));
      element.textContent = String(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        element.textContent = String(endVal);
        element.setAttribute('data-target', String(endVal));
      }
    }

    requestAnimationFrame(step);
  }

  function formatRelativeTime(dateString) {
    try {
      const date = new Date(dateString);
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - date.getTime()) / 1000));
      if (diffSec < 45) return 'just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      return `${Math.floor(diffHour / 24)}d ago`;
    } catch (e) {
      return 'recently';
    }
  }

  function updateStatsDisplay(data) {
    const storesEl = document.getElementById('statStoresCount');
    const captionEl = document.getElementById('statsCaption');
    if (!storesEl) return;

    if (data && typeof data.storesTotal === 'number') {
      const newStoresTotal = data.storesTotal;
      lastStatsData = data;

      if (captionEl) {
        captionEl.textContent = `Live figures from MallMatrix · updated ${formatRelativeTime(data.updatedAt)}`;
      }

      if (hasAnimatedInitialCounters) {
        animateNumber(storesEl, currentStoresCount, newStoresTotal, 800);
      } else {
        storesEl.setAttribute('data-target', String(newStoresTotal));
        if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
          storesEl.textContent = String(newStoresTotal);
        }
      }

      currentStoresCount = newStoresTotal;
    } else {
      if (captionEl && !lastStatsData) {
        captionEl.textContent = DEFAULT_DEMO_CAPTION;
      }
    }
  }

  function initStatsCounters() {
    const statsSection = document.getElementById('stats');
    if (!statsSection) return;

    const counters = statsSection.querySelectorAll('.mm-stat-counter[data-target]');
    if (counters.length === 0) return;

    function triggerInitialAnimation() {
      if (hasAnimatedInitialCounters) return;
      hasAnimatedInitialCounters = true;

      counters.forEach((counter) => {
        const target = parseInt(counter.getAttribute('data-target'), 10) || 0;
        counter.textContent = '0';
        animateNumber(counter, 0, target, 1200);
      });
    }

    // Immediate display if reduced motion or IntersectionObserver is not supported
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      hasAnimatedInitialCounters = true;
      counters.forEach((el) => {
        el.textContent = el.getAttribute('data-target') || el.textContent;
      });
      return;
    }

    // Check if section is already visible in viewport on page load
    try {
      const rect = statsSection.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom >= 0;
      if (inView) {
        triggerInitialAnimation();
        return;
      }
    } catch (e) {
      hasAnimatedInitialCounters = true;
      counters.forEach((el) => {
        el.textContent = el.getAttribute('data-target') || el.textContent;
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimatedInitialCounters) {
            observer.disconnect();
            triggerInitialAnimation();
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(statsSection);
  }

  async function refreshStats() {
    if (document.hidden) return; // Pause while tab is hidden
    try {
      const stats = await fetchPublicStats();
      if (stats) {
        updateStatsDisplay(stats);
      } else {
        updateStatsDisplay(null);
      }
    } catch (e) {
      updateStatsDisplay(null);
    }
  }

  function initPublicStatsLoader() {
    // Initial fetch on page load
    refreshStats();

    // 60-second periodic refresh
    if (statsRefreshTimer) clearInterval(statsRefreshTimer);
    statsRefreshTimer = setInterval(() => {
      refreshStats();
    }, 60000);

    // Refresh when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        refreshStats();
      }
    });
  }

  // ========================================================
  // 5. SCROLL REVEAL MICRO-ANIMATIONS
  // ========================================================
  function initScrollReveal() {
    const reveals = document.querySelectorAll('.mm-reveal');
    if (reveals.length === 0) return;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      reveals.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.1
      }
    );

    reveals.forEach((el) => observer.observe(el));
  }

  // ========================================================
  // 6. SMOOTH ANCHOR NAVIGATION (72px navbar offset)
  // ========================================================
  function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;

        if (href === '#top') {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
          return;
        }

        const targetEl = document.querySelector(href);
        if (targetEl) {
          e.preventDefault();
          const navHeight = 72;
          const elementPosition = targetEl.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - navHeight;

          window.scrollTo({
            top: offsetPosition,
            behavior: prefersReducedMotion ? 'auto' : 'smooth'
          });
        }
      });
    });
  }

  // ========================================================
  // INITIALIZATION ON DOM READY
  // ========================================================
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileDrawer();
    initAccordion();
    initStatsCounters();
    initPublicStatsLoader();
    initScrollReveal();
    initSmoothScroll();
  });
})();
