/* ==========================================================================
   PIXMAG Mini – Welt: Etagen-Generator, Kartenschmiede-Import, Sichtfeld, Wege
   ========================================================================== */
(function () {
    'use strict';
    const PXM = window.PXM = window.PXM || {};

    const T = { WALL: 0, FLOOR: 1, DOOR: 2, OPEN: 3, STAIRS: 4, WATER: 5, SECRET: 6, SEALED: 7 };
    const DIRS8 = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]];

    /* mulberry32 – reproduzierbarer Zufall */
    function rng(seed) {
        let a = seed >>> 0;
        const f = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
        f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
        f.pick = arr => arr[Math.floor(f() * arr.length)];
        f.chance = p => f() < p;
        return f;
    }
    function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

    function makeMap(w, h) {
        return { w, h, t: new Uint8Array(w * h), seen: new Uint8Array(w * h), vis: new Uint8Array(w * h), torches: [], rooms: [] };
    }
    const inB = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;
    const tile = (m, x, y) => inB(m, x, y) ? m.t[y * m.w + x] : T.WALL;
    const setT = (m, x, y, v) => { if (inB(m, x, y)) m.t[y * m.w + x] = v; };
    const isWallish = v => v === T.WALL || v === T.SECRET;
    const walkable = v => v === T.FLOOR || v === T.DOOR || v === T.OPEN || v === T.STAIRS || v === T.SEALED;
    const opaque = v => v === T.WALL || v === T.DOOR || v === T.SECRET;

    /* ── Etagen-Generator: Räume + Gänge ──────────────────────────────── */
    function gen(depth, seed, opt) {
        opt = opt || {};
        for (let attempt = 0; attempt < 30; attempt++) {
            const m = tryGen(depth, (seed + attempt * 7919) >>> 0, opt);
            if (m) return m;
        }
        return tryGen(depth, seed, Object.assign({}, opt, { simple: true }));
    }

    function tryGen(depth, seed, opt) {
        const R = rng(seed);
        const W = 48, H = 32;
        const m = makeMap(W, H);
        const rooms = [];
        const want = opt.simple ? 4 : R.int(9, 13);
        for (let i = 0; i < 400 && rooms.length < want; i++) {
            const rw = R.int(4, 10), rh = R.int(4, 7);
            const rx = R.int(2, W - rw - 2), ry = R.int(2, H - rh - 2);
            const r = { x: rx, y: ry, w: rw, h: rh };
            if (rooms.some(o => rx - 2 < o.x + o.w && rx + rw + 2 > o.x && ry - 2 < o.y + o.h && ry + rh + 2 > o.y)) continue;
            rooms.push(r);
        }
        if (rooms.length < 4) return null;
        rooms.forEach(r => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) setT(m, x, y, T.FLOOR); });
        const cen = r => ({ x: r.x + (r.w >> 1), y: r.y + (r.h >> 1) });
        function corridor(a, b) {
            const A = cen(a), B = cen(b);
            const carve = (x, y) => { if (tile(m, x, y) === T.WALL && x > 0 && y > 0 && x < W - 1 && y < H - 1) setT(m, x, y, T.FLOOR); };
            if (R() < .5) {
                for (let x = Math.min(A.x, B.x); x <= Math.max(A.x, B.x); x++) carve(x, A.y);
                for (let y = Math.min(A.y, B.y); y <= Math.max(A.y, B.y); y++) carve(B.x, y);
            } else {
                for (let y = Math.min(A.y, B.y); y <= Math.max(A.y, B.y); y++) carve(A.x, y);
                for (let x = Math.min(A.x, B.x); x <= Math.max(A.x, B.x); x++) carve(x, B.y);
            }
        }
        // Spannbaum (nächster Nachbar) + ein paar Schleifen
        const linked = [0], rest = rooms.map((_, i) => i).slice(1);
        while (rest.length) {
            let best = null;
            linked.forEach(a => rest.forEach(b => {
                const A = cen(rooms[a]), B = cen(rooms[b]);
                const d = Math.abs(A.x - B.x) + Math.abs(A.y - B.y);
                if (!best || d < best.d) best = { a, b, d };
            }));
            corridor(rooms[best.a], rooms[best.b]);
            linked.push(best.b); rest.splice(rest.indexOf(best.b), 1);
        }
        const loops = opt.simple ? 0 : R.int(2, 4);
        for (let i = 0; i < loops; i++) {
            const a = R.pick(rooms), b = R.pick(rooms);
            if (a !== b) { const A = cen(a), B = cen(b); if (Math.abs(A.x - B.x) + Math.abs(A.y - B.y) < 30) corridor(a, b); }
        }
        // Türen dort, wo Gänge die Räume treffen
        rooms.forEach(r => {
            for (let x = r.x; x < r.x + r.w; x++) [r.y - 1, r.y + r.h].forEach(y => {
                if (tile(m, x, y) === T.FLOOR && isWallish(tile(m, x - 1, y)) && isWallish(tile(m, x + 1, y)) && R() < .5) setT(m, x, y, T.DOOR);
            });
            for (let y = r.y; y < r.y + r.h; y++) [r.x - 1, r.x + r.w].forEach(x => {
                if (tile(m, x, y) === T.FLOOR && isWallish(tile(m, x, y - 1)) && isWallish(tile(m, x, y + 1)) && R() < .5) setT(m, x, y, T.DOOR);
            });
        });
        m.rooms = rooms;
        // Start und Treppe (am weitesten entfernter Raum)
        const sIdx = R.int(0, rooms.length - 1);
        const sr = rooms[sIdx];
        const start = { x: R.int(sr.x, sr.x + sr.w - 1), y: R.int(sr.y, sr.y + sr.h - 1) };
        const dist = distMap(m, start.x, start.y, v => walkable(v));
        const far = rooms.map((r, i) => ({ i, r, d: dist[cen(r).y * W + cen(r).x] })).filter(o => o.i !== sIdx && o.d < 30000).sort((a, b) => b.d - a.d);
        if (!far.length) return null;
        let pick = far[0];
        if (opt.boss) { pick = far.slice(0, 3).sort((a, b) => b.r.w * b.r.h - a.r.w * a.r.h)[0]; }
        const lr = pick.r;
        const stairs = opt.boss ? { x: lr.x + lr.w - 1, y: lr.y + (lr.h >> 1) } : cen(lr);
        setT(m, stairs.x, stairs.y, opt.boss ? T.SEALED : T.STAIRS);
        // Alle Räume erreichbar?
        if (rooms.some(r => dist[cen(r).y * W + cen(r).x] >= 30000)) return null;

        // Wasserbecken
        if (!opt.simple) {
            const pools = R.int(0, 2);
            for (let i = 0; i < pools; i++) {
                const r = R.pick(rooms);
                if (r === sr || r === lr || r.w < 6 || r.h < 5 || r.pool) continue;
                const cx = r.x + r.w / 2 - .5, cy = r.y + r.h / 2 - .5, rx = (r.w - 2) / 2, ry = (r.h - 2) / 2;
                const changed = [];
                for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
                    const dx = (x - cx) / rx, dy = (y - cy) / ry;
                    if (dx * dx + dy * dy < .85 + R() * .25 && tile(m, x, y) === T.FLOOR) { setT(m, x, y, T.WATER); changed.push([x, y]); }
                }
                const d2 = distMap(m, start.x, start.y, v => walkable(v));
                if (rooms.some(o => { const c = cen(o); return tile(m, c.x, c.y) !== T.WATER && d2[c.y * W + c.x] >= 30000; }) || d2[stairs.y * W + stairs.x] >= 30000) {
                    changed.forEach(([x, y]) => setT(m, x, y, T.FLOOR));
                } else r.pool = true;
            }
        }
        // Fackeln an Wandfronten über Räumen
        rooms.forEach(r => {
            const n = R.int(0, 2);
            for (let i = 0; i < n; i++) {
                const x = R.int(r.x, r.x + r.w - 1), y = r.y - 1;
                if (tile(m, x, y) === T.WALL && walkable(tile(m, x, y + 1)) && !m.torches.includes(y * W + x)) m.torches.push(y * W + x);
            }
        });
        // Floppy-Kammer (selten, hinter einer morschen Wand)
        let floppy = null;
        if (opt.floppy) {
            for (let i = 0; i < 60 && !floppy; i++) {
                const r = R.pick(rooms);
                if (r === sr) continue;
                const side = R.int(0, 3);
                let sx, sy, cx, cy;
                if (side === 0) { sx = R.int(r.x + 1, r.x + r.w - 2); sy = r.y - 1; cx = sx; cy = sy - 2; }
                else if (side === 1) { sx = R.int(r.x + 1, r.x + r.w - 2); sy = r.y + r.h; cx = sx; cy = sy + 2; }
                else if (side === 2) { sy = R.int(r.y + 1, r.y + r.h - 2); sx = r.x - 1; cx = sx - 2; cy = sy; }
                else { sy = R.int(r.y + 1, r.y + r.h - 2); sx = r.x + r.w; cx = sx + 2; cy = sy; }
                if (cx - 2 < 1 || cy - 2 < 1 || cx + 2 > W - 2 || cy + 2 > H - 2) continue;
                let ok = tile(m, sx, sy) === T.WALL;
                for (let y = cy - 2; y <= cy + 2 && ok; y++) for (let x = cx - 2; x <= cx + 2 && ok; x++) {
                    if (x === sx && y === sy) continue;
                    if (tile(m, x, y) !== T.WALL) ok = false;
                }
                if (!ok) continue;
                for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) setT(m, x, y, T.FLOOR);
                setT(m, sx, sy, T.SECRET);
                m.torches = m.torches.filter(ti => ti !== sy * W + sx);
                floppy = { x: cx, y: cy, wall: { x: sx, y: sy } };
            }
        }
        // Platz für den Händler
        let merchant = null;
        if (opt.merchant) {
            const cands = rooms.filter(r => r !== sr && r !== lr);
            const r = cands.length ? R.pick(cands) : null;
            if (r) {
                const c = cen(r);
                if (tile(m, c.x, c.y) === T.FLOOR) merchant = c;
                else for (let y = r.y; y < r.y + r.h && !merchant; y++) for (let x = r.x; x < r.x + r.w; x++) if (tile(m, x, y) === T.FLOOR) { merchant = { x, y }; break; }
            }
        }
        m.start = start; m.stairs = stairs; m.startRoom = sIdx; m.lair = opt.boss ? lr : null; m.stairsRoom = lr;
        m.floppy = floppy; m.merchantSpot = merchant;
        return m;
    }

    /* ── Kartenschmiede-Import ─────────────────────────────────────────
       { name, lore, seed, w, h, tiles: ['####', '#<.>#', …] }
       # Wand · . Boden · + Tür · < Start · > Ausgang · E Gegner · T Schatz
       ~ Wasser · B Boss · alles andere = Boden
       ------------------------------------------------------------------ */
    function parseForged(o) {
        if (!o || typeof o !== 'object') return { error: 'Keine Karte gefunden.' };
        let rows = Array.isArray(o.tiles) ? o.tiles : (typeof o.tiles === 'string' ? o.tiles.split(/\r?\n/) : null);
        if (!rows) return { error: 'Die Karte hat keine Kacheln („tiles“).' };
        rows = rows.filter(r => typeof r === 'string').slice(0, 100).map(r => r.replace(/\s+$/, '').slice(0, 120));
        while (rows.length && !rows[rows.length - 1].length) rows.pop();
        const h = rows.length, w = rows.reduce((a, r) => Math.max(a, r.length), 0);
        if (h < 3 || w < 3) return { error: 'Die Karte ist zu klein.' };
        const m = makeMap(w, h);
        const enemies = [], chests = [], bosses = [], exits = [];
        let start = null;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const ch = rows[y][x];
            let v = T.FLOOR;
            if (ch === undefined || ch === '#') v = T.WALL;
            else if (ch === '+') v = T.DOOR;
            else if (ch === '~') v = T.WATER;
            else if (ch === '>') { v = T.STAIRS; exits.push({ x, y }); }
            else if (ch === '<') { if (!start) start = { x, y }; }
            else if (ch === 'E') enemies.push({ x, y });
            else if (ch === 'T') chests.push({ x, y });
            else if (ch === 'B') bosses.push({ x, y });
            m.t[y * w + x] = v;
        }
        // Rand immer als Wand behandeln (Out-of-bounds ist Wand)
        if (!start) {
            for (let i = 0; i < w * h && !start; i++) if (m.t[i] === T.FLOOR) start = { x: i % w, y: (i / w) | 0 };
            if (!start) for (let i = 0; i < w * h && !start; i++) if (walkable(m.t[i])) start = { x: i % w, y: (i / w) | 0 };
        }
        if (!start) return { error: 'Auf dieser Karte gibt es keinen Boden.' };
        const dist = distMap(m, start.x, start.y, v => walkable(v));
        let stairs = exits.find(e => dist[e.y * w + e.x] < 30000) || null;
        let note = '';
        if (!stairs) {
            let best = -1, bi = start.y * w + start.x;
            for (let i = 0; i < w * h; i++) if (dist[i] < 30000 && m.t[i] === T.FLOOR && dist[i] > best && !enemies.concat(chests, bosses).some(p => p.y * w + p.x === i)) { best = dist[i]; bi = i; }
            stairs = { x: bi % w, y: (bi / w) | 0 };
            m.t[bi] = T.STAIRS;
            note = exits.length ? 'Der Ausgang ist unerreichbar – ein Riss im Boden öffnet einen neuen Weg.' : 'Diese Karte hat keinen Ausgang – ein Riss im Boden öffnet einen.';
        }
        m.start = start; m.stairs = stairs; m.forged = true;
        const seed = Number.isFinite(+o.seed) ? (Math.abs(Math.floor(+o.seed)) >>> 0) : hashStr(rows.join('\n'));
        return {
            map: m, start, stairs, note,
            enemies: enemies.slice(0, 60), chests: chests.slice(0, 30), bosses: bosses.slice(0, 3),
            name: String(o.name || 'Geschmiedete Karte').slice(0, 60),
            lore: String(o.lore || '').slice(0, 400),
            seed: seed || 1
        };
    }

    /* ── Sichtfeld: rekursives Shadowcasting ─────────────────────────── */
    const MULT = [[1, 0, 0, -1, -1, 0, 0, 1], [0, 1, -1, 0, 0, -1, 1, 0], [0, 1, 1, 0, 0, -1, -1, 0], [1, 0, 0, 1, -1, 0, 0, -1]];
    function fov(m, ox, oy, radius, out) {
        out.fill(0);
        if (inB(m, ox, oy)) out[oy * m.w + ox] = 1;
        for (let oct = 0; oct < 8; oct++) cast(m, ox, oy, 1, 1, 0, radius, MULT[0][oct], MULT[1][oct], MULT[2][oct], MULT[3][oct], out);
    }
    function cast(m, cx, cy, row, start, end, radius, xx, xy, yx, yy, out) {
        if (start < end) return;
        const r2 = radius * radius + radius;
        let newStart = 0;
        for (let j = row; j <= radius; j++) {
            let dx = -j - 1;
            const dy = -j;
            let blocked = false;
            while (dx <= 0) {
                dx++;
                const X = cx + dx * xx + dy * xy, Y = cy + dx * yx + dy * yy;
                const l = (dx - .5) / (dy + .5), r = (dx + .5) / (dy - .5);
                if (start < r) continue;
                if (end > l) break;
                if (dx * dx + dy * dy <= r2 && inB(m, X, Y)) out[Y * m.w + X] = 1;
                const op = opaque(tile(m, X, Y));
                if (blocked) {
                    if (op) { newStart = r; continue; }
                    blocked = false; start = newStart;
                } else if (op && j < radius) {
                    blocked = true;
                    cast(m, cx, cy, j + 1, start, l, radius, xx, xy, yx, yy, out);
                    newStart = r;
                }
            }
            if (blocked) break;
        }
    }

    /* ── Breitensuche (Distanzkarte) ─────────────────────────────────── */
    function distMap(m, sx, sy, pass, maxD) {
        const N = m.w * m.h, d = new Int16Array(N).fill(32000);
        if (!inB(m, sx, sy)) return d;
        const q = new Int32Array(N);
        let qh = 0, qt = 0;
        d[sy * m.w + sx] = 0; q[qt++] = sy * m.w + sx;
        while (qh < qt) {
            const i = q[qh++], x = i % m.w, y = (i / m.w) | 0, nd = d[i] + 1;
            if (maxD && nd > maxD) continue;
            for (let k = 0; k < 8; k++) {
                const nx = x + DIRS8[k][0], ny = y + DIRS8[k][1];
                if (!inB(m, nx, ny)) continue;
                const j = ny * m.w + nx;
                if (d[j] <= nd || !pass(m.t[j], nx, ny)) continue;
                d[j] = nd; q[qt++] = j;
            }
        }
        return d;
    }

    /* Weg von A nach B (Liste von Feldern ohne Start) */
    function path(m, sx, sy, tx, ty, pass) {
        const d = distMap(m, tx, ty, pass);
        if (d[sy * m.w + sx] >= 32000) return null;
        const out = [];
        let x = sx, y = sy, guard = 0;
        while ((x !== tx || y !== ty) && guard++ < 4000) {
            let best = null, bd = d[y * m.w + x];
            for (let k = 0; k < 8; k++) {
                const nx = x + DIRS8[k][0], ny = y + DIRS8[k][1];
                if (!inB(m, nx, ny)) continue;
                const v = d[ny * m.w + nx];
                if (v < bd) { bd = v; best = [nx, ny]; }
            }
            if (!best) return null;
            x = best[0]; y = best[1]; out.push({ x, y });
        }
        return out;
    }

    /* Bresenham-Linie (ohne Startfeld) */
    function line(x0, y0, x1, y1, maxLen) {
        const pts = [];
        let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
        let x = x0, y = y0;
        const lim = maxLen || 200;
        while (pts.length < lim) {
            if (x === x1 && y === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x += sx; }
            if (e2 <= dx) { err += dx; y += sy; }
            pts.push({ x, y });
        }
        return pts;
    }
    /* Linie über das Ziel hinaus verlängern */
    function ray(x0, y0, x1, y1, len) {
        const dx = x1 - x0, dy = y1 - y0;
        if (!dx && !dy) return [];
        const k = 60 / Math.max(Math.abs(dx), Math.abs(dy));
        return line(x0, y0, Math.round(x0 + dx * k), Math.round(y0 + dy * k), len);
    }

    PXM.W = { T, DIRS8, rng, hashStr, makeMap, inB, tile, setT, walkable, opaque, isWallish, gen, parseForged, fov, distMap, path, line, ray };
})();
