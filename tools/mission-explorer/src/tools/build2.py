import sys, json, math, re
sys.path.insert(0,'.')
from hz import hz
from build_common import *
import numpy as np
from scipy.interpolate import CubicSpline
from scipy.integrate import solve_ivp
from scipy.optimize import least_squares, minimize_scalar
GE=398600.4418; GMn=4902.8; RM=1737.4; RE=6378.137
M=json.load(open('m_part1.json'))
def sunE(j):
    r=hz('399','500@10',cal(j),cal(j+0.01),'1 d')[0][1:4]; n=norm(r); return [round(-x/n,4) for x in r]
def spacing(row,moonpos):
    dE=norm(row[1:4]); dM=norm([row[k]-moonpos[k-1] for k in (1,2,3)])
    return min(6000,max(250,0.05*min(dE,dM)))
def pack_em(rows,ms,jref):
    # rows: [jd,x,y,z] km geocentric ; ms: moon spline of seconds from jref
    out=[rows[0]]
    for row in rows[1:-1]:
        mp=ms((row[0]-jref)*86400)
        if norm([row[k]-out[-1][k] for k in (1,2,3)])>=spacing(row,mp): out.append(row)
    out.append(rows[-1]); t0=out[0][0]
    moon=[ms((r[0]-jref)*86400) for r in out]
    return {'t0':t0,'unit':'km','t':[round(r[0]-t0,5) for r in out],'craft':[round(v/1e5,5) for r in out for v in r[1:4]],
            'bodies':{'Moon':{'pos':[round(float(v)/1e5,5) for p in moon for v in p]}},'close':[],'sun':sunE(t0)}
def moonspl(a,b,jref):
    rows=hz('301','500@399',cal(a),cal(b),'10 m','KM-S'); t=np.array([(r[0]-jref)*86400 for r in rows]); return CubicSpline(t,np.array([r[1:4] for r in rows]))
# ---------- Artemis II
try: hz('-1024','500@399','2026-04-02 02:00','2026-04-12 00:00','5 m','KM-S')
except RuntimeError as e:
    mm=re.search(r'after A\.D\. (\d+)-(\w+)-(\d+) (\d+):(\d+)',str(e)); print('artemis end',mm.groups())
    mon={'APR':4}[mm.group(2)]; endj=jd(int(mm.group(1)),mon,int(mm.group(3)),int(mm.group(4)),int(mm.group(5)))-0.001
rows=hz('-1024','500@399','2026-04-02 02:00',cal(endj),'2 m','KM-S'); jref=rows[0][0]
ms=moonspl(jref-0.1,jref+10,jref)
dE=[norm(r[1:4]) for r in rows]; i=int(np.argmax(dE)); print('artemis n',len(rows),'start',cal(rows[0][0]),'r0',round(dE[0]),'end',cal(rows[-1][0]),'rend',round(dE[-1]),'max dist',round(dE[i]),cal(rows[i][0]))
# perigee/apogee early
for k in range(1,800):
    if dE[k]>dE[k-1] and dE[k]>dE[k+1]: print('  local apogee',cal(rows[k][0]),round(dE[k]))
    if dE[k]<dE[k-1] and dE[k]<dE[k+1]: print('  local perigee',cal(rows[k][0]),round(dE[k]-RE))
m=pack_em(rows,ms,jref); print('  packed',len(m['t']))
c=hz('-1024','500@301','2026-04-06 08:00','2026-04-07 14:00','5 m','KM-S'); d=[norm(r[1:4]) for r in c]; i=d.index(min(d)); print('  moon CA',cal(c[i][0]),'alt',round(d[i]-RM))
c=c[max(0,i-150):i+151]; i=min(range(len(c)),key=lambda k:norm(c[k][1:4]))
m['close'].append({'body':'Moon','kind':'fly','jd0':c[0][0],'step':5,'ca':i,'alt':round(norm(c[i][1:4])-RM),'sun':m['sun'],'p':[round(v) for r in c for v in r[1:4]]})
m['maxdist']=round(max(dE)); M['artemis2']=m
# ---------- Apollo reconstruction
def make(jref,a,b):
    ms=moonspl(a,b,jref)
    def eom(t,y):
        r=y[:3]; rm=ms(t); d=r-rm
        return np.concatenate([y[3:],-GE*r/np.linalg.norm(r)**3-GMn*(d/np.linalg.norm(d)**3+rm/np.linalg.norm(rm)**3)])
    def frame(t):
        rm=ms(t); vm=ms(t,1); e=rm/np.linalg.norm(rm); h=np.cross(rm,vm); h/=np.linalg.norm(h); return rm,vm,e,h
    def lstate(t,phi,s,alt):
        rm,vm,e,h=frame(t); p=math.cos(phi)*e+math.sin(phi)*np.cross(h,e); th=-np.cross(h,p)
        return np.concatenate([rm+(RM+alt)*p, vm+s*th])
    def prop(y0,t0,t1):
        return solve_ivp(eom,[t0,t1],y0,method='DOP853',rtol=1e-10,atol=1e-4,dense_output=True)
    def perigee(sol,ta,tb):
        ts=np.linspace(ta,tb,3000); rr=[np.linalg.norm(sol.sol(t)[:3]) for t in ts]; k=int(np.argmin(rr))
        lo,hi=ts[max(0,k-1)],ts[min(len(ts)-1,k+1)]
        res=minimize_scalar(lambda t:np.linalg.norm(sol.sol(t)[:3]),bounds=(lo,hi),method='bounded',options={'xatol':0.5})
        return res.x,res.fun
    return ms,eom,frame,lstate,prop,perigee
def solve2(fun,grid1,grid2,scale):
    best=None
    for a in grid1:
        for b in grid2:
            try: r=fun([a,b]); c=float(np.dot(r,r))
            except Exception: continue
            if best is None or c<best[0]: best=(c,a,b)
    res=least_squares(fun,[best[1],best[2]],x_scale=scale,xtol=1e-12,ftol=1e-12)
    return res.x,res.fun
def sample(sol,ta,tb,jref,dt=60):
    ts=np.arange(ta,tb,dt); ts=np.append(ts,tb); return [[jref+t/86400]+list(sol.sol(t)[:3]) for t in ts]
S=lambda j,jref:(j-jref)*86400
# ===== Apollo 11
jref=jd(1969,7,16,16,22,13); ms,eom,frame,lstate,prop,perigee=make(jref,jref-0.5,jref+9)
tTLI=0; tLOI=S(jd(1969,7,19,17,24,0),jref); tTEI=S(jd(1969,7,22,4,57,0),jref); tEI=S(jd(1969,7,24,16,35,5),jref)
def out11(x):
    sol=prop(lstate(tLOI,x[0],x[1],111),tLOI,tTLI-6*3600); tp,rp=perigee(sol,tTLI-6*3600,tTLI+20*3600)
    return [(rp-6563)/1000,(tp-tTLI)/3600]
x,f=solve2(out11,np.radians(np.arange(-40,41,8)),np.arange(2.35,2.62,0.03),[0.1,0.02]); print('A11 out',np.degrees(x[0]),x[1],f)
solO=prop(lstate(tLOI,x[0],x[1],111),tLOI,tTLI-600); phiL=x[0]
vc=math.sqrt(GMn/(RM+111))
def ret11(x):
    sol=prop(lstate(tTEI,x[0],x[1],111),tTEI,tEI+8*3600); tp,rp=perigee(sol,tEI-10*3600,tEI+8*3600)
    return [(rp-6420)/1000,(tp-(tEI+90))/3600]
x,f=solve2(ret11,np.radians(np.arange(-60,61,10)),np.arange(2.35,2.70,0.03),[0.1,0.02]); print('A11 ret',np.degrees(x[0]),x[1],f)
solR=prop(lstate(tTEI,x[0],x[1],111),tTEI,tEI+300); phiT=x[0]
# lunar orbit: inertial angle
rm,vm,e,h=frame(tLOI); e1=e.copy(); e2=np.cross(h,e)
def inert_ang(t,phi):
    rm_,vm_,e_,h_=frame(t); p=math.cos(phi)*e_+math.sin(phi)*np.cross(h_,e_); return math.atan2(np.dot(p,e2),np.dot(p,e1))
a0=inert_ang(tLOI,phiL); a1=inert_ang(tTEI,phiT); P=2*math.pi*math.sqrt((RM+111)**3/GMn)
nrev=round(((tTEI-tLOI)/P*2*math.pi-((a0-a1)%(2*math.pi)))/(2*math.pi)); total=(a0-a1)%(2*math.pi)+2*math.pi*nrev; print('A11 lunar revs',total/2/math.pi,'period h',(tTEI-tLOI)/(total/2/math.pi)/3600)
def lorb(t): ang=a0-total*(t-tLOI)/(tTEI-tLOI); return ms(t)+(RM+111)*(math.cos(ang)*e1+math.sin(ang)*e2)
rows=sample(solO,tTLI,tLOI,jref)+[[jref+t/86400]+list(lorb(t)) for t in np.arange(tLOI+60,tTEI,60)]+sample(solR,tTEI,tEI,jref)
m=pack_em(rows,ms,jref); print('A11 packed',len(m['t']),'final alt',round(norm(rows[-1][1:4])-RE))
ta,tb=tLOI-4*3600,tLOI+6.5*3600; cl=[r for r in rows if ta<=S(r[0],jref)<=tb]
pm=[[float(v) for v in (np.array(r[1:4])-ms(S(r[0],jref)))] for r in cl]; ica=min(range(len(cl)),key=lambda k:abs(S(cl[k][0],jref)-tLOI))
tl=S(jd(1969,7,20,20,17,40),jref); rm_,vm_,e_,h_=frame(tl); lam=math.radians(23.47); tb_=(math.cos(lam)*(-e_)+math.sin(lam)*np.cross(h_,-e_))*RM
m['close'].append({'body':'Moon','kind':'orbit','jd0':cl[0][0],'step':1,'ca':ica,'label':'Lunar orbit insertion','alt':111,'sun':m['sun'],'p':[round(v) for p in pm for v in p],'marks':[{'name':'Tranquility Base','pos':[round(float(v)) for v in tb_]}]})
m['events']={'landing':jd(1969,7,20,20,17,40)-m['t0'],'tei':tTEI/86400+jref-m['t0'],'loi':tLOI/86400+jref-m['t0']}
M['apollo11']=m
# ===== Apollo 13
jref=jd(1970,4,11,21,54,47); ms,eom,frame,lstate,prop,perigee=make(jref,jref-0.5,jref+7)
tPC=S(jd(1970,4,15,0,21,35),jref); tB=S(jd(1970,4,15,2,40,39),jref); tEI=S(jd(1970,4,17,17,53,45),jref); tX=S(jd(1970,4,14,3,7,53),jref)
def out13(x):
    sol=prop(lstate(tPC,x[0],x[1],254.3),tPC,-6*3600); tp,rp=perigee(sol,-6*3600,20*3600)
    return [(rp-6563)/1000,(tp-0)/3600]
x,f=solve2(out13,np.radians(np.arange(-40,41,8)),np.arange(2.25,2.55,0.03),[0.1,0.02]); print('A13 out',np.degrees(x[0]),x[1],f)
yPC=lstate(tPC,x[0],x[1],254.3); solO=prop(yPC,tPC,-600); solP=prop(yPC,tPC,tB); yB=solP.sol(tB)
def ret13(x):
    v=yB[3:]-ms(tB,1); vh=v/np.linalg.norm(v); rm,vm,e,h=frame(tB); nh=np.cross(h,vh)
    y=yB.copy(); y[3:]+=x[0]*vh+x[1]*nh
    sol=prop(y,tB,tEI+8*3600); tp,rp=perigee(sol,tEI-12*3600,tEI+8*3600)
    return [(rp-6420)/1000,(tp-(tEI+90))/3600]
x,f=solve2(ret13,np.arange(-0.6,0.61,0.1),np.arange(-0.6,0.61,0.1),[0.05,0.05]); print('A13 PC+2 dv km/s',x,f)
v=yB[3:]-ms(tB,1); vh=v/np.linalg.norm(v); rm,vm,e,h=frame(tB); y=yB.copy(); y[3:]+=x[0]*vh+x[1]*np.cross(h,vh)
solR=prop(y,tB,tEI+300)
rows=sample(solO,0,tPC,jref)+sample(solP,tPC+60,tB,jref)+sample(solR,tB+60,tEI,jref)
dd=[norm(r[1:4]) for r in rows]; print('A13 max dist from Earth',round(max(dd)),'at explosion',round(norm(solO.sol(tX)[:3])))
m=pack_em(rows,ms,jref); print('A13 packed',len(m['t']),'final alt',round(norm(rows[-1][1:4])-RE))
ta,tb=tPC-5*3600,tPC+5*3600; cl=[r for r in rows if ta<=S(r[0],jref)<=tb]
pm=[[float(v) for v in (np.array(r[1:4])-ms(S(r[0],jref)))] for r in cl]; ica=min(range(len(pm)),key=lambda k:norm(pm[k]))
ib=min(range(len(cl)),key=lambda k:abs(S(cl[k][0],jref)-tB))
m['close'].append({'body':'Moon','kind':'fly','jd0':cl[0][0],'step':1,'ca':ica,'alt':round(norm(pm[ica])-RM),'sun':m['sun'],'p':[round(v) for p in pm for v in p],'marks':[{'name':'Engine burn for home','pos':[round(v) for v in pm[ib]]}]})
m['events']={'explosion':tX/86400+jref-m['t0']}; m['maxdist']=round(max(dd)); M['apollo13']=m
json.dump(M,open('m_part2.json','w'))
