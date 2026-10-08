/* Code-Bibliothek · CSS */
XIRU_CODE.add({
    id: 'css', n: 'CSS', icon: '{ }', color: '#38bdf8', comment: '/*',
    tag: 'Die Gestaltung jeder Website: Farben, Schriften, Abstände und Layouts.',
    level: 'Einsteiger', use: 'Websites gestalten (zusammen mit HTML)',
    intro: 'CSS (Cascading Style Sheets) sagt dem Browser, <strong>wie</strong> etwas aussieht. Du wählst Elemente mit einem <strong>Selektor</strong> aus und gibst ihnen Eigenschaften. Jede Lektion hat eine Live-Vorschau – ändere Werte und schau zu.',
    kw: ['display', 'flex', 'grid', 'color', 'background', 'margin', 'padding', 'border', 'width', 'height', 'position', 'font-size', 'gap', 'none', 'block', 'inline', 'absolute', 'relative', 'auto'],
    sheet: [
        { g: 'Basics', items: [
            ['Regel', 'p { color: red; }', 'Selektor + Deklarationen in { }. Jede Deklaration ist Eigenschaft: Wert;'],
            ['Selektor', 'h1 { }   .box { }   #intro { }', 'Wählt aus, was gestaltet wird: Element, Klasse (.) oder ID (#).'],
            ['Kommentar', '/* Notiz */', 'Wird vom Browser ignoriert.'],
            ['Einbinden', '<link rel="stylesheet" href="style.css">', 'CSS-Datei im <head> der HTML-Seite einbinden.'],
            ['Kaskade', 'p { color: red; }\np { color: blue; }  /* gewinnt */', 'Bei Konflikten gewinnt die spezifischere bzw. spätere Regel.', 'Reihenfolge der Stärke: Inline-Style > ID > Klasse > Element. Bei gleicher Stärke gewinnt die Regel, die weiter unten steht. !important übertrumpft fast alles – sparsam einsetzen.']
        ] },
        { g: 'Selektoren', items: [
            ['Klasse', '.hinweis { color: orange; }', 'Gilt für alle Elemente mit class="hinweis".'],
            ['ID', '#kopf { height: 60px; }', 'Gilt für das eine Element mit id="kopf".'],
            ['Nachfahre', 'nav a { }', 'Alle a innerhalb von nav.'],
            ['Pseudoklasse', 'a:hover { }   li:first-child { }', 'Zustand oder Position: beim Überfahren, erstes Kind …']
        ] },
        { g: 'Farben & Text', items: [
            ['color', 'color: #5eead4;', 'Textfarbe. Als Hex, rgb(), hsl() oder Name.'],
            ['background', 'background: #0b0e1a;', 'Hintergrundfarbe oder -bild.'],
            ['font-size', 'font-size: 1.2rem;', 'Schriftgrösse. rem bezieht sich auf die Grundgrösse der Seite.'],
            ['font-family', 'font-family: system-ui, sans-serif;', 'Schriftart mit Ersatzliste.'],
            ['text-align', 'text-align: center;', 'Ausrichtung: left, center, right.']
        ] },
        { g: 'Box-Modell', items: [
            ['margin', 'margin: 1rem;', 'Aussenabstand zu anderen Elementen.'],
            ['padding', 'padding: 1rem 2rem;', 'Innenabstand zwischen Rand und Inhalt.'],
            ['border', 'border: 2px solid #333;', 'Rahmen: Dicke, Stil, Farbe.'],
            ['border-radius', 'border-radius: 12px;', 'Abgerundete Ecken.'],
            ['box-sizing', '* { box-sizing: border-box; }', 'Breite inklusive padding und border rechnen – macht Layouts einfacher.']
        ] },
        { g: 'Layout', items: [
            ['display', 'display: block;  display: none;', 'Wie ein Element angezeigt wird (block, inline, flex, grid, none).'],
            ['Flexbox', '.reihe { display: flex; gap: 1rem; }', 'Ordnet Kinder in einer Reihe oder Spalte an.'],
            ['justify-content', 'justify-content: space-between;', 'Verteilung entlang der Hauptachse (bei flex).'],
            ['align-items', 'align-items: center;', 'Ausrichtung quer zur Hauptachse.'],
            ['Grid', '.raster { display: grid; grid-template-columns: 1fr 1fr; }', 'Zweidimensionales Raster aus Spalten und Zeilen.'],
            ['position', 'position: absolute; top: 0; right: 0;', 'Element frei platzieren (relative, absolute, fixed, sticky).']
        ] },
        { g: 'Responsive & Effekte', items: [
            ['Media Query', '@media (max-width: 600px) { }', 'Regeln nur für bestimmte Bildschirmgrössen, z. B. Handys.'],
            ['transition', 'transition: transform .3s;', 'Weicher Übergang, wenn sich eine Eigenschaft ändert.'],
            ['transform', 'transform: scale(1.1) rotate(5deg);', 'Verschieben, drehen, skalieren.'],
            ['Variable', ':root { --akzent: #5eead4; }\na { color: var(--akzent); }', 'Eigene Werte einmal festlegen und überall verwenden.']
        ] }
    ],
    lessons: [
        { t: 'Selektoren & Farben', live: 'css', html: '<h1>Überschrift</h1><p>Ein normaler Absatz.</p><p class="hinweis">Ein Hinweis!</p>',
            text: '<p>Eine CSS-Regel besteht aus <strong>Selektor</strong> und <strong>Eigenschaften</strong>. Ändere rechts die Farben – die Vorschau zeigt sofort das Ergebnis.</p>',
            code: 'body {\n    background: #0b0e1a;\n    color: #dbe7f5;\n    font-family: system-ui, sans-serif;\n}\n\nh1 {\n    color: #5eead4;\n}\n\n.hinweis {\n    color: orange;\n    font-weight: bold;\n}',
            quiz: [{ q: 'Wie wählst du alle Elemente mit class="hinweis" aus?', a: ['#hinweis', '.hinweis', 'hinweis'], ok: 1, why: 'Klassen beginnen mit einem Punkt, IDs mit #.' }] },
        { t: 'Das Box-Modell', live: 'css', html: '<div class="box">Ich bin eine Box</div><div class="box">Ich auch</div>',
            text: '<p>Jedes Element ist eine Box: Inhalt, <code>padding</code> (innen), <code>border</code> (Rahmen) und <code>margin</code> (aussen). Spiel mit den Werten!</p>',
            code: '.box {\n    background: #5eead4;\n    padding: 20px;\n    border: 4px solid #0b0e1a;\n    border-radius: 12px;\n    margin: 16px;\n}',
            quiz: [{ q: 'Welche Eigenschaft ist der Abstand zwischen Rand und Inhalt?', a: ['margin', 'padding', 'border'], ok: 1, why: 'padding ist innen, margin aussen.' }] },
        { t: 'Flexbox', live: 'css', html: '<div class="reihe"><div>1</div><div>2</div><div>3</div></div>',
            text: '<p>Mit <code>display: flex</code> stehen Kinder nebeneinander. <code>justify-content</code> verteilt sie, <code>gap</code> macht Abstand. Probier <code>space-between</code> oder <code>center</code>.</p>',
            code: '.reihe {\n    display: flex;\n    justify-content: space-around;\n    align-items: center;\n    gap: 10px;\n    height: 150px;\n    background: #eef;\n}\n\n.reihe div {\n    background: #a78bfa;\n    color: white;\n    padding: 20px;\n    border-radius: 8px;\n}',
            quiz: [{ q: 'Welche Eigenschaft macht Abstand zwischen Flex-Elementen?', a: ['gap', 'space', 'margin-flex'], ok: 0, why: 'gap funktioniert bei flex und grid.' }] },
        { t: 'Grid-Layouts', live: 'css', html: '<div class="raster"><div>A</div><div>B</div><div>C</div><div>D</div><div>E</div><div>F</div></div>',
            text: '<p>Grid ordnet in Spalten <em>und</em> Zeilen. <code>1fr</code> heisst „ein Teil des freien Platzes“. Ändere die Spaltenzahl!</p>',
            code: '.raster {\n    display: grid;\n    grid-template-columns: 1fr 1fr 1fr;\n    gap: 8px;\n}\n\n.raster div {\n    background: #f472b6;\n    color: white;\n    padding: 24px;\n    text-align: center;\n    border-radius: 8px;\n}',
            quiz: [{ q: 'Was bedeutet 1fr?', a: ['1 Pixel', 'Ein Anteil des freien Platzes', '1 Prozent'], ok: 1, why: 'fr = fraction, also ein Bruchteil.' }] },
        { t: 'Hover & Animation', live: 'css', html: '<button class="knopf">Fahr mit der Maus drüber</button>',
            text: '<p>Mit <code>:hover</code> reagiert ein Element auf die Maus, <code>transition</code> macht die Änderung weich.</p>',
            code: '.knopf {\n    background: #5eead4;\n    border: 0;\n    padding: 14px 24px;\n    border-radius: 999px;\n    font-size: 16px;\n    cursor: pointer;\n    transition: transform .3s, box-shadow .3s;\n}\n\n.knopf:hover {\n    transform: scale(1.1) rotate(-2deg);\n    box-shadow: 0 10px 30px rgba(94, 234, 212, .6);\n}',
            quiz: [{ q: 'Welche Eigenschaft macht Änderungen weich statt sofort?', a: ['animation-speed', 'transition', 'smooth'], ok: 1, why: 'transition legt fest, wie lange der Übergang dauert.' }] }
    ]
});
