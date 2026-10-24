#!/usr/bin/env python3
"""study-desk-all-in-one.html ko hamesha asli files se dobara banata hai (alag/purani copy na rahe).

Single source of truth:  study-desk.html + pdf-viewer.html + study-tube.html + focus-desk.html
Inme se kuch bhi badlo, fir chalao:   python3 build-all-in-one.py
Sirf check karna ho (kuch likhe bina):  python3 build-all-in-one.py --check
"""
import base64, os, re, sys

D = os.path.dirname(os.path.abspath(__file__))
rd = lambda f: open(os.path.join(D, f), encoding='utf-8', newline='').read()
SRC = {'pdf': 'pdf-viewer.html', 'tube': 'study-tube.html', 'focus': 'focus-desk.html'}

LOAD_OLD = "function load(k){ var f=fr[k]; if(f && !f.getAttribute('src')){ f.src=f.dataset.src;"
LOAD_NEW = r"""function blobUrl(k){
  var t=document.getElementById('src-'+k).textContent.trim(), bin=atob(t), u=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
  var html=new TextDecoder('utf-8').decode(u);
  if(k==='focus'){ var dir=location.href.replace(/[?#].*$/,'').replace(/[^\/]*$/,''); html=html.replace(/<head([^>]*)>/i,'<head$1><base href="'+dir+'">'); }
  return URL.createObjectURL(new Blob([html],{type:'text/html'}));
}
function load(k){ var f=fr[k]; if(f && !f.getAttribute('src')){ f.src=blobUrl(k);"""

def build():
    s = rd('study-desk.html')
    for k, f in SRC.items():
        a = 'data-src="./%s" ' % f
        assert s.count(a) == 1, f
        s = s.replace(a, '')
    blobs = ''.join('<script type="text/plain" id="src-%s">%s</script>\n' % (k, base64.b64encode(rd(f).encode('utf-8')).decode())
                    for k, f in SRC.items())
    i = s.index(LOAD_OLD)
    j = s.rfind('<script>', 0, i)
    s = s[:j] + blobs + s[j:]
    assert s.count(LOAD_OLD) == 1
    s = s.replace(LOAD_OLD, LOAD_NEW)
    return s

if __name__ == '__main__':
    out = build(); p = os.path.join(D, 'study-desk-all-in-one.html')
    cur = open(p, encoding='utf-8', newline='').read() if os.path.exists(p) else ''
    if '--check' in sys.argv:
        print('IN SYNC' if cur == out else 'OUT OF SYNC - chalao: python3 build-all-in-one.py'); sys.exit(0 if cur == out else 1)
    open(p, 'w', encoding='utf-8', newline='').write(out); print('study-desk-all-in-one.html regenerate ho gaya (%d KB)' % (len(out)//1024))
