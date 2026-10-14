/* ==========================================================================
   Xiru-Server · Anti-Cheat – Prüfregeln (reine Rechnungen, ohne Datenbank)
   Geladen von xiru.pb.js (PocketBase-Hooks). Daten: xiru_data.js (tools/build_server_data.py).

   Idee: Der Server führt je Konto eine geprüfte Zusammenfassung „ac“ (users.ac, nur für Superuser sichtbar).
   Jeder neue Spielstand (Geräte-Sync) wird mit ihr verglichen. Was in der verstrichenen Zeit unmöglich
   dazugekommen sein kann, sperrt das Konto. Öffentliche Werte (Level, Mech im Duell/Trupp, Rangliste)
   rechnet der Server aus „ac“ – nicht aus dem, was der Browser behauptet.

   Grosszügig gerechnet: lieber einen Schummler übersehen als jemanden zu Unrecht sperren.
   Zuwachs, der an Ereignisse gebunden ist (neue Kristalle, Orte, Tage, Spiele, Tausch, Verkäufe …), ist frei;
   alles andere kommt aus „Eimern“, die sich mit der Zeit füllen (RATE pro Stunde, höchstens CAP auf einmal).
   ========================================================================== */
const D = require(`${__hooks}/xiru_data.js`.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/'));

const RATE = { xp: 2500, taler: 5000, mats: 700, fish: 200, items: 30, cards: 25, spent: 300 };   // pro Stunde
const CAP = { xp: 4000, taler: 8000, mats: 1500, fish: 400, items: 25, cards: 15, spent: 500 };     // auf einmal
/* Erster Spielstand eines Kontos (kein Vergleich möglich): nur grobe Obergrenzen */
const FIRST = { xp: 250000, taler: 500000, mat: 30000, fish: 5000, cards: 150 };
/* Spielhalle: grosszügige Höchstwerte je Spiel (höher = unmöglich → zählt nicht für die Weltrangliste).
   lower: kleiner ist besser (Zeit, Züge) → Mindestwert. Unbekannte Spiele: DEFAULT_CAP. */
const SCORE_CAP = {
    'reaktion': { lower: true, min: 90 }, 'minen': { lower: true, min: 1 }, 'memory': { lower: true, min: 6 }, 'memory-gross': { lower: true, min: 12 },
    '2048': 4000000, 'tippen': 1500, 'galgen': 2000, 'tictactoe': 2000, 'vier-gewinnt': 2000, 'woertle': 2000, 'hardware-quiz': 2000, 'reversi': 100000
};
const DEFAULT_CAP = 10000000;
const DAY = 864e5, HOUR = 36e5;

/* ── Hilfen ── */
const num = v => { v = +v; return isFinite(v) ? v : 0; };
const obj = v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
const arr = v => Array.isArray(v) ? v : [];
const keys = v => Object.keys(obj(v));
const sum = o => keys(o).reduce((a, k) => a + Math.max(0, num(o[k])), 0);
const xpForNext = l => 100 + 40 * (l - 1);
function levelOf(xp) { let l = 1, rest = num(xp); while (rest >= xpForNext(l) && l < 5000) { rest -= xpForNext(l); l++; } return l; }

/* ISO-Kalenderwoche wie mnemora.js (MN.week) */
function weekKey(t) {
    const d = new Date(t); d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + 3 - (d.getUTCDay() + 6) % 7);
    const y = d.getUTCFullYear(), w1 = new Date(Date.UTC(y, 0, 4));
    const w = 1 + Math.round(((d - w1) / DAY - 3 + (w1.getUTCDay() + 6) % 7) / 7);
    return y + '-W' + String(w).padStart(2, '0');
}

/* ── Seemech: Werte der eingebauten Teile (wie core.js itemStats + mech.stats) ── */
function itemStats(it) {
    const b = D.parts[it.id], out = {}; if (!b) return out;
    const q = Math.min(6, Math.max(1, num(it.q) || 1)), up = Math.min(5, Math.max(0, num(it.up))), mul = D.rar[q] || 1;
    keys(b.s).forEach(k => {
        const v = b.s[k];
        if (v <= 0) { out[k] = v; return; }
        const base = v * mul + (q - 1) * .5;
        out[k] = Math.round(base) + Math.floor(base * .12 * up + up * .34);
    });
    return out;
}
function seaStats(mech) {
    const out = { R: 0, E: 0, S: 0, P: 0, A: 0 }, inv = arr(mech.inv), eq = obj(mech.eq);
    D.slots.forEach(sl => {
        const it = inv.find(x => x && x.u === eq[sl]); if (!it || !D.parts[it.id] || D.parts[it.id].slot !== sl) return;
        const s = itemStats(it), c = num(it.c);
        keys(s).forEach(k => { const x = s[k]; out[k] = (out[k] || 0) + (x < 0 ? x : c <= 0 ? 0 : c < 40 ? Math.floor(x / 2) : x); });
    });
    return out;
}

/* ── Mnemora: Kampfwerte des aktiven Gehäuses (wie mnemora.js combat) ── */
function kitOf(mech) {
    const mn = obj(mech.mnemora), cas = arr(mn.casings).filter(c => c && D.casings[c.id]);
    const act = cas.find(c => c.u === mn.active) || cas[0]; if (!act) return null;
    const def = D.casings[act.id], cards = arr(mn.cards), s = seaStats(mech), crew = obj(mn.crew);
    const p = { atk: Math.floor(Math.max(0, s.A) / 2) + (crew.bolzen ? 1 : 0), hp: Math.max(0, s.P) * 2, en: Math.floor(Math.max(0, s.E) / 3), crit: Math.max(0, s.S), spd: Math.floor(Math.max(0, s.R) / 3) };
    const fx = { hp: 0, atk: 0, def: 0, spd: 0, en: 0, crit: 0, rep: 0, regen: 0 }, ids = [], terr = {};
    def.terr.forEach(t => { terr[t] = 1; });
    let used = 0;
    arr(act.k).forEach(u => {
        const it = cards.find(c => c && c.u === u), cd = it && D.cards[it.id]; if (!cd || used + cd.w > def.slots) return;
        used += cd.w; ids.push(it.id);
        keys(cd.fx).forEach(k => { fx[k] = (fx[k] || 0) + cd.fx[k]; });
        cd.terr.forEach(t => { terr[t] = 1; });
    });
    const b = def.base, cc = Math.min(100, Math.max(0, num(act.c))), worn = cc < 40 ? .75 : 1;
    return {
        id: act.id, cc, k: ids.slice(0, 6), t: Object.keys(terr),
        c: { hp: Math.round(((b.hp || 30) + fx.hp + p.hp) * worn), atk: (b.atk || 2) + fx.atk + p.atk, def: (b.def || 0) + fx.def, spd: (b.spd || 1) + fx.spd + p.spd,
             en: (b.en || 3) + fx.en + p.en, crit: Math.min(45, 5 + fx.crit + p.crit), rep: Math.min(.8, fx.rep), regen: Math.min(.12, fx.regen) }
    };
}
const power = c => Math.round(num(c.hp) + num(c.atk) * 5 + num(c.def) * 3 + num(c.spd) * 2 + num(c.en));

/* ── Zusammenfassung eines Spielstands (Export-Format von core.js: { profile, saves }) ── */
function summarize(data) {
    const P = obj(obj(data).profile), m = obj(obj(P.data).mech), mn = obj(m.mnemora);
    const eggs = keys(P.eggs), known = eggs.filter(id => D.eggs[id]);
    const scores = {};
    keys(P.scores).forEach(g => {
        const s = obj(P.scores[g]); if (s.best == null || !isFinite(+s.best)) return;
        const cap = SCORE_CAP[g], v = +s.best;
        const ok = cap && cap.lower ? v >= cap.min : v >= 0 && v <= (typeof cap === 'number' ? cap : DEFAULT_CAP);
        scores[g] = { best: v, plays: num(s.plays), ok };
    });
    const free = { cards: {}, mats: {} };
    const inCas = {}; arr(mn.casings).forEach(c => arr(c && c.k).forEach(u => { inCas[u] = 1; }));
    arr(mn.cards).forEach(c => { if (c && D.cards[c.id] && !inCas[c.u]) free.cards[c.id] = (free.cards[c.id] || 0) + 1; });
    keys(m.mat).forEach(k => { if (D.mats.indexOf(k) >= 0) free.mats[k] = Math.max(0, Math.floor(num(m.mat[k]))); });
    const roads = keys(mn.roads).filter(r => D.roads[r] && num(mn.roads[r]) >= D.roads[r].foes);
    const seen = keys(mn.seen).filter(id => D.places.indexOf(id) >= 0);
    const casIds = arr(mn.casings).filter(c => c && D.casings[c.id]).map(c => c.id);
    const prog = { r: roads.length, p: seen.length, b: mn.boss ? 1 : 0, c: casIds.length };
    const xp = Math.max(0, num(P.xp));
    return {
        xp, level: levelOf(xp), eggs: known, eggsUnknown: eggs.length - known.length,
        pages: keys(P.visited).filter(p => D.pages[p]), days: keys(P.days).length, games: keys(P.scores).length, rewards: keys(P.rewards).length,
        records: keys(P.scores).reduce((a, g) => a + num(obj(P.scores[g]).plays), 0),
        taler: Math.max(0, Math.floor(num(m.taler))), spent: Math.max(0, num(m.spent)), mats: free.mats, matsSum: sum(free.mats),
        fish: sum(m.fish), fishMap: obj(m.fish), items: arr(m.inv).length, itemQ: arr(m.inv).reduce((o, it) => { if (it && it.u) o[it.u] = num(it.q); return o; }, {}),
        joe: { n: num(obj(m.joe).n), pot: num(obj(m.joe).pot) }, cards: arr(mn.cards).length, casings: casIds,
        roads, seen, boss: !!mn.boss, scores, free, kit: kitOf(m), prog, mns: prog.r * 10 + prog.p * 6 + prog.b * 60 + prog.c * 4
    };
}

/* ── Vergleich: neuer Stand gegen die geprüfte Zusammenfassung ──
   old = bisheriges users.ac (oder null), now = Zeit (ms), extra = Zufluss aus dem Spiel mit anderen
   { taler, mats, cards } (Tausch, Trupp-Anteile seit der letzten Prüfung). → { ok, why, ac } */
function check(old, data, now, extra) {
    extra = extra || {};
    const S = summarize(data), why = [];
    const add = t => { if (why.length < 6) why.push(t); };
    // Immer: Grenzen, die kein Spielstand überschreiten kann
    if (S.eggsUnknown > 15) add(S.eggsUnknown + ' unbekannte Kristalle');
    if (S.items > 80) add('mehr als 80 Teile im Lager');
    if (S.casings.length > Object.keys(D.casings).length) add('zu viele Gehäuse');
    if (new Set(S.casings).size !== S.casings.length) add('doppelte Gehäuse');
    const B = {};   // neue Eimer
    if (!old || !old.b) {
        // Erster geprüfter Stand: nur grobe Obergrenzen
        if (S.xp > FIRST.xp) add('XP ' + S.xp + ' beim ersten Abgleich');
        if (S.taler > FIRST.taler) add(S.taler + ' Taler beim ersten Abgleich');
        if (keys(S.mats).some(k => S.mats[k] > FIRST.mat)) add('unmöglich viel Material');
        if (S.fish > FIRST.fish) add('unmöglich viele Fische');
        if (S.cards > FIRST.cards) add('unmöglich viele Steckkarten');
        Object.keys(CAP).forEach(k => { B[k] = CAP[k]; });
    } else {
        const h = Math.max(0, (now - num(old.t)) / HOUR);
        Object.keys(CAP).forEach(k => { B[k] = Math.min(CAP[k], num(old.b[k]) + RATE[k] * h); });
        const was = new Set(arr(old.eggs)), newEggs = S.eggs.filter(id => !was.has(id));
        const pagesWas = new Set(arr(old.pages)), newPages = S.pages.filter(p => !pagesWas.has(p));
        const spentUp = Math.max(0, S.spent - num(old.spent)), talerDown = Math.max(0, num(old.taler) - S.taler);
        const fishDown = Math.max(0, num(old.fish) - S.fish), itemsDown = Math.max(0, num(old.items) - S.items);
        // XP: Kristalle, Orte, Tage, erste Spiele, Rekorde, Belohnungen – der Rest aus dem Eimer
        const newDays = Math.max(0, S.days - num(old.days));
        if (newDays > Math.ceil(h / 24) + 2) add(newDays + ' neue Spieltage in ' + Math.round(h) + ' h');
        const xpFree = newEggs.reduce((a, id) => a + num(D.eggs[id][0]) + 5, 0) + newPages.reduce((a, p) => a + D.pages[p], 0) + newDays * 20 +
            Math.max(0, S.games - num(old.games)) * 15 + Math.max(0, S.records - num(old.records)) * 5 + Math.max(0, S.rewards - num(old.rewards)) * 30;
        const take = (k, gain, label) => { gain = Math.max(0, gain); if (gain > B[k] + 1e-6) add(label + ' +' + Math.round(gain) + ' (erlaubt ' + Math.round(B[k]) + ')'); B[k] = Math.max(0, B[k] - gain); };
        take('xp', S.xp - num(old.xp) - xpFree, 'XP');
        // Taler: Verkäufe (Fische, Teile), Jackpot bei Lucky Joe, Tausch und Trupp-Anteile sind frei
        const joePot = S.joe.n > num(old.joe && old.joe.n) ? num(old.joe && old.joe.pot) : 0;
        take('taler', S.taler - num(old.taler) - fishDown * 400 - itemsDown * 400 - joePot - num(extra.taler), 'Taler');
        // Material (alle Sorten zusammen): Schrottpresse (Schrott), Einkauf (Taler), zerlegte Teile, Tausch
        take('mats', S.matsSum - num(old.matsSum) - spentUp / 3 - talerDown / 3 - itemsDown * 15 - num(extra.mats), 'Material');
        take('fish', S.fish - num(old.fish), 'Fische');
        take('items', S.items - num(old.items) - spentUp / 40 - talerDown / 120, 'Mech-Teile');
        take('cards', S.cards - num(old.cards) - spentUp / 40 - talerDown / 150 - num(extra.cards), 'Steckkarten');
        take('spent', num(old.spent) - S.spent, 'Schrott zurück');
        // Seltenheit eines vorhandenen Teils ändert sich nie
        const oq = obj(old.itemQ); let qBad = 0; keys(S.itemQ).forEach(u => { if (oq[u] && oq[u] !== S.itemQ[u]) qBad++; });
        if (qBad) add(qBad + ' Teile mit veränderter Seltenheit');
    }
    const ac = {
        v: 1, t: now, b: B, xp: S.xp, level: S.level, eggs: S.eggs, pages: S.pages, days: S.days, games: S.games, records: S.records, rewards: S.rewards,
        taler: S.taler, spent: S.spent, matsSum: S.matsSum, fish: S.fish, items: S.items, itemQ: S.itemQ, joe: S.joe, cards: S.cards,
        free: S.free, roads: S.roads, seen: S.seen, boss: S.boss, casings: S.casings, kit: S.kit, mn: S.prog, mns: S.mns,
        scores: keys(S.scores).reduce((o, g) => { if (S.scores[g].ok) o[g] = S.scores[g].best; return o; }, {})
    };
    return { ok: !why.length, why: why.join(' · '), ac };
}

/* Ein frisch zurückgesetzter Spielstand (zum Entsperren) */
function isFresh(data) {
    const S = summarize(data);
    return S.xp <= 300 && S.taler <= 200 && S.items <= 6 && S.cards <= 2 && S.casings.length === 0 && S.eggs.length <= 8 && S.matsSum <= 50;
}

/* Weltboss: höchstens so viel Schaden, wie das Gehäuse in 6 Runden schaffen kann (grosszügig) */
function wbCap(kit) { return kit && kit.c ? Math.min(4000, Math.round(6 * (num(kit.c.atk) * 1.8 * 1.15 * 2.1 * 1.6 + 10))) : 0; }

/* Hat der geprüfte Stand diese Ware frei? (minus eigene offene Angebote) */
function has(ac, item, offered) {
    if (!ac || !item) return false;
    const n = Math.max(1, Math.floor(num(item.n))), free = obj(ac.free);
    if (item.k === 'card') return num(obj(free.cards)[item.id]) - num(obj(offered.cards)[item.id]) >= 1;
    if (item.k === 'mat') return num(obj(free.mats)[item.id]) - num(obj(offered.mats)[item.id]) >= n;
    if (item.k === 'taler') return num(ac.taler) - num(offered.taler) >= n;
    return false;
}

module.exports = { D, RATE, CAP, levelOf, weekKey, summarize, check, isFresh, kitOf, power, wbCap, has, SCORE_CAP };
