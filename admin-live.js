// ADMIN LIVE EDIT — admin app ke andar se text/hide/CSS/banner badle, sabko turant mile (GitHub deploy nahi).
// Firebase: rooms/<room>/_liveEdits  =>  JSON { v, text:{orig:new}, hide:[selector], css:'', banner:'' }
// Safety: sirf textContent/hide/sanitized-CSS lagta hai (koi JS/HTML inject nahi hota).
(function(){
  var LS = 'cgl50-live-edits', D = { v:0, text:{}, hide:[], css:'', banner:'', order:{}, style:{}, add:[], lock:[] };
  var hist = [], base = '', sel = null, on = false, busy = false, applying = false, timer = null;
  try{ var c = JSON.parse(localStorage.getItem(LS)||'null'); if(c) D = norm(c); }catch(e){}

  function norm(o){ o = o||{}; return { v:o.v||0, text:(o.text&&typeof o.text==='object')?o.text:{}, hide:Array.isArray(o.hide)?o.hide:[], css:String(o.css||''), banner:String(o.banner||''), order:(o.order&&typeof o.order==='object')?o.order:{}, style:(o.style&&typeof o.style==='object')?o.style:{}, add:Array.isArray(o.add)?o.add:[], lock:Array.isArray(o.lock)?o.lock:[] }; }
  function path(){ try{ var r = getRoomCode(); return r ? 'rooms/'+r+'/_liveEdits' : null; }catch(e){ return null; } }
  function admin(){ try{ return typeof isMeAdmin==='function' && isMeAdmin(); }catch(e){ return false; } }
  function cleanCss(s){ return String(s).replace(/@import[^;]*;?/gi,'').replace(/url\s*\(/gi,'(').replace(/expression\s*\(/gi,'(').replace(/javascript:/gi,'').replace(/<\/?style/gi,'').slice(0,20000); }

  // ---------- apply ----------
  function applyText(){
    var keys = Object.keys(D.text); if(!keys.length) return;
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode:function(n){
      var p = n.parentNode; if(!p || /^(SCRIPT|STYLE|TEXTAREA|INPUT|NOSCRIPT)$/.test(p.nodeName)) return NodeFilter.FILTER_REJECT;
      if(p.closest && p.closest('#alvUI')) return NodeFilter.FILTER_REJECT;
      return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
    var n; while((n = w.nextNode())){
      var t = n.nodeValue.trim();
      if(Object.prototype.hasOwnProperty.call(D.text, t)){ n.nodeValue = n.nodeValue.replace(t, D.text[t]); }
    }
  }
  function keyOf(el){ return el.id ? '#'+el.id : (el.textContent||'').trim().replace(/\s+/g,' ').slice(0,40); }
  function applyOrder(){
    Object.keys(D.order).forEach(function(ps){
      var par; try{ par = document.querySelector(ps); }catch(e){} if(!par) return;
      var keys = D.order[ps], kids = Array.prototype.slice.call(par.children), map = {};
      kids.forEach(function(k){ var key = keyOf(k); if(key) map[key] = k; });
      var cur = kids.filter(function(k){ return k.id!=='alvUI' && keys.indexOf(keyOf(k))>-1; });
      var tgt = keys.map(function(k){ return map[k]; }).filter(Boolean);
      if(cur.length!==tgt.length || cur.every(function(k,i){ return k===tgt[i]; })) return;
      var ph = cur.map(function(k){ var c = document.createComment('alv'); par.insertBefore(c,k); return c; });
      cur.forEach(function(k){ par.removeChild(k); });
      ph.forEach(function(c,i){ par.insertBefore(tgt[i], c); par.removeChild(c); });
    });
  }
  function moveSel(dir){
    if(!sel) return toast('Pehle koi button tap karo');
    var par = sel.parentElement, sib = dir<0 ? sel.previousElementSibling : sel.nextElementSibling;
    while(sib && sib.id==='alvUI') sib = dir<0 ? sib.previousElementSibling : sib.nextElementSibling;
    if(!sib || !par) return toast('Aur jagah nahi hai');
    if(dir<0) par.insertBefore(sel, sib); else par.insertBefore(sib, sel);
    var keys = Array.prototype.map.call(par.children, keyOf).filter(Boolean);
    if(par.children.length>60 || new Set(keys).size!==keys.length) return toast('⚠ Ye sab same naam ke hain — sabke liye save nahi hoga');
    var ps = selOf(par); if(ps){ D.order[ps] = keys; push(); }
  }
  function applyAdd(){
    D.add.forEach(function(a){
      if(!a || !a.id || document.getElementById('alvA_'+a.id)) return;
      var par; try{ par = document.querySelector(a.p); }catch(e){} if(!par) return;
      var el = document.createElement(a.u ? 'a' : 'div'); el.id = 'alvA_'+a.id; el.className = String(a.c||'').replace(/[^\w\s-]/g,'');
      el.textContent = String(a.t||'').slice(0,500);
      if(a.u && /^(https?:\/\/|tel:|mailto:)/i.test(a.u)){ el.href = a.u; el.target = '_blank'; el.rel = 'noopener noreferrer'; el.style.cssText = 'display:inline-block;margin:6px;padding:8px 14px;border-radius:10px;background:#7c3aed;color:#fff;text-decoration:none'; }
      else if(a.u) return; else el.style.cssText = 'margin:6px;padding:8px;font-weight:600';
      par.insertBefore(el, par.children[a.i] || null);
    });
  }
  function styleEl(){ var s = document.getElementById('alvStyle'); if(!s){ s = document.createElement('style'); s.id = 'alvStyle'; document.head.appendChild(s); } return s; }
  function apply(){
    if(applying) return; applying = true;
    try{
      var hideCss = D.hide.map(function(s){ return String(s).replace(/[{}<>]/g,'')+'{display:none!important}'; }).join('\n');
      var lockCss = D.lock.map(function(s){ return String(s).replace(/[{}<>]/g,'')+'{pointer-events:none!important;opacity:.45!important}'; }).join('\n');
      var stCss = Object.keys(D.style).map(function(k){ var o = D.style[k]||{}, r = [];
        if(+o.fs) r.push('font-size:'+Math.min(80,Math.max(8,+o.fs))+'px'); if(/^#[0-9a-f]{6}$/i.test(o.color||'')) r.push('color:'+o.color);
        if(/^#[0-9a-f]{6}$/i.test(o.bg||'')) r.push('background:'+o.bg); if(o.fw) r.push('font-weight:700');
        return r.length ? k.replace(/[{}<>]/g,'')+'{'+r.join('!important;')+'!important}' : ''; }).join('\n');
      styleEl().textContent = hideCss + '\n' + lockCss + '\n' + stCss + '\n' + cleanCss(D.css);
      applyAdd();
      applyText(); applyOrder();
      var b = document.getElementById('alvBanner');
      if(D.banner){
        if(!b){ b = document.createElement('div'); b.id = 'alvBanner'; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99990;background:#f5b301;color:#111;font:600 13px/1.4 system-ui;padding:8px 12px;text-align:center;'; document.body.appendChild(b); }
        b.textContent = D.banner;
      } else if(b) b.remove();
    }catch(e){ console.error('alv apply', e); }
    applying = false;
  }
  function schedule(){ clearTimeout(timer); timer = setTimeout(apply, 300); }
  new MutationObserver(function(){ if(!applying) schedule(); }).observe(document.documentElement, { childList:true, subtree:true, characterData:true });

  base = JSON.stringify(D);
  // ---------- sync ----------
  async function pull(){
    var p = path(); if(!p || !window.__fbGet) return;
    try{
      var raw = await window.__fbGet(p); if(!raw) return;
      var r = norm(typeof raw==='string' ? JSON.parse(raw) : raw);
      if(r.v > D.v || !admin()){ D = r; base = JSON.stringify(D); try{ localStorage.setItem(LS, JSON.stringify(D)); }catch(e){} apply(); }
    }catch(e){}
  }
  async function push(noHist){
    var p = path(); if(!p || !admin()) return toast('Admin/room check karo');
    D.v = Date.now();
    var snap = JSON.stringify(D); if(!noHist && base && base!==snap){ hist.push(base); if(hist.length>20) hist.shift(); } base = snap;
    try{ await window.__fbSet(p, JSON.stringify(D)); localStorage.setItem(LS, JSON.stringify(D)); apply(); toast('✅ Sabke liye save ho gaya'); }
    catch(e){ toast('⚠ Save fail — internet check karo'); }
  }
  function toast(t){ var e = document.getElementById('alvToast'); if(!e){ e = document.createElement('div'); e.id = 'alvToast'; e.style.cssText = 'position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:99999;background:#222;color:#fff;border-radius:99px;padding:8px 16px;font:13px system-ui'; document.body.appendChild(e); } e.textContent = t; e.style.display = 'block'; clearTimeout(e._t); e._t = setTimeout(function(){ e.style.display = 'none'; }, 2500); }

  // ---------- ek button: Edit ON/OFF ----------
  function textNodeOf(el){
    for(var i=0;i<4 && el && el!==document.body;i++, el = el.parentElement){
      for(var c=el.firstChild;c;c=c.nextSibling) if(c.nodeType===3 && c.nodeValue.trim()) return c;
    } return null;
  }
  function selOf(el){
    var parts = [];
    while(el && el!==document.body && parts.length<5){
      if(el.id && /^[\w-]+$/.test(el.id)){ parts.unshift('#'+el.id); break; }
      var tag = el.tagName.toLowerCase(), sib = el.parentElement ? Array.prototype.filter.call(el.parentElement.children, function(x){ return x.tagName===el.tagName; }) : [];
      parts.unshift(sib.length>1 ? tag+':nth-of-type('+(sib.indexOf(el)+1)+')' : tag); el = el.parentElement;
    } return parts.join('>');
  }
  function clearSel(){ if(sel){ sel.style.outline = ''; sel = null; } }
  document.addEventListener('click', function(e){
    if(!on || !admin()) return;
    if(e.target.closest && e.target.closest('#alvUI')) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    var t = e.target.closest('button,a,[onclick],[role=button],label,li') || e.target;
    clearSel(); sel = t; sel.style.outline = '3px solid #7c3aed';
    toast('Chuna ✔ — neeche se kuch bhi karo');
  }, true);
  function editText(){
    var n = sel && textNodeOf(sel); if(!n) return toast('Pehle koi text/button tap karo');
    var cur = n.nodeValue.trim(), orig = cur;
    Object.keys(D.text).forEach(function(k){ if(D.text[k]===cur) orig = k; });
    var nv = prompt('Naya text (khaali = original wapas):', cur); if(nv===null) return;
    nv = nv.trim().slice(0,2000);
    if(!nv || nv===orig){ delete D.text[orig]; n.nodeValue = n.nodeValue.replace(cur, orig); } else D.text[orig] = nv;
    push();
  }
  function hideSel(){
    if(!sel) return toast('Pehle koi cheez tap karo');
    var s = selOf(sel); if(s && confirm('Ye sabke liye hide karein?')){ D.hide.push(s); clearSel(); push(); }
  }

  function styleSel(k, v){
    if(!sel) return toast('Pehle koi cheez tap karo');
    var s = selOf(sel), o = D.style[s] || (D.style[s] = {});
    if(k==='fs'){ var cur = o.fs || parseFloat(getComputedStyle(sel).fontSize) || 14; o.fs = Math.min(80, Math.max(8, Math.round(cur + v))); }
    else if(k==='fw') o.fw = o.fw ? 0 : 1; else o[k] = v;
    push();
  }
  function pickColor(k){
    if(!sel) return toast('Pehle koi cheez tap karo');
    var i = document.createElement('input'); i.type = 'color'; i.style.cssText = 'position:fixed;opacity:0;pointer-events:none'; document.body.appendChild(i);
    i.onchange = function(){ styleSel(k, i.value); i.remove(); }; i.click();
  }
  function addItem(){
    if(!sel || !sel.parentElement) return toast('Pehle us cheez ko tap karo jiske baad jodna hai');
    var t = prompt('Naye button/note ka text:'); if(!t || !t.trim()) return;
    var u = prompt('Link (https://... / tel: / mailto:) — khaali = sirf note/text:', '') || '';
    u = u.trim(); if(u && !/^(https?:\/\/|tel:|mailto:)/i.test(u)) return toast('Link https:// se shuru hona chahiye');
    var par = sel.parentElement, idx = Array.prototype.indexOf.call(par.children, sel) + 1, ps = selOf(par); if(!ps) return;
    D.add.push({ id: Date.now().toString(36), p: ps, i: idx, t: t.trim().slice(0,500), u: u, c: u ? sel.className : '' }); push();
  }
  function undo(){
    if(!hist.length) return toast('Undo ke liye kuch nahi hai');
    D = norm(JSON.parse(hist.pop())); push(true).then(function(){ location.reload(); });
  }
  function backup(){
    var j = JSON.stringify(D);
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(j).then(function(){ toast('📤 Backup copy ho gaya'); }, function(){ prompt('Ye copy karke rakh lo:', j); });
    else prompt('Ye copy karke rakh lo:', j);
  }
  function restore(){
    var j = prompt('Backup yahan paste karo:'); if(!j) return;
    try{ D = norm(JSON.parse(j)); push().then(function(){ location.reload(); }); }catch(e){ toast('Backup galat hai'); }
  }
  function lockSel(){ if(!sel) return toast('Pehle koi cheez tap karo'); var s = selOf(sel); if(s && confirm('Ye sabke liye band (click nahi hoga) kar dein?')){ D.lock.push(s); clearSel(); push(); } }

  // ---------- UI: sirf ek FAB; ON hone par neeche toolbar ----------
  function setOn(v){
    on = v; var u = document.getElementById('alvUI'); if(!u) return;
    u.querySelector('#alvFab').textContent = on ? '✅' : '✏️';
    u.querySelector('#alvFab').style.background = on ? '#16a34a' : '#7c3aed';
    u.querySelector('#alvBar').style.display = on ? 'flex' : 'none';
    if(!on){ clearSel(); u.querySelector('#alvList').style.display = 'none'; }
    toast(on ? 'Edit ON — kisi bhi cheez par tap karo' : 'Edit OFF');
  }
  function ui(){
    var u = document.getElementById('alvUI');
    if(!admin()){ if(u) u.remove(); on = false; return; }
    if(u) return;
    u = document.createElement('div'); u.id = 'alvUI'; u.style.cssText = 'font:13px system-ui';
    var bs = 'border:0;border-radius:10px;background:#33333d;color:#fff;padding:9px 11px;font-size:14px';
    u.innerHTML = '<button id="alvFab" style="position:fixed;right:12px;bottom:84px;z-index:99995;width:46px;height:46px;border-radius:50%;border:0;background:#7c3aed;color:#fff;font-size:20px;box-shadow:0 2px 10px #0006">✏️</button>' +
      '<div id="alvBar" style="display:none;position:fixed;left:8px;right:66px;bottom:84px;max-height:40vh;overflow:auto;z-index:99995;flex-wrap:wrap;gap:6px;background:#1c1c22;padding:8px;border-radius:12px;box-shadow:0 4px 20px #000a">' +
      [['text','✏️ Text'],['hide','🙈 Hide'],['lock','🔒 Lock'],['up','⬆️'],['down','⬇️'],['fsp','A+'],['fsm','A−'],['col','🖍 Color'],['bg','🎨 BG'],['bold','B'],['add','➕ Add'],['undo','↩️ Undo'],['css','{ } CSS'],['banner','📢 Banner'],['list','📋 List'],['bk','📤 Backup'],['rs','📥 Restore']].map(function(x){ return '<button data-a="'+x[0]+'" style="'+bs+'">'+x[1]+'</button>'; }).join('') + '</div>' +
      '<div id="alvList" style="display:none;position:fixed;left:8px;right:8px;bottom:150px;max-height:45vh;overflow:auto;z-index:99996;background:#1c1c22;color:#fff;border-radius:12px;padding:10px;box-shadow:0 4px 20px #000a"></div>';
    document.body.appendChild(u);
    u.querySelector('#alvFab').onclick = function(){ setOn(!on); };
    u.querySelectorAll('[data-a]').forEach(function(b){ b.onclick = function(){ act(b.dataset.a); }; });
  }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function row(txt, rm){ return '<div style="display:flex;gap:8px;margin:3px 0;font-size:12px"><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(txt)+'</span><b data-rm="'+esc(rm)+'" style="cursor:pointer">✕</b></div>'; }
  function showList(){
    var l = document.getElementById('alvList'); if(l.style.display==='block'){ l.style.display = 'none'; return; }
    l.innerHTML = '<b>Saare edits</b>' +
      Object.keys(D.text).map(function(k){ return row('✏️ '+k+' → '+D.text[k], 't:'+k); }).join('') +
      D.hide.map(function(h,i){ return row('🙈 '+h, 'h:'+i); }).join('') +
      Object.keys(D.order).map(function(k){ return row('↕️ '+k, 'o:'+k); }).join('') +
      Object.keys(D.style).map(function(k){ return row('🖍 '+k, 's:'+k); }).join('') +
      D.lock.map(function(h,i){ return row('🔒 '+h, 'l:'+i); }).join('') +
      D.add.map(function(a,i){ return row('➕ '+a.t, 'a:'+i); }).join('') +
      '<button data-reset style="margin-top:8px;border:0;border-radius:8px;background:#b91c1c;color:#fff;padding:8px">♻️ Saare edits hatao</button>';
    l.style.display = 'block';
    l.querySelectorAll('[data-rm]').forEach(function(b){ b.onclick = function(){ var v = b.dataset.rm, k = v.slice(2); if(v[0]==='t') delete D.text[k]; else if(v[0]==='o') delete D.order[k]; else if(v[0]==='s') delete D.style[k]; else if(v[0]==='l') D.lock.splice(+k,1); else if(v[0]==='a'){ var ad = D.add.splice(+k,1)[0]; var ae = ad && document.getElementById('alvA_'+ad.id); if(ae) ae.remove(); } else D.hide.splice(+k,1); push(); l.style.display = 'none'; toast('Hata diya (order/text ke liye reload karo)'); }; });
    l.querySelector('[data-reset]').onclick = function(){ if(confirm('Saare live edits hata dein?')){ D = { v:0, text:{}, hide:[], css:'', banner:'', order:{}, style:{}, add:[], lock:[] }; push().then(function(){ location.reload(); }); } };
  }
  function act(a){
    if(a==='text') editText(); else if(a==='hide') hideSel();
    else if(a==='up') moveSel(-1); else if(a==='down') moveSel(1);
    else if(a==='css'){ var c = prompt('Custom CSS (sabke liye lagega):', D.css); if(c!==null){ D.css = c; push(); } }
    else if(a==='banner'){ var b = prompt('Banner message (khaali = hata do):', D.banner); if(b!==null){ D.banner = b.slice(0,300); push(); } }
    else if(a==='list') showList();
    else if(a==='lock') lockSel(); else if(a==='fsp') styleSel('fs',2); else if(a==='fsm') styleSel('fs',-2);
    else if(a==='col') pickColor('color'); else if(a==='bg') pickColor('bg'); else if(a==='bold') styleSel('fw');
    else if(a==='add') addItem(); else if(a==='undo') undo(); else if(a==='bk') backup(); else if(a==='rs') restore();
  }

  setInterval(ui, 3000); setTimeout(ui, 1500);
  setTimeout(pull, 2500); setInterval(function(){ if(!document.hidden) pull(); }, 120000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) setTimeout(pull, 800); });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})();
