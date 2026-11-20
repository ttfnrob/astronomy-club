(function(){
"use strict";
var SNAPSHOT = "ISS (ZARYA)\n1 25544U 98067A   26323.84989825  .00011830  00000+0  21862-3 0  9993\n2 25544  51.6318 249.7702 0007428  44.2199 315.9382 15.49496274595884";
/* ===================== CONFIGURATION =====================
   Edit these to suit your site. See README.md for details. */
var CONFIG = {
  // Tried in order until one returns a TLE for NORAD 25544.
  // Put a same-site copy first (e.g. "data/iss.tle" kept fresh by tools/update-tle.sh)
  // to spare CelesTrak and keep working if it is unreachable.
  tleSources: [
    "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE"
  ],
  // A visitor's browser re-downloads the TLE at most this often (CelesTrak updates ISS data a few times a day).
  refetchAfterHours: 2,
  // Default location and filters. Any of these can also be set by URL parameters (see README).
  defaults: {name:"Milton Keynes", lat:52.0406, lon:-0.7594, alt:90, minEl:20, minSecs:60, sunLimit:-6, requireLit:true,
             maxMag:null, days:10, cutoff:10, extinction:false, tz:"Europe/London", showAll:false}
};
/* ========================================================== */
var CELESTRAK = "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE";
var DEFAULTS = urlDefaults(CONFIG.defaults);
function urlDefaults(base){
  var d = Object.assign({}, base), q;
  try{ q = new URLSearchParams(location.search); }catch(e){ return d; }
  function num(k, key, lo, hi){ var v = q.get(k); if (v !== null && v !== "" && !isNaN(+v)) d[key] = Math.min(hi, Math.max(lo, +v)); }
  function bool(k, key){ var v = q.get(k); if (v !== null) d[key] = !/^(0|false|no|off)$/i.test(v); }
  if (q.get("name")) d.name = q.get("name").slice(0, 40);
  num("lat","lat",-90,90); num("lon","lon",-180,180); num("alt","alt",-100,6000);
  num("minEl","minEl",0,85); num("minSecs","minSecs",0,600); num("sun","sunLimit",-18,90);
  num("days","days",1,20); num("cutoff","cutoff",0,30);
  if (q.get("mag") !== null) d.maxMag = q.get("mag") === "" || isNaN(+q.get("mag")) ? null : +q.get("mag");
  bool("lit","requireLit"); bool("haze","extinction"); bool("all","showAll");
  var tz = q.get("tz"); if (tz === "UTC" || tz === "device" || tz === "Europe/London") d.tz = tz;
  return d;
}
var SKEY = "iss-passes-settings-v1", TKEY = "iss-passes-tle-v1", RKEY = "iss-passes-tle-attempt-v1";
var DIRS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
var DIRNAMES = {N:"north",NNE:"north-northeast",NE:"northeast",ENE:"east-northeast",E:"east",ESE:"east-southeast",SE:"southeast",SSE:"south-southeast",S:"south",SSW:"south-southwest",SW:"southwest",WSW:"west-southwest",W:"west",WNW:"west-northwest",NW:"northwest",NNW:"north-northwest"};

var S = load(SKEY) || {};
S = Object.assign({}, DEFAULTS, S);
var tle = null, tleSource = "", passes = [], selected = null, timer = null, lastCompute = 0;

function load(k){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }catch(e){ return null; } }
function save(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]; }); }
function dir(az){ return DIRS[Math.round(az/22.5)%16]; }
function minus(n, dp){ var s = Math.abs(n).toFixed(dp==null?1:dp); return (n < 0 && parseFloat(s) !== 0 ? "\u2212" : "") + s; }

/* ---------- time formatting ---------- */
function tzOpt(){ return S.tz === "device" ? undefined : S.tz; }
function fmt(t, o){ o = Object.assign({}, o); if (tzOpt()) o.timeZone = tzOpt(); return new Intl.DateTimeFormat("en-GB", o).format(new Date(t)); }
function hm(t){ return fmt(t,{hour:"2-digit",minute:"2-digit",hour12:false}); }
function hms(t){ return fmt(t,{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}); }
function day(t){ return fmt(t,{weekday:"short",day:"numeric",month:"short"}); }
function longDay(t){ return fmt(t,{weekday:"long",day:"numeric",month:"long"}); }
function dayKey(t){ return fmt(t,{year:"numeric",month:"2-digit",day:"2-digit"}); }
function tzName(){ return S.tz === "UTC" ? "UTC" : S.tz === "device" ? "your device’s time" : "UK time"; }
function relDay(t){
  var k = dayKey(t), now = Date.now(), am = +fmt(t,{hour:"2-digit",hour12:false}) < 12;
  if (k === dayKey(now)) return am ? "This morning" : "Tonight";
  if (k === dayKey(now + 86400000)) return am ? "Tomorrow morning" : "Tomorrow evening";
  return longDay(t);
}
function dur(sec){ sec = Math.round(sec); var m = Math.floor(sec/60), s = sec%60; return m ? (m + " min" + (s ? " " + s + " s" : "")) : (s + " s"); }
function countdown(ms){
  var s = Math.round(ms/1000); if (s < 60) return "in " + s + " s";
  var m = Math.round(s/60); if (m < 60) return "in " + m + " min";
  var h = Math.floor(m/60), mm = m%60; if (h < 24) return "in " + h + " h " + mm + " min";
  var d = Math.floor(h/24), hh = h%24; return "in " + d + (d===1?" day ":" days ") + hh + " h";
}
function ago(ms){ var h = ms/3600000; if (h < 1) return Math.max(1,Math.round(ms/60000)) + " min old"; if (h < 48) return Math.round(h) + " hours old"; return Math.round(h/24) + " days old"; }

/* ---------- brightness wording ---------- */
function brightWord(m){
  if (m == null) return "Not lit";
  if (m <= -3.5) return "Dazzling";
  if (m <= -2.5) return "Very bright";
  if (m <= -1.5) return "Bright";
  if (m <= 0) return "Easy to see";
  if (m <= 2) return "Fairly faint";
  return "Faint";
}
function brightCompare(m){
  if (m == null) return "";
  if (m <= -3.9) return "As bright as Venus, far brighter than any star.";
  if (m <= -2.5) return "Brighter than Jupiter and any star.";
  if (m <= -1.5) return "Brighter than Sirius, the brightest star.";
  if (m <= 0.5) return "Similar to the brightest stars.";
  return "Look for a steady moving star; harder to pick out in town.";
}

/* ---------- sky dome SVG ---------- */
function xy(az, el, R, c){ var r = R*(90-Math.max(el,0))/90, a = az*Math.PI/180; return [c - r*Math.sin(a), c - r*Math.cos(a)]; }
function pathFrom(pts){ return pts.map(function(p,i){ return (i?"L":"M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(""); }
function glyph(kind, x, y, s){
  s = s || 6;
  if (kind === "appear") return '<circle class="mk-open" cx="'+x+'" cy="'+y+'" r="'+s+'"/>';
  if (kind === "high") return '<circle class="mk-fill" cx="'+x+'" cy="'+y+'" r="'+s+'"/>';
  return '<path class="mk-x" d="M'+(x-s)+' '+(y-s)+'L'+(x+s)+' '+(y+s)+'M'+(x+s)+' '+(y-s)+'L'+(x-s)+' '+(y+s)+'"/>';
}
function iconSvg(kind){ return '<svg viewBox="0 0 16 16" aria-hidden="true">' + glyph(kind, 8, 8, 5.2) + '</svg>'; }

function domeSvg(p, big, nowPt){
  var size = big ? 400 : 60, c = size/2, R = big ? 168 : 27, out = [];
  out.push('<svg viewBox="0 0 '+size+' '+size+'" role="img" aria-label="Sky track: '+esc(trackText(p))+'">');
  out.push('<circle class="sky-bg" cx="'+c+'" cy="'+c+'" r="'+R+'"/>');
  if (big){
    [30,60].forEach(function(e){ out.push('<circle class="sky-ring" cx="'+c+'" cy="'+c+'" r="'+(R*(90-e)/90)+'"/>'); });
    out.push('<path class="sky-ring" d="M'+(c-R)+' '+c+'H'+(c+R)+'M'+c+' '+(c-R)+'V'+(c+R)+'"/>');
    if (S.minEl > 0 && S.minEl < 90) out.push('<circle class="sky-min" cx="'+c+'" cy="'+c+'" r="'+(R*(90-S.minEl)/90)+'"/>');
    out.push('<text class="sky-lab" x="'+(c+4)+'" y="'+(c-R*60/90+12)+'">30°</text><text class="sky-lab" x="'+(c+4)+'" y="'+(c-R*30/90+12)+'">60°</text>');
    var cd = R + 16;
    out.push('<text class="sky-card" x="'+c+'" y="'+(c-cd+4)+'" text-anchor="middle">N</text>');
    out.push('<text class="sky-card" x="'+c+'" y="'+(c+cd+5)+'" text-anchor="middle">S</text>');
    out.push('<text class="sky-card" x="'+(c-cd)+'" y="'+(c+5)+'" text-anchor="middle">E</text>');
    out.push('<text class="sky-card" x="'+(c+cd)+'" y="'+(c+5)+'" text-anchor="middle">W</text>');
  } else if (S.minEl > 0 && S.minEl < 90){
    out.push('<circle class="sky-ring" cx="'+c+'" cy="'+c+'" r="'+(R*(90-S.minEl)/90)+'"/>');
  }
  // split track into seen / unseen runs, sampling every 10 s
  var runs = [], cur = null, step = big ? 3 : 5;
  for (var i = 0; i < p.pts.length; i++){
    if (i % step && i !== p.pts.length-1) continue;
    var q = p.pts[i], v = q.vis && q.el >= S.cutoff;
    if (!cur || cur.v !== v){ var last = cur && cur.pts[cur.pts.length-1]; cur = {v:v, pts: last ? [last] : []}; runs.push(cur); }
    cur.pts.push(xy(q.az, q.el, R, c));
  }
  runs.filter(function(r){return !r.v;}).forEach(function(r){ out.push('<path class="trk-dark" d="'+pathFrom(r.pts)+'"'+(big?'':' style="stroke-width:1.2;stroke-dasharray:1 3"')+'/>'); });
  runs.filter(function(r){return r.v;}).forEach(function(r){ out.push('<path class="trk-vis" d="'+pathFrom(r.pts)+'"'+(big?'':' style="stroke-width:2.6"')+'/>'); });
  if (p.visible){
    if (big){
      // minute ticks along the visible run; skip labels that would collide
      var placed = [p.appear, p.disappear, p.high].map(function(q){ return xy(q.az,q.el,R,c); });
      var first = Math.ceil(p.appear.t/60000)*60000;
      for (var t = first; t < p.disappear.t; t += 60000){
        var idx = Math.round((t - p.pts[0].t)/2000), q2 = p.pts[idx];
        if (!q2 || Math.abs(t - p.appear.t) < 25000 || Math.abs(t - p.disappear.t) < 25000) continue;
        var pt = xy(q2.az, q2.el, R, c);
        out.push('<circle class="tick" cx="'+pt[0].toFixed(1)+'" cy="'+pt[1].toFixed(1)+'" r="2.4"/>');
        var dx = pt[0] - c, dy = pt[1] - c, dl = Math.hypot(dx,dy) || 1, off = 14;
        var lx = pt[0]+dx/dl*off, ly = pt[1]+dy/dl*off;
        if (placed.some(function(o){ return Math.abs(o[0]-lx) < 26 && Math.abs(o[1]-ly) < 13; })) continue;
        placed.push([lx, ly]);
        out.push('<text class="tick-lab" x="'+(pt[0]+dx/dl*off).toFixed(1)+'" y="'+(pt[1]+dy/dl*off+3.5).toFixed(1)+'" text-anchor="middle">'+hm(t)+'</text>');
      }
    }
    var gs = big ? 6.5 : 3.2, a = xy(p.appear.az,p.appear.el,R,c), h = xy(p.high.az,p.high.el,R,c), d = xy(p.disappear.az,p.disappear.el,R,c);
    out.push(glyph("dis", d[0], d[1], big ? 6 : 3));
    if (p.high.t !== p.disappear.t) out.push(glyph("high", h[0], h[1], gs));
    out.push(glyph("appear", a[0], a[1], gs));
  }
  if (nowPt && nowPt.el >= 0){
    var np = xy(nowPt.az, nowPt.el, R, c), lr = big ? 7 : 3.5;
    out.push('<circle class="live-halo" cx="'+np[0]+'" cy="'+np[1]+'" r="'+lr+'"/><circle class="live" cx="'+np[0]+'" cy="'+np[1]+'" r="'+lr+'"/>');
  }
  out.push('</svg>');
  return out.join("");
}
function trackText(p){
  if (!p.visible) return "not visible";
  return "appears " + dir(p.appear.az) + ", highest " + Math.round(p.high.el) + " degrees " + dir(p.high.az) + ", disappears " + dir(p.disappear.az);
}

/* ---------- compute ---------- */
function settingsForEngine(){
  return {lat:+S.lat, lon:+S.lon, alt:+S.alt||0, days:Math.min(20,Math.max(1,+S.days||10)), minEl:+S.minEl||0, minSecs:+S.minSecs||0,
          sunLimit:+S.sunLimit, requireLit:!!S.requireLit, cutoff:Math.max(0,+S.cutoff||0), extinction:!!S.extinction,
          maxMag: (S.maxMag === null || S.maxMag === "" || isNaN(+S.maxMag)) ? null : +S.maxMag};
}
function compute(){
  if (!tle) return;
  var es = settingsForEngine();
  passes = PassEngine.predict(tle, es, new Date()).filter(function(p){ return p.visible; });
  lastCompute = Date.now();
  var now = Date.now();
  if (!selected || !passes.some(function(p){ return p.aos === selected; })) selected = null;
  if (selected === null){
    var nxt = passes.find(function(p){ return p.meets && p.disappear.t > now; });
    selected = nxt ? nxt.aos : null;
  }
  render();
}

/* ---------- render ---------- */
function render(){
  $("placeName").textContent = S.name || "your location";
  $("tzLabel").textContent = "(times in " + tzName() + ")";
  document.title = "ISS passes over " + (S.name || "your location");
  renderHero(); renderList(); renderFilterSummary();
}
function nowPoint(p){
  var t = Date.now(); if (!p || t < p.aos || t > p.los) return null;
  return PassEngine.sample(tle.satrec, PassEngine.makeObserver(+S.lat,+S.lon,+S.alt||0), new Date(t));
}
function renderHero(){
  var hero = $("hero"), p = passes.find(function(x){ return x.aos === selected; });
  if (!p){
    var any = passes.length;
    hero.innerHTML = '<div class="empty"><h2>No passes match in the next ' + settingsForEngine().days + ' days</h2><p>' +
      (any ? "There are " + any + " visible passes, but none rise above " + S.minEl + "° for " + dur(S.minSecs) + " with your current filters. Lowering the elevation or brightness limit will bring some back." :
             "The ISS isn’t visible from here at night in this period. This happens for a few weeks at a time as its orbit and the seasons shift; try more days ahead.") +
      '</p>' + (any ? '<button type="button" class="btn primary" id="showMissBtn">Show all visible passes</button>' : '') + '</div>';
    var b = $("showMissBtn"); if (b) b.onclick = function(){ S.showAll = true; $("showAll").checked = true; save(SKEY,S); renderList(); };
    update3d(null);
    return;
  }
  update3d(p);
  var now = Date.now(), live = now >= p.aos && now <= p.los;
  var when = live ? '<span class="count">Passing now</span>' :
             (p.appear.t > now ? relDay(p.appear.t) + ', <span class="count">' + countdown(p.appear.t - now) + '</span>' : relDay(p.appear.t) + ', <span class="count">already passed</span>');
  var hiDiffers = p.high.t !== p.disappear.t;
  var disWord = p.shadowEntry ? "Fades into Earth’s shadow" : "Sinks below " + Math.round(settingsForEngine().cutoff) + "°";
  var steps = [
    ["appear", p.appear.t, (p.shadowExit ? "Comes out of shadow" : "Appears") + ' in the <b>' + DIRNAMES[dir(p.appear.az)] + '</b>, ' + Math.round(p.appear.el) + '° up'],
  ];
  if (hiDiffers) steps.push(["high", p.high.t, 'Highest at <b>' + Math.round(p.high.el) + '°</b> in the ' + DIRNAMES[dir(p.high.az)]]);
  steps.push(["dis", p.disappear.t, (hiDiffers ? disWord : disWord + " at its highest point") + ' in the <b>' + DIRNAMES[dir(p.disappear.az)] + '</b>' + (p.shadowEntry ? ', ' + Math.round(p.disappear.el) + '° up' : '')]);
  var t0 = hms(p.appear.t);
  hero.innerHTML =
    '<div class="dome-big">' + domeSvg(p, true, nowPoint(p)) + '<p class="dome-caption">Lie back with your head to the north</p></div>' +
    '<div class="info">' +
      '<p class="when">' + when + '</p>' +
      '<p class="bigtime" aria-label="Appears at ' + t0 + '">' + t0.slice(0,5) + '<span class="secs">:' + t0.slice(6) + '</span></p>' +
      '<ul class="story">' + steps.map(function(s){ return '<li>' + iconSvg(s[0]) + '<span class="t">' + hms(s[1]) + '</span><span class="d">' + s[2] + '</span></li>'; }).join("") + '</ul>' +
      '<div class="bright"><div class="mag">' + (p.peak ? minus(p.peak.mag) : "?") + '</div><div><div class="lab">' + brightWord(p.peak && p.peak.mag) + ', visible for ' + dur(p.visSecs) + '</div><div class="cmp">' + brightCompare(p.peak && p.peak.mag) + '</div></div></div>' +
    '</div>';
}
function missReason(p, es){
  if (p.high.el < es.minEl) return "Only reaches " + Math.round(p.high.el) + "°";
  if (p.aboveSecs < es.minSecs) return "Above " + es.minEl + "° for " + dur(p.aboveSecs);
  if (es.maxMag != null && p.peak && p.peak.mag > es.maxMag) return "Fainter than your limit";
  return "";
}
function renderList(){
  var es = settingsForEngine(), now = Date.now();
  var future = passes.filter(function(p){ return p.disappear.t > now - 60000; });
  var good = future.filter(function(p){ return p.meets; });
  var shown = S.showAll ? future : good;
  $("listSummary").textContent = good.length + " of " + future.length + " visible passes in the next " + es.days + " days meet your filters" + (S.showAll ? "; the rest are faded." : ".");
  var body = $("passBody");
  if (!shown.length){ body.innerHTML = '<tr><td colspan="7" style="padding:1.25rem .6rem;color:var(--muted)">Nothing to list with these filters.</td></tr>'; return; }
  var maxPip = 54;
  body.innerHTML = shown.map(function(p){
    var m = p.peak ? p.peak.mag : null, pip = m == null ? 0 : Math.max(6, Math.min(maxPip, (2 - m) / 6 * maxPip));
    var r = p.meets ? "" : missReason(p, es);
    var hiSame = p.high.t === p.disappear.t;
    return '<tr tabindex="0" data-id="' + p.aos + '" class="' + (p.meets ? "" : "miss") + '" aria-selected="' + (p.aos === selected) + '">' +
      '<td class="c-dome">' + domeSvg(p, false, null) + '</td>' +
      '<td class="c-date"><span class="date">' + day(p.appear.t) + '</span>' + (r ? '<span class="sub reason">' + r + '</span>' : '<span class="sub vis">' + dur(p.visSecs) + ' visible</span>') + '</td>' +
      '<td class="c-app" data-label="Appears">' + hm(p.appear.t) + ' <span class="sub">' + dir(p.appear.az) + ', ' + Math.round(p.appear.el) + '°</span></td>' +
      '<td class="c-high" data-label="Highest">' + hm(p.high.t) + ' <span class="sub"><span class="el">' + Math.round(p.high.el) + '°</span> ' + dir(p.high.az) + '</span></td>' +
      '<td class="c-dis" data-label="Disappears">' + hm(p.disappear.t) + ' <span class="sub">' + dir(p.disappear.az) + ', ' + Math.round(p.disappear.el) + '°' + (p.shadowEntry && !hiSame ? ', shadow' : '') + '</span></td>' +
      '<td class="c-dur">' + dur(p.visSecs) + '</td>' +
      '<td class="c-mag"><div class="magcell"><span class="m">' + (m == null ? "?" : minus(m)) + '</span><span class="pip" style="width:' + pip.toFixed(0) + 'px"></span></div><span class="sub">' + brightWord(m) + '</span></td>' +
    '</tr>';
  }).join("");
}
function renderFilterSummary(){
  var es = settingsForEngine(), sky = {"-0.833":"after sunset","-6":"after civil twilight","-12":"after nautical twilight","-18":"fully dark","90":"day or night"}[String(S.sunLimit)] || "";
  $("filterSummary").textContent = "Above " + es.minEl + "° for " + dur(es.minSecs) + ", " + sky + (es.requireLit ? ", sunlit" : "") + (es.maxMag != null ? ", magnitude " + minus(es.maxMag,0) + " or brighter" : "");
}

/* ---------- interaction ---------- */
$("passBody").addEventListener("click", function(e){ var tr = e.target.closest("tr[data-id]"); if (tr) pick(+tr.dataset.id); });
$("passBody").addEventListener("keydown", function(e){ if (e.key === "Enter" || e.key === " "){ var tr = e.target.closest("tr[data-id]"); if (tr){ e.preventDefault(); pick(+tr.dataset.id); } } });
function pick(id){
  selected = id; renderHero(); renderList();
  var h = $("hero"), r = h.getBoundingClientRect();
  if (r.top < 0 || r.top > window.innerHeight * .5) h.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start"});
}

var fields = ["minEl","minSecs","maxMag","sunLimit","cutoff","days","locName","lat","lon","alt","tz"];
var checks = ["requireLit","extinction","showAll"];
function fillForm(){
  fields.forEach(function(f){ var k = f === "locName" ? "name" : f; $(f).value = S[k] === null ? "" : S[k]; });
  checks.forEach(function(f){ $(f).checked = !!S[f]; });
}
var deb = null;
function readForm(){
  fields.forEach(function(f){ var k = f === "locName" ? "name" : f, v = $(f).value;
    if (k === "name" || k === "tz") S[k] = v;
    else if (k === "maxMag") S[k] = v === "" ? null : +v;
    else if (v !== "" && !isNaN(+v)) S[k] = +v; });
  checks.forEach(function(f){ S[f] = $(f).checked; });
  save(SKEY, S);
}
$("settingsForm").addEventListener("input", function(e){
  if (fields.indexOf(e.target.id) < 0 && checks.indexOf(e.target.id) < 0) return;
  readForm();
  if ((e.target.id === "lat" || e.target.id === "lon") && locMap) locMap.set(+S.lat, +S.lon);
  if (e.target.id === "showAll" || e.target.id === "tz" || e.target.id === "locName"){ render(); return; }
  clearTimeout(deb); deb = setTimeout(function(){ selected = null; compute(); }, 250);
});
$("settingsForm").addEventListener("change", function(e){ if (fields.indexOf(e.target.id) >= 0 || checks.indexOf(e.target.id) >= 0) readForm(); });
$("resetBtn").onclick = function(){ S = Object.assign({}, DEFAULTS); save(SKEY,S); fillForm(); selected = null; compute(); $("geoNote").textContent = ""; if (locMap) locMap.set(+S.lat, +S.lon, 11); };
$("geoBtn").onclick = function(){
  var note = $("geoNote");
  if (!navigator.geolocation){ note.textContent = "This browser can’t share its location. Type your latitude and longitude instead."; return; }
  note.textContent = "Finding you…";
  navigator.geolocation.getCurrentPosition(function(pos){
    S.lat = +pos.coords.latitude.toFixed(4); S.lon = +pos.coords.longitude.toFixed(4);
    if (pos.coords.altitude != null) S.alt = Math.round(pos.coords.altitude);
    S.name = "My location"; save(SKEY,S); fillForm(); selected = null; compute();
    if (locMap) locMap.set(S.lat, S.lon, 12);
    note.textContent = "Using " + S.lat + "°, " + S.lon + "°.";
  }, function(err){
    note.textContent = err && err.code === 1 ? "Location access was blocked. Type your latitude and longitude instead." : "Couldn’t get your location. Type your latitude and longitude instead.";
  }, {timeout:10000, maximumAge:600000});
};

/* ---------- orbit data ---------- */
function useTle(text, source, opts){
  var t = PassEngine.parseTle(text);
  if (t.norad !== 25544 && !(opts && opts.allowOther)) throw new Error("That TLE is for NORAD " + t.norad + ", not the ISS (25544).");
  if (tle && opts && opts.onlyIfNewer && t.epoch < tle.epoch){ renderTle(); return false; }
  tle = t; tleSource = source;
  if (opts && opts.provider) save(TKEY, {text: t.name + "\n" + t.line1 + "\n" + t.line2, provider: opts.provider, fetched: Date.now()});
  $("tleInput").value = t.name + "\n" + t.line1 + "\n" + t.line2;
  renderTle(); compute(); return true;
}
var tleMsg = "";
function renderTle(extra){
  if (extra !== undefined) tleMsg = extra;
  if (!tle){ $("tleStatus").textContent = "No orbit data yet."; return; }
  var age = Date.now() - tle.epoch.getTime();
  var html = "Predicting from <strong>" + esc(tleSource) + "</strong>. The element set’s epoch is " + esc(day(tle.epoch) + " at " + hm(tle.epoch)) + " (" + ago(age) + ").";
  if (age > 7 * 86400000) html += ' <span class="warn">That’s more than a week old, so times may be out by a minute or more.</span>';
  if (tleMsg) html += " " + tleMsg;
  $("tleStatus").innerHTML = html;
}
function fetchOne(url){
  var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  var to = setTimeout(function(){ if (ctl) ctl.abort(); }, 8000);
  return fetch(url, {cache:"no-cache", signal: ctl ? ctl.signal : undefined}).then(function(r){
    clearTimeout(to); if (!r.ok) throw new Error(url + " replied " + r.status); return r.text();
  }).then(function(txt){ if (!/^1 25544/m.test(txt)) throw new Error(url + " sent no ISS TLE"); return txt; });
}
function sourceName(url){ return /celestrak\.org/.test(url) ? "CelesTrak" : "this website"; }
function fetchLatest(){
  var list = CONFIG.tleSources.slice(), i = 0;
  function next(){
    if (i >= list.length) return Promise.reject(new Error("no source"));
    var url = list[i++];
    return fetchOne(url).then(function(txt){ return {txt: txt, name: sourceName(url)}; }, next);
  }
  return next();
}
var refreshing = false;
function refreshTle(manual){
  if (refreshing) return;
  var now = Date.now(), lastAttempt = +load(RKEY) || 0;
  if (!manual && lastAttempt && now - lastAttempt >= 0 && now - lastAttempt < CONFIG.refetchAfterHours * 3600000) return;
  save(RKEY, now);
  var c = load(TKEY);
  if (!manual && c && c.provider && now - c.fetched < CONFIG.refetchAfterHours * 3600000 && tleSource.indexOf("a saved") === 0) return;
  refreshing = true;
  var btn = $("refreshBtn"); btn.disabled = true; btn.textContent = "Checking…";
  function done(msg){ refreshing = false; btn.disabled = false; btn.textContent = "Check for newer orbit data"; renderTle(msg); }
  fetchLatest().then(function(r){
    useTle(r.txt, "the latest TLE from " + r.name, {onlyIfNewer: !manual, provider: r.name});
    done(manual ? "Checked just now." : "");
  }).catch(function(){
    done("The latest orbit couldn’t be downloaded just now. To update it by hand, open the <a href=\"" + CELESTRAK + "\" target=\"_blank\" rel=\"noopener\">CelesTrak ISS TLE</a> and paste it below.");
  });
}
$("refreshBtn").onclick = function(){ refreshTle(true); };
$("tleUse").onclick = function(){
  try{ useTle($("tleInput").value, "your pasted TLE"); $("tleNote").textContent = "Predicting from your TLE."; }
  catch(e){ $("tleNote").textContent = e.message; }
};

/* ---------- live clock ---------- */
function tick(){
  var now = Date.now();
  if (!tle) return;
  var p = passes.find(function(x){ return x.aos === selected; });
  if (p){
    if (now >= p.aos - 2000 && now <= p.los + 2000) renderHero();
    else { var c = document.querySelector("#hero .count"); if (c && p.appear.t > now) c.textContent = countdown(p.appear.t - now); }
    if (now > p.los + 60000){ selected = null; compute(); return; }
  }
  if (now - lastCompute > 30 * 60000) compute();
  var sp = PassEngine.subpoint(tle.satrec, new Date(now));
  if (sp){
    var look = PassEngine.sample(tle.satrec, PassEngine.makeObserver(+S.lat,+S.lon,+S.alt||0), new Date(now));
    $("nowLine").textContent = "Right now the ISS is " + Math.round(sp.h) + " km up over " + Math.abs(sp.lat).toFixed(1) + "°" + (sp.lat >= 0 ? "N" : "S") + " " + Math.abs(sp.lon).toFixed(1) + "°" + (sp.lon >= 0 ? "E" : "W") +
      (look && look.el >= 0 ? ", " + Math.round(look.el) + "° above your " + DIRNAMES[dir(look.az)] + " horizon." : ", below your horizon.");
  }
}

/* ---------- 3D view ---------- */
var sky3d = null, last3d = "";
function update3d(p){
  var box = $("s3");
  if (!p || !tle){ box.hidden = true; return; }
  box.hidden = false;
  if (!sky3d){
    if (typeof THREE === "undefined" || typeof Sky3D === "undefined") { box.hidden = true; return; }
    Sky3D.setLand(LAND_RINGS);
    sky3d = Sky3D.create(box, {
      cutoff: function(){ return settingsForEngine().cutoff; },
      extinction: function(){ return !!S.extinction; },
      time: function(t){ return hms(t); },
      dirName: function(az){ return DIRNAMES[dir(az)]; },
      mag: function(m){ return minus(m) + " (" + brightWord(m).toLowerCase() + ")"; }
    });
  }
  if (!sky3d.ok) return;
  var key = [p.aos, tle.line1, S.lat, S.lon, S.alt, S.cutoff, S.extinction, S.tz].join("|");
  if (key === last3d) return;
  last3d = key;
  sky3d.setObserver(+S.lat, +S.lon, +S.alt || 0);
  sky3d.setPass(p, tle);
}

/* ---------- location picker ---------- */
var locMap = null;
function openLocation(focusSearch){
  var d = $("filters"); d.open = true; initMap();
  $("locFieldset").scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start"});
  if (focusSearch) setTimeout(function(){ $("placeSearch").focus({preventScroll:true}); }, 350);
}
function initMap(){
  if (locMap){ locMap.refresh(); return; }
  if (typeof L === "undefined" || typeof LocationMap === "undefined"){ showMapMsg("The map couldn’t load. You can still type a latitude and longitude."); return; }
  locMap = LocationMap.create($("map"), {lat:+S.lat, lon:+S.lon, onPick: chooseSpot,
    onTilesFailed: function(){ showMapMsg("Map tiles couldn’t load here. Place search and typed coordinates still work."); }});
  setTimeout(function(){ locMap.refresh(); }, 50);
}
function showMapMsg(m){ var e = $("mapMsg"); e.textContent = m; e.hidden = false; }
var pickSeq = 0;
function setPlace(lat, lon, name){
  S.lat = lat; S.lon = lon; S.name = name; save(SKEY, S); fillForm(); selected = null; compute();
}
function chooseSpot(lat, lon){
  var seq = ++pickSeq;
  setPlace(lat, lon, "Chosen spot");
  LocationMap.reverse(lat, lon).then(function(name){
    if (seq !== pickSeq || !name) return;
    S.name = name.slice(0, 40); save(SKEY, S); fillForm(); render();
  }).catch(function(){});
}
function runSearch(){
  var q = $("placeSearch").value.trim(), list = $("searchResults");
  if (!q) return;
  list.hidden = false; list.innerHTML = '<li class="note">Searching…</li>';
  LocationMap.search(q).then(function(rs){
    if (!rs.length){ list.innerHTML = '<li class="note">No places found. Try a town name or postcode.</li>'; return; }
    list.innerHTML = rs.map(function(r, i){ return '<li><button type="button" data-i="' + i + '"><span class="rn">' + esc(r.name) + '</span><span class="rl">' + esc(r.label) + '</span></button></li>'; }).join("");
    list.querySelectorAll("button").forEach(function(b){ b.onclick = function(){
      var r = rs[+b.dataset.i]; list.hidden = true; list.innerHTML = "";
      pickSeq++; setPlace(+r.lat.toFixed(4), +r.lon.toFixed(4), r.name.slice(0, 40));
      if (locMap) locMap.set(S.lat, S.lon, 12);
    }; });
  }).catch(function(){
    list.innerHTML = '<li class="note">Place search couldn’t be reached from here. Click the map or type coordinates instead.</li>';
  });
}
$("searchBtn").onclick = runSearch;
$("placeSearch").addEventListener("keydown", function(e){ if (e.key === "Enter"){ e.preventDefault(); runSearch(); } });
$("changeLoc").onclick = function(){ openLocation(true); };
$("filters").addEventListener("toggle", function(){ if ($("filters").open) initMap(); });

/* ---------- start ---------- */
fillForm();
var cached = load(TKEY);
try{
  if (cached && cached.text){
    var snap = PassEngine.parseTle(SNAPSHOT), mine = PassEngine.parseTle(cached.text);
    if (mine.epoch >= snap.epoch && cached.provider) useTle(cached.text, "a saved TLE from " + cached.provider + ", fetched " + day(cached.fetched) + " at " + hm(cached.fetched));
    else useTle(SNAPSHOT, "the built-in TLE");
  } else useTle(SNAPSHOT, "the built-in TLE");
}catch(e){ useTle(SNAPSHOT, "the built-in TLE"); }
refreshTle(false);
setInterval(tick, 1000); tick();
})();
