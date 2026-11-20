/* ISS pass engine: SGP4 via satellite.js, low-precision Sun, conical shadow, McCants magnitude. */
var PassEngine = (function () {
  var DEG = Math.PI / 180, RAD = 180 / Math.PI;
  var RE = 6378.137, RSUN = 696000, AU = 149597870.7;
  // ISS brightness: m = M90 + 5 log10(range/1000 km) + K * (phase - 90 deg).
  // Linear phase law fitted to published ISS predictions (residuals ~0.1 mag).
  var M90 = -1.74, KPHASE = 0.0132;

  function jd(date) { return date.getTime() / 86400000 + 2440587.5; }

  // Sun position in ECI (equatorial of date), km
  function sunEci(date) {
    var n = jd(date) - 2451545.0;
    var L = (280.460 + 0.9856474 * n) * DEG;
    var g = (357.528 + 0.9856003 * n) * DEG;
    var lam = L + (1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * DEG;
    var eps = (23.439 - 0.0000004 * n) * DEG;
    var R = (1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g)) * AU;
    return { x: R * Math.cos(lam), y: R * Math.cos(eps) * Math.sin(lam), z: R * Math.sin(eps) * Math.sin(lam) };
  }
  function eciToEcf(v, gmst) {
    var c = Math.cos(gmst), s = Math.sin(gmst);
    return { x: v.x * c + v.y * s, y: -v.x * s + v.y * c, z: v.z };
  }
  function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
  function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function ang(a, b) { var c = dot(a, b) / (len(a) * len(b)); return Math.acos(Math.max(-1, Math.min(1, c))); }

  // Fraction of the solar disc visible from the satellite (0 = umbra, 1 = full sun)
  function sunlitFraction(rSat, rSun) {
    var d = sub(rSun, rSat);
    var rhoE = Math.asin(Math.min(1, RE / len(rSat)));
    var rhoS = Math.asin(RSUN / len(d));
    var theta = ang({ x: -rSat.x, y: -rSat.y, z: -rSat.z }, d);
    if (theta >= rhoE + rhoS) return 1;
    if (theta <= rhoE - rhoS) return 0;
    return (theta - (rhoE - rhoS)) / (2 * rhoS);
  }

  function airmass(elDeg) {
    var h = Math.max(elDeg, 0.5) * DEG;
    return 1 / (Math.sin(h) + 0.025 * Math.exp(-11 * Math.sin(h)));
  }

  function makeObserver(lat, lon, altM) {
    var gd = { latitude: lat * DEG, longitude: lon * DEG, height: (altM || 0) / 1000 };
    return { gd: gd, ecf: satellite.geodeticToEcf(gd) };
  }

  function parseTle(text) {
    var lines = String(text).split(/\r?\n/).map(function (l) { return l.replace(/\s+$/, ''); });
    var l1 = null, l2 = null, name = 'ISS (ZARYA)';
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].replace(/^\s+/, '');
      if (/^1 \d{5}/.test(l) && l.length >= 69 && !l1) { l1 = l.slice(0, 69); if (i > 0 && lines[i - 1].trim() && !/^[12] /.test(lines[i - 1].trim())) name = lines[i - 1].trim().replace(/^0 /, ''); }
      else if (/^2 \d{5}/.test(l) && l.length >= 69 && l1 && !l2) l2 = l.slice(0, 69);
    }
    if (!l1 || !l2) throw new Error('Could not find both TLE lines (they start with "1 " and "2 ").');
    var rec = satellite.twoline2satrec(l1, l2);
    if (rec.error) throw new Error('TLE could not be read (SGP4 error ' + rec.error + ').');
    var epoch = new Date((rec.jdsatepoch - 2440587.5) * 86400000);
    return { name: name, line1: l1, line2: l2, satrec: rec, epoch: epoch, norad: parseInt(l1.slice(2, 7), 10) };
  }

  // State of the satellite and Sun for one instant
  function sample(satrec, obs, date, opts) {
    var pv = satellite.propagate(satrec, date);
    if (!pv || !pv.position) return null;
    var gmst = satellite.gstime(date);
    var satEcf = satellite.eciToEcf(pv.position, gmst);
    var look = satellite.ecfToLookAngles(obs.gd, satEcf);
    var el = look.elevation * RAD;
    var res = { t: date.getTime(), el: el, az: (look.azimuth * RAD + 360) % 360, range: look.rangeSat };
    if (opts && opts.full) {
      var sEcf = eciToEcf(sunEci(date), gmst);
      var sunLook = satellite.ecfToLookAngles(obs.gd, sEcf);
      res.sunEl = sunLook.elevation * RAD;
      res.lit = sunlitFraction(satEcf, sEcf);
      // phase angle at the satellite between Sun and observer
      var toSun = sub(sEcf, satEcf), toObs = sub(obs.ecf, satEcf);
      var phi = ang(toSun, toObs);
      if (res.lit > 0.02) {
        var m = M90 + 5 * Math.log10(res.range / 1000) + KPHASE * (phi * RAD - 90) - 2.5 * Math.log10(res.lit);
        if (opts.extinction) m += 0.2 * airmass(el);
        res.mag = m;
      } else res.mag = null;
      res.phase = phi * RAD;
      if (opts.vectors) { res.sat = satEcf; res.sun = sEcf; res.obs = obs.ecf; }
    }
    return res;
  }

  // Earth-fixed position of the satellite in km, or null
  function ecfAt(satrec, date) {
    var pv = satellite.propagate(satrec, date);
    if (!pv || !pv.position) return null;
    return satellite.eciToEcf(pv.position, satellite.gstime(date));
  }

  function subpoint(satrec, date) {
    var pv = satellite.propagate(satrec, date);
    if (!pv || !pv.position) return null;
    var g = satellite.eciToGeodetic(pv.position, satellite.gstime(date));
    return { lat: g.latitude * RAD, lon: satellite.degreesLong(g.longitude), h: g.height };
  }

  /* settings: lat, lon, alt, days, minEl (deg), minSecs, sunLimit (deg), requireLit (bool),
     cutoff (deg, horizon cut-off for appear/disappear), extinction (bool), maxMag (number|null) */
  function predict(tle, s, from) {
    var obs = makeObserver(s.lat, s.lon, s.alt);
    var start = from ? from.getTime() : Date.now();
    start -= 15 * 60000; // catch a pass already in progress
    var end = start + s.days * 86400000;
    var step = 30000, passes = [], prev = null;
    for (var t = start; t <= end; t += step) {
      var cur = sample(tle.satrec, obs, new Date(t));
      if (!cur) continue;
      if (prev && prev.el < 0 && cur.el >= 0) {
        var p = tracePass(tle.satrec, obs, t - step, s);
        if (p) { passes.push(p); t = Math.max(t, p.los + step); }
      } else if (!prev && cur.el >= 0) {
        // started mid-pass: rewind to its rise
        var tr = t; while (tr > start - 20 * 60000) { tr -= 10000; var q = sample(tle.satrec, obs, new Date(tr)); if (!q || q.el < 0) break; }
        var p2 = tracePass(tle.satrec, obs, tr, s);
        if (p2) { passes.push(p2); t = Math.max(t, p2.los + step); }
      }
      prev = sample(tle.satrec, obs, new Date(t));
    }
    passes.forEach(function (p) { p.meets = qualifies(p, s); });
    return passes;
  }

  function tracePass(satrec, obs, t0, s) {
    var pts = [], t = t0, guard = 0, started = false;
    var opts = { full: true, extinction: s.extinction };
    while (guard++ < 1500) {
      var q = sample(satrec, obs, new Date(t), opts);
      if (!q) break;
      if (q.el >= 0) { started = true; pts.push(q); }
      else if (started) break;
      t += 2000;
    }
    if (pts.length < 2) return null;
    pts.forEach(function (q) { q.vis = (s.requireLit ? q.lit > 0.5 : true) && q.sunEl <= s.sunLimit; });
    var p = { aos: pts[0].t, los: pts[pts.length - 1].t, pts: pts };
    var top = pts.reduce(function (a, b) { return b.el > a.el ? b : a; });
    p.culm = top;
    var vis = pts.filter(function (q) { return q.vis && q.el >= s.cutoff; });
    p.visible = vis.length > 0;
    if (p.visible) {
      p.appear = vis[0]; p.disappear = vis[vis.length - 1];
      p.high = vis.reduce(function (a, b) { return b.el > a.el ? b : a; });
      var mags = vis.filter(function (q) { return q.mag != null; });
      p.peak = mags.length ? mags.reduce(function (a, b) { return b.mag < a.mag ? b : a; }) : null;
      p.visSecs = (p.disappear.t - p.appear.t) / 1000;
      p.aboveSecs = vis.filter(function (q) { return q.el >= s.minEl; }).length * 2;
      p.shadowEntry = p.disappear.lit <= 0.5 && p.disappear.t < p.los - 4000;
      p.shadowExit = p.appear.lit > 0.5 && pts.some(function (q) { return q.t < p.appear.t && q.lit <= 0.5 && q.el >= s.cutoff; });
    }
    return p;
  }

  function qualifies(p, s) {
    if (!p.visible) return false;
    if (p.aboveSecs < s.minSecs) return false;
    if (p.high.el < s.minEl) return false;
    if (s.maxMag != null && p.peak && p.peak.mag > s.maxMag) return false;
    return true;
  }

  return { parseTle: parseTle, predict: predict, sample: sample, subpoint: subpoint, ecfAt: ecfAt, makeObserver: makeObserver };
})();
if (typeof module !== 'undefined') module.exports = PassEngine;
