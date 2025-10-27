// Production CAD UI logic (no external libs, no on-page debug panel). Console logging enabled.
console.info('[CAD] Script loaded');
// Don't log full URL as it may contain token parameter
console.info('[CAD] window.location.hostname:', window.location.hostname);
console.info('[CAD] window.location.pathname:', window.location.pathname);
console.info('[CAD] Has URL params:', window.location.search ? 'yes' : 'no');

// CRITICAL: Capture token IMMEDIATELY before anything else can modify the URL
const INITIAL_SEARCH = window.location.search;
const INITIAL_HREF = window.location.href;
console.info('[CAD] Captured URL params');

// Detect environment: use production API for alleghenycountyroleplay.com, otherwise local dev
const isProduction = window.location.hostname === 'alleghenycountyroleplay.com' || window.location.hostname.endsWith('.alleghenycountyroleplay.com');
const WORKER_BASE = isProduction ? 'https://cadapi.alleghenycountyroleplay.com' : 'http://127.0.0.1:8787';
console.info('[CAD] Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT', '| Worker API:', WORKER_BASE);

// DOM refs
const timeEl = document.getElementById('now');
const avatarEl = document.getElementById('avatar');
const usernameEl = document.getElementById('username');
const deptEl = document.getElementById('department');
const logoutBtn = document.getElementById('logoutBtn');
const loginBtn = document.getElementById('loginBtn');
const loginBtn2 = document.getElementById('loginBtn2');
const sectionLoggedOut = document.getElementById('loggedOut');
const sectionLoggedIn = document.getElementById('loggedIn');
const contentEl = document.getElementById('content');
const pAvatar = document.getElementById('p_avatar');
const pUsername = document.getElementById('p_username');
const pUserId = document.getElementById('p_userid');
const pDept = document.getElementById('p_dept');
const deptSections = document.getElementById('deptSections');
const tabsNav = document.querySelectorAll('.tabs .tab');
const tabContainers = {
  tabInfo: document.getElementById('tabInfo'),
  tabJoin: document.getElementById('tabJoin'),
  tabGuides: document.getElementById('tabGuides'),
  tabMisc: document.getElementById('tabMisc'),
};
// Sidebar + toast refs
const sidebarEl = document.getElementById('sidebar');
const tAvatar = document.getElementById('t_avatar');
const tUsername = document.getElementById('t_username');
const tUidValue = document.getElementById('t_uid_value');
const tLogout = document.getElementById('t_logout');
const adminBtn = document.getElementById('adminBtn');
const ADMIN_UID = '749493846618013706';
const toastsEl = document.getElementById('toasts');
let LAST_TOASTS = new Map();
let LAST_REDIRECT_AT = 0;
let LOGIN_BLOCKED = false;
let LOGIN_BLOCK_MSG = '';

function showToast(message, type = 'info', ttlMs = 4000) {
  try {
    const key = `${type}:${String(message)}`;
    const now = Date.now();
    const last = LAST_TOASTS.get(key) || 0;
    if (now - last < 1500) return; // dedupe burst
    LAST_TOASTS.set(key, now);
    if (!toastsEl) return;
    const item = document.createElement('div');
    item.className = `toast-item ${type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'info'}`;
    const span = document.createElement('div');
    span.textContent = String(message);
    const btn = document.createElement('button');
    btn.className = 'close';
    btn.setAttribute('aria-label', 'Close');
    btn.textContent = '✕';
    btn.addEventListener('click', () => item.remove());
    item.appendChild(span);
    item.appendChild(btn);
    toastsEl.appendChild(item);
    if (ttlMs > 0) setTimeout(() => { try { item.remove(); } catch {} }, ttlMs);
  } catch {}
}
// Ensure all images are lazy-loaded and decode asynchronously for faster page load
try {
  const allImgs = document.querySelectorAll('img');
  allImgs.forEach(img => {
    if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
  });
} catch {}

// Keep a minimal known department set in case needed later
const KNOWN_DEPARTMENTS = ['ACSO', 'PBP', 'PBF', 'PSP', 'DOT'];
let CURRENT_DEPARTMENTS = new Set();
// Dept full-name fallback (server also returns names)
const FULL_NAMES = {
  PBP: 'Pittsburgh Police Department',
  PSP: 'Pennsylviana State Police',
  ACSO: "Allegheny County Sherrif's office",
  PBF: 'Pittsburgh Fire Department',
  DOT: 'PennDOT',
};
// Title-case variant for headings
const TITLE_NAMES = {
  PBP: 'The Pittsburgh Police Department',
  PSP: 'The Pennsylviana State Police',
  ACSO: "The Allegheny County Sherrif's office",
  PBF: 'The Pittsburgh Fire Department',
  DOT: 'PennDOT',
};

// Update clock
function updateClock() {
  const d = new Date();
  const fmt = d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (timeEl) timeEl.textContent = fmt;
}
setInterval(updateClock, 1000);
updateClock();

// JWT decode (no verify, server will verify for /resources)
function b64urlToStr(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4; if (pad) b64 += '='.repeat(4 - pad);
  try { return decodeURIComponent(escape(atob(b64))); } catch { return atob(b64); }
}
function decodeJwtPayload(token) {
  try {
    const parts = String(token).split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(b64urlToStr(parts[1]));
    console.debug('[CAD] Decoded JWT payload keys:', Object.keys(payload || {}));
    return payload;
  } catch { return null; }
}

function setIdentity({ uid, username, avatar, departments }) {
  const safeAvatar = avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
  if (avatarEl) avatarEl.src = safeAvatar;
  if (usernameEl) usernameEl.textContent = username || 'Unknown';
  let deptText = Array.isArray(departments) && departments.length > 0 ? departments.join(' | ') : 'NON';
  // Top-right: display "No Department" instead of NON
  const displayDept = (deptText === 'NON') ? 'No Department' : deptText;
  if (deptEl) deptEl.textContent = displayDept;
  try {
    CURRENT_DEPARTMENTS = new Set((Array.isArray(departments) ? departments : []).map(d => String(d).toUpperCase()));
  } catch { CURRENT_DEPARTMENTS = new Set(); }

  // Populate profile card
  if (pAvatar) pAvatar.src = safeAvatar;
  if (pUsername) pUsername.textContent = username || 'Unknown';
  if (pUserId) pUserId.textContent = uid || '';
  if (pDept) pDept.textContent = displayDept;

  // Populate sidebar toast
  if (tAvatar) tAvatar.src = safeAvatar;
  if (tUsername) {
    const name = String(username || 'Unknown');
    tUsername.textContent = name.length > 19 ? (name.slice(0, 19) + '...') : name;
  }
  if (tUidValue) tUidValue.textContent = uid || '';
  // Show Admin button only for the admin UID
  try {
    if (adminBtn) {
      if (String(uid) === ADMIN_UID) { adminBtn.style.display = 'block'; adminBtn.classList.remove('hidden'); }
      else { adminBtn.style.display = 'none'; adminBtn.classList.add('hidden'); }
    }
  } catch {}

  if (logoutBtn) logoutBtn.style.display = '';
  if (loginBtn) loginBtn.style.display = 'none';
  if (sectionLoggedOut) sectionLoggedOut.classList.add('hidden');
  if (sectionLoggedIn) sectionLoggedIn.classList.remove('hidden');
}

function clearIdentity() {
  if (avatarEl) avatarEl.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
  if (usernameEl) usernameEl.textContent = '';
  if (deptEl) deptEl.textContent = '';
  if (logoutBtn) logoutBtn.style.display = 'none';
  if (loginBtn) loginBtn.style.display = '';
  if (sectionLoggedIn) sectionLoggedIn.classList.add('hidden');
  if (sectionLoggedOut) sectionLoggedOut.classList.remove('hidden');
  if (deptSections) deptSections.innerHTML = '';
}

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue; if (typeof c === 'string') e.appendChild(document.createTextNode(c)); else e.appendChild(c);
  }
  return e;
}

// Dynamic label tokens for placeholders like {cta1-acrp-invite}
const DEFAULT_LABELS = {
  'cta1-acrp-invite': 'Join ACRP Discord',
  'secondary-logout': 'Logout',
  'login-button': 'Login',
};

function getLabel(key) {
  // 1) URL param override: l.<key>=Value
  try {
    const params = new URLSearchParams(INITIAL_SEARCH);
    const fromUrl = params.get(`l.${key}`);
    if (fromUrl) return fromUrl;
  } catch {}
  // 2) Global override via window.ACRP_LABELS
  try {
    if (window.ACRP_LABELS && typeof window.ACRP_LABELS[key] === 'string') return window.ACRP_LABELS[key];
  } catch {}
  // 3) Defaults or fall back to key
  return DEFAULT_LABELS[key] || key;
}

function resolveToken(s) {
  if (typeof s === 'string' && s.startsWith('{') && s.endsWith('}')) {
    const key = s.slice(1, -1);
    return getLabel(key);
  }
  return s;
}

// Cookie helpers
function getCookie(name){
  try{
    const v = document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(encodeURIComponent(name)+'='));
    return v ? decodeURIComponent(v.split('=')[1]) : '';
  }catch{ return ''; }
}
function setCookie(name, value, opts={}){
  try{
    const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
    if(opts.maxAge) parts.push(`Max-Age=${Math.max(1, Math.floor(opts.maxAge))}`);
    parts.push('Path=/');
    parts.push('SameSite=Strict');
    document.cookie = parts.join('; ');
  }catch{}
}
function deleteCookie(name){ setCookie(name,'',{maxAge:0}); }

// Session/token guards
function getStoredToken() {
  // Prefer cookie, fall back to sessionStorage for backward compatibility
  const fromCookie = getCookie('cad_token');
  if (fromCookie) return fromCookie;
  try { return sessionStorage.getItem('cad_token') || ''; } catch { return ''; }
}
function buildLoginUrl() {
  try { return `${WORKER_BASE}/login?return=${encodeURIComponent(window.location.origin)}`; } catch { return `${WORKER_BASE}/login`; }
}
function requireToken(ev) {
  const t = getStoredToken();
  let ok = Boolean(t && t.length > 0);
  if (ok) {
    try {
      const p = decodeJwtPayload(t);
      if (!p || typeof p.exp !== 'number') ok = false;
      else {
        const now = Math.floor(Date.now() / 1000);
        // 30s skew
        if (now >= (p.exp - 30)) ok = false;
      }
    } catch { ok = false; }
  }
  if (!ok) {
    try { if (ev && typeof ev.preventDefault === 'function') ev.preventDefault(); } catch {}
    // Proactively clear UI and token
    try { sessionStorage.removeItem('cad_token'); } catch {}
    try { clearIdentity(); } catch {}
    showToast('Your session has expired. Please log in again.', 'warn');
    const now = Date.now();
    if ((now - (window.__lastRedirectAt || 0)) > 3000) {
      window.__lastRedirectAt = now;
      try { window.location.href = buildLoginUrl(); } catch {}
    }
    return false;
  }
  return true;
}

function copyRow(label, value) {
  const input = el('input', { class: 'copy-input', type: 'text', value: value || '', readonly: 'readonly' });
  const btn = el('button', { class: 'btn', type: 'button' }, 'Copy');
  btn.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(input.value);
      else { input.select(); document.execCommand('copy'); }
      btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy'; }, 1200);
    } catch { btn.textContent = 'Copy failed'; setTimeout(() => { btn.textContent = 'Copy'; }, 1200); }
  });
  return el('div', { class: 'copy-row' }, [input, btn]);
}

function deptSection({ code, name, melonLink, melonCode, discord }) {
  const key = String(code || '').toUpperCase();
  const full = name || FULL_NAMES[key] || key;
  const titleText = TITLE_NAMES[key] || full;
  const title = el('h2', {}, `Joining ${titleText}'s Servers`);
  const card = el('div', { class: 'card' }, [title]);

  const desc = el('p', { class: 'muted' }, `Please utilize the following information to join the proper groups for your department.`);
	
  const info = el('p', {}, [
    `You are in ${full}. Please join the melonly `,
    el('a', { href: melonLink || '#', target: '_blank', rel: 'noopener noreferrer' }, 'here'),
    `. If that link does not work then visit `,
    el('a', { href: 'https://melonly.xyz/dashboard', target: '_blank', rel: 'noopener noreferrer' }, 'https://melonly.xyz/dashboard'),
    `.`,
  ]);
	
  const step1 = el('p', {}, 'Click on "Join"');
  const step2 = el('p', {}, 'Then paste this code:');
  const codeRow = copyRow('Code', melonCode || '');
  const step3 = el('p', {}, 'Then Click "Join"');

  const step4 = el('p', {}, [
    'Then join your department\'s corresponding discord server if you are not already in it. Join ',
    el('a', { href: discord || '#', target: '_blank', rel: 'noopener noreferrer' }, 'Here'),
    '.',
  ]);

  const orRow = el('div', { class: 'hr-text' }, 'or');
  const copyInviteLabel = el('p', {}, 'Copy the invite:');
  const inviteRow = copyRow('Invite', discord || '');
  const final = el('p', {}, 'and Paste this in a new tab OR click "Add a Server" > "Join a Server" and paste the code.');

  card.append(desc, info, step1, step2, codeRow, step3, step4, orRow, copyInviteLabel, inviteRow, final);
  return card;
}

function canAccess(deptCode) {
  const key = String(deptCode || '').toUpperCase();
  return CURRENT_DEPARTMENTS.has(key);
}

const GUIDE_RESOURCES = {
  PSP: [
    { label: 'PSP Handbook', url: 'https://docs.google.com/document/d/1HVylgZxOtkgCWT5GcSF1fep2GXrtRVZWFhIjf3vsDDY/edit?usp=sharing' },
    { label: 'PA Penal Codes', url: 'https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/18/18.HTM' },
  ],
  PBP: [],
  ACSO: [],
  PBF: [],
  DOT: [],
};

function guidesSection(code) {
  const key = String(code || '').toUpperCase();
  if (!canAccess(key)) return null;
  const titleText = TITLE_NAMES[key] || FULL_NAMES[key] || key;
  const details = el('details', { class: 'dropdown-card card' });
  const summary = el('summary', {}, titleText);
  const body = el('div', { class: 'dropdown-body' });
  const items = Array.isArray(GUIDE_RESOURCES[key]) ? GUIDE_RESOURCES[key] : [];
  if (!items.length) {
    body.appendChild(el('div', { class: 'muted' }, 'No guides yet.'));
  } else {
    const btnWrap = el('div', { class: 'toast-actions', style: 'flex-wrap: wrap' });
    for (const it of items) {
      // Hide URL by not setting href; keep base64 in data attribute
      let b64url = '';
      try { b64url = btoa(unescape(encodeURIComponent(String(it.url || '')))); } catch { b64url = ''; }
      const a = el('a', { class: 'btn', role: 'button', tabindex: '0', 'data-url': b64url }, it.label);
      const handler = (e) => {
          if (!requireToken(e)) return; // Enforce token validity
        // Permission check before navigating
  if (!canAccess(key)) { e.preventDefault(); showToast('You do not have access to this resource.', 'error'); return; }
        e.preventDefault();
        try {
          const enc = a.getAttribute('data-url') || '';
          const url = decodeURIComponent(escape(atob(enc)));
          if (url && /^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener,noreferrer');
        } catch (_) {}
      };
      a.addEventListener('click', handler);
      a.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') handler(e); });
      btnWrap.appendChild(a);
    }
    body.appendChild(btnWrap);
  }
  details.appendChild(summary);
  details.appendChild(body);
  return details;
}

function renderGuides() {
  try {
    const wrap = document.getElementById('guidesSections');
    if (!wrap) return;
    wrap.innerHTML = '';
    // Render only sections for departments user is in
    const depts = Array.from(CURRENT_DEPARTMENTS);
    for (const d of depts) {
      if (!TITLE_NAMES[d] && !FULL_NAMES[d]) continue; // skip unknown tokens like NON
      const card = guidesSection(d);
      if (card) wrap.appendChild(card);
    }
    // If nothing rendered, show a soft note
    if (!wrap.children.length) {
      wrap.appendChild(el('div', { class: 'card' }, [el('div', { class: 'muted' }, 'No guides available for your department(s) yet.')]))
    }
  } catch (e) {
    console.error('[CAD] renderGuides failed', e);
  }
}

async function fetchResources(token) {
  const headers = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const url = `${WORKER_BASE}/resources`;
  const res = await fetch(url, { headers, method: 'GET', credentials: 'omit', cache: 'no-store' });
  if (!res.ok) throw new Error(`resources ${res.status}`);
  return await res.json();
}

function showTab(target) {
  // Set active state on tabs
  tabsNav.forEach(b => {
    const t = b.getAttribute('data-tab');
    if (t) b.classList.toggle('active', t === target);
  });
  // Hide all containers, show selected
  Object.entries(tabContainers).forEach(([key, elRef]) => {
    if (!elRef) return;
    if (key === target) { elRef.classList.remove('hidden'); elRef.classList.add('active'); }
    else { elRef.classList.add('hidden'); elRef.classList.remove('active'); }
  });
}

function setupTabs() {
  if (!tabsNav || !tabsNav.length) return;
  tabsNav.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Token must exist and be valid to switch tabs
      if (!requireToken(e)) return;
      const target = btn.getAttribute('data-tab');
      showTab(target);
    });
  });
  // Default to Info tab on load if present
  if (tabContainers.tabInfo) showTab('tabInfo');
}

function onPrintScreen() {
	if (!contentEl) return;
	contentEl.classList.add('sensitive-blur');
	// Best-effort clipboard clear
	try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(''); } catch {}
	setTimeout(() => contentEl.classList.remove('sensitive-blur'), 10000);
}

// Screenshot guard (best-effort)
let modifierHeld = { win: false, shift: false, ctrl: false };

window.addEventListener('keydown', (e) => {
	// Track modifier keys
	if (e.key === 'Meta' || e.key === 'OS') modifierHeld.win = true;
	if (e.key === 'Shift') modifierHeld.shift = true;
	if (e.key === 'Control') modifierHeld.ctrl = true;

	// PrintScreen key
	if (e.key === 'PrintScreen') {
		onPrintScreen();
	}
	// Win+Shift (with any other key, but especially S for Snip & Sketch)
	if (modifierHeld.win && modifierHeld.shift) {
		onPrintScreen();
	}
	// Ctrl+P (print dialog)
	if (modifierHeld.ctrl && (e.key === 'p' || e.key === 'P')) {
		e.preventDefault();
		onPrintScreen();
	}
});

window.addEventListener('keyup', (e) => {
	// Clear modifier tracking
	if (e.key === 'Meta' || e.key === 'OS') modifierHeld.win = false;
	if (e.key === 'Shift') modifierHeld.shift = false;
	if (e.key === 'Control') modifierHeld.ctrl = false;
});

// Re-check token on focus/visibility (helps catch expired sessions)
window.addEventListener('focus', () => { requireToken(null); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') requireToken(null); });
window.addEventListener('storage', (e) => { if (e.key === 'cad_token') requireToken(null); });

// Global click guard for logged-in UI interactions
document.addEventListener('click', (e) => {
  try {
    if (!sectionLoggedIn || sectionLoggedIn.classList.contains('hidden')) return;
    const path = e.composedPath ? e.composedPath() : [e.target];
    const el = path.find(n => n && n.nodeType === 1 && (n.matches?.('button, a.btn, .tab, summary') || false));
    if (!el) return;
    // Exclusions: allow login/logout/back/legal without token guard
    const id = el.id || '';
    if (id === 'loginBtn' || id === 'loginBtn2' || id === 'logoutBtn' || id === 't_logout' || id === 't_back' || id === 't_legal') return;
    requireToken(e);
  } catch {}
}, true);

// Init
(async function init() {
  // Load public config for notice banner and login blocking
  try {
    const res = await fetch(`${WORKER_BASE}/public-config`, { method: 'GET', credentials: 'omit', cache: 'no-store' });
    if (res.ok) {
      const cfg = await res.json();
      // Notice banner (supports object or legacy string)
      try {
        const banner = document.getElementById('noticeBanner');
        const headingEl = document.getElementById('noticeHeading');
        const textEl = document.getElementById('noticeText');
        const closeEl = document.getElementById('noticeClose');
        const btnsEl = document.getElementById('noticeButtons');
        if (banner && textEl) {
          let noticeObj = null;
          if (cfg && typeof cfg.notice === 'object' && cfg.notice) noticeObj = cfg.notice;
          else if (cfg && typeof cfg.notice === 'string' && cfg.notice.trim().length) noticeObj = { content: cfg.notice };

          const dismissedKey = (() => {
            try { return 'noticeDismissed:' + btoa(unescape(encodeURIComponent(JSON.stringify(noticeObj || '')))).slice(0, 32); } catch { return 'noticeDismissed'; }
          })();
          const wasDismissed = (() => { try { return sessionStorage.getItem(dismissedKey) === '1'; } catch { return false; } })();

          if (noticeObj && !wasDismissed) {
            // Content
            if (headingEl) headingEl.textContent = String(noticeObj.heading || 'Notice');
            // Force newlines -> line breaks for paragraph-like rendering
            try {
              const contentHtml = escapeHtml(String(noticeObj.content || ''))
                .replace(/\r\n|\r|\n/g, '<br>');
              textEl.innerHTML = contentHtml;
            } catch { textEl.textContent = String(noticeObj.content || ''); }
            // Color styling
            if (noticeObj.color) {
              try {
                banner.style.background = noticeObj.color;
                banner.style.borderColor = noticeObj.color;
              } catch {}
            }
            // Text color styling
            if (noticeObj.textColor) {
              try {
                textEl.style.color = noticeObj.textColor;
                if (headingEl) headingEl.style.color = noticeObj.textColor;
              } catch {}
            }
            // Buttons
            if (btnsEl) {
              btnsEl.innerHTML = '';
              const addBtn = (b, isCta) => {
                if (!b || !b.label || !b.url) return;
                const a = document.createElement('a');
                a.className = `btn${isCta ? ' primary' : ''}`;
                a.textContent = String(b.label);
                a.href = String(b.url);
                a.target = '_blank'; a.rel = 'noopener noreferrer';
                btnsEl.appendChild(a);
              };
              try {
                const ctas = (noticeObj.buttons && Array.isArray(noticeObj.buttons.cta)) ? noticeObj.buttons.cta : [];
                const secs = (noticeObj.buttons && Array.isArray(noticeObj.buttons.secondary)) ? noticeObj.buttons.secondary : [];
                ctas.forEach(b => addBtn(b, true));
                secs.forEach(b => addBtn(b, false));
              } catch {}
            }
            // Dismiss
            const dismissable = Boolean(noticeObj.dismissable || noticeObj.dismissible || noticeObj.dismiss);
            if (closeEl) {
              closeEl.style.display = dismissable ? '' : 'none';
              if (dismissable) {
                closeEl.onclick = () => {
                  banner.classList.add('hidden');
                  try { sessionStorage.setItem(dismissedKey, '1'); } catch {}
                };
              }
            }
            banner.classList.remove('hidden');
          } else {
            banner.classList.add('hidden');
          }
        }
      } catch {}
      // Login blocking: gray out buttons, toast on click, and clear any existing session
      if (cfg && cfg.loginBlocked) {
        const msg = (typeof cfg.loginMessage === 'string' && cfg.loginMessage.trim().length) ? cfg.loginMessage : 'Logins are temporarily disabled by an administrator.';
        LOGIN_BLOCKED = true; LOGIN_BLOCK_MSG = msg;
        const disableLogin = (el) => {
          if (!el) return;
          el.classList.remove('primary');
          el.classList.add('muted');
          el.style.pointerEvents = 'auto';
          try { el.removeAttribute('href'); } catch {}
          el.setAttribute('aria-disabled', 'true');
          el.addEventListener('click', (e) => { e.preventDefault(); showToast(msg, 'warn', 5000); });
        };
        disableLogin(loginBtn);
        disableLogin(loginBtn2);
        try {
          const existing = sessionStorage.getItem('cad_token');
          if (existing) {
            sessionStorage.removeItem('cad_token');
            clearIdentity();
            showToast(msg, 'warn', 5000);
          }
        } catch {}
      }
    }
  } catch {}
  // Check if admin access was denied and present toast + gray out admin button
  try {
    const p = new URLSearchParams(INITIAL_SEARCH);
    if (p.has('adminDenied')) {
      showToast('Not authorized for Admin Panel.', 'error', 5000);
      if (adminBtn) {
        adminBtn.classList.add('muted');
        adminBtn.style.pointerEvents = 'none';
        adminBtn.title = 'Not authorized';
        adminBtn.style.display = 'block';
        adminBtn.classList.remove('hidden');
      }
      // Remove the param from URL
      try { const url = new URL(window.location.href); url.searchParams.delete('adminDenied'); window.history.replaceState({}, document.title, url.toString()); } catch {}
    }
  } catch {}
  // Ensure login links include a return URL to land back on this origin
  try {
    if (!LOGIN_BLOCKED) {
      const buildLoginUrl = () => `${WORKER_BASE}/login?return=${encodeURIComponent(window.location.origin)}`;
      // Set hrefs for when users open in new tab
      if (loginBtn) loginBtn.href = buildLoginUrl();
      if (loginBtn2) loginBtn2.href = buildLoginUrl();
      // Also handle click to avoid race with initial HTML href
      const goLogin = (e) => { 
        e.preventDefault(); 
        if (LOGIN_BLOCKED) { showToast(LOGIN_BLOCK_MSG || 'Logins are disabled.', 'warn', 5000); return; }
        const u = buildLoginUrl(); console.info('[CAD] Navigating to login:', u); window.location.href = u; 
      };
      if (loginBtn) loginBtn.addEventListener('click', goLogin);
      if (loginBtn2) loginBtn2.addEventListener('click', goLogin);
    } else {
      // Ensure no hrefs remain if blocked
      try { if (loginBtn) loginBtn.removeAttribute('href'); } catch {}
      try { if (loginBtn2) loginBtn2.removeAttribute('href'); } catch {}
    }
    // Dynamic login button labels even when logged out
    try {
      if (loginBtn) loginBtn.textContent = resolveToken('{login-button}');
      if (loginBtn2) loginBtn2.textContent = resolveToken('{login-button}');
    } catch {}
  } catch {}

  let token = null;
  try {
    console.info('[CAD] Parsing URL params');
    const urlParams = new URLSearchParams(INITIAL_SEARCH);
    token = urlParams.get('token');
    console.info('[CAD] Token from URL query:', token ? `present (length: ${token.length})` : 'missing');
  } catch (e) {
    console.error('[CAD] Failed to parse URL search params', e);
  }

  // Fallback to sessionStorage to keep you logged in across refreshes
  if (!token) {
    // Fallback read from cookie (in case URL param not present)
    try {
      token = getCookie('cad_token');
      console.debug('[CAD] Token from cookie:', token ? 'present' : 'missing');
      if (!token) {
        // legacy fallback
        token = sessionStorage.getItem('cad_token');
        console.debug('[CAD] Token from sessionStorage (legacy):', token ? 'present' : 'missing');
      }
    } catch (e) {
      console.error('[CAD] Failed to read cookies', e);
    }
  }

  if (!token) {
    console.warn('[CAD] No token present in URL or sessionStorage');
    clearIdentity();
    return;
  }

  // Strip token param from URL and persist to cookie
  try {
    // Decode to compute max-age from exp
    const parts = String(token).split('.');
    let maxAge = 60*60*6; // default 6h
    try{
      if(parts.length===3){
        const payload = JSON.parse(b64urlToStr(parts[1]));
        if (payload && typeof payload.exp === 'number'){
          const now = Math.floor(Date.now()/1000);
          maxAge = Math.max(60, (payload.exp - now));
        }
      }
    }catch{}
    setCookie('cad_token', token, { maxAge });
    const url = new URL(window.location.href);
    if (url.searchParams.has('token')) {
      url.searchParams.delete('token');
      window.history.replaceState({}, document.title, url.toString());
      console.info('[CAD] Token param stripped from URL and stored in sessionStorage');
    } else {
      console.info('[CAD] Using token from cookie (no URL param to strip)');
    }
  } catch (e) {
    console.error('[CAD] Failed to handle token URL/storage', e);
  }

  const payload = decodeJwtPayload(token);
  if (!payload) { console.error('[CAD] Failed to decode JWT payload'); clearIdentity(); return; }
  if (typeof payload.exp === 'number') {
    const now = Math.floor(Date.now() / 1000);
    if (now >= payload.exp) { console.error('[CAD] Token expired', { exp: payload.exp, now }); clearIdentity(); return; }
  }

  console.info('[CAD] Setting identity', { uid: String(payload.uid || ''), username: payload.username, departments: payload.departments });
  setIdentity({ uid: String(payload.uid || ''), username: payload.username, avatar: payload.avatar, departments: payload.departments });
  setupTabs();
  // Special-case: users with no department (NON) should see invite + logout
  try {
    const isNon = !Array.isArray(payload.departments) || payload.departments.length === 0 || (Array.isArray(payload.departments) && payload.departments.includes('NON'));
    if (isNon) {
      console.info('[CAD] User is in NON (no department) — rendering invite panel');
      // Hide sidebar for NON users
      if (sidebarEl) sidebarEl.classList.remove('visible');
      if (deptSections) {
        deptSections.innerHTML = '';
        const card = el('div', { class: 'card' }, []);
        const heading = el('h1', {}, `Seems like you're not in a department! Please check the ACRP Discord to join one!`);
        const inviteLink = 'https://discord.gg/bJ8TeDsnth';
        const inviteBtn = el('a', { class: 'btn primary', href: inviteLink, target: '_blank', rel: 'noopener noreferrer', 'aria-label': getLabel('cta1-acrp-invite') }, resolveToken('{cta1-acrp-invite}'));
        // secondary logout button - will trigger the same logout behavior
        const secLogout = el('button', { class: 'btn', type: 'button', 'aria-label': getLabel('secondary-logout') }, resolveToken('{secondary-logout}')); 
        secLogout.addEventListener('click', () => {
          try { if (logoutBtn) logoutBtn.click(); else clearIdentity(); } catch { clearIdentity(); }
        });
        const wrapper = el('div', {}, [heading, el('div', { style: 'margin-top:12px; display:flex; gap:8px; align-items:center' }, [inviteBtn, secLogout])]);
        card.appendChild(wrapper);
        deptSections.appendChild(card);
      }
      // Ensure Join tab is visible since the NON panel renders there
      try { showTab('tabJoin'); } catch {}
      // Do not fetch department-specific resources for NON users
    } else {
  // Show sidebar for department users
      if (sidebarEl) sidebarEl.classList.add('visible');
      // Wire toast interactions once
      try {
        if (tLogout) {
          tLogout.addEventListener('click', (e) => {
            e.preventDefault();
            if (logoutBtn) logoutBtn.click();
          }, { once: true });
        }
      } catch {}
      // Fetch department resources from Worker (uses secrets server-side)
      try {
        console.info('[CAD] Fetching /resources');
        const data = await fetchResources(token);
        console.debug('[CAD] /resources response', data);
        if (deptSections) {
          deptSections.innerHTML = '';
          const list = Array.isArray(data.departments) ? data.departments : [];
          for (const d of list) deptSections.appendChild(deptSection(d));
        }
      } catch (e) {
        console.error('[CAD] Failed to load /resources', e);
      }
      // Render Guides/Handbooks for allowed departments
      renderGuides();
    }
  } catch (e) {
    console.error('[CAD] Error rendering NON-department panel', e);
  }
})();

// Global error logging to console
window.addEventListener('error', (e) => {
  console.error('[CAD] window.error', { message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno, error: String(e.error || '') });
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[CAD] unhandledrejection', { reason: String(e.reason || '') });
});

// Wire logout
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    try { const url = new URL(window.location.href); url.searchParams.delete('token'); window.history.replaceState({}, document.title, url.toString()); } catch {}
    try { deleteCookie('cad_token'); sessionStorage.removeItem('cad_token'); } catch {}
    // Call worker logout to clear server-side session, then return to this origin
    try {
      const ret = encodeURIComponent(window.location.origin);
      window.location.href = `${WORKER_BASE}/logout?return=${ret}`;
      return;
    } catch {}
    clearIdentity();
  });
}

// Secondary login button mirrors main login
if (loginBtn2 && loginBtn) {
  loginBtn2.addEventListener('click', (e) => { /* just allow link */ });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
