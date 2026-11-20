import sys, json, math
from hz import hz
from build_common import *
import numpy as np
from scipy.interpolate import CubicSpline
from scipy.integrate import solve_ivp
M=json.load(open('m_part2.json')); T=json.load(open('mex_tmp.json'))
# Neptune altitude over the pole (polar radius)
M['voyager2']['close'][3]['alt']=round(M['voyager2']['close'][3]['dist']-24341)
# ---- Beagle 2
GMs=1.32712440018e11; GMm=42828.37; s0=T['s0']
mars=hz('499','500@10','2003-12-19 00:00','2003-12-26 00:00','10 m','KM-S')
tm=np.array([x[0] for x in mars]); ms=CubicSpline((tm-s0[0])*86400,np.array([x[1:4] for x in mars]))
def f(t,y):
    r=y[:3]; rm=ms(t); d=r-rm
    return np.concatenate([y[3:],-GMs*r/np.linalg.norm(r)**3-GMm*d/np.linalg.norm(d)**3])
def hit(t,y): return np.linalg.norm(y[:3]-ms(t))-(3389.5+120)
hit.terminal=True; hit.direction=-1
sol=solve_ivp(f,[0,6.8*86400],np.array(s0[1:7]),method='DOP853',rtol=1e-11,atol=1e-6,events=hit,dense_output=True)
te=sol.t[-1]; jentry=s0[0]+te/86400; print('beagle entry',cal(jentry))
ts=np.arange(te-6*3600,te+1,60); bp=[sol.sol(t)[:3]-ms(t) for t in ts]
v=(np.linalg.norm(bp[-1]-bp[-2]))/60; print('entry speed km/s',round(v,2))
a=T['mexarr']
mexwin=[r for r in a if jentry-0.25<=r[0]<=jentry+0.6]
m=T['mex']; sun=sunvec('499',jentry)
m['close'].append({'body':'Mars','kind':'fly','jd0':s0[0]+ts[0]/86400,'step':1,'ca':len(bp)-1,'label':'Atmospheric entry','alt':120,'sun':sun,'p':[round(float(x)) for p in bp for x in p],'p2':[round(x) for r in mexwin for x in r[1:4]],'p2name':'Mars Express'})
cap=[r for r in a if r[0]>=jentry-0.3]; ds=[norm(r[1:4]) for r in cap]; i=ds.index(min(ds))
m['close'].append({'body':'Mars','kind':'orbit','jd0':cap[0][0],'step':5,'ca':i,'label':'Capture burn','alt':round(ds[i]-3389.5),'sun':sun,'p':[round(x) for r in cap for x in r[1:4]],'p2':[round(float(x)) for p in bp[::3] for x in p],'p2name':'Beagle 2'})
m['events']={'release':jd(2003,12,19,8,31)-m['t0'],'entry':jentry-m['t0']}
M['beagle2']=m
# ---- BepiColombo
B=json.load(open('bepi_traj.json')); N=len(B['sc'])//3
def sv(arr,T_):
    i=int(T_); v=arr[3*i:3*i+3]; n=norm(v); return [round(-x/n,4) for x in v]
m={'t0':B['jd0'],'unit':'AU','t':list(range(N)),'craft':B['sc'],'bodies':{k.capitalize():{'pos':B[k]} for k in ('mercury','venus','earth')},'close':[]}
for F in B['fly']:
    Tca=F['jd0']+F['ca']/1440-B['jd0']
    m['close'].append({'body':F['body'],'kind':'fly','jd0':F['jd0'],'step':1,'ca':F['ca'],'alt':F['alt'],'sun':sv(B[F['body'].lower()],Tca),'p':F['p']})
A=B['arr']; p=A['p']; n=len(p)//3; i=min(range(400),key=lambda k:norm(p[3*k:3*k+3]))
m['close'].append({'body':'Mercury','kind':'orbit','jd0':A['jd0'],'step':10,'ca':i,'label':'Insertion burn','alt':round(norm(p[3*i:3*i+3])-2439.7),'sun':sv(B['mercury'],N-1),'p':p,'fit':46})
M['bepicolombo']=m
for k,v in M.items():
    print(k,'pts',len(v['t']),'close',[(c['body'],c['kind'],len(c['p'])//3,c['alt']) for c in v['close']],'bytes',len(json.dumps(v,separators=(',',':'))),'t0',cal(v['t0']),'dur d',round(v['t'][-1],2))
json.dump(M,open('../missions.json','w'),separators=(',',':'))
import os; print(os.path.getsize('../missions.json'))
