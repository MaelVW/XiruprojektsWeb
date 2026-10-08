/* Code-Bibliothek · JavaScript */
XIRU_CODE.add({
    id: 'javascript', n: 'JavaScript', icon: 'JS', color: '#fde047', comment: '//',
    tag: 'Bringt Websites zum Leben: Klicks, Spiele, Animationen – auch diese Seite läuft damit.',
    level: 'Einsteiger bis Fortgeschritten', use: 'Interaktive Websites, Browser-Spiele, Server (Node.js)',
    intro: 'JavaScript läuft direkt im Browser. Damit reagieren Seiten auf Klicks, rechnen, speichern Spielstände und zeichnen Spiele. Alle Spiele in unserer Spielhalle sind in JavaScript geschrieben. Die Lektionen laufen live – <code>console.log</code> erscheint rechts.',
    kw: ['let', 'const', 'var', 'function', 'return', 'if', 'else', 'for', 'of', 'in', 'while', 'break', 'continue', 'true', 'false', 'null', 'undefined', 'new', 'class', 'this', 'document', 'console', 'typeof', 'switch', 'case', 'default', 'try', 'catch', 'async', 'await'],
    sheet: [
        { g: 'Basics', items: [
            ['console.log', 'console.log("Hallo");', 'Gibt etwas in der Entwicklerkonsole aus (F12).'],
            ['let', 'let x = 1;\nx = 2;', 'Variable, deren Wert sich ändern darf.'],
            ['const', 'const y = 3;', 'Konstante: kann nicht neu zugewiesen werden. Standardwahl, wenn möglich.'],
            ['Kommentar', '// eine Zeile\n/* mehrere */', 'Wird ignoriert.'],
            ['Semikolon', 'let x = 1;', 'Beendet eine Anweisung (meist optional, aber empfohlen).']
        ] },
        { g: 'Datentypen', items: [
            ['number', 'let x = 2.5;', 'Zahlen – ganze und Kommazahlen sind derselbe Typ.'],
            ['string', 'let x = "Tom Mustermann";', 'Text in "…", \'…\' oder `…`.'],
            ['Template-String', 'console.log(`x ist ${x}`);', 'Mit Backticks lassen sich Werte in ${} einsetzen.'],
            ['boolean', 'let x = true;', 'true oder false.'],
            ['array', 'let x = [1, 2, 3];', 'Liste. Index beginnt bei 0.'],
            ['object', 'let x = { name: "Tom", alter: 1 };', 'Sammlung von Schlüssel-Wert-Paaren.'],
            ['null / undefined', 'let x = null;', 'null = absichtlich leer, undefined = (noch) kein Wert.']
        ] },
        { g: 'Operatoren & Vergleiche', items: [
            ['===', 'x === 1', 'Streng gleich: Wert und Typ müssen gleich sein. Fast immer statt == verwenden.', '== wandelt Typen vorher um, deshalb ist 1 == "1" true. === prüft auch den Typ: 1 === "1" ist false. So passieren weniger Überraschungen.'],
            ['&& || !', 'x > 1 && x < 3', 'und, oder, nicht.'],
            ['Ternär', 'let y = x > 1 ? "gross" : "klein";', 'Kurzes if/else für einen Wert.']
        ] },
        { g: 'Kontrollstrukturen', items: [
            ['if / else', 'if (x > 1) {\n  y = 1;\n} else {\n  y = 2;\n}', 'Verzweigung.'],
            ['for', 'for (let i = 0; i < 3; i++) { }', 'Zählschleife.'],
            ['for … of', 'for (const x of [1, 2, 3]) { }', 'Geht die Werte eines Arrays durch.'],
            ['while', 'while (x < 3) { x++; }', 'Wiederholt, solange die Bedingung wahr ist.']
        ] },
        { g: 'Funktionen', items: [
            ['function', 'function doppelt(x) {\n  return x * 2;\n}', 'Benannter Codeblock mit Rückgabewert.'],
            ['Pfeilfunktion', 'const doppelt = x => x * 2;', 'Kurzschreibweise für Funktionen.'],
            ['map / filter', '[1, 2, 3].map(x => x * 2)\n[1, 2, 3].filter(x => x > 1)', 'Erzeugen neue Arrays: umwandeln bzw. aussieben.']
        ] },
        { g: 'Webseite steuern (DOM)', items: [
            ['querySelector', 'const x = document.querySelector("#knopf");', 'Holt das erste passende Element der Seite.'],
            ['textContent', 'x.textContent = "Hallo";', 'Setzt Text sicher (ohne HTML auszuführen).'],
            ['addEventListener', 'x.addEventListener("click", () => { });', 'Reagiert auf Ereignisse wie Klicks oder Tasten.'],
            ['classList', 'x.classList.add("aktiv");', 'Klassen hinzufügen, entfernen oder umschalten.'],
            ['localStorage', 'localStorage.setItem("x", "1");', 'Speichert Daten dauerhaft im Browser – so merkt sich diese Website deinen Fortschritt.']
        ] }
    ],
    lessons: [
        { t: 'Hallo JavaScript', live: 'js', text: '<p><code>console.log</code> gibt etwas aus – hier rechts in der Vorschau, im echten Browser in der Konsole (F12). Ändere den Text!</p>',
            code: 'console.log("Hallo Welt!");\nconsole.log(1 + 2);\nconsole.log("Kristalle: " + 7);',
            quiz: [{ q: 'Wo erscheint console.log im echten Browser?', a: ['Auf der Seite', 'In der Entwicklerkonsole (F12)', 'Gar nicht'], ok: 1, why: 'console.log schreibt in die Konsole der Entwicklertools.' }] },
        { t: 'Variablen', live: 'js', text: '<p><code>let</code> für Werte, die sich ändern, <code>const</code> für alles andere. Mit Backticks und <code>${}</code> baust du Texte zusammen.</p>',
            code: 'const name = "Tom Mustermann";\nlet punkte = 0;\npunkte = punkte + 10;\npunkte += 5;\n\nconsole.log(`${name} hat ${punkte} Punkte`);',
            quiz: [{ q: 'Welche Variable kann man nicht neu zuweisen?', a: ['let', 'const', 'var'], ok: 1, why: 'const ist eine Konstante.' }] },
        { t: 'Entscheidungen', live: 'js', text: '<p>Vergleiche immer mit <code>===</code>. Ändere <code>x</code> und schau, welcher Zweig läuft.</p>',
            code: 'const x = 7;\n\nif (x > 10) {\n    console.log("gross");\n} else if (x === 7) {\n    console.log("genau sieben!");\n} else {\n    console.log("klein");\n}\n\nconsole.log(1 == "1", 1 === "1");',
            quiz: [{ q: 'Was ergibt 1 === "1"?', a: ['true', 'false', 'Fehler'], ok: 1, why: '=== prüft auch den Typ: Zahl ist nicht gleich Text.' }] },
        { t: 'Schleifen & Arrays', live: 'js', text: '<p>Arrays speichern Listen. Mit <code>for … of</code> gehst du sie durch, mit <code>map</code> und <code>filter</code> verwandelst du sie.</p>',
            code: 'const teile = ["CPU", "GPU", "RAM"];\n\nfor (const t of teile) {\n    console.log("Eingebaut: " + t);\n}\n\nconst zahlen = [1, 2, 3, 4];\nconsole.log(zahlen.map(x => x * 2));\nconsole.log(zahlen.filter(x => x > 2));',
            quiz: [{ q: 'Was macht filter?', a: ['Sortiert ein Array', 'Behält nur Elemente, die eine Bedingung erfüllen', 'Löscht das Array'], ok: 1, why: 'filter siebt aus.' }] },
        { t: 'Funktionen', live: 'js', text: '<p>Funktionen verpacken Logik. Pfeilfunktionen sind die kurze Schreibweise.</p>',
            code: 'function gruss(name) {\n    return "Hallo, " + name + "!";\n}\n\nconst doppelt = x => x * 2;\n\nconsole.log(gruss("Tom Mustermann"));\nconsole.log(doppelt(21));',
            quiz: [{ q: 'Wie sieht eine Pfeilfunktion aus?', a: ['x => x * 2', 'function => x', 'x -> x * 2'], ok: 0, why: 'Der Pfeil ist =>.' }] }
    ]
});
