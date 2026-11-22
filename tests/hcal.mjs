// 📅 בודק את הלוח העברי של האפליקציה האופליין (js/089-hcal.js) מול hebcal — לוח מוכר ובדוק:
//   תאריך עברי לכל יום 1900–2300, פרשת השבוע לכל שבת (ארץ ישראל וחו"ל) 1900–2300, חגים עיקריים, וזמני היום (עד דקה).
//   node hcal.mjs
//   hebcal (רישיון GPL) משמש רק כאן בבדיקות — הוא לא נכלל באתר ולא באפליקציה.
import fs from 'node:fs';
import vm from 'node:vm';
import { HDate, Sedra, Location, Zmanim, HebrewCalendar, flags } from '@hebcal/core';

const ctx = { window: {}, Math, Date, JSON, console };
vm.runInNewContext(fs.readFileSync(new URL('../shopping-list-site/js/089-hcal.js', import.meta.url), 'utf8'), ctx);
const H = ctx.window.Hcal;
let bad = 0;
const fail = (m) => { if (bad++ < 25) console.error('❌ ' + m); };

// 1) תאריך: כל יום
const start = H.rdOf(new Date(1900, 0, 1)), end = H.rdOf(new Date(2300, 0, 1));
for (let rd = start; rd < end; rd++) {
  const h = H.fromRd(rd), e = new HDate(rd);
  if (h.y !== e.getFullYear() || h.m !== e.getMonth() || h.d !== e.getDate()) fail(`תאריך ${rd}: ${h.d}/${h.m}/${h.y} במקום ${e.getDate()}/${e.getMonth()}/${e.getFullYear()}`);
  else if (H.toRd(h.y, h.m, h.d) !== rd) fail(`toRd ${rd}`);
}
console.log('📆 תאריכים נבדקו');

// 2) פרשה: כל שבת
const PAIRS = [[22, 23], [27, 28], [29, 30], [32, 33], [39, 40], [42, 43], [51, 52]];
for (const il of [true, false]) {
  const cache = {};
  for (let rd = start + ((6 - H.dow(start)) + 7) % 7; rd < end; rd += 7) {
    const hy = H.fromRd(rd).y, s = cache[hy] || (cache[hy] = new Sedra(hy, il)), r = s.lookup(new HDate(rd));
    const want = r.chag ? [] : (Array.isArray(r.num) ? r.num : [r.num]).map((n) => n - 1);
    const got = H.parshaNums(rd, il);
    if (JSON.stringify(got) !== JSON.stringify(want)) fail(`פרשה ${il ? 'א"י' : 'חו"ל'} ${new HDate(rd).toString()}: ${got} במקום ${want}`);
  }
}
console.log('📖 פרשות נבדקו');

// 3) חגים וצומות עיקריים (ימים שבהם hebcal מציין חג/צום) — 2000–2100
const map = [[/^Rosh Hashana( \d+| II)?$/, 'ראש השנה'], [/^Tzom Gedaliah/, 'צום גדליה'], [/^Yom Kippur$/, 'יום כיפור'], [/^Sukkot I$/, 'סוכות'], [/^Shmini Atzeret/, 'שמיני עצרת'],
  [/^Chanukah: 3 Candles/, 'חנוכה — נר ב'], [/^Asara B'Tevet/, 'עשרה בטבת'], [/^Ta'anit Esther/, 'תענית אסתר'], [/^Purim$/, 'פורים'], [/^Pesach I$/, 'פסח'],
  [/^Pesach VII$/, 'שביעי של פסח'], [/^Lag BaOmer/, 'ל"ג בעומר'], [/^Shavuot( I)?$/, 'שבועות'], [/^Tzom Tammuz/, 'צום י"ז בתמוז'], [/^Tish'a B'Av/, 'תשעה באב'],
  [/^Rosh Chodesh/, 'ראש חודש']];
for (const il of [true, false]) {
  for (let y = 5760; y < 5860; y++) {
    for (const ev of HebrewCalendar.calendar({ year: y, isHebrewYear: true, il, noModern: true, noSpecialShabbat: true, noMinorFast: false })) {
      const d = ev.getDesc(), m = map.find(([re]) => re.test(d)); if (!m) continue;
      const rd = ev.getDate().abs(), mine = H.events(rd, il).join(' | ');
      if (!mine.includes(m[1])) fail(`חג ${d} ${ev.getDate().toString()} (${il ? 'א"י' : 'חו"ל'}): אצלנו "${mine}"`);
    }
  }
}
console.log('🕎 חגים נבדקו');

// 4) זמנים — עד דקה אחת מ-hebcal (בגובה פני הים)
const pick = ['Jerusalem', 'Tel Aviv', 'Haifa', 'Eilat', 'New York', 'London', 'Los Angeles', 'Paris'];
const keys = { alot: 'alotHaShachar', mish: 'misheyakir', rise: 'sunrise', shma: 'sofZmanShma', tf: 'sofZmanTfilla', shmaMga: 'sofZmanShmaMGA', tfMga: 'sofZmanTfillaMGA',
  chatzot: 'chatzot', mg: 'minchaGedola', mk: 'minchaKetana', plag: 'plagHaMincha', set: 'sunset', tzeit: 'tzeit' };
let worst = 0;
for (const name of pick) {
  const l = Location.lookup(name), c = { lat: l.getLatitude(), lon: l.getLongitude() };
  for (let rd = H.rdOf(new Date(2026, 0, 1)); rd < H.rdOf(new Date(2028, 0, 1)); rd += 3) {
    const d = H.dateOf(rd), z = new Zmanim(new (l.constructor)(c.lat, c.lon, false, l.getTzid()), d, false), mine = H.zmanim(rd, c);
    for (const [k, f] of Object.entries(keys)) {
      const a = mine[k], b = z[f](); if (!a || !b || isNaN(b)) continue;
      const diff = Math.abs(a - b) / 6e4; worst = Math.max(worst, diff);
      if (diff > 1) fail(`זמן ${k} ${name} ${d.toDateString()}: הפרש ${diff.toFixed(2)} דק'`);
    }
  }
}
console.log(`☀️ זמנים נבדקו (ההפרש הגדול ביותר: ${(worst * 60).toFixed(0)} שניות)`);
if (bad) { console.error(`❌ ${bad} טעויות`); process.exit(1); }
console.log('✅ הלוח העברי תקין');
