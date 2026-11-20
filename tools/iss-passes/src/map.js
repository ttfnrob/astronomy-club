/* LocationMap: OpenStreetMap picker (Leaflet) with Nominatim search and reverse lookup.
   OSM tile and Nominatim usage policies apply: keep attribution, search only on request. */
var LocationMap = (function () {
  "use strict";
  var NOMINATIM = "https://nominatim.openstreetmap.org/";
  function wrapLon(l) { return ((l + 540) % 360) - 180; }
  function shortName(r) {
    var a = r.address || {};
    return r.name || a.suburb || a.village || a.town || a.hamlet || a.city || a.municipality || a.county || (r.display_name || "").split(",")[0] || "Chosen spot";
  }
  var lastCall = 0;
  function nominatim(path) {
    var wait = Math.max(0, lastCall + 1100 - Date.now()); lastCall = Date.now() + wait; // at most one request a second
    return new Promise(function (res) { setTimeout(res, wait); }).then(function () {
      return fetch(NOMINATIM + path, { headers: { "Accept": "application/json" } });
    }).then(function (r) { if (!r.ok) throw new Error("Search replied " + r.status); return r.json(); });
  }
  function search(q) {
    return nominatim("search?format=jsonv2&addressdetails=1&limit=6&accept-language=en-GB&q=" + encodeURIComponent(q)).then(function (list) {
      return list.map(function (r) { return { lat: +r.lat, lon: +r.lon, name: shortName(r), label: r.display_name }; });
    });
  }
  function reverse(lat, lon) {
    return nominatim("reverse?format=jsonv2&zoom=14&accept-language=en-GB&lat=" + lat + "&lon=" + lon).then(function (r) { return r && !r.error ? shortName(r) : null; });
  }
  function create(el, opts) {
    var map = L.map(el, { scrollWheelZoom: false, worldCopyJump: true }).setView([opts.lat, opts.lon], 11);
    var tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(map);
    var loaded = 0, failed = 0, warned = false;
    tiles.on("tileload", function () { loaded++; });
    tiles.on("tileerror", function () { failed++; if (!loaded && failed >= 3 && !warned) { warned = true; opts.onTilesFailed && opts.onTilesFailed(); } });
    map.on("focus", function () { map.scrollWheelZoom.enable(); });
    map.on("blur", function () { map.scrollWheelZoom.disable(); });
    var icon = L.divIcon({ className: "pin", html: "<span></span>", iconSize: [26, 34], iconAnchor: [13, 32] });
    var marker = L.marker([opts.lat, opts.lon], { icon: icon, draggable: true, title: "Where you’re watching from", alt: "Viewing location" }).addTo(map);
    function pick(ll) { var lat = +ll.lat.toFixed(4), lon = +wrapLon(ll.lng).toFixed(4); marker.setLatLng([lat, lon]); opts.onPick(lat, lon); }
    map.on("click", function (e) { pick(e.latlng); });
    marker.on("dragend", function () { pick(marker.getLatLng()); });
    return {
      set: function (lat, lon, zoom) { marker.setLatLng([lat, lon]); map.setView([lat, lon], zoom || map.getZoom()); },
      refresh: function () { map.invalidateSize(); }
    };
  }
  return { create: create, search: search, reverse: reverse };
})();
