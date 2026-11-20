import sys, json, math
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
