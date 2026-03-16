(function(){
  try{
    if (window.__acrp_toasts_inited) return; 
    window.__acrp_toasts_inited = true;

    
    const css = `
    .toast-container{position:fixed;right:16px;bottom:16px;display:flex;flex-direction:column;gap:8px;z-index:2147483647}
    .toast-item{background:#121a33;color:#e8eefc;border:1px solid #2d3d6e;border-radius:8px;padding:10px 12px;min-width:240px;max-width:420px;box-shadow:0 4px 24px rgba(0,0,0,.35);display:flex;align-items:flex-start;gap:8px;word-break:break-word;overflow-wrap:break-word}
    .toast-item span[aria-hidden]{flex-shrink:0;font-style:normal;opacity:.8}
    .toast-item.warn{border-color:#7a5c15;background:#1e1a0d}
    .toast-item.error{border-color:#7a2d2d;background:#1e0f10}
    .toast-item .toast-close{margin-left:auto;background:transparent;border:none;color:inherit;cursor:pointer;font-size:14px}
    `;
    const style = document.createElement('style'); style.type = 'text/css'; style.appendChild(document.createTextNode(css)); document.head.appendChild(style);

    
    let box = document.getElementById('toasts');
    if (!box){
      box = document.createElement('div');
      box.id = 'toasts';
      box.className = 'toast-container';
      box.setAttribute('aria-live', 'polite');
      box.setAttribute('aria-atomic', 'false');
      box.setAttribute('role', 'status');
      document.body.appendChild(box);
    }

    const ICONS = { info: 'ℹ', warn: '⚠', error: '✕' };
    const LAST = new Map();
    function showToast(msg, type='info', ttl=4000){
      try{
        const key = type+':'+String(msg);
        const now = Date.now();
        const last = LAST.get(key)||0; if (now-last < 1500) return; LAST.set(key, now);
        const item = document.createElement('div');
        item.className = 'toast-item' + (type==='error' ? ' error' : (type==='warn' ? ' warn' : ''));
        item.setAttribute('role', 'alert');
        item.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        const icon = document.createElement('span');
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = ICONS[type] || ICONS.info;
        const text = document.createElement('div');
        text.textContent = String(msg);
        const close = document.createElement('button');
        close.className='toast-close';
        close.setAttribute('aria-label', 'Dismiss notification');
        close.textContent='✕';
        close.onclick = ()=> item.remove();
        item.appendChild(icon); item.appendChild(text); item.appendChild(close); box.appendChild(item);
        if (ttl>0) setTimeout(()=>{ try{ item.remove(); }catch{} }, ttl);
      }catch{}
    }

    // Expose globally
    window.ACRP = window.ACRP || {};
    window.ACRP.showToast = showToast;
    if (!window.showToast) window.showToast = showToast;
  }catch{}
})();
