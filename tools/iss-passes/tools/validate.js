#!/usr/bin/env node
/*
 * Checks the pass engine against reference predictions from Heavens-Above
 * for Milton Keynes (52.0406 N, 0.7594 W, 90 m), using the same TLE.
 * Run from the project folder:  node tools/validate.js
 */
global.satellite = require('../lib/satellite.min.js');
const E = require('../src/pass-engine.js');

const tle = E.parseTle(`ISS (ZARYA)
1 25544U 98067A   26323.84989825  .00011830  00000+0  21862-3 0  9993
2 25544  51.6318 249.7702 0007428  44.2199 315.9382 15.49496274595884`);

// Heavens-Above, 20-29 Nov 2026 (UTC). [date, mag, start, start el, highest, highest el, end, end el]
const REF = [
  ['2026-11-20',-3.3,'16:47:21',10,'16:50:36',53,'16:53:53',10],
  ['2026-11-20',-3.6,'18:23:57',10,'18:26:57',69,'18:26:57',69],
  ['2026-11-21',-3.8,'17:36:01',10,'17:39:22',84,'17:40:54',30],
  ['2026-11-21',-0.9,'19:12:47',10,'19:13:49',18,'19:13:49',18],
  ['2026-11-22',-3.7,'16:48:04',10,'16:51:25',77,'16:54:46',10],
  ['2026-11-22',-3.4,'18:24:49',10,'18:27:46',63,'18:27:46',63],
  ['2026-11-23',-3.8,'17:36:50',10,'17:40:11',83,'17:41:43',30],
  ['2026-11-23',-0.8,'19:13:39',10,'19:14:38',17,'19:14:38',17],
  ['2026-11-24',-3.8,'16:48:50',10,'16:52:11',86,'16:55:32',10],
  ['2026-11-24',-3.0,'18:25:36',10,'18:28:37',50,'18:28:37',50],
  ['2026-11-25',-3.5,'17:37:34',10,'17:40:53',64,'17:42:39',25],
  ['2026-11-25',-0.7,'19:14:38',10,'19:15:35',15,'19:15:35',15],
  ['2026-11-26',-3.6,'16:49:31',10,'16:52:51',76,'16:56:11',10],
  ['2026-11-26',-2.2,'18:26:24',10,'18:29:22',29,'18:29:42',29],
  ['2026-11-27',-2.6,'17:38:14',10,'17:41:23',40,'17:43:56',14],
  ['2026-11-27',-0.4,'19:16:43',10,'19:16:52',10,'19:16:52',10],
  ['2026-11-28',-3.0,'16:50:06',10,'16:53:22',52,'16:56:38',10],
  ['2026-11-28',-1.0,'18:27:32',10,'18:29:36',16,'18:31:16',12],
  ['2026-11-29',-1.3,'17:39:02',10,'17:41:40',22,'17:44:20',10],
];

const settings = {lat:52.0406, lon:-0.7594, alt:90, days:10, minEl:0, minSecs:0, sunLimit:-6,
                  requireLit:true, cutoff:10, extinction:false, maxMag:null};
const passes = E.predict(tle, settings, new Date('2026-11-20T12:00:00Z')).filter(p => p.visible);
const t = (d, hms) => Date.parse(`${d}T${hms}Z`);

let worstT = 0, worstEl = 0, worstMag = 0, missing = 0;
console.log('date        appear dt  high dt  end dt   high el ref/calc   mag ref/calc');
for (const r of REF) {
  const p = passes.find(x => Math.abs(x.appear.t - t(r[0], r[2])) < 120000);
  if (!p) { console.log(r[0], r[2], 'NOT FOUND'); missing++; continue; }
  const dA = (p.appear.t - t(r[0], r[2])) / 1000, dH = (p.high.t - t(r[0], r[4])) / 1000, dE = (p.disappear.t - t(r[0], r[6])) / 1000;
  const dEl = p.high.el - r[5], dM = p.peak.mag - r[1];
  worstT = Math.max(worstT, Math.abs(dA), Math.abs(dH), Math.abs(dE));
  worstEl = Math.max(worstEl, Math.abs(dEl)); worstMag = Math.max(worstMag, Math.abs(dM));
  console.log(r[0], r[2], `${dA.toFixed(0).padStart(4)} s ${dH.toFixed(0).padStart(5)} s ${dE.toFixed(0).padStart(5)} s   ${String(r[5]).padStart(3)} / ${p.high.el.toFixed(1).padStart(4)}   ${r[1].toFixed(1).padStart(5)} / ${p.peak.mag.toFixed(1)}`);
}
console.log(`\n${REF.length - missing} of ${REF.length} passes matched. Worst time error ${worstT.toFixed(0)} s, ` +
            `worst max-elevation error ${worstEl.toFixed(1)} deg, worst magnitude error ${worstMag.toFixed(2)}.`);
process.exit(missing ? 1 : 0);
