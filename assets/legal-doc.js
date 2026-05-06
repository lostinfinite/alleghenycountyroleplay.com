/* =============================================================
   ACRP Legal Document Behavior
   Accordion, search, scroll-spy, scroll-reveal
   ============================================================= */
(function () {
  'use strict';

  // ── ACCORDION ──
  function toggleAccordion(id) {
    const el = document.getElementById('accordion-' + id);
    if (!el) return;
    el.classList.toggle('open');
  }
  function openAccordion(id) {
    const el = document.getElementById('accordion-' + id);
    if (el) el.classList.add('open');
  }
  function expandAll() {
    document.querySelectorAll('.accordion-item').forEach(el => el.classList.add('open'));
  }
  function collapseAll() {
    document.querySelectorAll('.accordion-item').forEach(el => el.classList.remove('open'));
  }

  // ── SCROLL SPY ──
  function updateSidebarActive() {
    const links = document.querySelectorAll('.sidebar-link[data-section]');
    if (!links.length) return;
    let current = links[0].dataset.section || '';
    document.querySelectorAll('.doc-section[data-section]').forEach(sec => {
      if (sec.getBoundingClientRect().top <= 120) current = sec.dataset.section;
    });
    links.forEach(l => l.classList.toggle('active', l.dataset.section === current));
    const ovLink = document.querySelector('.sidebar-link[data-section="overview"]');
    if (ovLink) {
      const ovEl = document.getElementById('section-overview');
      if (ovEl && ovEl.getBoundingClientRect().top > -40) {
        links.forEach(l => l.classList.remove('active'));
        ovLink.classList.add('active');
      }
    }
  }
  function scrollToSection(id) {
    const el = document.getElementById('section-' + id);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 96, behavior: 'smooth' });
  }

  // ── SEARCH ──
  function clearSearchInput() {
    const input = document.getElementById('mainSearch');
    if (input) { input.value = ''; runSearch(''); }
  }
  function runSearch(query) {
    const q = (query || '').trim().toLowerCase();
    document.querySelectorAll('mark').forEach(m => {
      const parent = m.parentNode;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
    const banner = document.getElementById('searchBanner');
    const bannerText = document.getElementById('searchBannerText');
    if (!q) {
      document.querySelectorAll('.doc-section').forEach(s => s.classList.remove('hidden'));
      document.querySelectorAll('.accordion-item').forEach(a => a.classList.remove('hidden'));
      if (banner) banner.classList.remove('visible');
      return;
    }
    if (bannerText) bannerText.textContent = 'Showing results for "' + query.trim() + '"';
    if (banner) banner.classList.add('visible');
    document.querySelectorAll('.doc-section').forEach(section => {
      if (!(section.innerText || '').toLowerCase().includes(q)) {
        section.classList.add('hidden');
        return;
      }
      section.classList.remove('hidden');
      section.querySelectorAll('.accordion-item').forEach(item => {
        if ((item.innerText || '').toLowerCase().includes(q)) {
          item.classList.remove('hidden');
          item.classList.add('open');
          highlightText(item, q);
        } else {
          item.classList.add('hidden');
        }
      });
    });
  }
  function highlightText(el, q) {
    if (!el) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) {
      if (n.textContent.toLowerCase().includes(q)) nodes.push(n);
    }
    nodes.forEach(tn => {
      const parent = tn.parentNode;
      if (!parent || ['MARK', 'SCRIPT', 'STYLE'].includes(parent.tagName)) return;
      const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      const parts = tn.textContent.split(re);
      const frag = document.createDocumentFragment();
      parts.forEach(p => {
        if (p.toLowerCase() === q) {
          const m = document.createElement('mark');
          m.textContent = p;
          frag.appendChild(m);
        } else {
          frag.appendChild(document.createTextNode(p));
        }
      });
      parent.replaceChild(frag, tn);
    });
  }

  // ── SCROLL REVEAL ──
  function initReveal() {
    const sections = document.querySelectorAll('.doc-section');
    if (!('IntersectionObserver' in window)) {
      sections.forEach(s => s.classList.add('visible'));
      return;
    }
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0, rootMargin: '0px 0px 0px 0px' });
    sections.forEach((s, i) => {
      s.style.transitionDelay = (Math.min(i, 8) * 0.07) + 's';
      const rect = s.getBoundingClientRect();
      if (rect.top < window.innerHeight + 100) {
        s.classList.add('visible');
      } else {
        obs.observe(s);
      }
    });
  }

  // ── INIT ──
  function init() {
    const search = document.getElementById('mainSearch');
    if (search) {
      let t;
      search.addEventListener('input', e => {
        clearTimeout(t);
        t = setTimeout(() => runSearch(e.target.value), 200);
      });
      search.addEventListener('keydown', e => { if (e.key === 'Escape') clearSearchInput(); });
    }
    window.addEventListener('scroll', updateSidebarActive, { passive: true });
    updateSidebarActive();
    requestAnimationFrame(() => requestAnimationFrame(initReveal));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose handlers used in inline onclick attributes
  window.toggleAccordion = toggleAccordion;
  window.openAccordion = openAccordion;
  window.expandAll = expandAll;
  window.collapseAll = collapseAll;
  window.scrollToSection = scrollToSection;
  window.clearSearch = clearSearchInput;
})();
