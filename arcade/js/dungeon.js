/* ==========================================================================
   PIXMAG Mini – Oberfläche: Zeichnen, Effekte, Eingabe, Panels, Speichern
   Die Spielregeln stecken in arcade/js/dungeon/game.js (PXM.G). Diese Datei
   setzt PXM.fx (Grafik & Ton) und PXM.ui (Anzeigen) und ruft nur PXM.G auf.
   ========================================================================== */
XIRU.ready(function () {
    'use strict';
    const X = XIRU, A = X.Game, PXM = window.PXM;
    if (!PXM || !PXM.G || !PXM.Spr) { console.warn('[PIXMAG] Spieldateien fehlen'); return; }
    const D = PXM.D, W = PXM.W, T = W.T, Spr = PXM.Spr, G = PXM.G;
    const $ = id => document.getElementById(id);
    const esc = X.esc;
    X.typedEggs = false;                      // Buchstabentasten steuern das Spiel

    /* ── Zeichenfläche ────────────────────────────────────────────────── */
    const TS = 32, VW = 24, VH = 15;
    const { cv, ctx, W: CW, H: CH } = A.canvas('#cv', VW * TS, VH * TS);
    const stage = $('stage'), panel = $('panel'), ov = A.overlay('#ov');
    const mini = $('mini'), mctx = mini.getContext('2d');
    mini.width = 192; mini.height = 128;
    const reduced = () => X.setting('anim') === false || matchMedia('(prefers-reduced-motion: reduce)').matches;

    const EXTRA_COL = { gold: '#facc15', dampf: '#dfe7ef', gift: '#7bd651', phys: '#e5e1d8', arkan: '#c08cff', schlamm: '#8a6a3a', feuerball: '#ff7a2a' };
    const colOf = el => (D.EL[el] && D.EL[el].c) || EXTRA_COL[el] || (typeof el === 'string' && el[0] === '#' ? el : '#ffffff');
    function darker(hex, f) {
        const h = hex.replace('#', ''), n = i => Math.round(parseInt(h.slice(i, i + 2), 16) * f);
        return 'rgb(' + n(0) + ',' + n(2) + ',' + n(4) + ')';
    }
    function toHex(c) { if (c[0] === '#') return c; const m = c.match(/\d+/g); return '#' + m.slice(0, 3).map(v => (+v).toString(16).padStart(2, '0')).join(''); }

    /* ── Effekt-Zustand ───────────────────────────────────────────────── */
    const now = () => performance.now();
    let lockUntil = 0, pendingAct = null, shakeAmt = 0;
    const cam = { x: 0, y: 0 };
    const disp = new Map(), bumps = new Map(), flashes = new Map(), glows = new Map();
    let floats = [], parts = [], projs = [], zaps = [], rings = [], corpses = [];
    const key = e => (S() && e === S().p) ? 'p' : e.id;
    const S = () => G.state();

    function sfx(name, el) {
        if (!X.beep) return;
        const b = (f, d, t, v, at) => setTimeout(() => X.beep(f, d, t || 'square', v == null ? .035 : v), at || 0);
        switch (name) {
            case 'hit': b(220, .06, 'square', .04); break;
            case 'crit': b(330, .05); b(660, .09, 'square', .04, 50); break;
            case 'miss': b(170, .05, 'triangle', .03); break;
            case 'kill': b(140, .1, 'sawtooth', .045); b(90, .14, 'sawtooth', .04, 70); break;
            case 'hurt': b(120, .12, 'sawtooth', .05); break;
            case 'die': A.sfx.die(); break;
            case 'coin': A.sfx.coin(); break;
            case 'pickup': b(660, .05, 'triangle', .04); b(880, .05, 'triangle', .04, 50); break;
            case 'rune': [523, 784, 1046].forEach((f, i) => b(f, .09, 'triangle', .04, i * 70)); break;
            case 'combo': A.sfx.power(); break;
            case 'level': A.sfx.win(); break;
            case 'door': b(180, .05, 'square', .03); break;
            case 'stairs': [440, 370, 311, 262].forEach((f, i) => b(f, .08, 'triangle', .04, i * 80)); break;
            case 'chest': b(440, .06); b(660, .08, 'square', .035, 60); break;
            case 'secret': [392, 494, 587, 784].forEach((f, i) => b(f, .12, 'sine', .05, i * 90)); break;
            case 'boss': b(82, .5, 'sawtooth', .06); b(62, .6, 'sawtooth', .05, 200); break;
            case 'mimic': b(150, .2, 'sawtooth', .06); break;
            case 'cast': { const f = { feuer: 300, eis: 900, blitz: 1200, erde: 160, wasser: 520, licht: 1046, schatten: 200 }[el] || 600; b(f, .08, 'triangle', .04); b(f * 1.5, .06, 'triangle', .03, 50); break; }
            case 'drink': b(500, .05, 'sine', .05); b(700, .07, 'sine', .05, 60); break;
            case 'scroll': b(900, .05, 'triangle', .035); b(1200, .05, 'triangle', .03, 60); break;
            case 'equip': b(300, .05, 'square', .035); b(450, .05, 'square', .03, 50); break;
            case 'summon': case 'breath': case 'charge': b(110, .3, 'sawtooth', .05); break;
            default: b(400, .03, 'square', .02);
        }
    }

    /* ── PXM.fx: wird von den Spielregeln aufgerufen ──────────────────── */
    const later = (delay, fn) => { if (delay > 0) setTimeout(fn, delay); else fn(); };
    Object.assign(PXM.fx, {
        float(x, y, text, c, delay, size) { later(delay || 0, () => floats.push({ x, y, text: String(text), c: c || '#fff', small: size === 'small', t0: now(), dur: 900 })); },
        burst(x, y, el, n, delay) {
            if (reduced()) n = Math.min(n, 6);
            later(delay || 0, () => {
                const c = colOf(el), c2 = (D.EL[el] && D.EL[el].c2) || c;
                for (let i = 0; i < n; i++) {
                    const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 3.2;
                    parts.push({ x: x + .5, y: y + .5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - .6, c: i % 3 ? c : c2, t0: now(), life: 350 + Math.random() * 450, s: 2 + (Math.random() * 3 | 0) });
                }
            });
        },
        proj(x0, y0, x1, y1, el, delay) {
            const dur = Math.max(70, Math.hypot(x1 - x0, y1 - y0) * 38);
            later(delay || 0, () => projs.push({ x0, y0, x1, y1, c: colOf(el), t0: now(), dur }));
            return dur + (delay || 0);
        },
        zap(x0, y0, x1, y1, el, delay, kind) { later(delay || 0, () => zaps.push({ x0, y0, x1, y1, c: colOf(el), beam: kind === 'beam', t0: now(), dur: kind === 'beam' ? 260 : 200 })); },
        ring(x, y, r, el, delay) { later(delay || 0, () => rings.push({ x, y, r: r || 1, c: colOf(el), t0: now(), dur: 380 })); },
        flash(e, delay) { const k = key(e); later(delay || 0, () => flashes.set(k, now() + 130)); },
        bump(e, dx, dy) { bumps.set(key(e), { dx, dy, t0: now(), dur: 150 }); },
        shake(n) { if (!reduced()) shakeAmt = Math.max(shakeAmt, n || 4); },
        glow(e, c) { glows.set(key(e), { c, until: now() + 1800 }); },
        die(m, delay) {
            const B = D.MON[m.k] || {}, spr = m.disguised ? 'truhe' : B.spr;
            later(delay || 0, () => corpses.push({ spr, x: m.x, y: m.y, big: !!B.boss, t0: now(), dur: 520 }));
        },
        sfx,
        snap() { snapCam(); },
        lock(ms) { lockUntil = Math.max(lockUntil, now() + (ms || 0)); }
    });

    function snapCam() {
        const s = S(); if (!s) return;
        disp.clear();
        disp.set('p', { x: s.p.x, y: s.p.y });
        s.mons.forEach(m => disp.set(m.id, { x: m.x, y: m.y }));
        const t = camTarget(); cam.x = t.x; cam.y = t.y;
    }
    function camTarget() {
        const s = S(), m = s.map, d = disp.get('p') || s.p;
        let x = d.x + .5 - VW / 2, y = d.y + .5 - VH / 2;
        x = m.w <= VW ? (m.w - VW) / 2 : Math.max(0, Math.min(m.w - VW, x));
        y = m.h <= VH ? (m.h - VH) / 2 : Math.max(0, Math.min(m.h - VH, y));
        return { x, y };
    }

    /* ── Zeichnen ─────────────────────────────────────────────────────── */
    const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
    function itemSprite(it) {
        const d = D.ITEMS[it.k] || {};
        if (it.k === 'gold') return Spr.get('gold');
        if (it.k === 'rune') { const E = D.EL[it.el] || {}; return Spr.get('rune', { x: E.c || '#fff', X: E.c2 || '#888' }); }
        if (d.t === 'trank') return Spr.get('trank', { x: d.col, X: toHex(darker(d.col, .6)) });
        return Spr.get(d.spr || 'kristall');
    }
    function drawSpr(img, px, py, size) {
        if (!img) return;
        size = size || TS;
        ctx.drawImage(img, Math.round(px + (TS - size) / 2), Math.round(py + TS - size), size, size);
    }

    function draw() {
        const s = S();
        ctx.fillStyle = '#07060a'; ctx.fillRect(0, 0, CW, CH);
        if (!s) { drawTitle(); return; }
        const t = now(), m = s.map, tl = Spr.tiles(m.zone || 0), dt = Math.min(.05, (t - (draw.last || t)) / 1000);
        draw.last = t;

        // Figuren gleiten zu ihren Feldern
        const glide = reduced() ? 1 : Math.min(1, dt * 18);
        const dp = disp.get('p') || { x: s.p.x, y: s.p.y };
        dp.x += (s.p.x - dp.x) * glide; dp.y += (s.p.y - dp.y) * glide; disp.set('p', dp);
        s.mons.forEach(mm => {
            const d = disp.get(mm.id) || { x: mm.x, y: mm.y };
            if (Math.abs(d.x - mm.x) > 3 || Math.abs(d.y - mm.y) > 3) { d.x = mm.x; d.y = mm.y; }
            d.x += (mm.x - d.x) * glide; d.y += (mm.y - d.y) * glide; disp.set(mm.id, d);
        });
        const ct = camTarget();
        cam.x += (ct.x - cam.x) * Math.min(1, dt * 10); cam.y += (ct.y - cam.y) * Math.min(1, dt * 10);
        if (reduced()) { cam.x = ct.x; cam.y = ct.y; }

        ctx.save();
        if (shakeAmt > .2) { ctx.translate((Math.random() - .5) * shakeAmt, (Math.random() - .5) * shakeAmt); shakeAmt *= .86; } else shakeAmt = 0;
        const ox = -cam.x * TS, oy = -cam.y * TS;
        const x0 = Math.floor(cam.x) - 1, y0 = Math.floor(cam.y) - 1, x1 = x0 + VW + 3, y1 = y0 + VH + 3;
        const wf = Math.floor(t / 520) % 2;

        // Kacheln
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
            if (!W.inB(m, x, y)) continue;
            const i = y * m.w + x;
            if (!m.seen[i]) continue;
            const v = m.t[i], px = ox + x * TS, py = oy + y * TS, h = hash(x, y);
            let img;
            if (v === T.WALL || v === T.SECRET) {
                const below = W.tile(m, x, y + 1);
                const face = W.inB(m, x, y + 1) && below !== T.WALL && below !== T.SECRET;
                img = v === T.SECRET ? (face ? tl.secret : tl.secretTop) : (face ? tl.front[h % 3] : tl.top[h % 2]);
            } else if (v === T.DOOR) img = tl.door;
            else if (v === T.OPEN) img = tl.doorOpen;
            else if (v === T.STAIRS) img = tl.stairs;
            else if (v === T.SEALED) img = tl.sealed;
            else if (v === T.WATER) img = tl.water[(wf + (h & 1)) % 2];
            else img = tl.floor[h % 7 < 4 ? 0 : h % 5];
            ctx.drawImage(img, px, py, TS, TS);
        }
        // Fackeln
        (m.torches || []).forEach(ti => {
            const x = ti % m.w, y = (ti / m.w) | 0;
            if (x < x0 || x >= x1 || y < y0 || y >= y1 || !m.seen[ti]) return;
            const px = ox + x * TS, py = oy + y * TS, fl = Math.sin(t / 90 + ti) * 1.5;
            ctx.fillStyle = '#5c3b1f'; ctx.fillRect(px + 14, py + 14, 4, 10);
            ctx.fillStyle = '#ff9f2a'; ctx.fillRect(px + 13, py + 8 + fl * .3, 6, 7);
            ctx.fillStyle = '#ffe58a'; ctx.fillRect(px + 15, py + 10 + fl * .3, 2, 4);
        });
        // Felder (Nebel, Feuer, Schlamm, Eiswände)
        s.fields.forEach(f => {
            if (!G.visible(f.x, f.y)) return;
            const px = ox + f.x * TS, py = oy + f.y * TS;
            const st = { dampf: ['#dfe7ef', .32], gift: ['#7bd651', .3], feuer: ['#ff7a2a', .28 + Math.sin(t / 80 + f.x) * .08], schlamm: ['#6b4a2a', .5], eiswand: ['#bfefff', .7] }[f.k] || ['#fff', .2];
            ctx.globalAlpha = st[1]; ctx.fillStyle = st[0]; ctx.fillRect(px, py, TS, TS);
            if (f.k === 'eiswand') { ctx.globalAlpha = 1; ctx.strokeStyle = '#e8fbff'; ctx.strokeRect(px + 2.5, py + 2.5, TS - 5, TS - 5); }
            ctx.globalAlpha = 1;
        });
        // Truhen & Gegenstände
        s.objs.forEach(o => { if (m.seen[o.y * m.w + o.x]) drawSpr(Spr.get(o.open ? 'truhe_offen' : 'truhe'), ox + o.x * TS, oy + o.y * TS); });
        s.items.forEach(o => {
            if (!m.seen[o.y * m.w + o.x]) return;
            const bob = (o.it.k === 'rune' || o.it.k === 'realkristall') && !reduced() ? Math.sin(t / 300 + o.x) * 2 : 0;
            drawSpr(itemSprite(o.it), ox + o.x * TS, oy + o.y * TS + bob - 2, 28);
        });
        // Dunkelheit: erinnerte Felder abdunkeln, sichtbare zum Rand hin
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
            if (!W.inB(m, x, y)) continue;
            const i = y * m.w + x;
            if (!m.seen[i]) continue;
            let a;
            if (!m.vis[i]) a = .64;
            else { const d = Math.hypot(x - s.p.x, y - s.p.y); a = Math.max(0, Math.min(1, (d - 3) / 6)) * .42; }
            if (a > .01) { ctx.fillStyle = 'rgba(6,5,10,' + a + ')'; ctx.fillRect(ox + x * TS, oy + y * TS, TS, TS); }
        }
        // Fackelschein
        ctx.globalCompositeOperation = 'lighter';
        (m.torches || []).forEach(ti => {
            if (!m.vis[ti]) return;
            const x = ti % m.w, y = (ti / m.w) | 0, px = ox + x * TS + 16, py = oy + y * TS + 20;
            const r = 52 + Math.sin(t / 110 + ti) * 4;
            const g = ctx.createRadialGradient(px, py, 2, px, py, r);
            g.addColorStop(0, 'rgba(255,150,60,.22)'); g.addColorStop(1, 'rgba(255,150,60,0)');
            ctx.fillStyle = g; ctx.fillRect(px - r, py - r, r * 2, r * 2);
        });
        ctx.globalCompositeOperation = 'source-over';

        // Überreste
        corpses = corpses.filter(c => t - c.t0 < c.dur);
        corpses.forEach(c => {
            const p = (t - c.t0) / c.dur;
            ctx.globalAlpha = 1 - p;
            drawSpr(Spr.get(c.spr, null, p < .3 ? 'white' : null), ox + c.x * TS, oy + c.y * TS + p * 6, c.big ? 48 : TS);
            ctx.globalAlpha = 1;
        });
        // Gegner
        s.mons.forEach(mm => {
            if (mm.hp <= 0 || !m.vis[mm.y * m.w + mm.x]) return;
            const B = D.MON[mm.k] || {}, d = disp.get(mm.id) || mm;
            const off = bumpOff(mm.id, t);
            const px = ox + (d.x + off.x) * TS, py = oy + (d.y + off.y) * TS;
            const size = B.boss ? 48 : (mm.k === 'schleim' && mm.size === 1) ? 22 : TS;
            drawEntity(mm.id, mm.disguised ? 'truhe' : B.spr, px, py, size, t, B.glow);
            if (mm.st && mm.st.frozen > 0) { ctx.fillStyle = 'rgba(142,232,255,.35)'; ctx.fillRect(px + 4, py + 4, TS - 8, TS - 4); }
            if (mm.asleep && !mm.disguised) { ctx.fillStyle = '#c4b5fd'; ctx.font = 'bold 11px monospace'; ctx.fillText('z', px + 24, py + 6 - ((t / 400) % 1) * 4); }
            if (mm.elite) { ctx.fillStyle = '#ef4444'; ctx.fillRect(px + 2, py + 2, 4, 4); }
            if (!B.friendly && !mm.disguised && !B.boss && mm.hp < mm.mhp) {
                ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(px + 4, py - 3, TS - 8, 4);
                ctx.fillStyle = '#ef4444'; ctx.fillRect(px + 4, py - 3, (TS - 8) * Math.max(0, mm.hp / mm.mhp), 4);
            }
        });
        // Spieler
        {
            const off = bumpOff('p', t), px = ox + (dp.x + off.x) * TS, py = oy + (dp.y + off.y) * TS;
            if (s.p.st.invis > 0) ctx.globalAlpha = .45;
            if (s.p.shield > 0) { ctx.strokeStyle = 'rgba(142,232,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px + 16, py + 17, 15, 0, Math.PI * 2); ctx.stroke(); }
            drawEntity('p', (D.CLASSES[s.cls] || D.CLASSES.magier).spr, px, py, TS, t);
            ctx.globalAlpha = 1;
        }
        drawEffects(ox, oy, t, dt);
        if (tgt) drawTarget(ox, oy, t);
        if (hover && !tgt && W.inB(m, hover.x, hover.y) && m.seen[hover.y * m.w + hover.x]) {
            ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
            ctx.strokeRect(ox + hover.x * TS + .5, oy + hover.y * TS + .5, TS - 1, TS - 1);
        }
        ctx.restore();
    }
    function bumpOff(k, t) {
        const b = bumps.get(k);
        if (!b) return { x: 0, y: 0 };
        const p = (t - b.t0) / b.dur;
        if (p >= 1) { bumps.delete(k); return { x: 0, y: 0 }; }
        const a = Math.sin(p * Math.PI) * .32;
        return { x: b.dx * a, y: b.dy * a };
    }
    function drawEntity(k, spr, px, py, size, t, auraCol) {
        const gl = glows.get(k);
        const aura = gl && gl.until > t ? gl.c : auraCol;
        if (gl && gl.until <= t) glows.delete(k);
        if (aura) {
            const g = ctx.createRadialGradient(px + 16, py + 18, 2, px + 16, py + 18, size * .9);
            g.addColorStop(0, aura + '88'); g.addColorStop(1, aura + '00');
            ctx.fillStyle = g; ctx.fillRect(px + 16 - size, py + 18 - size, size * 2, size * 2);
        }
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.beginPath(); ctx.ellipse(px + 16, py + TS - 3, size * .32, 3, 0, 0, Math.PI * 2); ctx.fill();
        const fl = flashes.get(k);
        const white = fl && fl > t;
        if (fl && !white) flashes.delete(k);
        drawSpr(Spr.get(spr, null, white ? 'white' : null), px, py, size);
    }
    function drawEffects(ox, oy, t, dt) {
        const P = (x, y) => [ox + x * TS + 16, oy + y * TS + 16];
        projs = projs.filter(p => t - p.t0 < p.dur);
        projs.forEach(p => {
            const k = Math.min(1, (t - p.t0) / p.dur);
            const [ax, ay] = P(p.x0 + (p.x1 - p.x0) * k, p.y0 + (p.y1 - p.y0) * k);
            ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(ax, ay, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ax, ay, 2, 0, Math.PI * 2); ctx.fill();
            if (Math.random() < .6) parts.push({ x: p.x0 + (p.x1 - p.x0) * k + .5, y: p.y0 + (p.y1 - p.y0) * k + .5, vx: (Math.random() - .5), vy: (Math.random() - .5), c: p.c, t0: t, life: 250, s: 2 });
        });
        zaps = zaps.filter(z => t - z.t0 < z.dur);
        zaps.forEach(z => {
            const [ax, ay] = P(z.x0, z.y0), [bx, by] = P(z.x1, z.y1);
            ctx.globalAlpha = 1 - (t - z.t0) / z.dur;
            ctx.strokeStyle = z.c; ctx.lineWidth = z.beam ? 7 : 3; ctx.beginPath(); ctx.moveTo(ax, ay);
            if (z.beam) ctx.lineTo(bx, by);
            else for (let i = 1; i <= 6; i++) { const k = i / 6; ctx.lineTo(ax + (bx - ax) * k + (i < 6 ? (Math.random() - .5) * 14 : 0), ay + (by - ay) * k + (i < 6 ? (Math.random() - .5) * 14 : 0)); }
            ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = z.beam ? 2 : 1; ctx.stroke();
            ctx.globalAlpha = 1;
        });
        rings = rings.filter(r => t - r.t0 < r.dur);
        rings.forEach(r => {
            const k = (t - r.t0) / r.dur, [cx, cy] = P(r.x, r.y);
            ctx.globalAlpha = 1 - k; ctx.strokeStyle = r.c; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(cx, cy, 6 + (r.r + .5) * TS * k, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = (1 - k) * .18; ctx.fillStyle = r.c; ctx.fill();
            ctx.globalAlpha = 1;
        });
        parts = parts.filter(p => t - p.t0 < p.life);
        if (parts.length > 600) parts.splice(0, parts.length - 600);
        parts.forEach(p => {
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 2.2 * dt;
            ctx.globalAlpha = 1 - (t - p.t0) / p.life; ctx.fillStyle = p.c;
            ctx.fillRect(ox + p.x * TS - p.s / 2, oy + p.y * TS - p.s / 2, p.s, p.s);
        });
        ctx.globalAlpha = 1;
        floats = floats.filter(f => t - f.t0 < f.dur);
        ctx.textAlign = 'center';
        floats.forEach(f => {
            const k = (t - f.t0) / f.dur, [fx, fy] = P(f.x, f.y);
            ctx.globalAlpha = k < .7 ? 1 : 1 - (k - .7) / .3;
            ctx.font = 'bold ' + (f.small ? 11 : 15) + 'px monospace';
            ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.85)';
            const yy = fy - 16 - k * 22;
            ctx.strokeText(f.text, fx, yy); ctx.fillStyle = f.c; ctx.fillText(f.text, fx, yy);
        });
        ctx.globalAlpha = 1; ctx.textAlign = 'start';
    }
    function drawTitle() {
        const t = now();
        ctx.fillStyle = '#0d0b14'; ctx.fillRect(0, 0, CW, CH);
        for (let i = 0; i < 40; i++) {
            const x = (i * 97) % CW, y = (i * 53 + t / 30) % CH;
            ctx.fillStyle = 'rgba(160,101,232,' + (.1 + (i % 5) * .05) + ')'; ctx.fillRect(x, CH - y, 2, 2);
        }
        drawSpr(Spr.get((D.CLASSES[cls] || D.CLASSES.magier).spr), CW / 2 - 48, CH / 2 + 20, 96);
    }

    /* ── Minikarte & grosse Karte ─────────────────────────────────────── */
    function drawMap(c2, scale) {
        const s = S(); if (!s) return;
        const m = s.map;
        c2.fillStyle = '#000'; c2.fillRect(0, 0, m.w * scale, m.h * scale);
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
            const i = y * m.w + x;
            if (!m.seen[i]) continue;
            const v = m.t[i];
            c2.fillStyle = v === T.WALL || v === T.SECRET ? '#4a4458' : v === T.WATER ? '#24476e' : v === T.STAIRS ? '#a78bfa' : v === T.SEALED ? '#7e22ce' : v === T.DOOR || v === T.OPEN ? '#8a5a2a' : (m.vis[i] ? '#3a3448' : '#24202e');
            c2.fillRect(x * scale, y * scale, scale, scale);
        }
        s.objs.forEach(o => { if (m.seen[o.y * m.w + o.x] && !o.open) { c2.fillStyle = '#d4a017'; c2.fillRect(o.x * scale, o.y * scale, scale, scale); } });
        s.items.forEach(o => { if (m.seen[o.y * m.w + o.x]) { c2.fillStyle = '#facc15'; c2.fillRect(o.x * scale + scale / 4, o.y * scale + scale / 4, Math.max(1, scale / 2), Math.max(1, scale / 2)); } });
        s.mons.forEach(mm => {
            if (mm.hp <= 0 || mm.disguised || !m.vis[mm.y * m.w + mm.x]) return;
            c2.fillStyle = D.MON[mm.k].friendly ? '#facc15' : D.MON[mm.k].boss ? '#f472b6' : '#ef4444';
            c2.fillRect(mm.x * scale, mm.y * scale, scale, scale);
        });
        c2.fillStyle = '#ffffff'; c2.fillRect(s.p.x * scale - 1, s.p.y * scale - 1, scale + 2, scale + 2);
    }
    function renderMini() {
        const s = S();
        mctx.fillStyle = '#000'; mctx.fillRect(0, 0, mini.width, mini.height);
        if (!s) { $('mini-label').textContent = ''; return; }
        const sc = Math.max(1, Math.floor(Math.min(mini.width / s.map.w, mini.height / s.map.h)));
        mctx.save(); mctx.translate((mini.width - s.map.w * sc) / 2 | 0, (mini.height - s.map.h * sc) / 2 | 0);
        drawMap(mctx, sc); mctx.restore();
        $('mini-label').textContent = 'Etage ' + s.depth + ' · ' + s.floorName;
    }

    /* ── Anzeigen ─────────────────────────────────────────────────────── */
    let bossMon = null;
    function bar(cls, v, max, label) {
        const pct = max > 0 ? Math.max(0, Math.min(100, v / max * 100)) : 0;
        return '<span class="dgn-bar dgn-bar--' + cls + '" style="--v:' + pct.toFixed(1) + '%"><i></i>' + (label ? '<b>' + label + '</b>' : '') + '</span>';
    }
    function renderHud() {
        const s = S(), el = $('hud');
        if (!s) { el.innerHTML = '<span class="muted">Wähle rechts eine Klasse und starte einen Lauf.</span>'; return; }
        const p = s.p, mmp = G.maxMp(), need = D.xpNext(p.lvl);
        const st = Object.keys(p.st).filter(k => p.st[k] > 0 && G.ST_LABEL[k]).map(k => '<span class="dgn-st" style="color:' + G.ST_LABEL[k][1] + '">' + esc(G.ST_LABEL[k][0]) + ' ' + p.st[k] + '</span>');
        if (p.shield > 0) st.push('<span class="dgn-st" style="color:#8ee8ff">Schild ' + p.shield + '</span>');
        let h = '<span><span class="l">Etage</span><span class="v">' + s.depth + '</span></span>' +
            '<span title="Lebenspunkte">' + bar('hp', p.hp, p.mhp, '❤ ' + Math.max(0, p.hp) + ' / ' + p.mhp) + '</span>' +
            '<span title="Mana">' + bar('mp', p.mp, mmp, '💧 ' + p.mp + ' / ' + mmp) + '</span>' +
            '<span title="Erfahrung: ' + p.xp + ' / ' + need + '"><span class="l">Stufe</span><span class="v">' + p.lvl + '</span> ' + bar('xp', p.xp, need) + '</span>' +
            '<span><span class="l">Gold</span><span class="v">' + p.gold + '</span></span>' +
            '<span title="Zaubertinte für neue Buchseiten"><span class="l">Tinte</span><span class="v">' + p.ink + '</span></span>' +
            (st.length ? '<span>' + st.join(' ') + '</span>' : '');
        if (bossMon && bossMon.hp > 0) h += '<div class="dgn-boss">' + esc(D.MON[bossMon.k].n) + ' ' + bar('boss', bossMon.hp, bossMon.mhp, bossMon.hp + ' / ' + bossMon.mhp) + '</div>';
        el.innerHTML = h;
    }
    function renderSpells() {
        const s = S(), el = $('spells');
        if (!s) { el.innerHTML = ''; return; }
        el.innerHTML = s.p.slots.map((id, i) => {
            const sp = D.SPELLS[id];
            if (!sp) return '<button class="dgn-spell is-empty" type="button" data-k="' + (i + 1) + '" data-slot="' + i + '" title="Leerer Platz – im Buch belegen"><span class="n">leer</span><span class="m">–</span></button>';
            const c = sp.el && D.EL[sp.el] ? D.EL[sp.el].c : (D.EL[sp.els[0]] || {}).c || '';
            return '<button class="dgn-spell' + (tgt && tgt.slot === i ? ' is-active' : '') + '" type="button" data-k="' + (i + 1) + '" data-slot="' + i + '" style="--c:' + c + '"' +
                (s.p.mp < sp.mp || s.over ? ' disabled' : '') + ' title="' + esc(sp.d) + '"><span class="n">' + esc(sp.els.map(e => D.EL[e].g).join('') + ' ' + sp.n) + '</span><span class="m">' + sp.mp + ' Mana</span></button>';
        }).join('');
    }
    let logQueued = false;
    function renderLog() {
        logQueued = false;
        const s = S(), el = $('log');
        if (!s) { el.innerHTML = ''; return; }
        el.innerHTML = s.log.slice(-40).map(e => '<p class="c-' + esc(e.c || '') + '">' + esc(e.m) + (e.n > 1 ? ' <span class="x">×' + e.n + '</span>' : '') + '</p>').join('');
        el.scrollTop = el.scrollHeight;
    }
    function renderSide() {
        const book = G.bookLoad(), found = D.COMBOS.filter(k => book.found[k]).length;
        const s = S();
        $('book-side').innerHTML = '<p class="small muted">Entdeckte Buchseiten (über alle Läufe):</p>' +
            '<div class="bar"><div class="bar__fill" style="--v:' + (found / D.COMBOS.length * 100).toFixed(0) + '%"></div></div>' +
            '<p class="small"><b>' + found + '</b> von ' + D.COMBOS.length + ' Kombinationen</p>' +
            (s ? '<div class="dgn-runes">' + D.EL_ORDER.map(el => {
                const l = s.p.runes[el] || 0, E = D.EL[el];
                return '<span class="dgn-rune' + (l ? '' : ' is-off') + '" style="--c:' + E.c + '" title="' + esc(E.n) + (l ? ' Stufe ' + l : ' – noch nicht gefunden') + '">' + E.g + (l ? ' ' + l : '') + '</span>';
            }).join('') + '</div>' : '');
        const st = stats();
        $('record').innerHTML = '<p>' + esc(A.bestLabel('dungeon', 'Punkte')) + '</p><p class="small muted">Läufe: ' + st.runs + ' · Tiefste Etage: ' + st.deepest + ' · Siege: ' + st.wins + '</p>';
    }
    function refreshAll() {
        renderHud(); renderSpells(); renderLog(); renderMini(); renderSide();
        if (panelKind === 'inv' || panelKind === 'shop') renderPanel();
    }

    /* ── Hinweiszeile ─────────────────────────────────────────────────── */
    let hover = null;
    function setTip(html) { $('tip').innerHTML = html || ''; }
    function tipFor(x, y) {
        const s = S();
        if (!s || !W.inB(s.map, x, y) || !s.map.seen[y * s.map.w + x]) return '';
        const d = G.describe(x, y);
        return d ? esc(d) : '';
    }

    /* ── PXM.ui: wird von den Spielregeln aufgerufen ──────────────────── */
    Object.assign(PXM.ui, {
        refresh: refreshAll,
        logged() { if (!logQueued) { logQueued = true; requestAnimationFrame(renderLog); } },
        book() { renderSide(); if (panelKind === 'book') renderPanel(); },
        floor() { stopAuto(); snapCam(); bossMon = null; renderMini(); saveSoon(); },
        boss(m) { bossMon = m; renderHud(); },
        shop() { stopAuto(); openPanel('shop'); },
        turn() {
            saveSoon();
            const s = S();
            if (s && !s.over && s.pendingLevel > 0 && panelKind !== 'level') { stopAuto(); openPanel('level'); }
        },
        death(sum) {
            stopAuto(); cancelTarget(); closePanel();
            endRun(sum);
            setTimeout(() => {
                ov.show({
                    icon: '💀', title: 'Du bist gefallen', html: true,
                    text: summaryHtml(sum, 'Getötet von: ' + sum.cause),
                    button: 'Neuer Lauf', onClick: showMenu
                });
            }, 900);
        },
        victory() {
            stopAuto(); cancelTarget();
            X.once('dungeon-sieg', 100, 'PIXMAG Mini: Das Herz der Dunkelheit besiegt!');
            const st = stats(); st.wins++; X.save('dungeon-stats', st);
            setTimeout(() => {
                X.confetti();
                ov.show({
                    icon: '☀', title: 'Die Dunkelheit weicht!', html: true,
                    text: 'Du hast das Herz der Dunkelheit zerschlagen. Die Gilde wird dich zurücknehmen müssen.<br>Darunter liegen die <b>Endlosen Tiefen</b> – wie weit kommst du noch?',
                    button: 'Weiter in die Tiefe', onClick: () => { ov.hide(); stage.focus({ preventScroll: true }); }
                });
                const row = document.createElement('div'); row.className = 'row';
                const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn--ghost'; b.textContent = 'Lauf als Sieger beenden';
                b.addEventListener('click', () => { const sum = G.finish('Siegreich heimgekehrt'); if (sum) endRun(sum); showMenu(); });
                row.appendChild(b); ov.el.appendChild(row);
            }, 1200);
        }
    });

    function summaryHtml(sum, line) {
        const cell = (v, l) => '<div><b>' + esc(String(v)) + '</b>' + esc(l) + '</div>';
        return esc(line) + (sum.forged ? '<br><span class="small">Karte: ' + esc(sum.forged) + '</span>' : '') +
            '</p><div class="dgn-sum">' + cell(X.fmt(sum.score), 'Punkte') + cell(sum.deepest, 'tiefste Etage') + cell(sum.lvl, 'Stufe') +
            cell(sum.kills, 'besiegt') + cell(sum.bosses, 'Bosse') + cell(sum.gold, 'Gold') + cell(sum.spells, 'Zauber') + cell(sum.turns, 'Runden') + '</div><p>' +
            (sum.isNew ? '🏆 Neuer Rekord!' : '');
    }

    /* ── Statistik, Speichern, Laufende ───────────────────────────────── */
    function stats() {
        const s = X.load('dungeon-stats');
        return s && typeof s === 'object' ? { runs: +s.runs || 0, deepest: +s.deepest || 0, wins: +s.wins || 0 } : { runs: 0, deepest: 0, wins: 0 };
    }
    function endRun(sum) {
        const r = X.score('dungeon', sum.score);
        sum.isNew = !!(r && r.isNew);
        const st = stats(); st.runs++; st.deepest = Math.max(st.deepest, sum.deepest); X.save('dungeon-stats', st);
        X.save('dungeon-lauf', null);
        if (sum.isNew) X.confetti();
        renderSide();
    }
    let saveT = 0;
    function saveSoon() { clearTimeout(saveT); saveT = setTimeout(saveNow, 600); }
    function saveNow() { const s = S(); if (s && !s.over) { try { X.save('dungeon-lauf', G.serialize()); } catch (e) { /* zu gross o. ä. */ } } }
    window.addEventListener('pagehide', saveNow);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { saveNow(); stopAuto(); } });

    /* ── Menü: Klasse wählen, starten, fortsetzen ─────────────────────── */
    let cls = (X.load('dungeon-klasse') in D.CLASSES) ? X.load('dungeon-klasse') : 'magier';
    function classOk(k) { const C = D.CLASSES[k]; return C && (!C.skill || X.hasSkill(C.skill)); }
    if (!classOk(cls)) cls = 'magier';
    function renderClasses() {
        $('classes').innerHTML = Object.keys(D.CLASSES).map(k => {
            const C = D.CLASSES[k], ok = classOk(k);
            return '<button type="button" class="chip' + (k === cls ? ' is-active' : '') + '" data-cls="' + k + '"' + (ok ? '' : ' disabled title="Benötigt das Modul „Dungeon-Veteran"“') + '>' + C.icon + ' ' + esc(C.n) + (ok ? '' : ' 🔒') + '</button>';
        }).join('');
        $('class-desc').textContent = D.CLASSES[cls].d;
        const saved = X.load('dungeon-lauf'), forged = X.load('kartenschmiede-dungeon');
        let btns = '<button class="btn btn--primary" type="button" data-menu="new">⚔ Neuer Lauf als ' + esc(D.CLASSES[cls].n) + '</button>';
        if (saved && saved.v === 1 && !saved.over) btns = '<button class="btn btn--primary" type="button" data-menu="continue">▶ Lauf fortsetzen (Etage ' + (+saved.depth || 1) + ')</button>' + btns.replace('btn--primary', 'btn--ghost');
        if (forged && X.hasSkill('m4')) btns += '<button class="btn btn--ghost" type="button" data-menu="forged">🗺 Geschmiedete Karte: ' + esc(String(forged.name || 'ohne Namen').slice(0, 40)) + '</button>';
        $('menu-buttons').innerHTML = btns;
        $('menu-hint').textContent = X.hasSkill('s4') ? 'Veteranen-Bonus aktiv: Jeder Lauf startet mit einem Heiltrank und Tinte extra.' :
            forged && !X.hasSkill('m4') ? 'Eine Karte aus der Kartenschmiede wartet – mit dem Modul „Weltenschmied" kannst du sie hier spielen.' : '';
    }
    $('classes').addEventListener('click', e => {
        const b = e.target.closest('[data-cls]');
        if (!b || b.disabled) return;
        cls = b.dataset.cls; X.save('dungeon-klasse', cls); A.sfx.click(); renderClasses();
    });
    $('menu-buttons').addEventListener('click', e => {
        const b = e.target.closest('[data-menu]'); if (!b) return;
        X.audio && X.audio();
        const a = b.dataset.menu;
        if (a === 'continue') return continueRun();
        if (a === 'new') {
            const s = S();
            if (s && !s.over && !confirm('Den laufenden Lauf aufgeben und neu beginnen?')) return;
            if (s && !s.over) { const sum = G.finish('Lauf aufgegeben'); if (sum) endRun(sum); }
            return startRun();
        }
        if (a === 'forged') {
            const F = W.parseForged(X.load('kartenschmiede-dungeon'));
            if (F.error) { X.toast('Karte unbrauchbar', F.error, { type: 'error' }); return; }
            const s = S();
            if (s && !s.over) { const sum = G.finish('Lauf aufgegeben'); if (sum) endRun(sum); }
            startRun(F);
        }
    });
    function startRun(forged) {
        ov.hide(); closePanel(); cancelTarget(); stopAuto();
        floats = []; parts = []; projs = []; zaps = []; rings = []; corpses = []; bossMon = null;
        G.newRun(cls, { veteran: X.hasSkill('s4'), forged: forged || null });
        snapCam(); refreshAll(); renderClasses(); saveNow();
        stage.focus({ preventScroll: true });
        A.sfx.power();
    }
    function continueRun() {
        const o = X.load('dungeon-lauf');
        if (!G.load(o)) { X.toast('Spielstand unlesbar', 'Der gespeicherte Lauf konnte nicht geladen werden.', { type: 'error' }); X.save('dungeon-lauf', null); renderClasses(); return showMenu(); }
        ov.hide(); closePanel();
        const s = S(); bossMon = s.mons.find(m => m.boss && m.hp > 0 && m.seen) || null;
        snapCam(); refreshAll(); renderClasses();
        G.log('Du setzt deinen Abstieg fort.', 'info');
        stage.focus({ preventScroll: true });
    }
    function showMenu() {
        renderClasses(); renderSide(); refreshAll();
        const saved = X.load('dungeon-lauf');
        const can = saved && saved.v === 1 && !saved.over;
        ov.show({
            icon: '📖', title: 'PIXMAG Mini',
            text: can ? 'Ein Lauf wartet auf dich: Etage ' + (+saved.depth || 1) + '. Oder wähle rechts eine Klasse für einen neuen Abstieg.' : 'Wähle rechts eine Klasse. Jede Etage ist neu gewürfelt – und wer fällt, bleibt gefallen.',
            button: can ? 'Lauf fortsetzen' : 'Abstieg beginnen',
            onClick: () => can ? continueRun() : startRun(),
            hint: 'Pfeiltasten/WASD gehen · 1–6 zaubern · H Hilfe'
        });
    }

    /* ── Panels ───────────────────────────────────────────────────────── */
    let panelKind = null, bookMsg = { t: '', ok: true };
    function openPanel(k) { panelKind = k; cancelTarget(); renderPanel(); panel.hidden = false; const f = panel.querySelector('button:not([data-a="close"]), select'); if (f) f.focus({ preventScroll: true }); }
    function closePanel() { if (!panelKind) return; panelKind = null; panel.hidden = true; panel.innerHTML = ''; stage.focus({ preventScroll: true }); }
    const closeBtn = '<button class="btn btn--sm btn--ghost" type="button" data-a="close">Schliessen <kbd>Esc</kbd></button>';
    function itemIcon(it) { const img = itemSprite(it); try { return img ? '<img alt="" src="' + img.toDataURL() + '">' : ''; } catch (e) { return ''; } }
    function itemDesc(it) {
        const d = D.ITEMS[it.k] || {};
        let s = d.d || '';
        if (d.t === 'waffe') s = 'Schaden ' + (d.dmg[0] + (it.p || 0)) + '–' + (d.dmg[1] + (it.p || 0)) + '. ' + s;
        if (d.t === 'ruestung') s = 'Rüstung ' + ((d.def || 0) + (it.p || 0)) + '. ' + s;
        return s;
    }
    function renderPanel() {
        const s = S();
        if (!s && panelKind !== 'help') { closePanel(); return; }
        let h = '';
        if (panelKind === 'inv') {
            const p = s.p;
            h = '<h2>🎒 Rucksack <span class="small muted">' + p.inv.length + ' / ' + G.INV_MAX + '</span>' + closeBtn + '</h2>';
            h += '<h3>Ausgerüstet</h3><ul class="dgn-list">' + [p.wpn, p.arm].filter(Boolean).map(it =>
                '<li class="is-eq">' + itemIcon(it) + '<div><div class="n">' + esc(G.itemName(it)) + '</div><div class="d">' + esc(itemDesc(it)) + '</div></div><span class="small muted">angelegt</span></li>').join('') + '</ul>';
            h += '<h3>Gepäck</h3>' + (p.inv.length ? '<ul class="dgn-list">' + p.inv.map((it, i) => {
                const d = D.ITEMS[it.k] || {}, gear = d.t === 'waffe' || d.t === 'ruestung';
                return '<li>' + itemIcon(it) + '<div><div class="n">' + esc(G.itemName(it)) + '</div><div class="d">' + esc(itemDesc(it)) + '</div></div><div class="act">' +
                    (d.t !== 'schrott' ? '<button class="btn btn--sm" type="button" data-a="use" data-i="' + i + '">' + (gear ? 'Anlegen' : 'Benutzen') + '</button>' : '') +
                    '<button class="btn btn--sm btn--ghost" type="button" data-a="drop" data-i="' + i + '">Ablegen</button></div></li>';
            }).join('') + '</ul>' : '<p class="muted">Leer. Nur Staub und eine Motte.</p>');
            h += '<p class="small muted">Gold: ' + p.gold + ' · Zaubertinte: ' + p.ink + ' · Benutzen und Anlegen kosten eine Runde.</p>';
        } else if (panelKind === 'shop') {
            const sh = s.shop, p = s.p;
            if (!sh) { closePanel(); return; }
            h = '<h2>💰 Krummfingers Laden' + closeBtn + '</h2><p>Dein Gold: <b>' + p.gold + '</b> · Krummfingers Kasse: <b>' + sh.purse + '</b></p>';
            h += '<h3>Kaufen</h3>' + (sh.stock.length ? '<ul class="dgn-list">' + sh.stock.map((e, i) =>
                '<li>' + itemIcon(e) + '<div><div class="n">' + esc(G.itemName({ k: e.k, p: e.p })) + (e.q > 1 ? ' <span class="small muted">(' + e.q + ' Stück)</span>' : '') + '</div><div class="d">' + esc(itemDesc(e)) + '</div></div>' +
                '<div class="act"><button class="btn btn--sm" type="button" data-a="buy" data-i="' + i + '"' + (p.gold < e.price ? ' disabled' : '') + '>' + e.price + ' Gold</button></div></li>').join('') + '</ul>' : '<p class="muted">Ausverkauft.</p>');
            h += '<h3>Verkaufen</h3>' + (p.inv.length ? '<ul class="dgn-list">' + p.inv.map((it, i) =>
                '<li>' + itemIcon(it) + '<div><div class="n">' + esc(G.itemName(it)) + '</div><div class="d">' + esc(itemDesc(it)) + '</div></div>' +
                '<div class="act"><button class="btn btn--sm btn--ghost" type="button" data-a="sell" data-i="' + i + '"' + (sh.purse <= 0 ? ' disabled' : '') + '>+' + Math.min(G.sellPrice(it), sh.purse) + ' Gold</button></div></li>').join('') + '</ul>' : '<p class="muted">Du hast nichts zu verkaufen.</p>');
            h += '<p class="dgn-msg" id="shop-msg"></p>';
        } else if (panelKind === 'book') {
            const p = s.p, book = G.bookLoad();
            const learned = D.EL_ORDER.filter(el => p.runes[el]);
            const opts = learned.map(el => '<option value="' + el + '">' + D.EL[el].g + ' ' + esc(D.EL[el].n) + ' (Stufe ' + p.runes[el] + ')</option>').join('');
            h = '<h2>📖 Das Mysteriöse Buch' + closeBtn + '</h2>';
            h += '<h3>Runen</h3><div class="dgn-runes">' + D.EL_ORDER.map(el => {
                const l = p.runes[el] || 0, E = D.EL[el];
                return '<span class="dgn-rune' + (l ? '' : ' is-off') + '" style="--c:' + E.c + '">' + E.g + ' ' + esc(E.n) + (l ? ' · ' + l : '') + '</span>';
            }).join('') + '</div>';
            h += '<h3>Neue Seite schreiben <span class="small muted">(1 Zaubertinte, du hast ' + p.ink + ')</span></h3>' +
                (learned.length ? '<div class="dgn-combine"><select id="cmb-a" aria-label="Erste Rune">' + opts + '</select> + <select id="cmb-b" aria-label="Zweite Rune">' + opts + '</select>' +
                '<button class="btn btn--sm btn--primary" type="button" data-a="combine">Verbinden</button></div>' : '<p class="muted">Du kennst noch keine Rune.</p>') +
                '<p class="dgn-msg ' + (bookMsg.ok ? 'is-ok' : 'is-bad') + '">' + esc(bookMsg.t) + '</p>';
            h += '<h3>Deine Zauber <span class="small muted">– Plätze 1–' + p.slots.length + '</span></h3><ul class="dgn-list">' + p.spells.map(id => {
                const sp = D.SPELLS[id], at = p.slots.indexOf(id);
                return '<li><span class="dgn-ic">' + sp.els.map(e => D.EL[e].g).join('') + '</span><div><div class="n">' + esc(sp.n) + ' <span class="small muted">' + sp.mp + ' Mana</span></div><div class="d">' + esc(sp.d) + '</div></div>' +
                    '<div class="act"><select data-a="slot" data-id="' + esc(id) + '" aria-label="Platz für ' + esc(sp.n) + '"><option value="-1"' + (at < 0 ? ' selected' : '') + '>kein Platz</option>' +
                    p.slots.map((_, i) => '<option value="' + i + '"' + (at === i ? ' selected' : '') + '>Platz ' + (i + 1) + '</option>').join('') + '</select></div></li>';
            }).join('') + '</ul>';
            const found = D.COMBOS.filter(k => book.found[k]);
            h += '<h3>Entdeckte Seiten (' + found.length + ' / ' + D.COMBOS.length + ')</h3><div class="dgn-pages">' + D.COMBOS.map(k => {
                const sp = D.SPELLS[k], f = book.found[k];
                if (!f) return '<div class="is-off">' + (sp.secret ? '✶ ???' : sp.els.map(e => D.EL[e].g).join(' + ') + ' = ???') + '</div>';
                return '<div' + (p.spells.includes(k) ? ' class="is-new"' : '') + ' title="' + esc(sp.d) + '">' + sp.els.map(e => D.EL[e].g).join('+') + ' ' + esc(sp.n) + '</div>';
            }).join('') + '</div>';
        } else if (panelKind === 'level') {
            const o = G.levelOptions();
            if (!o) { closePanel(); return; }
            h = '<h2>✦ Stufe ' + s.p.lvl + '!</h2><p>Wähle eine Stärke (Taste 1–3):</p><div class="dgn-lvl">' + o.map((k, i) => {
                const L = D.LEVEL_OPTS[k];
                return '<button type="button" data-a="lvl" data-k="' + k + '"><span class="i">' + L.icon + '</span><b>' + (i + 1) + '. ' + esc(L.n) + '</b><span class="small">' + esc(L.d) + '</span></button>';
            }).join('') + '</div>';
        } else if (panelKind === 'map') {
            h = '<h2>🗺 ' + esc(s.floorName) + ' · Etage ' + s.depth + closeBtn + '</h2><canvas class="dgn-bigmap" id="bigmap"></canvas><p class="small muted">Weiss: du · Rot: Gegner · Gelb: Gegenstände & Truhen · Violett: Treppe</p>';
        } else if (panelKind === 'help') {
            h = '<h2>? Hilfe' + closeBtn + '</h2>' +
                '<p>Du bewegst dich Feld für Feld. Jede Aktion ist eine Runde – danach handeln die Gegner. Laufe in Gegner hinein, um anzugreifen.</p>' +
                '<h3>Zauber</h3><p>Runen geben dir Zauber. Mit Zaubertinte verbindet das Buch zwei Runen zu einem neuen Zauber – manche Kombinationen sind geheim, und gleiche Runen brauchen Stufe 2. Taste 1–6 wählt einen Zauber, dann zielst du mit Tab, Pfeilen oder der Maus und bestätigst mit Enter oder Klick.</p>' +
                '<h3>Tipps</h3><p>Schlafende Gegner nehmen mehr Schaden. Nasse Gegner leiten Blitze, gefrorene zerspringen. Alle fünf Etagen wartet ein Boss hinter einem Siegel. Händler kaufen Disketten, CDs und alte Festplatten. Und irgendwo zwischen dem Schrott soll ein Realitätskristall liegen …</p>' +
                '<h3>Tasten</h3><p>Pfeile/WASD (Q E Y C schräg) · Leertaste warten · Enter Treppe · I Rucksack · B Buch · X erkunden · R rasten · M Karte · Esc schliessen</p>';
        }
        panel.innerHTML = h;
        if (panelKind === 'book' && $('cmb-b')) { const l = D.EL_ORDER.filter(el => s.p.runes[el]); if (l[1]) $('cmb-b').value = l[1]; }
        if (panelKind === 'map') { const c = $('bigmap'); c.width = s.map.w * 10; c.height = s.map.h * 10; drawMap(c.getContext('2d'), 10); }
    }
    panel.addEventListener('click', e => {
        const b = e.target.closest('button[data-a]'); if (!b) return;
        const a = b.dataset.a, i = +b.dataset.i;
        if (a === 'close') return closePanel();
        if (a === 'use') { act(() => { G.use(i); }); return; }
        if (a === 'drop') { G.drop(i); return; }
        if (a === 'buy' || a === 'sell') {
            const r = a === 'buy' ? G.buy(i) : G.sell(i);
            renderPanel();
            if (r && r.msg) { const m = $('shop-msg'); if (m) { m.textContent = r.msg; m.className = 'dgn-msg is-bad'; } }
            return;
        }
        if (a === 'combine') {
            const r = G.combine($('cmb-a').value, $('cmb-b').value);
            bookMsg = r.ok ? { t: 'Neuer Zauber: „' + r.spell.n + '“' + (r.isNew ? ' – eine neue Seite!' : ''), ok: true } : { t: r.msg || '', ok: false };
            renderPanel();
            return;
        }
        if (a === 'lvl') { if (G.chooseLevel(b.dataset.k)) { A.sfx.power(); if (S().pendingLevel > 0) renderPanel(); else closePanel(); } }
    });
    panel.addEventListener('change', e => {
        const sel = e.target.closest('select[data-a="slot"]'); if (!sel) return;
        const s = S(), id = sel.dataset.id, v = +sel.value;
        if (v < 0) { const at = s.p.slots.indexOf(id); if (at >= 0) G.setSlot(at, null); }
        else G.setSlot(v, id);
        renderPanel();
    });

    /* ── Zielen ───────────────────────────────────────────────────────── */
    let tgt = null;
    function beginCast(slot) {
        const s = S(); if (!s || s.over) return;
        const id = s.p.slots[slot], sp = D.SPELLS[id];
        if (!sp) { openPanel('book'); return; }
        if (tgt && tgt.slot === slot) { confirmTarget(); return; }
        if (s.p.mp < sp.mp) { G.log('Nicht genug Mana für „' + sp.n + '“ (' + sp.mp + ' nötig).', 'bad'); sfx('miss'); return; }
        if (!G.needsTarget(sp)) { act(() => G.cast(slot, s.p.x, s.p.y)); return; }
        const a = G.autoTarget(id);
        tgt = { slot, id, sp, x: a.x, y: a.y, list: G.targetsFor(id), i: 0 };
        renderSpells(); updateTargetTip();
    }
    function cancelTarget() { if (!tgt) return; tgt = null; renderSpells(); setTip(''); }
    function moveTarget(dx, dy) { if (!tgt) return; tgt.x += dx; tgt.y += dy; updateTargetTip(); }
    function cycleTarget(dir) {
        if (!tgt || !tgt.list.length) return;
        tgt.i = (tgt.i + dir + tgt.list.length) % tgt.list.length;
        const m = tgt.list[tgt.i]; tgt.x = m.x; tgt.y = m.y; updateTargetTip();
    }
    function confirmTarget() {
        if (!tgt) return;
        const t = tgt;
        if (!G.validTarget(t.id, t.x, t.y)) { setTip('<b>' + esc(t.sp.n) + ':</b> Kein gültiges Ziel. (Esc bricht ab)'); sfx('miss'); return; }
        tgt = null; renderSpells(); setTip('');
        act(() => G.cast(t.slot, t.x, t.y));
    }
    function updateTargetTip() {
        if (!tgt) return;
        const ok = G.validTarget(tgt.id, tgt.x, tgt.y), d = tipFor(tgt.x, tgt.y);
        setTip('<b>' + esc(tgt.sp.n) + '</b> – Ziel wählen (Tab, Pfeile, Maus), Enter wirkt, Esc bricht ab. ' + (ok ? (d ? '→ ' + d : '') : '<span style="color:var(--danger)">ungültiges Ziel</span>'));
    }
    function drawTarget(ox, oy, t) {
        const s = S(), p = s.p, r = G.spellRange(tgt.sp);
        ctx.strokeStyle = 'rgba(196,181,253,.25)'; ctx.setLineDash([4, 4]);
        ctx.strokeRect(ox + (p.x - r) * TS, oy + (p.y - r) * TS, (r * 2 + 1) * TS, (r * 2 + 1) * TS);
        ctx.setLineDash([]);
        const ok = G.validTarget(tgt.id, tgt.x, tgt.y);
        const c = ok ? colOf(tgt.sp.el || tgt.sp.els[0]) : '#ef4444';
        ctx.strokeStyle = c; ctx.globalAlpha = .55; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ox + p.x * TS + 16, oy + p.y * TS + 16); ctx.lineTo(ox + tgt.x * TS + 16, oy + tgt.y * TS + 16); ctx.stroke();
        ctx.globalAlpha = 1;
        const pulse = 2 + Math.sin(t / 120) * 2;
        ctx.lineWidth = 2; ctx.strokeRect(ox + tgt.x * TS + 1 - pulse / 2, oy + tgt.y * TS + 1 - pulse / 2, TS - 2 + pulse, TS - 2 + pulse);
        if (tgt.sp.r && ok) {
            ctx.fillStyle = c; ctx.globalAlpha = .15;
            ctx.fillRect(ox + (tgt.x - tgt.sp.r) * TS, oy + (tgt.y - tgt.sp.r) * TS, (tgt.sp.r * 2 + 1) * TS, (tgt.sp.r * 2 + 1) * TS);
            ctx.globalAlpha = 1;
        }
    }

    /* ── Aktionen & Automatik ─────────────────────────────────────────── */
    function blocked() { const s = S(); return !s || s.over || ov.visible || (panelKind && panelKind !== 'inv'); }
    function act(fn) {
        if (!S() || S().over) return;
        if (now() < lockUntil) { pendingAct = fn; return; }
        fn();
    }
    function stepMove(dx, dy) {
        if (G.stuck()) { act(() => G.pass()); return; }
        act(() => { G.move(dx, dy); });
    }
    let auto = null, autoT = 0;
    function startAuto(kind, tx, ty) {
        stopAuto();
        const s = S(); if (!s || s.over) return;
        if (kind !== 'travel' && G.hostilesVisible().length) { G.log(kind === 'rest' ? 'Mit Feinden in Sichtweite kannst du nicht rasten.' : 'Nicht, solange Feinde in Sicht sind!', 'bad'); return; }
        if (kind === 'rest' && !G.needsRest()) { G.log('Du bist bereits ausgeruht.', 'info'); return; }
        G.takeInterrupt();
        auto = { kind, tx, ty, n: 0 };
        autoT = setInterval(autoStep, reduced() ? 40 : 75);
    }
    function stopAuto() { if (!auto) return; auto = null; clearInterval(autoT); }
    function autoStep() {
        const s = S();
        if (!auto || !s || s.over || ov.visible || panelKind || s.pendingLevel > 0) return stopAuto();
        if (now() < lockUntil) return;
        if (auto.n++ > 400) return stopAuto();
        if (auto.kind === 'rest') {
            if (!G.needsRest() || G.hostilesVisible().length) { if (!G.needsRest()) G.log('Du bist ausgeruht.', 'good'); return stopAuto(); }
            G.wait();
        } else {
            const st = auto.kind === 'explore' ? G.exploreStep() : G.travelStep(auto.tx, auto.ty);
            if (!st) {
                if (auto.kind === 'explore') G.log(s.map.seen[s.map.stairs.y * s.map.w + s.map.stairs.x] ? 'Hier gibt es nichts mehr zu entdecken. Die Treppe wartet.' : 'Nichts mehr zu erkunden, was du erreichen kannst.', 'info');
                return stopAuto();
            }
            const nx = s.p.x + st.dx, ny = s.p.y + st.dy, mon = G.monAt(nx, ny);
            if (mon && auto.kind === 'explore') return stopAuto();
            if (!G.move(st.dx, st.dy)) return stopAuto();
        }
        if (G.takeInterrupt()) stopAuto();
        else if (auto && auto.kind !== 'travel' && G.hostilesVisible().length) stopAuto();
    }

    /* ── Tastatur ─────────────────────────────────────────────────────── */
    const DIR = {
        ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], q: [-1, -1], e: [1, -1], y: [-1, 1], z: [-1, 1], c: [1, 1]
    };
    const NUM = { Numpad8: [0, -1], Numpad2: [0, 1], Numpad4: [-1, 0], Numpad6: [1, 0], Numpad7: [-1, -1], Numpad9: [1, -1], Numpad1: [-1, 1], Numpad3: [1, 1] };
    document.addEventListener('keydown', e => {
        const t = e.target;
        if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (document.querySelector('.modal, dialog[open]') && !stage.contains(t)) return;
        const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        const s = S();
        if (ov.visible) return;
        if (!s) return;
        const dir = NUM[e.code] || DIR[k];
        const game = dir || k === ' ' || k === 'Tab' || k === 'Enter' || /^[1-6]$/.test(k) || 'ibxrmh.'.includes(k) || k === 'Escape';
        if (!game) return;
        if (auto) { stopAuto(); if (k !== 'Escape') e.preventDefault(); return; }
        if (panelKind) {
            if (k === 'Escape' || (k === 'i' && panelKind === 'inv') || (k === 'b' && panelKind === 'book') || (k === 'm' && panelKind === 'map') || (k === 'h' && panelKind === 'help')) {
                if (panelKind !== 'level') { e.preventDefault(); closePanel(); }
                return;
            }
            if (panelKind === 'level' && /^[1-3]$/.test(k)) {
                const o = G.levelOptions(); if (o && o[+k - 1]) { e.preventDefault(); panel.querySelector('[data-k="' + o[+k - 1] + '"]').click(); }
            }
            return;
        }
        if (s.over) return;
        e.preventDefault();
        if (tgt) {
            if (dir) return moveTarget(dir[0], dir[1]);
            if (k === 'Tab') return cycleTarget(e.shiftKey ? -1 : 1);
            if (k === 'Enter' || k === ' ') return confirmTarget();
            if (k === 'Escape') return cancelTarget();
            if (/^[1-6]$/.test(k) && e.code.indexOf('Numpad') !== 0) return beginCast(+k - 1);
            return;
        }
        if (dir) return stepMove(dir[0], dir[1]);
        if (/^[1-6]$/.test(k) && e.code.indexOf('Numpad') !== 0) return beginCast(+k - 1);
        if (k === ' ' || k === '.' || e.code === 'Numpad5') return G.stuck() ? act(() => G.pass()) : act(() => G.wait());
        if (k === 'Enter') return act(() => { if (!G.onStairs()) { G.log('Hier ist keine Treppe.', 'info'); return; } G.descend(); });
        if (k === 'i') return openPanel('inv');
        if (k === 'b') return openPanel('book');
        if (k === 'm') return openPanel('map');
        if (k === 'h') return openPanel('help');
        if (k === 'x') return startAuto('explore');
        if (k === 'r') return startAuto('rest');
    });

    /* ── Maus & Touch ─────────────────────────────────────────────────── */
    function tileAt(e) {
        const p = A.pointer(cv, CW, CH, e);
        return { x: Math.floor(p.x / TS + cam.x), y: Math.floor(p.y / TS + cam.y) };
    }
    cv.addEventListener('mousemove', e => {
        const s = S(); if (!s) return;
        hover = tileAt(e);
        if (tgt) { tgt.x = hover.x; tgt.y = hover.y; updateTargetTip(); }
        else setTip(tipFor(hover.x, hover.y));
    });
    cv.addEventListener('mouseleave', () => { hover = null; if (!tgt) setTip(''); });
    cv.addEventListener('click', e => {
        const s = S(); if (!s || s.over || blocked()) return;
        stage.focus({ preventScroll: true });
        const c = tileAt(e);
        if (tgt) { tgt.x = c.x; tgt.y = c.y; confirmTarget(); return; }
        if (auto) { stopAuto(); return; }
        const dx = c.x - s.p.x, dy = c.y - s.p.y;
        if (dx === 0 && dy === 0) { if (G.onStairs()) act(() => G.descend()); else act(() => G.wait()); return; }
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) { stepMove(dx, dy); return; }
        if (!W.inB(s.map, c.x, c.y) || !s.map.seen[c.y * s.map.w + c.x]) return;
        startAuto('travel', c.x, c.y);
    });
    cv.addEventListener('contextmenu', e => { if (tgt) { e.preventDefault(); cancelTarget(); } });

    $('pad').addEventListener('click', e => {
        const b = e.target.closest('[data-dir]'); if (!b || blocked()) return;
        const [dx, dy] = b.dataset.dir.split(',').map(Number);
        if (tgt) { if (dx || dy) moveTarget(dx, dy); else confirmTarget(); return; }
        if (!dx && !dy) act(() => G.stuck() ? G.pass() : G.wait()); else stepMove(dx, dy);
    });
    $('spells').addEventListener('click', e => {
        const b = e.target.closest('[data-slot]'); if (!b || b.disabled || blocked()) return;
        beginCast(+b.dataset.slot); stage.focus({ preventScroll: true });
    });
    $('actions').addEventListener('click', e => {
        const b = e.target.closest('[data-cmd]'); if (!b) return;
        const s = S(), c = b.dataset.cmd;
        if (c === 'help') return panelKind === 'help' ? closePanel() : openPanel('help');
        if (!s || s.over || ov.visible) return;
        if (panelKind === c || (c === 'inv' && panelKind === 'inv')) return closePanel();
        if (panelKind === 'level') return;
        if (c === 'inv' || c === 'book' || c === 'map') return openPanel(c);
        closePanel();
        if (c === 'explore') return startAuto('explore');
        if (c === 'rest') return startAuto('rest');
        if (c === 'wait') return act(() => G.stuck() ? G.pass() : G.wait());
        if (c === 'stairs') return act(() => { if (!G.onStairs()) { G.log('Hier ist keine Treppe. Probier „Erkunden" oder die Karte.', 'info'); return; } G.descend(); });
    });

    /* ── Hauptschleife ────────────────────────────────────────────────── */
    function frame() {
        if (pendingAct && now() >= lockUntil) { const f = pendingAct; pendingAct = null; f(); }
        if (!document.hidden) draw();
        requestAnimationFrame(frame);
    }

    // Start: gespeicherten Lauf anbieten oder Menü zeigen
    renderClasses(); renderSide(); renderHud(); renderMini();
    showMenu();
    requestAnimationFrame(frame);
});
