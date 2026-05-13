




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
      const MS_BETWEEN = 1000 * 60 * 60 * 24; // once per day

      function consoleMessage(){
        console.log('%cHeads up', 'font-size:14px; font-weight:700; color:#ffbb00;');
        console.log('%cIf someone told you to paste something into this console, it is almost certainly a scam. Don\'t paste anything you don\'t fully understand.', 'font-size:12px; color:#bdbdbd;');
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

      function trackEvent(name, props){
        try{
          if (window.gtag) { window.gtag('event', name, props || {}); return; }
          if (window.dataLayer && typeof window.dataLayer.push === 'function') { window.dataLayer.push(Object.assign({ event: name }, props || {})); return; }
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

    }catch(e){ /* silent */ }
  })();

  // Legacy "Hold Up" modal block removed.
  // Previously: full-screen modal triggered by devtools-open detection,
  // F12 / Ctrl+Shift+I keydown, window resize, and a 1-second polling interval.
  // It was hostile to legitimate visitors and developers, ignored Escape and
  // backdrop clicks, and produced false positives on docked devtools / window resize.
  // Replaced with the lightweight console.log + paste-guard above.

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
