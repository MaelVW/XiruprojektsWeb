/* ==========================================================================
   Weltkarte – Zeichnung von Sektaria, den Inseln der Nebelsee (2400 × 1600 Karteneinheiten)
   Geteilt von weltkarte.html (interaktiv) und dem Reise-Overlay (assets/js/werft.js).

   XIRU.mapArt.svg(opts) → SVG-Innenleben (String) für <svg viewBox="0 0 2400 1600">
     opts.discovered(id)   Insel entdeckt?            (Standard: alles sichtbar)
     opts.visitedSecret    geheime Insel schon gefunden?
     opts.anim             Animationen (Boote, Möwen …)
     opts.labels           Inselnamen zeigen (Standard: true)
     opts.unknown          unbekannte Länder im Nebel zeigen (Standard: true)
   XIRU.mapArt.W / H, XIRU.mapArt.route(from, to) → Pfad-Daten (geschwungene Seeroute)
   Jede Insel ist eine <g class="wk-isle" data-isle="id">, unbekannte Länder <g class="wk-unknown" data-u="n">,
   der Seedrache <g class="wk-dragon">. Alles in einer Datei, damit beide Ansichten gleich aussehen.
   ========================================================================== */
(function () {
    'use strict';
    const W = 2400, H = 1600;
    const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
    const rng = seed => { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647, (s - 1) / 2147483646); };
    const f1 = n => Math.round(n * 10) / 10;

    /* Natürliche Küstenlinie: Radius mit mehreren Wellen, weich verbunden */
    function coast(cx, cy, R, seed, squash, rough) {
        const r = rng(seed), N = 34, ph = [r() * 6.3, r() * 6.3, r() * 6.3], pts = [];
        rough = rough == null ? 1 : rough;
        for (let i = 0; i < N; i++) {
            const a = i / N * Math.PI * 2;
            const k = 1 + rough * (.13 * Math.sin(3 * a + ph[0]) + .08 * Math.sin(5 * a + ph[1]) + .05 * Math.sin(9 * a + ph[2]) + (r() - .5) * .06);
            pts.push([cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k * (squash || .78)]);
        }
        let d = 'M' + f1((pts[0][0] + pts[N - 1][0]) / 2) + ' ' + f1((pts[0][1] + pts[N - 1][1]) / 2);
        pts.forEach((p, i) => { const q = pts[(i + 1) % N]; d += ' Q' + f1(p[0]) + ' ' + f1(p[1]) + ' ' + f1((p[0] + q[0]) / 2) + ' ' + f1((p[1] + q[1]) / 2); });
        return d + 'Z';
    }

    /* ── Kleine Bausteine ─────────────────────────────────────────────── */
    const pine = (x, y, s) => '<g transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + s + ')"><rect x="-1.5" y="-2" width="3" height="7" fill="#5b3a1e"/><polygon points="0,-26 -10,-6 10,-6" fill="#1f6f43"/><polygon points="0,-20 -12,0 12,0" fill="#17593a"/><polygon points="0,-26 -5,-15 3,-15" fill="#3fa36b" opacity=".6"/></g>';
    const palm = (x, y, s) => '<g transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + s + ')"><path d="M0 4 Q-3 -10 2 -22" fill="none" stroke="#7c5a32" stroke-width="3"/><g fill="#2f9e5b"><path d="M2 -22 Q-12 -26 -18 -16 Q-8 -22 2 -20Z"/><path d="M2 -22 Q16 -27 20 -15 Q10 -21 2 -20Z"/><path d="M2 -22 Q-2 -34 -12 -34 Q-3 -28 2 -21Z"/><path d="M2 -22 Q10 -33 18 -30 Q8 -27 2 -21Z"/></g></g>';
    const rock = (x, y, s) => '<g transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + s + ')"><polygon points="-9,4 -6,-5 1,-8 8,-3 9,4" fill="#6b7280"/><polygon points="-6,-5 1,-8 0,0 -3,2" fill="#9ca3af"/></g>';
    const house = (x, y, s, roof) => '<g transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + s + ')"><rect x="-8" y="-8" width="16" height="12" fill="#e7dcc4" stroke="#3b2f22" stroke-width="1"/><polygon points="-10,-8 0,-17 10,-8" fill="' + (roof || '#b4532a') + '" stroke="#3b2f22" stroke-width="1"/><rect x="-2" y="-3" width="4" height="7" fill="#5b3a1e"/></g>';
    const flag = (x, y, c, anim) => '<g transform="translate(' + f1(x) + ' ' + f1(y) + ')"><line x1="0" y1="0" x2="0" y2="-22" stroke="#3b2f22" stroke-width="1.6"/><path class="' + (anim ? 'wk-flag' : '') + '" d="M0 -22 L14 -18 L0 -13Z" fill="' + c + '"/></g>';
    const smoke = (x, y, anim) => [0, 1, 2].map(i => '<circle class="' + (anim ? 'wk-smoke' : '') + '" style="animation-delay:-' + (i * 1.1) + 's" cx="' + x + '" cy="' + (y - i * 9) + '" r="' + (4 + i * 2) + '" fill="#cbd5e1" opacity="' + (.5 - i * .12) + '"/>').join('');

    /* ── Wahrzeichen (lokale Koordinaten um 0,0, ca. 110 breit) ───────── */
    const LM = {
        hafen(a) {   // Heimathafen: Molen, Trockendock mit Kran (Werft), Lagerhäuser, Leuchtfeuer
            let g = '<path d="M-58 22 L-58 40 M-40 22 L-40 40 M40 24 L40 44 M60 24 L60 44" stroke="#5b3a1e" stroke-width="3"/>';
            g += '<rect x="-64" y="18" width="34" height="6" fill="#8b5e34" stroke="#3b2f22"/><rect x="34" y="20" width="32" height="6" fill="#8b5e34" stroke="#3b2f22"/>';
            g += '<rect x="-26" y="-6" width="52" height="30" rx="3" fill="#334155" stroke="#0f172a" stroke-width="1.5"/><rect x="-22" y="-2" width="44" height="22" fill="#0b3b5c"/>';   // Trockendock
            g += '<g transform="translate(0 4) scale(.16)"><rect x="-40" y="-60" width="80" height="120" fill="#0f172a"/><rect x="-24" y="-40" width="48" height="10" fill="#3ff3ff"/><rect x="-30" y="0" width="60" height="50" fill="#1e293b"/></g>';   // Mech im Dock (Silhouette)
            g += '<line x1="-30" y1="-48" x2="-30" y2="-6" stroke="#f59e0b" stroke-width="3"/><line x1="-34" y1="-48" x2="18" y2="-48" stroke="#f59e0b" stroke-width="3"/><line x1="10" y1="-48" x2="10" y2="-14" stroke="#cbd5e1" stroke-width="1"/><rect x="6" y="-16" width="8" height="5" fill="#cbd5e1"/>';
            g += '<path d="M-34 -48 L-26 -40 M-26 -48 L-34 -40" stroke="#b45309" stroke-width="1"/>';
            g += house(-46, 2, 1.1, '#2563eb') + house(46, 4, 1.1, '#0e7490') + house(54, -14, .9, '#1d4ed8');
            g += '<g transform="translate(-60 -16)"><rect x="-3" y="-20" width="6" height="22" fill="#f8fafc" stroke="#334155"/><rect x="-3" y="-14" width="6" height="4" fill="#dc2626"/><circle cx="0" cy="-23" r="4" fill="#fde047" class="' + (a ? 'wk-beacon' : '') + '"/></g>';
            g += '<path d="M44 46 q8 6 16 0 l-2 4 h-12z" fill="#e2e8f0" stroke="#334155"/><line x1="52" y1="46" x2="52" y2="32" stroke="#334155"/><path d="M53 33 l7 10 h-7z" fill="#f8fafc"/>';
            return g;
        },
        zentrum(a) {   // Platz mit Brunnen, Kartenturm mit blinkender Antenne, Häuser im Kreis
            let g = '<ellipse cx="0" cy="12" rx="48" ry="22" fill="#d6cbb0" stroke="#8b7b5a" stroke-width="1.5"/><ellipse cx="0" cy="12" rx="30" ry="13" fill="none" stroke="#a8977a" stroke-dasharray="3 3"/>';
            g += '<ellipse cx="-20" cy="16" rx="9" ry="4" fill="#38bdf8" stroke="#0e7490"/><path d="M-20 15 q-3 -9 0 -12 q3 3 0 12" fill="#bae6fd" class="' + (a ? 'wk-fountain' : '') + '"/>';
            g += '<rect x="4" y="-58" width="18" height="66" fill="#e2e8f0" stroke="#334155" stroke-width="1.5"/><rect x="2" y="-62" width="22" height="6" fill="#5eead4" stroke="#334155"/>';
            g += [0, 1, 2, 3].map(i => '<rect x="9" y="' + (-48 + i * 13) + '" width="8" height="6" fill="#0f172a"/>').join('');
            g += '<circle cx="13" cy="-36" r="5" fill="#fef3c7" stroke="#334155"/><line x1="13" y1="-36" x2="13" y2="-39" stroke="#334155"/><line x1="13" y1="-36" x2="15" y2="-35" stroke="#334155"/>';
            g += '<line x1="13" y1="-62" x2="13" y2="-82" stroke="#334155" stroke-width="1.5"/><circle cx="13" cy="-84" r="3" fill="#ef4444" class="' + (a ? 'wk-beacon' : '') + '"/>';
            g += house(-46, -4, 1, '#0d9488') + house(-32, -18, .9, '#b4532a') + house(42, -2, 1, '#7c3aed') + house(38, 26, .9, '#b4532a') + house(-40, 30, .9, '#0d9488');
            return g;
        },
        werkstatt(a) {   // Werkzeugschuppen mit Sägezahndach, Riesen-Schraubenschlüssel, Zahnrad
            let g = '<rect x="-40" y="-14" width="66" height="34" fill="#a16207" stroke="#3b2f22" stroke-width="1.5"/>';
            g += '<path d="M-42 -14 L-30 -30 L-30 -14 L-18 -30 L-18 -14 L-6 -30 L-6 -14 L6 -30 L6 -14 L18 -30 L18 -14 L28 -26 L28 -14Z" fill="#facc15" stroke="#3b2f22" stroke-width="1.5"/>';
            g += '<rect x="-30" y="0" width="16" height="20" fill="#3b2f22"/><rect x="-6" y="-6" width="24" height="10" fill="#fde68a" stroke="#3b2f22"/>';
            g += '<g transform="translate(40 2) rotate(-35)"><rect x="-4" y="-34" width="8" height="46" fill="#94a3b8" stroke="#334155"/><path d="M-12 -40 a12 12 0 1 1 24 0 l-6 2 l0 -8 l-12 0 l0 8z" fill="#94a3b8" stroke="#334155"/></g>';
            g += '<g transform="translate(-50 20)" class="' + (a ? 'wk-spin' : '') + '"><circle r="10" fill="#64748b" stroke="#334155" stroke-dasharray="4 2" stroke-width="5"/><circle r="4" fill="#e2e8f0"/></g>';
            g += smoke(14, -34, a);
            return g;
        },
        studio(a) {   // Filmstudio-Halle mit Klappe, Scheinwerfern und Disketten-Schild
            let g = '<path d="M-44 20 L-44 -14 Q0 -44 44 -14 L44 20Z" fill="#14532d" stroke="#052e16" stroke-width="1.5"/>';
            g += [-30, -15, 0, 15, 30].map(x => '<line x1="' + x + '" y1="20" x2="' + x + '" y2="' + (-14 - Math.cos(x / 44 * 1.4) * 14) + '" stroke="#166534"/>').join('');
            g += '<rect x="-12" y="2" width="24" height="18" fill="#052e16"/>';
            g += '<g transform="translate(-30 -40) rotate(-12)"><rect x="0" y="0" width="34" height="18" fill="#111827" stroke="#f8fafc"/><rect x="0" y="-8" width="34" height="8" fill="#f8fafc" transform="rotate(-14)"/><path d="M4 -8 l6 0 l-4 8 M16 -9 l6 0 l-4 8" stroke="#111827" stroke-width="2" transform="rotate(-14)"/></g>';
            g += '<g transform="translate(26 -44)"><rect x="-10" y="-10" width="20" height="20" fill="#3b6fd8" stroke="#0f172a"/><rect x="-6" y="-10" width="12" height="7" fill="#e2e8f0"/><rect x="-7" y="2" width="14" height="8" fill="#f8fafc"/></g>';
            g += '<path d="M48 18 L58 -40 L64 -38 Z" fill="#fef9c3" opacity=".35" class="' + (a ? 'wk-spot' : '') + '"/><rect x="44" y="14" width="8" height="8" fill="#334155"/>';
            return g;
        },
        arcade(a) {   // Neon-Spielhalle mit Leuchtschrift, Riesen-Joystick und Riesenrad
            let g = '<rect x="-44" y="-18" width="70" height="38" fill="#1e1b4b" stroke="#0f0a2e" stroke-width="1.5"/>';
            g += '<rect x="-40" y="-34" width="62" height="16" rx="3" fill="#0f0a2e" stroke="#f472b6" stroke-width="2" class="' + (a ? 'wk-neon' : '') + '"/>';
            g += '<text x="-9" y="-22" text-anchor="middle" font-family="monospace" font-weight="800" font-size="11" fill="#f9a8d4">ARCADE</text>';
            g += [-34, -18, -2, 14].map((x, i) => '<rect x="' + x + '" y="-8" width="10" height="12" fill="' + ['#22d3ee', '#f472b6', '#facc15', '#a78bfa'][i] + '" opacity=".85"/>').join('');
            g += '<rect x="-8" y="6" width="14" height="14" fill="#0f0a2e"/>';
            g += '<g transform="translate(46 0)"><rect x="-10" y="10" width="20" height="10" fill="#111827" stroke="#000"/><line x1="0" y1="10" x2="-6" y2="-22" stroke="#9ca3af" stroke-width="4"/><circle cx="-6" cy="-26" r="7" fill="#ef4444" stroke="#7f1d1d"/><circle cx="7" cy="14" r="3" fill="#facc15"/></g>';
            g += '<g transform="translate(-58 -20)"><g class="' + (a ? 'wk-spin-slow' : '') + '"><circle r="20" fill="none" stroke="#f472b6" stroke-width="1.5"/>' + Array.from({ length: 8 }, (_, i) => { const an = i / 8 * Math.PI * 2; return '<line x1="0" y1="0" x2="' + f1(Math.cos(an) * 20) + '" y2="' + f1(Math.sin(an) * 20) + '" stroke="#f9a8d4" stroke-width=".8"/><rect x="' + f1(Math.cos(an) * 20 - 3) + '" y="' + f1(Math.sin(an) * 20 - 2) + '" width="6" height="5" fill="' + ['#22d3ee', '#facc15', '#a78bfa', '#4ade80'][i % 4] + '"/>'; }).join('') + '</g><path d="M-8 30 L0 0 L8 30" fill="none" stroke="#9ca3af" stroke-width="2"/></g>';
            return g;
        },
        archiv(a) {   // Hardware-Archiv: hoher Serverturm, Prozessor-Platz mit Leiterbahnen
            let g = '<rect x="-56" y="10" width="44" height="30" fill="#7c2d12" stroke="#431407" stroke-width="1.2"/>';
            g += '<g transform="translate(-34 25)"><rect x="-14" y="-10" width="28" height="20" fill="#1f2937" stroke="#fb923c"/>' + [-10, -5, 0, 5, 10].map(o => '<line x1="' + o + '" y1="-14" x2="' + o + '" y2="-10" stroke="#fbbf24"/><line x1="' + o + '" y1="10" x2="' + o + '" y2="14" stroke="#fbbf24"/>').join('') + '<rect x="-6" y="-5" width="12" height="10" fill="#374151"/></g>';
            g += '<rect x="-6" y="-70" width="40" height="104" fill="#1f2937" stroke="#0b1220" stroke-width="1.5"/><polygon points="-10,-70 14,-86 38,-70" fill="#fb923c" stroke="#431407"/>';
            for (let y = -62; y < 30; y += 9) for (let x = -1; x < 32; x += 8) g += '<rect x="' + x + '" y="' + y + '" width="5" height="5" fill="' + ((x * 7 + y * 3) % 5 === 0 ? '#fde68a' : '#334155') + '" class="' + (a && (x + y) % 3 === 0 ? 'wk-blink' : '') + '" style="animation-delay:-' + ((x * y) % 7) * .4 + 's"/>';
            g += '<path d="M-12 30 H-30 V20 M40 20 H54 V-6 H62" fill="none" stroke="#fbbf24" stroke-width="1.5"/><circle cx="62" cy="-6" r="2.5" fill="#fbbf24"/>';
            g += '<rect x="44" y="8" width="20" height="24" fill="#9a3412" stroke="#431407"/><rect x="48" y="12" width="12" height="3" fill="#fed7aa"/><rect x="48" y="18" width="12" height="3" fill="#fed7aa"/>';
            return g;
        },
        mixer(a) {   // Klangturm mit Lautsprechern, Equalizer und Funkantenne
            let g = '<rect x="-14" y="-62" width="28" height="84" fill="#1e3a8a" stroke="#0b1b48" stroke-width="1.5"/>';
            g += [-46, -16, 14].map(y => '<circle cx="0" cy="' + y + '" r="10" fill="#0f172a" stroke="#93c5fd" stroke-width="2"/><circle cx="0" cy="' + y + '" r="4" fill="#60a5fa" class="' + (a ? 'wk-pulse' : '') + '"/>').join('');
            g += '<line x1="0" y1="-62" x2="0" y2="-88" stroke="#cbd5e1" stroke-width="2"/><path d="M-10 -80 Q0 -90 10 -80 M-16 -86 Q0 -100 16 -86" fill="none" stroke="#93c5fd" stroke-width="1.5" class="' + (a ? 'wk-blink' : '') + '"/>';
            g += [0, 1, 2, 3, 4, 5].map(i => '<rect x="' + (24 + i * 7) + '" y="0" width="5" height="22" fill="#60a5fa" class="' + (a ? 'wk-eq' : '') + '" style="animation-delay:-' + (i * .23).toFixed(2) + 's;transform-origin:' + (26 + i * 7) + 'px 22px"/>').join('');
            g += house(-40, 14, 1.1, '#2563eb') + house(-54, -6, .9, '#7c3aed');
            return g;
        },
        labor(a) {   // KI-Labor: Observatorium mit Kuppel und Teleskop, Neuronen-Antenne, schwebende Kugel
            let g = '<rect x="-38" y="-6" width="76" height="30" fill="#4c1d95" stroke="#2e1065" stroke-width="1.5"/>';
            g += '<path d="M-30 -6 A30 30 0 0 1 30 -6Z" fill="#c4b5fd" stroke="#2e1065" stroke-width="1.5"/><path d="M-4 -35 L4 -35 L4 -6 L-4 -6Z" fill="#1e1b4b" opacity=".6"/>';
            g += '<g transform="translate(4 -26) rotate(-35)"><rect x="-4" y="-26" width="9" height="30" fill="#334155" stroke="#0f172a"/><rect x="-5" y="-28" width="11" height="4" fill="#a78bfa"/></g>';
            g += [0, 1, 2, 3, 4].map(i => '<rect x="' + (-32 + i * 14) + '" y="4" width="8" height="8" fill="#a78bfa" opacity=".8"/>').join('');
            g += '<g transform="translate(-52 -30)" class="' + (a ? 'wk-float' : '') + '"><circle r="9" fill="#ddd6fe" opacity=".9"/><circle r="14" fill="none" stroke="#a78bfa" stroke-dasharray="2 3"/></g>';
            const nodes = [[44, -40], [56, -24], [40, -14], [58, -52]];
            g += '<path d="M44 -40 L56 -24 L40 -14 M44 -40 L58 -52 M56 -24 L58 -52" stroke="#c4b5fd" stroke-width="1.2" fill="none"/>' + nodes.map((n, i) => '<circle cx="' + n[0] + '" cy="' + n[1] + '" r="3.5" fill="#f5f3ff" class="' + (a ? 'wk-pulse' : '') + '" style="animation-delay:-' + i * .4 + 's"/>').join('');
            return g;
        },
        ruinen(a) {   // Geheime Insel: zerbrochene Säulen, ein Tor ins Nichts
            let g = '<rect x="-30" y="-20" width="12" height="40" fill="#9ca3af" stroke="#4b5563"/><rect x="-32" y="-24" width="16" height="5" fill="#d1d5db" stroke="#4b5563"/>';
            g += '<polygon points="16,20 16,-4 22,-10 28,-2 28,20" fill="#9ca3af" stroke="#4b5563"/>';
            g += '<path d="M-10 20 L-10 -14 Q0 -30 10 -14 L10 20Z" fill="#111827" stroke="#4b5563" stroke-width="2"/><path d="M-6 20 L-6 -12 Q0 -22 6 -12 L6 20Z" fill="#1e1b4b" class="' + (a ? 'wk-pulse' : '') + '"/>';
            g += '<text x="0" y="6" text-anchor="middle" font-size="14" font-weight="800" fill="#f87171" opacity=".8">?</text>' + rock(-44, 18, 1.2) + rock(38, 22, 1);
            return g;
        },
        markt(a) {   // Händlerbucht: gestreifte Zelte, Kisten, Fässer, Wimpel, Handelsschiff
            const tent = (x, y, c) => '<g transform="translate(' + x + ' ' + y + ')"><polygon points="-14,10 0,-14 14,10" fill="' + c + '" stroke="#3b2f22"/><polygon points="-14,10 -5,-6 -1,10" fill="#fef3c7" opacity=".85"/><polygon points="1,10 5,-6 14,10" fill="#fef3c7" opacity=".85"/><rect x="-3" y="2" width="6" height="8" fill="#3b2f22"/></g>';
            let g = tent(-28, -2, '#dc2626') + tent(4, -14, '#2563eb') + tent(30, 0, '#16a34a');
            g += '<rect x="-12" y="14" width="10" height="9" fill="#a16207" stroke="#3b2f22"/><rect x="-2" y="16" width="8" height="7" fill="#ca8a04" stroke="#3b2f22"/><ellipse cx="14" cy="20" rx="5" ry="6" fill="#7c2d12" stroke="#3b2f22"/>';
            g += '<path d="M-40 -18 Q-6 -26 40 -16" fill="none" stroke="#3b2f22" stroke-width=".8"/>' + [-30, -18, -6, 6, 18, 30].map((x, i) => '<polygon points="' + x + ',' + (-20 - Math.sin((x + 40) / 80 * 3.1) * 4) + ' ' + (x + 6) + ',' + (-20 - Math.sin((x + 46) / 80 * 3.1) * 4) + ' ' + (x + 3) + ',' + (-12 - Math.sin((x + 43) / 80 * 3.1) * 4) + '" fill="' + ['#facc15', '#f472b6', '#38bdf8'][i % 3] + '"/>').join('');
            g += '<g transform="translate(50 30)"><path d="M-18 0 Q0 10 18 0 L14 7 L-14 7Z" fill="#7c2d12" stroke="#3b2f22"/><line x1="0" y1="0" x2="0" y2="-26" stroke="#3b2f22" stroke-width="1.5"/><path d="M1 -25 Q12 -14 1 -3Z" fill="#fef3c7" stroke="#3b2f22" stroke-width=".8"/>' + flag(0, -26, '#facc15', a) + '</g>';
            return g;
        },
        schmiede(a) {   // Funkenschmiede: Steinhaus, Esse mit Glut, hoher Kamin, Amboss, Funken
            let g = '<rect x="-34" y="-12" width="56" height="32" fill="#57534e" stroke="#292524" stroke-width="1.5"/>';
            for (let y = -8; y < 18; y += 6) for (let x = -32 + (y % 12 ? 3 : 0); x < 20; x += 8) g += '<rect x="' + x + '" y="' + y + '" width="6" height="4" fill="#78716c" opacity=".6"/>';
            g += '<polygon points="-38,-12 -6,-30 26,-12" fill="#44403c" stroke="#1c1917"/>';
            g += '<rect x="10" y="-52" width="12" height="40" fill="#44403c" stroke="#1c1917"/>' + smoke(16, -58, a);
            g += '<path d="M-24 20 L-24 4 Q-14 -6 -4 4 L-4 20Z" fill="#1c1917"/><path d="M-20 20 L-20 8 Q-14 2 -8 8 L-8 20Z" fill="#f97316" class="' + (a ? 'wk-glow' : '') + '"/>';
            g += '<g transform="translate(38 14)"><path d="M-12 -6 L14 -6 L10 0 L4 0 L4 6 L8 10 L-6 10 L-2 6 L-2 0 L-8 0Z" fill="#374151" stroke="#111827"/></g>';
            g += [0, 1, 2, 3, 4].map(i => '<circle class="' + (a ? 'wk-spark' : '') + '" style="animation-delay:-' + (i * .35).toFixed(2) + 's" cx="' + (38 + i * 3 - 6) + '" cy="4" r="1.4" fill="#fde047"/>').join('');
            return g;
        },
        wrack(a) {   // Wrackriff: schräg liegender Rumpf mit gebrochenem Mast, Fässer, Riffsteine
            let g = '<g transform="rotate(-14)"><path d="M-44 0 Q-40 20 -10 24 L36 22 Q48 14 50 -2 Z" fill="#5b3a1e" stroke="#2b1a0c" stroke-width="1.5"/>';
            g += [-34, -22, -10, 2, 14, 26, 38].map(x => '<line x1="' + x + '" y1="2" x2="' + (x + 2) + '" y2="20" stroke="#3b2410" stroke-width="1"/>').join('');
            g += '<line x1="4" y1="0" x2="10" y2="-46" stroke="#3b2410" stroke-width="3"/><line x1="10" y1="-46" x2="26" y2="-34" stroke="#3b2410" stroke-width="2"/><path d="M10 -40 Q22 -30 12 -14" fill="#d6cbb0" opacity=".7" stroke="#3b2410" stroke-width=".8"/>';
            g += '<rect x="-30" y="-6" width="14" height="8" fill="#7c4a1e" stroke="#2b1a0c"/></g>';
            g += '<ellipse cx="-50" cy="22" rx="6" ry="7" fill="#7c2d12" stroke="#2b1a0c"/><ellipse cx="44" cy="30" rx="5" ry="6" fill="#7c2d12" stroke="#2b1a0c" transform="rotate(70 44 30)"/>';
            g += rock(-26, 34, 1.3) + rock(30, 40, 1.1) + rock(58, 10, 1);
            g += '<path d="M-60 40 q6 -8 12 0 M60 34 q5 -7 10 0" stroke="#f472b6" stroke-width="3" fill="none"/>';   // Korallen
            return g;
        },
        arena(a) {   // Schrott-Arena: Kolosseum-Ring mit Bögen, Flaggen, Sand im Inneren
            let g = '<ellipse cx="0" cy="8" rx="56" ry="30" fill="#78716c" stroke="#292524" stroke-width="1.5"/>';
            g += '<ellipse cx="0" cy="2" rx="56" ry="28" fill="#a8a29e" stroke="#292524" stroke-width="1.5"/>';
            g += '<ellipse cx="0" cy="4" rx="40" ry="17" fill="#d6b77a" stroke="#57534e" stroke-width="1.5"/>';
            g += Array.from({ length: 12 }, (_, i) => { const an = Math.PI * (i / 11); const x = -Math.cos(an) * 50, y = 8 + Math.sin(an) * 22; return '<path d="M' + f1(x - 3) + ' ' + f1(y + 6) + ' v-6 a3 3 0 0 1 6 0 v6z" fill="#44403c"/>'; }).join('');
            g += '<g class="' + (a ? 'wk-bob-sm' : '') + '"><rect x="-14" y="-4" width="8" height="10" fill="#334155"/><rect x="6" y="-2" width="8" height="10" fill="#7f1d1d"/><path d="M-6 0 L6 2" stroke="#fde047" stroke-width="1.5"/></g>';
            g += flag(-56, -4, '#ef4444', a) + flag(56, -4, '#22d3ee', a) + flag(-26, -22, '#facc15', a) + flag(26, -22, '#a78bfa', a);
            return g;
        },
        mine(a) {   // Nebelmine: Berg mit Schneekappe, Stolleneingang, Gleise, Lore, Kristalle
            let g = '<polygon points="-62,26 -24,-56 -8,-36 10,-70 56,26" fill="#57534e" stroke="#292524" stroke-width="1.5"/>';
            g += '<polygon points="-24,-56 -16,-40 -30,-42" fill="#f1f5f9"/><polygon points="10,-70 22,-46 0,-50" fill="#f1f5f9"/>';
            g += '<polygon points="-62,26 -24,-56 -20,-20 -40,26" fill="#44403c" opacity=".55"/>';
            g += '<path d="M-6 26 L-6 6 Q2 -6 10 6 L10 26Z" fill="#1c1917" stroke="#78350f" stroke-width="3"/>';
            g += '<path d="M2 26 L-20 46 M8 26 L-12 46" stroke="#57534e" stroke-width="1.5"/>' + [0, 1, 2, 3].map(i => '<line x1="' + (-1 - i * 5) + '" y1="' + (30 + i * 5) + '" x2="' + (7 - i * 5) + '" y2="' + (30 + i * 5) + '" stroke="#78350f" stroke-width="1.5"/>').join('');
            g += '<g transform="translate(-16 40)"><path d="M-8 -6 L8 -6 L6 2 L-6 2Z" fill="#374151" stroke="#111827"/><circle cx="-4" cy="3" r="2" fill="#111827"/><circle cx="4" cy="3" r="2" fill="#111827"/><polygon points="-5,-6 -2,-11 1,-6" fill="#67e8f9"/></g>';
            g += '<circle cx="16" cy="4" r="3" fill="#fde047" class="' + (a ? 'wk-glow' : '') + '"/>';
            g += [[34, 8], [42, 14], [-40, 12]].map(([x, y]) => '<polygon points="' + x + ',' + y + ' ' + (x + 4) + ',' + (y - 12) + ' ' + (x + 8) + ',' + y + '" fill="#67e8f9" stroke="#0e7490" class="' + (a ? 'wk-pulse' : '') + '"/>').join('');
            return g;
        }
    };

    /* ── Meeresbewohner ───────────────────────────────────────────────── */
    /* Der Seedrache: drei Windungen, Rückenflossen, Schuppen, ein Kopf mit Hörnern, Zähnen und Schlitzauge */
    function dragon(x, y, anim) {
        const arches = [[60, 150, 54], [175, 255, 46], [280, 330, 32]];   // [Start, Ende, Höhe]
        const bez = (x0, x1, h, t) => { const u = 1 - t; return [u * u * u * x0 + 3 * u * u * t * x0 + 3 * u * t * t * x1 + t * t * t * x1, -(3 * u * u * t * h + 3 * u * t * t * h)]; };
        let back = '', fins = '', scales = '';
        arches.forEach(([x0, x1, h], i) => {
            const d = 'M' + x0 + ' 0 C' + x0 + ' ' + (-h * 1.33) + ' ' + x1 + ' ' + (-h * 1.33) + ' ' + x1 + ' 0';
            const wdt = 26 - i * 6;
            back += '<ellipse cx="' + x0 + '" cy="2" rx="' + (wdt * .9) + '" ry="5" fill="none" stroke="#a5f3fc" stroke-opacity=".55" stroke-width="2"/><ellipse cx="' + x1 + '" cy="2" rx="' + (wdt * .9) + '" ry="5" fill="none" stroke="#a5f3fc" stroke-opacity=".55" stroke-width="2"/>';
            back += '<path d="' + d + '" fill="none" stroke="#0b3d2c" stroke-width="' + (wdt + 4) + '"/><path d="' + d + '" fill="none" stroke="#15803d" stroke-width="' + wdt + '"/>';
            back += '<path d="' + d + '" fill="none" stroke="#86efac" stroke-width="' + (wdt * .28) + '" stroke-opacity=".55" transform="translate(0 ' + (wdt * .22) + ')"/>';
            scales += '<path d="' + d + '" fill="none" stroke="#052e1c" stroke-opacity=".45" stroke-width="' + (wdt * .7) + '" stroke-dasharray="2 5"/>';
            for (let k = 1; k < 8; k++) {
                const t = k / 8, [px, py] = bez(x0, x1, h, t), [qx, qy] = bez(x0, x1, h, t + .02);
                const ang = Math.atan2(qy - py, qx - px) - Math.PI / 2, fl = (wdt * .5 + 8) * (1 - Math.abs(t - .5));
                const tipx = px + Math.cos(ang) * (wdt / 2 + fl), tipy = py + Math.sin(ang) * (wdt / 2 + fl);
                const bx1 = px + Math.cos(ang) * wdt / 2 - Math.cos(ang + Math.PI / 2) * 5, by1 = py + Math.sin(ang) * wdt / 2 - Math.sin(ang + Math.PI / 2) * 5;
                const bx2 = px + Math.cos(ang) * wdt / 2 + Math.cos(ang + Math.PI / 2) * 5, by2 = py + Math.sin(ang) * wdt / 2 + Math.sin(ang + Math.PI / 2) * 5;
                fins += '<polygon points="' + f1(bx1) + ',' + f1(by1) + ' ' + f1(tipx) + ',' + f1(tipy) + ' ' + f1(bx2) + ',' + f1(by2) + '" fill="#facc15" stroke="#854d0e" stroke-width="1"/>';
            }
        });
        // Schwanzflosse
        const tail = '<path d="M326 -6 Q350 -40 372 -30 Q356 -16 360 4 Q346 -6 326 -2Z" fill="#15803d" stroke="#0b3d2c" stroke-width="2"/><path d="M332 -6 Q350 -26 364 -26" fill="none" stroke="#86efac" stroke-opacity=".6" stroke-width="2"/>';
        // Hals und Kopf
        let head = '<ellipse cx="18" cy="3" rx="30" ry="6" fill="none" stroke="#a5f3fc" stroke-opacity=".6" stroke-width="2"/>';
        head += '<path d="M24 2 C20 -40 -10 -60 -26 -80" fill="none" stroke="#0b3d2c" stroke-width="32"/><path d="M24 2 C20 -40 -10 -60 -26 -80" fill="none" stroke="#15803d" stroke-width="27"/>';
        head += '<path d="M30 0 C28 -38 2 -58 -14 -78" fill="none" stroke="#bbf7d0" stroke-opacity=".7" stroke-width="7" stroke-dasharray="6 3"/>';   // Bauchschuppen
        head += '<g class="' + (anim ? 'wk-dragon-head' : '') + '" style="transform-origin:-26px -80px">';
        head += '<path d="M-40 -96 Q-48 -128 -30 -140 Q-36 -118 -24 -102Z" fill="#fef3c7" stroke="#78350f" stroke-width="1.5"/><path d="M-22 -98 Q-20 -132 0 -138 Q-10 -116 -10 -98Z" fill="#fef3c7" stroke="#78350f" stroke-width="1.5"/>';   // Hörner
        head += '<path d="M-44 -78 Q-60 -92 -54 -108 Q-44 -96 -36 -94Z" fill="#facc15" stroke="#854d0e"/>';   // Nackenkamm
        head += '<path d="M-46 -84 Q-40 -106 -8 -104 Q20 -100 50 -92 Q58 -88 54 -82 Q30 -82 6 -80 Q-20 -76 -46 -72Z" fill="#16a34a" stroke="#0b3d2c" stroke-width="2"/>';   // Oberkiefer
        head += '<path d="M-42 -72 Q-14 -70 12 -70 Q38 -66 48 -60 Q40 -54 10 -58 Q-18 -60 -40 -62Z" fill="#15803d" stroke="#0b3d2c" stroke-width="2"/>';   // Unterkiefer
        head += '<path d="M-38 -72 Q0 -76 46 -80 Q20 -66 -38 -64Z" fill="#7f1d1d"/>';   // Rachen
        head += [2, 12, 22, 32, 42].map(x => '<polygon points="' + x + ',-81 ' + (x + 3) + ',-73 ' + (x + 6) + ',-81" fill="#f8fafc"/>').join('') + [6, 18, 30].map(x => '<polygon points="' + x + ',-62 ' + (x + 3) + ',-70 ' + (x + 6) + ',-62" fill="#f8fafc"/>').join('');
        head += '<circle cx="48" cy="-90" r="1.8" fill="#052e16"/><path d="M50 -88 Q72 -96 80 -84 M48 -84 Q66 -80 76 -70" fill="none" stroke="#86efac" stroke-width="1.4"/>';   // Nüstern, Barteln
        head += '<g class="' + (anim ? 'wk-blink-eye' : '') + '" style="transform-origin:-10px -94px"><ellipse cx="-10" cy="-94" rx="8" ry="5.5" fill="#fde047" stroke="#713f12" stroke-width="1.5"/><ellipse cx="-9" cy="-94" rx="1.6" ry="4.6" fill="#111"/><circle cx="-12" cy="-96" r="1.2" fill="#fff"/></g>';
        head += '<path d="M-20 -103 Q-10 -110 4 -102" fill="none" stroke="#0b3d2c" stroke-width="2.5"/>';   // Braue
        head += '<path class="' + (anim ? 'wk-drip' : '') + '" d="M30 -58 q2 6 0 10 q-2 -4 0 -10" fill="#bae6fd"/></g>';
        return '<g class="wk-dragon" data-egg="p-seemonster" transform="translate(' + x + ' ' + y + ') scale(1.3)"><g class="' + (anim ? 'wk-bob' : '') + '">' + back + scales + fins + tail + head + '</g>' +
            '<path d="M-50 10 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="#7dd3fc" stroke-opacity=".35" stroke-width="2"/></g>';
    }
    /* Krake beim Wrackriff */
    function kraken(x, y, anim) {
        const arm = (dx, dir, len, i) => {
            const d = 'M' + dx + ' 0 C' + (dx + dir * 6) + ' ' + (-len * .5) + ' ' + (dx - dir * 18) + ' ' + (-len * .8) + ' ' + (dx + dir * 4) + ' ' + (-len) + ' Q' + (dx + dir * 18) + ' ' + (-len - 6) + ' ' + (dx + dir * 14) + ' ' + (-len + 8);
            let s = '<path d="' + d + '" fill="none" stroke="#5b1a4a" stroke-width="13" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="#9d3a7a" stroke-width="9" stroke-linecap="round"/>';
            for (let k = 1; k < 5; k++) s += '<circle cx="' + f1(dx + dir * (6 - k * 4)) + '" cy="' + f1(-len * k / 6) + '" r="1.8" fill="#f9a8d4"/>';
            return '<g class="' + (anim ? 'wk-sway' : '') + '" style="animation-delay:-' + i * .8 + 's;transform-origin:' + dx + 'px 0px">' + s + '<ellipse cx="' + dx + '" cy="2" rx="12" ry="3.5" fill="none" stroke="#a5f3fc" stroke-opacity=".5" stroke-width="2"/></g>';
        };
        return '<g class="wk-kraken" transform="translate(' + x + ' ' + y + ')">' + arm(-40, 1, 52, 0) + arm(-12, -1, 66, 1) + arm(18, 1, 58, 2) + arm(44, -1, 44, 3) + '</g>';
    }
    function whale(x, y, anim) {
        return '<g transform="translate(' + x + ' ' + y + ')"><g class="' + (anim ? 'wk-bob-sm' : '') + '"><path d="M-46 4 Q-40 -24 0 -24 Q36 -22 46 0 Z" fill="#1e3a5f" stroke="#0b1b33" stroke-width="2"/><path d="M-30 -2 Q0 -10 36 -2" fill="none" stroke="#93c5fd" stroke-opacity=".4" stroke-width="2"/>' +
            '<circle cx="28" cy="-10" r="2.2" fill="#0b1b33"/><path d="M-46 4 Q-62 -12 -70 -4 Q-60 -2 -58 8Z" fill="#1e3a5f" stroke="#0b1b33" stroke-width="2"/>' +
            '<g class="' + (anim ? 'wk-spout' : '') + '"><path d="M10 -24 Q4 -46 -6 -50 M10 -24 Q14 -48 24 -52 M10 -24 L10 -54" fill="none" stroke="#e0f2fe" stroke-width="2.5" stroke-linecap="round"/></g></g>' +
            '<ellipse cx="0" cy="6" rx="56" ry="6" fill="none" stroke="#a5f3fc" stroke-opacity=".45" stroke-width="2"/></g>';
    }
    function boat(c) { return '<g><path d="M-14 0 Q0 8 14 0 L10 5 L-10 5Z" fill="#7c2d12" stroke="#3b2f22"/><line x1="0" y1="0" x2="0" y2="-20" stroke="#3b2f22" stroke-width="1.4"/><path d="M1 -19 Q11 -10 1 -1Z" fill="' + c + '" stroke="#3b2f22" stroke-width=".6"/></g>'; }
    const gull = '<path d="M-7 0 Q-3 -4 0 0 Q3 -4 7 0" fill="none" stroke="#f8fafc" stroke-width="1.6" stroke-linecap="round"/>';

    function compass(x, y) {
        let g = '<g transform="translate(' + x + ' ' + y + ')" opacity=".9"><circle r="78" fill="#0b1f33" fill-opacity=".55" stroke="#c8a96a" stroke-width="2"/><circle r="70" fill="none" stroke="#c8a96a" stroke-width="1" stroke-dasharray="2 4"/>';
        for (let i = 0; i < 16; i++) {
            const an = i / 16 * Math.PI * 2 - Math.PI / 2, long = i % 4 === 0, mid = i % 2 === 0, L = long ? 66 : mid ? 46 : 30, wdt = long ? 9 : 6;
            const tx = Math.cos(an) * L, ty = Math.sin(an) * L, lx = Math.cos(an + Math.PI / 2) * wdt, ly = Math.sin(an + Math.PI / 2) * wdt;
            g += '<polygon points="' + f1(tx) + ',' + f1(ty) + ' ' + f1(lx) + ',' + f1(ly) + ' 0,0" fill="' + (long ? '#e8d5a6' : '#c8a96a') + '"/><polygon points="' + f1(tx) + ',' + f1(ty) + ' ' + f1(-lx) + ',' + f1(-ly) + ' 0,0" fill="' + (long ? '#8a6d35' : '#6b5326') + '"/>';
        }
        g += '<circle r="6" fill="#e8d5a6" stroke="#6b5326"/>';
        [['N', 0, -86], ['S', 0, 96], ['O', 92, 5], ['W', -92, 5]].forEach(([t, tx, ty]) => { g += '<text x="' + tx + '" y="' + ty + '" text-anchor="middle" font-family="Georgia, serif" font-size="18" font-weight="700" fill="#e8d5a6">' + t + '</text>'; });
        return g + '</g>';
    }
    function cartouche(x, y) {
        return '<g transform="translate(' + x + ' ' + y + ')"><path d="M0 0 H330 Q346 0 346 16 V70 Q346 86 330 86 H0 Q-16 86 -16 70 V16 Q-16 0 0 0Z" fill="#1a2c40" fill-opacity=".72" stroke="#c8a96a" stroke-width="2"/>' +
            '<path d="M-16 16 Q-30 10 -30 26 Q-30 40 -16 36 M346 16 Q360 10 360 26 Q360 40 346 36" fill="none" stroke="#c8a96a" stroke-width="2"/>' +
            '<text x="165" y="40" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-weight="700" fill="#e8d5a6" letter-spacing="2">Sektaria</text>' +
            '<text x="165" y="66" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="#c8a96a" letter-spacing="3">SEEKARTE · ANNO MMXXVI</text></g>';
    }
    function scaleBar(x, y) {
        return '<g transform="translate(' + x + ' ' + y + ')" font-family="Georgia, serif" fill="#e8d5a6"><rect x="0" y="0" width="200" height="8" fill="none" stroke="#c8a96a"/>' + [0, 1, 2, 3].map(i => '<rect x="' + i * 50 + '" y="0" width="25" height="8" fill="#c8a96a"/>').join('') +
            '<text x="0" y="26" font-size="13">0</text><text x="200" y="26" font-size="13" text-anchor="end">100 Seemeilen</text></g>';
    }

    /* Geschwungene Seeroute zwischen zwei Inseln (Kontrollpunkt seitlich versetzt) */
    function route(a, b) {
        const I = window.XIRU.islands || [], A = I.find(i => i.id === a), B = I.find(i => i.id === b);
        if (!A || !B) return '';
        const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, bend = (hash(a + b) % 2 ? 1 : -1) * Math.min(160, len * .22);
        const mx = (A.x + B.x) / 2 - dy / len * bend, my = (A.y + B.y) / 2 + dx / len * bend;
        return 'M' + A.x + ' ' + (A.y + A.s * .45) + ' Q' + f1(mx) + ' ' + f1(my) + ' ' + B.x + ' ' + (B.y + B.s * .45);
    }

    /* ── Gesamtbild ───────────────────────────────────────────────────── */
    const UNKNOWN = [[110, 110, 120], [1240, 70, 110], [2310, 120, 120], [70, 860, 100], [1250, 1560, 120], [2290, 1480, 120], [2340, 820, 90]];
    function svg(opts) {
        opts = opts || {};
        const anim = opts.anim !== false, X = window.XIRU, I = X.islands || [];
        const disc = opts.discovered || (() => true);
        let g = '<defs>' +
            '<radialGradient id="wk-sea" cx="50%" cy="48%" r="70%"><stop offset="0" stop-color="#0f4c6b"/><stop offset=".55" stop-color="#0a3550"/><stop offset="1" stop-color="#061c2e"/></radialGradient>' +
            '<radialGradient id="wk-shallow"><stop offset=".55" stop-color="#5eead4" stop-opacity=".45"/><stop offset="1" stop-color="#5eead4" stop-opacity="0"/></radialGradient>' +
            '<linearGradient id="wk-sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e3b3"/><stop offset="1" stop-color="#d9bf7f"/></linearGradient>' +
            '<filter id="wk-shadow" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="10"/></filter>' +
            '<filter id="wk-cloud" x="-50%" y="-50%" width="200%" height="200%"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="5" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="60"/><feGaussianBlur stdDeviation="14"/></filter>' +
            '<filter id="wk-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
            '<pattern id="wk-grid" width="200" height="200" patternUnits="userSpaceOnUse"><path d="M200 0 H0 V200" fill="none" stroke="#7dd3fc" stroke-opacity=".08" stroke-width="1.5"/></pattern>' +
            '</defs>';
        g += '<rect width="' + W + '" height="' + H + '" fill="url(#wk-sea)"/><rect width="' + W + '" height="' + H + '" fill="url(#wk-grid)"/>';
        // Tiefenlinien um die Inseln
        I.forEach(i => { g += '<path d="' + coast(i.x, i.y + 8, i.s * 1.75, hash(i.id) + 7, .78, .6) + '" fill="none" stroke="#38bdf8" stroke-opacity=".1" stroke-width="2" stroke-dasharray="6 8"/>'; });
        // Wellen
        const wr = rng(42);
        let waves = '';
        for (let k = 0; k < 170; k++) {
            const x = wr() * W, y = wr() * H;
            if (I.some(i => Math.hypot(i.x - x, (i.y - y) / .78) < i.s * 1.25)) continue;
            waves += '<path class="' + (anim ? 'wk-wave' : '') + '" style="animation-delay:-' + f1(wr() * 6) + 's" d="M' + f1(x) + ' ' + f1(y) + ' q8 -6 16 0 t16 0" fill="none" stroke="#7dd3fc" stroke-opacity="' + f1(.15 + wr() * .25) + '" stroke-width="2" stroke-linecap="round"/>';
        }
        g += '<g>' + waves + '</g>';
        // Seewege (gestrichelte Handelsrouten vom Zentrum und Heimathafen)
        let lanes = '';
        I.filter(i => i.id !== 'zentrum' && i.id !== 'geheim').forEach(i => { lanes += '<path d="' + route(i.id === 'konto' ? 'zentrum' : (Math.hypot(i.x - 1190, i.y - 720) < Math.hypot(i.x - 1010, i.y - 1030) ? 'zentrum' : 'konto'), i.id) + '" class="wk-lane"/>'; });
        g += '<g fill="none" stroke="#e8d5a6" stroke-opacity=".28" stroke-width="2.5" stroke-dasharray="3 10" stroke-linecap="round">' + lanes + '</g>';
        g += cartouche(520, 34) + compass(2230, 1360) + scaleBar(470, 1530);
        // Meeresbewohner
        g += dragon(250, 930, anim) + kraken(2070, 1290, anim) + whale(1790, 250, anim);
        // Inseln
        I.forEach(i => {
            const seen = disc(i.id), secret = i.secret && !opts.visitedSecret, fog = !seen || secret, seed = hash(i.id);
            const r = rng(seed + 3), R = i.s, cx = i.x, cy = i.y;
            let t = '<ellipse cx="' + cx + '" cy="' + (cy + R * .32) + '" rx="' + R * 1.05 + '" ry="' + R * .62 + '" fill="#020b14" opacity=".55" filter="url(#wk-shadow)"/>';
            t += '<path d="' + coast(cx, cy + 4, R * 1.32, seed, .78, .8) + '" fill="url(#wk-shallow)"/>';
            t += '<path d="' + coast(cx, cy, R * 1.06, seed, .78) + '" fill="url(#wk-sand)"/>';
            const land = { mine: ['#6b7d55', '#55663f'], ruinen: ['#4b5563', '#374151'], wrack: ['#c2a36b', '#a98a52'], arena: ['#8a9a5b', '#6f7f45'], schmiede: ['#6b6f4a', '#55583a'] }[i.art] || ['#4f9a55', '#3c7f44'];
            t += '<path d="' + coast(cx, cy - 3, R * .92, seed, .76) + '" fill="' + land[0] + '" stroke="#2f5a34" stroke-width="2"/>';
            t += '<path d="' + coast(cx + R * .08, cy + R * .1, R * .62, seed + 1, .7, 1.2) + '" fill="' + land[1] + '" opacity=".7"/>';
            t += '<path d="' + coast(cx - R * .15, cy - R * .2, R * .35, seed + 2, .7, 1.4) + '" fill="#8fcf7a" opacity=".25"/>';
            // Vegetation am Rand (nicht auf dem Wahrzeichen)
            const veg = i.art === 'wrack' ? palm : i.art === 'mine' || i.art === 'ruinen' ? rock : (r() < .5 ? pine : palm);
            for (let k = 0; k < 9; k++) {
                const an = r() * Math.PI * 2, rr = R * (.58 + r() * .26), px = cx + Math.cos(an) * rr, py = cy + Math.sin(an) * rr * .7;
                if (Math.abs(an - Math.PI * 1.5) < .5) continue;
                t += veg(px, py, .8 + r() * .5);
            }
            t += '<g transform="translate(' + cx + ' ' + (cy - R * .08) + ') scale(' + f1(R / 86) + ')">' + (LM[i.art] ? LM[i.art](anim && !fog) : '') + '</g>';
            let label = '';
            if (opts.labels !== false) {
                const name = secret ? '???' : i.n, tw = name.length * 10.5 + 34, ly = cy + R * .86;
                label = '<g class="wk-label"><path d="M' + f1(cx - tw / 2) + ' ' + ly + ' h' + f1(tw) + ' l10 12 l-10 12 h' + f1(-tw) + ' l-10 -12z" fill="#1a2c40" fill-opacity=".88" stroke="' + (i.game ? '#22d3ee' : '#c8a96a') + '" stroke-width="1.5"/>' +
                    '<text x="' + cx + '" y="' + (ly + 17) + '" text-anchor="middle" font-family="Georgia, serif" font-size="17" font-weight="700" fill="#e8d5a6">' + name.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text></g>';
            }
            let fogs = '';
            if (fog) {
                const fr = rng(seed + 9);
                for (let k = 0; k < 7; k++) fogs += '<ellipse cx="' + f1(cx + (fr() - .5) * R * 1.6) + '" cy="' + f1(cy + (fr() - .5) * R) + '" rx="' + f1(R * (.5 + fr() * .5)) + '" ry="' + f1(R * (.3 + fr() * .3)) + '" fill="#cbd5e1" opacity=".55" filter="url(#wk-cloud)"/>';
                fogs += '<text x="' + cx + '" y="' + (cy + 10) + '" text-anchor="middle" font-family="Georgia, serif" font-size="' + f1(R * .5) + '" font-weight="700" fill="#e2e8f0" opacity=".75">?</text>';
            }
            g += '<g class="wk-isle' + (fog ? ' is-fog' : '') + (i.game ? ' is-game' : '') + '" data-isle="' + i.id + '" tabindex="0" role="button" aria-label="' + (secret ? 'Unbekannte Insel' : i.n) + '">' +
                '<g class="wk-isle__art"' + (fog ? ' style="filter:saturate(.25) brightness(.7)"' : '') + '>' + t + '</g>' + fogs + label + '</g>';
        });
        // Unbekannte Länder im Nebel am Kartenrand
        if (opts.unknown !== false) UNKNOWN.forEach(([x, y, R], n) => {
            g += '<g class="wk-unknown" data-u="' + n + '"><path d="' + coast(x, y, R, 991 + n * 37, .74, 1.3) + '" fill="#94a3b8" opacity=".12"/>' +
                [0, 1, 2, 3].map(k => '<ellipse cx="' + (x + (k - 1.5) * R * .4) + '" cy="' + (y + (k % 2 ? -1 : 1) * R * .15) + '" rx="' + R * .6 + '" ry="' + R * .35 + '" fill="#cbd5e1" opacity=".22" filter="url(#wk-cloud)"/>').join('') +
                '<text x="' + x + '" y="' + (y + 6) + '" text-anchor="middle" font-family="Georgia, serif" font-size="22" letter-spacing="6" fill="#cbd5e1" opacity=".5">???</text></g>';
        });
        // Boote und Möwen (nur mit Animationen)
        if (anim) {
            [['zentrum', 'arcade', '#f472b6', 38], ['konto', 'mixer', '#60a5fa', 46], ['zentrum', 'hardware', '#fbbf24', 52], ['konto', 'werkzeuge', '#4ade80', 34], ['zentrum', 'ki', '#a78bfa', 60]].forEach(([a, b, c, dur], k) => {
                const d = route(a, b); if (!d) return;
                g += '<g>' + boat(c) + '<animateMotion dur="' + dur + 's" repeatCount="indefinite" rotate="0" keyPoints="0;1;0" keyTimes="0;.5;1" calcMode="linear" begin="-' + (k * 7) + 's" path="' + d + '"/></g>';
            });
            [[700, 300], [1500, 1000], [1900, 700]].forEach(([x, y], k) => {
                g += '<g>' + gull + '<animateMotion dur="' + (18 + k * 6) + 's" repeatCount="indefinite" path="M' + x + ' ' + y + ' c80 -60 200 -40 240 20 s-120 120 -240 -20"/></g>';
            });
        }
        return g;
    }

    /* Stil für Animationen (einmal pro Seite) */
    function css() {
        if (document.getElementById('wk-style')) return;
        const st = document.createElement('style'); st.id = 'wk-style';
        st.textContent = '.wk-wave{animation:wkWave 6s ease-in-out infinite}@keyframes wkWave{50%{transform:translateX(10px);opacity:.4}}' +
            '.wk-bob{animation:wkBob 6s ease-in-out infinite}.wk-bob-sm{animation:wkBob 3.4s ease-in-out infinite}@keyframes wkBob{50%{transform:translateY(5px)}}' +
            '.wk-dragon-head{animation:wkHead 7s ease-in-out infinite;transform-box:view-box}@keyframes wkHead{50%{transform:rotate(-5deg)}}' +
            '.wk-blink-eye{animation:wkEye 5s infinite;transform-box:view-box}@keyframes wkEye{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}' +
            '.wk-drip{animation:wkDrip 2.4s ease-in infinite}@keyframes wkDrip{0%{opacity:0;transform:translateY(0)}20%{opacity:1}100%{opacity:0;transform:translateY(40px)}}' +
            '.wk-sway{animation:wkSway 5s ease-in-out infinite;transform-box:view-box}@keyframes wkSway{50%{transform:rotate(6deg)}}' +
            '.wk-spout{animation:wkSpout 4s ease-out infinite;transform-box:fill-box;transform-origin:50% 100%}@keyframes wkSpout{0%,60%{opacity:0;transform:scaleY(.2)}70%{opacity:1;transform:scaleY(1)}100%{opacity:0;transform:scaleY(1.1)}}' +
            '.wk-smoke{animation:wkSmoke 3.3s ease-out infinite}@keyframes wkSmoke{0%{opacity:0;transform:translateY(0)}30%{opacity:.6}100%{opacity:0;transform:translate(8px,-26px)}}' +
            '.wk-beacon,.wk-blink{animation:wkBlink 1.6s steps(1) infinite}@keyframes wkBlink{50%{opacity:.25}}' +
            '.wk-pulse{animation:wkPulse 2.2s ease-in-out infinite}@keyframes wkPulse{50%{opacity:.45}}' +
            '.wk-glow{animation:wkGlow 1.2s ease-in-out infinite alternate}@keyframes wkGlow{to{opacity:.55}}' +
            '.wk-neon{animation:wkNeon 4s infinite}@keyframes wkNeon{0%,45%,48%,100%{opacity:1}46%{opacity:.4}}' +
            '.wk-spin{animation:wkSpin 6s linear infinite;transform-box:fill-box;transform-origin:center}.wk-spin-slow{animation:wkSpin 24s linear infinite;transform-box:fill-box;transform-origin:center}@keyframes wkSpin{to{transform:rotate(360deg)}}' +
            '.wk-float{animation:wkBob 3s ease-in-out infinite}.wk-eq{animation:wkEq .9s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:bottom}@keyframes wkEq{from{transform:scaleY(.25)}}' +
            '.wk-flag{animation:wkFlag 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:left center}@keyframes wkFlag{50%{transform:scaleX(.8) skewY(6deg)}}' +
            '.wk-spark{animation:wkSpark 1.4s ease-out infinite}@keyframes wkSpark{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(6px,-18px)}}' +
            '.wk-spot{animation:wkSpot 5s ease-in-out infinite;transform-box:fill-box;transform-origin:bottom left}@keyframes wkSpot{50%{transform:rotate(-14deg)}}' +
            '.wk-fountain{animation:wkPulse 1.2s ease-in-out infinite}' +
            'html.no-anim [class^="wk-"],html.no-anim [class*=" wk-"]{animation:none!important}';
        document.head.appendChild(st);
    }

    window.XIRU.mapArt = { W, H, svg, route, css, coast, hash, rng, LM, dragon, kraken, whale, compass, scaleBar, UNKNOWN, NAME: 'Sektaria' };
})();
