// Reusable SearchComponent
// Usage: new SiteSearch({input: DOMElement, suggestionsEl: DOMElement, getSuggestions: async (q) => [{key,label,meta}], onPick: (item)=>{} })
(function(window){
  function debounce(fn, wait=160){ let t; return function(...a){ clearTimeout(t); t=setTimeout(()=>fn.apply(this,a), wait); }; }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function highlight(text, term){ if(!term) return escapeHtml(text); const idx = text.toLowerCase().indexOf(term.toLowerCase()); if(idx===-1) return escapeHtml(text); return escapeHtml(text.slice(0,idx)) + '<span class="highlight">' + escapeHtml(text.slice(idx, idx+term.length)) + '</span>' + escapeHtml(text.slice(idx+term.length)); }

  function createList(items, term){ return items.map((it,i)=> `<div class="suggestion-item" data-idx="${i}" role="option">` + `<div style="min-width:0;flex:1">${highlight(it.label, term)}</div><div class="muted" style="margin-left:12px">${escapeHtml(it.key)}</div></div>`).join(''); }

  function SiteSearch(opts){
    if(!(this instanceof SiteSearch)) return new SiteSearch(opts);
    this.input = opts.input;
    this.container = opts.suggestionsEl;
    this.getSuggestions = opts.getSuggestions;
    this.onPick = opts.onPick || function(){};
    this.term='';
    this.items = [];
    this.index = -1;
    this._bind();
  }

  SiteSearch.prototype._bind = function(){
    this.input.setAttribute('autocomplete','off');
    this.input.addEventListener('input', debounce(async (e)=>{
      const q = this.input.value.trim(); this.term = q; if(!q){ this.hide(); return; }
      try{ const items = await this.getSuggestions(q); this.items = items || []; if(this.items.length===0){ this.hide(); return; } this.show(items); }catch(err){ console.error(err); }
    }, 120));

    this.input.addEventListener('keydown', (e)=>{
      if(!this.container || this.container.style.display==='none') return;
      if(e.key==='ArrowDown'){ e.preventDefault(); this.index = Math.min(this.items.length-1, this.index+1); this._updateActive(); }
      if(e.key==='ArrowUp'){ e.preventDefault(); this.index = Math.max(0, this.index-1); this._updateActive(); }
      if(e.key==='Enter'){ if(this.index>=0 && this.items[this.index]){ e.preventDefault(); this.pick(this.items[this.index]); } }
      if(e.key==='Escape'){ this.hide(); }
    });

    document.addEventListener('click', (e)=>{ if(!e.target.closest(this.container) && e.target!==this.input){ this.hide(); } });
  };

  SiteSearch.prototype._updateActive = function(){ Array.from(this.container.querySelectorAll('.suggestion-item')).forEach((el,i)=> el.classList.toggle('active', i===this.index)); const el = this.container.querySelector('.suggestion-item.active'); if(el) el.scrollIntoView({block:'nearest'}); };

  SiteSearch.prototype.show = function(items){ this.container.innerHTML = createList(items, this.term); this.container.style.display = 'block'; this.index = -1; const self = this; Array.from(this.container.querySelectorAll('.suggestion-item')).forEach(el=> el.addEventListener('click', ()=>{ const idx = Number(el.dataset.idx); self.pick(self.items[idx]); })); };
  SiteSearch.prototype.hide = function(){ this.container.style.display='none'; this.index = -1; };
  SiteSearch.prototype.pick = function(item){ this.hide(); this.onPick(item); };

  window.SiteSearch = SiteSearch;
})(window);
