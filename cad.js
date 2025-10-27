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
  const deptText = Array.isArray(departments) && departments.length > 0 ? departments.join(' | ') : 'NON';
  if (deptEl) deptEl.textContent = deptText;

  // Populate profile card
  if (pAvatar) pAvatar.src = safeAvatar;
  if (pUsername) pUsername.textContent = username || 'Unknown';
  if (pUserId) pUserId.textContent = uid || '';
  if (pDept) pDept.textContent = deptText;

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
	const title = el('h2', {}, `Department Resources for ${name || code}`);
	const card = el('div', { class: 'card' }, [title]);

	const desc = el('p', { class: 'muted' }, `Please utilize the following information to join the proper groups for your department.`);
	
	const info = el('p', {}, [
		`You are in ${name || code}. Please join the melonly `,
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

async function fetchResources(token) {
  const res = await fetch(`${WORKER_BASE}/resources`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to load department resources');
  return res.json();
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

// Init
(async function init() {
  // Ensure login links include a return URL to land back on this origin
  try {
    const buildLoginUrl = () => `${WORKER_BASE}/login?return=${encodeURIComponent(window.location.origin)}`;
    // Set hrefs for when users open in new tab
    if (loginBtn) loginBtn.href = buildLoginUrl();
    if (loginBtn2) loginBtn2.href = buildLoginUrl();
    // Also handle click to avoid race with initial HTML href
    const goLogin = (e) => { e.preventDefault(); const u = buildLoginUrl(); console.info('[CAD] Navigating to login:', u); window.location.href = u; };
    if (loginBtn) loginBtn.addEventListener('click', goLogin);
    if (loginBtn2) loginBtn2.addEventListener('click', goLogin);
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
    try {
      token = sessionStorage.getItem('cad_token');
      console.debug('[CAD] Token from sessionStorage:', token ? 'present' : 'missing');
    } catch (e) {
      console.error('[CAD] Failed to read sessionStorage', e);
    }
  }

  if (!token) {
    console.warn('[CAD] No token present in URL or sessionStorage');
    clearIdentity();
    return;
  }

  // Strip token param from URL and persist in sessionStorage
  try {
    sessionStorage.setItem('cad_token', token);
    const url = new URL(window.location.href);
    if (url.searchParams.has('token')) {
      url.searchParams.delete('token');
      window.history.replaceState({}, document.title, url.toString());
      console.info('[CAD] Token param stripped from URL and stored in sessionStorage');
    } else {
      console.info('[CAD] Using token from sessionStorage (no URL param to strip)');
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
  // Special-case: users with no department (NON) should see invite + logout
  try {
    const isNon = !Array.isArray(payload.departments) || payload.departments.length === 0 || (Array.isArray(payload.departments) && payload.departments.includes('NON'));
    if (isNon) {
      console.info('[CAD] User is in NON (no department) — rendering invite panel');
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
      // Do not fetch department-specific resources for NON users
    } else {
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
    try { sessionStorage.removeItem('cad_token'); } catch {}
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
