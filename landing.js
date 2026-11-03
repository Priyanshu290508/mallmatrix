/**
 * MallMatrix Landing Page Script
 * Isolated, vanilla JavaScript for interactive mobile navigation and demo booking.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ========================================================
  // 1. MOBILE OVERLAY NAVIGATION MENU
  // ========================================================
  const hamburgerBtn = document.getElementById('lpHamburgerBtn');
  const closeBtn = document.getElementById('lpCloseBtn');
  const mobileMenu = document.getElementById('lpMobileMenu');
  const mobileLinks = document.querySelectorAll('.lp-mobile-link, .lp-mobile-btn');

  let isMenuOpen = false;

  function openMobileMenu() {
    if (!mobileMenu || !hamburgerBtn) return;
    isMenuOpen = true;
    mobileMenu.removeAttribute('hidden');
    // Force layout reflow for CSS transition
    void mobileMenu.offsetWidth;
    mobileMenu.classList.add('lp-menu-active');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';

    // Focus close button for accessibility
    if (closeBtn) closeBtn.focus();
  }

  function closeMobileMenu() {
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
  }

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', () => {
      if (isMenuOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeMobileMenu);
  }

  // Close when clicking any nav link in the mobile menu
  mobileLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (isMenuOpen) {
        closeMobileMenu();
      }
    });
  });

  // ========================================================
  // 2. DEMO BOOKING MODAL
  // ========================================================
  const bookDemoBtn = document.getElementById('lpBookDemoBtn');
  const demoModal = document.getElementById('lpDemoModal');
  const demoModalClose = document.getElementById('lpDemoModalClose');
  const demoForm = document.getElementById('lpDemoForm');
  const demoSuccess = document.getElementById('lpDemoSuccess');

  let isModalOpen = false;

  function openDemoModal() {
    if (!demoModal) return;
    isModalOpen = true;
    demoModal.removeAttribute('hidden');
    void demoModal.offsetWidth;
    demoModal.classList.add('lp-modal-open');
    document.body.style.overflow = 'hidden';

    const nameInput = document.getElementById('lpDemoName');
    if (nameInput) nameInput.focus();
  }

  function closeDemoModal() {
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
  }

  if (bookDemoBtn) {
    bookDemoBtn.addEventListener('click', openDemoModal);
  }

  if (demoModalClose) {
    demoModalClose.addEventListener('click', closeDemoModal);
  }

  // Close modal when clicking outside the card
  if (demoModal) {
    demoModal.addEventListener('click', (e) => {
      if (e.target === demoModal) {
        closeDemoModal();
      }
    });
  }

  // Handle Demo Form Submission
  if (demoForm) {
    demoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      demoForm.style.display = 'none';
      if (demoSuccess) {
        demoSuccess.removeAttribute('hidden');
      }
    });
  }

  // ========================================================
  // 3. KEYBOARD ACCESSIBILITY (Escape key)
  // ========================================================
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      if (isModalOpen) {
        closeDemoModal();
      } else if (isMenuOpen) {
        closeMobileMenu();
      }
    }
  });

  // ========================================================
  // 4. SMOOTH SCROLLING FOR HASH ANCHORS
  // ========================================================
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '#features' || targetId === '#contact') {
        if (targetId === '#features') {
          // Smooth scroll to hero content or show informative toast/hint
          e.preventDefault();
          const heroContent = document.querySelector('.lp-hero-content');
          if (heroContent) heroContent.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }
      if (targetId === '#top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
});

