/* ⚙️ Settings hub — lazy-loaded (pehle tap par). Globals use: myName, openSetPasswordFlow, userPwHash, USERPW_PREFIX,
   isMeAdmin, targetReminderPref/setTargetReminderPref, strictManagerPref/setStrictManagerPref, chatOpenInbox, openHelpTab */
(function(){
if(window.openSettingsHub) return;
var LS = function(k, v){ try{ if(v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }catch(e){} return null; };
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

/* ---- UI prefs (text size / animations) ---- */
window.cxApplyUiPrefs = function(){
  var z = parseInt(LS('cgl50-ui-zoom') || '100', 10) || 100;
  try{ document.body.style.zoom = z === 100 ? '' : (z / 100); }catch(e){}
  var st = document.getElementById('cxNoMotionCss'), nm = LS('cgl50-ui-nomotion') === '1';
  if(nm && !st){ st = document.createElement('style'); st.id = 'cxNoMotionCss'; st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'; document.head.appendChild(st); }
  if(!nm && st) st.remove();
};

function toast(m){ alert(m); }
function row(id, icon, title, sub, right){
  return '<div class="cxsRow" data-id="' + id + '"><div class="cxsIco">' + icon + '</div><div class="cxsTxt"><b>' + title + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>' + (right || '<span class="cxsGo">›</span>') + '</div>';
}
function sw(on){ return '<span class="cxsSw' + (on ? ' on' : '') + '"><i></i></span>'; }

function build(){
  var me = (typeof myName !== 'undefined' && myName) ? myName : '';
  var z = parseInt(LS('cgl50-ui-zoom') || '100', 10) || 100;
  var adm = false; try{ adm = isMeAdmin(); }catch(e){}
  var h = '';
  h += '<div class="cxsSec">Account</div>';
  h += row('pw', '🔑', 'Password set / badlo', 'Dusre device par login ke liye');
  h += row('logout', '🚪', 'Logout (is device se)', me ? 'Naam: ' + esc(me) : '');
  if(adm) h += row('pwreset', '👑', 'Kisi ka password reset karo', 'Admin only');
  h += '<div class="cxsSec">Privacy</div>';
  h += row('chatlock', '🔒', 'Chat PIN lock', 'Chat kholo → upar 🔒 icon se PIN set/change');
  h += '<div class="cxsSec">Look</div>';
  h += row('zoom', '🔤', 'Text size', z + '%  (tap: 90 → 100 → 115 → 130)');
  h += row('motion', '🐢', 'Animations kam karo', 'Slow phone par fast chalega', sw(LS('cgl50-ui-nomotion') === '1'));
  h += '<div class="cxsSec">Reminders</div>';
  var tr = true, sm = true; try{ tr = targetReminderPref(); sm = strictManagerPref(); }catch(e){}
  h += row('trem', '⏰', 'Target reminder', 'Task time par yaad dilao', sw(tr));
  h += row('smgr', '🧑‍💼', 'Strict Manager popup', '', sw(sm));
  h += '<div class="cxsSec">Data</div>';
  h += row('bk', '⬇️', 'Apna backup download', 'Is device ka saara data ek file me');
  h += row('rs', '📤', 'Backup se restore', 'Pehle download ki hui file chuno');
  h += row('cache', '🧹', 'Cache saaf + app refresh', 'Update na dikhe to ye karo');
  h += row('store', '💾', 'Storage kitna use hua', '<span id="cxsStore">...</span>');
  h += '<div class="cxsSec">Info</div>';
  h += row('help', '❓', 'Help', '');
  h += row('upd', '🔄', 'Update check karo', 'Version: <span id="cxsVer">...</span>');
  return h;
}

function css(){
  if(document.getElementById('cxsCss')) return;
  var s = document.createElement('style'); s.id = 'cxsCss';
  s.textContent = '#cxsWrap{position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center}'
  + '#cxsBox{width:100%;max-width:520px;max-height:88vh;overflow:auto;background:var(--card,#1a1a22);color:var(--text,#fff);border-radius:18px 18px 0 0;padding:6px 0 18px;-webkit-overflow-scrolling:touch}'
  + '#cxsHead{position:sticky;top:0;background:inherit;display:flex;justify-content:space-between;align-items:center;padding:12px 16px;font-weight:800;font-size:17px;border-bottom:1px solid rgba(255,255,255,.1)}'
  + '#cxsHead button{background:rgba(255,255,255,.12);border:0;color:inherit;border-radius:10px;padding:6px 12px;font-size:14px}'
  + '.cxsSec{padding:12px 16px 4px;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;opacity:.6;font-weight:800}'
  + '.cxsRow{display:flex;align-items:center;gap:12px;padding:11px 16px;cursor:pointer}.cxsRow:active{background:rgba(255,255,255,.07)}'
  + '.cxsIco{font-size:20px;width:26px;text-align:center}.cxsTxt{flex:1;min-width:0}.cxsTxt b{display:block;font-size:14.5px}.cxsTxt small{display:block;opacity:.65;font-size:12px;margin-top:1px}'
  + '.cxsGo{opacity:.4;font-size:20px}.cxsSw{width:42px;height:24px;border-radius:12px;background:rgba(255,255,255,.22);position:relative;flex-shrink:0;transition:background .15s}'
  + '.cxsSw i{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .15s}.cxsSw.on{background:#22c55e}.cxsSw.on i{left:21px}';
  document.head.appendChild(s);
}

function setSw(rowEl, on){ var s = rowEl.querySelector('.cxsSw'); if(s) s.classList.toggle('on', on); }

async function doBackup(){
  var out = { app: 'cgl-tracker', exportedAt: new Date().toISOString(), name: (typeof myName !== 'undefined' ? myName : ''), data: {} };
  try{ for(var i = 0; i < localStorage.length; i++){ var k = localStorage.key(i); if(!k || k.indexOf(USERPW_PREFIX) === 0) continue; if(/^(cgl|cx|de_read|de_score|de_time)/i.test(k)) out.data[k] = localStorage.getItem(k); } }catch(e){}
  var blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'cgl-backup-' + (out.name || 'me') + '-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); setTimeout(function(){ a.remove(); URL.revokeObjectURL(a.href); }, 1000);
}
function doRestore(){
  var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = function(){
    var f = inp.files && inp.files[0]; if(!f) return;
    var r = new FileReader();
    r.onload = function(){
      try{
        var o = JSON.parse(r.result);
        if(!o || o.app !== 'cgl-tracker' || !o.data) throw new Error('bad');
        var n = Object.keys(o.data).length;
        if(!confirm('Is backup me ' + n + ' items hain (' + (o.exportedAt || '').slice(0, 10) + ', naam: ' + (o.name || '?') + '). Restore karne se is device ka current data overwrite hoga. Aage badhein?')) return;
        Object.keys(o.data).forEach(function(k){ try{ localStorage.setItem(k, o.data[k]); }catch(e){} });
        toast('✅ Restore ho gaya. App refresh ho raha hai.'); location.reload();
      }catch(e){ toast('❌ Ye valid backup file nahi hai.'); }
    };
    r.readAsText(f);
  };
  inp.click();
}
async function clearCache(){
  if(!confirm('Cache saaf karke app refresh karein? (Aapka progress/login delete nahi hoga.)')) return;
  try{ if(window.caches){ var ks = await caches.keys(); await Promise.all(ks.map(function(k){ return caches.delete(k); })); } }catch(e){}
  try{ if(navigator.serviceWorker){ var rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(function(r){ return r.unregister(); })); } }catch(e){}
  location.reload();
}
async function adminPwReset(){
  var nm = prompt('Kis user ka password reset karna hai? (exact naam)'); if(!nm) return; nm = nm.trim(); if(!nm) return;
  if(!confirm('"' + nm + '" ka password hata dein? Wo naya password set kar payega.')) return;
  var key = USERPW_PREFIX + nm.toLowerCase();
  try{ localStorage.removeItem(key); }catch(e){}
  try{
    if(window.storage){
      if(typeof window.storage.delete === 'function') await window.storage.delete(key, true);
      else if(typeof window.storage.set === 'function') await window.storage.set(key, JSON.stringify({ h: '' }), true);
    }
    toast('✅ Reset ho gaya.');
  }catch(e){ toast('⚠️ Reset poora nahi hua, dobara try karo.'); }
}

function open(){
  css();
  var old = document.getElementById('cxsWrap'); if(old) old.remove();
  var w = document.createElement('div'); w.id = 'cxsWrap';
  w.innerHTML = '<div id="cxsBox"><div id="cxsHead"><span>⚙️ Settings</span><button type="button" id="cxsClose">Band</button></div>' + build() + '</div>';
  document.body.appendChild(w);
  var close = function(){ w.remove(); };
  w.addEventListener('click', async function(e){
    if(e.target === w || e.target.id === 'cxsClose'){ close(); return; }
    var r = e.target.closest && e.target.closest('.cxsRow'); if(!r) return;
    var id = r.getAttribute('data-id');
    if(id === 'pw'){ close(); openSetPasswordFlow(); }
    else if(id === 'logout'){
      if(!confirm('Is device se logout karein? Dobara login ke liye naam (aur password) chahiye. Progress cloud me safe rahega.')) return;
      try{ localStorage.removeItem('cgl50-myname'); }catch(e){} location.reload();
    }
    else if(id === 'pwreset'){ adminPwReset(); }
    else if(id === 'chatlock'){ close(); try{ chatOpenInbox(); }catch(e){} }
    else if(id === 'zoom'){
      var L = [90, 100, 115, 130], c = parseInt(LS('cgl50-ui-zoom') || '100', 10) || 100, n = L[(L.indexOf(c) + 1) % L.length];
      LS('cgl50-ui-zoom', String(n)); cxApplyUiPrefs(); r.querySelector('small').textContent = n + '%  (tap: 90 → 100 → 115 → 130)';
    }
    else if(id === 'motion'){ var on = LS('cgl50-ui-nomotion') !== '1'; LS('cgl50-ui-nomotion', on ? '1' : '0'); cxApplyUiPrefs(); setSw(r, on); }
    else if(id === 'trem'){ var t = !targetReminderPref(); setTargetReminderPref(t); setSw(r, t); }
    else if(id === 'smgr'){ var m = !strictManagerPref(); setStrictManagerPref(m); setSw(r, m); }
    else if(id === 'bk'){ doBackup(); }
    else if(id === 'rs'){ doRestore(); }
    else if(id === 'cache'){ clearCache(); }
    else if(id === 'help'){ close(); try{ document.getElementById('helpBtn').click(); }catch(e){} }
    else if(id === 'upd'){
      try{ var regs = navigator.serviceWorker ? await navigator.serviceWorker.getRegistrations() : []; await Promise.all(regs.map(function(g){ return g.update(); })); }catch(e){}
      toast('Update check ho gaya. App refresh ho raha hai.'); location.reload();
    }
  });
  try{
    if(navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(function(e){ var el = document.getElementById('cxsStore'); if(el) el.textContent = (e.usage / 1048576).toFixed(1) + ' MB use / ' + (e.quota / 1048576 / 1024).toFixed(1) + ' GB available'; });
    else document.getElementById('cxsStore').textContent = 'available nahi';
  }catch(e){}
  try{
    fetch('./sw.js', { cache: 'no-store' }).then(function(r){ return r.text(); }).then(function(t){ var m = /CACHE_VERSION\s*=\s*'([^']+)'/.exec(t), el = document.getElementById('cxsVer'); if(el) el.textContent = m ? m[1] : '?'; }).catch(function(){ var el = document.getElementById('cxsVer'); if(el) el.textContent = '?'; });
  }catch(e){}
}
window.openSettingsHub = open;
})();
