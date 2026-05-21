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
    initAskMenu();
    ensureToastHost();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── ASK MENU (Copy MD / Discuss with AI) ──
  function initAskMenu() {
    if (window.__acrpAskMenuInit) return;
    window.__acrpAskMenuInit = true;

    document.addEventListener('click', (e) => {
      const menu = document.getElementById('askMenu');
      if (!menu) return;

      const btn = e.target && e.target.closest ? e.target.closest('#askBtn') : null;
      if (btn) {
        e.stopPropagation();
        toggleAskMenu();
        return;
      }

      if (menu.dataset.open !== 'true') return;

      const activeBtn = document.getElementById('askBtn');
      const clickedInsideBtn = activeBtn ? activeBtn.contains(e.target) : false;
      if (!menu.contains(e.target) && !clickedInsideBtn) {
        closeAskMenu();
      }
    });

    document.addEventListener('keydown', (e) => {
      const menu = document.getElementById('askMenu');
      if (!menu || e.key !== 'Escape' || menu.dataset.open !== 'true') return;

      closeAskMenu();
      const btn = document.getElementById('askBtn');
      if (btn) btn.focus();
    });
  }
  function toggleAskMenu() {
    const btn = document.getElementById('askBtn');
    const menu = document.getElementById('askMenu');
    if (!btn || !menu) return;
    const open = menu.dataset.open === 'true';
    if (open) closeAskMenu(); else openAskMenu();
  }
  function openAskMenu() {
    const btn = document.getElementById('askBtn');
    const menu = document.getElementById('askMenu');
    if (!btn || !menu) return;
    menu.hidden = false;
    requestAnimationFrame(() => { menu.dataset.open = 'true'; });
    btn.setAttribute('aria-expanded', 'true');
  }
  function closeAskMenu() {
    const btn = document.getElementById('askBtn');
    const menu = document.getElementById('askMenu');
    if (!btn || !menu) return;
    menu.dataset.open = 'false';
    btn.setAttribute('aria-expanded', 'false');
    setTimeout(() => { if (menu.dataset.open !== 'true') menu.hidden = true; }, 200);
  }

  // ── TOAST ──
  function ensureToastHost() {
    if (document.getElementById('toastHost')) return;
    const host = document.createElement('div');
    host.id = 'toastHost';
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  function showToast(message, opts) {
    ensureToastHost();
    const host = document.getElementById('toastHost');
    const t = document.createElement('div');
    t.className = 'toast';
    const icon = (opts && opts.error)
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    t.innerHTML = icon + '<span></span>';
    t.querySelector('span').textContent = message;
    host.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    const ttl = (opts && opts.ttl) || 2400;
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 260);
    }, ttl);
  }

  // ── MARKDOWN EXTRACTION ──
  function textOf(el) {
    if (!el) return '';
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function nodeToMarkdown(node, depth) {
    depth = depth || 0;
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent || '').replace(/\s+/g, ' ');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName.toLowerCase();
    const kids = () => Array.from(node.childNodes).map(c => nodeToMarkdown(c, depth)).join('');
    switch (tag) {
      case 'h1': return '\n\n# '   + textOf(node) + '\n\n';
      case 'h2': return '\n\n## '  + textOf(node) + '\n\n';
      case 'h3': return '\n\n### ' + textOf(node) + '\n\n';
      case 'h4': return '\n\n#### '+ textOf(node) + '\n\n';
      case 'p':  return '\n\n' + kids().trim() + '\n\n';
      case 'br': return '\n';
      case 'strong': case 'b': return '**' + kids() + '**';
      case 'em': case 'i':     return '_'  + kids() + '_';
      case 'code':             return '`'  + textOf(node) + '`';
      case 'a': {
        const href = node.getAttribute('href') || '';
        const label = kids().trim() || href;
        if (!href || href.startsWith('javascript:')) return label;
        return '[' + label + '](' + href + ')';
      }
      case 'ul': case 'ol': {
        const ordered = tag === 'ol';
        const items = Array.from(node.children).filter(c => c.tagName.toLowerCase() === 'li');
        return '\n' + items.map((li, i) => {
          const bullet = ordered ? (i + 1) + '.' : '-';
          const body = Array.from(li.childNodes).map(c => nodeToMarkdown(c, depth + 1)).join('').trim();
          // Collapse internal newlines inside list items to keep them on one logical line.
          return bullet + ' ' + body.replace(/\n+/g, ' ');
        }).join('\n') + '\n\n';
      }
      case 'li': return kids();
      case 'hr': return '\n\n---\n\n';
      case 'blockquote': return '\n> ' + kids().trim().replace(/\n/g, '\n> ') + '\n\n';
      case 'script': case 'style': case 'svg': case 'button': case 'input': case 'mark': return '';
      default: return kids();
    }
  }
  function documentToMarkdown() {
    const lines = [];
    const title = textOf(document.querySelector('.doc-title')) || document.title;
    if (title) lines.push('# ' + title);

    const meta = Array.from(document.querySelectorAll('.doc-meta .doc-meta-item'))
      .map(el => textOf(el)).filter(Boolean);
    if (meta.length) lines.push('', '_' + meta.join(' · ') + '_');

    const intro = document.querySelector('.doc-intro');
    if (intro) lines.push('', textOf(intro));

    const sourceUrl = window.location.href.split('#')[0];
    lines.push('', '> Source: ' + sourceUrl);

    document.querySelectorAll('.doc-section').forEach(section => {
      const num = textOf(section.querySelector('.section-num'));
      const heading = textOf(section.querySelector('.section-heading'));
      if (heading) lines.push('', '', '## ' + (num ? num + ' ' : '') + heading);

      const sIntro = section.querySelector('.section-intro');
      if (sIntro) lines.push('', nodeToMarkdown(sIntro).trim());

      section.querySelectorAll('.accordion-item').forEach(item => {
        const qTitle = textOf(item.querySelector('.accordion-title'));
        if (qTitle) lines.push('', '### ' + qTitle);
        const body = item.querySelector('.accordion-body-inner');
        if (body) {
          const md = Array.from(body.childNodes).map(c => nodeToMarkdown(c)).join('');
          lines.push('', md.replace(/\n{3,}/g, '\n\n').trim());
        }
      });
    });

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  async function writeClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return true; } catch (_) { /* fall through */ }
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  }

  async function copyMarkdown() {
    closeAskMenu();
    const md = documentToMarkdown();
    const ok = await writeClipboard(md);
    if (ok) showToast('Page copied as Markdown');
    else showToast('Copy failed — clipboard unavailable', { error: true, ttl: 3200 });
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function printMarkdownPdf() {
    closeAskMenu();
    const md = documentToMarkdown();
    const title = textOf(document.querySelector('.doc-title')) || document.title || 'Legal Document';
    const url = window.location.href.split('#')[0];
    const openedAt = new Date().toISOString().replace('T', ' ').replace('Z', ' UTC');

    // Keep same-origin script access to the popup so we can reliably
    // inject content and trigger print even when inline scripts are blocked.
    const w = window.open('', '_blank');
    if (!w) {
      showToast('Pop-up blocked — allow pop-ups to print Markdown PDF', { error: true, ttl: 3600 });
      return;
    }

    const html = [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<title>' + escapeHtml(title) + ' - Markdown Print</title>',
      '<style>',
      '@page { size: Letter; margin: 0.85in 0.75in; }',
      'html,body{margin:0;padding:0;background:#fff;color:#111;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,Monaco,monospace;}',
      '.sheet{max-width:8in;margin:0 auto;padding:0;}',
      '.meta{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;border-bottom:1px solid #d7d7d7;padding:0 0 10px;margin:0 0 14px;}',
      '.meta h1{font-size:18px;line-height:1.3;margin:0 0 6px;color:#000;}',
      '.meta p{margin:2px 0;font-size:12px;color:#444;}',
      'pre{white-space:pre-wrap;word-wrap:break-word;line-height:1.55;font-size:10.5pt;margin:0;color:#111;}',
      '.hint{display:none;}',
      '@media screen{body{padding:24px;}.sheet{box-shadow:0 6px 24px rgba(0,0,0,.12);padding:28px;border:1px solid #ececec;border-radius:8px;}.hint{display:block;margin:0 0 12px;font:12px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#555;}}',
      '@media print{.hint{display:none;} .sheet{box-shadow:none;border:none;padding:0;} }',
      '</style>',
      '</head>',
      '<body>',
      '<div class="sheet">',
      '<p class="hint">Markdown preview generated for printing. Use your browser\'s destination as Save as PDF.</p>',
      '<header class="meta">',
      '<h1>' + escapeHtml(title) + '</h1>',
      '<p>Source: ' + escapeHtml(url) + '</p>',
      '<p>Generated: ' + escapeHtml(openedAt) + '</p>',
      '</header>',
      '<pre>' + escapeHtml(md) + '</pre>',
      '</div>',
      '</body>',
      '</html>'
    ].join('');

    try {
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (_) {
      showToast('Unable to render Markdown preview window', { error: true, ttl: 3600 });
      return;
    }

    // Trigger print from the opener context (not inline in popup) so CSP on
    // the printed document cannot block the print call.
    const triggerPrint = () => {
      try {
        w.focus();
        w.print();
      } catch (_) {
        showToast('Unable to open print dialog', { error: true, ttl: 3200 });
      }
    };

    if (w.document.readyState === 'complete') {
      setTimeout(triggerPrint, 120);
    } else {
      w.addEventListener('load', () => setTimeout(triggerPrint, 120), { once: true });
    }
    showToast('Markdown print preview opened');
  }

  // ── DISCUSS WITH AI ──
  // Hybrid strategy: copy full MD to clipboard, open the provider with a short
  // prompt + the page URL. The user can either ask the AI to fetch the URL or
  // paste the clipboard contents directly.
  const AI_PROVIDERS = {
    chatgpt: {
      label: 'ChatGPT',
      url: 'https://chatgpt.com/?q=',
      supportsQuery: true
    },
    claude: {
      label: 'Claude',
      url: 'https://claude.ai/new?q=',
      supportsQuery: true
    },
    perplexity: {
      label: 'Perplexity',
      url: 'https://www.perplexity.ai/?q=',
      supportsQuery: true
    },
    deepseek: {
      // DeepSeek has no documented ?q= deeplink — open the chat and rely on the
      // clipboard. We still inform the user clearly.
      label: 'DeepSeek',
      url: 'https://chat.deepseek.com/',
      supportsQuery: false
    }
  };

  function buildPrompt(provider) {
    const title = textOf(document.querySelector('.doc-title')) || document.title;
    const url = window.location.href.split('#')[0];
    return (
      "I'd like to discuss this ACRP document with you: \"" + title + "\".\n\n" +
      'Source URL: ' + url + '\n\n' +
      "The full Markdown of the document is on my clipboard — please ask me to paste it, " +
      "or fetch the source URL if you can browse. Then help me understand and discuss it."
    );
  }

  async function discussWith(providerKey) {
    closeAskMenu();
    const provider = AI_PROVIDERS[providerKey];
    if (!provider) return;

    const md = documentToMarkdown();
    const copied = await writeClipboard(md);

    let target;
    if (provider.supportsQuery) {
      // Keep query under ~1800 chars to stay inside provider URL limits.
      const prompt = buildPrompt(providerKey);
      target = provider.url + encodeURIComponent(prompt).slice(0, 1800);
    } else {
      target = provider.url;
    }

    const win = window.open(target, '_blank', 'noopener,noreferrer');
    if (!win) {
      showToast('Pop-up blocked — allow pop-ups to open ' + provider.label, { error: true, ttl: 3600 });
      return;
    }
    if (copied) {
      showToast('Markdown copied — opening ' + provider.label + '\u2026');
    } else {
      showToast('Opening ' + provider.label + ' (clipboard unavailable, paste manually)', { error: true, ttl: 3600 });
    }
  }

  // Expose handlers used in inline onclick attributes
  window.toggleAccordion = toggleAccordion;
  window.openAccordion = openAccordion;
  window.expandAll = expandAll;
  window.collapseAll = collapseAll;
  window.scrollToSection = scrollToSection;
  window.clearSearch = clearSearchInput;
  window.toggleAskMenu = toggleAskMenu;
  window.copyMarkdown = copyMarkdown;
  window.printMarkdownPdf = printMarkdownPdf;
  window.discussWith = discussWith;
})();
