/* ==========================================================================
   Mnemora – die grosse Pixel-Karte des Festlands (nach weltkarte-art.js laden)
   Gleiche Küstenlinie, Berge, Fluss und See wie auf der Weltkarte von Sektaria – nur viel näher.

   XIRU.mnemoraKarte.VIEW              → { x, y, w, h } Ausschnitt in Weltkoordinaten (passt zur SVG-Überlagerung)
   XIRU.mnemoraKarte.biome(wx, wy)     → 'meer' | 'see' | 'fluss' | 'strand' | 'ebene' | 'wald' | 'sumpf' | 'berg' | 'gipfel' | 'schnee' | 'asche' | 'steppe'
   XIRU.mnemoraKarte.render(canvas, onProgress(0…1)) → Promise  (zeichnet stückweise, damit ein Ladebildschirm mitlaufen kann)
   XIRU.mnemoraKarte.animate(canvas) → stop()   Leben auf der Karte (zweite Ebene über der Grundkarte, gleiche Pixelgrösse):
                                       Brandung an der Küste, fliessender Fluss, glühende Lava, Rauch über den Orten, Wolkenschatten, Vögel
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU, A = X.mapArt, L = A.LANDS[0], F = A.FESTLAND;
    const S = 4;   // Welteinheiten je Pixel

    /* Ausschnitt: Umriss von Mnemora plus Rand */
    const VIEW = (function () {
        const n = A.landPath(L).match(/-?\d+(?:\.\d+)?/g).map(Number);
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (let i = 0; i < n.length; i += 2) { x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]); y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]); }
        (F.PLACES || []).forEach(p => { x0 = Math.min(x0, p.x - 260); x1 = Math.max(x1, p.x + 260); });   // Platz für Ortsnamen am Rand
        const m = 150;
        return { x: Math.floor(x0 - m), y: Math.floor(y0 - m), w: Math.ceil(x1 - x0 + 2 * m), h: Math.ceil(y1 - y0 + 2 * m) };
    })();
    const CW = Math.ceil(VIEW.w / S), CH = Math.ceil(VIEW.h / S);

    /* ── Rauschen ── */
    function vnoise(seed) {
        const r = A.rng(seed), P = new Uint8Array(512), V = new Float32Array(256), perm = Array.from({ length: 256 }, (_, i) => i);
        for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)), t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
        for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
        for (let i = 0; i < 256; i++) V[i] = r();
        const fade = t => t * t * (3 - 2 * t);
        return (x, y) => {
            const xi = Math.floor(x), yi = Math.floor(y), u = fade(x - xi), v = fade(y - yi), h = (i, j) => V[P[(P[i & 255] + j) & 255]];
            const a = h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * u, b = h(xi, yi + 1) + (h(xi + 1, yi + 1) - h(xi, yi + 1)) * u;
            return a + (b - a) * v;
        };
    }
    const N1 = vnoise(4242), N2 = vnoise(909), N3 = vnoise(31337);
    const fbm = (x, y) => N1(x, y) * .55 + N1(x * 2.1, y * 2.1) * .3 + N1(x * 4.3, y * 4.3) * .15;
    function polyD(x, y, pts) {
        let best = 1e9;
        for (let i = 1; i < pts.length; i++) {
            const ax = pts[i - 1][0], ay = pts[i - 1][1], dx = pts[i][0] - ax, dy = pts[i][1] - ay, l2 = dx * dx + dy * dy;
            const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)), d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
            if (d < best) best = d;
        }
        return best;
    }
    const ell = (x, y, cx, cy, rx, ry) => Math.hypot((x - cx) / rx, (y - cy) / ry);

    /* ── Gelände an einem Punkt ── */
    function sample(wx, wy) {
        const t = A.tLand(L, wx, wy) + (N2(wx / 40, wy / 40) - .5) * .05;
        if (t >= 1) return { b: 'meer', t };
        if (ell(wx, wy, F.LAKE.x, F.LAKE.y, F.LAKE.rx, F.LAKE.ry) < 1) return { b: 'see', t };
        if (t < .96 && polyD(wx, wy, F.RIVER) < 7 + Math.max(0, wy - F.RIVER[0][1]) * .004) return { b: 'fluss', t };
        const n = fbm(wx / 180, wy / 180), dR = polyD(wx, wy, F.RIDGE);
        if (dR < 125 + (n - .5) * 130) return { b: dR < 42 + n * 34 || wy < 260 ? 'gipfel' : 'berg', t, dR };
        if (wy < 110 + (n - .5) * 260) return { b: 'schnee', t };
        if (t > .91 || (wx < 3560 && t > .8 + (n - .5) * .12)) return { b: 'strand', t };
        if (ell(wx, wy, 3600, 560, 330, 420) + (n - .5) * .4 < 1 || ell(wx, wy, 4540, 760, 210, 300) + (n - .5) * .45 < 1) return { b: 'wald', t };
        if (ell(wx, wy, 3790, 1965, 280, 175) + (n - .5) * .45 < 1) return { b: 'sumpf', t };
        if (ell(wx, wy, 4300, 1990, 300, 250) + (n - .5) * .4 < 1) return { b: 'asche', t };
        if (wx > 4300 + (n - .5) * 170 && wy > 1180) return { b: 'steppe', t };
        return { b: 'ebene', t };
    }
    const biome = (wx, wy) => sample(wx, wy).b;

    /* ── Farben (32-Bit-Palette wie die Weltkarte) ── */
    const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const C = {};
    Object.entries({
        deep: '#0a2442', mid: '#114a72', mid2: '#16598a', shal: '#2080a6', shal2: '#33a3b8', foam: '#c9f2ef',
        sand: '#e6cd92', sandL: '#f4e3ae', sandD: '#cdb37a', g1: '#74c453', g2: '#5aac43', g3: '#45923a', farm1: '#a9c95c', farm2: '#d0bd62',
        f1: '#245626', f2: '#1b441c', m1: '#5d6b45', m2: '#4a5a3a', mw: '#3d5a52',
        rock: '#8d8b80', rockD: '#64635a', rockL: '#b3b1a4', snow: '#eef3f7', snowD: '#c7d2dd', ice: '#bfe3f5',
        a1: '#3a3230', a2: '#2a2422', aL: '#5a4a44', ember: '#ff6a1f', lava: '#c2410c', s1: '#c9b458', s2: '#b39d45', s3: '#d9c56c'
    }).forEach(([k, v]) => { C[k] = hex(v); });
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
    const dith = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
    const pickD = (a, b, v, x, y) => v > dith(x, y) ? b : a;
    const shade = (c, f) => [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)];
    const CODE = { meer: 0, see: 1, fluss: 2, strand: 3, ebene: 4, wald: 5, sumpf: 6, berg: 7, gipfel: 8, schnee: 9, asche: 10, steppe: 11 };

    /* ── Pixel-Stempel ── */
    const STAMP = {
        pine: { s: ['..a..', '.aba.', '.aba.', 'abbba', 'aabaa', '..c..'], c: { a: '#14361a', b: '#3f9a3c', c: '#6b4423' } },
        bush: { s: ['.aa.', 'abba', '.aa.'], c: { a: '#2a6a2c', b: '#3f8f3c' } },
        mount: { s: ['....b....', '...bbb...', '..bbcbb..', '..ccccd..', '.cccccdd.', 'ccccccddd'], c: { b: '#eef3f7', c: '#8d8b80', d: '#5d5c55' } },
        big: { s: ['......b......', '.....bbb.....', '....bbbbb....', '...bbcbcbb...', '...cccccddd..', '..ccccccdddd.', '.cccccccddddd', 'cccccccdddddd'], c: { b: '#eef3f7', c: '#8d8b80', d: '#5d5c55' } },
        reed: { s: ['a.a', 'a.a', 'aba'], c: { a: '#8a7a3a', b: '#4a5a3a' } },
        tuft: { s: ['a.a', '.a.'], c: { a: '#9a7a32' } },
        ember: { s: ['a', 'b'], c: { a: '#ffb347', b: '#ff6a1f' } },
        city: { s: ['...r....r...', '..rrr..rrr..', '..wkw..wkw..', 'r.www.rwwwr.', 'rr...rrrrrr.', 'wkwr.wkwwkw.', 'www..wwwwww.'], c: { r: '#c0392b', w: '#f4e3ae', k: '#3a2618' } },
        harbor: { s: ['..r..r....', '.rrrrrr...', '.wkwwkw...', '.wwwwww...', 'nnnnnnnnnn', '...n...n..'], c: { r: '#b45309', w: '#f4e3ae', k: '#3a2618', n: '#7a5a32' } },
        ruin: { s: ['a.a...a.', 'a.a.a.a.', 'a.aaa.a.', 'aaaaaaaa', '.a..a..a'], c: { a: '#9aa0aa' } },
        tower: { s: ['.rr.', 'rrrr', '.ww.', '.wk.', '.ww.', 'wwww'], c: { r: '#b91c1c', w: '#e7d7b0', k: '#3a2618' } },
        hut: { s: ['..r..', '.rrr.', 'rrrrr', '.wkw.', '.www.'], c: { r: '#7c2d12', w: '#e2e8f0', k: '#1f2937' } }
    };
    /* k = Vergrösserung (Orte werden doppelt gross gestempelt, damit man sie gezoomt gut sieht) */
    function stamp(D, name, px, py, k) {
        const st = STAMP[name]; if (!st) return;
        k = k || 1;
        const h = st.s.length, w = Math.max.apply(null, st.s.map(r => r.length));
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const ch = st.s[y][x] || '.'; if (ch === '.' || !st.c[ch]) continue;
            const c = hex(st.c[ch]);
            for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) {
                const X2 = px - ((w * k) >> 1) + x * k + i, Y2 = py - h * k + 1 + y * k + j; if (X2 < 0 || Y2 < 0 || X2 >= CW || Y2 >= CH) continue;
                const o = (Y2 * CW + X2) * 4; D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = 255;
            }
        }
    }
    Object.assign(STAMP, {
        harborBig: { s: [
            '.......r..r...........', '......rrrrrr..r.......', '......wkwwkw.rrr......', '..r...wwwwww.wkw...l..', '.rrr..........www..lwl.',
            '.wkw.nnnnnnnnnnnnnn..wlw', '.www.n....n....n....lll.', '.....n....n....n.......', 'bbbbbb...hhhhhhhhh.....', '.bbbb....hcchcchch.....', '..........hhhhhhh......'],
            c: { r: '#b45309', w: '#f4e3ae', k: '#3a2618', n: '#7a5a32', l: '#e04848', b: '#f1f5f9', h: '#cfc7b4', c: '#22d3ee' } },
        cityBig: { s: [
            'ssssssssssssssssssss', 's..r....rr.....r...s', 's.rrr..rrrr...rrr..s', 's.wkw..wkkw...wkw..s', 's.www..wwww...www..s',
            's.......ff.........s', 's..rr..ffff..rrr...s', 's.rrrr..ff..rrrrr..s', 's.wkkw......wkwkw..s', 'ssssssss..ssssssssss'],
            c: { s: '#9aa0aa', r: '#c0392b', w: '#f4e3ae', k: '#3a2618', f: '#2080a6' } },
        towerBig: { s: ['..rr..', '.rrrr.', 'rrrrrr', '.gggg.', '.gkkg.', '.gggg.', '.gggg.', '.gkgg.', 'gggggg'], c: { r: '#b91c1c', g: '#9aa0aa', k: '#1f2937' } },
        bigTree: { s: ['...gggg...', '.ggyggggg.', 'gggggggyggg', 'ggyggggggg.', '.gggggyggg.', '..ggggggg..', '....tt.....', '....tt.....', '...tttt....'], c: { g: '#2f7a33', y: '#fde68a', t: '#5a3818' } },
        lakeVillage: { s: ['..r....r..', '.rrr..rrr.', '.wkw..wkw.', 'nnnnnnnnnn', '.n..n..n..'], c: { r: '#7c2d12', w: '#e2e8f0', k: '#1f2937', n: '#7a5a32' } },
        moorHuts: { s: ['..mm....mm.', '.mmmm..mmmm', '.wkww..wwkw', '.n..n..n..n', '.n..n..n..n'], c: { m: '#4a5a3a', w: '#8a7a5a', k: '#1f2937', n: '#3a2e24' } },
        frostHut: { s: ['.....ss.', '..eeee..', '.eeeeee.', 'eeeeeeee', '.wwkwww.', '.wwkwww.'], c: { s: '#64635a', e: '#eef3f7', w: '#8a5a30', k: '#1f2937' } },
        mine: { s: ['..aaaaaa..', '.aaaaaaaa.', 'aatkkkkta.', 'aatkkkkta.', '..tkkkkt..', '.c..rr..c.'], c: { a: '#64635a', t: '#a8743f', k: '#0b0d14', c: '#22d3ee', r: '#7a786e' } },
        monoliths: { s: ['.m..m..m.', '.m.mmm.m.', 'mm.mmm.mm', 'mm.....mm', 'mm.mmm.mm', '.m.mmm.m.', '.m..m..m.'], c: { m: '#1f2430' } },
        citadel: { s: ['a..a..aa..a..a', 'aa.aa.aa.aa.aa', 'aaaaaaaaaaaaaa', 'aaaaakkkkaaaaa', 'aaaakkrrkkaaaa', 'aaaakkkkkkaaaa', 'aaaakkkkkkaaaa'], c: { a: '#3a3230', k: '#0b0606', r: '#ef4444' } }
    });
    const PLACE_STAMP = { hafen: 'harborBig', stadt: 'cityBig', ruine: 'citadel', wacht: 'towerBig', kap: 'frostHut', see: 'lakeVillage', wald: 'bigTree', moor: 'moorHuts', berg: 'mine', steppe: 'monoliths' };

    function render(canvas, onProgress) {
        canvas.width = CW; canvas.height = CH;
        const ctx = canvas.getContext('2d'), img = ctx.createImageData(CW, CH), D = img.data;
        const B = new Uint8Array(CW * CH), T = new Float32Array(CW * CH), H = new Float32Array(CW * CH);
        const rnd = A.rng(2024);
        return new Promise(resolve => {
            let y = 0;
            const ROWS = 36;
            function pass1() {
                const end = Math.min(CH, y + ROWS);
                for (; y < end; y++) for (let x = 0; x < CW; x++) {
                    const wx = VIEW.x + x * S + S / 2, wy = VIEW.y + y * S + S / 2, k = y * CW + x, s = sample(wx, wy);
                    B[k] = CODE[s.b]; T[k] = s.t;
                    H[k] = s.t < 1 ? (1 - s.t) * 1.3 + (fbm(wx / 150, wy / 150) - .5) * .6 + (s.dR != null ? Math.max(0, 1 - s.dR / 200) * 1.2 : 0) : 0;
                }
                if (onProgress) onProgress(y / CH * .8);
                if (y < CH) return setTimeout(pass1, 0);
                pass2();
            }
            function set(k, c) { D[k * 4] = c[0]; D[k * 4 + 1] = c[1]; D[k * 4 + 2] = c[2]; D[k * 4 + 3] = 255; }
            function pass2() {
                const reg = (X.mnemora && X.mnemora.place('registra')) || { x: 3700, y: 1235 };
                for (let yy = 0; yy < CH; yy++) for (let x = 0; x < CW; x++) {
                    const k = yy * CW + x, b = B[k], t = T[k], wx = VIEW.x + x * S, wy = VIEW.y + yy * S;
                    let c;
                    if (b === 0) {   // Meer in Tiefenstufen, Gischt an der Küste
                        if (t < 1.025) c = pickD(C.foam, C.shal2, .55, x, yy);
                        else if (t < 1.1) c = C.shal2;
                        else if (t < 1.22) c = pickD(C.shal2, C.shal, (t - 1.1) / .12, x, yy);
                        else if (t < 1.4) c = pickD(C.shal, C.mid2, (t - 1.22) / .18, x, yy);
                        else if (t < 1.75) c = pickD(C.mid2, C.mid, (t - 1.4) / .35, x, yy);
                        else c = pickD(C.mid, C.deep, Math.min(1, (t - 1.75) / .3), x, yy);
                        set(k, c); continue;
                    }
                    if (b === 1) { const lk = ell(wx, wy, F.LAKE.x, F.LAKE.y, F.LAKE.rx, F.LAKE.ry); set(k, lk > .82 ? C.shal2 : lk > .55 ? pickD(C.shal, C.shal2, (lk - .55) * 3.7, x, yy) : C.mid2); continue; }
                    if (b === 2) { set(k, (x + yy) % 5 ? C.shal : C.shal2); continue; }
                    const n = N3(wx / 60, wy / 60);
                    switch (b) {
                        case 3: c = (yy + Math.floor(x / 3)) % 6 === 0 ? C.sandD : pickD(C.sand, C.sandL, n, x, yy); break;
                        case 4: {
                            const dr = Math.hypot(wx - reg.x, wy - reg.y);
                            c = dr < 280 && dr > 70 ? ((Math.floor((wx + wy * .4) / 22) % 2) ? pickD(C.farm1, C.g1, n * .6, x, yy) : pickD(C.farm2, C.farm1, n * .5, x, yy)) : pickD(C.g2, C.g1, n, x, yy);
                            break;
                        }
                        case 5: c = pickD(C.f2, C.f1, n, x, yy); break;
                        case 6: c = N2(wx / 70, wy / 70) > .6 ? C.mw : pickD(C.m2, C.m1, n, x, yy); break;
                        case 7: c = pickD(C.rockD, C.rock, n * 1.2, x, yy); break;
                        case 8: c = pickD(C.snowD, C.snow, n * 1.3, x, yy); break;
                        case 9: c = N2(wx / 90, wy / 90) > .7 ? C.ice : pickD(C.snowD, C.snow, n * 1.2, x, yy); break;
                        case 10: c = Math.abs(N2(wx / 55, wy / 55) - .5) < .03 ? C.lava : pickD(C.a2, C.a1, n, x, yy); break;
                        case 11: c = pickD(C.s2, n > .6 ? C.s3 : C.s1, n, x, yy); break;
                        default: c = C.g1;
                    }
                    // Licht von oben links
                    if (x && yy) { const d = H[k] - H[k - CW - 1]; if (d > .02) c = shade(c, 1.1); else if (d < -.02) c = shade(c, .84); }
                    set(k, c);
                }
                if (onProgress) onProgress(.9);
                setTimeout(pass3, 0);
            }
            function pass3() {   // Bäume, Berge, Schilf, Glut, Grasbüschel
                for (let yy = 4; yy < CH; yy += 4) for (let x = 2; x < CW - 2; x += 4) {
                    const ox = x + Math.floor(rnd() * 3) - 1, oy = yy + Math.floor(rnd() * 3) - 1, k = oy * CW + ox, b = B[k], r = rnd();
                    if (b === 5 && r < .62) stamp(D, 'pine', ox, oy);
                    else if (b === 4 && r < .025) stamp(D, 'bush', ox, oy);
                    else if (b === 6 && r < .22) stamp(D, 'reed', ox, oy);
                    else if (b === 10 && r < .06) stamp(D, 'ember', ox, oy);
                    else if (b === 11 && r < .14) stamp(D, 'tuft', ox, oy);
                    else if (b === 7 && r < .07) stamp(D, 'mount', ox, oy + 3);
                }
                // Grosse Gipfel entlang des Gebirgskamms
                const R = F.RIDGE;
                for (let i = 1; i < R.length; i++) {
                    const ax = R[i - 1][0], ay = R[i - 1][1], dx = R[i][0] - ax, dy = R[i][1] - ay, len = Math.hypot(dx, dy);
                    for (let d = 0; d < len; d += 85) {
                        const wx = ax + dx * d / len + (rnd() - .5) * 60, wy = ay + dy * d / len;
                        stamp(D, rnd() < .5 ? 'big' : 'mount', Math.round((wx - VIEW.x) / S), Math.round((wy - VIEW.y) / S) + 4);
                    }
                }
                // Orte
                ((X.mnemora && X.mnemora.PLACES) || []).forEach(p => { const sn = PLACE_STAMP[p.kind]; if (sn && p.x != null) stamp(D, sn, Math.round((p.x - VIEW.x) / S), Math.round((p.y - VIEW.y) / S) + 9, 2); });
                ctx.putImageData(img, 0, 0);
                // Für die Animation: Küste, Fluss, Lava, Seeufer (je jedes zweite Pixel reicht)
                const coast = [], river = [], lava = [], lake = [];
                for (let yy = 0; yy < CH; yy += 2) for (let x = 0; x < CW; x += 2) {
                    const k = yy * CW + x, b = B[k];
                    if (b === 0 && T[k] < 1.07) coast.push(x, yy); else if (b === 2) river.push(x, yy); else if (b === 1) lake.push(x, yy);
                    else if (b === 10) { const c = D[k * 4]; if (c > 150) lava.push(x, yy); }
                }
                LIFE = { coast: Int16Array.from(coast), river: Int16Array.from(river), lava: Int16Array.from(lava), lake: Int16Array.from(lake) };
                if (onProgress) onProgress(1);
                resolve(canvas);
            }
            pass1();
        });
    }

    /* ── Leben auf der Karte ── */
    let LIFE = null;
    function animate(cv) {
        cv.width = CW; cv.height = CH;
        const g = cv.getContext('2d'), places = ((X.mnemora && X.mnemora.PLACES) || []).filter(p => p.x != null);
        const R = A.rng(77), clouds = Array.from({ length: 5 }, () => ({ x: R() * CW, y: R() * CH, rx: 40 + R() * 60, ry: 18 + R() * 24, v: 2 + R() * 3 }));
        const birds = Array.from({ length: 4 }, () => ({ x: R() * CW, y: R() * CH, v: 9 + R() * 7, ph: R() * 6 }));
        let t0 = performance.now(), timer = 0;
        function frame() {
            if (document.hidden) return;
            const f = (performance.now() - t0) / 1000, fr = Math.floor(f * 4);
            g.clearRect(0, 0, CW, CH);
            if (LIFE) {
                // Brandung: helle Punkte wandern die Küste entlang
                g.fillStyle = 'rgba(235,252,255,.75)';
                const C2 = LIFE.coast; for (let i = (fr % 6) * 2; i < C2.length; i += 12) g.fillRect(C2[i], C2[i + 1], 1, 1);
                // Fluss fliesst (Muster wandert)
                g.fillStyle = 'rgba(201,242,239,.8)';
                const Rv = LIFE.river; for (let i = 0; i < Rv.length; i += 2) if ((Rv[i] + Rv[i + 1] * 2 + fr) % 7 === 0) g.fillRect(Rv[i], Rv[i + 1], 1, 1);
                g.fillStyle = 'rgba(201,242,239,.5)';
                const Lk = LIFE.lake; for (let i = (fr % 9) * 2; i < Lk.length; i += 18) g.fillRect(Lk[i], Lk[i + 1], 2, 1);
                // Lava glüht
                const Lv = LIFE.lava; g.fillStyle = fr % 2 ? 'rgba(255,179,71,.9)' : 'rgba(255,106,31,.6)'; for (let i = (fr % 3) * 2; i < Lv.length; i += 6) g.fillRect(Lv[i], Lv[i + 1], 1, 1);
            }
            // Rauch über bewohnten Orten
            places.forEach((p, n) => {
                if (!/hafen|stadt|kap|see|moor/.test(p.kind)) return;
                const px = Math.round((p.x - VIEW.x) / S), py = Math.round((p.y - VIEW.y) / S) - 14;
                for (let k = 0; k < 3; k++) { const tt = (f * .35 + k / 3 + n * .13) % 1; g.fillStyle = 'rgba(226,232,240,' + (.55 * (1 - tt)).toFixed(2) + ')'; g.fillRect(px + 3 + Math.round(Math.sin(tt * 5 + n) * 2), py - Math.round(tt * 14), 2, 2); }
            });
            // Wolkenschatten ziehen über das Land
            g.fillStyle = 'rgba(10,20,40,.13)';
            clouds.forEach(c => {
                const x = ((c.x + f * c.v) % (CW + 2 * c.rx)) - c.rx;
                for (let yy = -c.ry; yy <= c.ry; yy += 2) { const w = Math.round(c.rx * Math.sqrt(1 - (yy / c.ry) ** 2)); g.fillRect(Math.round(x - w), Math.round(c.y + yy), w * 2, 2); }
            });
            // Vögel
            g.fillStyle = '#1f2937';
            birds.forEach(b => {
                const x = ((b.x + f * b.v) % (CW + 20)) - 10, y = b.y + Math.sin(f + b.ph) * 6, up = Math.floor(f * 4 + b.ph) % 2;
                g.fillRect(Math.round(x) - 2, Math.round(y) - up, 2, 1); g.fillRect(Math.round(x), Math.round(y), 1, 1); g.fillRect(Math.round(x) + 1, Math.round(y) - up, 2, 1);
            });
        }
        if (X.setting('anim') !== false) { frame(); timer = setInterval(frame, 220); }
        return () => clearInterval(timer);
    }

    X.mnemoraKarte = { VIEW, S, CW, CH, biome, render, animate };
})();
