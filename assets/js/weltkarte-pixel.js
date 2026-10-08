/* ==========================================================================
   Sektaria – die Weltkarte im 32-Bit-Pixelstil
   (nach weltkarte-art.js laden; nutzt dessen Inselformen und Zeichnungen)

   XIRU.mapPix.mount(host, opts) → Kamera mit Pixel-Karte und gestochen scharfer Überlagerung
     opts: discovered(id), visitedSecret, labels (true), unknown (true), anim (true), view [x, y, w, h], fit 'contain'|'cover'
     Rückgabe: { cam, ov (SVG in Weltkoordinaten, ganze Welt A.BOUNDS), layer(name), setView(x, y, w, h, fit), view(), toWorld(cx, cy),
                 fog(id), revealFog(id), ready (Promise), destroy() }
   Die Welt ist grösser als der Archipel (0…2400 × 0…1600): rundherum liegt die Nebelsee mit einer
   Nebelwand (eigene, gröbere Pixel-Ebene) und dahinter im Osten der Umriss des Festlands Mnemora.
   XIRU.mapPix.base() → Promise<canvas>  (Grundkarte der ganzen Welt, 3 Einheiten je Pixel, je Sitzung zwischengespeichert)
   XIRU.mapPix.sprite(svgInner, vb, pw, ph) → Promise<canvas>  (SVG → scharfes Pixel-Sprite mit Umriss)
   XIRU.mapPix.mechSprite(canvas, f, loadout) – zeichnet den Mech als Pixel-Figur in ein Canvas
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU, A = X.mapArt, W = A.W, H = A.H, S = 3;
    const BX = A.BOUNDS.x, BY = A.BOUNDS.y, BW = A.BOUNDS.w, BH = A.BOUNDS.h, CW = Math.ceil(BW / S), CH = Math.ceil(BH / S);
    const NS = 'http://www.w3.org/2000/svg', VERSION = 'v5';
    /* Klarer Bereich um den Archipel: ausserhalb dieser Ellipse beginnt die Nebelwand */
    const CLR = { x: 1180, y: 820, rx: 1360, ry: 1080 };
    const clearE = (wx, wy) => Math.hypot((wx - CLR.x) / CLR.rx, (wy - CLR.y) / CLR.ry);
    /* Landmassen hinter der Nebelwand (Mnemora + zwei namenlose Länder) */
    const LANDS = A.LANDS, F = A.FESTLAND;
    const LBOX = LANDS.map(L => [Math.min(L.x - L.rx * 1.45, L.px - L.prx * 1.4), Math.min(L.y - L.ry * 1.35, L.py - L.pry * 1.4), Math.max(L.x + L.rx * 1.45, L.px + L.prx * 1.4), Math.max(L.y + L.ry * 1.35, L.py + L.pry * 1.4)]);
    const inBox = (b, x, y) => x > b[0] && x < b[2] && y > b[1] && y < b[3];
    const landAt = (wx, wy) => { for (let i = 0; i < LANDS.length; i++) if (inBox(LBOX[i], wx, wy) && A.tLand(LANDS[i], wx, wy) < 1) return i; return -1; };
    /* Abstand zu einem Linienzug (Gebirgskamm, Fluss) */
    function polyD(x, y, pts) {
        let best = 1e9;
        for (let i = 1; i < pts.length; i++) {
            const ax = pts[i - 1][0], ay = pts[i - 1][1], dx = pts[i][0] - ax, dy = pts[i][1] - ay, l2 = dx * dx + dy * dy;
            const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)), d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
            if (d < best) best = d;
        }
        return best;
    }
    const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
    const dith = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

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
    const N1 = vnoise(77), N2 = vnoise(1234);
    const fbm = (x, y) => N1(x, y) * .55 + N1(x * 2.1, y * 2.1) * .3 + N1(x * 4.3, y * 4.3) * .15;

    /* ── Inseln (gleiche Phasen wie die Vektor-Küste) ── */
    const ISL = (X.islands || []).map(i => { const r = A.rng(A.hash(i.id)); return Object.assign({}, i, { ph: [r() * 6.3, r() * 6.3, r() * 6.3], R: i.s * 1.06 }); });
    function tOf(isl, wx, wy) {
        const dx = wx - isl.x, dy = (wy - isl.y) / .78, a = Math.atan2(dy, dx);
        const k = 1 + .13 * Math.sin(3 * a + isl.ph[0]) + .08 * Math.sin(5 * a + isl.ph[1]) + .05 * Math.sin(9 * a + isl.ph[2]);
        return Math.hypot(dx, dy) / (isl.R * k);
    }

    /* ── Farben (32-Bit-Palette) ── */
    const C = {};
    Object.entries({
        deep: '#0a2442', deep2: '#0d2c50', mid: '#114a72', mid2: '#16598a', shal: '#2080a6', shal2: '#33a3b8', foam: '#c9f2ef', abyss: '#061a2e',
        sandD: '#b8955a', sand: '#e6cd92', sandL: '#f4e3ae', wet: '#cdb37a',
        g1: '#74c453', g2: '#5aac43', g3: '#45923a', f1: '#2f702c', f2: '#235a23',
        rock: '#8d8b80', rockD: '#64635a', rockL: '#b3b1a4', snow: '#eef3f7', snowD: '#c7d2dd',
        stone: '#7c818c', stoneD: '#5d626e', dry: '#a9b05f', dryD: '#8c9449', dark: '#0b0d14'
    }).forEach(([k, v]) => { C[k] = hex(v); });
    const shade = (c, f) => [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)];
    const pickD = (a, b, v, x, y) => v > dith(x, y) ? b : a;   // gedithert zwischen zwei Farben

    const TREE = {
        pine: { s: ['..a..', '.aba.', '.aba.', 'abbba', 'aabaa', '..c..'], c: { a: '#1d4d22', b: '#2f7a32', c: '#5a3a1e' } },
        palm: { s: ['aa.aa', '.aba.', 'a.c.a', '..c..', '..c..'], c: { a: '#2f8a3a', b: '#4fb058', c: '#7a5a32' } },
        bush: { s: ['.aa.', 'abba', '.aa.'], c: { a: '#2a6a2c', b: '#3f8f3c' } },
        rock: { s: ['.aa.', 'abba', 'aaaa'], c: { a: '#5e5e55', b: '#a3a294' } },
        crys: { s: ['.a.', 'aba', 'aba', '.a.'], c: { a: '#0e7490', b: '#67e8f9' } }
    };

    /* Gebirge und Siedlungen auf Mnemora (Pixel-Stempel) */
    const MOUNT = {
        small: { s: ['....b....', '...bbb...', '..bbcbb..', '..ccccd..', '.cccccdd.', 'ccccccddd'], c: { b: '#eef3f7', c: '#8d8b80', d: '#5d5c55' } },
        big: { s: ['......b......', '.....bbb.....', '....bbbbb....', '...bbcbcbb...', '...cccccddd..', '..ccccccdddd.', '.cccccccddddd', 'cccccccdddddd'], c: { b: '#eef3f7', c: '#8d8b80', d: '#5d5c55' } },
        city: { s: ['...r....r...', '..rrr..rrr..', '..wkw..wkw..', 'r.www.rwwwr.', 'rr...rrrrrr.', 'wkwr.wkwwkw.', 'www..wwwwww.'], c: { r: '#c0392b', w: '#f4e3ae', k: '#3a2618' } },
        harbor: { s: ['..r..r....', '.rrrrrr...', '.wkwwkw...', '.wwwwww...', 'nnnnnnnnnn', '...n...n..'], c: { r: '#b45309', w: '#f4e3ae', k: '#3a2618', n: '#7a5a32' } },
        ruin: { s: ['a.a...a.', 'a.a.a.a.', 'a.aaa.a.', 'aaaaaaaa', '.a..a..a'], c: { a: '#9aa0aa' } }
    };

    /* ── Grundkarte berechnen ── */
    function terrain() {
        const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
        const ctx = cv.getContext('2d'), img = ctx.createImageData(CW, CH), D = img.data;
        const T = new Float32Array(CW * CH), O = new Int8Array(CW * CH).fill(-1), HH = new Float32Array(CW * CH);
        const boxes = ISL.map(i => [i.x - i.R * 2.9, i.y - i.R * 2.3, i.x + i.R * 2.9, i.y + i.R * 2.3]), L0 = ISL.length, FEST = L0;
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
            const wx = x * S + 1.5 + BX, wy = y * S + 1.5 + BY, k = y * CW + x;
            let tm = 9, own = -1, anyL = false;
            for (let i = 0; i < LANDS.length; i++) if (inBox(LBOX[i], wx, wy)) { anyL = true; const t = A.tLand(LANDS[i], wx, wy); if (t < tm) { tm = t; own = L0 + i; } }
            if (!anyL && clearE(wx, wy) > 1.35) { T[k] = 9; O[k] = -1; continue; }   // tief in der Nebelsee: nur Wasser
            for (let n = 0; n < ISL.length; n++) { const b = boxes[n]; if (wx < b[0] || wx > b[2] || wy < b[1] || wy > b[3]) continue; const t = tOf(ISL[n], wx, wy); if (t < tm) { tm = t; own = n; } }
            tm += (N2(wx / 38, wy / 38) - .5) * (own >= L0 ? .05 : .09);
            T[k] = tm; O[k] = own;
            if (tm < 1) {
                if (own >= L0) {
                    let h = (1 - tm) * 1.7 + (fbm(wx / 160, wy / 160) - .5) * .5;
                    if (own === FEST) h += Math.max(0, 1 - polyD(wx, wy, F.RIDGE) / 250) * 1.05;   // Speicherberge
                    HH[k] = h;
                } else HH[k] = (1 - tm) + (fbm(wx / 120, wy / 120) - .5) * .34;
            }
        }
        const set = (k, c) => { D[k * 4] = c[0]; D[k * 4 + 1] = c[1]; D[k * 4 + 2] = c[2]; D[k * 4 + 3] = 255; };
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
            const k = y * CW + x, t = T[k], wx = x * S + BX, wy = y * S + BY;
            if (t >= 1) {   // Wasser in Tiefenstufen, sanft gedithert
                if (t >= 9) { set(k, C.abyss); continue; }
                const vig = Math.min(1, clearE(wx, wy) * .62);
                let c;
                if (t < 1.1) c = C.shal2;
                else if (t < 1.24) c = pickD(C.shal2, C.shal, (t - 1.1) / .14, x, y);
                else if (t < 1.42) c = pickD(C.shal, C.mid2, (t - 1.24) / .18, x, y);
                else if (t < 1.75) c = pickD(C.mid2, C.mid, (t - 1.42) / .33, x, y);
                else { const n = fbm(wx / 260, wy / 260); c = pickD(C.mid, n > .5 ? C.deep2 : C.deep, Math.min(1, (t - 1.75) / .3), x, y); }
                if (vig > .62) c = pickD(c, C.abyss, (vig - .62) * 2.2, x, y);
                set(k, c);
                continue;
            }
            const isl = ISL[O[k]] || LANDS[O[k] - ISL.length] || { art: 'festland' }, h = HH[k], hn = y && x ? (HH[k - CW - 1] || h) : h, art = isl.art;
            if (O[k] === FEST && t < .9) {   // Mnemora: Bitbrunner See und Flashfluss
                const lk = Math.hypot((wx - F.LAKE.x) / F.LAKE.rx, (wy - F.LAKE.y) / F.LAKE.ry);
                if (lk < 1) { set(k, lk > .82 ? C.shal2 : lk > .55 ? pickD(C.shal, C.shal2, (lk - .55) * 3.7, x, y) : C.mid2); continue; }
                if (polyD(wx, wy, F.RIVER) < 8 + (wy - F.RIVER[0][1]) * .004) { set(k, (x + y) % 5 ? C.shal : C.shal2); continue; }
            }
            const light = hn - h > .018 ? .84 : h - hn > .018 ? 1.1 : 1;   // Licht von oben links
            let c;
            if (t > .9) c = pickD(C.sandL, C.sand, (t - .9) / .06, x, y);
            else if (t > .84 && art !== 'ruinen') c = pickD(C.sand, C.g1, (.9 - t) / .06, x, y);
            else if (art === 'mine') c = h > .62 ? pickD(C.snowD, C.snow, (h - .62) * 8, x, y) : h > .3 ? pickD(C.rockD, C.rock, (h - .3) * 3, x, y) : pickD(C.g3, C.g2, h * 3, x, y);
            else if (art === 'ruinen') c = t > .86 ? C.wet : pickD(C.stoneD, C.stone, h * 1.6, x, y);
            else if (art === 'wrack') c = h > .45 ? pickD(C.g2, C.g1, (h - .45) * 4, x, y) : pickD(C.wet, C.sand, h * 2.2, x, y);
            else if (art === 'arena') c = pickD(C.dryD, C.dry, h * 1.8, x, y);
            else if (art === 'schmiede') c = h > .5 ? pickD(C.rockD, C.rock, (h - .5) * 4, x, y) : pickD(C.g3, C.g2, h * 2, x, y);
            else if (art === 'tundra') c = h > .75 ? pickD(C.snowD, C.snow, (h - .75) * 3, x, y) : h > .38 ? pickD(C.rockD, C.snowD, (h - .38) * 2.7, x, y) : pickD(C.f2, C.rockD, h * 2.6, x, y);
            else if (art === 'wueste') c = h > .85 ? pickD(C.rockD, C.rock, (h - .85) * 3, x, y) : h > .4 ? pickD(C.sandD, C.dryD, (h - .4) * 2.2, x, y) : pickD(C.sand, C.sandD, h * 2.5, x, y);
            else if (art === 'festland') c = h > 1.15 ? pickD(C.snowD, C.snow, (h - 1.15) * 6, x, y) : h > .85 ? pickD(C.rockD, C.rock, (h - .85) * 3.3, x, y) : h > .45 ? pickD(C.f2, C.f1, (h - .45) * 2.5, x, y) : h > .18 ? pickD(C.g3, C.f1, (h - .18) * 3.7, x, y) : pickD(C.g1, C.g2, h * 5.5, x, y);
            else c = h < .3 ? pickD(C.g1, C.g2, h / .3, x, y) : h < .52 ? pickD(C.g2, C.g3, (h - .3) / .22, x, y) : pickD(C.g3, C.f1, (h - .52) / .12, x, y);
            set(k, shade(c, light));
        }
        // Gischt an der Küste, Schatten im Wasser unten rechts, dunkle Kante unten an der Küste
        const land = k => T[k] < 1;
        for (let y = 1; y < CH - 1; y++) for (let x = 1; x < CW - 1; x++) {
            const k = y * CW + x;
            if (!land(k)) {
                if (land(k - 1) || land(k + 1) || land(k - CW) || land(k + CW)) set(k, (x + y) % 3 ? C.foam : C.shal2);
                else if (land(k - CW - 1) || land(k - 2 * CW - 2 >= 0 ? k - 2 * CW - 2 : k)) { D[k * 4] *= .78; D[k * 4 + 1] *= .82; D[k * 4 + 2] *= .86; }
            } else if (!land(k + CW)) set(k, C.sandD);
        }
        // Wellenkämme im tiefen Wasser
        const wr = A.rng(4711);
        for (let n = 0; n < 4200; n++) {
            const x = Math.floor(wr() * (CW - 4)), y = Math.floor(wr() * CH), k = y * CW + x;
            if (T[k] < 1.5 || T[k + 3] < 1.5 || clearE(x * S + BX, y * S + BY) > 1.05) continue;
            const c = shade([D[k * 4], D[k * 4 + 1], D[k * 4 + 2]], 1.35);
            set(k, c); set(k + 1, shade(c, 1.12)); set(k + 2, c);
        }
        // Pflanzen, Felsen, Blumen (nicht auf dem Wahrzeichen)
        const stamp = (spr, px, py) => spr.s.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.') continue; const xx = px + i, yy = py + j; if (xx < 0 || yy < 0 || xx >= CW || yy >= CH) continue; set(yy * CW + xx, hex(spr.c[ch])); } });
        ISL.forEach((isl, n) => {
            const r = A.rng(A.hash(isl.id) + 5), cnt = Math.round(isl.R * isl.R / 300);
            const lx = isl.x, ly = isl.y - isl.s * .08, lr = isl.s * .62;
            for (let q = 0; q < cnt * 3; q++) {
                const a = r() * Math.PI * 2, d = Math.sqrt(r()) * isl.R * .86, wx = isl.x + Math.cos(a) * d, wy = isl.y + Math.sin(a) * d * .78;
                if (Math.hypot(wx - lx, (wy - ly) * 1.25) < lr) continue;
                const x = Math.round((wx - BX) / S), y = Math.round((wy - BY) / S), k = y * CW + x;
                if (k < 0 || k >= T.length || O[k] !== n || T[k] > .8) continue;
                const art = isl.art, roll = r();
                if (art === 'mine' || art === 'ruinen') stamp(roll < .7 ? TREE.rock : art === 'mine' ? TREE.crys : TREE.bush, x - 2, y - 2);
                else if (art === 'wrack') { if (roll < .5) stamp(TREE.palm, x - 2, y - 4); }
                else if (art === 'arena') { if (roll < .4) stamp(TREE.bush, x - 2, y - 1); }
                else stamp(roll < .5 ? TREE.pine : roll < .7 ? TREE.palm : roll < .85 ? TREE.bush : TREE.rock, x - 2, y - 4);
                if (q > cnt) break;
            }
            for (let q = 0; q < cnt; q++) {   // Blumen
                const x = Math.round((isl.x + (r() - .5) * isl.R * 1.4 - BX) / S), y = Math.round((isl.y + (r() - .5) * isl.R - BY) / S), k = y * CW + x;
                if (k < 0 || k >= T.length || O[k] !== n || T[k] > .82 || ['mine', 'ruinen', 'wrack'].includes(isl.art)) continue;
                set(k, hex(['#f472b6', '#fde047', '#f8fafc', '#a78bfa'][q % 4]));
            }
        });
        // Mnemora: Wälder, Gebirge, Städte, Ruinen (grob – noch Gerüchte)
        { const r = A.rng(8080), FB = LBOX[0], toPx = (wx, wy) => [Math.round((wx - BX) / S), Math.round((wy - BY) / S)];
            const nearWater = (wx, wy) => polyD(wx, wy, F.RIVER) < 30 || Math.hypot((wx - F.LAKE.x) / (F.LAKE.rx + 30), (wy - F.LAKE.y) / (F.LAKE.ry + 30)) < 1;
            const placeAt = id => F.PLACES.find(p => p.id === id);
            for (let q = 0; q < 5200; q++) {
                const inForest = q < 1400, wx = inForest ? F.FOREST.x + (r() * 2 - 1) * F.FOREST.rx : FB[0] + r() * (FB[2] - FB[0]), wy = inForest ? F.FOREST.y + (r() * 2 - 1) * F.FOREST.ry : FB[1] + r() * (FB[3] - FB[1]);
                const [x, y] = toPx(wx, wy), k = y * CW + x;
                if (k < 0 || k >= T.length || O[k] !== FEST || T[k] > .88 || nearWater(wx, wy)) continue;
                if (inForest && Math.hypot((wx - F.FOREST.x) / F.FOREST.rx, (wy - F.FOREST.y) / F.FOREST.ry) > 1) continue;
                const h = HH[k]; if (h > 1.1) continue;
                if (!inForest && r() < .55) continue;
                stamp(h > .85 ? TREE.rock : inForest || h > .4 ? TREE.pine : r() < .5 ? TREE.bush : TREE.pine, x - 2, y - 4);
            }
            for (let i = 1; i < F.RIDGE.length; i++) {   // Bergspitzen entlang des Kamms
                const a = F.RIDGE[i - 1], b = F.RIDGE[i], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 70);
                for (let j = 0; j < n; j++) { const t = j / n, [x, y] = toPx(a[0] + (b[0] - a[0]) * t + (r() - .5) * 90, a[1] + (b[1] - a[1]) * t + (r() - .5) * 60); stamp(r() < .3 ? MOUNT.big : MOUNT.small, x - 6, y - 6); }
            }
            const town = (id, spr) => { const pl = placeAt(id), [x, y] = toPx(pl.x, pl.y); stamp(spr, x - Math.floor(spr.s[0].length / 2), y - Math.floor(spr.s.length / 2)); };
            town('registra', MOUNT.city); town('port', MOUNT.harbor); town('altrom', MOUNT.ruin);
        }
        ctx.putImageData(img, 0, 0);
        // Handelsrouten als gepunktete Linien
        const tmp = document.createElementNS(NS, 'svg'); tmp.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'; document.body.appendChild(tmp);
        const pth = document.createElementNS(NS, 'path'); tmp.appendChild(pth);
        ctx.fillStyle = 'rgba(244, 227, 174, .55)';
        (X.islands || []).filter(i => i.id !== 'zentrum' && i.id !== 'geheim').forEach(i => {
            const from = i.id === 'konto' ? 'zentrum' : (Math.hypot(i.x - 1190, i.y - 720) < Math.hypot(i.x - 1010, i.y - 1030) ? 'zentrum' : 'konto');
            pth.setAttribute('d', A.route(from, i.id)); const L = pth.getTotalLength();
            for (let l = i.s * .7; l < L - i.s * .5; l += 15) { const p = pth.getPointAtLength(l), px = Math.round((p.x - BX) / S), py = Math.round((p.y - BY) / S); if (T[py * CW + px] >= 1) ctx.fillRect(px, py, 1, 1); }
        });
        tmp.remove();
        return cv;
    }

    /* SVG → scharfes Pixel-Sprite (Alphaschwelle + dunkler Umriss) */
    function sprite(inner, vb, pw, ph, outline) {
        return new Promise(res => {
            const img = new Image();
            img.onload = () => {
                const c = document.createElement('canvas'); c.width = pw; c.height = ph;
                const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, pw, ph);
                const d = ctx.getImageData(0, 0, pw, ph), a = d.data, solid = new Uint8Array(pw * ph);
                for (let i = 0; i < pw * ph; i++) { if (a[i * 4 + 3] < 110) a[i * 4 + 3] = 0; else { a[i * 4 + 3] = 255; solid[i] = 1; } }
                if (outline !== false) for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
                    const i = y * pw + x; if (solid[i]) continue;
                    if ((x > 0 && solid[i - 1]) || (x < pw - 1 && solid[i + 1]) || (y > 0 && solid[i - pw]) || (y < ph - 1 && solid[i + pw])) { a[i * 4] = 11; a[i * 4 + 1] = 13; a[i * 4 + 2] = 20; a[i * 4 + 3] = 255; }
                }
                ctx.putImageData(d, 0, 0); res(c);
            };
            img.onerror = () => res(null);
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb.join(' ') + '" width="' + pw + '" height="' + ph + '" shape-rendering="crispEdges">' + inner + '</svg>');
        });
    }

    /* Wahrzeichen und Kompassrose auf die Grundkarte stempeln */
    async function decorate(cv) {
        const ctx = cv.getContext('2d');
        await Promise.all(ISL.map(async isl => {
            const sc = isl.s / 86, vb = [-82, -102, 164, 164], pw = Math.round(164 * sc / S), wx = isl.x - 82 * sc, wy = isl.y - isl.s * .08 - 102 * sc;
            const sp = A.LM[isl.art] ? await sprite(A.LM[isl.art](false), vb, pw, pw) : null;
            if (sp) ctx.drawImage(sp, Math.round((wx - BX) / S), Math.round((wy - BY) / S));
        }));
        const cp = await sprite(A.compass(100, 108), [0, 0, 200, 214], Math.round(200 / S), Math.round(214 / S), false);
        if (cp) ctx.drawImage(cp, Math.round((2130 - BX) / S), Math.round((1252 - BY) / S));
        return cv;
    }

    let basePromise = null;
    function base() {
        if (basePromise) return basePromise;
        basePromise = new Promise(resolve => {
            const key = 'xiru:mapcache:' + VERSION + 'b' + ':' + (X.islands || []).length;
            let cached = null; try { cached = sessionStorage.getItem(key); } catch (e) { }
            if (cached) {
                const img = new Image();
                img.onload = () => { const c = document.createElement('canvas'); c.width = CW; c.height = CH; c.getContext('2d').drawImage(img, 0, 0); resolve(c); };
                img.onerror = () => { try { sessionStorage.removeItem(key); } catch (e) { } decorate(terrain()).then(resolve); };
                img.src = cached; return;
            }
            decorate(terrain()).then(c => { try { sessionStorage.setItem(key, c.toDataURL('image/png')); } catch (e) { } resolve(c); });
        });
        return basePromise;
    }

    /* Nebelwand rund um den Archipel: grobe Pixelwolken (6 Einheiten je Pixel), gedithert.
       Über dem Festland bleibt sie etwas lichter, damit sein Umriss durchschimmert. */
    const FS = 6, FW = Math.ceil(BW / FS), FH = Math.ceil(BH / FS);
    let wallCv = null;
    function fogWall() {
        if (wallCv) return wallCv;
        const cv = document.createElement('canvas'); cv.width = FW; cv.height = FH;
        const ctx = cv.getContext('2d'), img = ctx.createImageData(FW, FH), D = img.data;
        for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
            const wx = x * FS + 3 + BX, wy = y * FS + 3 + BY, e = clearE(wx, wy);
            if (e < .82) continue;
            const n = N1(wx / 300 + 7, wy / 300 + 3) * .7 + N2(wx / 110, wy / 110) * .3;
            let f = (e - .9 + (n - .5) * .45) / .26; if (f <= 0) continue;
            const li = landAt(wx, wy);
            f = Math.min(li >= 0 ? LANDS[li].fog : .96, f);
            if (f <= dith(x, y)) continue;
            const v = N2(wx / 70 + 11, wy / 70 + 5), i = (y * FW + x) * 4;
            const col = v > .64 ? [233, 239, 246] : v > .42 ? [200, 210, 223] : v > .25 ? [168, 181, 199] : [139, 153, 173];
            D[i] = col[0]; D[i + 1] = col[1]; D[i + 2] = col[2]; D[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        return (wallCv = cv);
    }

    /* Nebel als Pixelwolke */
    function fogSprite(isl) {
        const pw = Math.round(isl.s * 2.8 / S), ph = Math.round(isl.s * 1.9 / S), c = document.createElement('canvas'); c.width = pw; c.height = ph;
        const ctx = c.getContext('2d'), d = ctx.createImageData(pw, ph), a = d.data, r = A.rng(A.hash(isl.id) + 99);
        const blobs = Array.from({ length: 9 }, () => [pw * (.18 + r() * .64), ph * (.25 + r() * .5), pw * (.12 + r() * .14)]);
        for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
            let v = 0; blobs.forEach(([bx, by, br]) => { const q = 1 - Math.hypot(x - bx, (y - by) * 1.5) / br; if (q > 0) v += q; });
            if (v < .35) continue;
            const i = (y * pw + x) * 4, edge = v < .6, top = blobs.some(([bx, by, br]) => y < by - br * .2 && Math.hypot(x - bx, (y - by) * 1.5) < br);
            const col = edge ? (dith(x, y) < .5 ? [203, 213, 225] : [148, 163, 184]) : top ? [241, 245, 249] : [214, 222, 233];
            a[i] = col[0]; a[i + 1] = col[1]; a[i + 2] = col[2]; a[i + 3] = edge ? (dith(x, y) < .55 ? 235 : 0) : 245;
        }
        ctx.putImageData(d, 0, 0);
        return c;
    }

    /* Mech als Pixel-Figur */
    function mechSprite(cv, f, loadout) {
        const img = new Image(), w = cv.width, h = cv.height;
        img.onload = () => {
            const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
            const d = ctx.getImageData(0, 0, w, h), a = d.data, solid = new Uint8Array(w * h);
            for (let i = 0; i < w * h; i++) { if (a[i * 4 + 3] < 100) a[i * 4 + 3] = 0; else { a[i * 4 + 3] = 255; solid[i] = 1; } }
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!solid[i] && ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w]))) { a[i * 4] = 5; a[i * 4 + 1] = 7; a[i * 4 + 2] = 12; a[i * 4 + 3] = 255; } }
            ctx.putImageData(d, 0, 0);
        };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(X.mechArt.draw(f, false, loadout).replace(/<g filter="url\(#mglow\)"/g, '<g'));
    }

    /* Stil (einmal pro Seite) */
    function css() {
        if (document.getElementById('pm-style')) return;
        const st = document.createElement('style'); st.id = 'pm-style';
        st.textContent = '.pmap{overflow:hidden;background:#061a2e}.pmap__cam{position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;transform-origin:0 0}' +
            '.pmap canvas{position:absolute;max-width:none;max-height:none;image-rendering:pixelated;image-rendering:crisp-edges}.pmap__ov{position:absolute;max-width:none;max-height:none;left:0;top:0;width:' + W + 'px;height:' + H + 'px;overflow:visible}' +
            '.pm-wall{pointer-events:none;opacity:.94}.pm-fog{transition:opacity 1.6s;pointer-events:none}.pm-bob{animation:pmBob 1.6s steps(1) infinite}@keyframes pmBob{50%{transform:translateY(' + S + 'px)}}' +
            '.pm-lbl text{font:700 17px Consolas,"Cascadia Code",monospace;letter-spacing:1px;text-transform:uppercase}' +
            'html.no-anim .pm-bob{animation:none}';
        document.head.appendChild(st);
    }

    /* ── Montage: Kamera, Grundkarte, Nebel, Tiere, Wellen, Beschriftung ── */
    function mount(host, opts) {
        opts = opts || {}; css();
        const anim = opts.anim !== false && X.setting('anim') !== false, disc = opts.discovered || (() => true);
        host.classList.add('pmap');
        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
        const cam = document.createElement('div'); cam.className = 'pmap__cam'; host.appendChild(cam);
        const box = 'left:' + BX + 'px;top:' + BY + 'px;width:' + BW + 'px;height:' + BH + 'px';
        const baseCv = document.createElement('canvas'); baseCv.width = CW; baseCv.height = CH; baseCv.style.cssText = box; cam.appendChild(baseCv);
        const fx = document.createElement('canvas'); fx.width = CW; fx.height = CH; fx.style.cssText = box; cam.appendChild(fx);
        const wall = document.createElement('canvas'); wall.width = FW; wall.height = FH; wall.style.cssText = box; wall.className = 'pm-wall'; cam.appendChild(wall);
        const ov = document.createElementNS(NS, 'svg'); ov.setAttribute('class', 'pmap__ov'); ov.setAttribute('viewBox', BX + ' ' + BY + ' ' + BW + ' ' + BH); ov.style.cssText = box; cam.appendChild(ov);
        const layers = {};
        const layer = name => layers[name] || (layers[name] = ov.appendChild(document.createElementNS(NS, 'g')));
        ['lanes', 'isles', 'fx', 'labels', 'route', 'top'].forEach(layer);
        const place = (cv, wx, wy, ww, wh, cls) => { cv.style.cssText = 'left:' + wx + 'px;top:' + wy + 'px;width:' + ww + 'px;height:' + wh + 'px'; if (cls) cv.className = cls; cam.insertBefore(cv, ov); return cv; };
        // Inseln: Trefferflächen, Namen, Nebel
        const fogs = {};
        (X.islands || []).forEach(i => {
            const secret = i.secret && !opts.visitedSecret, fog = !disc(i.id) || secret;
            const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'wk-isle' + (fog ? ' is-fog' : '') + (i.game ? ' is-game' : '')); g.dataset.isle = i.id;
            g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', secret ? 'Unbekannte Insel' : i.n);
            g.innerHTML = '<path d="' + A.coast(i.x, i.y, i.s * 1.12, A.hash(i.id), .78) + '" fill="transparent"/>';
            layer('isles').appendChild(g);
            if (fog) { const fs = fogSprite(i); fogs[i.id] = place(fs, Math.round((i.x - i.s * 1.4) / S) * S, Math.round((i.y - i.s * .95) / S) * S, fs.width * S, fs.height * S, 'pm-fog'); }
            if (opts.labels !== false) {
                const name = (secret ? '???' : i.n).toUpperCase(), tw = name.length * 11.2 + 28, ly = i.y + i.s * .84, lx = Math.round(i.x - tw / 2);
                const lg = document.createElementNS(NS, 'g'); lg.setAttribute('class', 'pm-lbl'); lg.style.pointerEvents = 'none';
                lg.innerHTML = '<rect x="' + (lx + 4) + '" y="' + (ly + 4) + '" width="' + tw + '" height="27" fill="#020610"/>' +
                    '<rect x="' + lx + '" y="' + ly + '" width="' + tw + '" height="27" fill="#13243a" stroke="' + (i.game ? '#22d3ee' : '#e8c56a') + '" stroke-width="3"/>' +
                    '<text x="' + i.x + '" y="' + (ly + 19.5) + '" text-anchor="middle" fill="#f4e3ae">' + name.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text>' +
                    (fog ? '<text x="' + i.x + '" y="' + (i.y + 12) + '" text-anchor="middle" fill="#334155" style="font-size:' + Math.round(i.s * .5) + 'px">?</text>' : '');
                layer('labels').appendChild(lg);
            }
        });
        // Unbekannte Länder am Kartenrand (Nebel und ???)
        if (opts.unknown !== false) A.UNKNOWN.forEach(([x, y, R], n) => {
            const fs = fogSprite({ id: 'u' + n, s: R * 1.05 }); place(fs, Math.round((x - R * 1.47) / S) * S, Math.round((y - R) / S) * S, fs.width * S, fs.height * S, 'pm-fog');
            const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'wk-unknown'); g.dataset.u = n;
            g.innerHTML = '<ellipse cx="' + x + '" cy="' + y + '" rx="' + R + '" ry="' + R * .74 + '" fill="transparent"/><text x="' + x + '" y="' + (y + 8) + '" text-anchor="middle" fill="#64748b" style="font:700 22px Consolas,monospace;letter-spacing:6px">???</text>';
            layer('isles').appendChild(g);
        });
        // Das Festland hinter der Nebelwand: Umriss, Name, Trefferfläche
        if (opts.labels !== false) {
            const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'wk-festland'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', 'Das Festland ' + F.n);
            const tw = 420, lx = F.x - tw / 2, ly = F.y - 70;
            g.innerHTML = '<path d="' + A.festPath() + '" fill="rgba(11,23,38,.001)" stroke="#e8c56a" stroke-width="7" stroke-dasharray="18 14" opacity=".75"/>' +
                '<g class="pm-lbl" style="pointer-events:none"><rect x="' + (lx + 6) + '" y="' + (ly + 6) + '" width="' + tw + '" height="104" fill="#020610"/>' +
                '<rect x="' + lx + '" y="' + ly + '" width="' + tw + '" height="104" fill="#13243a" stroke="#e8c56a" stroke-width="4"/>' +
                '<text x="' + F.x + '" y="' + (ly + 52) + '" text-anchor="middle" fill="#f4e3ae" style="font:800 40px Consolas,monospace;letter-spacing:10px">' + F.n.toUpperCase() + '</text>' +
                '<text x="' + F.x + '" y="' + (ly + 84) + '" text-anchor="middle" fill="#c8a96a" style="font:700 15px Consolas,monospace;letter-spacing:3px">DAS FESTLAND · HINTER DER NEBELWAND</text></g>';
            layer('isles').appendChild(g);
            // Grobe Orte auf Mnemora (Gerüchte von Seefahrern)
            const pg = document.createElementNS(NS, 'g'); pg.setAttribute('class', 'pm-lbl');
            pg.innerHTML = F.PLACES.map(pl => { const nm = pl.n.toUpperCase(), tw = nm.length * 12.6 + 26, big = pl.t === 'stadt' || pl.t === 'hafen';
                return '<g class="wk-place" data-place="' + pl.id + '"><rect x="' + (pl.x - 9) + '" y="' + (pl.y - 9) + '" width="18" height="18" transform="rotate(45 ' + pl.x + ' ' + pl.y + ')" fill="' + (big ? '#e8c56a' : '#94a3b8') + '" stroke="#000" stroke-width="4"/>' +
                    '<rect x="' + Math.round(pl.x - tw / 2) + '" y="' + (pl.y + 18) + '" width="' + Math.round(tw) + '" height="30" fill="#0b1726" stroke="' + (big ? '#e8c56a' : '#64748b') + '" stroke-width="3" stroke-dasharray="' + (big ? 'none' : '8 5') + '"/>' +
                    '<text x="' + pl.x + '" y="' + (pl.y + 39) + '" text-anchor="middle" fill="' + (big ? '#f4e3ae' : '#cbd5e1') + '" style="font-size:19px">' + nm + '</text></g>'; }).join('');
            layer('labels').appendChild(pg);
            // Die anderen Länder: ganz im Nebel, nur ein Schild
            LANDS.slice(1).forEach(L => {
                const u = document.createElementNS(NS, 'g'); u.setAttribute('class', 'wk-land'); u.dataset.land = L.id;
                u.innerHTML = '<ellipse cx="' + L.x + '" cy="' + L.y + '" rx="' + L.rx + '" ry="' + L.ry + '" fill="transparent"/><g class="pm-lbl" style="pointer-events:none"><rect x="' + (L.x - 110) + '" y="' + (L.y - 30) + '" width="220" height="60" fill="#13243a" stroke="#64748b" stroke-width="4" stroke-dasharray="12 8" opacity=".85"/>' +
                    '<text x="' + L.x + '" y="' + (L.y + 12) + '" text-anchor="middle" fill="#94a3b8" style="font:800 34px Consolas,monospace;letter-spacing:10px">???</text></g>';
                layer('isles').appendChild(u);
            });
        }
        // Seedrache, Krake, Wal als Pixel-Sprites (wippen in ganzen Pixeln)
        const creatures = [[A.dragon(250, 930, false), [158, 732, 594, 222], 'p-seemonster'], [A.kraken(2070, 1290, false), [2010, 1205, 130, 100]], [A.whale(1790, 250, false), [1700, 182, 170, 92]]];
        const crReady = Promise.all(creatures.map(([svgS, vb, egg], n) => sprite(svgS, vb, Math.round(vb[2] / S), Math.round(vb[3] / S)).then(sp => {
            if (!sp) return;
            place(sp, vb[0], vb[1], vb[2], vb[3], anim ? 'pm-bob' : ''); if (anim) sp.style.animationDelay = (-n * .5) + 's';
            if (egg) { const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'wk-dragon'); g.dataset.egg = egg; g.style.cursor = 'pointer'; g.innerHTML = '<rect x="' + (vb[0] + 30) + '" y="' + (vb[1] + 20) + '" width="' + (vb[2] - 60) + '" height="' + (vb[3] - 30) + '" fill="transparent"/>'; layer('fx').appendChild(g); }
        })));
        // Titel-Kartusche und Massstab (scharf, im Pixel-Rahmen)
        const t = document.createElementNS(NS, 'g'); t.setAttribute('class', 'pm-lbl'); t.style.pointerEvents = 'none';
        t.innerHTML = '<rect x="526" y="40" width="372" height="88" fill="#020610"/><rect x="520" y="34" width="372" height="88" fill="#13243a" stroke="#e8c56a" stroke-width="4"/>' +
            '<rect x="530" y="44" width="352" height="68" fill="none" stroke="#7a6230" stroke-width="2"/>' +
            '<text x="706" y="83" text-anchor="middle" fill="#f4e3ae" style="font:800 34px Consolas,monospace;letter-spacing:8px">' + (A.NAME || 'SEKTARIA').toUpperCase() + '</text>' +
            '<text x="706" y="104" text-anchor="middle" fill="#c8a96a" style="font:700 12px Consolas,monospace;letter-spacing:3px">SEEKARTE DER NEBELSEE · MMXXVI</text>' +
            '<g transform="translate(470 1530)"><rect width="200" height="9" fill="#13243a" stroke="#e8c56a" stroke-width="2"/>' + [0, 1, 2, 3].map(i => '<rect x="' + i * 50 + '" width="25" height="9" fill="#e8c56a"/>').join('') +
            '<text y="28" fill="#f4e3ae" style="font:700 13px Consolas,monospace">0</text><text x="200" y="28" text-anchor="end" fill="#f4e3ae" style="font:700 13px Consolas,monospace">100 SEEMEILEN</text></g>';
        layer('labels').appendChild(t);
        // Grundkarte einsetzen
        const ready = base().then(b => { baseCv.getContext('2d').drawImage(b, 0, 0); wall.getContext('2d').drawImage(fogWall(), 0, 0); return crReady; });
        // Glitzernde Wellen
        let waveT = 0, pts = null;
        const fxc = fx.getContext('2d');
        function waves() {
            if (!pts) { pts = []; const r = A.rng(31); for (let i = 0; i < 6000 && pts.length < 420; i++) { const x = Math.floor(r() * CW), y = Math.floor(r() * CH), wx = x * S + BX, wy = y * S + BY; if (clearE(wx, wy) < .9 && (X.islands || []).every(isl => Math.hypot(isl.x - wx, (isl.y - wy) / .78) > isl.s * 1.55)) pts.push([x, y, r() * 6.28]); } }
            fxc.clearRect(0, 0, CW, CH);
            const tt = performance.now() / 700;
            pts.forEach(([x, y, ph]) => { const v = Math.sin(tt + ph); if (v < .55) return; fxc.fillStyle = v > .9 ? 'rgba(201,242,239,.85)' : 'rgba(120,200,230,.55)'; fxc.fillRect(x, y, v > .9 ? 3 : 2, 1); });
        }
        if (anim) { waves(); waveT = setInterval(() => { if (!document.hidden) waves(); }, 260); }
        // Kamera
        let cur = { x: 0, y: 0, w: W, h: H }, sc = 1, tx = 0, ty = 0;
        function setView(x, y, w, h, fit) {
            const r = host.getBoundingClientRect(), hw = r.width || 1, hh = r.height || 1;
            sc = (fit || opts.fit) === 'cover' ? Math.max(hw / w, hh / h) : Math.min(hw / w, hh / h);
            tx = hw / 2 - (x + w / 2) * sc; ty = hh / 2 - (y + h / 2) * sc;
            cam.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + sc.toFixed(5) + ')';
            cur = { x: -tx / sc, y: -ty / sc, w: hw / sc, h: hh / sc };
        }
        if (opts.view) setView.apply(null, opts.view.concat([opts.fit]));
        else setView(0, 0, W, H, opts.fit);
        return {
            host, cam, ov, layer, setView, ready, S,
            view: () => Object.assign({}, cur),
            scale: () => sc,
            toWorld(cx, cy) { const r = host.getBoundingClientRect(); return { x: (cx - r.left - tx) / sc, y: (cy - r.top - ty) / sc }; },
            fog: id => fogs[id] || null,
            revealFog(id) { const f = fogs[id]; if (f) f.style.opacity = '0'; const g = ov.querySelector('[data-isle="' + id + '"]'); if (g) g.classList.remove('is-fog'); X.$$('.pm-lbl text', layer('labels')).forEach(tx2 => { if (tx2.textContent === '?' && Math.abs(+tx2.getAttribute('x') - (M_ISLE(id) || {}).x) < 1) tx2.remove(); }); },
            place: (cv, wx, wy, ww, wh, cls) => place(cv, wx, wy, ww, wh, cls),
            destroy() { clearInterval(waveT); cam.remove(); }
        };
    }
    const M_ISLE = id => (X.islands || []).find(i => i.id === id);

    window.XIRU.mapPix = { S, CW, CH, BOUNDS: A.BOUNDS, base, sprite, mount, mechSprite, css };
})();
