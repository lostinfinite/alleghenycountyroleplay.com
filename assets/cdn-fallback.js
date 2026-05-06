/**
 * CDN Fallback — alleghenycountyroleplay.com -> acrp.work
 * Probes the primary CDN; if unreachable, patches all existing and future
 * <link>, <img>, inline style attributes, and CSS rules to use the fallback.
 */
(function () {
  var PRIMARY  = 'cdn.alleghenycountyroleplay.com';
  var FALLBACK = 'cdn.acrp.work';
  var KEY      = '__cdnFallback';

  function replaceHost(str) {
    return str.replace(new RegExp(PRIMARY.replace('.', '\\.'), 'g'), FALLBACK);
  }

  function patchElement(el) {
    if (el.tagName === 'LINK' && el.href && el.href.indexOf(PRIMARY) !== -1) {
      el.href = replaceHost(el.href);
    }
    if ((el.tagName === 'IMG' || el.tagName === 'SOURCE') && el.src && el.src.indexOf(PRIMARY) !== -1) {
      if (!el.dataset.cdnFb) { el.dataset.cdnFb = '1'; el.src = replaceHost(el.src); }
    }
    var style = el.getAttribute && el.getAttribute('style');
    if (style && style.indexOf(PRIMARY) !== -1) {
      el.setAttribute('style', replaceHost(style));
    }
  }

  function patchCSSRules() {
    try {
      Array.from(document.styleSheets).forEach(function (sheet) {
        try {
          Array.from(sheet.cssRules || []).forEach(function (rule) {
            if (rule.style) {
              ['backgroundImage', 'background', 'content'].forEach(function (prop) {
                if (rule.style[prop] && rule.style[prop].indexOf(PRIMARY) !== -1) {
                  rule.style[prop] = replaceHost(rule.style[prop]);
                }
              });
            }
          });
        } catch (e) { /* cross-origin sheet */ }
      });
    } catch (e) {}
  }

  function patchAll() {
    document.querySelectorAll('link, img, source, [style]').forEach(patchElement);
    patchCSSRules();
  }

  function activate() {
    sessionStorage.setItem(KEY, '1');
    // Patch existing DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', patchAll);
    } else {
      patchAll();
    }
    // Patch dynamically injected elements
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          patchElement(node);
          node.querySelectorAll && node.querySelectorAll('link, img, source, [style]').forEach(patchElement);
        });
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Use cached result within the session to skip the probe on repeat page loads
  if (sessionStorage.getItem(KEY) === '1') {
    activate();
    return;
  }

  var probe = new Image();
  probe.onerror = activate;
  probe.src = 'https://' + PRIMARY + '/branding/acrp-wite.png?_probe=' + Date.now();
})();
