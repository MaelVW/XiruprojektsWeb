/* ==========================================================================
   Mech-Grafik – geteilt von Werft, Weltkarte, Arena und Startseite.
   XIRU.mechArt.draw(f, run, loadout) → SVG-Text eines Mechs
     f       Zeit in Sekunden (Animation)
     run     Testlauf/Kampf: schneller, wackelt
     loadout optional { Bauplatz: Teil-Ansicht } (sonst der eigene Mech: XIRU.mech.loadout())
             Teil-Ansicht = XIRU.mech.view(gegenstand): { id, q (Seltenheit), c (Zustand) … }
   Fehlende Teile erscheinen als Hologramm. Seltene Teile leuchten in ihrer Seltenheitsfarbe,
   legendäre und mythische funkeln.
   ========================================================================== */
(function () {
    'use strict';
    const rot = (a, x, y) => 'transform="rotate(' + a.toFixed(1) + ' ' + x + ' ' + y + ')"';
    function smoke(x, y, f) {
        return [0, .5].map(o => { const k = (f * .6 + o) % 1; return '<circle cx="' + (x + k * 8) + '" cy="' + (y - k * 36) + '" r="' + (5 + k * 7) + '" fill="#8792a8" opacity="' + (.7 - k * .7).toFixed(2) + '"/>'; }).join('');
    }
    /* Der Mech: eine schlanke, schwer gepanzerte Maschine. Cockpit als dunkle Glasluke in der Brust,
       Helm mit Visier-Schlitz, breite Schulterpanzer, Energielinien. */
    const FRAME = {
        none:         { ac: '#3ff3ff', base: 'none',    plate: 'none',    edge: '#3ff3ff' },
        'r-schrott':  { ac: '#ff8a3d', base: '#1e1712', plate: '#2c2119', edge: '#000' },
        'r-alu':      { ac: '#3ff3ff', base: '#161c28', plate: '#232c3e', edge: '#000' },
        'r-carbon':   { ac: '#38bdf8', base: '#0c1016', plate: '#1a2029', edge: '#000' },
        'r-titan':    { ac: '#5b8cff', base: '#10141f', plate: '#1c2336', edge: '#000' },
        'r-kristall': { ac: '#c084fc', base: '#140f24', plate: '#241a40', edge: '#000' },
        'r-obsidian': { ac: '#ff5a1f', base: '#07060a', plate: '#16121d', edge: '#000' }
    };
    const pts = arr => arr.map(q => q[0] + ',' + q[1]).join(' ');
    const mirror = arr => arr.map(q => [240 - q[0], q[1]]);
    function drawMech(f, run, L) {
        f = f || 0;
        const RAR = window.XIRU.rarities || [];
        const ins = sl => L[sl] || null, cond = sl => { const p = ins(sl); return p ? (p.c == null ? 100 : p.c) : 100; };
        const sp = run ? 4 : 1, A = f * 220 * sp, pulse = (.6 + Math.sin(f * 3) * .4).toFixed(2);
        const r = ins('rahmen'), a = ins('antrieb'), k = ins('kern'), sn = ins('sensor'), w = ins('arm'), pz = ins('panzer'), wf = ins('waffe'), zb = ins('zubehoer');
        const F = FRAME[r ? r.id : 'none'] || FRAME['r-alu'], AC = F.ac, holo = !r;
        const rc = p => p && p.q >= 2 && RAR[p.q] ? RAR[p.q].c : AC;          // Seltenheitsfarbe eines Teils
        const bob = run ? (Math.floor(f * 10) % 2 ? -2 : 0) : Math.round(Math.sin(f * 1.4) * 1.2);
        const step = run ? Math.sin(f * 14) * 5 : 0;
        const water = a && (a.id === 'a-paddel' || a.id === 'a-schraube');
        const armor = (arr, fill, extra) => holo
            ? '<polygon points="' + pts(arr) + '" fill="#3ff3ff" fill-opacity=".05" stroke="#3ff3ff" stroke-opacity=".7" stroke-width="1.5" stroke-dasharray="4 3"/>'
            : '<polygon points="' + pts(arr) + '" fill="' + (fill || F.base) + '" stroke="#000" stroke-width="2"' + (extra || '') + '/>';
        const glow = (inner, op) => '<g filter="url(#mglow)" opacity="' + (op == null ? 1 : op) + '">' + inner + '</g>';
        const line = (x1, y1, x2, y2, c, wdt, op) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (c || AC) + '" stroke-width="' + (wdt || 2) + '"' + (op != null ? ' opacity="' + op + '"' : '') + '/>';
        // Funkeln um legendäre/mythische Teile
        const sparkle = (p, x, y, rad) => {
            if (!p || p.q < 5) return '';
            const c = RAR[p.q].c; let s = '';
            for (let i = 0; i < 4; i++) {
                const t = (f * .8 + i * .25) % 1, ang = i * 1.7 + f * .6, sx = x + Math.cos(ang) * rad, sy = y + Math.sin(ang) * rad * .8, sz = 1.5 + Math.sin(t * Math.PI) * 2.2;
                s += '<path d="M' + sx + ' ' + (sy - sz * 2) + ' L' + (sx + sz * .5) + ' ' + (sy - sz * .5) + ' L' + (sx + sz * 2) + ' ' + sy + ' L' + (sx + sz * .5) + ' ' + (sy + sz * .5) + ' L' + sx + ' ' + (sy + sz * 2) + ' L' + (sx - sz * .5) + ' ' + (sy + sz * .5) + ' L' + (sx - sz * 2) + ' ' + sy + ' L' + (sx - sz * .5) + ' ' + (sy - sz * .5) + 'Z" fill="' + c + '" opacity="' + Math.sin(t * Math.PI).toFixed(2) + '"/>';
            }
            return glow(s);
        };
        let g = '<defs><filter id="mglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
            '<radialGradient id="mshield"><stop offset=".7" stop-color="#60a5fa" stop-opacity="0"/><stop offset="1" stop-color="#93c5fd" stop-opacity=".35"/></radialGradient></defs>';

        /* ── Energieschild hinter allem ── */
        if (pz && pz.id === 'p-schild' && !holo) g += '<ellipse cx="120" cy="104" rx="' + (104 + Math.sin(f * 2) * 2).toFixed(1) + '" ry="118" fill="url(#mshield)" stroke="' + rc(pz) + '" stroke-opacity="' + (.25 + Math.sin(f * 3) * .15).toFixed(2) + '" stroke-width="1.5"/>';

        /* ── Rücken: Turbinen, Triebwerke, Segel, Anker, Funk ── */
        if (a && a.id === 'a-paddel') [86, 154].forEach(cx => {
            g += '<circle cx="' + cx + '" cy="34" r="16" fill="#0a0e18" stroke="#000" stroke-width="2"/>';
            g += '<g ' + rot(A * 1.4, cx, 34) + '>' + [0, 60, 120].map(d => '<rect x="' + (cx - 2) + '" y="20" width="4" height="28" fill="#2a3446" transform="rotate(' + d + ' ' + cx + ' 34)"/>').join('') + '</g>';
            g += glow('<circle cx="' + cx + '" cy="34" r="15" fill="none" stroke="' + rc(a) + '" stroke-width="2" opacity="' + pulse + '"/>');
        });
        if (a && a.id === 'a-segel') {   // Datensegel: Mast mit Segel aus Lochstreifen
            const bil = Math.sin(f * 1.6) * 4;
            g += '<line x1="150" y1="60" x2="150" y2="-18" stroke="#3a2a1a" stroke-width="4"/><line x1="150" y1="-10" x2="196" y2="-4" stroke="#3a2a1a" stroke-width="3"/>';
            g += '<path d="M152 -8 Q' + (178 + bil) + ' 14 196 -2 L196 44 Q' + (176 + bil) + ' 40 152 50 Z" fill="#e8e1cf" stroke="#000" stroke-width="2"/>';
            g += [0, 1, 2, 3].map(i => '<circle cx="' + (162 + i * 8) + '" cy="' + (8 + i * 3) + '" r="1.6" fill="#2a2a2a"/>').join('') + glow(line(152, 22, 196, 22, rc(a), 1.2, .7));
        }
        if (a && a.id === 'a-duesen') [[94], [146]].forEach(([cx]) => {
            const fl = 26 + (Math.floor(f * 14) % 2) * 10;
            g += '<polygon points="' + pts([[cx - 10, 64], [cx + 10, 64], [cx + 8, 104], [cx - 8, 104]]) + '" fill="#0d1120" stroke="#000" stroke-width="2"/>';
            g += glow('<polygon points="' + pts([[cx - 7, 104], [cx + 7, 104], [cx, 104 + fl]]) + '" fill="' + (a.q >= 2 ? rc(a) : '#ff3df0') + '" opacity=".85"/><polygon points="' + pts([[cx - 3, 104], [cx + 3, 104], [cx, 104 + fl * .6]]) + '" fill="#fff"/>');
        });
        if (water) {
            g += '<rect x="100" y="28" width="12" height="26" fill="#0d1322" stroke="#000" stroke-width="2"/><rect x="128" y="28" width="12" height="26" fill="#0d1322" stroke="#000" stroke-width="2"/>';
            g += glow([33, 39, 45].map(y => '<rect x="102" y="' + y + '" width="8" height="2" fill="' + AC + '"/><rect x="130" y="' + y + '" width="8" height="2" fill="' + AC + '"/>').join(''), pulse);
            g += '<polyline points="' + pts([[150, 50], [158, 30], [158, -4], [150, -8]]) + '" fill="none" stroke="#0d1322" stroke-width="6"/>' + glow(line(158, 30, 158, -2, AC, 1.5, .8));
            const bub = (f * 26) % 26;
            g += '<rect x="' + (149 + Math.round(Math.sin(f * 3) * 2)) + '" y="' + Math.round(-10 - bub) + '" width="3" height="3" fill="#a5f3fc" opacity="' + (1 - bub / 26).toFixed(2) + '"/>';
        }
        if (zb && zb.id === 'z-anker') {   // Treibanker auf dem Rücken
            g += '<g transform="rotate(-18 168 60)"><line x1="168" y1="20" x2="168" y2="96" stroke="#475569" stroke-width="5"/><circle cx="168" cy="16" r="6" fill="none" stroke="#475569" stroke-width="4"/>' +
                '<line x1="154" y1="34" x2="182" y2="34" stroke="#475569" stroke-width="5"/><path d="M146 84 Q168 108 190 84" fill="none" stroke="#475569" stroke-width="5"/></g>';
        }
        if (zb && zb.id === 'z-funk') {   // Funkgerät-Rucksack mit Peitschenantenne
            g += '<rect x="76" y="40" width="22" height="30" fill="#1f2937" stroke="#000" stroke-width="2"/><rect x="80" y="46" width="14" height="4" fill="' + rc(zb) + '" opacity="' + pulse + '"/>';
            const sw = Math.sin(f * 2.4) * 5;
            g += '<path d="M82 40 Q' + (76 + sw) + ' 10 ' + (70 + sw * 1.6) + ' -16" fill="none" stroke="#94a3b8" stroke-width="1.6"/>' + glow('<circle cx="' + (70 + sw * 1.6).toFixed(1) + '" cy="-16" r="2.2" fill="#ff3b3b" opacity="' + (Math.floor(f * 2) % 2 ? 1 : .3) + '"/>');
        }

        /* ── Beine ── */
        const leg = s0 => {
            const hx = 120 + s0 * 14, kb = s0 * step;
            let Lg = '';
            if (!a) return '<polyline points="' + pts([[hx, 120], [hx + s0 * 3, 152], [hx + s0 * 5, 196]]) + '" fill="none" stroke="#3ff3ff" stroke-opacity=".5" stroke-width="2" stroke-dasharray="4 3"/>';
            if (a.id === 'a-beine') {
                const kx = hx + s0 * 16, ky = 146 + kb, ax = hx + s0 * 6, ay = 180;
                Lg += armor([[hx - 8, 120], [hx + 8, 120], [kx + 6, ky], [kx - 6, ky]], F.plate);
                Lg += armor([[kx - 7, ky], [kx + 7, ky], [ax + 6, ay], [ax - 6, ay]]);
                Lg += line(hx + s0 * 4, 128, ax, ay - 6, '#5b6478', 3);
                Lg += armor([[ax - 14, ay], [ax + 14, ay], [ax + 20, 200], [ax + 4, 194], [ax - 4, 194], [ax - 20, 200]], F.plate);
                Lg += glow('<polygon points="' + pts([[kx, ky - 6], [kx + 6, ky], [kx, ky + 6], [kx - 6, ky]]) + '" fill="' + rc(a) + '"/>', pulse);
                return Lg;
            }
            const kx = hx + s0 * 2, ky = 150 + kb;
            Lg += armor([[hx - 9, 120], [hx + 9, 120], [kx + 7, ky], [kx - 7, ky]], F.plate);
            Lg += armor([[kx - 8, ky + 2], [kx + 8, ky + 2], [kx + s0 * 3 + 10, 186], [kx + s0 * 3 - 10, 186]]);
            Lg += armor([[kx + s0 * 3 + (s0 > 0 ? 2 : -12), ky + 8], [kx + s0 * 3 + (s0 > 0 ? 12 : -2), ky + 8], [kx + s0 * 3 + (s0 > 0 ? 12 : -2), 178]], F.plate);
            Lg += glow('<polygon points="' + pts([[kx, ky - 5], [kx + 5, ky], [kx, ky + 5], [kx - 5, ky]]) + '" fill="' + rc(a) + '"/>' + line(kx, ky + 8, kx + s0 * 3, 182, AC, 1.5, .7), pulse);
            const fx = kx + s0 * 3;
            if (a.id === 'a-raupe') {
                Lg += '<rect x="' + (fx - 18) + '" y="184" width="36" height="16" fill="#0b0f1a" stroke="#000" stroke-width="2"/>' + [-12, -4, 4, 12].map(o => '<g ' + rot(A, fx + o, 192) + '><rect x="' + (fx + o - 3) + '" y="189" width="6" height="6" fill="#2a3446"/></g>').join('') + glow(line(fx - 16, 186, fx + 16, 186, rc(a), 1.5, .8));
            } else if (a.id === 'a-hover') {   // Schwebeplatten: Fuss schwebt über leuchtendem Feld
                const hov = Math.sin(f * 3 + s0) * 2;
                Lg += armor([[fx - 14, 184 + hov], [fx + 14, 184 + hov], [fx + 18, 192 + hov], [fx - 18, 192 + hov]], F.plate);
                Lg += glow('<ellipse cx="' + fx + '" cy="' + (200 + hov / 2) + '" rx="18" ry="3.5" fill="' + rc(a) + '" opacity="' + pulse + '"/>' + [0, 1, 2].map(i => '<ellipse cx="' + fx + '" cy="' + (196 + i * 3) + '" rx="' + (14 - i * 3) + '" ry="1" fill="none" stroke="' + rc(a) + '" opacity=".5"/>').join(''));
            } else {
                Lg += armor([[fx - 12, 186], [fx + 12, 186], [fx + 16, 198], [fx - 16, 198]], F.plate);
                if (a.id === 'a-schraube') {
                    const jx = fx + s0 * 16;
                    Lg += '<rect x="' + (jx - 6) + '" y="160" width="12" height="24" fill="#0d1120" stroke="#000" stroke-width="2"/><g ' + rot(A * 2, jx, 186) + '><rect x="' + (jx - 7) + '" y="185" width="14" height="2" fill="' + rc(a) + '"/></g>' + glow('<circle cx="' + jx + '" cy="186" r="5" fill="none" stroke="' + rc(a) + '" stroke-width="1.5"/>', pulse);
                }
                if (a.id === 'a-duesen') { const fl = 8 + (Math.floor(f * 14) % 2) * 6; Lg += glow('<polygon points="' + pts([[fx - 5, 198], [fx + 5, 198], [fx, 198 + fl]]) + '" fill="' + (a.q >= 2 ? rc(a) : '#ff3df0') + '"/>'); }
            }
            return Lg;
        };
        g += leg(-1) + leg(1);
        if (a && cond('antrieb') < 40) g += smoke(120, 170, f) + glow('<rect x="' + (104 + (Math.floor(f * 9) % 3) * 6) + '" y="150" width="2" height="2" fill="#ffe066"/>');
        g += sparkle(a, 120, 186, 34);

        /* ── Oberkörper (atmet) ── */
        let u = '';
        u += armor([[96, 118], [116, 118], [114, 136], [98, 132]], F.plate) + armor(mirror([[96, 118], [116, 118], [114, 136], [98, 132]]), F.plate);
        u += armor([[110, 106], [130, 106], [128, 122], [112, 122]]);
        if (!holo) u += glow(line(112, 114, 128, 114, AC, 1.5), pulse);
        const sw = run ? Math.sin(f * 14) * 5 : Math.sin(f * 1.4) * 1.2;
        const arm = side => {
            const sx = side < 0 ? 66 : 174, ex = sx + side * 6 - (side < 0 ? sw : -sw), hx = ex + side * 1, hy = 130;
            let R = armor([[sx - 6, 72], [sx + 6, 72], [ex + 5, 100], [ex - 5, 100]], F.plate);
            R += armor([[ex - 9, 100], [ex + 9, 100], [hx + 8, hy], [hx - 8, hy]]);
            if (!holo) R += glow(line(ex, 104, hx, hy - 4, AC, 1.5, .8), pulse) + glow('<circle cx="' + ex + '" cy="100" r="3" fill="' + AC + '"/>', pulse);
            return R;
        };
        u += arm(-1) + arm(1);
        /* Linke Hand: Waffe (sonst Klauen) */
        const lhx = 60, lhy = 130, WC = rc(wf);
        const claws = (x, y) => '<path d="M' + (x - 7) + ' ' + y + ' l-3 10 M' + x + ' ' + y + ' l0 11 M' + (x + 7) + ' ' + y + ' l3 10" stroke="' + (holo ? '#3ff3ff' : '#5b6478') + '" stroke-width="3"/>';
        if (!wf) u += claws(lhx, lhy);
        else if (wf.id === 'f-nagel') {
            u += '<rect x="46" y="126" width="22" height="12" fill="#1f2937" stroke="#000" stroke-width="2"/><rect x="32" y="129" width="16" height="5" fill="#374151" stroke="#000" stroke-width="1.5"/><rect x="54" y="138" width="7" height="12" fill="#facc15" stroke="#000" stroke-width="1.5"/>';
            if (run && Math.floor(f * 10) % 3 === 0) u += glow('<rect x="20" y="130" width="10" height="2" fill="#e5e7eb"/>');
            u += glow('<rect x="48" y="128" width="4" height="2" fill="' + WC + '"/>', pulse);
        } else if (wf.id === 'f-loet') {
            u += line(60, 132, 26, 188, '#4b5563', 5) + line(60, 132, 26, 188, '#9ca3af', 1.5);
            u += glow('<circle cx="26" cy="188" r="' + (3.2 + Math.sin(f * 8) * .8).toFixed(1) + '" fill="' + (wf.q >= 2 ? WC : '#fb923c') + '"/>');
            u += '<path d="M24 186 q-4 -8 1 -14 q2 6 -1 14" fill="#cbd5e1" opacity=".35"/>';
        } else if (wf.id === 'f-laser') {
            u += '<rect x="30" y="122" width="34" height="14" rx="3" fill="#111827" stroke="#000" stroke-width="2"/><rect x="40" y="117" width="14" height="5" fill="#374151" stroke="#000" stroke-width="1.5"/>';
            u += glow('<circle cx="30" cy="129" r="4.5" fill="' + (wf.q >= 2 ? WC : '#ef4444') + '"/>' + (run ? '<line x1="26" y1="129" x2="-30" y2="129" stroke="' + (wf.q >= 2 ? WC : '#ef4444') + '" stroke-width="2"/>' : ''));
        } else if (wf.id === 'f-bohr') {
            u += '<rect x="50" y="122" width="20" height="14" fill="#1f2937" stroke="#000" stroke-width="2"/>';
            u += '<polygon points="' + pts([[50, 136], [70, 136], [60, 170]]) + '" fill="#9ca3af" stroke="#000" stroke-width="2"/>';
            const o = (f * 30 * sp) % 8;
            for (let y = 138 + o; y < 166; y += 8) { const wdt = (170 - y) * .3; u += line(60 - wdt, y, 60 + wdt, y + 3, '#4b5563', 1.5); }
            u += glow('<rect x="54" y="126" width="12" height="2" fill="' + WC + '"/>', pulse);
        } else if (wf.id === 'f-tesla') {
            u += [0, 1, 2, 3].map(i => '<ellipse cx="60" cy="' + (128 - i * 6) + '" rx="' + (10 - i) + '" ry="3" fill="#b45309" stroke="#000" stroke-width="1.2"/>').join('');
            u += '<circle cx="60" cy="102" r="8" fill="#cbd5e1" stroke="#000" stroke-width="2"/>';
            const zz = () => { let d = 'M60 102', x = 60, y = 102; const ang = Math.random() * Math.PI * 2; for (let i = 1; i <= 4; i++) { x = 60 + Math.cos(ang) * i * 8 + (Math.random() - .5) * 6; y = 102 + Math.sin(ang) * i * 8 + (Math.random() - .5) * 6; d += ' L' + x.toFixed(1) + ' ' + y.toFixed(1); } return d; };
            if (Math.floor(f * 12) % 2) u += glow('<path d="' + zz() + '" fill="none" stroke="' + (wf.q >= 2 ? WC : '#a5f3fc') + '" stroke-width="1.6"/><path d="' + zz() + '" fill="none" stroke="#fff" stroke-width="1"/>');
        } else if (wf.id === 'f-klinge') {
            const bc = wf.q >= 2 ? WC : '#a5f3fc';
            u += '<rect x="54" y="124" width="12" height="10" fill="#1f2937" stroke="#000" stroke-width="2"/><rect x="48" y="134" width="24" height="4" fill="#374151" stroke="#000" stroke-width="1.5"/>';
            u += '<polygon points="' + pts([[60, 138], [67, 150], [62, 198], [60, 202], [58, 198], [53, 150]]) + '" fill="' + bc + '" fill-opacity=".55" stroke="#000" stroke-width="1.5"/>';
            u += glow('<polyline points="' + pts([[60, 140], [60, 198]]) + '" stroke="#fff" stroke-width="1" opacity=".8"/>', pulse);
        } else u += claws(lhx, lhy);
        u += sparkle(wf, 54, 150, 26);
        /* Rechte Hand: Werkzeugarm */
        const rhx = 181 + sw, rhy = 130, ARC = rc(w);
        if (!w) u += '<path d="M' + (rhx - 7) + ' ' + rhy + ' l-3 10 M' + rhx + ' ' + rhy + ' l0 11 M' + (rhx + 7) + ' ' + rhy + ' l3 10" stroke="' + (holo ? '#3ff3ff' : '#5b6478') + '" stroke-width="3"/>';
        else if (w.id === 'w-schluessel') u += glow('<path d="M' + rhx + ' ' + rhy + ' v18 M' + (rhx - 7) + ' ' + (rhy + 22) + ' l7 -6 l7 6" stroke="' + ARC + '" stroke-width="3" fill="none"/>');
        else if (w.id === 'w-greifer') { const o = run ? (Math.floor(f * 8) % 2) * 4 : 0; u += '<path d="M' + rhx + ' ' + rhy + ' l' + (-9 - o) + ' 16 M' + rhx + ' ' + rhy + ' l0 18 M' + rhx + ' ' + rhy + ' l' + (9 + o) + ' 16" stroke="#8792a8" stroke-width="3"/>' + glow('<circle cx="' + rhx + '" cy="' + (rhy + 2) + '" r="2.5" fill="' + ARC + '"/>'); }
        else if (w.id === 'w-schweiss') {
            u += '<rect x="' + (rhx - 4) + '" y="' + rhy + '" width="8" height="18" fill="#374151" stroke="#000" stroke-width="1.5"/><rect x="' + (rhx - 2) + '" y="' + (rhy + 18) + '" width="4" height="6" fill="#9ca3af"/>';
            const fl = 6 + (Math.floor(f * 16) % 3) * 3;
            u += glow('<polygon points="' + pts([[rhx - 3, rhy + 24], [rhx + 3, rhy + 24], [rhx, rhy + 24 + fl]]) + '" fill="' + (w.q >= 2 ? ARC : '#60a5fa') + '"/><circle cx="' + rhx + '" cy="' + (rhy + 25) + '" r="1.6" fill="#fff"/>');
        } else if (w.id === 'w-nano') {
            u += '<circle cx="' + rhx + '" cy="' + (rhy + 6) + '" r="6" fill="#1f2937" stroke="#000" stroke-width="1.5"/>';
            let dots = ''; for (let i = 0; i < 14; i++) { const an = f * (1.5 + i * .13) + i * 2.2, rr = 10 + (i % 4) * 4; dots += '<circle cx="' + (rhx + Math.cos(an) * rr).toFixed(1) + '" cy="' + (rhy + 8 + Math.sin(an) * rr * .7).toFixed(1) + '" r="1.2" fill="' + ARC + '"/>'; }
            u += glow(dots);
        } else u += '<polygon points="' + pts([[rhx - 6, rhy], [rhx + 6, rhy], [rhx, rhy + 26]]) + '" fill="#1c2336" stroke="#000" stroke-width="2"/><g ' + rot(A * 3, rhx, rhy + 10) + '>' + glow(line(rhx - 4, rhy + 6, rhx + 4, rhy + 14, ARC, 1.5)) + '</g>' + glow('<circle cx="' + rhx + '" cy="' + (rhy + 27) + '" r="2" fill="#ff3df0"/>', pulse);
        u += sparkle(w, rhx, rhy + 10, 22);
        /* Brustpanzer */
        const chest = [[84, 52], [156, 52], [168, 70], [152, 98], [134, 108], [106, 108], [88, 98], [72, 70]];
        u += armor(chest);
        if (!holo) {
            u += '<polygon points="' + pts([[92, 57], [148, 57], [158, 70], [146, 92], [94, 92], [82, 70]]) + '" fill="' + F.plate + '"/>';
            u += glow(line(82, 70, 94, 92, AC, 1.5, .8) + line(158, 70, 146, 92, AC, 1.5, .8) + line(106, 104, 134, 104, AC, 1.5, .6), pulse);
            if (r.id === 'r-carbon') for (let i = 0; i < 5; i++) u += line(92 + i * 12, 58, 84 + i * 12, 90, '#0b0f14', 1, .6);
            if (r.id === 'r-obsidian') u += glow('<path d="M96 60 L104 74 L98 88 M144 60 L136 72 L142 86" fill="none" stroke="#ff5a1f" stroke-width="1.4" opacity="' + pulse + '"/>');
        }
        /* Cockpit-Luke */
        if (!holo) {
            u += '<polygon points="' + pts([[104, 60], [136, 60], [143, 71], [134, 84], [106, 84], [97, 71]]) + '" fill="#03050a" stroke="#000" stroke-width="2"/>';
            u += '<polygon points="' + pts([[116, 66], [124, 66], [126, 72], [128, 82], [112, 82], [114, 72]]) + '" fill="#0d1424" opacity=".9"/>';
            u += '<rect x="117" y="68" width="6" height="2" fill="' + AC + '" opacity=".35"/>';
            const scan = 61 + ((f * 18) % 22);
            u += '<rect x="100" y="' + scan.toFixed(1) + '" width="40" height="1" fill="' + AC + '" opacity=".22"/>';
            u += '<polyline points="' + pts([[106, 62], [118, 62]]) + '" stroke="#fff" stroke-opacity=".25" stroke-width="1.5"/>';
            u += glow('<polygon points="' + pts([[104, 60], [136, 60], [143, 71], [134, 84], [106, 84], [97, 71]]) + '" fill="none" stroke="' + AC + '" stroke-width="1.5"/>', pulse);
        }
        /* Energiekern unter der Luke */
        if (!holo) u += '<rect x="110" y="87" width="20" height="18" fill="#04060b" stroke="#000" stroke-width="2"/>';   // Fassung für den Energiekern
        if (k && !holo) {
            const KC = { 'k-batterie': '#ffb000', 'k-solar': '#38bdf8', 'k-diskette': '#a78bfa', 'k-cd': '#3ff3ff', 'k-kristall': '#f5e9ff', 'k-fusion': '#fde68a' }[k.id] || AC, kc = k.q >= 3 ? rc(k) : KC;
            if (k.id === 'k-cd') u += '<g ' + rot(A * 2, 120, 96) + '>' + glow('<circle cx="120" cy="96" r="7" fill="none" stroke="' + kc + '" stroke-width="2" stroke-dasharray="6 3"/>') + '</g>';
            else if (k.id === 'k-kristall') u += glow('<polygon points="' + pts([[120, 86], [126, 96], [120, 106], [114, 96]]) + '" fill="' + kc + '"/>' + line(108, 96, 132, 96, '#c084fc', 1, pulse) + line(120, 84, 120, 108, '#c084fc', 1, pulse));
            else if (k.id === 'k-diskette') u += '<rect x="114" y="90" width="12" height="12" fill="' + kc + '" stroke="#000" stroke-width="1"/><rect x="116" y="90" width="7" height="4" fill="#cbd5e1"/><rect x="116" y="97" width="8" height="4" fill="#f1f5f9"/>' + glow('<rect x="114" y="90" width="12" height="12" fill="none" stroke="' + kc + '" stroke-width="1" opacity="' + pulse + '"/>');
            else if (k.id === 'k-solar') u += '<rect x="111" y="89" width="18" height="13" fill="#0c2340" stroke="#000" stroke-width="1.5"/>' + glow([0, 1, 2].map(i => line(111 + i * 6 + 3, 90, 111 + i * 6 + 3, 101, kc, .8, .7)).join('') + line(111, 95.5, 129, 95.5, kc, .8, .7), pulse);
            else if (k.id === 'k-fusion') u += glow('<circle cx="120" cy="96" r="' + (5 + Math.sin(f * 6)).toFixed(1) + '" fill="#fff"/><circle cx="120" cy="96" r="8" fill="none" stroke="' + kc + '" stroke-width="1.5"/>') + '<g ' + rot(A * 1.5, 120, 96) + '>' + glow('<ellipse cx="120" cy="96" rx="11" ry="4" fill="none" stroke="' + kc + '" stroke-width="1"/>') + '</g>';
            else u += glow('<rect x="115" y="93" width="10" height="6" fill="' + kc + '" opacity="' + pulse + '"/>');
            u += sparkle(k, 120, 96, 11);
        } else if (!holo) u += '<rect x="113" y="89" width="14" height="14" fill="none" stroke="#3ff3ff" stroke-opacity=".5" stroke-dasharray="3 2"/>';
        if (r && cond('rahmen') < 40) u += '<polyline points="' + pts([[90, 62], [98, 76], [94, 86], [102, 96]]) + '" fill="none" stroke="#ff3b3b" stroke-width="2" opacity="' + (Math.floor(f * 6) % 2 ? 1 : .3) + '"/>' + smoke(150, 56, f + .3);
        /* Zubehör an Brust und Hüfte */
        if (zb && !holo) {
            const ZC = rc(zb);
            if (zb.id === 'z-laterne') {
                const sway = Math.sin(f * 1.8) * 3;
                u += '<line x1="146" y1="118" x2="' + (148 + sway) + '" y2="128" stroke="#374151" stroke-width="1.5"/><rect x="' + (143 + sway) + '" y="128" width="10" height="13" fill="#1f2937" stroke="#000" stroke-width="1.5"/>';
                u += glow('<rect x="' + (145 + sway) + '" y="131" width="6" height="7" fill="' + (zb.q >= 2 ? ZC : '#fbbf24') + '" opacity="' + (.7 + Math.sin(f * 9) * .3).toFixed(2) + '"/>');
            } else if (zb.id === 'z-kompass') {
                u += '<circle cx="96" cy="99" r="6" fill="#b45309" stroke="#000" stroke-width="1.5"/><circle cx="96" cy="99" r="4" fill="#fef3c7"/>' + '<g ' + rot(Math.sin(f * .7) * 25, 96, 99) + '><polygon points="96,95 97.5,99 96,103 94.5,99" fill="#dc2626"/></g>';
            } else if (zb.id === 'z-sparschwein') {
                u += '<ellipse cx="62" cy="40" rx="9" ry="7" fill="#f9a8d4" stroke="#000" stroke-width="1.5"/><circle cx="70" cy="38" r="3.5" fill="#f9a8d4" stroke="#000" stroke-width="1"/><circle cx="71" cy="38" r=".8" fill="#000"/><rect x="59" y="33" width="5" height="1.6" fill="#000"/>';
            } else if (zb.id === 'z-kleeblatt') {
                u += glow([[0, -3], [3, 0], [0, 3], [-3, 0]].map(([dx, dy]) => '<circle cx="' + (144 + dx) + '" cy="' + (99 + dy) + '" r="2.6" fill="' + (zb.q >= 2 ? ZC : '#22c55e') + '"/>').join(''), pulse);
            }
            const ZP = { 'z-laterne': [148, 134, 12], 'z-kompass': [96, 99, 10], 'z-sparschwein': [64, 40, 14], 'z-kleeblatt': [144, 99, 10], 'z-anker': [168, 58, 20], 'z-funk': [87, 52, 16] }[zb.id] || [144, 110, 14];
            u += sparkle(zb, ZP[0], ZP[1], ZP[2]);
        }
        /* Schulterpanzer */
        const pad = [[88, 50], [60, 44], [48, 60], [56, 82], [80, 80], [94, 64]];
        [pad, mirror(pad)].forEach((P0, i) => {
            u += armor(P0, F.plate);
            if (!holo) u += glow(line(i ? 184 : 56, 82, i ? 160 : 80, 80, AC, 1.5, .9), pulse);
            if (pz && !holo && pz.id !== 'p-schild') {
                const col = { 'p-blech': '#2a3446', 'p-ram': '#0f3d24', 'p-tower': '#05070c', 'p-kristall': '#2e1a4a' }[pz.id] || '#2a3446';
                const layer = i ? mirror([[84, 46], [56, 38], [44, 52], [50, 64], [86, 56]]) : [[84, 46], [56, 38], [44, 52], [50, 64], [86, 56]];
                u += '<polygon points="' + pts(layer) + '" fill="' + col + '" stroke="#000" stroke-width="2"/>';
                if (pz.id === 'p-ram') u += glow([0, 8, 16].map(o => '<rect x="' + (i ? 168 + o - 16 : 56 + o) + '" y="46" width="5" height="3" fill="' + (pz.q >= 2 ? rc(pz) : '#22c55e') + '"/>').join(''), pulse);
                if (pz.id === 'p-tower') u += glow(line(i ? 194 : 46, 52, i ? 160 : 80, 44, pz.q >= 2 ? rc(pz) : '#22c55e', 1.5, pulse));
                if (pz.id === 'p-kristall') u += glow([0, 1, 2].map(o => '<polygon points="' + pts([[i ? 184 - o * 10 : 56 + o * 10, 44], [i ? 188 - o * 10 : 60 + o * 10, 50], [i ? 184 - o * 10 : 56 + o * 10, 56], [i ? 180 - o * 10 : 52 + o * 10, 50]]) + '" fill="' + rc(pz) + '" opacity=".8"/>').join(''), pulse);
            }
        });
        u += sparkle(pz, 120, 48, 70);
        /* Hals und Helm mit Visier */
        u += armor([[115, 44], [125, 44], [124, 54], [116, 54]]);
        u += armor([[108, 22], [132, 22], [139, 32], [133, 46], [107, 46], [101, 32]], F.plate);
        if (!holo) {
            u += '<polygon points="' + pts([[111, 38], [129, 38], [125, 46], [115, 46]]) + '" fill="' + F.base + '"/>';
            u += '<rect x="104" y="30" width="32" height="4" fill="#02030a"/>';
            const eye = 106 + ((Math.sin(f * 1.3) + 1) / 2) * 24;
            u += glow('<rect x="104" y="31" width="32" height="2" fill="' + AC + '" opacity=".55"/><rect x="' + eye.toFixed(1) + '" y="30" width="6" height="4" fill="#fff"/>');
        }
        /* Sensor auf dem Helm */
        const SC = rc(sn);
        if (!sn) u += '<polygon points="' + pts([[112, 20], [128, 20], [124, 4], [116, 4]]) + '" fill="none" stroke="#3ff3ff" stroke-opacity=".5" stroke-dasharray="3 3"/>';
        else if (sn.id === 's-antenne') u += '<polygon points="' + pts([[118, 24], [100, 2], [104, 2], [120, 20], [136, 2], [140, 2], [122, 24]]) + '" fill="#2a3446" stroke="#000" stroke-width="1.5"/>' + glow(line(102, 3, 118, 22, SC, 1, .8) + line(138, 3, 122, 22, SC, 1, .8));
        else if (sn.id === 's-radar') u += '<g ' + rot(Math.sin(f * 1.2) * 20, 142, 28) + '><polygon points="' + pts([[140, 28], [158, 12], [162, 20], [146, 32]]) + '" fill="#1c2336" stroke="#000" stroke-width="1.5"/>' + glow(line(158, 13, 161, 19, SC, 2)) + '</g>';
        else if (sn.id === 's-sonar') {
            u += '<polygon points="' + pts([[112, 22], [128, 22], [134, 6], [106, 6]]) + '" fill="#111827" stroke="#000" stroke-width="1.5"/><ellipse cx="120" cy="6" rx="14" ry="3" fill="#374151" stroke="#000" stroke-width="1"/>';
            const k2 = (f * .8) % 1; u += glow('<path d="M' + (108 - k2 * 12) + ' ' + (2 - k2 * 8) + ' Q120 ' + (-6 - k2 * 14) + ' ' + (132 + k2 * 12) + ' ' + (2 - k2 * 8) + '" fill="none" stroke="' + SC + '" stroke-width="1.4" opacity="' + (1 - k2).toFixed(2) + '"/>');
        }
        else if (sn.id === 's-hdd') { const ang = f * 3 * sp; u += glow('<ellipse cx="120" cy="18" rx="24" ry="6" fill="none" stroke="' + SC + '" stroke-width="1.5" opacity=".8"/><rect x="' + (118 + Math.cos(ang) * 22).toFixed(1) + '" y="' + (16 + Math.sin(ang) * 5).toFixed(1) + '" width="4" height="4" fill="#fff"/>'); }
        else if (sn.id === 's-auge') {
            const look = Math.sin(f * .9) * 4, blink = (f % 5) > 4.85;
            u += '<ellipse cx="120" cy="10" rx="15" ry="' + (blink ? 1.5 : 10) + '" fill="#f8fafc" stroke="#000" stroke-width="2"/>';
            if (!blink) u += glow('<circle cx="' + (120 + look).toFixed(1) + '" cy="11" r="5.5" fill="' + (sn.q >= 2 ? SC : '#dc2626') + '"/>') + '<circle cx="' + (120 + look).toFixed(1) + '" cy="11" r="2.4" fill="#000"/>';
        }
        else { const fy = Math.sin(f * 2) * 2; u += glow('<polygon points="' + pts([[120, 0 + fy], [127, 9 + fy], [120, 18 + fy], [113, 9 + fy]]) + '" fill="' + (sn.q >= 2 ? SC : '#e9d5ff') + '"/>' + line(120, -6 + fy, 120, -14 + fy, '#c084fc', 1, pulse)); }
        u += sparkle(sn, 120, 10, 22) + sparkle(r, 120, 80, 56);

        const shake = run ? (Math.floor(f * 20) % 2 ? 2 : -2) : 0;
        g += '<g transform="translate(' + shake + ' ' + bob + ')">' + u + '</g>';
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -20 240 240" width="240" height="240">' + g + '</svg>';
    }
    window.XIRU.mechArt = {
        draw(f, run, loadout) {
            const L = loadout || (window.XIRU.mech ? window.XIRU.mech.loadout() : {});
            return drawMech(f, run, L);
        },
        /* Loadout aus einer einfachen Liste bauen (z. B. für Arena-Gegner): { Platz: [Teil-ID, Seltenheit, Aufwertung] } */
        loadoutOf(spec) {
            const M = window.XIRU.mech, out = {};
            Object.keys(spec || {}).forEach(sl => { const s = spec[sl]; if (!s) return; const v = M.view({ u: 'npc-' + sl, id: s[0], q: s[1] || 1, up: s[2] || 0, c: s[3] == null ? 100 : s[3] }); if (v) out[sl] = v; });
            return out;
        }
    };
})();
