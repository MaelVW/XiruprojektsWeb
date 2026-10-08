/* ==========================================================================
   Mech-Grafik der Werft – geteilt von konto/skilltree.html (Werkhalle) und der Startseite (Vorschau).
   XIRU.mechArt.draw(f, run) → SVG-Text des aktuellen Mechs (f = Zeit in Sekunden, run = Testlauf).
   Braucht XIRU.mech (core.js).
   ========================================================================== */
(function () {
    'use strict';
    let M;   // XIRU.mech – wird bei jedem Zeichnen gesetzt
    /* ── Mech zeichnen: jedes Bauteil hat seine eigene Grafik ── */
    const rot = (a, x, y) => 'transform="rotate(' + a.toFixed(1) + ' ' + x + ' ' + y + ')"';
    function smoke(x, y, f) {
        return [0, .5].map(o => { const k = (f * .6 + o) % 1; return '<circle cx="' + (x + k * 8) + '" cy="' + (y - k * 36) + '" r="' + (5 + k * 7) + '" fill="#8792a8" opacity="' + (.7 - k * .7).toFixed(2) + '"/>'; }).join('');
    }
    /* f = Zeit in Sekunden, run = Testlauf (schneller, wackelt) */
    /* Der Mech: eine schlanke, schwer gepanzerte Kampfmaschine. Cockpit als dunkle Glasluke in der Brust,
       Helm mit Visier-Schlitz, breite Schulterpanzer, Energielinien. Fehlende Teile erscheinen als Hologramm. */
    const FRAME = {
        none:         { ac: '#3ff3ff', base: 'none',    plate: 'none',    edge: '#3ff3ff' },
        'r-schrott':  { ac: '#ff8a3d', base: '#1e1712', plate: '#2c2119', edge: '#000' },
        'r-alu':      { ac: '#3ff3ff', base: '#161c28', plate: '#232c3e', edge: '#000' },
        'r-titan':    { ac: '#5b8cff', base: '#10141f', plate: '#1c2336', edge: '#000' },
        'r-kristall': { ac: '#c084fc', base: '#140f24', plate: '#241a40', edge: '#000' }
    };
    const pts = arr => arr.map(q => q[0] + ',' + q[1]).join(' ');
    const mirror = arr => arr.map(q => [240 - q[0], q[1]]);
    function drawMech(f, run) {
        f = f || 0;
        const ins = sl => M.installed(sl), cond = sl => { const p = ins(sl); return p ? M.cond(p.id) : 100; };
        const sp = run ? 4 : 1, A = f * 220 * sp, pulse = (.6 + Math.sin(f * 3) * .4).toFixed(2);
        const r = ins('rahmen'), a = ins('antrieb'), k = ins('kern'), sn = ins('sensor'), w = ins('arm'), pz = ins('panzer');
        const F = FRAME[r ? r.id : 'none'], AC = F.ac, holo = !r;
        const bob = run ? (Math.floor(f * 10) % 2 ? -2 : 0) : Math.round(Math.sin(f * 1.4) * 1.2);
        const step = run ? Math.sin(f * 14) * 5 : 0;
        const water = a && (a.id === 'a-paddel' || a.id === 'a-schraube');
        // Panzerteil: im Hologramm-Modus nur leuchtende Umrisse
        const armor = (arr, fill, extra) => holo
            ? '<polygon points="' + pts(arr) + '" fill="#3ff3ff" fill-opacity=".05" stroke="#3ff3ff" stroke-opacity=".7" stroke-width="1.5" stroke-dasharray="4 3"/>'
            : '<polygon points="' + pts(arr) + '" fill="' + (fill || F.base) + '" stroke="#000" stroke-width="2"' + (extra || '') + '/>';
        const glow = (inner, op) => '<g filter="url(#mglow)" opacity="' + (op == null ? 1 : op) + '">' + inner + '</g>';
        const line = (x1, y1, x2, y2, c, wdt, op) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (c || AC) + '" stroke-width="' + (wdt || 2) + '"' + (op != null ? ' opacity="' + op + '"' : '') + '/>';
        let g = '<defs><filter id="mglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';

        /* ── Rücken: Turbinen, Triebwerke, Rebreather ── */
        if (a && a.id === 'a-paddel') [86, 154].forEach(cx => {   // Hydro-Turbinen
            g += '<circle cx="' + cx + '" cy="34" r="16" fill="#0a0e18" stroke="#000" stroke-width="2"/>';
            g += '<g ' + rot(A * 1.4, cx, 34) + '>' + [0, 60, 120].map(d => '<rect x="' + (cx - 2) + '" y="20" width="4" height="28" fill="#2a3446" transform="rotate(' + d + ' ' + cx + ' 34)"/>').join('') + '</g>';
            g += glow('<circle cx="' + cx + '" cy="34" r="15" fill="none" stroke="' + AC + '" stroke-width="2" opacity="' + pulse + '"/>');
        });
        if (a && a.id === 'a-duesen') [[94, 1], [146, -1]].forEach(([cx]) => {   // Plasma-Triebwerke
            const fl = 26 + (Math.floor(f * 14) % 2) * 10;
            g += '<polygon points="' + pts([[cx - 10, 64], [cx + 10, 64], [cx + 8, 104], [cx - 8, 104]]) + '" fill="#0d1120" stroke="#000" stroke-width="2"/>';
            g += glow('<polygon points="' + pts([[cx - 7, 104], [cx + 7, 104], [cx, 104 + fl]]) + '" fill="#ff3df0" opacity=".85"/><polygon points="' + pts([[cx - 3, 104], [cx + 3, 104], [cx, 104 + fl * .6]]) + '" fill="#fff"/>');
        });
        if (water) {   // Rebreather: Atemluft-Filter hinter dem Nacken, Schnorchel-Rückgrat
            g += '<rect x="100" y="28" width="12" height="26" fill="#0d1322" stroke="#000" stroke-width="2"/><rect x="128" y="28" width="12" height="26" fill="#0d1322" stroke="#000" stroke-width="2"/>';
            g += glow([33, 39, 45].map(y => '<rect x="102" y="' + y + '" width="8" height="2" fill="' + AC + '"/><rect x="130" y="' + y + '" width="8" height="2" fill="' + AC + '"/>').join(''), pulse);
            g += '<polyline points="' + pts([[150, 50], [158, 30], [158, -4], [150, -8]]) + '" fill="none" stroke="#0d1322" stroke-width="6"/>' + glow(line(158, 30, 158, -2, AC, 1.5, .8));
            const bub = (f * 26) % 26;
            g += '<rect x="' + (149 + Math.round(Math.sin(f * 3) * 2)) + '" y="' + Math.round(-10 - bub) + '" width="3" height="3" fill="#a5f3fc" opacity="' + (1 - bub / 26).toFixed(2) + '"/>';
        }

        /* ── Beine ── */
        const leg = s0 => {
            const hx = 120 + s0 * 14, kb = s0 * step;
            let L = '';
            if (!a) {
                L += '<polyline points="' + pts([[hx, 120], [hx + s0 * 3, 152], [hx + s0 * 5, 196]]) + '" fill="none" stroke="#3ff3ff" stroke-opacity=".5" stroke-width="2" stroke-dasharray="4 3"/>';
                return L;
            }
            if (a.id === 'a-beine') {   // Rückwärtsgelenk mit Hydraulik
                const kx = hx + s0 * 16, ky = 146 + kb, ax = hx + s0 * 6, ay = 180;
                L += armor([[hx - 8, 120], [hx + 8, 120], [kx + 6, ky], [kx - 6, ky]], F.plate);
                L += armor([[kx - 7, ky], [kx + 7, ky], [ax + 6, ay], [ax - 6, ay]]);
                L += line(hx + s0 * 4, 128, ax, ay - 6, '#5b6478', 3);
                L += armor([[ax - 14, ay], [ax + 14, ay], [ax + 20, 200], [ax + 4, 194], [ax - 4, 194], [ax - 20, 200]], F.plate);
                L += glow('<polygon points="' + pts([[kx, ky - 6], [kx + 6, ky], [kx, ky + 6], [kx - 6, ky]]) + '" fill="' + AC + '"/>', pulse);
                return L;
            }
            const kx = hx + s0 * 2, ky = 150 + kb;
            L += armor([[hx - 9, 120], [hx + 9, 120], [kx + 7, ky], [kx - 7, ky]], F.plate);                            // Oberschenkel
            L += armor([[kx - 8, ky + 2], [kx + 8, ky + 2], [kx + s0 * 3 + 10, 186], [kx + s0 * 3 - 10, 186]]);          // Schienbein
            L += armor([[kx + s0 * 3 + (s0 > 0 ? 2 : -12), ky + 8], [kx + s0 * 3 + (s0 > 0 ? 12 : -2), ky + 8], [kx + s0 * 3 + (s0 > 0 ? 12 : -2), 178]], F.plate); // Wadenpanzer
            L += glow('<polygon points="' + pts([[kx, ky - 5], [kx + 5, ky], [kx, ky + 5], [kx - 5, ky]]) + '" fill="' + AC + '"/>' + line(kx, ky + 8, kx + s0 * 3, 182, AC, 1.5, .7), pulse);
            const fx = kx + s0 * 3;
            if (a.id === 'a-raupe') {
                L += '<rect x="' + (fx - 18) + '" y="184" width="36" height="16" fill="#0b0f1a" stroke="#000" stroke-width="2"/>' + [-12, -4, 4, 12].map(o => '<g ' + rot(A, fx + o, 192) + '><rect x="' + (fx + o - 3) + '" y="189" width="6" height="6" fill="#2a3446"/></g>').join('') + glow(line(fx - 16, 186, fx + 16, 186, AC, 1.5, .8));
            } else {
                L += armor([[fx - 12, 186], [fx + 12, 186], [fx + 16, 198], [fx - 16, 198]], F.plate);
                if (a.id === 'a-schraube') {   // Hydro-Jet an der Wade
                    const jx = fx + s0 * 16;
                    L += '<rect x="' + (jx - 6) + '" y="160" width="12" height="24" fill="#0d1120" stroke="#000" stroke-width="2"/><g ' + rot(A * 2, jx, 186) + '><rect x="' + (jx - 7) + '" y="185" width="14" height="2" fill="' + AC + '"/></g>' + glow('<circle cx="' + jx + '" cy="186" r="5" fill="none" stroke="' + AC + '" stroke-width="1.5"/>', pulse);
                }
                if (a.id === 'a-duesen') { const fl = 8 + (Math.floor(f * 14) % 2) * 6; L += glow('<polygon points="' + pts([[fx - 5, 198], [fx + 5, 198], [fx, 198 + fl]]) + '" fill="#ff3df0"/>'); }
            }
            return L;
        };
        g += leg(-1) + leg(1);
        if (a && cond('antrieb') < 40) g += smoke(120, 170, f) + glow('<rect x="' + (104 + (Math.floor(f * 9) % 3) * 6) + '" y="150" width="2" height="2" fill="#ffe066"/>');

        /* ── Oberkörper (atmet) ── */
        let u = '';
        // Hüftschürze und Taille
        u += armor([[96, 118], [116, 118], [114, 136], [98, 132]], F.plate) + armor(mirror([[96, 118], [116, 118], [114, 136], [98, 132]]), F.plate);
        u += armor([[110, 106], [130, 106], [128, 122], [112, 122]]);
        if (!holo) u += glow(line(112, 114, 128, 114, AC, 1.5), pulse);
        // Arme hinter den Schultern
        const sw = run ? Math.sin(f * 14) * 5 : Math.sin(f * 1.4) * 1.2;
        const arm = (side) => {
            const sx = side < 0 ? 66 : 174, ex = sx + side * 6 - (side < 0 ? sw : -sw), hx = ex + side * 1, hy = 130;
            let R = armor([[sx - 6, 72], [sx + 6, 72], [ex + 5, 100], [ex - 5, 100]], F.plate);                  // Oberarm
            R += armor([[ex - 9, 100], [ex + 9, 100], [hx + 8, hy], [hx - 8, hy]]);                                 // Unterarm-Panzer
            if (!holo) R += glow(line(ex, 104, hx, hy - 4, AC, 1.5, .8), pulse) + glow('<circle cx="' + ex + '" cy="100" r="3" fill="' + AC + '"/>', pulse);
            return R;
        };
        u += arm(-1) + arm(1);
        // Linke Hand: Klauen
        const lhx = 60 - sw * 0 + (60 - 60), lhy = 130;
        u += '<path d="M' + (lhx - 7) + ' ' + lhy + ' l-3 10 M' + lhx + ' ' + lhy + ' l0 11 M' + (lhx + 7) + ' ' + lhy + ' l3 10" stroke="' + (holo ? '#3ff3ff' : '#5b6478') + '" stroke-width="3"/>';
        // Rechte Hand: Werkzeug
        const rhx = 181 + sw, rhy = 130;
        if (!w) u += '<path d="M' + (rhx - 7) + ' ' + rhy + ' l-3 10 M' + rhx + ' ' + rhy + ' l0 11 M' + (rhx + 7) + ' ' + rhy + ' l3 10" stroke="' + (holo ? '#3ff3ff' : '#5b6478') + '" stroke-width="3"/>';
        else if (w.id === 'w-schluessel') u += glow('<path d="M' + rhx + ' ' + rhy + ' v18 M' + (rhx - 7) + ' ' + (rhy + 22) + ' l7 -6 l7 6" stroke="' + AC + '" stroke-width="3" fill="none"/>');
        else if (w.id === 'w-greifer') { const o = run ? (Math.floor(f * 8) % 2) * 4 : 0; u += '<path d="M' + rhx + ' ' + rhy + ' l' + (-9 - o) + ' 16 M' + rhx + ' ' + rhy + ' l0 18 M' + rhx + ' ' + rhy + ' l' + (9 + o) + ' 16" stroke="#8792a8" stroke-width="3"/>' + glow('<circle cx="' + rhx + '" cy="' + (rhy + 2) + '" r="2.5" fill="' + AC + '"/>'); }
        else u += '<polygon points="' + pts([[rhx - 6, rhy], [rhx + 6, rhy], [rhx, rhy + 26]]) + '" fill="#1c2336" stroke="#000" stroke-width="2"/><g ' + rot(A * 3, rhx, rhy + 10) + '>' + glow(line(rhx - 4, rhy + 6, rhx + 4, rhy + 14, AC, 1.5)) + '</g>' + glow('<circle cx="' + rhx + '" cy="' + (rhy + 27) + '" r="2" fill="#ff3df0"/>', pulse);
        // Brustpanzer
        const chest = [[84, 52], [156, 52], [168, 70], [152, 98], [134, 108], [106, 108], [88, 98], [72, 70]];
        u += armor(chest);
        if (!holo) {
            u += '<polygon points="' + pts([[92, 57], [148, 57], [158, 70], [146, 92], [94, 92], [82, 70]]) + '" fill="' + F.plate + '"/>';
            u += glow(line(82, 70, 94, 92, AC, 1.5, .8) + line(158, 70, 146, 92, AC, 1.5, .8) + line(106, 104, 134, 104, AC, 1.5, .6), pulse);
        }
        // Cockpit-Luke: dunkles Glas, Pilot nur als Schatten
        if (!holo) {
            u += '<polygon points="' + pts([[104, 60], [136, 60], [143, 71], [134, 84], [106, 84], [97, 71]]) + '" fill="#03050a" stroke="#000" stroke-width="2"/>';
            u += '<polygon points="' + pts([[116, 66], [124, 66], [126, 72], [128, 82], [112, 82], [114, 72]]) + '" fill="#0d1424" opacity=".9"/>';   // Pilot-Silhouette
            u += '<rect x="117" y="68" width="6" height="2" fill="' + AC + '" opacity=".35"/>';
            const scan = 61 + ((f * 18) % 22);
            u += '<rect x="100" y="' + scan.toFixed(1) + '" width="40" height="1" fill="' + AC + '" opacity=".22"/>';
            u += '<polyline points="' + pts([[106, 62], [118, 62]]) + '" stroke="#fff" stroke-opacity=".25" stroke-width="1.5"/>';
            u += glow('<polygon points="' + pts([[104, 60], [136, 60], [143, 71], [134, 84], [106, 84], [97, 71]]) + '" fill="none" stroke="' + AC + '" stroke-width="1.5"/>', pulse);
        }
        // Energiekern unter der Luke
        if (k && !holo) {
            const kc = k.id === 'k-batterie' ? '#ffb000' : k.id === 'k-diskette' ? '#a78bfa' : k.id === 'k-cd' ? '#3ff3ff' : '#f5e9ff';
            if (k.id === 'k-cd') u += '<g ' + rot(A * 2, 120, 96) + '>' + glow('<circle cx="120" cy="96" r="7" fill="none" stroke="' + kc + '" stroke-width="2" stroke-dasharray="6 3"/>') + '</g>';
            else if (k.id === 'k-kristall') u += glow('<polygon points="' + pts([[120, 86], [126, 96], [120, 106], [114, 96]]) + '" fill="' + kc + '"/>' + line(108, 96, 132, 96, '#c084fc', 1, pulse) + line(120, 84, 120, 108, '#c084fc', 1, pulse));
            else if (k.id === 'k-diskette') u += glow('<rect x="114" y="90" width="12" height="12" fill="' + kc + '" opacity="' + pulse + '"/>');
            else u += glow('<rect x="115" y="93" width="10" height="6" fill="' + kc + '" opacity="' + pulse + '"/>');
        } else if (!holo) u += '<rect x="113" y="89" width="14" height="14" fill="none" stroke="#3ff3ff" stroke-opacity=".5" stroke-dasharray="3 2"/>';
        if (r && cond('rahmen') < 40) u += '<polyline points="' + pts([[90, 62], [98, 76], [94, 86], [102, 96]]) + '" fill="none" stroke="#ff3b3b" stroke-width="2" opacity="' + (Math.floor(f * 6) % 2 ? 1 : .3) + '"/>' + smoke(150, 56, f + .3);
        // Schulterpanzer
        const pad = [[88, 50], [60, 44], [48, 60], [56, 82], [80, 80], [94, 64]];
        [pad, mirror(pad)].forEach((P0, i) => {
            u += armor(P0, F.plate);
            if (!holo) u += glow(line(i ? 184 : 56, 82, i ? 160 : 80, 80, AC, 1.5, .9), pulse);
            if (pz && !holo) {
                const col = pz.id === 'p-blech' ? '#2a3446' : pz.id === 'p-ram' ? '#0f3d24' : '#05070c';
                const layer = i ? mirror([[84, 46], [56, 38], [44, 52], [50, 64], [86, 56]]) : [[84, 46], [56, 38], [44, 52], [50, 64], [86, 56]];
                u += '<polygon points="' + pts(layer) + '" fill="' + col + '" stroke="#000" stroke-width="2"/>';
                if (pz.id === 'p-ram') u += glow([0, 8, 16].map(o => '<rect x="' + (i ? 168 + o - 16 : 56 + o) + '" y="46" width="5" height="3" fill="#22c55e"/>').join(''), pulse);
                if (pz.id === 'p-tower') u += glow(line(i ? 194 : 46, 52, i ? 160 : 80, 44, '#22c55e', 1.5, pulse));
            }
        });
        // Hals und Helm mit Visier
        u += armor([[115, 44], [125, 44], [124, 54], [116, 54]]);
        u += armor([[108, 22], [132, 22], [139, 32], [133, 46], [107, 46], [101, 32]], F.plate);
        if (!holo) {
            u += '<polygon points="' + pts([[111, 38], [129, 38], [125, 46], [115, 46]]) + '" fill="' + F.base + '"/>';
            u += '<rect x="104" y="30" width="32" height="4" fill="#02030a"/>';
            const eye = 106 + ((Math.sin(f * 1.3) + 1) / 2) * 24;
            u += glow('<rect x="104" y="31" width="32" height="2" fill="' + AC + '" opacity=".55"/><rect x="' + eye.toFixed(1) + '" y="30" width="6" height="4" fill="#fff"/>');
        }
        // Sensor auf dem Helm
        if (!sn) u += '<polygon points="' + pts([[112, 20], [128, 20], [124, 4], [116, 4]]) + '" fill="none" stroke="#3ff3ff" stroke-opacity=".5" stroke-dasharray="3 3"/>';
        else if (sn.id === 's-antenne') u += '<polygon points="' + pts([[118, 24], [100, 2], [104, 2], [120, 20], [136, 2], [140, 2], [122, 24]]) + '" fill="#2a3446" stroke="#000" stroke-width="1.5"/>' + glow(line(102, 3, 118, 22, AC, 1, .8) + line(138, 3, 122, 22, AC, 1, .8));
        else if (sn.id === 's-radar') u += '<g ' + rot(Math.sin(f * 1.2) * 20, 142, 28) + '><polygon points="' + pts([[140, 28], [158, 12], [162, 20], [146, 32]]) + '" fill="#1c2336" stroke="#000" stroke-width="1.5"/>' + glow(line(158, 13, 161, 19, AC, 2)) + '</g>';
        else if (sn.id === 's-hdd') { const ang = f * 3 * sp; u += glow('<ellipse cx="120" cy="18" rx="24" ry="6" fill="none" stroke="' + AC + '" stroke-width="1.5" opacity=".8"/><rect x="' + (118 + Math.cos(ang) * 22).toFixed(1) + '" y="' + (16 + Math.sin(ang) * 5).toFixed(1) + '" width="4" height="4" fill="#fff"/>'); }
        else { const fy = Math.sin(f * 2) * 2; u += glow('<polygon points="' + pts([[120, 0 + fy], [127, 9 + fy], [120, 18 + fy], [113, 9 + fy]]) + '" fill="#e9d5ff"/>' + line(120, -6 + fy, 120, -14 + fy, '#c084fc', 1, pulse)); }

        const shake = run ? (Math.floor(f * 20) % 2 ? 2 : -2) : 0;
        g += '<g transform="translate(' + shake + ' ' + bob + ')">' + u + '</g>';
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -20 240 240" width="240" height="240">' + g + '</svg>';
    }
    window.XIRU.mechArt = { draw(f, run) { M = window.XIRU.mech; return drawMech(f, run); } };
})();
