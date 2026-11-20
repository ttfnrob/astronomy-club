import subprocess, json, sys, urllib.parse, re
def api(params):
    args=["curl","-s","-m","40","-A","MissionAtlasBuilder/1.0 (educational page)","-G","https://commons.wikimedia.org/w/api.php"]
    for k,v in params.items(): args+=["--data-urlencode",f"{k}={v}"]
    return json.loads(subprocess.run(args,capture_output=True,text=True).stdout)
def strip(s): return re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',s or '')).strip()
def search(q,n=7):
    d=api(dict(action='query',format='json',generator='search',gsrnamespace=6,gsrsearch=q+' filetype:bitmap',gsrlimit=n,prop='imageinfo',iiprop='url|size|extmetadata',iiurlwidth=900))
    out=[]
    for p in sorted(d.get('query',{}).get('pages',{}).values(),key=lambda p:p.get('index',0)):
        ii=p['imageinfo'][0]; em=ii.get('extmetadata',{})
        out.append((p['title'],ii['width'],ii['height'],strip(em.get('LicenseShortName',{}).get('value')),strip(em.get('Artist',{}).get('value'))[:50],strip(em.get('Credit',{}).get('value'))[:60]))
    return out
if __name__=='__main__':
    for q in sys.argv[1:]:
        print('##',q)
        for r in search(q): print('  ',r)
