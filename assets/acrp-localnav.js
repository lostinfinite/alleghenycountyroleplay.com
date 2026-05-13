/* ──────────────────────────────────────────────────────────
   ACRP — Universal Apple-style local nav (pill) injector
   ──────────────────────────────────────────────────────────
   Configure per page via <body> data attributes:

     data-acrp-nav            (required) one of:
                              "home"        → Why Us (muted) + Login (CTA)
                              "default"     → Why Us (muted) + Home (muted) + Login (CTA)
                              "home-cta"    → Why Us (muted) + Home (CTA)
                              "articles"    → Home (muted)
                              "legal"       → Home (muted) + Ask (CTA, dropdown)

    data-acrp-nav-short      Short brand label shown by default.
              Defaults to "ACRP".

    data-acrp-nav-logo-src   Optional logo source URL.
              Defaults to the ACRP logo.

     data-acrp-nav-name-href  Link target for the name. Default "/".

     data-acrp-nav-login-href Override Login destination.
                              Default https://portal.alleghenycountyroleplay.com

     data-acrp-nav-why-href   Override Why Us anchor. Default "/#why".

     data-acrp-nav-home-href  Override Home destination. Default "/".

   The script is idempotent: it removes any existing #acrp-localnav
   before injecting, and inserts the nav as the first child of <body>.
   ────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  // Inject the stylesheet once, derived from this script's own src so it
  // works regardless of the page's relative path.
  function injectStylesheet() {
    var existing = document.getElementById('acrp-localnav-css');
    if (existing) {
      return new Promise(function (resolve) {
        if (existing.sheet) resolve();
        else {
          existing.addEventListener('load', function () { resolve(); }, { once: true });
          // Keep navigation functional even if load events are delayed.
          setTimeout(resolve, 400);
        }
      });
    }

    var thisScript = document.currentScript ||
      (function () {
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
          if (scripts[i].src && scripts[i].src.indexOf('acrp-localnav.js') !== -1) {
            return scripts[i];
          }
        }
        return null;
      })();
    var href = '/assets/acrp-localnav.css';
    if (thisScript && thisScript.src) {
      href = thisScript.src.replace(/acrp-localnav\.js(\?.*)?$/, 'acrp-localnav.css');
    }
    var link = document.createElement('link');
    link.id = 'acrp-localnav-css';
    link.rel = 'stylesheet';
    link.href = href;
    (document.head || document.documentElement).appendChild(link);

    return new Promise(function (resolve) {
      link.addEventListener('load', function () { resolve(); }, { once: true });
      // Keep navigation functional even if load events are delayed.
      setTimeout(resolve, 400);
    });
  }

  function init() {
    var body = document.body;
    if (!body) return;
    var variant = body.getAttribute('data-acrp-nav');
    if (!variant) return;

    // Default to offset enabled unless a variant explicitly disables it.
    body.removeAttribute('data-acrp-nav-no-offset');

    // Remove prior injection
    var existing = document.getElementById('acrp-localnav');
    if (existing) existing.remove();

    var shortName = body.getAttribute('data-acrp-nav-short') || 'ACRP';
    var longName = 'Allegheny County Roleplay';
    var logoSrc = body.getAttribute('data-acrp-nav-logo-src') || 'https://cdn.alleghenycountyroleplay.com/branding/acrp-wite.png';
    var nameHref = body.getAttribute('data-acrp-nav-name-href') || '/';
    var loginHref = body.getAttribute('data-acrp-nav-login-href') || 'https://portal.alleghenycountyroleplay.com';
    var whyHref   = body.getAttribute('data-acrp-nav-why-href')   || '/#why';
    var homeHref  = body.getAttribute('data-acrp-nav-home-href')  || '/';

    var ctas = [];

    switch (variant) {
      case 'home':
        ctas.push({ label: 'Why Us?', href: whyHref, kind: 'muted' });
        ctas.push({ label: 'Login',   href: loginHref, kind: 'cta', ariaLabel: 'Login to portal' });
        break;
      case 'default':
        ctas.push({ label: 'Why Us?', href: whyHref, kind: 'muted' });
        ctas.push({ label: 'Home',    href: homeHref, kind: 'muted' });
        ctas.push({ label: 'Login',   href: loginHref, kind: 'cta', ariaLabel: 'Login to portal' });
        break;
      case 'home-cta':
        ctas.push({ label: 'Why Us?', href: whyHref, kind: 'muted' });
        ctas.push({ label: 'Home',    href: homeHref, kind: 'cta' });
        break;
      case 'articles':
        ctas.push({ label: 'Home', href: homeHref, kind: 'muted' });
        break;
      case 'legal':
        ctas.push({ label: 'Home', href: homeHref, kind: 'muted' });
        ctas.push({ label: 'Ask',  kind: 'ask' });
        // Legal pages provide their own top padding via .page-layout, so
        // suppress the body padding-top added by the universal stylesheet.
        body.setAttribute('data-acrp-nav-no-offset', '');
        break;
      default:
        return; // unknown variant; do nothing
    }

    var nav = document.createElement('nav');
    nav.id = 'acrp-localnav';
    nav.setAttribute('aria-label', 'Local navigation');
    nav.classList.add('is-booting');

    var pill = document.createElement('div');
    pill.className = 'acrp-localnav-pill';

    var nameLink = document.createElement('a');
    nameLink.className = 'acrp-localnav-name';
    nameLink.href = nameHref;
    nameLink.setAttribute('aria-label', longName);

    var logo = document.createElement('img');
    logo.className = 'acrp-localnav-logo';
    logo.src = logoSrc;
    logo.alt = '';
    logo.decoding = 'async';
    logo.loading = 'eager';
    // Prevent oversized image flash before stylesheet applies.
    logo.width = 28;
    logo.height = 28;
    logo.style.width = '28px';
    logo.style.height = '28px';
    logo.style.objectFit = 'contain';
    logo.style.display = 'block';

    var textSwap = document.createElement('span');
    textSwap.className = 'acrp-localnav-textswap';

    var shortLabel = document.createElement('span');
    shortLabel.className = 'acrp-localnav-label acrp-localnav-label-short';
    shortLabel.textContent = shortName;

    var longLabel = document.createElement('span');
    longLabel.className = 'acrp-localnav-label acrp-localnav-label-long';
    longLabel.textContent = longName;

    textSwap.appendChild(shortLabel);
    textSwap.appendChild(longLabel);
    nameLink.appendChild(logo);
    nameLink.appendChild(textSwap);
    pill.appendChild(nameLink);

    var ul = document.createElement('ul');
    ul.className = 'acrp-localnav-ctas';

    ctas.forEach(function (c) {
      var li = document.createElement('li');
      if (c.kind === 'ask') {
        // Ask dropdown for legal pages — reuses existing #askMenu wired by legal-doc.js
        var wrap = document.createElement('div');
        wrap.className = 'acrp-ask-wrap';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'askBtn';
        btn.className = 'acrp-cta cta ask-btn';
        btn.setAttribute('aria-haspopup', 'menu');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', 'askMenu');
        btn.innerHTML =
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
          '<span>Ask</span>' +
          '<svg class="chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
        wrap.appendChild(btn);
        li.appendChild(wrap);
      } else {
        var a = document.createElement('a');
        a.className = 'acrp-cta ' + (c.kind === 'cta' ? 'cta' : 'muted');
        if (c.href) a.href = c.href;
        if (c.ariaLabel) a.setAttribute('aria-label', c.ariaLabel);
        a.textContent = c.label;
        li.appendChild(a);
      }
      ul.appendChild(li);
    });

    pill.appendChild(ul);
    nav.appendChild(pill);

    // Insert at top of body
    body.insertBefore(nav, body.firstChild);

    // For legal pages: relocate the existing #askMenu under the injected
    // .acrp-ask-wrap so legal-doc.js's positioning continues to work.
    if (variant === 'legal') {
      var askWrap = nav.querySelector('.acrp-ask-wrap');
      var askMenu = document.getElementById('askMenu');
      if (askWrap && askMenu && askMenu.parentNode !== askWrap) {
        askWrap.appendChild(askMenu);
      }
    }

    // Measure the rendered nav and expose its total height (offset + height
    // + a little breathing room) to CSS so the body padding stays accurate.
    function applyBodyOffset(total) {
      if (body.hasAttribute('data-acrp-nav-no-offset')) {
        body.style.paddingTop = '0px';
        return;
      }

      body.style.paddingTop = total + 'px';
    }

    function measure() {
      var rect = nav.getBoundingClientRect();
      var offset = parseFloat(getComputedStyle(nav).top) || 0;
      var total = Math.ceil(rect.height + offset + 4);
      document.documentElement.style.setProperty('--acrp-localnav-total-height', total + 'px');
      applyBodyOffset(total);
    }
    measure();

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        nav.classList.remove('is-booting');
        nav.classList.add('is-springing');
        setTimeout(function () {
          nav.classList.remove('is-springing');
        }, 560);
      });
    });

    if (window.ResizeObserver) {
      new ResizeObserver(measure).observe(nav);
    }
    window.addEventListener('resize', measure, { passive: true });
  }

  function start() {
    injectStylesheet().then(function () {
      init();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
