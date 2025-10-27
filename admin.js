(function(){
  const isProduction = location.hostname === 'alleghenycountyroleplay.com' || location.hostname.endsWith('.alleghenycountyroleplay.com');
  const WORKER_BASE = isProduction ? 'https://cadapi.alleghenycountyroleplay.com' : 'http://127.0.0.1:8787';

  const adminContent = document.getElementById('adminContent');
  const authFail = document.getElementById('authFail');
  const nHeading = document.getElementById('nHeading');
  const nContent = document.getElementById('nContent');
  const nColor = document.getElementById('nColor');
  const nTextColor = document.getElementById('nTextColor');
  const nDismissable = document.getElementById('nDismissable');
  const nCtaToggle = document.getElementById('nCtaToggle');
  const nButtonsCfg = document.getElementById('nButtonsCfg');
  const nCtaCount = document.getElementById('nCtaCount');
  const nSecCount = document.getElementById('nSecCount');
  const nCtaList = document.getElementById('nCtaList');
  const nSecList = document.getElementById('nSecList');
  const saveNoticeBtn = document.getElementById('saveNotice');
  // Preview elements
  const pvBanner = document.getElementById('nPreviewBanner');
  const pvHeading = document.getElementById('nPreviewHeading');
  const pvText = document.getElementById('nPreviewText');
  const pvButtons = document.getElementById('nPreviewButtons');
  const loginBlockedEl = document.getElementById('loginBlocked');
  const loginMsgEl = document.getElementById('loginMessage');
  const saveLoginBtn = document.getElementById('saveLoginCfg');
  // KV editor elements
  const kvPrefix = document.getElementById('kvPrefix');
  const kvRefresh = document.getElementById('kvRefresh');
  const kvNew = document.getElementById('kvNew');
  const kvList = document.getElementById('kvList');
  const kvMore = document.getElementById('kvMore');
  const kvKey = document.getElementById('kvKey');
  const kvValue = document.getElementById('kvValue');
  const kvSave = document.getElementById('kvSave');
  const kvDelete = document.getElementById('kvDelete');
  let kvCursor = null;
  // Departments KV elements
  const dkvEnv = document.getElementById('dkvEnv');
  const dkvIds = {
    pbp: document.getElementById('dkv_pbp'),
    pbf: document.getElementById('dkv_pbf'),
    psp: document.getElementById('dkv_psp'),
    acso: document.getElementById('dkv_acso'),
    dot: document.getElementById('dkv_dot'),
    staff: document.getElementById('dkv_staff'),
  };
  const dkvRefresh = document.getElementById('dkvRefresh');
  const dkvSaveAll = document.getElementById('dkvSaveAll');

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

  function b64urlToStr(b64url){
    let b64 = b64url.replace(/-/g,'+').replace(/_/g,'/');
    const pad = b64.length % 4; if (pad) b64 += '='.repeat(4-pad);
    try { return decodeURIComponent(escape(atob(b64))); } catch { return atob(b64); }
  }

  function getToken(){
    const c = getCookie('cad_token');
    if (c) return c;
    try{ return sessionStorage.getItem('cad_token') || ''; }catch{ return ''; }
  }

  // Capture token from URL, store cookie, and strip from URL
  (function collectTokenFromUrl(){
    try{
      const url = new URL(window.location.href);
      const token = url.searchParams.get('token');
      if (!token) return;
      let maxAge = 60*60*6;
      try{
        const parts = String(token).split('.');
        if (parts.length===3){
          const payload = JSON.parse(b64urlToStr(parts[1]));
          if (payload && typeof payload.exp === 'number'){
            const now = Math.floor(Date.now()/1000);
            maxAge = Math.max(60, payload.exp - now);
          }
        }
      }catch{}
      setCookie('cad_token', token, { maxAge });
      try { sessionStorage.setItem('cad_token', token); } catch {}
      url.searchParams.delete('token');
      window.history.replaceState({}, document.title, url.toString());
    }catch{}
  })();

  async function verify(){
    const token = getToken();
    if(!token){
      // Start admin login flow: redirect to worker /admin which will bounce to /login and back to admin.html
      try {
        const ret = encodeURIComponent(location.origin + '/admin.html');
        location.href = `${WORKER_BASE}/admin?return=${ret}`;
        return;
      } catch {}
      deny();
      return;
    }
    try{
      const res = await fetch(`${WORKER_BASE}/admin/verify`, { headers: { 'Authorization': `Bearer ${token}` }, cache:'no-store' });
      if(!res.ok){ deny(); return; }
      const j = await res.json();
      if(!j || j.ok !== true){ deny(); return; }
      allow();
    }catch{ deny(); }
  }

  function deny(){
    if(authFail) authFail.classList.remove('hidden');
    // Redirect back to CAD with adminDenied=1 to trigger toast + gray-out
    setTimeout(()=>{ try{ location.href = 'cad.html?adminDenied=1'; }catch{ location.href = 'cad.html'; } }, 1200);
  }
  function allow(){
    if(adminContent) adminContent.classList.remove('hidden');
    loadConfig();
  }

  async function loadConfig(){
    try{
      const res = await fetch(`${WORKER_BASE}/public-config`, { cache:'no-store' });
      if(res.ok){
        const cfg = await res.json();
        // Populate notice structure (supports string or object)
        let n = cfg.notice;
        if(typeof n === 'string') { n = { heading: 'Notice', content: n, color: '#0f1732', dismissable: false, buttons: { cta: [], secondary: [] } }; }
        n = n || { heading: '', content: '', color: '', dismissable: false, buttons: { cta: [], secondary: [] } };
        if(nHeading) nHeading.value = n.heading || '';
        if(nContent) nContent.value = n.content || '';
  if(nColor) nColor.value = n.color || '';
  if(nTextColor) nTextColor.value = n.textColor || '';
        if(nDismissable) nDismissable.checked = !!n.dismissable;
        const enableBtns = (n.buttons && ((n.buttons.cta && n.buttons.cta.length) || (n.buttons.secondary && n.buttons.secondary.length))) ? true : false;
        if(nCtaToggle) nCtaToggle.checked = enableBtns;
        if(nButtonsCfg) nButtonsCfg.classList.toggle('hidden', !enableBtns);
        const ctaLen = (n.buttons && Array.isArray(n.buttons.cta)) ? n.buttons.cta.length : 0;
        const secLen = (n.buttons && Array.isArray(n.buttons.secondary)) ? n.buttons.secondary.length : 0;
        if(nCtaCount) nCtaCount.value = ctaLen;
        if(nSecCount) nSecCount.value = secLen;
        renderButtonEditors(n);
  updatePreview();
        if(loginBlockedEl) loginBlockedEl.checked = !!cfg.loginBlocked;
        if(loginMsgEl) loginMsgEl.value = cfg.loginMessage || '';
      }
    }catch{}
  }

  function renderButtonEditors(n){
    try{
      const cl = (n && n.buttons && Array.isArray(n.buttons.cta)) ? n.buttons.cta : [];
      const sl = (n && n.buttons && Array.isArray(n.buttons.secondary)) ? n.buttons.secondary : [];
      const makeRow = (idx, arrName, entry) => {
        const wrap = document.createElement('div');
        wrap.className = 'row';
        const labL = document.createElement('label'); labL.textContent = `${arrName === 'cta' ? 'CTA' : 'Secondary'} Button ${idx+1} Label:`;
        const inL = document.createElement('input'); inL.type = 'text'; inL.value = entry?.label || '';
        const labU = document.createElement('label'); labU.textContent = `${arrName === 'cta' ? 'CTA' : 'Secondary'} Button ${idx+1} URL:`;
        const inU = document.createElement('input'); inU.type = 'text'; inU.value = entry?.url || '';
        wrap.appendChild(labL); wrap.appendChild(inL); wrap.appendChild(labU); wrap.appendChild(inU);
        return {wrap, inL, inU};
      };
      if(nCtaList){
        nCtaList.innerHTML='';
        const count = Math.min(4, Math.max(0, parseInt(nCtaCount?.value||'0',10)||0));
        for(let i=0;i<count;i++){
          const row = makeRow(i,'cta',cl[i]);
          row.wrap.dataset.idx = String(i);
          nCtaList.appendChild(row.wrap);
        }
      }
      if(nSecList){
        nSecList.innerHTML='';
        const count = Math.min(4, Math.max(0, parseInt(nSecCount?.value||'0',10)||0));
        for(let i=0;i<count;i++){
          const row = makeRow(i,'secondary',sl[i]);
          row.wrap.dataset.idx = String(i);
          nSecList.appendChild(row.wrap);
        }
      }
    }catch{}
  }

  // Toast helper
  function toast(msg, type='info', ttl=3000){ (window.ACRP?.showToast || window.showToast || ((m)=>alert(m)))(msg, type, ttl); }

  // KV helper calls
  async function kvListFetch(reset=false){
    const token = getToken(); if(!token){ deny(); return; }
    try{
      if (reset) kvCursor = null;
      const p = new URLSearchParams();
      const pref = (kvPrefix?.value||'').trim(); if (pref) p.set('prefix', pref);
      if (kvCursor) p.set('cursor', kvCursor);
      const res = await fetch(`${WORKER_BASE}/admin/kv?${p.toString()}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
      if (!res.ok) { toast(`KV list failed (${res.status})`,'error'); return; }
      const data = await res.json();
      kvCursor = data.cursor || null;
      const items = Array.isArray(data.keys) ? data.keys : [];
      if (kvList && reset) kvList.innerHTML = '';
      items.forEach(k=>{
        const a = document.createElement('a'); a.href='#'; a.textContent = k.name; a.style.display='block'; a.style.padding='4px 6px'; a.style.textDecoration='none'; a.style.color='inherit'; a.addEventListener('click', (e)=>{ e.preventDefault(); kvLoadKey(k.name); });
        kvList?.appendChild(a);
      });
      kvMore?.classList.toggle('hidden', !kvCursor);
      if (reset && !items.length) kvList.innerHTML = '<div class="muted">No keys</div>';
    }catch{ toast('KV list failed','error'); }
  }

  async function kvLoadKey(key){
    const token = getToken(); if(!token){ deny(); return; }
    try{
      const res = await fetch(`${WORKER_BASE}/admin/kv/get?key=${encodeURIComponent(key)}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
      if (!res.ok) { toast(`KV get failed (${res.status})`,'error'); return; }
      const data = await res.json();
      if (kvKey) kvKey.value = data.key || key;
      if (kvValue) kvValue.value = data.value || '';
      toast(`Loaded ${key}`,'info',1500);
    }catch{ toast('KV get failed','error'); }
  }

  async function kvSaveKey(){
    const token = getToken(); if(!token){ deny(); return; }
    try{
      const key = (kvKey?.value||'').trim(); const value = kvValue?.value||'';
      if (!key) { toast('Key is required','warn'); return; }
      const res = await fetch(`${WORKER_BASE}/admin/kv/put`, { method:'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ key, value }) });
      if (!res.ok) { toast(`Save failed (${res.status})`,'error'); return; }
      toast('Saved','info',1500);
      kvListFetch(true);
    }catch{ toast('Save failed','error'); }
  }

  async function kvDeleteKey(){
    const token = getToken(); if(!token){ deny(); return; }
    try{
      const key = (kvKey?.value||'').trim(); if (!key) { toast('Key is required','warn'); return; }
      const res = await fetch(`${WORKER_BASE}/admin/kv/delete`, { method:'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ key }) });
      if (!res.ok) { toast(`Delete failed (${res.status})`,'error'); return; }
      toast('Deleted','info',1500);
      if (kvKey) kvKey.value = ''; if (kvValue) kvValue.value = '';
      kvListFetch(true);
    }catch{ toast('Delete failed','error'); }
  }

  // Departments KV helpers
  const DKV_MAP = { pbp:'PBP', pbf:'PBF', psp:'PSP', acso:'ACSO', dot:'DOT', staff:'STAFF' };
  function dkvDefault(v){ const s = (v||'').trim(); if (!s) return '{}'; if (!(s.startsWith('{') && s.endsWith('}'))) return `{${s}}`; return s; }
  async function dkvLoad(){
    try{
      if (dkvEnv) dkvEnv.textContent = (isProduction ? '(Production KV)' : '(Preview KV)');
      const token = getToken(); if(!token){ deny(); return; }
      const entries = Object.entries(DKV_MAP);
      await Promise.all(entries.map(async ([lo, up])=>{
        const res = await fetch(`${WORKER_BASE}/admin/kv/get?key=${encodeURIComponent(up)}`, { headers: { 'Authorization': `Bearer ${token}` }, cache:'no-store' });
        let value = '{}';
        if (res.ok){ const data = await res.json(); value = dkvDefault(data?.value||''); }
        const ta = dkvIds[lo]; if (ta) ta.value = value;
      }));
      toast('Departments KV loaded','info',1500);
    }catch{ toast('Failed to load Departments KV','error'); }
  }
  async function dkvSave(){
    try{
      const token = getToken(); if(!token){ deny(); return; }
      const entries = Object.entries(DKV_MAP);
      for (const [lo, up] of entries){
        const ta = dkvIds[lo]; if (!ta) continue;
        const raw = dkvDefault(ta.value||'');
        const res = await fetch(`${WORKER_BASE}/admin/kv/put`, { method:'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ key: up, value: raw }) });
        if (!res.ok) { toast(`Save failed for ${up} (${res.status})`,'error'); return; }
      }
      toast('Departments KV saved','info',1500);
    }catch{ toast('Failed to save Departments KV','error'); }
  }

  function fmtNewlines(s){
    try { return String(s||'').replace(/\r\n|\r|\n/g, '\n'); } catch { return String(s||''); }
  }

  function updatePreview(){
    try{
      if(!pvBanner || !pvHeading || !pvText || !pvButtons) return;
      pvHeading.textContent = (nHeading?.value?.trim()||'Notice');
      const content = nContent?.value||'';
      try {
        pvText.innerHTML = (content ? content : '')
          .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
          .replace(/\r\n|\r|\n/g,'<br>');
      } catch { pvText.textContent = content; }
      const bg = nColor?.value?.trim()||'';
      pvBanner.style.background = bg || '#0f1732';
      pvBanner.style.borderColor = bg || '#0f1732';
      const tc = nTextColor?.value?.trim()||'';
      pvText.style.color = tc || '#e8eefc';
      pvHeading.style.color = tc || '#e8eefc';
      // Buttons
      pvButtons.innerHTML = '';
      const enable = !!nCtaToggle?.checked;
      if(enable){
        const mk = (label, isCta) => {
          const a = document.createElement('a'); a.className = 'btn' + (isCta ? ' primary' : ''); a.href = '#'; a.textContent = label||'(label)'; a.tabIndex = -1; return a;
        };
        const gather = (root) => Array.from(root?.children||[]).map(row => {
          const inputs = row.querySelectorAll('input');
          return { label: inputs[0]?.value?.trim()||'', url: inputs[1]?.value?.trim()||'' };
        }).filter(b => b.label);
        const ctas = gather(nCtaList);
        const secs = gather(nSecList);
        ctas.forEach(b => pvButtons.appendChild(mk(b.label, true)));
        secs.forEach(b => pvButtons.appendChild(mk(b.label, false)));
      }
    }catch{}
  }

  async function save(part){
    const token = getToken();
    if(!token) { alert('Missing session token'); return; }
    const body = {};
    if(part === 'notice') {
      const enable = !!nCtaToggle?.checked;
      const cCount = Math.min(4, Math.max(0, parseInt(nCtaCount?.value||'0',10)||0));
      const sCount = Math.min(4, Math.max(0, parseInt(nSecCount?.value||'0',10)||0));
      const readList = (root, count, kind) => {
        const out = [];
        const rows = Array.from(root?.children||[]);
        for(let i=0;i<Math.min(count, rows.length); i++){
          const r = rows[i];
          const inputs = r.querySelectorAll('input');
          const label = inputs[0]?.value?.trim()||'';
          const url = inputs[1]?.value?.trim()||'';
          if(label && url) out.push({label, url});
        }
        return out;
      };
      const notice = {
        heading: nHeading?.value?.trim()||'',
        content: nContent?.value?.trim()||'',
        color: nColor?.value?.trim()||'',
        textColor: nTextColor?.value?.trim()||'',
        dismissable: !!nDismissable?.checked,
        buttons: enable ? {
          cta: readList(nCtaList, cCount, 'cta'),
          secondary: readList(nSecList, sCount, 'secondary')
        } : { cta: [], secondary: [] }
      };
      // If all fields empty and no buttons, send null-equivalent by setting empty string to clear
      if(!notice.heading && !notice.content && !notice.color && !notice.dismissable && !notice.buttons.cta.length && !notice.buttons.secondary.length){
        body.notice = '';
      } else {
        body.notice = notice;
      }
    }
    if(part === 'login') {
      body.loginBlocked = !!loginBlockedEl.checked;
      body.loginMessage = (loginMsgEl.value || '').trim();
    }
    try{
      const res = await fetch(`${WORKER_BASE}/admin/config`, {
        method:'POST',
        headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if(!res.ok){
        const t = await res.text();
        (window.ACRP?.showToast || window.showToast || ((m)=>alert(m)))(`Save failed (${res.status})`,'error',5000);
        return;
      }
      (window.ACRP?.showToast || window.showToast || ((m)=>alert(m)))('Saved','info',2500);
    }catch(e){ (window.ACRP?.showToast || window.showToast || ((m)=>alert(m)))('Save failed','error',5000); }
  }

  if(saveNoticeBtn) saveNoticeBtn.addEventListener('click', ()=> save('notice'));
  if(saveLoginBtn) saveLoginBtn.addEventListener('click', ()=> save('login'));

  // Toggle buttons config visibility and rerender editors when counts change
  if(nCtaToggle){ nCtaToggle.addEventListener('change', ()=> {
    if(nButtonsCfg) nButtonsCfg.classList.toggle('hidden', !nCtaToggle.checked);
    renderButtonEditors({ buttons: { cta: [], secondary: [] } });
    updatePreview();
  }); }
  if(nCtaCount){ nCtaCount.addEventListener('input', ()=> { renderButtonEditors({ buttons: { cta: [], secondary: [] } }); updatePreview(); }); }
  if(nSecCount){ nSecCount.addEventListener('input', ()=> { renderButtonEditors({ buttons: { cta: [], secondary: [] } }); updatePreview(); }); }
  // Live preview on field edits
  [nHeading, nContent, nColor, nTextColor, nDismissable].forEach(el => { try { el?.addEventListener('input', updatePreview); } catch {} });

  // KV editor wiring
  if (kvRefresh) kvRefresh.addEventListener('click', ()=> kvListFetch(true));
  if (kvMore) kvMore.addEventListener('click', ()=> kvListFetch(false));
  if (kvNew) kvNew.addEventListener('click', ()=> { if (kvKey) kvKey.value=''; if (kvValue) kvValue.value=''; });
  if (kvSave) kvSave.addEventListener('click', kvSaveKey);
  if (kvDelete) kvDelete.addEventListener('click', kvDeleteKey);
  // Departments KV wiring
  if (dkvRefresh) dkvRefresh.addEventListener('click', dkvLoad);
  if (dkvSaveAll) dkvSaveAll.addEventListener('click', dkvSave);

  verify();
})();
