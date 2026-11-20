import subprocess, json, re, sys, datetime as dt
def hz(cmd, center, start, stop, step, units='AU-D'):
    args=["curl","-s","-m","120","-G","https://ssd.jpl.nasa.gov/api/horizons.api"]
    for k,v in dict(format='text',COMMAND=f"'{cmd}'",OBJ_DATA="'NO'",MAKE_EPHEM="'YES'",EPHEM_TYPE="'VECTORS'",CENTER=f"'{center}'",START_TIME=f"'{start}'",STOP_TIME=f"'{stop}'",STEP_SIZE=f"'{step}'",VEC_TABLE="'1'",REF_PLANE="'ECLIPTIC'",OUT_UNITS=f"'{units}'",CSV_FORMAT="'YES'").items():
        args+=["--data-urlencode",f"{k}={v}"]
    t=subprocess.run(args,capture_output=True,text=True).stdout
    if '$$SOE' not in t: print(t[-800:]); raise SystemExit(cmd)
    rows=[]
    for line in t.split('$$SOE')[1].split('$$EOE')[0].strip().split('\n'):
        p=line.split(','); rows.append((float(p[0]),float(p[2]),float(p[3]),float(p[4])))
    return rows
out={}
S,E='2018-10-21','2026-11-21'
for name,c in [('sc','-121'),('mercury','199'),('venus','299'),('earth','399')]:
    r=hz(c,'500@10',S,E,'1 d'); print(name,len(r),r[0][0],r[-1][0])
    out[name]=[round(v,4) for row in r for v in row[1:]]
out['jd0']=2458412.5
fly=[('Earth','399','2020-04-10 04:25'),('Venus','299','2020-10-15 03:58'),('Venus','299','2021-08-10 13:51'),('Mercury','199','2021-10-01 23:34'),('Mercury','199','2022-06-23 09:44'),('Mercury','199','2023-06-19 19:34'),('Mercury','199','2024-09-04 21:48'),('Mercury','199','2024-12-01 14:23'),('Mercury','199','2025-01-08 05:59')]
out['fly']=[]
R={'Earth':6371,'Venus':6052,'Mercury':2439.7}
for body,c,t in fly:
    t0=dt.datetime.strptime(t,'%Y-%m-%d %H:%M')
    a=(t0-dt.timedelta(hours=3)).strftime('%Y-%m-%d %H:%M'); b=(t0+dt.timedelta(hours=3)).strftime('%Y-%m-%d %H:%M')
    r=hz('-121','500@'+c,a,b,'1 m','KM-S')
    i=min(range(len(r)),key=lambda k:r[k][1]**2+r[k][2]**2+r[k][3]**2)
    d=(r[i][1]**2+r[i][2]**2+r[i][3]**2)**.5
    print(body,t,len(r),'CA idx',i,'alt',round(d-R[body]),'jd',r[i][0])
    out['fly'].append({'body':body,'jd0':r[0][0],'ca':i,'alt':round(d-R[body]),'p':[round(v) for row in r for v in row[1:]]})
# arrival
try:
    r=hz('-121','500@199','2026-11-20 00:00','2026-11-28 00:00','10 m','KM-S')
    ds=[(x*x+y*y+z*z)**.5 for _,x,y,z in r]
    print('arrival',len(r),'min',round(min(ds)),'max',round(max(ds)),'last',round(ds[-1]), 'CA idx',ds.index(min(ds)), r[ds.index(min(ds))][0])
    out['arr']={'jd0':r[0][0],'p':[round(v) for row in r for v in row[1:]]}
    json.dump(ds[::36],open('arrd.json','w'))
except SystemExit as e: print('arrival fail',e)
json.dump(out,open('bepi_traj.json','w'),separators=(',',':'))
import os; print(os.path.getsize('bepi_traj.json'))
