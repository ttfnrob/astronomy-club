import sys, json, math
sys.path.insert(0,'.')
from hz import hz
import numpy as np
from scipy.interpolate import CubicSpline
from scipy.integrate import solve_ivp
AU=149597870.7
def norm(v): return math.sqrt(sum(x*x for x in v))
def jd(y,m,d,h=0,mi=0,s=0):
    a=(14-m)//12; yy=y+4800-a; mm=m+12*a-3
    return d+(153*mm+2)//5+365*yy+yy//4-yy//100+yy//400-32045-0.5+(h+mi/60+s/3600)/24
def cal(j):
    import datetime
    return (datetime.datetime(2000,1,1,12)+datetime.timedelta(days=j-2451545.0)).strftime('%Y-%m-%d %H:%M')
def loop(pid,P,t0,n=180):
    step=max(1,int(P*1440/n)); r=hz(pid,'500@10',cal(t0),cal(t0+P+step/1440),f'{step} m')
    return {'P':round(step*n/1440,4),'pts':[round(v,4) for row in r[:n] for v in row[1:4]]}
def sunvec(pid,j):
    r=hz(pid,'500@10',cal(j),cal(j+0.01),'1 d'); v=r[0][1:4]; n=norm(v); return [round(-x/n,4) for x in v]
def closeup(sc,pid,body,R,approx,hw_h,step_min,label=None,search_d=1.5):
    r=hz(sc,'500@'+pid,cal(approx-search_d),cal(approx+search_d),'10 m','KM-S')
    i=min(range(len(r)),key=lambda k:norm(r[k][1:4])); tca=r[i][0]
    r=hz(sc,'500@'+pid,cal(tca-hw_h/24),cal(tca+hw_h/24),f'{step_min} m','KM-S')
    i=min(range(len(r)),key=lambda k:norm(r[k][1:4])); d=norm(r[i][1:4])
    print('  close',body,cal(r[i][0]),'dist',round(d),'alt',round(d-R),'n',len(r))
    return {'body':body,'kind':'fly','jd0':r[0][0],'step':step_min,'ca':i,'alt':round(d-R),'dist':round(d),'jdca':r[i][0],'sun':sunvec(pid,r[i][0]),'p':[round(v) for row in r for v in row[1:4]]}
def decimate(rows,ds):
    out=[rows[0]]
    for row in rows[1:-1]:
        if norm([row[k]-out[-1][k] for k in (1,2,3)])>=ds(row): out.append(row)
    out.append(rows[-1]); return out
M={}
# ---- Voyagers
for name,sc,start,flys in [('voyager1','-31','1977-09-05 14:10',[('599','Jupiter',71.492e3,jd(1979,3,5,12),24,10),('699','Saturn',60.268e3,jd(1980,11,12,23),14,5)]),
                           ('voyager2','-32','1977-08-20 15:40',[('599','Jupiter',71.492e3,jd(1979,7,9,22),24,10),('699','Saturn',60.268e3,jd(1981,8,26,3),14,5),('799','Uranus',25.559e3,jd(1986,1,24,18),7,2),('899','Neptune',24.764e3,jd(1989,8,25,4),5,2)])]:
    r=hz(sc,'500@10',start,'2026-11-20','1 d')
    r=decimate(r,lambda row:0.012*max(1.0,norm(row[1:4])))
    t0=r[0][0]; print(name,len(r),'last r',round(norm(r[-1][1:4]),1))
    m={'t0':t0,'unit':'AU','t':[round(x[0]-t0,3) for x in r],'craft':[round(v,4) for x in r for v in x[1:4]],'bodies':{},'close':[]}
    for key,pid,P in [('Earth','399',365.256),('Jupiter','5',4332.59),('Saturn','6',10759.22),('Uranus','7',30688.5),('Neptune','8',60182)]:
        m['bodies'][key]=loop(pid,P,t0)
    for pid,body,R,ap,hw,st in flys: m['close'].append(closeup(sc,pid,body,R,ap,hw,st))
    M[name]=m
# ---- Mars Express / Beagle 2
r=hz('-41','500@10','2003-06-02 19:20','2003-12-25 03:00','6 h'); t0=r[0][0]
m={'t0':t0,'unit':'AU','t':[round(x[0]-t0,3) for x in r],'craft':[round(v,5) for x in r for v in x[1:4]],'bodies':{'Earth':loop('399',365.256,t0),'Mars':loop('499',686.98,t0)},'close':[]}
print('mex',len(r))
# Mars-centred MEX arrival
a=hz('-41','500@499','2003-12-24 12:00','2003-12-26 06:00','5 m','KM-S')
ds=[norm(x[1:4]) for x in a]; i=ds.index(min(ds)); print('  MEX peri',cal(a[i][0]),round(ds[i]-3389.5),'end dist',round(ds[-1]))
mexarr=a
# Beagle 2: coast MEX pre-release state under Sun+Mars gravity
GMs=1.32712440018e11; GMm=42828.37
s0=hz('-41','500@10','2003-12-19 06:00','2003-12-19 06:10','10 m','KM-S',vel=True)[0]
mars=hz('499','500@10','2003-12-19 00:00','2003-12-26 00:00','10 m','KM-S')
tm=np.array([x[0] for x in mars]); ms=CubicSpline((tm-s0[0])*86400,np.array([x[1:4] for x in mars]))
def f(t,y):
    r=y[:3]; rm=ms(t); d=r-rm
    return np.concatenate([y[3:],-GMs*r/np.linalg.norm(r)**3-GMm*d/np.linalg.norm(d)**3])
def hit(t,y): return np.linalg.norm(y[:3]-ms(t))-(3389.5+120)
hit.terminal=True; hit.direction=-1
sol=solve_ivp(f,[0,6.8*86400],np.array(s0[1:7]),method='DOP853',rtol=1e-11,atol=1e-6,events=hit,dense_output=True)
tt=np.linspace(0,sol.t[-1],4000); dd=[np.linalg.norm(sol.sol(t)[:3]-ms(t)) for t in tt]
print('  Beagle coast: min dist to Mars centre',round(min(dd)),'at',cal(s0[0]+tt[int(np.argmin(dd))]/86400),'event',[cal(s0[0]+e/86400) for e in sol.t_events[0]])
json.dump(M,open('m_part1.json','w')); json.dump({'mex':m,'mexarr':mexarr,'s0':s0},open('mex_tmp.json','w'))
