/* ==========================================================================
   Mnemora · begehbare Orte (Top-down, 2D-Pixel) – nach mnemora.js und mnemora-karte.js laden
   Jeder Ort ist eine eigene kleine Karte: hinreisen, „Ort betreten“, mit dem Gehäuse herumlaufen,
   mit Leuten reden, Stände und Gebäude benutzen, an den Wegweisern am Rand auf die Strassen.

   Aufbau (damit später ein 3D-artigerer Zeichner oder eigene Grafiken andocken können):
     gen(place)  → reine Daten: Kacheln (Uint8Array), Objekte, Ziele (inter), Ausgänge, Startpunkt
     paint*      → Pixel-Grafiken aus Code (Kacheln, Gebäude, Bäume …), einmal gezeichnet und zwischengespeichert
     open/close  → Ansicht: Kamera folgt dir, Tastatur (WASD/Pfeile, E) oder Klick/Tippen (Wegsuche)

   XIRU.mnemoraOrt
     .open(placeId, opts)   opts.from = Strassen-ID (Start am passenden Wegweiser)
     .close() · .isOpen() · .pos() → 'x,y' (Kachel) für die Online-Anzeige, sonst ''
     .ctx = { tab(name), road(id), boss(), world(), home(), hint(), others(), player(p), onClose() } (setzt mnemora.html)
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU, MN = X.mnemora, A = X.mapArt, esc = X.esc;
    const T = 16, MW = 56, MH = 40;   // Kachelgrösse (Pixel) und Kartengrösse (Kacheln)

    /* ── Kacheln ── */
    const TL = ['deep', 'water', 'sand', 'grass', 'flowers', 'dirt', 'cobble', 'plank', 'forest', 'moor', 'bog', 'rock', 'cliff', 'snow', 'ice', 'ash', 'lava', 'steppe', 'ruin', 'wall', 'field', 'fence', 'floor'];
    const TI = {}; TL.forEach((t, i) => { TI[t] = i; });
    const SOLID = new Set(['deep', 'water', 'bog', 'cliff', 'lava', 'wall', 'fence'].map(t => TI[t]));
    const WATER = new Set(['deep', 'water', 'bog'].map(t => TI[t]));

    /* ── Rauschen, Zufall ── */
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
    const h2 = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + (s || 0) * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

    /* ── Pixel-Grafiken (Code statt Bilddateien) ── */
    const cache = {};
    function sprite(key, w, h, fn) {
        if (cache[key]) return cache[key];
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d'), p = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww || 1, hh || 1); };
        fn(p, w, h, g); cache[key] = c; return c;
    }
    /* Gefüllte Ellipse mit Umriss und Licht von oben links */
    function blob(p, cx, cy, rx, ry, base, dark, light, line) {
        for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
            const d = ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2; if (d > 1) continue;
            const edge = d > .78, sh = (x - cx) / rx + (y - cy) / ry;
            p(x, y, 1, 1, edge && line ? line : sh > .55 ? dark : sh < -.55 ? light : base);
        }
    }
    const SP = {
        tree: v => sprite('tree' + v, 18, 28, p => { p(7, 19, 4, 9, '#5a3818'); p(7, 19, 1, 9, '#8a5a30'); blob(p, 9, 10, 8.6, 9, v ? '#4aa63f' : '#3f9a3c', '#2a6a2c', '#6fcb5a', '#14361a'); if (v) { p(5, 6, 2, 2, '#e04848'); p(12, 11, 2, 2, '#e04848'); } }),
        pine: v => sprite('pine' + v, 16, 30, p => {
            p(7, 24, 3, 6, '#5a3818');
            [[2, 9], [7, 12], [12, 15]].forEach(([top, hh], i) => { for (let y = 0; y < hh; y++) { const w = Math.round(2 + y * (6 + i) / hh); p(8 - w, top + y, w * 2, 1, y < hh * .45 ? '#2f7a33' : '#1f5a26'); p(8 - w, top + y, 1, 1, '#14361a'); p(8 + w - 1, top + y, 1, 1, '#14361a'); if (v && y < 3) p(8 - w + 1, top + y, w * 2 - 2, 1, '#eef3f7'); } });
        }),
        bigtree: () => sprite('bigtree', 72, 86, p => {
            p(28, 52, 16, 34, '#5a3818'); p(28, 52, 4, 34, '#8a5a30'); p(22, 80, 28, 6, '#4a2d12');
            blob(p, 36, 32, 34, 30, '#3f9a3c', '#2a6a2c', '#6fcb5a', '#14361a'); blob(p, 22, 22, 12, 10, '#4fb047', '#3f9a3c', '#7ad964');
            [[14, 40], [52, 30], [34, 50], [24, 18], [48, 46]].forEach(([x, y]) => { p(x, y, 3, 4, '#fde68a'); p(x, y - 1, 3, 1, '#7a5a32'); });   // Laternen
        }),
        dead: () => sprite('dead', 16, 26, p => { p(7, 8, 3, 18, '#3a2e24'); p(3, 10, 5, 2, '#3a2e24'); p(2, 7, 2, 4, '#3a2e24'); p(10, 6, 4, 2, '#3a2e24'); p(13, 3, 2, 4, '#3a2e24'); p(7, 3, 2, 5, '#3a2e24'); }),
        bush: () => sprite('bush', 14, 10, p => blob(p, 7, 5, 6.5, 4.6, '#3f8f3c', '#2a6a2c', '#5fbf4f', '#14361a')),
        rock: v => sprite('rock' + v, v ? 24 : 14, v ? 18 : 11, (p, w, h) => blob(p, w / 2, h / 2 + .5, w / 2 - .5, h / 2 - .5, v === 2 ? '#d9e3ec' : '#8d8b80', v === 2 ? '#a9bccb' : '#64635a', v === 2 ? '#ffffff' : '#b3b1a4', v === 2 ? '#6b7f90' : '#3a3936')),
        crate: () => sprite('crate', 12, 12, p => { p(0, 0, 12, 12, '#3a2618'); p(1, 1, 10, 10, '#a8743f'); p(1, 5, 10, 2, '#7a4f25'); p(5, 1, 2, 10, '#7a4f25'); }),
        barrel: () => sprite('barrel', 10, 12, p => { p(1, 0, 8, 12, '#3a2618'); p(2, 1, 6, 10, '#9a6a35'); p(1, 3, 8, 1, '#4a4f58'); p(1, 8, 8, 1, '#4a4f58'); p(3, 1, 1, 10, '#b88a50'); }),
        reeds: () => sprite('reeds', 10, 14, p => { [1, 4, 7].forEach((x, i) => { p(x, 3 + i, 1, 11 - i, '#6b7a3a'); p(x, 1 + i, 1, 3, '#8a6a32'); }); }),
        tuft: () => sprite('tuft', 8, 6, p => { p(1, 2, 1, 4, '#9a7a32'); p(3, 0, 1, 6, '#b39d45'); p(5, 1, 1, 5, '#9a7a32'); }),
        flower: v => sprite('flower' + v, 6, 6, p => { const c = ['#f6c844', '#f472b6', '#f1f5f9', '#a78bfa'][v % 4]; p(2, 3, 1, 3, '#2a6a2c'); p(1, 1, 3, 1, c); p(2, 0, 1, 3, c); }),
        mushroom: () => sprite('mushroom', 8, 8, p => { p(3, 4, 2, 4, '#f1f5f9'); p(1, 1, 6, 3, '#e04848'); p(0, 3, 8, 1, '#b91c1c'); p(2, 1, 1, 1, '#ffffff'); p(5, 2, 1, 1, '#ffffff'); }),
        log: () => sprite('log', 26, 10, p => { p(0, 2, 26, 8, '#3a2618'); p(1, 3, 24, 6, '#7a4f25'); p(1, 3, 24, 1, '#a8743f'); p(22, 3, 3, 6, '#c9a26a'); p(23, 5, 1, 2, '#7a4f25'); }),
        crystal: () => sprite('crystal', 14, 18, p => { [[2, 8, 3, 10], [6, 2, 3, 16], [10, 6, 3, 12]].forEach(([x, y, w, h]) => { p(x, y, w, h, '#22d3ee'); p(x, y, 1, h, '#a5f3fc'); p(x + w - 1, y + 2, 1, h - 2, '#0e7490'); }); }),
        tent: v => sprite('tent' + v, 30, 24, p => { const c = v ? '#b45309' : '#c0392b'; for (let y = 0; y < 18; y++) { const w = Math.round(2 + y * 13 / 18); p(15 - w, 4 + y, w * 2, 1, y % 4 === 0 ? '#7a2d12' : c); } p(13, 14, 4, 8, '#3a2618'); p(14, 0, 2, 5, '#5a3818'); }),
        signpost: () => sprite('signpost', 16, 22, p => { p(7, 4, 2, 18, '#5a3818'); p(1, 4, 14, 6, '#3a2618'); p(2, 5, 12, 4, '#c9a26a'); p(3, 6, 8, 1, '#5a3818'); p(3, 8, 6, 1, '#5a3818'); }),
        board: () => sprite('board', 26, 26, p => { p(3, 12, 2, 14, '#5a3818'); p(21, 12, 2, 14, '#5a3818'); p(0, 0, 26, 16, '#3a2618'); p(1, 1, 24, 14, '#a8743f'); [[3, 3], [11, 4], [17, 2], [5, 9], [14, 9]].forEach(([x, y]) => { p(x, y, 6, 5, '#f4e3ae'); p(x + 1, y + 1, 4, 1, '#94a3b8'); p(x + 1, y + 3, 3, 1, '#94a3b8'); p(x + 2, y, 1, 1, '#e04848'); }); }),
        anvil: () => sprite('anvil', 18, 14, p => { p(5, 8, 8, 6, '#3a3936'); p(1, 3, 16, 5, '#4a4f58'); p(1, 3, 16, 1, '#8d8b80'); p(13, 4, 4, 2, '#64635a'); }),
        furnace: () => sprite('furnace', 22, 26, p => { p(1, 4, 20, 22, '#3a3936'); p(2, 5, 18, 20, '#7a786e'); for (let y = 6; y < 24; y += 4) p(2, y, 18, 1, '#64635a'); p(6, 14, 10, 8, '#1a1110'); p(7, 16, 8, 6, '#ff6a1f'); p(8, 18, 6, 4, '#ffb347'); p(8, 0, 6, 5, '#4a4f58'); }),
        wagon: () => sprite('wagon', 44, 32, p => { p(4, 4, 36, 18, '#3a2618'); p(5, 5, 34, 16, '#a8743f'); for (let x = 9; x < 38; x += 6) p(x, 5, 1, 16, '#7a4f25'); p(2, 0, 40, 6, '#e2e8f0'); p(2, 0, 40, 1, '#94a3b8'); [8, 32].forEach(x => { blob(p, x + 2, 25, 6, 6, '#5a3818', '#3a2618', '#8a5a30', '#1a1110'); p(x + 1, 24, 2, 2, '#c9a26a'); }); p(16, 9, 12, 6, '#64635a'); p(17, 10, 4, 4, '#b3b1a4'); p(23, 10, 4, 3, '#f08a24'); }),
        boat: () => sprite('boat', 40, 16, p => { for (let y = 0; y < 10; y++) p(Math.round(y * .6), 4 + y, 40 - Math.round(y * 1.2), 1, y < 2 ? '#c9a26a' : y === 2 ? '#3a2618' : '#7a4f25'); p(18, 0, 2, 6, '#5a3818'); p(20, 1, 8, 4, '#f1f5f9'); }),
        well: () => sprite('well', 22, 24, p => { p(2, 10, 18, 14, '#3a3936'); p(3, 11, 16, 12, '#8d8b80'); p(5, 13, 12, 7, '#114a72'); p(6, 14, 6, 1, '#33a3b8'); p(2, 2, 2, 10, '#5a3818'); p(18, 2, 2, 10, '#5a3818'); p(0, 0, 22, 4, '#7c2d12'); }),
        fountain: () => sprite('fountain', 46, 36, p => { blob(p, 23, 22, 22, 13, '#9aa0aa', '#6b7280', '#c7ccd4', '#3a3936'); blob(p, 23, 22, 18, 10, '#16598a', '#114a72', '#2080a6'); p(21, 6, 4, 16, '#9aa0aa'); p(21, 6, 1, 16, '#c7ccd4'); p(17, 6, 12, 3, '#b3b1a4'); p(22, 2, 2, 4, '#c9f2ef'); }),
        lighthouse: () => sprite('lighthouse', 26, 70, p => {
            for (let y = 16; y < 64; y++) { const w = Math.round(6 + (y - 16) * 4 / 48); p(13 - w, y, w * 2, 1, Math.floor((y - 16) / 8) % 2 ? '#f1f5f9' : '#c0392b'); p(13 - w, y, 1, 1, '#3a2618'); p(13 + w - 1, y, 1, 1, '#3a2618'); }
            p(7, 6, 12, 10, '#3a3936'); p(8, 7, 10, 8, '#fde68a'); p(5, 15, 16, 2, '#3a3936'); p(9, 0, 8, 6, '#c0392b'); p(11, 0, 4, 2, '#7a1d1d'); p(9, 64, 8, 6, '#3a2618'); p(11, 66, 4, 4, '#1a1110');
        }),
        tower: () => sprite('tower', 28, 62, p => {
            p(4, 22, 20, 40, '#3a3936'); p(5, 22, 18, 40, '#9aa0aa'); for (let y = 26; y < 62; y += 5) { p(5, y, 18, 1, '#7f858f'); p((y / 5 % 2 ? 9 : 14), y - 4, 1, 4, '#7f858f'); }
            for (let x = 3; x < 25; x += 4) p(x, 18, 3, 5, '#9aa0aa'); p(3, 21, 22, 2, '#7f858f');
            for (let y = 0; y < 17; y++) { const w = Math.round(1 + y * 9 / 17); p(14 - w, y, w * 2, 1, y % 3 ? '#b91c1c' : '#7a1d1d'); }
            p(11, 32, 6, 8, '#1a1110'); p(12, 33, 4, 3, '#fde68a'); p(10, 52, 8, 10, '#3a2618');
        }),
        house: (wt, ht, roof, wall) => sprite('house' + wt + ht + roof + wall, wt * T, ht * T + 6, (p, w, h) => {
            const rh = Math.round(h * .58), wy = rh - 2;
            p(1, wy, w - 2, h - wy, '#3a2618'); p(2, wy + 1, w - 4, h - wy - 2, wall);
            for (let y = wy + 5; y < h - 2; y += 4) p(2, y, w - 4, 1, 'rgba(0,0,0,.12)');
            const dx = Math.floor(w / 2) - 4; p(dx, h - 14, 8, 13, '#3a2618'); p(dx + 1, h - 13, 6, 12, '#7a4f25'); p(dx + 5, h - 7, 1, 1, '#fde68a');
            for (let x = 6; x < w - 10; x += 14) if (Math.abs(x + 3 - w / 2) > 7) { p(x, wy + 6, 7, 6, '#3a2618'); p(x + 1, wy + 7, 5, 4, '#7dd3fc'); p(x + 1, wy + 7, 2, 2, '#e0f2fe'); }
            for (let y = 0; y < rh; y++) { const inset = Math.max(0, 3 - y); p(inset, y, w - inset * 2, 1, y === 0 ? '#3a2618' : y % 4 === 0 ? 'rgba(0,0,0,.25)' : roof); }
            p(0, 0, w, 1, '#3a2618'); p(2, 1, w - 4, 1, 'rgba(255,255,255,.25)'); p(0, rh - 1, w, 2, '#3a2618');
            const cx = w - 14; p(cx, -0, 6, 8, '#64635a'); p(cx, 0, 6, 2, '#3a3936');   // Kamin
        }),
        stall: c => sprite('stall' + c, 34, 30, p => {
            p(2, 10, 2, 20, '#5a3818'); p(30, 10, 2, 20, '#5a3818');
            for (let x = 0; x < 34; x += 6) { p(x, 2, 6, 9, (x / 6) % 2 ? '#f1f5f9' : c); } p(0, 10, 34, 1, '#3a2618'); p(0, 1, 34, 1, '#3a2618');
            p(1, 20, 32, 8, '#3a2618'); p(2, 20, 30, 7, '#a8743f'); p(2, 20, 30, 1, '#c9a26a');
            [[5, 17, '#f08a24'], [10, 18, '#46b85e'], [16, 17, '#f6c844'], [22, 18, '#e04848'], [27, 17, '#4a8cf0']].forEach(([x, y, k]) => p(x, y, 4, 3, k));
        }),
        arche: () => sprite('arche', 152, 78, p => {
            // Rumpf aus Gehäuseblech (Seitenansicht schräg von oben)
            for (let y = 0; y < 34; y++) { const inset = Math.round(Math.max(0, y - 20) * 1.6); p(6 + inset, 40 + y, 140 - inset * 2, 1, y < 2 ? '#3a3936' : y < 26 ? (Math.floor(y / 6) % 2 ? '#b8b0a0' : '#cfc7b4') : '#2a3142'); }
            for (let x = 14; x < 140; x += 18) { p(x, 44, 1, 20, '#8a8270'); p(x + 4, 50, 8, 1, '#3a3936'); p(x + 4, 52, 8, 1, '#3a3936'); p(x + 4, 54, 8, 1, '#3a3936'); }
            p(4, 38, 144, 3, '#3a2618'); p(6, 39, 140, 1, '#a8743f');
            // Händlerdeck: Kajüten mit Schaufenstern
            [[18, '#c0392b'], [46, '#4a8cf0'], [74, '#46b85e'], [102, '#f6c844']].forEach(([x, c]) => { p(x, 16, 24, 22, '#3a2618'); p(x + 1, 22, 22, 15, '#e7d7b0'); p(x + 4, 25, 7, 6, '#7dd3fc'); p(x + 13, 25, 7, 6, '#7dd3fc'); for (let y = 16; y < 23; y++) p(x - 1 + (y - 16) / 2, y, 26 - (y - 16), 1, c); });
            // Doppelte Schiffsschraube (zwei Lüfter) und Nebelbrecher am Bug
            [[128, 18], [136, 26]].forEach(([x, y]) => { blob(p, x, y, 7, 7, '#4a4f58', '#2a3142', '#8d8b80', '#1a1110'); p(x - 1, y - 5, 2, 10, '#b3b1a4'); p(x - 5, y - 1, 10, 2, '#b3b1a4'); });
            for (let i = 0; i < 14; i++) p(i, 30 + i, 3, 2, i % 3 ? '#22d3ee' : '#a5f3fc');
            p(70, 0, 3, 18, '#5a3818'); p(73, 2, 16, 10, '#e2e8f0'); p(73, 2, 16, 1, '#94a3b8');
        }),
        monolith: () => sprite('monolith', 18, 48, p => { p(0, 0, 18, 48, '#0b0d14'); p(1, 1, 16, 46, '#1f2430'); for (let y = 4; y < 44; y += 5) { p(2, y, 14, 3, '#2a3142'); p(3, y + 1, 2, 1, '#22c55e'); p(13, y + 1, 1, 1, '#38bdf8'); } }),
        pillar: v => sprite('pillar' + v, 14, v ? 20 : 34, (p, w, h) => { p(1, h - 4, 12, 4, '#6b6e74'); p(3, 2, 8, h - 6, '#9aa0aa'); p(3, 2, 2, h - 6, '#c7ccd4'); p(1, 0, 12, 3, '#7c7f86'); if (v) { p(3, 0, 4, 3, '#2a2422'); p(9, 1, 3, 2, '#2a2422'); } }),
        lair: () => sprite('lair', 90, 70, p => {
            for (let y = 0; y < 70; y++) { const w = Math.round(30 + Math.min(y, 30) * .5); p(45 - w, y, w * 2, 1, y < 4 ? '#2a2422' : '#3a3230'); }
            for (let x = 4; x < 86; x += 7) p(x, 10 + (x % 3) * 3, 3, 50, '#2a2422');
            p(28, 30, 34, 40, '#0b0606'); for (let y = 30; y < 40; y++) p(28 + (40 - y), y, 34 - (40 - y) * 2, 1, '#0b0606');
            p(24, 24, 42, 4, '#5a4a44');
        }),
        mine: () => sprite('mine', 44, 36, p => { blob(p, 22, 22, 22, 15, '#7a786e', '#4f4e48', '#a5a397', '#3a3936'); p(12, 14, 20, 22, '#0b0d14'); p(10, 12, 3, 24, '#7a4f25'); p(31, 12, 3, 24, '#7a4f25'); p(9, 10, 26, 4, '#a8743f'); p(16, 30, 12, 2, '#64635a'); }),
        cart: () => sprite('cart', 18, 13, p => { p(1, 0, 16, 9, '#4a4f58'); p(2, 1, 14, 3, '#22d3ee'); p(2, 4, 14, 4, '#64635a'); blob(p, 4, 10, 2.5, 2.5, '#1a1110', '#1a1110', '#3a3936'); blob(p, 14, 10, 2.5, 2.5, '#1a1110', '#1a1110', '#3a3936'); }),
        hut: () => sprite('hut', 40, 38, p => { p(4, 16, 32, 22, '#3a2618'); p(5, 17, 30, 20, '#8a5a30'); for (let y = 19; y < 37; y += 4) p(5, y, 30, 1, '#6b4423'); p(16, 25, 8, 12, '#3a2618'); p(8, 21, 6, 5, '#fde68a'); for (let y = 0; y < 18; y++) { const w = Math.round(4 + y * 16 / 18); p(20 - w, y, w * 2, 1, y < 7 ? '#eef3f7' : '#7c2d12'); } p(27, 0, 5, 8, '#64635a'); }),
        fence: () => sprite('fence', 16, 14, p => { p(1, 2, 2, 12, '#5a3818'); p(13, 2, 2, 12, '#5a3818'); p(0, 4, 16, 2, '#a8743f'); p(0, 9, 16, 2, '#a8743f'); })
    };

    /* Pixel-Icons (NPCs, Gehäuse, Weltboss) als Bild – scharf skaliert */
    const icons = {};
    const ok = img => img.complete && img.naturalWidth > 0;
    function icon(id) {
        if (icons[id]) return icons[id];
        let svg = X.pix.svg(X.pix.has(id) ? id : '_', 16);
        if (!/xmlns=/.test(svg)) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');   // als eigenes Bild braucht SVG den Namensraum
        const img = new Image(); img.src = 'data:image/svg+xml,' + encodeURIComponent(svg);
        icons[id] = img; return img;
    }

    /* ── Kacheln zeichnen ── */
    const PAL = {
        grass: ['#5aac43', '#4f9e3d', '#6ab84f'], flowers: ['#5aac43', '#4f9e3d', '#6ab84f'], forest: ['#2f5a2c', '#264a24', '#3a6a33'],
        sand: ['#e6cd92', '#d8bd80', '#f4e3ae'], dirt: ['#9a7448', '#86633b', '#b08a5a'], moor: ['#5d6b45', '#4a5a3a', '#6b7a52'],
        rock: ['#8d8b80', '#7a786e', '#a5a397'], snow: ['#eef3f7', '#d9e3ec', '#ffffff'], ash: ['#3a3230', '#2a2422', '#4a3e3a'],
        steppe: ['#c9b458', '#b39d45', '#d9c56c'], ruin: ['#7c7f86', '#6b6e74', '#8f9299'], field: ['#8a6a3a', '#7a5a30', '#a9c95c'],
        ice: ['#bfe3f5', '#a5d4ec', '#e6f6ff'], floor: ['#a8743f', '#8a5a30', '#c9a26a']
    };
    function paintTile(g, t, tx, ty, nb) {
        const name = TL[t], ox = tx * T, oy = ty * T, p = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(ox + x, oy + y, w || 1, h || 1); };
        const r = (i) => h2(tx, ty, i);
        if (name === 'deep' || name === 'water' || name === 'bog') {
            const c = name === 'deep' ? ['#114a72', '#16598a'] : name === 'bog' ? ['#2f4a44', '#3d5a52'] : ['#2080a6', '#2a8fb2'];
            p(0, 0, T, T, c[0]); for (let i = 0; i < 6; i++) p(Math.floor(r(i) * 14), Math.floor(r(i + 9) * 15), 3, 1, c[1]);
            // Gischt an Land
            const fo = name === 'bog' ? '#6b7a52' : '#c9f2ef';
            if (!nb.n) p(0, 0, T, 2, fo); if (!nb.s) p(0, T - 2, T, 2, fo); if (!nb.w) p(0, 0, 2, T, fo); if (!nb.e) p(T - 2, 0, 2, T, fo);
            return;
        }
        if (name === 'lava') { p(0, 0, T, T, '#c2410c'); for (let i = 0; i < 5; i++) p(Math.floor(r(i) * 13), Math.floor(r(i + 5) * 13), 3, 2, i % 2 ? '#ff6a1f' : '#ffb347'); return; }
        if (name === 'cobble') { p(0, 0, T, T, '#5f5d55'); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const sx = x * 4 + (y % 2 ? 2 : 0) - 1; p(sx + 1, y * 4 + 1, 3, 2, r(x * 4 + y) > .5 ? '#9a988c' : '#8d8b80'); p(sx + 1, y * 4 + 1, 2, 1, '#b3b1a4'); } return; }
        if (name === 'plank') { p(0, 0, T, T, '#a8743f'); for (let y = 0; y < T; y += 4) { p(0, y + 3, T, 1, '#5a3818'); p(Math.floor(r(y) * 12), y, 1, 3, '#7a4f25'); } p(2, 1, 1, 1, '#3a2618'); p(13, 9, 1, 1, '#3a2618'); return; }
        if (name === 'wall') { p(0, 0, T, T, '#5b6068'); for (let y = 0; y < 4; y++) for (let x = 0; x < 2; x++) p(x * 8 + (y % 2 ? 4 : 0) - 3, y * 4 + 4, 7, 3, '#9aa0aa'); p(0, 0, T, 4, '#b9bec7'); p(0, 3, T, 1, '#7f858f'); return; }
        if (name === 'cliff') { p(0, 0, T, T, '#4f4e48'); p(0, 0, T, 4, '#8d8b80'); p(0, 4, T, 1, '#3a3936'); for (let i = 0; i < 4; i++) p(Math.floor(r(i) * 12), 6 + Math.floor(r(i + 4) * 8), 1, 4, '#3a3936'); return; }
        if (name === 'fence') { paintTile(g, TI.grass, tx, ty, nb); g.drawImage(SP.fence(), ox, oy + 1); return; }
        const pal = PAL[name] || PAL.grass;
        p(0, 0, T, T, pal[0]);
        for (let i = 0; i < 10; i++) p(Math.floor(r(i) * 15), Math.floor(r(i + 20) * 15), 1 + (i % 2), 1, i % 3 ? pal[1] : pal[2]);
        if (name === 'grass' || name === 'flowers') { for (let i = 0; i < 3; i++) { const x = Math.floor(r(i + 40) * 14), y = Math.floor(r(i + 50) * 13); p(x, y, 1, 2, '#3f8a34'); p(x + 1, y + 1, 1, 1, '#3f8a34'); } }
        if (name === 'flowers') for (let i = 0; i < 4; i++) p(Math.floor(r(i + 60) * 14), Math.floor(r(i + 70) * 14), 2, 2, ['#f6c844', '#f472b6', '#f1f5f9', '#a78bfa'][i]);
        if (name === 'field') { for (let y = 1; y < T; y += 4) p(0, y, T, 2, '#a9c95c'); for (let y = 1; y < T; y += 4) for (let x = 1; x < T; x += 3) p(x, y - 1, 1, 1, '#d0bd62'); }
        if (name === 'dirt') { p(Math.floor(r(80) * 13), Math.floor(r(81) * 13), 2, 2, '#c9a26a'); }
        if (name === 'ash' && r(90) < .3) p(Math.floor(r(91) * 14), Math.floor(r(92) * 14), 2, 1, '#ff6a1f');
        if (name === 'ice') { p(Math.floor(r(93) * 8), Math.floor(r(94) * 14), 7, 1, '#ffffff'); }
        if (name === 'ruin') { p(0, 7, T, 1, '#5b5e64'); p(7, 0, 1, 7, '#5b5e64'); p(3, 8, 1, 8, '#5b5e64'); }
        if (name === 'snow') { p(Math.floor(r(95) * 12), Math.floor(r(96) * 14), 4, 1, '#c7d2dd'); }
    }

    /* ── Karte erzeugen (reine Daten) ── */
    const BASE = { hafen: 'grass', stadt: 'grass', wacht: 'sand', wald: 'forest', see: 'grass', moor: 'moor', kap: 'snow', berg: 'rock', steppe: 'steppe', ruine: 'ash' };
    const PATH = { hafen: 'cobble', stadt: 'cobble', wacht: 'dirt', wald: 'dirt', see: 'dirt', moor: 'plank', kap: 'dirt', berg: 'dirt', steppe: 'dirt', ruine: 'ruin' };
    const KIND_NAME = { hafen: 'Hafenstadt', stadt: 'Hauptstadt', wacht: 'Wachturm in den Dünen', wald: 'Waldlichtung', see: 'Am See', moor: 'Moor', kap: 'Frostkap', berg: 'Gebirge', steppe: 'Steppe', ruine: 'Ruinen' };
    const CREW_STALL = { basar: ['#c0392b', 'lager', 'Rubinas Basar'], joe: ['#a855f7', 'lager', 'Joes Fundkisten'], flossie: ['#4a8cf0', 'lager', 'Flossies Fischsuppe'] };

    /* Richtung zum Meer (für Hafen und Küstenorte): 'w' | 'e' | 'n' | 's' | null */
    function seaSide(p) {
        const K = X.mnemoraKarte; if (!K || p.x == null) return null;
        let best = null, bd = 1e9;
        [['w', -1, 0], ['e', 1, 0], ['n', 0, -1], ['s', 0, 1]].forEach(([s, dx, dy]) => { for (let d = 60; d < 520; d += 40) if (K.biome(p.x + dx * d, p.y + dy * d) === 'meer') { if (d < bd) { bd = d; best = s; } break; } });
        return best;
    }

    function gen(p) {
        const seed = A.hash('ort:' + p.id), R = A.rng(seed % 2147483646 + 1), N = vnoise(seed % 99991 + 3), N2 = vnoise(seed % 7919 + 11);
        const G = new Uint8Array(MW * MH), occ = new Uint8Array(MW * MH), road = new Uint8Array(MW * MH), kind = p.kind || 'wacht';
        const objs = [], inter = [], exits = [];
        const inb = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
        const set = (x, y, t) => { if (inb(x, y)) G[y * MW + x] = TI[t]; };
        const get = (x, y) => inb(x, y) ? TL[G[y * MW + x]] : 'cliff';
        const free = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!inb(i, j) || occ[j * MW + i]) return false; return true; };
        const take = (x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (inb(i, j)) occ[j * MW + i] = v || 1; };
        /* Objekt: x/y = linke obere Ecke der Grundfläche (Kacheln), fw/fh = Grundfläche (fest), spr = Bild, dx/dy = Bildversatz */
        const obj = (o) => { objs.push(o); if (o.solid !== false) take(o.x, o.y, o.fw || 1, o.fh || 1, 2); return o; };
        const at = (x, y, act, label, extra) => inter.push(Object.assign({ x, y, r: 1.7, act, label }, extra || {}));
        const cx = MW >> 1, cy = MH >> 1;

        // 1) Boden
        const base = BASE[kind] || 'grass';
        for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
            const n = N(x / 7, y / 7), n2 = N2(x / 4, y / 4);
            let t = base;
            if (base === 'grass') t = n > .74 ? 'flowers' : n2 > .82 ? 'dirt' : 'grass';
            else if (base === 'sand') t = n > .7 ? 'grass' : 'sand';
            else if (base === 'forest') t = n > .76 ? 'grass' : 'forest';
            else if (base === 'moor') t = n > .66 ? 'bog' : n2 > .8 ? 'grass' : 'moor';
            else if (base === 'snow') t = n > .74 ? 'ice' : 'snow';
            else if (base === 'rock') t = n > .79 ? 'cliff' : n2 < .2 ? 'dirt' : 'rock';
            else if (base === 'steppe') t = n > .8 ? 'dirt' : 'steppe';
            else if (base === 'ash') t = Math.abs(n - .5) < .028 ? 'lava' : n2 > .78 ? 'ruin' : 'ash';
            set(x, y, t);
        }
        // Mitte immer begehbar
        for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 8; x <= cx + 8; x++) if (SOLID.has(G[y * MW + x])) set(x, y, base === 'rock' ? 'dirt' : base === 'moor' ? 'moor' : base === 'ash' ? 'ash' : base === 'snow' ? 'snow' : base);

        // 2) Meer (Hafen; Dünenwacht, wenn sie an der Küste liegt)
        const side = (kind === 'hafen' || kind === 'wacht') ? (seaSide(p) || (kind === 'hafen' ? 'w' : null)) : null;
        // (u = Abstand vom Meer ins Land, v = entlang der Küste)
        const UV = { w: (u, v) => [u, v], e: (u, v) => [MW - 1 - u, v], n: (u, v) => [v, u], s: (u, v) => [v, MH - 1 - u] };
        const tr = side ? UV[side] : null, coastLen = side === 'n' || side === 's' ? MW : MH;
        const shore = kind === 'hafen' ? 13 : 9;
        if (side) for (let v = 0; v < coastLen; v++) {
            const edge = shore + Math.round((N(v / 6, 3) - .5) * 4);
            for (let u = 0; u < edge + 3; u++) { const [x, y] = tr(u, v); set(x, y, u < edge - 4 ? 'deep' : u < edge ? 'water' : 'sand'); }
        }

        // 3) Ausgänge: Richtung der Strassen auf der grossen Karte
        MN.roadsAt(p.id).forEach(r => {
            const q = MN.place(MN.other(r, p.id)); if (!q) return;
            let a = Math.atan2(q.y - p.y, q.x - p.x);
            const c = Math.cos(a), s = Math.sin(a), t = Math.min((MW / 2 - 2) / Math.max(1e-3, Math.abs(c)), (MH / 2 - 2) / Math.max(1e-3, Math.abs(s)));
            let ex = Math.round(cx + c * t), ey = Math.round(cy + s * t);
            ex = X.clamp(ex, 2, MW - 3); ey = X.clamp(ey, 2, MH - 3);
            // ganz an den Rand schieben
            const dE = [ex - 1, MW - 2 - ex, ey - 1, MH - 2 - ey], m = Math.min.apply(null, dE);
            if (m === dE[0]) ex = 1; else if (m === dE[1]) ex = MW - 2; else if (m === dE[2]) ey = 1; else ey = MH - 2;
            exits.push({ r, to: q, x: ex, y: ey });
        });

        // 4) Wege von der Mitte zu den Ausgängen (Wasser → Steg)
        const pathT = PATH[kind] || 'dirt';
        function carve(x0, y0, x1, y1, t, wide) {
            const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
            for (let i = 0; i <= n; i++) {
                const wob = Math.round((N((x0 + i) / 9, (y0 + i) / 9) - .5) * 4 * Math.sin(Math.PI * i / n));
                const x = Math.round(x0 + (x1 - x0) * i / n) + (Math.abs(x1 - x0) < Math.abs(y1 - y0) ? wob : 0), y = Math.round(y0 + (y1 - y0) * i / n) + (Math.abs(x1 - x0) >= Math.abs(y1 - y0) ? wob : 0);
                for (let j = 0; j < (wide || 2); j++) for (let k = 0; k < (wide || 2); k++) {
                    const cur = get(x + j, y + k);
                    if (!inb(x + j, y + k)) continue;
                    set(x + j, y + k, cur === 'water' || cur === 'deep' || cur === 'bog' ? 'plank' : cur === 'wall' ? 'cobble' : t);
                    occ[(y + k) * MW + x + j] = 1; road[(y + k) * MW + x + j] = 1;
                }
            }
        }

        // 5) Was den Ort ausmacht
        const crew = c => MN.aboard(c);
        if (kind === 'hafen') {
            // Stege ins Wasser, die Arche am mittleren Steg
            const piers = [Math.round(coastLen * .3), Math.round(coastLen * .55), Math.round(coastLen * .8)];
            piers.forEach((v, i) => { for (let u = (i === 1 ? 3 : 6); u < shore + 2; u++) for (let k = 0; k < 2; k++) { const [x, y] = tr(u, v + k); set(x, y, 'plank'); } });
            const [ax, ay] = tr(4, piers[1] - 6);
            const archW = side === 'n' || side === 's' ? 9 : 9;
            obj({ k: 'arche', x: Math.min(MW - 10, Math.max(0, side === 'e' ? ax - 8 : ax)), y: Math.max(1, Math.min(MH - 6, ay)), fw: archW, fh: 4, spr: () => SP.arche(), dy: -2 });
            const [ox2, oy2] = tr(shore - 3, piers[1]);   // Otto steht auf dem mittleren Steg
            npc('otto', ox2, oy2, 'Kapitän Otto', 'home', 'Mit der Arche zurück nach Sektaria');
            // Leuchtturm, Boote, Kisten
            const [lx, ly] = tr(shore + 1, 2); obj({ k: 'lighthouse', x: X.clamp(lx, 1, MW - 3), y: X.clamp(ly, 2, MH - 3), fw: 2, fh: 1, spr: () => SP.lighthouse(), anim: 'light' });
            [piers[0] - 3, piers[2] + 3].forEach(v => { const [bx, by] = tr(5, v); obj({ k: 'boat', x: bx, y: by, fw: 2, fh: 1, spr: () => SP.boat(), solid: false }); });
            for (let i = 0; i < 6; i++) { const [x, y] = tr(shore + 1 + Math.floor(R() * 2), piers[Math.floor(R() * 3)] + (R() < .5 ? -1 : 2)); if (free(x, y, 1, 1)) obj({ k: 'deco', x, y, spr: () => R() < .5 ? SP.crate() : SP.barrel() }); }
            // Händlerstände entlang der Uferstrasse, Taverne als Treffpunkt
            const row = shore + 7, stalls = [['ada', '#f08a24', 'Händlerin Ada', 'talk']];
            Object.keys(CREW_STALL).forEach(c => { if (crew(c)) stalls.push([c, CREW_STALL[c][0], CREW_STALL[c][2], 'tab:' + CREW_STALL[c][1]]); });
            if (crew('kiesel')) stalls.push(['kiesel', 'furnace', 'Kiesels Erzschmelze', 'tab:lager']);
            if (crew('esse')) stalls.push(['esse', 'anvil', 'Schmied Esse', 'tab:werkstatt']);
            for (let v = 4; v < coastLen - 3; v++) for (let k = 0; k < 2; k++) { const [x, y] = tr(row - 3 + k, v); if (get(x, y) !== 'plank') { set(x, y, 'cobble'); } }
            stalls.forEach((s, i) => {
                const v = 6 + i * Math.max(4, Math.floor((coastLen - 12) / stalls.length)), [x, y] = tr(row, v);
                const sx = X.clamp(x, 1, MW - 3), sy = X.clamp(y, 2, MH - 3);
                if (s[1] === 'furnace' || s[1] === 'anvil') obj({ k: s[1], x: sx, y: sy, fw: 2, fh: 1, spr: () => SP[s[1]](), anim: s[1] === 'furnace' ? 'glow' : null });
                else obj({ k: 'stall', x: sx, y: sy, fw: 2, fh: 1, spr: () => SP.stall(s[1]) });
                npc(s[0] === 'basar' ? 'basar' : s[0], sx + 1, sy + 1, s[2], s[3]);
            });
            const [tx2, ty2] = tr(row + 6, Math.round(coastLen * .45));
            building(X.clamp(tx2, 2, MW - 8), X.clamp(ty2, 3, MH - 7), 6, 4, '#7c2d12', '#e7d7b0', 'treff', 'Taverne „Zum Krug“ – Treffpunkt der Reisenden', 'ic-krug');
            for (let i = 0; i < 3; i++) { const [hx, hy] = tr(row + 6 + Math.floor(R() * 10), 4 + Math.floor(R() * (coastLen - 10))); building(X.clamp(hx, 2, MW - 7), X.clamp(hy, 3, MH - 6), 4, 3, ['#b45309', '#1e3a8a', '#7a1d1d'][i], '#f4e3ae'); }
        } else if (kind === 'stadt') {
            // Mauer mit Toren, Marktplatz mit Brunnen, Tauschhalle, Duellring, Felder vor der Stadt
            const x0 = 9, x1 = MW - 10, y0 = 5, y1 = MH - 6;
            for (let x = x0; x <= x1; x++) { set(x, y0, 'wall'); set(x, y1, 'wall'); } for (let y = y0; y <= y1; y++) { set(x0, y, 'wall'); set(x1, y, 'wall'); }
            for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) if (get(x, y) !== 'wall') set(x, y, 'grass');
            for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if ((x < x0 - 1 || x > x1 + 1 || y < y0 - 1 || y > y1 + 1) && N(x / 5, y / 5) > .45) set(x, y, 'field');
            for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 7; x <= cx + 7; x++) set(x, y, 'cobble');
            for (let x = x0 + 1; x < x1; x++) for (let k = 0; k < 2; k++) set(x, cy - 1 + k, 'cobble');
            for (let y = y0 + 1; y < y1; y++) for (let k = 0; k < 2; k++) set(cx - 1 + k, y, 'cobble');
            take(cx - 7, cy - 4, 15, 9);
            obj({ k: 'fountain', x: cx - 1, y: cy - 1, fw: 3, fh: 2, spr: () => SP.fountain(), dy: 2, anim: 'fountain' });
            obj({ k: 'board', x: cx + 4, y: cy - 3, fw: 2, fh: 1, spr: () => SP.board() }); at(cx + 5, cy - 2, 'tab:treff', 'Anschlagbrett: Chronik und Ranglisten');
            building(cx - 13, cy - 12, 8, 5, '#1e3a8a', '#e7d7b0', 'tab:treff', 'Tauschhalle – Tauschbörse der Reisenden', 'ic-tausch');
            building(cx + 6, cy - 12, 5, 4, '#7c2d12', '#f4e3ae', 'treff', 'Gasthaus „Registra“ – Treffpunkt', 'ic-krug');
            // Duellring
            const rx = cx + 8, ry = cy + 5;
            for (let y = ry; y < ry + 7; y++) for (let x = rx; x < rx + 10; x++) { const d = ((x - rx - 4.5) / 5) ** 2 + ((y - ry - 3) / 3.5) ** 2; if (d < 1) set(x, y, d > .7 ? 'fence' : 'sand'); }
            for (let y = ry + 3; y < ry + 7; y++) set(rx + 4, y, 'sand'), set(rx + 5, y, 'sand');
            take(rx, ry, 10, 7); at(rx + 5, ry + 3, 'tab:treff', 'Duellring – Geister herausfordern');
            for (let i = 0; i < 8; i++) {
                const hx = x0 + 2 + Math.floor(R() * (x1 - x0 - 8)), hy = y0 + 2 + Math.floor(R() * (y1 - y0 - 6));
                if (free(hx - 1, hy - 1, 6, 5)) building(hx, hy, 4, 3, ['#b45309', '#7a1d1d', '#1e3a8a', '#3f6212'][i % 4], ['#f4e3ae', '#e2e8f0', '#e7d7b0'][i % 3]);
            }
        } else if (kind === 'wacht') {
            obj({ k: 'tower', x: cx - 1, y: cy - 2, fw: 2, fh: 1, spr: () => SP.tower() }); at(cx, cy - 1, 'talk:wacht', 'Wachturm – Ausblick');
            for (let i = 0; i < 10; i++) { const x = cx - 12 + Math.floor(R() * 24), y = cy - 8 + Math.floor(R() * 16); if (free(x, y, 1, 1)) obj({ k: 'deco', x, y, spr: () => SP.tuft(), solid: false }); }
        } else if (kind === 'wald') {
            obj({ k: 'bigtree', x: cx - 2, y: cy - 2, fw: 4, fh: 2, spr: () => SP.bigtree(), dy: 2 }); at(cx, cy, 'talk:cache', 'Der Cache-Baum');
            for (let i = 0; i < 14; i++) { const x = cx - 10 + Math.floor(R() * 20), y = cy - 7 + Math.floor(R() * 14); if (free(x, y, 1, 1)) obj({ k: 'deco', x, y, spr: () => R() < .6 ? SP.mushroom() : SP.log(), solid: false }); }
        } else if (kind === 'see') {
            for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const d = ((x - cx) / 13) ** 2 + ((y - cy + 1) / 8) ** 2 + (N(x / 4, y / 4) - .5) * .3; if (d < 1) set(x, y, d < .55 ? 'deep' : 'water'); else if (d < 1.25 && get(x, y) === 'grass') set(x, y, 'sand'); }
            for (let y = cy - 2; y <= cy; y++) for (let x = cx - 2; x <= cx + 2; x++) set(x, y, 'grass');
            for (let x = cx + 3; x < cx + 15; x++) set(x, cy - 1, 'plank'), set(x, cy, 'plank');
            obj({ k: 'well', x: cx - 1, y: cy - 1, fw: 2, fh: 1, spr: () => SP.well(), dy: 2 }); at(cx, cy, 'talk:brunnen', 'Der Bitbrunnen');
            for (let i = 0; i < 12; i++) { const a = R() * Math.PI * 2, x = Math.round(cx + Math.cos(a) * 14), y = Math.round(cy + Math.sin(a) * 9); if (inb(x, y) && !SOLID.has(G[y * MW + x]) && free(x, y, 1, 1)) obj({ k: 'deco', x, y, spr: () => SP.reeds(), solid: false }); }
            obj({ k: 'hut', x: cx - 16, y: cy - 10, fw: 2, fh: 1, spr: () => SP.hut(), dx: -4 });
        } else if (kind === 'moor') {
            for (let x = 4; x < MW - 4; x++) set(x, cy, 'plank'), set(x, cy + 1, 'plank');
            for (let y = 4; y < MH - 4; y++) set(cx, y, 'plank'), set(cx + 1, y, 'plank');
            for (let i = 0; i < 16; i++) { const x = 3 + Math.floor(R() * (MW - 6)), y = 3 + Math.floor(R() * (MH - 6)); if (get(x, y) === 'moor' && free(x, y, 1, 1)) obj({ k: 'dead', x, y, spr: () => SP.dead() }); }
            for (let i = 0; i < 20; i++) { const x = 3 + Math.floor(R() * (MW - 6)), y = 3 + Math.floor(R() * (MH - 6)); if (free(x, y, 1, 1)) obj({ k: 'deco', x, y, spr: () => SP.reeds(), solid: false }); }
            at(cx + 6, cy - 4, 'talk:moor', 'Ein Irrlicht flackert', { wisp: true });
        } else if (kind === 'kap') {
            for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const d = ((x - cx - 10) / 9) ** 2 + ((y - cy - 6) / 5) ** 2; if (d < 1) set(x, y, 'ice'); }
            obj({ k: 'hut', x: cx - 3, y: cy - 2, fw: 2, fh: 1, spr: () => SP.hut(), dx: -4, anim: 'smoke' }); at(cx - 2, cy - 1, 'talk:kap', 'Hütte am Frostkap');
            for (let i = 0; i < 10; i++) { const x = cx - 14 + Math.floor(R() * 28), y = cy - 9 + Math.floor(R() * 18); if (free(x, y, 1, 1)) obj({ k: 'deco', x, y, spr: () => SP.crystal() }); }
        } else if (kind === 'berg') {
            for (let y = 0; y < 10; y++) for (let x = 0; x < MW; x++) if (y < 6 + N(x / 5, 1) * 4) set(x, y, 'cliff');
            obj({ k: 'mine', x: cx - 2, y: cy - 6, fw: 3, fh: 2, spr: () => SP.mine(), dx: 0 }); at(cx, cy - 4, 'talk:mine', 'Stolleneingang');
            for (let x = cx - 8; x < cx + 9; x++) set(x, cy - 3, 'plank');
            obj({ k: 'cart', x: cx + 4, y: cy - 4, spr: () => SP.cart(), solid: false });
            for (let i = 0; i < 12; i++) { const x = cx - 15 + Math.floor(R() * 30), y = cy - 6 + Math.floor(R() * 14); if (free(x, y, 1, 1)) obj({ k: 'deco', x, y, spr: () => R() < .5 ? SP.crystal() : SP.rock(R() < .3 ? 1 : 0) }); }
        } else if (kind === 'steppe') {
            for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, x = Math.round(cx + Math.cos(a) * 7), y = Math.round(cy + Math.sin(a) * 4.5); obj({ k: 'monolith', x, y, spr: () => SP.monolith(), anim: 'leds' }); }
            at(cx, cy, 'talk:cluster', 'Der Kreis der Server-Monolithe');
            [[cx - 14, cy - 8, 0], [cx + 12, cy - 9, 1], [cx - 12, cy + 8, 1]].forEach(([x, y, v]) => obj({ k: 'tent', x, y, fw: 2, fh: 1, spr: () => SP.tent(v), dx: -7 }));
            obj({ k: 'fire', x: cx - 10, y: cy - 5, spr: () => SP.rock(0), anim: 'fire', solid: false });
            for (let i = 0; i < 24; i++) { const x = 2 + Math.floor(R() * (MW - 4)), y = 2 + Math.floor(R() * (MH - 4)); if (free(x, y, 1, 1)) obj({ k: 'deco', x, y, spr: () => SP.tuft(), solid: false }); }
        } else if (kind === 'ruine') {
            obj({ k: 'lair', x: cx - 2, y: cy - 6, fw: 5, fh: 2, spr: () => SP.lair(), dx: -5, anim: MN.bossDone() ? null : 'eyes' });
            if (!MN.bossDone()) at(cx, cy - 3, 'boss', 'Der Garbage Collector – herausfordern');
            else at(cx, cy - 3, 'talk:ruine', 'Die leeren Hallen von Alt-ROM');
            for (let i = 0; i < 14; i++) { const x = cx - 14 + Math.floor(R() * 28), y = cy - 8 + Math.floor(R() * 18); if (free(x, y, 1, 1)) obj({ k: 'pillar', x, y, spr: () => SP.pillar(R() < .5 ? 1 : 0) }); }
        }

        // Feldwerkstatt-Wagen (reist mit) nahe der Mitte
        const wpos = [[cx - 12, cy + 5], [cx + 9, cy + 6], [cx - 14, cy - 2], [cx + 12, cy - 2]].find(([x, y]) => free(x - 1, y - 1, 5, 3) && !SOLID.has(G[y * MW + x])) || [cx - 6, cy + 4];
        obj({ k: 'wagon', x: wpos[0], y: wpos[1], fw: 3, fh: 1, spr: () => SP.wagon(), dx: -2 });
        at(wpos[0] + 1, wpos[1] + 1, 'tab:fuhrpark', 'Feldwerkstatt-Wagen: Fuhrpark und Werkstatt');

        // Weltboss der Woche
        const wb = MN.worldBoss();
        if (wb.place === p.id) {
            const spots = [[cx + 6, cy + 4], [cx - 9, cy + 4], [cx + 6, cy - 7], [cx - 9, cy - 7], [cx - 12, cy + 6], [cx + 12, cy + 7], [cx, cy + 8]];
            const [bx, by] = spots.find(([x, y]) => free(x - 1, y - 2, 5, 4)) || spots[0]; take(bx, by, 3, 2, 2); objs.push({ k: 'weltboss', x: bx, y: by, fw: 3, fh: 2, icon: 'ic-weltboss', big: 4 }); at(bx + 1, by + 1, 'world', 'Weltboss: ' + wb.def.n, { r: 2.6 });
        }

        // Wege (nach den Gebäuden, damit Tore in Mauern entstehen) und Wegweiser
        exits.forEach(e => {
            carve(cx, cy, e.x, e.y, pathT);
            const sx = X.clamp(e.x + (e.x < cx ? 2 : e.x > cx ? -3 : 2), 1, MW - 2), sy = X.clamp(e.y + (e.y < cy ? 2 : e.y > cy ? -2 : -2), 1, MH - 2);
            objs.push({ k: 'signpost', x: sx, y: sy, spr: () => SP.signpost(), solid: false });
            at(e.x, e.y, 'road', e.r.n + ' → ' + (MN.seen(e.to.id) ? e.to.n : '???'), { road: e.r.id, r: 2.2 });
        });

        // Was mitten auf einem Weg steht (Monolith, Stein, Säule, Baum), kommt weg – Gebäude bleiben
        const MOVABLE = new Set(['monolith', 'deco', 'pillar', 'tree', 'pine', 'rock', 'dead', 'snowpine', 'bush', 'tent', 'fire']);
        for (let i = objs.length - 1; i >= 0; i--) {
            const o = objs[i]; if (!MOVABLE.has(o.k)) continue;
            let hit = false; for (let j = o.y; j < o.y + (o.fh || 1) && !hit; j++) for (let k = o.x; k < o.x + (o.fw || 1); k++) if (inb(k, j) && road[j * MW + k]) { hit = true; break; }
            if (hit) objs.splice(i, 1);
        }

        // 6) Rand und Streudeko
        const borderT = { hafen: 'tree', stadt: 'tree', wacht: 'rock', wald: 'pine', see: 'tree', moor: 'dead', kap: 'snowpine', berg: 'rock', steppe: 'rock', ruine: 'pillar' }[kind] || 'tree';
        const nearExit = (x, y) => exits.some(e => Math.abs(e.x - x) < 4 && Math.abs(e.y - y) < 4);
        for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
            const edge = Math.min(x, y, MW - 1 - x, MH - 1 - y);
            if (edge > 1 || nearExit(x, y) || occ[y * MW + x] || SOLID.has(G[y * MW + x]) || h2(x, y, 7) < .35) continue;
            if (borderT === 'tree' && G[y * MW + x] === TI.sand) continue;
            obj({ k: borderT, x, y, spr: deco(borderT, x, y) });
        }
        // im Inneren verstreut (nicht auf Wegen, nicht in der Mitte)
        const density = { wald: .2, see: .05, hafen: .03, stadt: .02, wacht: .03, moor: .02, kap: .05, berg: .04, steppe: .02, ruine: .03 }[kind] || .03;
        for (let y = 2; y < MH - 2; y++) for (let x = 2; x < MW - 2; x++) {
            if (occ[y * MW + x] || SOLID.has(G[y * MW + x]) || Math.abs(x - cx) < 6 && Math.abs(y - cy) < 4 || h2(x, y, 11) > density) continue;
            const t = TL[G[y * MW + x]];
            const k = t === 'forest' ? 'pine' : t === 'snow' || t === 'ice' ? 'snowpine' : t === 'sand' ? 'rock' : t === 'moor' ? 'dead' : t === 'ash' || t === 'ruin' ? 'pillar' : t === 'rock' || t === 'dirt' ? 'rock' : t === 'steppe' ? 'bush' : (h2(x, y, 3) < .5 ? 'tree' : 'bush');
            obj({ k, x, y, spr: deco(k, x, y) });
        }
        // kleine, nicht feste Deko
        for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
            if (occ[y * MW + x] || h2(x, y, 21) > .05) continue;
            const t = TL[G[y * MW + x]];
            if (t === 'grass' || t === 'flowers') obj({ k: 'deco', x, y, spr: () => SP.flower(Math.floor(h2(x, y, 5) * 4)), solid: false });
            else if (t === 'steppe' || t === 'sand') obj({ k: 'deco', x, y, spr: () => SP.tuft(), solid: false });
        }

        // Start: am Wegweiser der Strasse, über die man kam, sonst in der Mitte
        return { G, objs, inter, exits, cx, cy, kind, name: p.n, sub: KIND_NAME[kind] || '' };

        function deco(k, x, y) {
            const v = Math.floor(h2(x, y, 13) * 4);
            if (k === 'tree') return () => SP.tree(v === 0 ? 1 : 0);
            if (k === 'pine') return () => SP.pine(0);
            if (k === 'snowpine') return () => SP.pine(1);
            if (k === 'rock') return () => SP.rock(kind === 'kap' ? 2 : v === 0 ? 1 : 0);
            if (k === 'pillar') return () => SP.pillar(v % 2);
            return () => SP[k] ? SP[k]() : SP.bush();
        }
        function npc(id, x, y, label, act, prompt) {
            x = X.clamp(Math.round(x), 1, MW - 2); y = X.clamp(Math.round(y), 1, MH - 2);
            if (SOLID.has(G[y * MW + x])) set(x, y, kind === 'hafen' ? 'cobble' : 'dirt');
            const ic = { ada: 'npc-ada', otto: 'npc-otto', basar: 'taler', joe: 'npc-joe', flossie: 'npc-flossie', kiesel: 'npc-kiesel', esse: 'npc-esse', bolzen: 'npc-bolzen' }[id] || 'npc-ada';
            objs.push({ k: 'npc', x, y, icon: ic, name: label, npc: id, solid: false });
            take(x, y, 1, 1, 2);
            at(x, y, act, prompt || label, { npc: id });
        }
        function building(x, y, w, h, roof, wall, act, label, sign) {
            take(x - 1, y - 1, w + 2, h + 2);
            obj({ k: 'house', x, y: y + h - 2, fw: w, fh: 2, spr: () => SP.house(w, h, roof, wall), dy: 0, sign });
            for (let k = 0; k < 2; k++) set(x + (w >> 1) - 1 + k, y + h, PATH[kind] === 'cobble' ? 'cobble' : 'dirt');
            if (act) at(x + (w >> 1), y + h, act, label);
        }
    }

    /* ── Ansicht ── */
    let st = null;
    const O = X.mnemoraOrt = { ctx: {} };
    O.isOpen = () => !!st;
    O.pos = () => st ? Math.round(st.me.x) + ',' + Math.round(st.me.y) : '';
    /* Für Tests: Ziele des offenen Orts und „dorthin springen und benutzen“ */
    O.debug = { inter: () => st ? st.map.inter.map(i => ({ act: i.act, label: i.label, x: i.x, y: i.y })) : [], use: label => { const i = st && st.map.inter.find(x => x.label.indexOf(label) >= 0); if (i) { st.me.x = i.x + .5; st.me.y = i.y + .5; use(i); } return !!i; } };

    function build(map) {
        const cv = document.createElement('canvas'); cv.width = MW * T; cv.height = MH * T;
        const g = cv.getContext('2d');
        for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
            const t = map.G[y * MW + x], w = WATER.has(t);
            const same = (dx, dy) => { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= MW || yy >= MH) return true; return WATER.has(map.G[yy * MW + xx]) === w; };
            paintTile(g, t, x, y, { n: same(0, -1), s: same(0, 1), w: same(-1, 0), e: same(1, 0) });
        }
        // Schatten unter festen Objekten
        g.fillStyle = 'rgba(0,0,0,.18)';
        map.objs.forEach(o => { if (o.solid !== false && o.k !== 'npc') g.fillRect(o.x * T + 1, (o.y + (o.fh || 1)) * T - 4, (o.fw || 1) * T - 2, 4); });
        const solid = new Uint8Array(MW * MH);
        for (let i = 0; i < MW * MH; i++) solid[i] = SOLID.has(map.G[i]) ? 1 : 0;
        map.objs.forEach(o => { if (o.solid === false || o.k === 'npc') return; for (let j = o.y; j < o.y + (o.fh || 1); j++) for (let i = o.x; i < o.x + (o.fw || 1); i++) if (i >= 0 && j >= 0 && i < MW && j < MH) solid[j * MW + i] = 1; });
        map.objs.forEach(o => { if (o.k === 'npc') solid[o.y * MW + o.x] = 1; });
        return { cv, solid };
    }

    function open(placeId, opts) {
        opts = opts || {};
        if (st) close(true);
        const p = MN.place(placeId); if (!p) return;
        const map = gen(p), b = build(map);
        let sx = map.cx, sy = map.cy + 2;
        const ex = opts.from && map.exits.find(e => e.r.id === opts.from);
        if (ex) { sx = ex.x + (ex.x <= 1 ? 2 : ex.x >= MW - 2 ? -2 : 0); sy = ex.y + (ex.y <= 1 ? 2 : ex.y >= MH - 2 ? -2 : 0); }
        if (b.solid[Math.round(sy) * MW + Math.round(sx)]) { outer: for (let r = 1; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = Math.round(sx) + dx, y = Math.round(sy) + dy; if (x > 0 && y > 0 && x < MW - 1 && y < MH - 1 && !b.solid[y * MW + x]) { sx = x; sy = y; break outer; } } }

        const root = document.createElement('div');
        root.className = 'ort'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', p.n + ' – begehbare Karte');
        root.innerHTML = '<canvas class="ort__cv" aria-hidden="true"></canvas><div class="ort__tags"></div>' +
            '<div class="ort__hud"><div class="ort__title"><b>' + esc(p.n) + '</b><span>' + esc(map.sub) + '</span></div><span class="spacer"></span>' +
            '<button class="btn btn--sm" type="button" data-o="help" aria-label="Steuerung">?</button><button class="btn btn--sm btn--primary" type="button" data-o="close">Zur Karte</button></div>' +
            '<button class="ort__prompt" type="button" hidden></button>' +
            '<p class="ort__help small" hidden>Laufen: <b>WASD</b> oder <b>Pfeiltasten</b> – oder einfach hinklicken/-tippen. <b>E</b>, <b>Leertaste</b> oder Klick auf den Hinweis: reden, benutzen, losziehen. <b>Esc</b>: zurück zur Karte.</p>';
        document.body.appendChild(root); document.body.style.overflow = 'hidden';
        const cv = root.querySelector('.ort__cv'), g = cv.getContext('2d'), tags = root.querySelector('.ort__tags'), prompt = root.querySelector('.ort__prompt');
        st = { p, map, base: b.cv, solid: b.solid, root, cv, g, tags, prompt, me: { x: sx + .5, y: sy + .5, dir: 1, moving: false, icon: (MN.active() || { id: 'gh-itx' }).id }, keys: {}, path: null, goal: null, others: {}, t0: performance.now(), last: performance.now(), sent: 0, sentPos: '', scale: 3, vw: 0, vh: 0, cam: { x: 0, y: 0 }, near: null, raf: 0 };
        // Bilder vorladen
        icon(st.me.icon); map.objs.forEach(o => { if (o.icon) icon(o.icon); if (o.sign) icon(o.sign); });
        resize();
        st.onResize = resize; addEventListener('resize', resize);
        st.onKey = e => key(e, true); st.onKeyUp = e => key(e, false);
        addEventListener('keydown', st.onKey); addEventListener('keyup', st.onKeyUp);
        cv.addEventListener('pointerdown', pointer);
        root.addEventListener('click', e => {
            const b2 = e.target.closest('[data-o]');
            if (b2 && b2.dataset.o === 'close') close();
            if (b2 && b2.dataset.o === 'help') root.querySelector('.ort__help').hidden = !root.querySelector('.ort__help').hidden;
        });
        prompt.addEventListener('click', () => { if (st && st.near) use(st.near); });
        st.raf = requestAnimationFrame(loop);
        if (X.mnNet) X.mnNet.fast && X.mnNet.fast(true);
        if (!opts.quiet) X.toast(p.n, (map.sub ? map.sub + ' · ' : '') + 'WASD/Pfeile oder klicken zum Laufen, E zum Benutzen.', { iconHtml: X.pix.svg(MN.KIND_ICON[p.kind] || 'ic-arche', 26), time: 3500 });
    }
    function close(silent) {
        if (!st) return;
        cancelAnimationFrame(st.raf);
        removeEventListener('resize', st.onResize); removeEventListener('keydown', st.onKey); removeEventListener('keyup', st.onKeyUp);
        st.root.remove(); document.body.style.overflow = '';
        st = null;
        if (X.mnNet && X.mnNet.fast) X.mnNet.fast(false);
        if (!silent && O.ctx.onClose) O.ctx.onClose();
    }
    O.open = open; O.close = () => close();

    function resize() {
        if (!st) return;
        const w = st.root.clientWidth, h = st.root.clientHeight;
        const s = Math.max(2, Math.min(5, Math.round(Math.min(w / 440, h / 300))));
        st.scale = s; st.vw = Math.ceil(w / s); st.vh = Math.ceil(h / s);
        st.cv.width = st.vw; st.cv.height = st.vh;
        st.cv.style.width = st.vw * s + 'px'; st.cv.style.height = st.vh * s + 'px';
        st.g.imageSmoothingEnabled = false;
    }
    const typing = () => { const a = document.activeElement; return a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) || !!document.querySelector('.modal, .fight'); };
    function key(e, down) {
        if (!st) return;
        if (typing()) { if (!down) st.keys = {}; return; }   // Loslassen immer zählen, damit nichts „hängt“
        const k = e.key.toLowerCase();
        if (down && k === 'escape') { close(); return; }
        if (down && (k === 'e' || k === ' ' || k === 'enter')) { if (st.near) { use(st.near); e.preventDefault(); } return; }
        const map = { arrowup: 'u', w: 'u', arrowdown: 'd', s: 'd', arrowleft: 'l', a: 'l', arrowright: 'r', d: 'r' };
        if (map[k]) { st.keys[map[k]] = down; if (down) { st.path = null; st.goal = null; } e.preventDefault(); }
    }
    function toWorld(cx, cy) {
        const r = st.cv.getBoundingClientRect();
        return { x: ((cx - r.left) / st.scale + st.cam.x) / T, y: ((cy - r.top) / st.scale + st.cam.y) / T };
    }
    function pointer(e) {
        if (!st) return;
        const w = toWorld(e.clientX, e.clientY);
        // andere Reisende anklicken
        const other = Object.values(st.others).find(o => Math.abs(o.x - w.x) < .8 && Math.abs(o.y - .5 - w.y) < 1);
        if (other && O.ctx.player) { O.ctx.player(other.p); return; }
        const it = st.map.inter.find(i => Math.hypot(i.x + .5 - w.x, i.y + .5 - w.y) < 1.3);
        const tx = Math.floor(it ? it.x : w.x), ty = Math.floor(it ? it.y : w.y);
        const path = findPath(Math.floor(st.me.x), Math.floor(st.me.y), tx, ty);
        if (path) { st.path = path; st.goal = it || null; }
    }
    /* Wegsuche auf dem Kachelraster (Breitensuche); Ziel fest → nächstes freies Nachbarfeld */
    function findPath(x0, y0, x1, y1) {
        const S = st.solid, idx = (x, y) => y * MW + x;
        if (x1 < 0 || y1 < 0 || x1 >= MW || y1 >= MH) return null;
        const goals = new Set();
        if (!S[idx(x1, y1)]) goals.add(idx(x1, y1)); else [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([dx, dy]) => { const x = x1 + dx, y = y1 + dy; if (x >= 0 && y >= 0 && x < MW && y < MH && !S[idx(x, y)]) goals.add(idx(x, y)); });
        if (!goals.size) return null;
        const prev = new Int32Array(MW * MH).fill(-1), q = [idx(x0, y0)]; prev[q[0]] = q[0];
        while (q.length) {
            const c = q.shift();
            if (goals.has(c)) { const out = []; let k = c; while (k !== idx(x0, y0)) { out.unshift({ x: k % MW + .5, y: Math.floor(k / MW) + .5 }); k = prev[k]; } return out; }
            const cx = c % MW, cy = Math.floor(c / MW);
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const x = cx + dx, y = cy + dy, n = idx(x, y); if (x < 0 || y < 0 || x >= MW || y >= MH || S[n] || prev[n] >= 0) return; prev[n] = c; q.push(n); });
        }
        return null;
    }
    const walkable = (x, y) => { const tx = Math.floor(x), ty = Math.floor(y); return tx >= 0 && ty >= 0 && tx < MW && ty < MH && !st.solid[ty * MW + tx]; };
    function moveBy(dx, dy) {
        const m = st.me, hw = .28;
        const ok = (x, y) => walkable(x - hw, y - .1) && walkable(x + hw, y - .1) && walkable(x - hw, y + .25) && walkable(x + hw, y + .25);
        if (dx && ok(m.x + dx, m.y)) m.x += dx;
        if (dy && ok(m.x, m.y + dy)) m.y += dy;
    }
    function use(it) {
        if (!it) return;
        const C = O.ctx, a = it.act;
        X.beep(660, .04, 'square', .03);
        if (a === 'road') { close(true); C.road && C.road(it.road); return; }
        if (a === 'home') { close(true); C.home && C.home(); return; }
        if (a === 'boss') { close(true); C.boss && C.boss(); return; }
        if (a === 'world') { close(true); C.world && C.world(); return; }
        if (a === 'treff' || a.startsWith('tab:')) { const t = a === 'treff' ? 'treff' : a.slice(4); close(true); C.tab && C.tab(t); return; }
        if (a.startsWith('talk')) talk(it);
    }
    const LINES = {
        wacht: 'Vom Wachturm siehst du die Nebelwand im Westen glitzern. Irgendwo dahinter liegt Sektaria.',
        cache: '„Der Cache-Baum merkt sich alles, was je unter ihm geschah“, steht auf einem Schild. Die Laternen flackern im Takt eines alten Prozessors.',
        brunnen: 'Aus dem Bitbrunnen steigen kleine Luftblasen – Nullen und Einsen, sagen die Leute aus dem Dorf.',
        moor: 'Ein Irrlicht tanzt über dem Moor. Folgst du ihm, vergisst du, wohin du wolltest. Besser nicht.',
        kap: 'In der Hütte knistert ein Ofen. An der Wand hängt eine Karte mit einem roten Kreuz – mitten im Eis.',
        mine: 'Aus dem Stollen weht warme Luft. Tief drinnen hört man Erz klirren.',
        cluster: 'Die Monolithe summen. Jeder ist ein uralter Server, und alle zusammen rechnen an etwas, das niemand versteht.',
        ruine: 'Die Hallen von Alt-ROM sind leer. Zum ersten Mal seit Jahrhunderten bleibt hier alles, wie es ist.'
    };
    function talk(it) {
        const C = O.ctx, id = it.act.split(':')[1] || it.npc;
        let text = LINES[id] || '', face = it.npc ? { ada: 'npc-ada' }[it.npc] || 'npc-ada' : (MN.KIND_ICON[st.p.kind] || 'ic-arche'), name = it.label;
        if (it.npc === 'ada' || id === 'ada') { face = 'npc-ada'; name = 'Händlerin Ada'; text = (C.hint ? C.hint() : '').replace(/<[^>]+>/g, ''); }
        X.modal('<div class="npc"><div class="npc__face">' + X.pix.svg(face, 48) + '</div><div><h2 class="mb-1">' + esc(name) + '</h2><p class="npc__say">' + esc(text) + '</p></div></div>' +
            '<div class="row mt-2"><button class="btn btn--primary" type="button" data-close>Weiter</button></div>');
    }

    /* ── Schleife ── */
    function loop(now) {
        if (!st) return;
        const dt = Math.min(.05, (now - st.last) / 1000); st.last = now;
        update(dt, now); if (!st) return;   // update kann den Ort verlassen (Ausgang, Kampf …)
        draw(now);
        st.raf = requestAnimationFrame(loop);
    }
    function update(dt, now) {
        const m = st.me, sp = 4.6 * dt;
        let dx = (st.keys.r ? 1 : 0) - (st.keys.l ? 1 : 0), dy = (st.keys.d ? 1 : 0) - (st.keys.u ? 1 : 0);
        if (!dx && !dy && st.path && st.path.length) {
            const n = st.path[0], vx = n.x - m.x, vy = n.y - m.y, d = Math.hypot(vx, vy);
            if (d < .12) { st.path.shift(); if (!st.path.length) { st.path = null; if (st.goal) { const gi = st.goal; st.goal = null; use(gi); return; } } }
            else { dx = vx / d; dy = vy / d; }
        }
        if (dx || dy) { const l = Math.hypot(dx, dy); moveBy(dx / l * sp, dy / l * sp); m.moving = true; if (Math.abs(dx) > .1) m.dir = dx > 0 ? 1 : -1; } else m.moving = false;
        // Was ist in der Nähe?
        let near = null, nd = 99;
        st.map.inter.forEach(i => { const d = Math.hypot(i.x + .5 - m.x, i.y + .5 - m.y); if (d < i.r && d < nd) { nd = d; near = i; } });
        if (near !== st.near) {
            st.near = near; st.prompt.hidden = !near;
            if (near) st.prompt.innerHTML = '<kbd>E</kbd> ' + esc(near.label);
        }
        // Andere Reisende (Online): zum gemeldeten Punkt laufen
        const list = (O.ctx.others ? O.ctx.others() : []).filter(o => o.place === st.p.id && o.pos);
        const seen = {};
        list.forEach(o => {
            seen[o.id] = 1;
            const tgt = o.pos.split(',').map(Number); if (tgt.length !== 2 || !isFinite(tgt[0])) return;
            const cur = st.others[o.id] || (st.others[o.id] = { x: tgt[0] + .5, y: tgt[1] + .5, p: o });
            cur.p = o; cur.tx = X.clamp(tgt[0], 0, MW - 1) + .5; cur.ty = X.clamp(tgt[1], 0, MH - 1) + .5;
        });
        Object.keys(st.others).forEach(id => {
            const o = st.others[id]; if (!seen[id]) { delete st.others[id]; return; }
            const vx = o.tx - o.x, vy = o.ty - o.y, d = Math.hypot(vx, vy);
            o.moving = d > .05; if (d > 6) { o.x = o.tx; o.y = o.ty; } else if (o.moving) { const s = Math.min(d, 4.2 * dt); o.x += vx / d * s; o.y += vy / d * s; if (Math.abs(vx) > .05) o.dir = vx > 0 ? 1 : -1; }
        });
        // eigene Position melden (halb-live)
        const pos = O.pos();
        if (pos !== st.sentPos && now - st.sent > 2500 && X.mnNet && X.mnNet.nudge) { st.sent = now; st.sentPos = pos; X.mnNet.nudge(); }
    }
    function draw(now) {
        const { g, vw, vh, map } = st, m = st.me, f = (now - st.t0) / 1000, W = MW * T, H = MH * T;
        // Kamera
        st.cam.x = W <= vw ? (W - vw) / 2 : X.clamp(Math.round(m.x * T - vw / 2), 0, W - vw);
        st.cam.y = H <= vh ? (H - vh) / 2 : X.clamp(Math.round(m.y * T - vh / 2), 0, H - vh);
        const cx = Math.round(st.cam.x), cy = Math.round(st.cam.y);
        g.fillStyle = '#0b0d14'; g.fillRect(0, 0, vw, vh);
        g.drawImage(st.base, -cx, -cy);
        // Wasser glitzert
        const fr = Math.floor(f * 3);
        for (let ty = Math.max(0, Math.floor(cy / T)); ty < Math.min(MH, Math.ceil((cy + vh) / T)); ty++) for (let tx = Math.max(0, Math.floor(cx / T)); tx < Math.min(MW, Math.ceil((cx + vw) / T)); tx++) {
            const t = map.G[ty * MW + tx]; if (!WATER.has(t)) continue;
            const r = h2(tx, ty, fr % 4);
            g.fillStyle = t === TI.bog ? 'rgba(160,180,140,.5)' : 'rgba(230,250,255,.55)';
            g.fillRect(tx * T - cx + Math.floor(r * 12), ty * T - cy + Math.floor(h2(tx, ty, fr % 4 + 9) * 14), 3, 1);
        }
        // Objekte, NPCs, Reisende, du – nach Tiefe sortiert
        const items = [];
        map.objs.forEach(o => { const bx = o.x * T, by = (o.y + (o.fh || 1)) * T; if (bx > cx + vw + 160 || bx + 160 < cx || by < cy - 8 || by - 160 > cy + vh) return; items.push({ y: by, o }); });
        Object.values(st.others).forEach(o => items.push({ y: o.y * T + 4, who: o }));
        items.push({ y: m.y * T + 4, me: true });
        items.sort((a, b) => a.y - b.y);
        const tagHtml = [];
        items.forEach(it => {
            if (it.me) { drawMech(st.me.icon, m.x, m.y, m.moving, m.dir, f, cx, cy, true); return; }
            if (it.who) { drawMech(it.who.p.mech && X.pix.has(it.who.p.mech) ? it.who.p.mech : 'gh-itx', it.who.x, it.who.y, it.who.moving, it.who.dir || 1, f + 1.7, cx, cy); tagHtml.push(tag(it.who.x, it.who.y - 1.35, it.who.p.nick, 'is-other')); return; }
            const o = it.o;
            if (o.k === 'npc') { const img = icon(o.icon), bob = Math.floor(f * 2 + o.x) % 2; g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(o.x * T + 3 - cx, o.y * T + 13 - cy, 10, 3); if (ok(img)) g.drawImage(img, o.x * T - cx, o.y * T - 2 - bob - cy, 16, 16); tagHtml.push(tag(o.x + .5, o.y - .3, o.name, 'is-npc')); return; }
            if (o.k === 'weltboss') { const img = icon(o.icon), s = 16 * (o.big || 3), bob = Math.floor(f * 1.5) % 2 * 2; if (ok(img)) { g.save(); g.globalAlpha = .9; g.drawImage(img, o.x * T + (o.fw * T - s) / 2 - cx, (o.y + o.fh) * T - s - bob - cy, s, s); g.restore(); } tagHtml.push(tag(o.x + o.fw / 2, o.y - 1.4, MN.worldBoss().def.n, 'is-boss')); return; }
            const spr = o._c || (o._c = o.spr ? o.spr() : null); if (!spr) return;
            const x = o.x * T + ((o.fw || 1) * T - spr.width) / 2 + (o.dx || 0), y = (o.y + (o.fh || 1)) * T - spr.height + (o.dy || 0);
            g.drawImage(spr, Math.round(x - cx), Math.round(y - cy));
            if (o.sign) { const img = icon(o.sign), sx = Math.round(x - cx + spr.width / 2 - 8), sy = Math.round(y - cy + spr.height * .58 - 4); g.fillStyle = '#3a2618'; g.fillRect(sx - 2, sy - 2, 20, 20); g.fillStyle = '#c9a26a'; g.fillRect(sx - 1, sy - 1, 18, 18); if (ok(img)) g.drawImage(img, sx, sy, 16, 16); }
            if (o.anim) anim(o, spr, x - cx, y - cy, f);
        });
        // Irrlichter im Moor
        map.inter.forEach(i => { if (!i.wisp) return; const x = (i.x + .5) * T + Math.sin(f * 1.3) * 10 - cx, y = i.y * T + Math.cos(f * 1.7) * 6 - cy; g.fillStyle = 'rgba(190,255,200,.85)'; g.fillRect(Math.round(x), Math.round(y), 3, 3); g.fillStyle = 'rgba(190,255,200,.25)'; g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 7, 7); });
        // Ziel-Markierung
        if (st.path && st.path.length) { const e = st.path[st.path.length - 1]; g.strokeStyle = '#fde68a'; g.strokeRect(Math.floor(e.x - .5) * T - cx + 3.5, Math.floor(e.y - .5) * T - cy + 3.5, 9, 9); }
        tagHtml.push(tag(m.x, m.y - 1.35, 'Du', 'is-me'));
        st.tags.innerHTML = tagHtml.join('');
    }
    function tag(wx, wy, text, cls) {
        const r = st.cv.getBoundingClientRect(), rr = st.root.getBoundingClientRect();
        const x = (wx * T - st.cam.x) * st.scale + r.left - rr.left, y = (wy * T - st.cam.y) * st.scale + r.top - rr.top;
        if (x < -80 || y < -20 || x > rr.width + 80 || y > rr.height + 20) return '';
        return '<span class="ort__tag ' + cls + '" style="transform:translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)">' + esc(text) + '</span>';
    }
    function drawMech(id, x, y, moving, dir, f, cx, cy, me) {
        const g = st.g, img = icon(id), bob = moving ? Math.floor(f * 8) % 2 : Math.floor(f * 1.5) % 2;
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(Math.round(x * T - 6 - cx), Math.round(y * T + 3 - cy), 12, 3);
        if (me) { g.fillStyle = 'rgba(103,232,249,.35)'; g.fillRect(Math.round(x * T - 7 - cx), Math.round(y * T + 4 - cy), 14, 1); }
        if (!ok(img)) return;
        g.save(); g.translate(Math.round(x * T - cx), Math.round(y * T - 16 - bob - cy + 4)); if (dir < 0) g.scale(-1, 1);
        g.drawImage(img, -8, 0, 16, 16); g.restore();
    }
    function anim(o, spr, x, y, f) {
        const g = st.g;
        if (o.anim === 'light') { const on = Math.floor(f * 2) % 2; g.fillStyle = on ? 'rgba(253,230,138,.95)' : 'rgba(253,230,138,.55)'; g.fillRect(Math.round(x + 8), Math.round(y + 7), 10, 8); if (on) { g.fillStyle = 'rgba(253,230,138,.18)'; g.fillRect(Math.round(x - 20), Math.round(y + 5), 66, 12); } }
        else if (o.anim === 'glow') { g.fillStyle = Math.floor(f * 3) % 2 ? '#ffb347' : '#ff6a1f'; g.fillRect(Math.round(x + 8), Math.round(y + 17), 6, 4); }
        else if (o.anim === 'leds') { for (let k = 0; k < 8; k++) { const on = h2(o.x * 7 + k, Math.floor(f * 3), 5) > .5; g.fillStyle = on ? '#22c55e' : '#14532d'; g.fillRect(Math.round(x + 3), Math.round(y + 5 + k * 5), 2, 1); g.fillStyle = on ? '#164e63' : '#38bdf8'; g.fillRect(Math.round(x + 13), Math.round(y + 5 + k * 5), 1, 1); } }
        else if (o.anim === 'eyes') { const on = Math.floor(f * .8) % 3; if (on) { g.fillStyle = '#ef4444'; g.fillRect(Math.round(x + 35), Math.round(y + 44), 5, 3); g.fillRect(Math.round(x + 50), Math.round(y + 44), 5, 3); } }
        else if (o.anim === 'fountain') { const k = Math.floor(f * 6) % 3; g.fillStyle = '#c9f2ef'; g.fillRect(Math.round(x + 22), Math.round(y + 2 - k), 2, 3); g.fillRect(Math.round(x + 18 - k), Math.round(y + 5 + k), 2, 2); g.fillRect(Math.round(x + 26 + k), Math.round(y + 5 + k), 2, 2); }
        else if (o.anim === 'smoke') { for (let k = 0; k < 4; k++) { const t = (f * .6 + k * .25) % 1; g.fillStyle = 'rgba(226,232,240,' + (0.6 * (1 - t)).toFixed(2) + ')'; g.fillRect(Math.round(x + 33 + Math.sin(t * 6 + k) * 3), Math.round(y - t * 26), 4, 4); } }
        else if (o.anim === 'fire') { const k = Math.floor(f * 8) % 3; g.fillStyle = '#ff6a1f'; g.fillRect(Math.round(x + 4), Math.round(y - 3 - k), 6, 5 + k); g.fillStyle = '#ffb347'; g.fillRect(Math.round(x + 6), Math.round(y - 1 - k), 2, 3 + k); }
    }
})();
