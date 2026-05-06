(function(){
  try {
    if (window.__acrpTestConsoleLoaded) return;
    window.__acrpTestConsoleLoaded = true;

    var st = {
      enabled: false,
      open: false,
      tab: 'network',
      panel: null,
      refs: {},
      network: [],
      errors: [],
      reqId: 1,
      resendTimes: [],
      selectedEl: null,
      pickerOn: false,
      pickerTarget: null,
      pickerBox: null,
      modal: null,
      proofModal: null,
      toastWrap: null,
      suggMap: {},
      searchNetwork: '',
      searchErrors: ''
    };

    var RESEND_LIMIT = 10;
    var RESEND_WINDOW_MS = 120000;
    var MAX_NET = 500;
    var MAX_ERR = 400;
    var PANEL_ID = 'acrp-test-panel';
    var STYLE_ID = 'acrp-test-panel-style';

    var oc = {
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console)
    };

    function esc(v){
      return String(v == null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function tlabel(ts){
      try { return new Date(ts || Date.now()).toLocaleTimeString(); }
      catch (e) { return String(ts || Date.now()); }
    }

    function sevName(sev){
      if (sev === 'major') return 'Major (Site breaking)';
      if (sev === 'semi') return 'Semi major (Maybe site breaking)';
      if (sev === 'minor') return 'Minor';
      if (sev === 'warn') return 'Warnings';
      return 'Suggestions';
    }

    function trim(arr, max){ if (arr.length > max) arr.length = max; }

    function resendUsage(){
      var now = Date.now();
      st.resendTimes = st.resendTimes.filter(function(x){ return (now - x) <= RESEND_WINDOW_MS; });
      return st.resendTimes.length;
    }

    function consumeResend(){
      if (resendUsage() >= RESEND_LIMIT) return false;
      st.resendTimes.unshift(Date.now());
      return true;
    }

    function addErr(sev, msg, details){
      st.errors.unshift({
        id: Date.now() + Math.random(),
        time: Date.now(),
        sev: sev || 'minor',
        msg: String(msg || ''),
        details: details ? String(details) : ''
      });
      trim(st.errors, MAX_ERR);
      renderErrors();
    }

    function addSugg(msg){
      var k = String(msg || '').trim();
      if (!k || st.suggMap[k]) return;
      st.suggMap[k] = true;
      addErr('sugg', k, '');
    }

    function addNet(entry){
      st.network.unshift(entry);
      trim(st.network, MAX_NET);
      renderNetwork();
    }

    function bodyForStore(body){
      if (body == null) return null;
      if (typeof body === 'string') return body;
      if (body instanceof URLSearchParams) return body.toString();
      if (body instanceof FormData) return '[FormData]';
      if (body instanceof Blob) return '[Blob]';
      if (body instanceof ArrayBuffer) return '[ArrayBuffer]';
      if (ArrayBuffer.isView && ArrayBuffer.isView(body)) return '[TypedArray]';
      if (typeof body === 'object') {
        try { return JSON.stringify(body); } catch (e) { return '[Object]'; }
      }
      return String(body);
    }

    function normHeaders(h){
      var out = {};
      if (!h) return out;
      try {
        if (typeof Headers !== 'undefined' && h instanceof Headers) {
          h.forEach(function(v,k){ out[k] = String(v); });
          return out;
        }
      } catch (e) {}
      if (Array.isArray(h)) {
        h.forEach(function(p){ if (p && p.length >= 2) out[String(p[0])] = String(p[1]); });
        return out;
      }
      if (typeof h === 'object') {
        Object.keys(h).forEach(function(k){ out[k] = String(h[k]); });
      }
      return out;
    }

    function enable(){
      if (!st.enabled) {
        st.enabled = true;
        try { sessionStorage.setItem('acrp_testconsole_enabled', '1'); } catch (e) {}
      }
      oc.info('[testconsole] enabled. Press Ctrl+Shift+X.');
      return 'enabled';
    }

    function exposeEnable(){
      try {
        Object.defineProperty(window, 'testconsoleenable', {
          configurable: true,
          get: function(){
            enable();
            return function(){ return enable(); };
          }
        });
      } catch (e) {
        window.testconsoleenable = function(){ return enable(); };
      }
      window.testconsoleenable_run = function(){ return enable(); };
    }

    function ensureStyle(){
      if (document.getElementById(STYLE_ID)) return;
      var s = document.createElement('style');
      s.id = STYLE_ID;
      s.textContent = `
#${PANEL_ID}{
  position:fixed;
  top:0;
  right:0;
  width:min(412px,94vw);
  height:100vh;
  z-index:2147483645;
  background:#1b2437;
  color:#edf2ff;
  border-left:1px solid rgba(255,255,255,.08);
  box-shadow:-16px 0 36px rgba(4,7,18,.5);
  font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  display:grid;
  grid-template-rows:auto auto auto 1fr;
  transform:translateX(100%);
  transition:transform .2s ease;
}
#${PANEL_ID}.open{transform:translateX(0);}
#${PANEL_ID} .h{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:11px 10px 10px;
  background:#0b1020;
  border-bottom:1px solid rgba(255,255,255,.09);
}
#${PANEL_ID} .title{
  display:flex;
  align-items:center;
  gap:7px;
  font-size:14px;
}
#${PANEL_ID} .title-name{
  font-size:14px;
  font-weight:700;
  letter-spacing:.01em;
}
#${PANEL_ID} .title-mark{
  width:16px;
  height:16px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  color:#dce6ff;
  opacity:.95;
}
#${PANEL_ID} .top-actions{
  display:flex;
  align-items:center;
  gap:8px;
}
#${PANEL_ID} .icon{
  border:0;
  background:transparent;
  color:#d7def6;
  font-size:18px;
  width:22px;
  height:22px;
  line-height:22px;
  text-align:center;
  cursor:pointer;
  opacity:.95;
}
#${PANEL_ID} .icon:hover{opacity:1;color:#ffffff;}
#${PANEL_ID} .sub{
  padding:0 10px 8px;
  background:#0b1020;
  color:#8e9ab8;
  font-size:11px;
  border-bottom:1px solid rgba(255,255,255,.06);
}
#${PANEL_ID} .sub code{
  color:#d6deff;
  background:rgba(255,255,255,.05);
  padding:1px 4px;
  border-radius:4px;
}
#${PANEL_ID} .tabs-wrap{
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  background:#1a2438;
  border-bottom:1px solid rgba(255,255,255,.07);
  padding:0 2px;
}
#${PANEL_ID} .tabs{
  display:flex;
  align-items:flex-end;
  overflow:auto;
  scrollbar-width:none;
}
#${PANEL_ID} .tabs::-webkit-scrollbar{display:none;}
#${PANEL_ID} .tab{
  border:0;
  border-bottom:1px solid transparent;
  background:transparent;
  color:#edf2ff;
  font-size:13px;
  line-height:1;
  padding:10px 8px 9px;
  cursor:pointer;
  white-space:nowrap;
  opacity:.95;
}
#${PANEL_ID} .tab:hover{opacity:1;}
#${PANEL_ID} .tab.active{
  border-bottom-color:#cad8ff;
  opacity:1;
}
#${PANEL_ID} .tabs-tail{
  color:#c9d4f4;
  font-size:14px;
  padding:0 7px 9px 4px;
  user-select:none;
}
#${PANEL_ID} .content{
  overflow:auto;
  padding:0;
}
#${PANEL_ID} .pane{display:none;}
#${PANEL_ID} .pane.active{display:block;}
#${PANEL_ID} .pane-inner{
  padding:10px 8px 8px;
}
#${PANEL_ID} .row{
  display:flex;
  gap:8px;
  align-items:center;
  flex-wrap:wrap;
}
#${PANEL_ID} .muted{color:#a3afca;font-size:12px;}
#${PANEL_ID} .muted.small{font-size:11px;}
#${PANEL_ID} .tool-row{
  padding:8px;
  border-bottom:1px solid rgba(255,255,255,.06);
  background:#1a2438;
}
#${PANEL_ID} .icon-btn{
  border:1px solid rgba(255,255,255,.18);
  background:#162238;
  color:#dbe4ff;
  border-radius:6px;
  height:28px;
  min-width:28px;
  padding:0 8px;
  cursor:pointer;
  font-size:12px;
}
#${PANEL_ID} .icon-btn:hover{background:#22314d;}
#${PANEL_ID} .sep{
  width:1px;
  height:18px;
  background:rgba(255,255,255,.16);
}
#${PANEL_ID} .chip-row{
  display:flex;
  align-items:center;
  gap:6px;
  flex-wrap:wrap;
}
#${PANEL_ID} .chip{
  font-size:10px;
  line-height:1;
  border-radius:4px;
  border:1px solid rgba(121,132,255,.7);
  color:#edf2ff;
  background:#5865f2;
  padding:4px 6px;
  white-space:nowrap;
}
#${PANEL_ID} .chip.active{
  background:#4655ea;
}
#${PANEL_ID} .search-wrap{
  padding:8px;
  border-bottom:1px solid rgba(255,255,255,.06);
}
#${PANEL_ID} .search{
  width:100%;
  height:32px;
  border-radius:8px;
  border:1px solid rgba(115,132,170,.35);
  background:#1a2338;
  color:#e8efff;
  font-size:12px;
  padding:0 11px;
}
#${PANEL_ID} .search::placeholder{color:#98a6c7;}
#${PANEL_ID} .table{
  width:100%;
}
#${PANEL_ID} .table-head,
#${PANEL_ID} .row-entry{
  display:grid;
  grid-template-columns:minmax(0,1fr) 92px 98px;
  column-gap:10px;
  align-items:center;
}
#${PANEL_ID} .table-head{
  color:#dce5fb;
  font-size:11px;
  font-weight:700;
  text-transform:uppercase;
  padding:8px 8px 6px;
  border-bottom:1px solid rgba(255,255,255,.07);
}
#${PANEL_ID} .rows{
  display:block;
}
#${PANEL_ID} .row-entry{
  min-height:36px;
  padding:7px 8px;
  border-bottom:1px solid rgba(255,255,255,.06);
}
#${PANEL_ID} .cell-primary{
  font-size:12px;
  color:#edf2ff;
  line-height:1.25;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
#${PANEL_ID} .cell-sub{
  font-size:11px;
  color:#99a6c8;
  margin-top:2px;
  display:flex;
  align-items:center;
  gap:8px;
}
#${PANEL_ID} .item{
  border:1px solid rgba(255,255,255,.08);
  border-radius:10px;
  padding:8px;
  background:#151f32;
}
#${PANEL_ID} .mini{
  border:1px solid rgba(255,255,255,.2);
  background:#202d45;
  color:#dfe7ff;
  border-radius:5px;
  font-size:10px;
  padding:1px 6px;
  cursor:pointer;
}
#${PANEL_ID} .mini:hover{background:#2b3d61;}
#${PANEL_ID} .cell-status,
#${PANEL_ID} .cell-time{
  font-size:12px;
  color:#d7e0fa;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
#${PANEL_ID} .sev-pill{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border-radius:999px;
  padding:2px 8px;
  font-size:10px;
  text-transform:uppercase;
  letter-spacing:.03em;
  border:1px solid transparent;
}
#${PANEL_ID} .sev-major{background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.38);color:#fecaca;}
#${PANEL_ID} .sev-semi{background:rgba(245,158,11,.14);border-color:rgba(251,191,36,.38);color:#fde68a;}
#${PANEL_ID} .sev-minor{background:rgba(59,130,246,.14);border-color:rgba(96,165,250,.38);color:#bfdbfe;}
#${PANEL_ID} .sev-warn{background:rgba(148,163,184,.14);border-color:rgba(203,213,225,.38);color:#dbe3f4;}
#${PANEL_ID} .sev-sugg{background:rgba(34,197,94,.14);border-color:rgba(74,222,128,.38);color:#bbf7d0;}
#${PANEL_ID} .empty{
  color:#9ba9ca;
  font-size:12px;
  padding:10px 8px;
}
#${PANEL_ID} .section-title{
  color:#ffffff;
  font-size:15px;
  font-weight:700;
  margin:0 0 12px;
}
#${PANEL_ID} .quick-actions{
  display:grid;
  gap:8px;
}
#${PANEL_ID} .btn{
  border:1px solid rgba(255,255,255,.14);
  background:#1f2937;
  color:#e6edff;
  border-radius:8px;
  padding:8px 11px;
  font-size:12px;
  cursor:pointer;
}
#${PANEL_ID} .btn:hover{background:#2a3852;}
#${PANEL_ID} .btn.block{width:100%;text-align:center;}
#${PANEL_ID} .btn.accent{
  border-color:rgba(107,114,255,.75);
  background:linear-gradient(90deg,#5865f2,#6571ff);
  color:#f5f7ff;
  font-weight:600;
}
#${PANEL_ID} .btn.accent:hover{
  background:linear-gradient(90deg,#4c58df,#5b66ed);
}
#${PANEL_ID} details{
  border:1px solid rgba(255,255,255,.08);
  border-radius:8px;
  padding:6px 8px;
  margin-bottom:8px;
  background:#151f32;
}
#${PANEL_ID} summary{
  cursor:pointer;
  font-size:12px;
  color:#dbe5ff;
}
#${PANEL_ID} .rule{
  white-space:pre-wrap;
  word-break:break-word;
  font-size:11px;
  color:#cad6f7;
  margin:6px 0;
}
#acrp-tc-pick{
  position:fixed;
  pointer-events:none;
  z-index:2147483646;
  border:2px solid #8ea1ff;
  background:rgba(99,112,255,.14);
  display:none;
}
.acrp-age-ov{
  position:fixed;
  inset:0;
  background:rgba(8,11,22,.64);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:2147483646;
}
.acrp-age-modal{
  width:min(520px,92vw);
  background:#101a2b;
  border:1px solid rgba(255,255,255,.1);
  border-radius:12px;
  padding:18px;
  color:#f3f6ff;
}
.acrp-age-modal h2{margin:0 0 8px 0;font-size:20px;}
.acrp-age-modal p{margin:0 0 14px 0;color:#cad5f3;line-height:1.5;font-size:14px;}
.acrp-age-modal .actions{display:flex;justify-content:flex-end;}
.acrp-age-modal button{
  border:1px solid rgba(107,114,255,.7);
  background:linear-gradient(90deg,#5865f2,#6571ff);
  color:#f7f9ff;
  border-radius:8px;
  padding:8px 12px;
  cursor:pointer;
  font-weight:600;
}
#${PANEL_ID} .proof-group{
  margin-top:14px;
}
#${PANEL_ID} .proof-group:first-child{
  margin-top:0;
}
.acrp-proof-ov{
  position:fixed;
  inset:0;
  background:rgba(8,11,22,.7);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:2147483647;
}
.acrp-proof-modal{
  width:min(760px,94vw);
  background:#111a2c;
  border:1px solid rgba(255,255,255,.12);
  border-radius:12px;
  color:#eef3ff;
  box-shadow:0 22px 50px rgba(0,0,0,.45);
}
.acrp-proof-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:10px 12px;
  border-bottom:1px solid rgba(255,255,255,.1);
}
.acrp-proof-head h3{
  margin:0;
  font-size:16px;
}
.acrp-proof-x{
  border:0;
  background:transparent;
  color:#d7def6;
  font-size:20px;
  cursor:pointer;
  width:26px;
  height:26px;
  line-height:24px;
}
.acrp-proof-login-body{
  display:grid;
  grid-template-columns:1fr 1fr;
}
.acrp-proof-col{
  padding:16px 14px;
}
.acrp-proof-col + .acrp-proof-col{
  border-left:1px solid rgba(255,255,255,.1);
}
.acrp-proof-col h4{
  margin:0 0 8px;
  font-size:18px;
}
.acrp-proof-col p{
  margin:0;
  font-size:13px;
  color:#c8d3ef;
  line-height:1.45;
}
.acrp-proof-field{
  display:grid;
  gap:4px;
  margin-bottom:10px;
}
.acrp-proof-field label{
  font-size:12px;
  color:#b9c8ea;
}
.acrp-proof-field input{
  height:34px;
  border:1px solid rgba(133,150,191,.4);
  border-radius:8px;
  background:#1a253b;
  color:#e7eeff;
  padding:0 10px;
  font-size:12px;
}
.acrp-proof-btns{
  display:grid;
  gap:8px;
  margin-top:8px;
}
.acrp-proof-btn{
  border:1px solid rgba(107,114,255,.7);
  background:linear-gradient(90deg,#5865f2,#6571ff);
  color:#f8faff;
  border-radius:8px;
  height:34px;
  font-size:12px;
  cursor:pointer;
}
.acrp-proof-ban-body{
  padding:14px;
}
.acrp-proof-ban-top{
  border-bottom:1px solid rgba(255,255,255,.1);
  padding-bottom:10px;
  margin-bottom:12px;
}
.acrp-proof-ban-top h4{
  margin:0;
  font-size:21px;
}
.acrp-proof-ban-kv{
  display:grid;
  gap:8px;
  font-size:13px;
  color:#d7e1fb;
  margin-bottom:12px;
}
.acrp-proof-ban-note{
  background:#1a2438;
  border:1px solid rgba(255,255,255,.09);
  border-radius:8px;
  padding:10px;
  color:#bfcbea;
  font-size:12px;
}
.acrp-proof-ban-actions{
  display:flex;
  justify-content:flex-end;
  gap:8px;
  margin-top:12px;
}
.acrp-proof-ban-actions button{
  border:1px solid rgba(255,255,255,.18);
  background:#20314e;
  color:#eff4ff;
  border-radius:8px;
  height:34px;
  min-width:88px;
  padding:0 12px;
  cursor:pointer;
}
.acrp-proof-ban-actions button.primary{
  border-color:rgba(107,114,255,.7);
  background:linear-gradient(90deg,#5865f2,#6571ff);
}
.acrp-tc-toasts{
  position:fixed;
  right:18px;
  bottom:18px;
  z-index:2147483647;
  display:grid;
  gap:8px;
}
.acrp-tc-toast{
  min-width:260px;
  max-width:min(420px,90vw);
  border-radius:10px;
  border:1px solid rgba(255,255,255,.12);
  padding:10px 12px;
  color:#f8fbff;
  font-size:13px;
  box-shadow:0 12px 30px rgba(0,0,0,.35);
}
.acrp-tc-toast.success{
  background:#134e33;
  border-color:#1f8f59;
}
.acrp-tc-toast.error{
  background:#5e1820;
  border-color:#b33949;
}
@media (max-width: 720px){
  .acrp-proof-login-body{grid-template-columns:1fr;}
  .acrp-proof-col + .acrp-proof-col{border-left:0;border-top:1px solid rgba(255,255,255,.1);}
}`;
      document.head.appendChild(s);
    }

    function mkPanel(){
      if (st.panel) return;
      ensureStyle();
      var p = document.createElement('aside');
      p.id = PANEL_ID;
      p.innerHTML = '' +
        '<div class="h">' +
          '<div class="title"><span class="title-mark">#</span><span class="title-name">DevTools</span></div>' +
          '<div class="top-actions"><button class="icon" data-a="open-window" title="Open panel in new tab">[]</button><button class="icon" data-a="close" title="Close">x</button></div>' +
        '</div>' +
        '<div class="sub">Run <code>testconsoleenable</code> in console, then press <code>Ctrl+Shift+X</code>.</div>' +
        '<div class="tabs-wrap"><div class="tabs">' +
          '<button class="tab active" data-tab="network">Network</button>' +
          '<button class="tab" data-tab="errors">Triage</button>' +
          '<button class="tab" data-tab="style">xray</button>' +
          '<button class="tab" data-tab="age">Proofpoint</button>' +
          '<button class="tab" data-tab="exp">Experiments</button>' +
        '</div><div class="tabs-tail">&raquo;</div></div>' +
        '<div class="content">' +
          '<section class="pane active" data-pane="network">' +
            '<div class="tool-row"><div class="row"><button class="icon-btn" data-a="net-clear" title="Clear request list">Del</button><div class="sep"></div><div class="chip-row"><span class="chip">Events</span><span class="chip">Experiments</span><span class="chip">Impressions</span><span class="chip active">Network</span></div><span class="muted small" id="tc-resend-usage">Resend: 0/10 in 2:00</span></div></div>' +
            '<div class="search-wrap"><input class="search" id="tc-network-search" placeholder="Search by request name"></div>' +
            '<div class="table" id="tc-net-list"></div>' +
          '</section>' +
          '<section class="pane" data-pane="errors">' +
            '<div class="tool-row"><div class="row"><button class="icon-btn" data-a="err-clear" title="Clear error list">Del</button></div></div>' +
            '<div class="search-wrap"><input class="search" id="tc-errors-search" placeholder="Search by error/action name"></div>' +
            '<div class="table" id="tc-err-list"></div>' +
          '</section>' +
          '<section class="pane" data-pane="style"><div class="pane-inner">' +
            '<div class="row"><button class="btn" data-a="pick">Pick Element</button><button class="btn" data-a="pick-clear">Clear Selection</button></div>' +
            '<div class="item"><div class="muted">Selected</div><div id="tc-style-sel">None</div></div>' +
            '<div class="item" style="margin-top:8px;"><div class="muted">Debug</div><div id="tc-style-debug"></div></div>' +
            '<details open><summary>Inline</summary><div id="tc-style-inline"></div></details>' +
            '<details open><summary>Direct</summary><div id="tc-style-direct"></div></details>' +
            '<details open><summary>Via Proxy</summary><div id="tc-style-proxy"></div></details>' +
            '<details open><summary>General</summary><div id="tc-style-general"></div></details>' +
          '</div></section>' +
          '<section class="pane" data-pane="age"><div class="pane-inner">' +
            '<div class="proof-group">' +
              '<h3 class="section-title">Age Proofpoint</h3>' +
              '<div class="quick-actions">' +
                '<button class="btn accent block" data-a="age-default">Launch Age Proofpoint Test Tool</button>' +
                '<button class="btn accent block" data-a="age-success">Simulate Successful Proofpoint</button>' +
                '<button class="btn accent block" data-a="age-denied">Simulate Denied Proofpoint</button>' +
              '</div>' +
            '</div>' +
            '<div class="proof-group">' +
              '<h3 class="section-title">Credential Proofpoint</h3>' +
              '<div class="quick-actions">' +
                '<button class="btn accent block" data-a="cred-launch">Launch Login Proofpoint</button>' +
                '<button class="btn accent block" data-a="cred-success">Simulate Successful Ident Proofpoint</button>' +
                '<button class="btn accent block" data-a="cred-denied">Simulate Denied Ident Proofpoint</button>' +
                '<button class="btn accent block" data-a="cred-banned">Simulate Banned Ident Proofpoint</button>' +
              '</div>' +
            '</div>' +
          '</div></section>' +
          '<section class="pane" data-pane="exp"><div class="pane-inner"><div class="empty">No experiments configured yet.</div></div></section>' +
        '</div>' +
        '';

      p.addEventListener('click', function(ev){
        var tb = ev.target.closest('[data-tab]');
        if (tb) { setTab(tb.getAttribute('data-tab')); return; }
        var btn = ev.target.closest('[data-a]');
        if (btn) { handleAction(btn.getAttribute('data-a')); return; }
        var rb = ev.target.closest('[data-resend]');
        if (rb) { resendReq(Number(rb.getAttribute('data-resend'))); return; }
      });

      document.body.appendChild(p);
      st.panel = p;
      st.refs = {
        usage: p.querySelector('#tc-resend-usage'),
        networkSearch: p.querySelector('#tc-network-search'),
        errorsSearch: p.querySelector('#tc-errors-search'),
        net: p.querySelector('#tc-net-list'),
        err: p.querySelector('#tc-err-list'),
        sel: p.querySelector('#tc-style-sel'),
        dbg: p.querySelector('#tc-style-debug'),
        inline: p.querySelector('#tc-style-inline'),
        direct: p.querySelector('#tc-style-direct'),
        proxy: p.querySelector('#tc-style-proxy'),
        general: p.querySelector('#tc-style-general')
      };
      if (st.refs.networkSearch) {
        st.refs.networkSearch.addEventListener('input', function(){
          st.searchNetwork = this.value || '';
          renderNetwork();
        });
      }
      if (st.refs.errorsSearch) {
        st.refs.errorsSearch.addEventListener('input', function(){
          st.searchErrors = this.value || '';
          renderErrors();
        });
      }
      renderNetwork();
      renderErrors();
      renderStyle();
    }

    function setOpen(open){
      mkPanel();
      st.open = !!open;
      st.panel.classList.toggle('open', st.open);
      if (!st.open) stopPick();
    }

    function togglePanel(){ setOpen(!st.open); }

    function setTab(tab){
      st.tab = tab;
      if (!st.panel) return;
      st.panel.querySelectorAll('.tab').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
      st.panel.querySelectorAll('.pane').forEach(function(p){ p.classList.toggle('active', p.getAttribute('data-pane') === tab); });
    }

    function handleAction(a){
      if (a === 'close') setOpen(false);
      else if (a === 'open-window') {
        try { window.open(window.location.href, '_blank', 'noopener'); } catch (e) {}
      }
      else if (a === 'net-clear') { st.network = []; renderNetwork(); }
      else if (a === 'err-clear') { st.errors = []; st.suggMap = {}; renderErrors(); }
      else if (a === 'pick') startPick();
      else if (a === 'pick-clear') { st.selectedEl = null; renderStyle(); }
      else if (a === 'age-default') showAge('default');
      else if (a === 'age-success') showAge('success');
      else if (a === 'age-denied') showAge('denied');
      else if (a === 'cred-launch') showCredentialLogin();
      else if (a === 'cred-success') showToast('success', 'Success! Logged in as Test User.');
      else if (a === 'cred-denied') showToast('error', 'We couldn\'t log you in. Try again later.');
      else if (a === 'cred-banned') {
        showBannedProofpoint();
        showToast('error', 'We couldn\'t log you in. Try again later.');
      }
    }

    function renderNetwork(){
      if (!st.refs.net) return;
      st.refs.usage.textContent = 'Resend: ' + resendUsage() + '/' + RESEND_LIMIT + ' in 2:00';
      var query = String(st.searchNetwork || '').trim().toLowerCase();
      var entries = st.network.filter(function(n){
        if (!query) return true;
        var hay = [
          n.method || '',
          n.url || '',
          n.kind || '',
          n.statusText || '',
          n.status || ''
        ].join(' ').toLowerCase();
        return hay.indexOf(query) !== -1;
      });
      if (!entries.length) {
        st.refs.net.innerHTML = '<div class="empty">No network traffic captured yet.</div>';
        return;
      }
      var rows = entries.slice(0, 240).map(function(n){
        var can = n.req && n.req.url;
        var status = n.statusText || String(n.status || 'pending');
        var sub = (n.kind || 'request') + ' - ' + (n.dur == null ? '--' : (n.dur + ' ms'));
        return '' +
          '<div class="row-entry">' +
            '<div>' +
              '<div class="cell-primary">' + esc((n.method || 'GET') + ' ' + (n.url || '')) + '</div>' +
              '<div class="cell-sub">' + esc(sub) + (can ? ' <button class="mini" data-resend="' + n.id + '">Resend</button>' : '') + '</div>' +
            '</div>' +
            '<div class="cell-status">' + esc(status) + '</div>' +
            '<div class="cell-time">' + esc(tlabel(n.time)) + '</div>' +
          '</div>';
      }).join('');
      st.refs.net.innerHTML = '' +
        '<div class="table-head"><div>Request</div><div>Status</div><div>Timestamp</div></div>' +
        '<div class="rows">' + rows + '</div>';
    }

    function renderErrors(){
      if (!st.refs.err) return;
      var query = String(st.searchErrors || '').trim().toLowerCase();
      var severityOrder = { major: 0, semi: 1, minor: 2, warn: 3, sugg: 4 };
      var severityLabel = { major: 'Major', semi: 'Semi', minor: 'Minor', warn: 'Warning', sugg: 'Suggest' };
      var rowsData = st.errors.filter(function(e){
        if (!query) return true;
        var hay = [e.msg || '', e.details || '', sevName(e.sev)].join(' ').toLowerCase();
        return hay.indexOf(query) !== -1;
      }).slice();
      rowsData.sort(function(a, b){
        var sa = Object.prototype.hasOwnProperty.call(severityOrder, a.sev) ? severityOrder[a.sev] : 9;
        var sb = Object.prototype.hasOwnProperty.call(severityOrder, b.sev) ? severityOrder[b.sev] : 9;
        if (sa !== sb) return sa - sb;
        return b.time - a.time;
      });
      if (!rowsData.length) {
        st.refs.err.innerHTML = '<div class="empty">No errors captured yet.</div>';
        return;
      }
      var rows = rowsData.slice(0, 280).map(function(e){
        var short = severityLabel[e.sev] || 'Minor';
        return '' +
          '<div class="row-entry">' +
            '<div>' +
              '<div class="cell-primary">' + esc(e.msg) + '</div>' +
              (e.details ? '<div class="cell-sub">' + esc(e.details) + '</div>' : '') +
            '</div>' +
            '<div class="cell-status"><span class="sev-pill sev-' + esc(e.sev) + '">' + esc(short) + '</span></div>' +
            '<div class="cell-time">' + esc(tlabel(e.time)) + '</div>' +
          '</div>';
      }).join('');
      st.refs.err.innerHTML = '' +
        '<div class="table-head"><div>Action</div><div>Severity</div><div>Timestamp</div></div>' +
        '<div class="rows">' + rows + '</div>';
    }

    function cssEsc(v){
      try { if (window.CSS && window.CSS.escape) return window.CSS.escape(String(v)); } catch (e) {}
      return String(v).replace(/([^a-zA-Z0-9_-])/g, '\\$1');
    }

    function ruleText(style){
      var out = [];
      for (var i = 0; i < style.length; i += 1) {
        var p = style[i];
        out.push(p + ': ' + style.getPropertyValue(p) + (style.getPropertyPriority(p) ? ' !important' : '') + ';');
      }
      return out.join(' ');
    }

    function selType(sel, el){
      var s = String(sel || '').trim();
      var l = s.toLowerCase();
      if (!s) return 'direct';
      if (l === '*' || l.indexOf('html') !== -1 || l.indexOf('body') !== -1 || l.indexOf(':root') !== -1) return 'general';
      if (el.id && s.indexOf('#' + cssEsc(el.id)) !== -1) return 'direct';
      if (el.classList && Array.from(el.classList).some(function(c){ return s.indexOf('.' + cssEsc(c)) !== -1; })) return 'direct';
      if (/[ >+~]/.test(s)) return 'proxy';
      return 'direct';
    }

    function collectStyles(el){
      var out = { inline: [], direct: [], proxy: [], general: [] };
      if (!el) return out;
      var inl = el.getAttribute('style');
      if (inl && inl.trim()) out.inline.push({ s: '(inline style)', b: inl.trim(), src: 'element' });

      function walk(rules, src){
        if (!rules) return;
        for (var i = 0; i < rules.length; i += 1) {
          var r = rules[i];
          if (!r) continue;
          if (typeof CSSRule !== 'undefined' && r.type === CSSRule.STYLE_RULE) {
            var m = false;
            try { m = r.selectorText && el.matches(r.selectorText); } catch (e) { m = false; }
            if (!m) continue;
            var k = selType(r.selectorText, el);
            out[k].push({ s: r.selectorText, b: ruleText(r.style), src: src });
          } else if (r.cssRules && r.cssRules.length) {
            walk(r.cssRules, src + (r.conditionText ? (' @ ' + r.conditionText) : ''));
          }
        }
      }

      Array.from(document.styleSheets || []).forEach(function(ss){
        try { walk(ss.cssRules, ss.href || 'inline <style>'); } catch (e) {}
      });
      return out;
    }

    function diag(el){
      var out = [];
      if (!el) return out;
      var cs = getComputedStyle(el);
      var r = el.getBoundingClientRect();
      if (el.hidden) out.push('Element has [hidden] attribute.');
      if (cs.display === 'none') out.push('display is none on selected element.');
      if (cs.visibility === 'hidden' || cs.visibility === 'collapse') out.push('visibility is hidden/collapse on selected element.');
      if (Number(cs.opacity) === 0) out.push('opacity is 0 on selected element.');
      if (cs.pointerEvents === 'none') out.push('pointer-events is none on selected element.');
      if (r.width === 0 || r.height === 0) out.push('Element has zero width or height.');
      if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) out.push('Element is outside viewport.');
      var p = el.parentElement;
      while (p) {
        var pcs = getComputedStyle(p);
        if (pcs.display === 'none') { out.push('Ancestor has display:none (' + p.tagName.toLowerCase() + ').'); break; }
        if (pcs.visibility === 'hidden') { out.push('Ancestor has visibility:hidden (' + p.tagName.toLowerCase() + ').'); break; }
        p = p.parentElement;
      }
      if (!out.length) out.push('No obvious visibility/layout blockers detected.');
      return out;
    }

    function path(el){
      if (!el || !el.tagName) return 'None';
      var parts = [];
      var n = el;
      var guard = 0;
      while (n && n.nodeType === 1 && guard < 6) {
        var part = n.tagName.toLowerCase();
        if (n.id) { part += '#' + n.id; parts.unshift(part); break; }
        if (n.classList && n.classList.length) part += '.' + Array.from(n.classList).slice(0,2).join('.');
        parts.unshift(part);
        n = n.parentElement;
        guard += 1;
      }
      return parts.join(' > ');
    }

    function renderStyleGroup(ref, items){
      if (!ref) return;
      if (!items || !items.length) { ref.innerHTML = '<div class="empty">No matching rules.</div>'; return; }
      ref.innerHTML = items.slice(0, 120).map(function(x){
        return '<div class="rule">' + esc(x.s + ' { ' + x.b + ' }') + (x.src ? ('\n' + esc('/* ' + x.src + ' */')) : '') + '</div>';
      }).join('');
    }

    function renderStyle(){
      if (!st.refs.sel) return;
      var el = st.selectedEl;
      if (!el || !document.contains(el)) {
        st.refs.sel.textContent = 'None';
        st.refs.dbg.innerHTML = '<div class="empty">Pick an element to inspect.</div>';
        renderStyleGroup(st.refs.inline, []);
        renderStyleGroup(st.refs.direct, []);
        renderStyleGroup(st.refs.proxy, []);
        renderStyleGroup(st.refs.general, []);
        return;
      }
      st.refs.sel.textContent = path(el);
      var ds = diag(el);
      ds.forEach(addSugg);
      st.refs.dbg.innerHTML = ds.map(function(m){ return '<div style="font-size:12px;margin-bottom:4px;">- ' + esc(m) + '</div>'; }).join('');
      var sm = collectStyles(el);
      renderStyleGroup(st.refs.inline, sm.inline);
      renderStyleGroup(st.refs.direct, sm.direct);
      renderStyleGroup(st.refs.proxy, sm.proxy);
      renderStyleGroup(st.refs.general, sm.general);
    }

    function ensurePickBox(){
      if (st.pickerBox) return st.pickerBox;
      var b = document.getElementById('acrp-tc-pick');
      if (!b) { b = document.createElement('div'); b.id = 'acrp-tc-pick'; document.body.appendChild(b); }
      st.pickerBox = b;
      return b;
    }

    function movePickBox(el){
      var b = ensurePickBox();
      if (!el || !el.getBoundingClientRect) { b.style.display = 'none'; return; }
      var r = el.getBoundingClientRect();
      b.style.display = 'block';
      b.style.left = r.left + 'px';
      b.style.top = r.top + 'px';
      b.style.width = r.width + 'px';
      b.style.height = r.height + 'px';
    }

    function pickMove(ev){
      if (!st.pickerOn) return;
      var trg = ev.target;
      if (!trg || trg === st.pickerBox) return;
      if (st.panel && st.panel.contains(trg)) return;
      if (st.modal && st.modal.contains(trg)) return;
      if (st.proofModal && st.proofModal.contains(trg)) return;
      st.pickerTarget = trg;
      movePickBox(trg);
    }

    function pickClick(ev){
      if (!st.pickerOn) return;
      var trg = ev.target;
      if (!trg || (st.panel && st.panel.contains(trg)) || (st.modal && st.modal.contains(trg)) || (st.proofModal && st.proofModal.contains(trg))) return;
      ev.preventDefault();
      ev.stopPropagation();
      st.selectedEl = trg;
      stopPick();
      renderStyle();
    }

    function pickKey(ev){ if (st.pickerOn && ev.key === 'Escape') stopPick(); }

    function startPick(){
      if (st.pickerOn) return;
      st.pickerOn = true;
      ensurePickBox();
      document.documentElement.style.cursor = 'crosshair';
      document.addEventListener('mousemove', pickMove, true);
      document.addEventListener('click', pickClick, true);
      document.addEventListener('keydown', pickKey, true);
      addSugg('Style picker enabled. Click an element to inspect applied styles.');
    }

    function stopPick(){
      if (!st.pickerOn) return;
      st.pickerOn = false;
      document.documentElement.style.cursor = '';
      document.removeEventListener('mousemove', pickMove, true);
      document.removeEventListener('click', pickClick, true);
      document.removeEventListener('keydown', pickKey, true);
      movePickBox(null);
    }

    function closeAge(){
      if (!st.modal) return;
      var m = st.modal;
      st.modal = null;
      if (m.parentNode) m.parentNode.removeChild(m);
    }

    function showAge(mode){
      closeAge();
      var head = 'We need some details from you.';
      var body = 'At Allegheny County Roleplay (SM) we require facial age verification to use our services as outlined in our Terms of Service, Privacy Policy, and Biometric Data Privacy Statement. All data is processed through our vendor Didit.me.';
      var btn = 'Continue';
      var auto = 0;
      if (mode === 'success') {
        head = 'Success!';
        body = 'Everything looks right here. You may proceed to your action. Thank you for helping us keep our community safe.';
        btn = 'Close';
        auto = 5000;
      } else if (mode === 'denied') {
        head = 'Something isn\'t right...';
        body = 'We couldn\'t verify your age. Please try again later using all things outlined in our FAQ.';
        btn = 'Close';
        auto = 5000;
      }
      var ov = document.createElement('div');
      ov.className = 'acrp-age-ov';
      ov.innerHTML = '<div class="acrp-age-modal"><h2>' + esc(head) + '</h2><p>' + esc(body) + '</p><div class="actions"><button type="button" data-age-close>' + esc(btn) + '</button></div></div>';
      ov.addEventListener('click', function(ev){ if (ev.target === ov) closeAge(); });
      ov.querySelector('[data-age-close]').addEventListener('click', closeAge);
      document.body.appendChild(ov);
      st.modal = ov;
      if (auto > 0) setTimeout(function(){ if (st.modal === ov) closeAge(); }, auto);
    }

    function closeProofModal(){
      if (!st.proofModal) return;
      var m = st.proofModal;
      st.proofModal = null;
      if (m.parentNode) m.parentNode.removeChild(m);
    }

    function ensureToastWrap(){
      if (st.toastWrap && document.body.contains(st.toastWrap)) return st.toastWrap;
      var wrap = document.createElement('div');
      wrap.className = 'acrp-tc-toasts';
      document.body.appendChild(wrap);
      st.toastWrap = wrap;
      return wrap;
    }

    function showToast(type, text){
      var wrap = ensureToastWrap();
      var toast = document.createElement('div');
      toast.className = 'acrp-tc-toast ' + (type === 'success' ? 'success' : 'error');
      toast.textContent = String(text || '');
      wrap.appendChild(toast);
      setTimeout(function(){
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 4200);
    }

    function showCredentialLogin(){
      closeProofModal();
      var ov = document.createElement('div');
      ov.className = 'acrp-proof-ov';
      ov.innerHTML = '' +
        '<div class="acrp-proof-modal" role="dialog" aria-modal="true">' +
          '<div class="acrp-proof-head"><h3>Credential Proofpoint</h3><button type="button" class="acrp-proof-x" data-proof-x>X</button></div>' +
          '<div class="acrp-proof-login-body">' +
            '<div class="acrp-proof-col">' +
              '<h4>Login</h4>' +
              '<p>Seems like you need to login to complete this action. Please login via Clerk</p>' +
            '</div>' +
            '<div class="acrp-proof-col">' +
              '<p style="margin-bottom:10px;color:#b9c8ea;">Enter your credentials to continue.</p>' +
              '<div class="acrp-proof-field"><label>Username</label><input type="text" autocomplete="username"></div>' +
              '<div class="acrp-proof-field"><label>Password</label><input type="password" autocomplete="current-password"></div>' +
              '<div class="acrp-proof-btns">' +
                '<button type="button" class="acrp-proof-btn">Login through Roblox</button>' +
                '<button type="button" class="acrp-proof-btn">Login through Clerk</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      var x = ov.querySelector('[data-proof-x]');
      if (x) x.addEventListener('click', closeProofModal);
      document.body.appendChild(ov);
      st.proofModal = ov;
    }

    function showBannedProofpoint(){
      closeProofModal();
      var ov = document.createElement('div');
      ov.className = 'acrp-proof-ov';
      ov.innerHTML = '' +
        '<div class="acrp-proof-modal" role="dialog" aria-modal="true">' +
          '<div class="acrp-proof-head"><h3>Credential Proofpoint</h3></div>' +
          '<div class="acrp-proof-ban-body">' +
            '<div class="acrp-proof-ban-top">' +
              '<h4>Permanently banned</h4>' +
            '</div>' +
            '<div class="acrp-proof-ban-kv">' +
              '<div><strong>Reason:</strong> Misc</div>' +
              '<div><strong>Moderator Note:</strong> Test</div>' +
            '</div>' +
            '<div class="acrp-proof-ban-note">Access is restricted due to enforcement action. If this is unexpected, contact support for review.</div>' +
            '<div class="acrp-proof-ban-actions">' +
              '<button type="button" class="primary" data-proof-logout>Logout</button>' +
              '<button type="button" data-proof-close>Close</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      var closeBtn = ov.querySelector('[data-proof-close]');
      var logoutBtn = ov.querySelector('[data-proof-logout]');
      if (closeBtn) closeBtn.addEventListener('click', closeProofModal);
      if (logoutBtn) logoutBtn.addEventListener('click', closeProofModal);
      document.body.appendChild(ov);
      st.proofModal = ov;
    }

    function resendReq(id){
      var e = st.network.find(function(x){ return x.id === id; });
      if (!e || !e.req || !e.req.url) return;
      if (!consumeResend()) {
        addErr('warn', 'Networking resend limit reached', 'Max 10 resend actions per 2 minutes.');
        renderNetwork();
        return;
      }
      var init = { method: e.req.method || 'GET', headers: e.req.headers || {} };
      if (e.req.body && e.req.body.charAt(0) !== '[') init.body = e.req.body;
      oc.info('[testconsole] resend:', init.method, e.req.url);
      renderNetwork();
      if (typeof window.fetch === 'function') {
        window.fetch(e.req.url, init).catch(function(err){
          addErr('semi', 'Resend failed', String(err && err.message ? err.message : err));
        });
      }
    }

    function patchNetwork(){
      if (window.__acrpTestConsoleNetworkPatched) return;
      window.__acrpTestConsoleNetworkPatched = true;

      if (typeof window.fetch === 'function') {
        var nf = window.fetch.bind(window);
        window.fetch = function(input, init){
          var start = Date.now();
          var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
          var method = (init && init.method ? String(init.method) : (input && input.method ? String(input.method) : 'GET')).toUpperCase();
          var entry = {
            id: st.reqId++,
            time: start,
            kind: 'fetch',
            method: method,
            url: url,
            status: 'pending',
            statusText: 'pending',
            dur: null,
            req: { method: method, url: url, headers: normHeaders(init && init.headers), body: bodyForStore(init && Object.prototype.hasOwnProperty.call(init, 'body') ? init.body : null) }
          };
          addNet(entry);
          return nf(input, init).then(function(res){
            entry.status = res.status;
            entry.statusText = String(res.status);
            entry.dur = Date.now() - start;
            renderNetwork();
            if (!res.ok) addErr(res.status >= 500 ? 'semi' : 'warn', 'HTTP ' + res.status + ' for ' + method + ' ' + url, '');
            return res;
          }).catch(function(err){
            entry.status = 'failed';
            entry.statusText = 'failed';
            entry.dur = Date.now() - start;
            renderNetwork();
            addErr('semi', 'Network request failed: ' + method + ' ' + url, String(err && err.message ? err.message : err));
            throw err;
          });
        };
      }

      if (window.XMLHttpRequest && !window.__acrpTestConsoleXHRPatched) {
        window.__acrpTestConsoleXHRPatched = true;
        var xo = XMLHttpRequest.prototype.open;
        var xs = XMLHttpRequest.prototype.send;
        var xh = XMLHttpRequest.prototype.setRequestHeader;

        XMLHttpRequest.prototype.open = function(method, url){
          this.__tc = { method: String(method || 'GET').toUpperCase(), url: String(url || ''), headers: {}, body: null, start: 0, entry: null };
          return xo.apply(this, arguments);
        };

        XMLHttpRequest.prototype.setRequestHeader = function(name, value){
          try { if (this.__tc) this.__tc.headers[String(name)] = String(value); } catch (e) {}
          return xh.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function(body){
          try {
            if (this.__tc) {
              this.__tc.start = Date.now();
              this.__tc.body = bodyForStore(body);
              var meta = this.__tc;
              var entry = {
                id: st.reqId++,
                time: meta.start,
                kind: 'xhr',
                method: meta.method,
                url: meta.url,
                status: 'pending',
                statusText: 'pending',
                dur: null,
                req: { method: meta.method, url: meta.url, headers: meta.headers, body: meta.body }
              };
              meta.entry = entry;
              addNet(entry);
              this.addEventListener('loadend', function(){
                entry.status = this.status || 0;
                entry.statusText = String(entry.status || '0');
                entry.dur = Date.now() - meta.start;
                renderNetwork();
                if (this.status >= 400) addErr(this.status >= 500 ? 'semi' : 'warn', 'XHR ' + this.status + ' for ' + meta.method + ' ' + meta.url, '');
              });
              this.addEventListener('error', function(){
                entry.status = 'failed';
                entry.statusText = 'failed';
                entry.dur = Date.now() - meta.start;
                renderNetwork();
                addErr('semi', 'XHR failed: ' + meta.method + ' ' + meta.url, '');
              });
            }
          } catch (e) {}
          return xs.apply(this, arguments);
        };
      }
    }

    function patchErrors(){
      if (window.__acrpTestConsoleErrorsPatched) return;
      window.__acrpTestConsoleErrorsPatched = true;

      var nw = console.warn.bind(console);
      var ne = console.error.bind(console);
      console.warn = function(){
        try {
          var msg = Array.prototype.slice.call(arguments).map(function(x){ return String(x); }).join(' ');
          if (msg.indexOf('[testconsole]') === -1) addErr('warn', msg, '');
        } catch (e) {}
        return nw.apply(console, arguments);
      };
      console.error = function(){
        try {
          var msg = Array.prototype.slice.call(arguments).map(function(x){ return String(x); }).join(' ');
          if (msg.indexOf('[testconsole]') === -1) addErr('semi', msg, '');
        } catch (e) {}
        return ne.apply(console, arguments);
      };

      window.addEventListener('error', function(ev){
        try {
          var t = ev.target;
          if (t && t !== window && t.tagName) {
            addErr('minor', 'Resource error in <' + String(t.tagName).toLowerCase() + '>', t.src || t.href || '');
            return;
          }
          addErr('major', ev.message || 'Unknown window error', [ev.filename, ev.lineno, ev.colno].filter(Boolean).join(':'));
        } catch (e) {}
      }, true);

      window.addEventListener('unhandledrejection', function(ev){
        try {
          addErr('major', ev && ev.reason ? String(ev.reason) : 'Unhandled promise rejection', '');
        } catch (e) {}
      });
    }

    function installHotkey(){
      document.addEventListener('keydown', function(ev){
        var key = String(ev.key || '').toLowerCase();
        if (ev.ctrlKey && ev.shiftKey && key === 'x') {
          if (!st.enabled) {
            oc.warn('[testconsole] Run testconsoleenable first.');
            return;
          }
          ev.preventDefault();
          togglePanel();
        }
      });
    }

    exposeEnable();
    patchNetwork();
    patchErrors();
    installHotkey();

    try { if (sessionStorage.getItem('acrp_testconsole_enabled') === '1') st.enabled = true; } catch (e) {}

    oc.info('[testconsole] loaded. Run testconsoleenable then Ctrl+Shift+X.');
  } catch (err) {
    try { console.error('testconsole.js init failed', err); } catch (e) {}
  }
})();


