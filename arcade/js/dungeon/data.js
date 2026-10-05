/* ==========================================================================
   PIXMAG Mini – Spieldaten (Elemente, Zauber, Gegner, Gegenstände, Klassen)
   Wird vor arcade/js/dungeon.js geladen. Reine Daten, keine Logik.
   ========================================================================== */
(function () {
    'use strict';
    const PXM = window.PXM = window.PXM || {};

    /* ── Elemente ──────────────────────────────────────────────────────── */
    const EL = {
        feuer:    { n: 'Feuer',    c: '#ff7a2a', c2: '#ffd84a', g: '🔥', minD: 1 },
        eis:      { n: 'Eis',      c: '#8ee8ff', c2: '#e8fbff', g: '❄', minD: 1 },
        blitz:    { n: 'Blitz',    c: '#ffe95a', c2: '#ffffff', g: '⚡', minD: 1 },
        erde:     { n: 'Erde',     c: '#b98a52', c2: '#6b4a2a', g: '⛰', minD: 1 },
        wasser:   { n: 'Wasser',   c: '#4f95e8', c2: '#a8d4ff', g: '💧', minD: 1 },
        licht:    { n: 'Licht',    c: '#fff3b0', c2: '#ffffff', g: '☀', minD: 3 },
        schatten: { n: 'Schatten', c: '#a065e8', c2: '#3a1f5c', g: '☾', minD: 4 }
    };
    const EL_ORDER = ['feuer', 'eis', 'blitz', 'erde', 'wasser', 'licht', 'schatten'];

    /* ── Zauber ─────────────────────────────────────────────────────────
       kind: bolt (Geschoss, trifft das Erste) · zap (sofort) · beam (durchbohrt)
             ball (explodiert, r) · cloud (Feld, r) · chain (springt) · nova (um dich)
             sight (alle sichtbaren) · storm (n zufällige) · self · blink · wall · grab
       st:   Statuseffekte { name: [Runden, Chance] }
       ------------------------------------------------------------------- */
    const SPELLS = {
        // Grundzauber – einer pro Rune
        feuer:    { n: 'Feuerpfeil',    els: ['feuer'], mp: 4, kind: 'bolt', dmg: [4, 7], el: 'feuer', st: { burn: [3, .5] }, d: 'Ein Pfeil aus Glut. Kann Gegner in Brand setzen.' },
        eis:      { n: 'Frostsplitter', els: ['eis'], mp: 4, kind: 'bolt', dmg: [3, 5], el: 'eis', st: { frozen: [2, .45] }, d: 'Ein Eissplitter, der Gegner einfrieren kann.' },
        blitz:    { n: 'Blitzschlag',   els: ['blitz'], mp: 5, kind: 'zap', dmg: [3, 9], el: 'blitz', st: { stun: [1, .3] }, d: 'Trifft sofort. Nasse Gegner nehmen doppelten Schaden.' },
        erde:     { n: 'Steinwurf',     els: ['erde'], mp: 4, kind: 'bolt', dmg: [5, 8], el: 'erde', push: 1, d: 'Ein schwerer Brocken. Stösst zurück und zerschmettert Eis.' },
        wasser:   { n: 'Wasserstrahl',  els: ['wasser'], mp: 3, kind: 'bolt', dmg: [2, 4], el: 'wasser', st: { wet: [6, 1] }, push: 2, d: 'Durchnässt und stösst weg. Löscht Brände.' },
        licht:    { n: 'Heillicht',     els: ['licht'], mp: 5, kind: 'self', heal: [6, 9], cure: ['poison'], d: 'Heilt dich und vertreibt Gift.' },
        schatten: { n: 'Schattenbiss',  els: ['schatten'], mp: 5, kind: 'bolt', dmg: [3, 6], el: 'schatten', drain: .5, d: 'Saugt dem Ziel Leben aus und heilt dich.' },

        // Kombinationen (Schlüssel = Elemente in EL_ORDER-Reihenfolge)
        'feuer+eis':        { n: 'Dampfwolke',       mp: 6,  kind: 'cloud', r: 1, field: 'dampf', ft: 7, dmg: [1, 3], el: 'feuer', d: 'Heisser Nebel: Gegner darin sind blind – und du bist darin unsichtbar.', hint: 'Was zischt, wenn Glut auf Frost trifft?' },
        'feuer+blitz':      { n: 'Plasmastrahl',     mp: 8,  kind: 'beam', range: 9, dmg: [6, 10], el: 'blitz', st: { burn: [3, .6] }, d: 'Ein gleissender Strahl, der alles in einer Linie durchbohrt.', hint: 'Glut, die schneller ist als der Donner.' },
        'feuer+erde':       { n: 'Magmabrocken',     mp: 8,  kind: 'ball', r: 1, dmg: [6, 9], el: 'feuer', field: 'feuer', ft: 4, d: 'Ein glühender Brocken – hinterlässt brennenden Boden.', hint: 'Der Berg, der blutet.' },
        'feuer+wasser':     { n: 'Siedender Geysir', mp: 7,  kind: 'ball', r: 1, dmg: [5, 8], el: 'wasser', push: 2, st: { wet: [5, 1] }, d: 'Kochendes Wasser schiesst aus dem Boden und schleudert Gegner weg.', hint: 'Eine Quelle, die nicht zum Baden taugt.' },
        'feuer+licht':      { n: 'Sonnenkranz',      mp: 9,  kind: 'nova', r: 2, dmg: [6, 9], el: 'licht', st: { burn: [3, .5] }, d: 'Ein Ring aus Sonnenfeuer um dich herum. Untote leiden besonders.', hint: 'Eine Krone für den, der im Dunkeln steht.' },
        'feuer+schatten':   { n: 'Höllenfeuer',      mp: 7,  kind: 'bolt', dmg: [4, 6], el: 'feuer', st: { soulburn: [6, 1] }, d: 'Schwarzes Feuer, das sich nicht löschen lässt.', hint: 'Flammen, die kein Licht werfen.' },
        'eis+blitz':        { n: 'Kettenfrost',      mp: 8,  kind: 'chain', jumps: 3, jr: 3, dmg: [5, 8], el: 'blitz', st: { frozen: [2, .4] }, d: 'Ein Frostblitz, der von Gegner zu Gegner springt.', hint: 'Kälte, die überspringt.' },
        'eis+erde':         { n: 'Gletscherwall',    mp: 5,  kind: 'wall', len: 3, ft: 12, d: 'Lässt eine Mauer aus Eis wachsen. Perfekt für enge Gänge.', hint: 'Ein Berg, der in einer Nacht wächst.' },
        'eis+wasser':       { n: 'Frostnova',        mp: 8,  kind: 'nova', r: 2, dmg: [2, 4], el: 'eis', st: { frozen: [3, 1] }, d: 'Friert alles um dich herum ein.', hint: 'Der See, der in einem Atemzug gefriert.' },
        'eis+licht':        { n: 'Kristallschild',   mp: 7,  kind: 'self', shield: 12, t: 30, d: 'Ein Schild aus Licht und Eis fängt Schaden ab.', hint: 'Gefrorenes Licht als Panzer.' },
        'eis+schatten':     { n: 'Grabeskälte',      mp: 6,  kind: 'bolt', dmg: [4, 7], el: 'eis', st: { frozen: [2, .5], weak: [6, 1] }, d: 'Lähmende Kälte: Das Ziel richtet nur noch halben Schaden an.', hint: 'Die Kälte, die aus Gräbern steigt.' },
        'blitz+erde':       { n: 'Donnerschlag',     mp: 8,  kind: 'nova', r: 1, dmg: [7, 11], el: 'blitz', st: { stun: [2, 1] }, d: 'Du schlägst auf den Boden – alle Nachbarn sind betäubt.', hint: 'Wenn der Himmel den Boden küsst.' },
        'blitz+wasser':     { n: 'Elektroschock',    mp: 8,  kind: 'ball', r: 2, dmg: [5, 8], el: 'blitz', st: { wet: [3, 1], stun: [1, .6] }, d: 'Wasser leitet den Strom: trifft das Ziel und alle in der Nähe.', hint: 'Nie im Gewitter baden.' },
        'blitz+licht':      { n: 'Blendblitz',       mp: 6,  kind: 'sight', dmg: [1, 3], el: 'licht', st: { blind: [6, 1] }, d: 'Ein greller Blitz blendet alle Gegner in Sichtweite.', hint: 'Zu hell, um hinzusehen.' },
        'blitz+schatten':   { n: 'Schattensprung',   mp: 6,  kind: 'blink', st: { stun: [1, 1] }, d: 'Du springst an einen sichtbaren Ort. Gegner neben dir sind betäubt.', hint: 'Zwischen zwei Donnern verschwinden.' },
        'erde+wasser':      { n: 'Schlammflut',      mp: 5,  kind: 'cloud', r: 1, field: 'schlamm', ft: 9, dmg: [2, 3], el: 'erde', d: 'Zäher Schlamm. Gegner darin kommen kaum vom Fleck.', hint: 'Der Boden wird weich.' },
        'erde+licht':       { n: 'Steinauge',        mp: 6,  kind: 'self', reveal: true, d: 'Der Stein erzählt dir alles über diese Etage – auch von verborgenen Wänden.', hint: 'Das Gedächtnis der Mauern.' },
        'erde+schatten':    { n: 'Grabeshand',       mp: 7,  kind: 'grab', dmg: [3, 5], el: 'schatten', st: { root: [5, 1], poison: [5, 1] }, d: 'Eine Knochenhand packt das Ziel, hält es fest und vergiftet es.', hint: 'Etwas greift aus dem Boden.' },
        'wasser+licht':     { n: 'Lebensquelle',     mp: 9,  kind: 'self', healPct: .55, cure: ['poison', 'burn', 'soulburn', 'frozen'], d: 'Heilt dich stark und reinigt dich von allem Übel.', hint: 'Eine Quelle, die Wunden schliesst.' },
        'wasser+schatten':  { n: 'Giftnebel',        mp: 6,  kind: 'cloud', r: 1, field: 'gift', ft: 7, dmg: [1, 2], el: 'schatten', d: 'Ein Nebel, der jeden darin vergiftet – auch dich!', hint: 'Das Wasser in der Gruft.' },
        // Geheime Seiten
        'licht+schatten':   { n: 'Eklipse',          mp: 14, kind: 'sight', dmg: [10, 14], el: 'arkan', secret: true, d: 'Licht und Schatten vereint. Trifft alles, was du siehst – kein Widerstand hilft.' },
        'feuer+feuer':      { n: 'Inferno',          mp: 13, kind: 'ball', r: 2, dmg: [8, 12], el: 'feuer', st: { burn: [4, 1] }, field: 'feuer', ft: 3, secret: true, d: 'Eine gewaltige Feuersbrunst.' },
        'eis+eis':          { n: 'Blizzard',         mp: 12, kind: 'sight', dmg: [2, 4], el: 'eis', st: { frozen: [3, 1] }, secret: true, d: 'Alles, was du siehst, erstarrt zu Eis.' },
        'blitz+blitz':      { n: 'Gewittersturm',    mp: 13, kind: 'storm', hits: 5, dmg: [6, 10], el: 'blitz', st: { stun: [1, .4] }, secret: true, d: 'Fünf Blitze schlagen in zufällige sichtbare Gegner ein.' },
        'erde+erde':        { n: 'Erdbeben',         mp: 11, kind: 'nova', r: 3, dmg: [5, 8], el: 'erde', st: { stun: [1, .5] }, crumble: true, secret: true, d: 'Die Erde bebt. Morsche Wände stürzen ein.' },
        'wasser+wasser':    { n: 'Flutwelle',        mp: 11, kind: 'nova', r: 3, dmg: [3, 5], el: 'wasser', push: 3, st: { wet: [8, 1] }, secret: true, d: 'Eine Welle, die alles von dir wegspült.' },
        'licht+licht':      { n: 'Wiedergeburt',     mp: 15, kind: 'self', buff: 'revive', t: 80, secret: true, d: 'Stirbst du in den nächsten 80 Runden, erhebst du dich wieder.' },
        'schatten+schatten':{ n: 'Schattenmantel',   mp: 9,  kind: 'self', buff: 'invis', t: 12, secret: true, d: 'Du verschmilzt mit den Schatten. Angriffe aus dem Verborgenen treffen dreifach.' }
    };
    Object.keys(SPELLS).forEach(k => { const s = SPELLS[k]; s.id = k; if (!s.els) s.els = k.split('+'); });
    const COMBOS = Object.keys(SPELLS).filter(k => k.indexOf('+') > 0);
    const comboKey = (a, b) => EL_ORDER.indexOf(a) <= EL_ORDER.indexOf(b) ? a + '+' + b : b + '+' + a;
    const NEEDS_TARGET = { bolt: 1, zap: 1, beam: 1, ball: 1, cloud: 1, chain: 1, blink: 1, wall: 1, grab: 1 };

    /* ── Gegner ─────────────────────────────────────────────────────────
       hp, atk [min,max], def, spd (100 = normal), xp, d [ab, bis Etage], w Gewicht
       ai: basic goblin erratic slime archer caster mimic ghost
       res: Schadensfaktoren je Element ('phys' = Waffen)
       ------------------------------------------------------------------- */
    const MON = {
        ratte:      { n: 'Ratte', spr: 'ratte', hp: 5, atk: [1, 3], def: 0, spd: 100, xp: 2, d: [1, 5], w: 10, ai: 'basic', animal: 1 },
        fledermaus: { n: 'Fledermaus', spr: 'fledermaus', hp: 4, atk: [1, 2], def: 0, spd: 160, xp: 3, d: [1, 9], w: 8, ai: 'erratic', fly: 1, dodge: .25, animal: 1, noSleep: 1 },
        goblin:     { n: 'Goblin', spr: 'goblin', hp: 8, atk: [1, 4], def: 0, spd: 100, xp: 5, d: [1, 11], w: 10, ai: 'goblin', pack: [1, 3] },
        schleim:    { n: 'Schleim', spr: 'schleim', hp: 14, atk: [1, 3], def: 0, spd: 60, xp: 6, d: [2, 12], w: 7, ai: 'slime', res: { blitz: 1.5, phys: .8 }, noPoison: 1 },
        spinne:     { n: 'Höhlenspinne', spr: 'spinne', hp: 9, atk: [2, 3], def: 0, spd: 120, xp: 7, d: [3, 15], w: 7, ai: 'basic', poison: [.35, 4], animal: 1 },
        skelett:    { n: 'Skelett', spr: 'skelett', hp: 13, atk: [2, 5], def: 1, spd: 100, xp: 9, d: [3, 19], w: 9, ai: 'basic', undead: 1, res: { licht: 1.5, erde: 1.5, schatten: .5 } },
        schuetze:   { n: 'Skelettschütze', spr: 'schuetze', hp: 9, atk: [1, 3], shot: [2, 4], range: 6, def: 0, spd: 100, xp: 10, d: [4, 99], w: 6, ai: 'archer', undead: 1, res: { licht: 1.5, erde: 1.5, schatten: .5 } },
        mimik:      { n: 'Mimik', spr: 'mimik', hp: 22, atk: [3, 6], def: 1, spd: 100, xp: 20, d: [2, 99], w: 0, ai: 'mimic', res: { feuer: 1.5 } },
        zombie:     { n: 'Zombie', spr: 'zombie', hp: 24, atk: [3, 6], def: 1, spd: 55, xp: 11, d: [5, 22], w: 7, ai: 'basic', undead: 1, poison: [.2, 3], res: { licht: 1.5, feuer: 1.25 } },
        geist:      { n: 'Geist', spr: 'geist', hp: 15, atk: [2, 5], def: 0, spd: 100, xp: 13, d: [6, 99], w: 6, ai: 'ghost', undead: 1, phase: 1, fly: 1, res: { phys: .5, licht: 2, schatten: 0 }, noSleep: 1 },
        ork:        { n: 'Ork', spr: 'ork', hp: 28, atk: [4, 8], def: 2, spd: 100, xp: 17, d: [7, 99], w: 8, ai: 'basic', pack: [1, 2] },
        hexer:      { n: 'Dunkler Magier', spr: 'hexer', hp: 17, atk: [2, 4], shot: [4, 7], range: 7, def: 0, spd: 100, xp: 18, d: [8, 99], w: 5, ai: 'caster' },
        flamme:     { n: 'Feuer-Elementar', spr: 'flamme', hp: 22, atk: [4, 7], def: 1, spd: 110, xp: 19, d: [9, 99], w: 5, ai: 'basic', burnTouch: 1, glow: '#ff7a2a', res: { feuer: 0, eis: 2, wasser: 2 }, noBurn: 1, noPoison: 1 },
        troll:      { n: 'Höhlentroll', spr: 'troll', hp: 42, atk: [5, 9], def: 2, spd: 100, xp: 30, d: [11, 99], w: 5, ai: 'basic', regen: 2, res: { feuer: 1.5 } },
        golem:      { n: 'Lehmgolem', spr: 'golem', hp: 60, atk: [6, 11], def: 5, spd: 55, xp: 36, d: [13, 99], w: 4, ai: 'basic', res: { blitz: .5, wasser: 1.75, erde: .5 }, noPoison: 1, noStun: 1 },

        // Bosse
        goblinkoenig: { n: 'Goblinkönig Grimmzahn', spr: 'goblinkoenig', hp: 64, atk: [3, 7], def: 1, spd: 100, xp: 70, ai: 'boss_goblin', boss: 1, scale: 3 },
        drache:       { n: 'Ignifax, der Rote Drache', spr: 'drache', hp: 135, atk: [6, 11], def: 3, spd: 100, xp: 170, ai: 'boss_dragon', boss: 1, fly: 1, scale: 3, res: { feuer: 0, eis: 1.5, wasser: 1.25 }, noBurn: 1, glow: '#ff5a2a' },
        lich:         { n: 'Lich Morgrath', spr: 'lich', hp: 150, atk: [5, 9], def: 2, spd: 100, xp: 230, ai: 'boss_lich', boss: 1, undead: 1, scale: 3, res: { licht: 2, schatten: 0, eis: .5 }, noPoison: 1, glow: '#7bd651' },
        herz:         { n: 'Das Herz der Dunkelheit', spr: 'herz', hp: 240, atk: [7, 12], def: 3, spd: 100, xp: 420, ai: 'boss_heart', boss: 1, scale: 3, res: { licht: 1.75, schatten: 0 }, noPoison: 1, glow: '#a065e8' },

        // Freundlich
        haendler:     { n: 'Händler Krummfinger', spr: 'haendler', hp: 999, atk: [0, 0], def: 99, spd: 100, xp: 0, ai: 'merchant', friendly: 1 }
    };
    Object.keys(MON).forEach(k => { MON[k].id = k; });
    const BOSSES = ['goblinkoenig', 'drache', 'lich', 'herz'];
    const BOSS_INTRO = {
        goblinkoenig: 'Ein schriller Kriegsschrei hallt durch die Gänge. Grimmzahn, der Goblinkönig, erwartet dich!',
        drache: 'Hitze schlägt dir entgegen. Auf einem Berg aus Gold erhebt sich Ignifax, der Rote Drache.',
        lich: 'Die Luft wird eisig. Lich Morgrath erhebt sich aus seinem Sarkophag.',
        herz: 'Ein dumpfes Pochen. Vor dir schlägt das Herz der Dunkelheit – die Quelle allen Übels.'
    };

    /* ── Gegenstände ──────────────────────────────────────────────────── */
    const ITEMS = {
        heiltrank:   { n: 'Heiltrank', t: 'trank', spr: 'trank', col: '#e0404a', val: 22, w: 30, d: 'Heilt 40 % deiner Lebenspunkte (mindestens 8).' },
        manatrank:   { n: 'Manatrank', t: 'trank', spr: 'trank', col: '#4f7be8', val: 22, w: 22, d: 'Stellt 60 % deines Manas wieder her (mindestens 8).' },
        reinigung:   { n: 'Reinigungstrank', t: 'trank', spr: 'trank', col: '#5cc45a', val: 18, w: 8, d: 'Heilt Gift, Brand und Frost und gibt 4 LP.' },
        hast:        { n: 'Trank der Hast', t: 'trank', spr: 'trank', col: '#f2d14b', val: 35, w: 5, d: '12 Runden lang doppelt so schnell.' },
        staerke:     { n: 'Trank der Stärke', t: 'trank', spr: 'trank', col: '#f08a2c', val: 70, w: 2, minD: 3, d: '+1 Stärke, für immer.' },
        leben:       { n: 'Lebenselixier', t: 'trank', spr: 'trank', col: '#e070d0', val: 80, w: 2, minD: 3, d: '+5 maximale Lebenspunkte, für immer.' },
        rolle_teleport:   { n: 'Rolle: Teleport', t: 'rolle', spr: 'rolle', val: 25, w: 7, d: 'Bringt dich an einen zufälligen Ort dieser Etage.' },
        rolle_karte:      { n: 'Rolle: Karte', t: 'rolle', spr: 'rolle', val: 30, w: 6, d: 'Zeichnet dir den Plan der ganzen Etage.' },
        rolle_feuer:      { n: 'Rolle: Feuersturm', t: 'rolle', spr: 'rolle', val: 35, w: 6, d: 'Flammen umhüllen alles in deiner Nähe.' },
        rolle_furcht:     { n: 'Rolle: Furcht', t: 'rolle', spr: 'rolle', val: 30, w: 5, d: 'Alle Gegner in Sichtweite fliehen eine Weile.' },
        rolle_verzaubern: { n: 'Rolle: Verzauberung', t: 'rolle', spr: 'rolle', val: 60, w: 3, d: 'Verbessert deine Waffe (oder Rüstung) um +1.' },
        // Waffen
        dolch:        { n: 'Dolch', t: 'waffe', spr: 'dolch', dmg: [1, 4], crit: .15, val: 20, minD: 1, d: 'Klein, schnell, gemein. Mehr kritische Treffer.' },
        kurzschwert:  { n: 'Kurzschwert', t: 'waffe', spr: 'schwert', dmg: [2, 5], val: 30, minD: 1, d: 'Ein ehrliches Stück Stahl.' },
        magierstab:   { n: 'Magierstab', t: 'waffe', spr: 'stab', dmg: [1, 3], sp: 1, val: 30, minD: 1, d: '+1 Zauberkraft.' },
        streitkolben: { n: 'Streitkolben', t: 'waffe', spr: 'kolben', dmg: [3, 6], shatter: 1, val: 45, minD: 2, d: 'Zerschmettert gefrorene Gegner mit doppelter Wucht.' },
        langschwert:  { n: 'Langschwert', t: 'waffe', spr: 'schwert', dmg: [3, 8], val: 60, minD: 4, d: 'Lang, scharf, zuverlässig.' },
        kriegsaxt:    { n: 'Kriegsaxt', t: 'waffe', spr: 'axt', dmg: [4, 10], acc: -.08, val: 80, minD: 6, d: 'Riesiger Schaden, aber etwas unhandlich.' },
        erzstab:      { n: 'Erzstab', t: 'waffe', spr: 'stab', dmg: [2, 4], sp: 2, val: 80, minD: 6, d: '+2 Zauberkraft.' },
        runenklinge:  { n: 'Runenklinge', t: 'waffe', spr: 'schwert', dmg: [3, 7], sp: 1, magic: 1, val: 95, minD: 9, d: '+1 Zauberkraft. Trifft auch Geister voll.' },
        // Rüstungen
        robe:           { n: 'Magierrobe', t: 'ruestung', spr: 'robe', def: 0, mp: 6, val: 25, minD: 1, d: '+6 maximales Mana.' },
        lederwams:      { n: 'Lederwams', t: 'ruestung', spr: 'harnisch', def: 1, val: 25, minD: 1, d: 'Besser als nichts.' },
        kettenhemd:     { n: 'Kettenhemd', t: 'ruestung', spr: 'harnisch', def: 3, val: 55, minD: 3, d: 'Klirrt bei jedem Schritt.' },
        schattenmantel: { n: 'Schattenmantel', t: 'ruestung', spr: 'robe', def: 2, dodge: .1, val: 70, minD: 5, d: '+10 % Ausweichen.' },
        plattenpanzer:  { n: 'Plattenpanzer', t: 'ruestung', spr: 'harnisch', def: 5, dodge: -.05, val: 95, minD: 8, d: 'Schwer, aber fast undurchdringlich.' },
        sternenrobe:    { n: 'Sternenrobe', t: 'ruestung', spr: 'robe', def: 2, mp: 10, sp: 1, val: 110, minD: 10, d: '+10 Mana und +1 Zauberkraft.' },
        drachenpanzer:  { n: 'Drachenschuppen', t: 'ruestung', spr: 'harnisch', def: 6, fireRes: 1, val: 220, minD: 99, d: 'Halbiert Feuerschaden. Aus Ignifax\' Schuppen.' },
        // Besonderes
        diskette:     { n: 'Uralte Diskette', t: 'besonders', spr: 'diskette', val: 0, d: '1,44 MB voller Geheimnisse.' }
    };
    Object.keys(ITEMS).forEach(k => { ITEMS[k].id = k; });
    const FLOOR_LOOT = ['heiltrank', 'manatrank', 'reinigung', 'hast', 'staerke', 'leben', 'rolle_teleport', 'rolle_karte', 'rolle_feuer', 'rolle_furcht', 'rolle_verzaubern'];
    const WEAPONS = ['dolch', 'kurzschwert', 'magierstab', 'streitkolben', 'langschwert', 'kriegsaxt', 'erzstab', 'runenklinge'];
    const ARMORS = ['robe', 'lederwams', 'kettenhemd', 'schattenmantel', 'plattenpanzer', 'sternenrobe'];

    /* ── Klassen ─────────────────────────────────────────────────────── */
    const CLASSES = {
        magier: {
            n: 'Magier', spr: 'magier', icon: '🔮',
            d: 'Verbannt, aber nicht gebrochen. Startet mit Feuer, Eis und dem Mysteriösen Buch.',
            hp: 22, mp: 20, str: 0, sp: 1, slots: 3, crit: .05, dodge: .05,
            runes: ['feuer', 'eis'], crystals: 2, gold: 10, hpRegen: 9, mpRegen: 2,
            weapon: 'magierstab', armor: 'robe', inv: [['heiltrank', 1], ['manatrank', 1]]
        },
        krieger: {
            n: 'Krieger', spr: 'krieger', icon: '⚔',
            d: 'Zäh und stark im Nahkampf. Wenig Mana, dafür ein Schwert, das spricht.',
            hp: 34, mp: 8, str: 1, sp: 0, slots: 2, crit: .05, dodge: .03,
            runes: ['erde'], crystals: 1, gold: 15, hpRegen: 5, mpRegen: 5,
            weapon: 'kurzschwert', armor: 'lederwams', inv: [['heiltrank', 2]]
        },
        schurke: {
            n: 'Schurke', spr: 'schurke', icon: '🗡',
            d: 'Leise und tödlich. Schlafende Gegner nehmen dreifachen Schaden.',
            hp: 26, mp: 12, str: 0, sp: 0, slots: 2, crit: .18, dodge: .14, sneak: 3,
            runes: ['schatten'], crystals: 1, gold: 40, hpRegen: 7, mpRegen: 4,
            weapon: 'dolch', armor: 'lederwams', inv: [['heiltrank', 1], ['rolle_teleport', 1]]
        },
        erzmagier: {
            n: 'Erzmagier', spr: 'erzmagier', icon: '✦', skill: 's4',
            d: 'Der Veteran der Gilde. Drei Runen, vier Zauberplätze, viel Mana – aber zerbrechlich.',
            hp: 20, mp: 28, str: 0, sp: 2, slots: 4, crit: .05, dodge: .05,
            runes: ['feuer', 'eis', 'blitz'], crystals: 3, gold: 10, hpRegen: 9, mpRegen: 2,
            weapon: 'erzstab', armor: 'robe', inv: [['heiltrank', 1], ['manatrank', 2]]
        }
    };

    /* ── Zonen (Farben & Namen nach Tiefe) ───────────────────────────── */
    const ZONES = [
        { to: 4,   n: 'Die oberen Katakomben', floor: [42, 37, 33], wall: [84, 72, 62], moss: null },
        { to: 9,   n: 'Die verfallenen Gänge', floor: [34, 36, 44], wall: [70, 76, 92], moss: [60, 92, 70] },
        { to: 14,  n: 'Die alten Kammern',     floor: [33, 40, 34], wall: [66, 84, 66], moss: [80, 120, 60] },
        { to: 19,  n: 'Die tiefen Gewölbe',    floor: [40, 30, 42], wall: [86, 62, 92], moss: null },
        { to: 999, n: 'Das Herz der Dunkelheit', floor: [44, 26, 28], wall: [96, 52, 52], moss: null }
    ];
    const BOSS_FLOOR_NAMES = { goblinkoenig: 'Grimmzahns Hort', drache: 'Ignifax\' Glutkammer', lich: 'Morgraths Gruft', herz: 'Das Herz der Dunkelheit' };

    /* ── Stufenaufstieg ──────────────────────────────────────────────── */
    const xpNext = lvl => 15 + lvl * lvl * 8;
    const LEVEL_OPTS = {
        hp:     { n: 'Zähigkeit',         d: '+7 maximale Lebenspunkte', icon: '❤' },
        mp:     { n: 'Mana-Quelle',       d: '+6 maximales Mana', icon: '💧' },
        slot:   { n: 'Neuer Zauberplatz', d: 'Ein weiterer Platz in deiner Zauberleiste', icon: '✦' },
        str:    { n: 'Kraft',             d: '+1 Nahkampfschaden', icon: '⚔' },
        sp:     { n: 'Arkane Macht',      d: '+1 Zauberschaden und -heilung', icon: '🔮' },
        dodge:  { n: 'Gewandtheit',       d: '+4 % Ausweichen', icon: '💨' }
    };

    const INTRO = 'Verbannt aus der Gilde, die Taschen leer, steigst du in die Katakomben unter der Stadt. ' +
        'In der ersten Kammer liegt es: ein uraltes, in Leder gebundenes Buch. Seine Seiten flüstern. ' +
        'Es kann zwei Elemente zu einem neuen Zauber verbinden – wenn du ihm einen Arkankristall opferst.';

    PXM.D = { EL, EL_ORDER, SPELLS, COMBOS, comboKey, NEEDS_TARGET, MON, BOSSES, BOSS_INTRO, ITEMS, FLOOR_LOOT, WEAPONS, ARMORS, CLASSES, ZONES, BOSS_FLOOR_NAMES, xpNext, LEVEL_OPTS, INTRO };
})();
