/* Sky3D: a three.js (r128) view of one ISS pass that shows why it is visible.
   Scene units are kilometres in the observer's local frame: x east, y up, z south.
   Needs THREE, satellite (satellite.js) and PassEngine. */
var Sky3D = (function () {
  "use strict";
  var DEG = Math.PI / 180, RAD = 180 / Math.PI, RE = 6378.137, FLAT = 1 / 298.257223563;
  var LAND = null; // set via Sky3D.setLand(rings) before create()

  function radialTexture(stops) {
    var c = document.createElement("canvas"); c.width = c.height = 128;
    var g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    var t = new THREE.CanvasTexture(c); return t;
  }

  function create(root, ctx) {
    var api = { setPass: setPass, setObserver: setObserver, ok: false };
    var wrap = root.querySelector(".s3-stage"), labels = root.querySelector(".s3-labels");
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    } catch (e) {
      wrap.innerHTML = '<p class="s3-fail">The 3D view needs WebGL, which this browser has turned off.</p>';
      return api;
    }
    api.ok = true;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    wrap.insertBefore(renderer.domElement, labels);
    var scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1, 0.0005, 2e6);
    scene.background = new THREE.Color(0x02040c);

    /* ---------- observer frame ---------- */
    var obs = null, R = new THREE.Matrix4(), E = new THREE.Vector3(), N = new THREE.Vector3(), U = new THREE.Vector3(), O = new THREE.Vector3();
    var world = new THREE.Group(); world.matrixAutoUpdate = false; scene.add(world);
    function toScene(p, out) {
      out = out || new THREE.Vector3();
      var dx = p.x - O.x, dy = p.y - O.y, dz = p.z - O.z;
      return out.set(dx * E.x + dy * E.y + dz * E.z, dx * U.x + dy * U.y + dz * U.z, -(dx * N.x + dy * N.y + dz * N.z));
    }
    function dirToScene(p, out) {
      out = out || new THREE.Vector3();
      return out.set(p.x * E.x + p.y * E.y + p.z * E.z, p.x * U.x + p.y * U.y + p.z * U.z, -(p.x * N.x + p.y * N.y + p.z * N.z)).normalize();
    }
    function setObserver(lat, lon, alt) {
      var f = lat * DEG, l = lon * DEG;
      obs = PassEngine.makeObserver(lat, lon, alt);
      O.set(obs.ecf.x, obs.ecf.y, obs.ecf.z);
      E.set(-Math.sin(l), Math.cos(l), 0);
      N.set(-Math.sin(f) * Math.cos(l), -Math.sin(f) * Math.sin(l), Math.cos(f));
      U.set(Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f));
      R.set(E.x, E.y, E.z, -E.dot(O), U.x, U.y, U.z, -U.dot(O), -N.x, -N.y, -N.z, N.dot(O), 0, 0, 0, 1);
      world.matrix.copy(R); world.matrixWorldNeedsUpdate = true;
    }

    /* ---------- Earth ---------- */
    var earthGeo = new THREE.SphereGeometry(RE, 160, 120); earthGeo.rotateX(Math.PI / 2); earthGeo.scale(1, 1, 1 - FLAT);
    var earth = new THREE.Mesh(earthGeo, new THREE.MeshPhongMaterial({ color: 0x24508c, emissive: 0x060c1e, specular: 0x222222, shininess: 10 }));
    world.add(earth);
    function geo(latD, lonD, h) { return satellite.geodeticToEcf({ latitude: latD * DEG, longitude: lonD * DEG, height: h }); }
    var coastPos = [];
    (LAND || []).forEach(function (ring) {
      for (var i = 0; i + 3 < ring.length; i += 2) {
        var a = geo(ring[i + 1] / 10, ring[i] / 10, 2), b = geo(ring[i + 3] / 10, ring[i + 2] / 10, 2);
        coastPos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    });
    var gridPos = [];
    for (var la = -75; la <= 75; la += 15) for (var lo = -180; lo < 180; lo += 3) { var a1 = geo(la, lo, 1), b1 = geo(la, lo + 3, 1); gridPos.push(a1.x, a1.y, a1.z, b1.x, b1.y, b1.z); }
    for (var lo2 = -180; lo2 < 180; lo2 += 15) for (var la2 = -87; la2 < 87; la2 += 3) { var a2 = geo(la2, lo2, 1), b2 = geo(la2 + 3, lo2, 1); gridPos.push(a2.x, a2.y, a2.z, b2.x, b2.y, b2.z); }
    function segs(pos, color, opacity) {
      var g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity }));
    }
    var coast = segs(coastPos, 0xbcd0ee, 0.7), grid = segs(gridPos, 0x6f88b8, 0.18);
    world.add(coast); world.add(grid);

    /* ---------- light ---------- */
    var sunLight = new THREE.DirectionalLight(0xffffff, 1.15); scene.add(sunLight); scene.add(sunLight.target);
    scene.add(new THREE.AmbientLight(0x3a4a70, 0.45));

    /* ---------- Earth's shadow ---------- */
    var SHL = 60000;
    var shadow = new THREE.Mesh(new THREE.CylinderGeometry(RE, RE, SHL, 96, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x1b2a58, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
    scene.add(shadow);
    var shadowEdgeGeo = new THREE.BufferGeometry();
    var shadowEdge = new THREE.LineSegments(shadowEdgeGeo, new THREE.LineBasicMaterial({ color: 0x8090c0, transparent: true, opacity: 0.35 }));
    scene.add(shadowEdge);

    /* ---------- Sun ---------- */
    var sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture([[0, "rgba(255,250,225,1)"], [0.18, "rgba(255,226,140,1)"], [0.45, "rgba(255,180,60,.35)"], [1, "rgba(255,160,40,0)"]]), depthWrite: false }));
    scene.add(sunSprite);

    /* ---------- sky for the ground view ---------- */
    var skyU = { sunDir: { value: new THREE.Vector3(1, 0, 0) }, sunAlt: { value: -10 } };
    var sky = new THREE.Mesh(new THREE.SphereGeometry(5e5, 48, 32), new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: false,
      vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: [
        "uniform vec3 sunDir; uniform float sunAlt; varying vec3 vDir;",
        "void main(){",
        "  vec3 d = normalize(vDir); float up = max(d.y, 0.0);",
        "  float tw = smoothstep(-18.0, 0.0, sunAlt); float day = smoothstep(-2.0, 8.0, sunAlt);",
        "  vec3 night = vec3(0.012,0.02,0.055); vec3 dusk = vec3(0.10,0.17,0.36); vec3 blue = vec3(0.32,0.55,0.86);",
        "  vec3 col = mix(night, dusk, tw * pow(1.0 - up, 1.6)); col = mix(col, blue, day * (1.0 - 0.45*up));",
        "  vec2 h = normalize(vec2(d.x, d.z) + 1e-5); vec2 s = normalize(vec2(sunDir.x, sunDir.z) + 1e-5);",
        "  float glow = pow(max(dot(h, s), 0.0), 3.0) * pow(1.0 - up, 4.0) * tw;",
        "  col += vec3(0.95, 0.52, 0.22) * glow * 0.55;",
        "  if (d.y < 0.0) col = vec3(0.02,0.025,0.03) + vec3(0.03,0.04,0.06)*tw;",
        "  gl_FragColor = vec4(col, 1.0);",
        "}"].join("\n")
    }));
    sky.renderOrder = -2; scene.add(sky);
    var starPos = [];
    for (var si = 0; si < 1800; si++) { var v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(4e5); starPos.push(v.x, v.y, v.z); }
    var starGeo = new THREE.BufferGeometry(); starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
    var stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false }));
    stars.renderOrder = -1; scene.add(stars);

    /* ---------- ground and horizon ---------- */
    var ground = new THREE.Mesh(new THREE.CircleGeometry(4000, 96), new THREE.MeshBasicMaterial({ color: 0x0b1220 }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    var horizon = new THREE.Mesh(new THREE.CircleGeometry(1400, 96), new THREE.MeshBasicMaterial({ color: 0x7fd0a0, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
    horizon.rotation.x = -Math.PI / 2; scene.add(horizon);
    var ringPts = []; for (var ri = 0; ri <= 96; ri++) { var ra = ri / 96 * Math.PI * 2; ringPts.push(new THREE.Vector3(Math.sin(ra) * 1400, 0, Math.cos(ra) * 1400)); }
    var horizonRing = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineBasicMaterial({ color: 0x7fd0a0, transparent: true, opacity: 0.45 }));
    scene.add(horizonRing);
    var you = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1, 16), new THREE.MeshBasicMaterial({ color: 0x7fd0a0 }));
    you.geometry.translate(0, 0.5, 0); scene.add(you);

    /* ---------- orbit and pass track ---------- */
    var orbitLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x8fa2cc, transparent: true, opacity: 0.45 }));
    scene.add(orbitLine);
    var trackLit = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xf3b847, size: 4, sizeAttenuation: false }));
    var trackDark = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0x6a7698, size: 2.5, sizeAttenuation: false }));
    scene.add(trackLit); scene.add(trackDark);

    /* ---------- ISS ---------- */
    var iss = new THREE.Group();
    var panelMat = new THREE.MeshPhongMaterial({ color: 0xc99a3a, emissive: 0x000000, specular: 0xffffff, shininess: 80 });
    var trussMat = new THREE.MeshPhongMaterial({ color: 0xdfe4ec, shininess: 30 });
    iss.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.05), trussMat));
    var mods = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.42), trussMat); iss.add(mods);
    [-0.42, -0.28, 0.28, 0.42].forEach(function (x) {
      [-0.36, 0.36].forEach(function (y) { var p = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.6, 0.01), panelMat); p.position.set(x, y, 0); iss.add(p); });
    });
    scene.add(iss);
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture([[0, "rgba(255,255,255,1)"], [0.15, "rgba(255,244,214,.95)"], [0.4, "rgba(255,214,140,.3)"], [1, "rgba(255,200,120,0)"]]), depthWrite: false, sizeAttenuation: false, transparent: true }));
    scene.add(glow);

    /* ---------- light paths ---------- */
    function line(color, dashed) {
      var g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
      var m = dashed ? new THREE.LineDashedMaterial({ color: color, dashSize: 1, gapSize: 1, transparent: true, opacity: 0.9 }) : new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.95 });
      var l = new THREE.Line(g, m); scene.add(l); return l;
    }
    var sight = line(0xffffff, true), sunRay = line(0xf3b847, false), sunFromYou = line(0xf3b847, true), arc = line(0xffffff, false);
    sunFromYou.material.depthTest = false; sunFromYou.material.opacity = 0.6;
    function setLine(l, a, b, dashScale) {
      var p = l.geometry.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true;
      l.geometry.computeBoundingSphere();
      if (dashScale) { l.computeLineDistances(); l.material.dashSize = dashScale; l.material.gapSize = dashScale * 0.8; }
    }
    var arcGeo = new THREE.BufferGeometry().setFromPoints(new Array(33).fill(0).map(function () { return new THREE.Vector3(); }));
    arc.geometry = arcGeo;

    /* ---------- labels ---------- */
    var L = {};
    ["you", "iss", "sun", "shadow", "phase", "below", "N", "E", "S", "W"].forEach(function (k) {
      var d = document.createElement("div"); d.className = "s3-lab s3-lab-" + (k.length === 1 ? "card" : k); labels.appendChild(d); L[k] = d;
    });
    L.N.textContent = "N"; L.E.textContent = "E"; L.S.textContent = "S"; L.W.textContent = "W";
    var tmp = new THREE.Vector3(), fwd = new THREE.Vector3(0, 0, -1);
    function place(el, pos, text, show) {
      if (text != null && el._t !== text) { el.textContent = text; el._t = text; }
      if (!show) { el.style.display = "none"; return; }
      if (tmp.copy(pos).sub(camera.position).dot(fwd) <= 0) { el.style.display = "none"; return; }
      tmp.copy(pos).project(camera);
      if (tmp.z > 1 || tmp.z < -1 || Math.abs(tmp.x) > 1.1 || Math.abs(tmp.y) > 1.1) { el.style.display = "none"; return; }
      el.style.display = "block";
      el.style.transform = "translate(" + ((tmp.x + 1) / 2 * W).toFixed(1) + "px," + ((1 - tmp.y) / 2 * H).toFixed(1) + "px)";
    }

    /* ---------- state ---------- */
    var pass = null, tle = null, t = 0, playing = false, mode = "side", lastFrame = 0, W = 1, H = 1, visible = true;
    var cam = { target: new THREE.Vector3(), r: 5000, theta: 0, phi: 1.1, yaw: 180, pitch: 40, fov: 75 };
    var S = {}, earthCentre = new THREE.Vector3(), sunDir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    var issPos = new THREE.Vector3(), highPos = new THREE.Vector3();

    function setPass(p, theTle) {
      pass = p; tle = theTle; if (!pass) return;
      toScene({ x: 0, y: 0, z: 0 }, earthCentre);
      // full ground-fixed orbit around the pass
      var pts = [];
      for (var tt = pass.aos - 50 * 60000; tt <= pass.los + 50 * 60000; tt += 20000) { var e = PassEngine.ecfAt(tle.satrec, new Date(tt)); if (e) pts.push(toScene(e)); }
      orbitLine.geometry.dispose(); orbitLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
      var lit = [], dark = [];
      pass.pts.forEach(function (q) {
        var e = PassEngine.ecfAt(tle.satrec, new Date(q.t)); if (!e) return;
        var v = toScene(e); (q.vis && q.el >= ctx.cutoff() ? lit : dark).push(v);
      });
      trackLit.geometry.dispose(); trackLit.geometry = new THREE.BufferGeometry().setFromPoints(lit);
      trackDark.geometry.dispose(); trackDark.geometry = new THREE.BufferGeometry().setFromPoints(dark);
      toScene(PassEngine.ecfAt(tle.satrec, new Date(pass.high.t)), highPos);
      t = pass.high.t; playing = false; playBtn.textContent = "Play the pass"; updateUi(true);
      setMode(mode, true); frame(true);
    }

    function compute() {
      S = PassEngine.sample(tle.satrec, obs, new Date(t), { full: true, vectors: true, extinction: ctx.extinction() });
      toScene(S.sat, issPos);
      dirToScene(S.sun, sunDir);
    }

    /* ---------- camera modes ---------- */
    function setMode(m, keep) {
      mode = m;
      root.querySelectorAll("[data-view]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.view === m)); });
      if (!pass) return;
      compute();
      var side = new THREE.Vector3().crossVectors(up, sunDir); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
      if (m === "ground") {
        cam.yaw = pass.high.az; cam.pitch = Math.min(70, Math.max(20, pass.high.el * 0.75)); cam.fov = 95;
      } else if (m === "side") {
        cam.target.copy(highPos).multiplyScalar(0.6);
        var dir = side.clone().multiplyScalar(0.985).addScaledVector(up, 0.12).normalize();
        fromDir(dir, 1900 * Math.max(1, 1.3 / camera.aspect));
      } else {
        cam.target.copy(earthCentre);
        var dir2 = side.clone().multiplyScalar(0.78).addScaledVector(up, 0.55).addScaledVector(sunDir, -0.3).normalize();
        fromDir(dir2, 24000 * Math.max(1, 1.1 / camera.aspect));
      }
      if (!keep) frame(true);
    }
    function fromDir(d, r) { cam.r = r; cam.phi = Math.acos(Math.max(-1, Math.min(1, d.y))); cam.theta = Math.atan2(d.x, d.z); }
    function applyCamera() {
      if (mode === "ground") {
        camera.position.set(0, 0.002, 0);
        var a = cam.yaw * DEG, e = cam.pitch * DEG;
        camera.up.set(0, 1, 0);
        camera.lookAt(Math.sin(a) * Math.cos(e), 0.002 + Math.sin(e), -Math.cos(a) * Math.cos(e));
        camera.fov = cam.fov;
      } else {
        camera.position.set(cam.target.x + cam.r * Math.sin(cam.phi) * Math.sin(cam.theta), cam.target.y + cam.r * Math.cos(cam.phi), cam.target.z + cam.r * Math.sin(cam.phi) * Math.cos(cam.theta));
        camera.up.set(0, 1, 0); camera.lookAt(cam.target); camera.fov = 50;
      }
      camera.updateProjectionMatrix(); camera.updateMatrixWorld(); fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    }

    /* ---------- per-frame scene update ---------- */
    function frame(force) {
      if (!pass || !obs) return;
      compute(); applyCamera();
      var ground3 = mode === "ground", camD = camera.position.distanceTo(issPos);
      // lighting
      sunLight.position.copy(earthCentre).addScaledVector(sunDir, 1e5); sunLight.target.position.copy(earthCentre);
      skyU.sunDir.value.copy(sunDir); skyU.sunAlt.value = S.sunEl;
      sky.position.copy(camera.position); stars.position.copy(camera.position);
      sky.visible = ground3; ground.visible = ground3;
      stars.material.opacity = ground3 ? Math.max(0, Math.min(0.85, (-S.sunEl - 4) / 10)) : 0.7;
      earth.visible = coast.visible = grid.visible = !ground3;
      horizon.visible = horizonRing.visible = !ground3;
      scene.background.setHex(ground3 ? 0x02040c : 0x02040c);
      // shadow cylinder along the anti-Sun axis
      var axis = sunDir.clone().negate();
      shadow.position.copy(earthCentre).addScaledVector(axis, SHL / 2);
      shadow.quaternion.setFromUnitVectors(up, axis);
      shadow.visible = !ground3;
      // shadow edge lines: a few generators of the cylinder
      var b1 = new THREE.Vector3().crossVectors(axis, up); if (b1.lengthSq() < 1e-6) b1.set(1, 0, 0); b1.normalize();
      var b2 = new THREE.Vector3().crossVectors(axis, b1).normalize(), ep = [];
      for (var k = 0; k < 12; k++) { var ang = k / 12 * Math.PI * 2, off = b1.clone().multiplyScalar(Math.cos(ang) * RE).addScaledVector(b2, Math.sin(ang) * RE);
        var s0 = earthCentre.clone().add(off), s1 = s0.clone().addScaledVector(axis, SHL); ep.push(s0.x, s0.y, s0.z, s1.x, s1.y, s1.z); }
      shadowEdgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(ep, 3)); shadowEdge.visible = !ground3;
      // Sun marker (far away, not to scale)
      sunSprite.position.copy(earthCentre).addScaledVector(sunDir, 150000);
      var sd = camera.position.distanceTo(sunSprite.position); sunSprite.scale.setScalar(sd * 0.09); sunSprite.visible = !ground3;
      // ISS
      var lit = S.lit > 0.5, mag = S.mag;
      iss.position.copy(issPos);
      iss.lookAt(issPos.clone().addScaledVector(sunDir, 1000));
      iss.scale.setScalar(ground3 ? 0.0001 : camD * 0.045); iss.visible = !ground3;
      panelMat.emissive.setHex(lit ? 0x3a2a08 : 0x000000);
      glow.position.copy(issPos);
      var gsz = lit && mag != null ? Math.max(0.03, Math.min(0.13, 0.045 + (-mag) * 0.018)) : 0.016;
      glow.scale.setScalar(ground3 ? gsz : gsz * 0.7);
      glow.material.opacity = lit ? (ground3 && S.sunEl > -1 ? 0.5 : 1) : 0.25;
      glow.material.color.setHex(lit ? 0xffffff : 0x8090b0);
      // you
      you.scale.setScalar(ground3 ? 0.0001 : camera.position.length() * 0.03); you.visible = !ground3;
      // light paths
      var sunLen = ground3 ? 0 : camD * 0.55;
      setLine(sunRay, issPos.clone().addScaledVector(sunDir, sunLen), issPos);
      sunRay.visible = !ground3 && lit;
      setLine(sight, new THREE.Vector3(), issPos, ground3 ? 0 : camD * 0.012);
      sight.visible = !ground3 && S.el > -2;
      setLine(sunFromYou, new THREE.Vector3(), sunDir.clone().multiplyScalar(camera.position.length() * 0.35), camera.position.length() * 0.01);
      sunFromYou.visible = !ground3 && S.sunEl < 0;
      // phase angle arc at the ISS
      var toYou = issPos.clone().negate().normalize(), ar = camD * 0.09, ap = arcGeo.attributes.position;
      for (var i = 0; i <= 32; i++) { var v = new THREE.Vector3().copy(sunDir).lerp(toYou, i / 32).normalize().multiplyScalar(ar).add(issPos); ap.setXYZ(i, v.x, v.y, v.z); }
      ap.needsUpdate = true; arcGeo.computeBoundingSphere(); arc.visible = !ground3 && lit;
      // labels
      var mid = new THREE.Vector3().copy(sunDir).add(toYou).normalize().multiplyScalar(ar * 1.35).add(issPos);
      place(L.iss, issPos, "ISS", true);
      place(L.you, new THREE.Vector3(), "You", mode === "side");
      L.phase.title = "Phase angle";
      place(L.sun, sunSprite.position, "Sun (not to scale)", !ground3);
      place(L.phase, mid, Math.round(S.phase) + "°", mode === "side" && lit);
      place(L.shadow, earthCentre.clone().addScaledVector(axis, mode === "earth" ? 22000 : 9000).addScaledVector(b2, RE * 0.6), "Earth’s shadow", !ground3);
      var hz = new THREE.Vector3(sunDir.x, 0, sunDir.z).normalize();
      place(L.below, hz.clone().multiplyScalar(ground3 ? 1000 : camera.position.length() * 0.42).add(new THREE.Vector3(0, ground3 ? 0 : -camera.position.length() * 0.06, 0)), S.sunEl < 0 ? "Sun " + Math.round(-S.sunEl) + "° below your horizon" : "Sun " + Math.round(S.sunEl) + "° up", mode !== "earth");
      [["N", 0], ["E", 90], ["S", 180], ["W", 270]].forEach(function (c) {
        place(L[c[0]], new THREE.Vector3(Math.sin(c[1] * DEG) * 1000, 0, -Math.cos(c[1] * DEG) * 1000), null, ground3);
      });
      renderer.render(scene, camera);
    }

    /* ---------- readout ---------- */
    var out = root.querySelector(".s3-read"), slider = root.querySelector(".s3-time"), tlab = root.querySelector(".s3-clock"), playBtn = root.querySelector(".s3-play");
    var lastText = 0;
    function updateUi(force) {
      if (!pass) return;
      var now = performance.now(); if (!force && now - lastText < 120) return; lastText = now;
      slider.value = String(Math.round((t - pass.aos) / (pass.los - pass.aos) * 1000));
      tlab.textContent = ctx.time(t);
      compute();
      var h = Math.round(S.sat ? Math.hypot(S.sat.x, S.sat.y, S.sat.z) - RE : 0), lit = S.lit > 0.5, dirN = ctx.dirName(S.az);
      var rows = [
        ["Where to look", S.el >= 0 ? Math.round(S.el) + "° up in the " + dirN : "Below your horizon"],
        ["Distance", Math.round(S.range).toLocaleString("en-GB") + " km (" + h + " km up)"],
        ["Sun for you", S.sunEl < 0 ? Math.round(-S.sunEl) + "° below the horizon" : Math.round(S.sunEl) + "° above the horizon"],
        ["Sunlight on the ISS", S.lit >= 0.99 ? "Full sunlight" : S.lit <= 0.01 ? "In Earth’s shadow" : "Partly shadowed (" + Math.round(S.lit * 100) + "%)"],
        ["Phase angle", lit ? Math.round(S.phase) + "°" : "n/a"],
        ["Brightness", lit && S.mag != null ? ctx.mag(S.mag) : "Not lit"]
      ];
      out.querySelector(".s3-rows").innerHTML = rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>"; }).join("");
      out.querySelector(".s3-why").textContent = explain(S, h, lit);
    }
    function explain(s, h, lit) {
      var parts = [];
      if (s.el < 0) return "The ISS is below your horizon at this moment. Drag the time slider to follow it across your sky.";
      if (!lit) return "The ISS has slipped into Earth’s shadow. It is still " + Math.round(s.el) + "° up, but with no sunlight falling on it there is nothing to reflect, so it vanishes mid-sky.";
      if (s.sunEl < -0.8) parts.push("The Sun has set for you, but from " + h + " km up the ISS can still see it over the curve of the Earth, so it shines against a dark sky.");
      else parts.push("The Sun is still up for you, so the sky is too bright to pick the ISS out.");
      if (s.phase < 70) parts.push("With a phase angle of " + Math.round(s.phase) + "°, the sunlight is coming from roughly behind you, so you see the sunlit faces of its solar arrays almost head-on: this is when it is brightest.");
      else if (s.phase < 110) parts.push("The phase angle is " + Math.round(s.phase) + "°, so you see it side-lit, like a half Moon.");
      else parts.push("The phase angle is " + Math.round(s.phase) + "°: you are looking towards the Sun’s side of it and seeing mostly the unlit backs of the arrays, so it looks fainter.");
      if (s.range > 1000) parts.push("It is also " + Math.round(s.range).toLocaleString("en-GB") + " km away near the horizon, which dims it further.");
      return parts.join(" ");
    }

    /* ---------- controls ---------- */
    root.querySelectorAll("[data-view]").forEach(function (b) { b.addEventListener("click", function () { setMode(b.dataset.view); }); });
    slider.addEventListener("input", function () { if (!pass) return; playing = false; playBtn.textContent = "Play the pass"; t = pass.aos + (+slider.value / 1000) * (pass.los - pass.aos); updateUi(true); frame(true); });
    playBtn.addEventListener("click", function () {
      if (!pass) return; playing = !playing;
      if (playing && t >= pass.los - 1000) t = pass.aos;
      playBtn.textContent = playing ? "Pause" : "Play the pass"; lastFrame = performance.now();
    });
    var ptrs = {}, pinch = 0;
    var el = renderer.domElement;
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", function (e) { el.setPointerCapture(e.pointerId); ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; });
    el.addEventListener("pointerup", function (e) { delete ptrs[e.pointerId]; pinch = 0; });
    el.addEventListener("pointercancel", function (e) { delete ptrs[e.pointerId]; pinch = 0; });
    el.addEventListener("pointermove", function (e) {
      var p = ptrs[e.pointerId]; if (!p) return;
      var ids = Object.keys(ptrs);
      if (ids.length === 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]]; p.x = e.clientX; p.y = e.clientY;
        var d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) zoom(pinch / d); pinch = d; frame(true); return;
      }
      var dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (mode === "ground") { cam.yaw = (cam.yaw - dx * 0.25 * cam.fov / 90 + 360) % 360; cam.pitch = Math.max(-5, Math.min(89, cam.pitch + dy * 0.25 * cam.fov / 90)); }
      else { cam.theta -= dx * 0.006; cam.phi = Math.max(0.05, Math.min(Math.PI - 0.05, cam.phi - dy * 0.006)); }
      frame(true);
    });
    el.addEventListener("wheel", function (e) { e.preventDefault(); zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12); frame(true); }, { passive: false });
    function zoom(f) {
      if (mode === "ground") cam.fov = Math.max(25, Math.min(120, cam.fov * f));
      else cam.r = Math.max(mode === "earth" ? 9000 : 600, Math.min(120000, cam.r * f));
    }

    /* ---------- sizing and loop ---------- */
    function resize() {
      W = wrap.clientWidth; H = wrap.clientHeight || Math.round(W * 0.62);
      renderer.setSize(W, H, false); renderer.domElement.style.width = W + "px"; renderer.domElement.style.height = H + "px";
      camera.aspect = W / H; camera.updateProjectionMatrix(); frame(true);
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(wrap); else window.addEventListener("resize", resize);
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(wrap);
    function loop(now) {
      requestAnimationFrame(loop);
      if (!visible || !pass) return;
      if (playing) {
        t += (now - lastFrame) * 20; lastFrame = now;
        if (t > pass.los) { t = pass.los; playing = false; playBtn.textContent = "Play the pass"; }
        updateUi(); frame();
      }
    }
    requestAnimationFrame(loop);
    resize();
    return api;
  }

  return { create: create, setLand: function (r) { LAND = r; } };
})();
