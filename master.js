




(function(){
  function isBlockedResourceError(ev) {

    if (!ev) return false;

    const t = ev.target;
    if (!t) return false;

    const tag = (t.tagName || '').toLowerCase();
    if (tag === 'script' || tag === 'img' || tag === 'link' || tag === 'iframe') {
      console.warn('Ignoring blocked resource:', t.src || t.href);
      return true;
    }

    return false;
  }

  window.addEventListener('error', function(ev){
    console.error('Global error caught:', ev);


    if (isBlockedResourceError(ev)) return;


    if (!ev.message && !ev.filename) return;


  }, true);

  window.addEventListener('unhandledrejection', function(ev){
    console.error('Unhandled promise rejection:', ev);

    const msg = String(ev.reason || '');


    if (
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('ERR_BLOCKED_BY_CLIENT') ||
      msg.includes('Load failed')
    ) {

      return;
    }

    // Just log, no redirect
  });
})();

(function loadTestConsoleModule(){
  try {
    if (document.querySelector('script[data-acrp-testconsole="1"]')) return;
    const s = document.createElement('script');
    s.src = '/testconsole.js';
    s.async = false;
    s.setAttribute('data-acrp-testconsole', '1');

    if (document.head) document.head.appendChild(s);
    else if (document.documentElement) document.documentElement.appendChild(s);
  } catch (e) {
    console.warn('Failed to load testconsole.js', e);
  }
})();

(function maintenanceGate(){
  try {
    if (window.__acrpMaintenanceGateInit) {
      console.info('[maintenance] gate already initialized; skipping duplicate init.');
      return;
    }
    window.__acrpMaintenanceGateInit = true;

    const MAINTENANCE_URL = 'https://raw.githubusercontent.com/lostinfinite/alleghenycountyroleplay.com/refs/heads/v2.0-12-16-25-12-58-p/assets/maintenence.json';
    const WORKING_PATH_RE = /\/working(\.html)?$/i;
    const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5:00

    function isOnWorkingPage() {
      const currentPath = window.location.pathname || '/';
      return WORKING_PATH_RE.test(currentPath);
    }

    function handleMaintenanceText(text) {
      const normalized = String(text || '').trim();
      const isOpen = (normalized === 'mten=false');

      console.info('[maintenance] response text:', normalized || '(empty)');

      if (isOpen) {
        console.info('[maintenance] status OK (mten=false).');
        return;
      }

      if (isOnWorkingPage()) {
        console.warn('[maintenance] maintenance active; already on /working.html.');
        return;
      }

      console.warn('[maintenance] maintenance active; redirecting to /working.html.');
      window.location.replace('/working.html');
    }

    function checkMaintenance(reason) {
      console.info('[maintenance] checking (' + reason + ')...');
      return fetch(MAINTENANCE_URL, { cache: 'no-store' })
        .then(function(res){
          console.info('[maintenance] fetch status:', res.status, res.ok ? 'OK' : 'NOT_OK');
          return res.text();
        })
        .then(handleMaintenanceText)
        .catch(function(err){
          console.error('[maintenance] check failed; failing closed to /working.html.', err);
          if (!isOnWorkingPage()) {
            window.location.replace('/working.html');
          }
        });
    }

    checkMaintenance('initial');
    window.__acrpMaintenanceTimer = window.setInterval(function(){
      checkMaintenance('poll 5:00');
    }, POLL_INTERVAL_MS);
    console.info('[maintenance] polling enabled every 5:00 (300000ms).');
  } catch (e) {
    console.error('[maintenance] fatal setup error; failing closed to /working.html.', e);
    const path = window.location.pathname || '/';
    if (!/\/working(\.html)?$/i.test(path)) {
      window.location.replace('/working.html');
    }
  }
})();


function loadFooter() {

  const path = window.location.pathname;
  if (/\/?(404|rejected)(\.html)?$/.test(path)) {
    return;
  }
  
  fetch('/footer.html')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(data => {

      const existingFooters = document.querySelectorAll('footer');
      existingFooters.forEach(footer => footer.remove());
      

      let footerContainer = document.getElementById('footer-container');
      if (!footerContainer) {
        footerContainer = document.createElement('div');
        footerContainer.id = 'footer-container';
        

        const scripts = document.body.querySelectorAll(':scope > script[src]');
        if (scripts.length > 0) {
          document.body.insertBefore(footerContainer, scripts[0]);
        } else {
          document.body.appendChild(footerContainer);
        }
      }
      footerContainer.innerHTML = data;
      
      // Initialize footer functionality after it's loaded
      setTimeout(function() {
        initFooterLanguageSelector();
      }, 50);
    })
    .catch(error => {
      console.error('Error loading footer:', error);

      const footerContainer = document.getElementById('footer-container') || 
        document.createElement('div');
      if (!document.getElementById('footer-container')) {
        footerContainer.id = 'footer-container';
        document.body.appendChild(footerContainer);
      }
      footerContainer.innerHTML = `
        <footer style="background: #000; color: #f0f0f0; padding: 2rem 1rem; text-align: center;">
          <p>&copy; 2026 Allegheny County Roleplay. All Rights Reserved</p>
        </footer>
      `;
    });
}


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    loadFooter();
  });
} else {
  loadFooter();
}


// Ensure GSAP is available on every page by injecting it before other scripts
(function ensureGSAP() {
  try {
    const GSAP_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist/gsap.min.js';

    
    function logGsapLoadedOnce(){
      try{
        if (window.__gsap_loaded_logged) return;
        window.__gsap_loaded_logged = true;
        console.log('%c[LOADED] GSAP loaded', 'color: purple; font-weight: 700;');
      }catch(e){  }
    }
    // expose so other modules can call if they detect gsap later
    window.__logGsapLoadedOnce = logGsapLoadedOnce;

    
    if (window.gsap) { logGsapLoadedOnce(); return; }

    // if there is an existing script tag for GSAP, attach a load listener
    const existingTag = document.querySelector(`script[src="${GSAP_SRC}"]`) || document.querySelector('script[src*="gsap@3.14"]');
    if (existingTag) {
      if (window.gsap) { logGsapLoadedOnce(); return; }
      existingTag.addEventListener('load', () => setTimeout(logGsapLoadedOnce, 0), { once: true });
      existingTag.addEventListener('error', () => console.warn('Existing GSAP script failed to load'), { once: true });
      return;
    }

    function insertScript() {
      try {
        const s = document.createElement('script');
        s.src = GSAP_SRC;
        s.async = false; 
        s.referrerPolicy = 'no-referrer';
        s.crossOrigin = 'anonymous';
        s.addEventListener('load', () => setTimeout(logGsapLoadedOnce, 0), { once: true });
        s.addEventListener('error', () => console.warn('GSAP script failed to load'), { once: true });

        
        const firstBodyScript = (document.body && document.body.querySelector('script')) || document.querySelector('script');
        if (firstBodyScript && firstBodyScript.parentNode) {
          firstBodyScript.parentNode.insertBefore(s, firstBodyScript);
        } else if (document.body) {
          document.body.appendChild(s);
        } else {
          document.documentElement.appendChild(s);
        }
      } catch (err) {
        console.error('insertScript error', err);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', insertScript);
    } else {
      insertScript();
    }
  } catch (e) {
    console.error('ensureGSAP error', e);
  }
})();


(function registerGsapPlugins(){
  if (window.__gsap_plugins_registered) return;

  const PLUGINS = [
    { name: 'MotionPathPlugin', url: 'https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist/MotionPathPlugin.min.js' },
    { name: 'ScrollToPlugin',   url: 'https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist/ScrollToPlugin.min.js' },
    { name: 'TextPlugin',       url: 'https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist/TextPlugin.min.js' }
  ];

  function loadScript(src){
    return new Promise((resolve, reject) => {
      try{
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          
          if (existing.getAttribute('data-gsap-loaded') === '1' || existing.readyState === 'complete') return resolve();
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject(new Error('failed to load ' + src)));
          return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.crossOrigin = 'anonymous';
        s.referrerPolicy = 'no-referrer';
        s.addEventListener('load', () => { s.setAttribute('data-gsap-loaded','1'); resolve(); });
        s.addEventListener('error', () => reject(new Error('failed to load ' + src)));
        
        const core = document.querySelector('script[src*="gsap@3.14.1/dist/gsap.min.js"], script[src*="gsap.min.js"]');
        if (core && core.parentNode) core.parentNode.insertBefore(s, core.nextSibling);
        else if (document.body) document.body.appendChild(s);
        else document.documentElement.appendChild(s);
      }catch(err){ reject(err); }
    });
  }

  function waitForGSAP(timeout = 5000){
    return new Promise((resolve, reject) => {
      if (window.gsap) return resolve(window.gsap);
      const coreScript = document.querySelector('script[src*="gsap@3.14.1/dist/gsap.min.js"], script[src*="gsap.min.js"]');
      let handled = false;
      if (coreScript) {
        coreScript.addEventListener('load', () => { handled = true; resolve(window.gsap); });
        coreScript.addEventListener('error', () => { handled = true; reject(new Error('gsap failed to load')); });
      }
      const start = Date.now();
      const iv = setInterval(() => {
        if (window.gsap) { clearInterval(iv); if (!handled) resolve(window.gsap); }
        else if (Date.now() - start > timeout) { clearInterval(iv); reject(new Error('timeout waiting for gsap')); }
      }, 50);
    });
  }

  async function ensure(){
    try{
      await waitForGSAP();
      
      try{ if (window.__logGsapLoadedOnce) window.__logGsapLoadedOnce(); }catch(e){}
    }catch(err){
      
      console.warn('GSAP core not present — skipping plugin registration');
      return;
    }

    const toLoad = [];
    PLUGINS.forEach(p => {
      const exists = window[p.name] || (window.gsap && window.gsap[p.name]);
      if (!exists) toLoad.push(loadScript(p.url).catch(e => { console.warn('Failed to load', p.name, e); }));
    });

    try{ await Promise.all(toLoad); }catch(e){  }

    const constructors = PLUGINS.map(p => window[p.name] || (window.gsap && window.gsap[p.name])).filter(Boolean);
    if (constructors.length) {
      try{
        window.gsap.registerPlugin(...constructors);
        window.__gsap_plugins_registered = true;
        console.info('Registered GSAP plugins:', constructors.map(c => c && (c.name || 'plugin')).join(', '));
      }catch(err){ console.warn('gsap.registerPlugin failed', err); }
    }

    // expose promise that resolves when gsap is available and plugins attempted
    if (!window.__gsapReady) window.__gsapReady = Promise.resolve(window.gsap);
  }

  ensure();
  })();

  
  (function consoleSafetyWarning(){
    try{
      const STORAGE_KEY = 'acrp_console_warning_last_shown';
      const SHOWN_SESSION_KEY = 'acrp_console_warning_modal_shown';
      const MS_BETWEEN = 1000 * 60 * 0.5; 

      function consoleMessage(){
        console.log('%cHold Up', 'font-size:16px; font-weight:800; color:#ffbb00;');
        console.log('%cIf you were told to paste something here then 11/10 it\'s a scam. Don\'t paste things unless you know what they do. If you do, consider joining us at https://alleghenycountyroleplay.com/careers', 'font-size:12px; color:#bdbdbd;');
      }

      (function maybeLogOccasional(){
        try{
          const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
          const now = Date.now();
          if (!last || (now - last) > MS_BETWEEN) {
            consoleMessage();
            localStorage.setItem(STORAGE_KEY, String(now));
          }
        }catch(e){}
      })();

      let modalEl = null;
      function createModal(){
        if (modalEl) return modalEl;
        const style = document.createElement('style');
        style.textContent = `
          .acrp-console-modal-backdrop{position:fixed;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.45),rgba(0,0,0,0.6));display:flex;align-items:center;justify-content:center;z-index:2147483646}
          .acrp-console-modal{background:linear-gradient(180deg,#0d0d0d,#111);border:1px solid rgba(255,255,255,0.04);padding:22px;border-radius:12px;max-width:520px;width:min(94vw,520px);box-shadow:0 20px 60px rgba(0,0,0,0.6);color:var(--text, #fff);font-family:Inter,system-ui,Arial,sans-serif}
          .acrp-console-modal h1{margin:0 0 8px 0;font-size:20px;color:#fff}
          .acrp-console-modal p{margin:0 0 18px 0;color:var(--muted,#bdbdbd);line-height:1.4}
          .acrp-console-modal .acrp-actions{display:flex;gap:10px;justify-content:flex-end}
          .acrp-console-modal .acrp-btn{background:var(--brand,#FFBB00);color:#000;border-radius:8px;padding:8px 12px;border:none;font-weight:700;cursor:pointer}
          .acrp-console-modal .acrp-close{background:transparent;border:1px solid rgba(255,255,255,0.06);color:var(--muted,#bdbdbd);padding:8px 10px;border-radius:8px;cursor:pointer}
        `;
        document.head.appendChild(style);

        const backdrop = document.createElement('div'); backdrop.className = 'acrp-console-modal-backdrop';
        backdrop.setAttribute('role','dialog');
        backdrop.setAttribute('aria-modal','true');
        backdrop.style.display = 'none';

        const dialog = document.createElement('div'); dialog.className = 'acrp-console-modal';
        dialog.setAttribute('role','document');
        dialog.setAttribute('aria-labelledby','acrp-console-modal-title');
        dialog.setAttribute('aria-describedby','acrp-console-modal-desc');
        dialog.tabIndex = -1;
        dialog.innerHTML = `<h1 id="acrp-console-modal-title">Hold Up…</h1>
          <p id="acrp-console-modal-desc">If you were told to paste something in the console then 11/10 it's a scam. Don't paste things unless you know what they do.</p>
          <div class="acrp-actions"><button class="acrp-close">Okay, I understand</button></div>`; 

        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);

        const closeBtn = dialog.querySelector('.acrp-close');
        closeBtn.addEventListener('click', function onClose(){ try{ trackEvent('console_warning_dismissed'); }catch(e){} hideModal(); });
        // Require explicit button click to dismiss — ignore backdrop clicks and Escape.
        backdrop.addEventListener('click', (e)=>{
          if (e.target === backdrop) {
            // keep focus on the action button so user must click it to dismiss
            const btn = dialog.querySelector('.acrp-close'); if (btn) btn.focus();
          }
        });

        modalEl = backdrop;
        return modalEl;
      }

      let __prevActive = null;
      let __focusTrapHandler = null;
      function trapFocus(modal){
        try{
          const focusable = modal.querySelectorAll('a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])');
          if (!focusable || focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length-1];
          __focusTrapHandler = function(e){
            if (e.key === 'Tab'){
              if (e.shiftKey){ if (document.activeElement === first){ e.preventDefault(); last.focus(); } }
              else { if (document.activeElement === last){ e.preventDefault(); first.focus(); } }
            } else if (e.key === 'Escape'){
              // explicitly ignored to require explicit button click
              e.preventDefault();
            }
          };
          document.addEventListener('keydown', __focusTrapHandler, true);
        }catch(e){}
      }
      function releaseFocusTrap(){ try{ if (__focusTrapHandler) { document.removeEventListener('keydown', __focusTrapHandler, true); __focusTrapHandler = null; } }catch(e){} }

      function setBackgroundInert(inert){
        try{ Array.from(document.body.children).forEach(n => { if (n === modalEl) return; if (inert) n.setAttribute('aria-hidden','true'); else n.removeAttribute('aria-hidden'); }); }catch(e){}
      }

      function trackEvent(name, props){
        try{
          if (window.gtag) { window.gtag('event', name, props || {}); return; }
          if (window.dataLayer && typeof window.dataLayer.push === 'function') { window.dataLayer.push(Object.assign({ event: name }, props || {})); return; }
          console.info('trackEvent', name, props || {});
          if (window.__TELEMETRY_ENDPOINT) { try{ navigator.sendBeacon(window.__TELEMETRY_ENDPOINT, JSON.stringify({ event: name, props: props || {}, url: location.href, ts: Date.now() })); }catch(e){} }
        }catch(e){}
      }

      function showModal(){
        try{
          const m = createModal();
          __prevActive = document.activeElement;
          setBackgroundInert(true);
          m.style.display = '';
          const btn = m.querySelector('.acrp-close'); if (btn) { btn.focus(); trapFocus(m); }
          trackEvent('console_warning_shown');
        }catch(e){console.error(e)}
      }
      function hideModal(){
        try{
          if (!modalEl) modalEl = document.querySelector('.acrp-console-modal-backdrop');
          if (modalEl){
            modalEl.style.display = 'none';
            releaseFocusTrap();
            setBackgroundInert(false);
            if (__prevActive && typeof __prevActive.focus === 'function'){ try{ __prevActive.focus(); }catch(e){} }
            __prevActive = null;
          }
        }catch(e){}
      }

      // paste-guard: warn before allowing code-like text to be pasted into inputs/contenteditable
      document.addEventListener('paste', function(e){
        try{
          const target = e.target;
          if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable)) return;
          const text = (e.clipboardData || window.clipboardData).getData('text') || '';
          if (!text) return;
          const suspicious = /\b(console\.|eval\(|fetch\(|location\.|document\.|window\.|function\s*\(|=>)\b/.test(text);
          if (suspicious){
            trackEvent('suspicious_paste_detected', { field: target.name || target.id || target.tagName });
            const ok = confirm('Pasted text looks like code — are you sure you want to paste it here?');
            if (!ok){ e.preventDefault(); trackEvent('suspicious_paste_blocked', { field: target.name || target.id || target.tagName }); }
          }
        }catch(err){}
      }, true);

      function logAndMaybeModal(){ try{ consoleMessage(); showModal(); }catch(e){} }

      let lastDevtoolsState = false;
      function isDevToolsOpen(){
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return false;
        const threshold = 160;
        const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
        const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
        return widthDiff > threshold || heightDiff > threshold;
      }

      window.addEventListener('keydown', function(e){
        try{
          if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) || (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i'))){
            setTimeout(logAndMaybeModal, 50);
          }
        }catch(err){}
      });

      function checkDevtoolsLoop(){
        try{
          const open = isDevToolsOpen();
          if (open && !lastDevtoolsState){
            logAndMaybeModal();
          }
          lastDevtoolsState = open;
        }catch(e){}
      }
      window.addEventListener('resize', function(){ setTimeout(checkDevtoolsLoop, 200); });
      const iv = setInterval(checkDevtoolsLoop, 1000);
      setTimeout(checkDevtoolsLoop, 1000);

    }catch(e){ console.error('consoleSafetyWarning init failed', e); }
  })();

(function forceMobileUI(){
  try{
    const MOBILE_BREAKPOINT = 720;
    const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT}px)`;

    function isMobile(){
      try{
        return (window.matchMedia && window.matchMedia(MOBILE_QUERY).matches) || /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent || '');
      }catch(e){ return false; }
    }

    function setBodyClasses(){
      try{
        const root = document.documentElement;
        if (isMobile()) root.classList.add('is-mobile'); else root.classList.remove('is-mobile');
        if ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0) root.classList.add('has-touch'); else root.classList.remove('has-touch');
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('prefers-reduced-motion');
      }catch(e){}
    }

    function ensureViewportMeta(){
      try{
        const WANT = 'width=device-width,initial-scale=1,viewport-fit=cover';
        let m = document.querySelector('meta[name=viewport]');
        if (!m){
          m = document.createElement('meta');
          m.name = 'viewport';
          m.content = WANT;
          document.head && document.head.appendChild(m);
        } else if (!m.content || m.content.indexOf('width=device-width') === -1){
          m.content = WANT;
        }
      }catch(e){}
    }

    function injectMobileCSS(){
      try{
        if (document.getElementById('acrp-mobile-helpers')) return;
        const css = `
/* Mobile UI helpers injected by master.js */
@media (max-width:720px){
  :root { --acrp-mobile-gap: 12px; }
  .acrp-console-modal, .modal, .popup, .samodal-window .modal-content { width: calc(100% - 32px) !important; max-width: none !important; border-radius: 12px !important; margin: 12px auto !important; box-shadow: 0 8px 20px rgba(0,0,0,0.32) !important; }
  .acrp-console-modal-backdrop { padding: 12px; align-items: flex-end; justify-content: center; }
  button, .btn, .acrp-btn, .acrp-close { padding: 12px 16px !important; min-height: 44px !important; min-width: 44px !important; font-size: 15px !important; border-radius: 10px !important; }
  input, textarea, select { font-size: 16px !important; }
  img, picture, video, iframe { max-width: 100% !important; height: auto !important; display: block !important; }
  /* reduce heavy visuals/animations on small screens */
  * { transition: none !important; animation: none !important; }
  a, button { -webkit-tap-highlight-color: rgba(0,0,0,0.05); touch-action: manipulation; }
  .mobile-menu-toggle { display: inline-flex; align-items: center; justify-content: center; width:44px; height:44px; border-radius: 10px; border: none; background: transparent; color: inherit; margin-right: 8px; }
  .mobile-menu-open nav { display: block !important; }
  .popup, .modal { left: 50% !important; transform: translateX(-50%) !important; }
}
@media (pointer: coarse){
  /* hide hover-only helpers on touch devices (opt-in via .hover-only-on-desktop) */
  .hover-only-on-desktop { display: none !important; }
}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
`;
        const s = document.createElement('style');
        s.id = 'acrp-mobile-helpers';
        s.textContent = css;
        document.head && document.head.appendChild(s);
      }catch(e){}
    }

    function lazyLoadImagesOnMobile(){
      try{
        if (!isMobile()) return;
        document.querySelectorAll('img:not([loading])').forEach(img => {
          if (img.hasAttribute('data-critical') || img.classList.contains('no-lazy')) return;
          try{ img.setAttribute('loading','lazy'); }catch(e){}
        });
      }catch(e){}
    }

    function injectMobileMenuToggle(){
      try{
        const header = document.querySelector('header');
        if (!header) return;
        const nav = header.querySelector('nav');
        if (!nav) return;
        if (header.querySelector('#acrp-mobile-toggle')) return;
        const btn = document.createElement('button');
        btn.id = 'acrp-mobile-toggle';
        btn.className = 'mobile-menu-toggle';
        btn.setAttribute('aria-expanded','false');
        btn.setAttribute('aria-label','Toggle navigation');
        btn.innerHTML = '<svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect y="1" width="20" height="2" rx="1" fill="currentColor"></rect><rect y="6" width="20" height="2" rx="1" fill="currentColor"></rect><rect y="11" width="20" height="2" rx="1" fill="currentColor"></rect></svg>';
        header.insertBefore(btn, nav);
        btn.addEventListener('click', function(){
          const open = document.documentElement.classList.toggle('mobile-menu-open');
          btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
      }catch(e){}
    }

    // initial apply
    setBodyClasses();
    ensureViewportMeta();
    injectMobileCSS();
    lazyLoadImagesOnMobile();

    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', function(){
        injectMobileMenuToggle();
        setBodyClasses();
        lazyLoadImagesOnMobile();
      });
    } else {
      injectMobileMenuToggle();
    }

    window.addEventListener('resize', function(){ setBodyClasses(); lazyLoadImagesOnMobile(); });
    window.addEventListener('orientationchange', function(){ setTimeout(()=>{ setBodyClasses(); lazyLoadImagesOnMobile(); }, 150); });

    // public flag for debugging
    window.__acrp_mobile_ui_forced = true;
    console.info('acrp: mobile UI helpers applied');
  }catch(err){ console.error('acrp: forceMobileUI failed', err); }
})();

// Footer Language Selector functionality
function initFooterLanguageSelector() {
  console.log('Initializing footer language selector...');
  
  var trigger = document.getElementById('acrpLangTrigger');
  var dropdown = document.getElementById('acrpLangDropdown');
  var items = document.querySelectorAll('#acrpLangList li');
  var currentLabel = document.getElementById('acrpLangCurrent');

  console.log('Elements found:', { trigger: !!trigger, dropdown: !!dropdown, items: items.length });

  if (!trigger || !dropdown) {
    console.error('Missing required elements for language selector');
    return false;
  }

  trigger.addEventListener('click', function(e){
    console.log('Trigger clicked');
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    var isOpen = dropdown.classList.contains('open');
    console.log('Current state:', { isOpen: isOpen });
    
    if (isOpen) {
      dropdown.classList.remove('open');
      trigger.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      console.log('Dropdown closed');
    } else {
      dropdown.classList.add('open');
      trigger.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      console.log('Dropdown opened');
    }
  });

  // Use a timeout to avoid immediate closure from the same click
  setTimeout(function() {
    document.addEventListener('click', function(e){
      if (!e.target.closest('#acrpLangSelector')) {
        dropdown.classList.remove('open');
        trigger.classList.remove('open');
        trigger.setAttribute('aria-expanded','false');
      }
    });
  }, 10);

  items.forEach(function(li){
    li.addEventListener('click', function(){
      var lang = li.getAttribute('data-lang');
      items.forEach(function(el){ el.classList.remove('active'); el.setAttribute('aria-selected','false'); });
      li.classList.add('active');
      li.setAttribute('aria-selected','true');
      currentLabel.textContent = li.textContent.trim();

      dropdown.classList.remove('open');
      trigger.classList.remove('open');
      trigger.setAttribute('aria-expanded','false');

      console.log('Language selected:', lang);
      doGTranslate(lang);
    });
  });
  
  console.log('Footer language selector initialized successfully');
  return true;
}

// Google Translate integration
function doGTranslate(lang) {
  if (lang === 'en') {
    var frame = document.querySelector('.goog-te-banner-frame');
    if (frame) {
      var innerDoc = frame.contentDocument || frame.contentWindow.document;
      var restore = innerDoc.querySelector('.goog-te-button button');
      if (restore) restore.click();
    }
    document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
    document.cookie = 'googtrans=; path=/; domain=.' + location.hostname + '; expires=Thu, 01 Jan 1970 00:00:00 UTC';
    if (typeof google !== 'undefined' && google.translate) {
      try {
        var sel = document.querySelector('.goog-te-combo');
        if (sel) { sel.value = 'en'; sel.dispatchEvent(new Event('change')); }
      } catch(e){}
    }
    return;
  }

  document.cookie = 'googtrans=/en/' + lang + '; path=/';
  document.cookie = 'googtrans=/en/' + lang + '; path=/; domain=.' + location.hostname;

  if (typeof google !== 'undefined' && google.translate) {
    try {
      var sel = document.querySelector('.goog-te-combo');
      if (sel) { sel.value = lang; sel.dispatchEvent(new Event('change')); return; }
    } catch(e){}
  }
  location.reload();
}

// Load Google Translate script
if (!window.googleTranslateElementInit) {
  window.googleTranslateElementInit = function(){
    new google.translate.TranslateElement({
      pageLanguage:'en',
      autoDisplay:false,
      layout: google.translate.TranslateElement.InlineLayout.SIMPLE
    },'google_translate_element');
  };

  if (!document.querySelector('script[src*="translate.google.com"]')) {
    var s = document.createElement('script');
    s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    document.body.appendChild(s);
  }
}
