import subprocess, json, math, hashlib, os
def hz(cmd, center, start, stop, step, units='AU-D', vel=False):
    key=hashlib.md5(repr((cmd,center,start,stop,step,units,vel)).encode()).hexdigest()
    fn=f'cache_{key}.json'
    if os.path.exists(fn): return json.load(open(fn))
    args=["curl","-s","-m","180","-G","https://ssd.jpl.nasa.gov/api/horizons.api"]
    for k,v in dict(format='text',COMMAND=f"'{cmd}'",OBJ_DATA="'NO'",MAKE_EPHEM="'YES'",EPHEM_TYPE="'VECTORS'",CENTER=f"'{center}'",START_TIME=f"'{start}'",STOP_TIME=f"'{stop}'",STEP_SIZE=f"'{step}'",VEC_TABLE="'2'" if vel else "'1'",REF_PLANE="'ECLIPTIC'",OUT_UNITS=f"'{units}'",CSV_FORMAT="'YES'").items():
        args+=["--data-urlencode",f"{k}={v}"]
    import time
    for attempt in range(5):
        t=subprocess.run(args,capture_output=True,text=True).stdout
        if '$$SOE' in t or 'No ephemeris' in t: break
        time.sleep(4)
    if '$$SOE' not in t: raise RuntimeError(cmd+' '+t[-600:])
    rows=[]
    for line in t.split('$$SOE')[1].split('$$EOE')[0].strip().split('\n'):
        p=line.split(','); rows.append([float(p[0])]+[float(x) for x in p[2:(8 if vel else 5)]])
    json.dump(rows,open(fn,'w')); return rows
