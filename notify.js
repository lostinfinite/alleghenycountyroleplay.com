(function(){
  try{
    const isProd = location.hostname === 'alleghenycountyroleplay.com' || location.hostname.endsWith('.alleghenycountyroleplay.com');
    const API = isProd ? 'https://cadapi.alleghenycountyroleplay.com' : 'http://127.0.0.1:8787';

    function escapeHtml(s){
      return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
    }

    function b64(s){ try { return btoa(unescape(encodeURIComponent(s))); } catch { return ''; } }

    function injectBanner(notice){
      try{
        if (!notice) return;
        const key = 'noticeDismissed:' + b64(JSON.stringify({h:notice.heading||'',c:notice.content||'',x:notice.color||'',t:notice.textColor||''})).slice(0,32);
        try { if (sessionStorage.getItem(key) === '1') return; } catch {}

        // Build elements
        const host = document.createElement('div');
        host.id = 'noticeBannerGlobal';
        host.style.padding = '10px';
        host.style.border = '1px solid #243055';
        host.style.borderRadius = '8px';
        host.style.margin = '12px 12px 20px 12px';
        host.style.background = notice.color || '#0f1732';
        host.style.zIndex = '2147483000';

        const wrap = document.createElement('div'); wrap.style.display='flex'; wrap.style.flexDirection='column';
        const head = document.createElement('div'); head.style.fontWeight='600'; head.style.marginBottom='6px'; head.textContent = String(notice.heading||'Notice');
        const body = document.createElement('div'); body.style.marginBottom='8px';
        try{ body.innerHTML = escapeHtml(String(notice.content||'')).replace(/\r\n|\r|\n/g,'<br>'); }catch{ body.textContent = String(notice.content||''); }
        if (notice.textColor){ try { head.style.color = notice.textColor; body.style.color = notice.textColor; } catch{} }

        const btns = document.createElement('div'); btns.style.display='flex'; btns.style.flexWrap='wrap'; btns.style.gap='8px';
        const addBtn = (b,isCta)=>{
          if (!b || !b.label || !b.url) return; const a=document.createElement('a'); a.className='btn'+(isCta?' primary':''); a.href=b.url; a.textContent=b.label; a.target='_blank'; a.rel='noopener noreferrer';
          // minimal inline style to look button-like across pages
          a.style.padding='6px 10px'; a.style.border='1px solid #2d3d6e'; a.style.borderRadius='6px'; a.style.textDecoration='none'; a.style.color='inherit'; a.style.background=isCta?'#2a8242':'#223059';
          btns.appendChild(a);
        };
        try{
          const ctas = (notice.buttons && Array.isArray(notice.buttons.cta)) ? notice.buttons.cta : [];
          const secs = (notice.buttons && Array.isArray(notice.buttons.secondary)) ? notice.buttons.secondary : [];
          ctas.forEach(b=>addBtn(b,true)); secs.forEach(b=>addBtn(b,false));
        }catch{}

        const row = document.createElement('div'); row.style.display='flex'; row.style.alignItems='center'; row.style.gap='8px';
        row.appendChild(head); const space=document.createElement('div'); space.style.flex='1'; row.appendChild(space);
        const close = document.createElement('button'); close.textContent='✕'; close.setAttribute('aria-label','Close'); close.style.background='transparent'; close.style.border='1px solid #2d3d6e'; close.style.borderRadius='6px'; close.style.color='inherit'; close.style.cursor='pointer'; close.style.padding='2px 6px';
        const dismissable = Boolean(notice.dismissable || notice.dismissible || notice.dismiss);
        if (dismissable) { row.appendChild(close); }

        host.appendChild(row);
        host.appendChild(body);
        host.appendChild(btns);

        // Insert at top of body
        const target = document.body;
        if (target.firstChild) target.insertBefore(host, target.firstChild); else target.appendChild(host);

        if (dismissable) {
          close.addEventListener('click', ()=>{ try { sessionStorage.setItem(key,'1'); } catch {} host.remove(); });
        }
      }catch{}
    }

    fetch(`${API}/public-config`, { cache:'no-store', credentials:'omit' })
      .then(r=>r.ok?r.json():null)
      .then(cfg=>{
        if (!cfg) return;
        let n = null;
        if (cfg.notice && typeof cfg.notice === 'object') n = cfg.notice;
        else if (cfg.notice && typeof cfg.notice === 'string' && cfg.notice.trim().length) n = { content: cfg.notice };
        if (n) injectBanner(n);
      })
      .catch(()=>{});
  }catch{}
})();
