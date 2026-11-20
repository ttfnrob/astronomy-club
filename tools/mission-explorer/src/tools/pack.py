import json, base64, os
M=json.load(open('../missions.json'))
M['apollo11']['close'][0]['fit']=6.2
M['beagle2']['close'][0]['fit']=11; M['beagle2']['close'][1]['fit']=30
for m in M.values():
    for c in m['close']:
        c.pop('dist',None); c.pop('jdca',None)
d=json.dumps(M,separators=(',',':')).replace('</','<\\/')
imgs={f[:-4]:'data:image/jpeg;base64,'+base64.b64encode(open('../img/'+f,'rb').read()).decode() for f in sorted(os.listdir('../img'))}
t=open('../template.html',encoding='utf-8').read().replace('/*DATA*/',d).replace('/*IMGS*/',json.dumps(imgs,separators=(',',':')))
open('../../dist/flight-paths.html','w',encoding='utf-8').write(t); print(len(t))
