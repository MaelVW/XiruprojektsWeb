/* Code-Bibliothek · HTML */
XIRU_CODE.add({
    id: 'html', n: 'HTML', icon: '</>', color: '#fb923c', comment: '<!--', markup: true,
    tag: 'Das Skelett jeder Website: Überschriften, Texte, Links, Bilder und Formulare.',
    level: 'Einsteiger', use: 'Websites (zusammen mit CSS und JavaScript)',
    intro: 'HTML ist keine Programmiersprache, sondern eine <strong>Auszeichnungssprache</strong>: Mit Tags sagst du dem Browser, was ein Text ist – Überschrift, Absatz, Link, Bild. Auch diese Website besteht aus HTML. Alle Lektionen hier kannst du live ausprobieren.',
    kw: [],
    sheet: [
        { g: 'Basics', items: [
            ['Tag', '<p>Text</p>', 'Markierung in spitzen Klammern. Meist gibt es ein Start- und ein End-Tag mit /.'],
            ['Element', '<h1>Titel</h1>', 'Start-Tag + Inhalt + End-Tag zusammen.'],
            ['Attribut', '<a href="seite.html">', 'Zusatzinfo im Start-Tag: name="wert".'],
            ['Kommentar', '<!-- Notiz -->', 'Wird nicht angezeigt.'],
            ['Verschachtelung', '<p>Ein <strong>wichtiges</strong> Wort</p>', 'Tags stehen ineinander – zuerst innen schliessen, dann aussen.']
        ] },
        { g: 'Grundgerüst', items: [
            ['<!DOCTYPE html>', '<!DOCTYPE html>', 'Erste Zeile: sagt dem Browser „modernes HTML“.'],
            ['<html>', '<html lang="de">', 'Umschliesst die ganze Seite. lang gibt die Sprache an.'],
            ['<head>', '<head>\n  <meta charset="UTF-8">\n  <title>Titel</title>\n</head>', 'Unsichtbare Infos: Zeichensatz, Titel im Tab, CSS-Dateien.'],
            ['<body>', '<body>\n  <h1>Hallo</h1>\n</body>', 'Alles, was auf der Seite sichtbar ist.'],
            ['<meta charset>', '<meta charset="UTF-8">', 'Damit Umlaute wie ä, ö, ü richtig angezeigt werden.']
        ] },
        { g: 'Text', items: [
            ['<h1> bis <h6>', '<h1>Titel</h1>\n<h2>Untertitel</h2>', 'Überschriften, h1 ist die wichtigste. Pro Seite nur ein h1.'],
            ['<p>', '<p>Ein Absatz.</p>', 'Absatz (Paragraph).'],
            ['<strong> / <em>', '<strong>wichtig</strong> <em>betont</em>', 'Fett (wichtig) und kursiv (betont).'],
            ['<br>', 'Zeile 1<br>Zeile 2', 'Zeilenumbruch, hat kein End-Tag.']
        ] },
        { g: 'Links & Bilder', items: [
            ['<a>', '<a href="https://example.com">Link</a>', 'Verweis auf eine andere Seite. href ist das Ziel.'],
            ['target', '<a href="…" target="_blank" rel="noopener">', 'Öffnet den Link in einem neuen Tab.'],
            ['<img>', '<img src="bild.png" alt="Beschreibung">', 'Bild einfügen. alt beschreibt es für Screenreader und wenn es nicht lädt.']
        ] },
        { g: 'Listen & Tabellen', items: [
            ['<ul> / <li>', '<ul>\n  <li>Eins</li>\n  <li>Zwei</li>\n</ul>', 'Aufzählung mit Punkten.'],
            ['<ol>', '<ol>\n  <li>Erst</li>\n</ol>', 'Nummerierte Liste.'],
            ['<table>', '<table>\n  <tr><th>Name</th></tr>\n  <tr><td>Tom</td></tr>\n</table>', 'Tabelle: tr = Zeile, th = Kopfzelle, td = Zelle.']
        ] },
        { g: 'Formulare', items: [
            ['<form>', '<form>…</form>', 'Rahmen für Eingabefelder.'],
            ['<input>', '<input type="text" id="x">', 'Eingabefeld. type: text, number, email, password, checkbox …'],
            ['<label>', '<label for="x">Name</label>', 'Beschriftung; for verbindet sie mit dem Feld (wichtig für Barrierefreiheit).'],
            ['<button>', '<button type="submit">Senden</button>', 'Knopf.']
        ] },
        { g: 'Struktur', items: [
            ['<div> / <span>', '<div class="box">…</div>', 'Neutrale Behälter: div für Blöcke, span für Text innerhalb einer Zeile.'],
            ['Semantische Tags', '<header> <nav> <main> <section> <footer>', 'Beschreiben die Rolle eines Bereichs – gut für Suchmaschinen und Screenreader.'],
            ['id / class', '<p id="intro" class="hinweis">', 'id ist einmalig, class darf mehrfach vorkommen. Beides nutzt man mit CSS und JS.']
        ] }
    ],
    lessons: [
        { t: 'Das Grundgerüst', live: 'html', text: '<p>Jede Seite hat <code>head</code> (unsichtbare Infos) und <code>body</code> (sichtbarer Inhalt). Ändere rechts den Text und sieh live, was passiert.</p>',
            code: '<!DOCTYPE html>\n<html lang="de">\n<head>\n  <meta charset="UTF-8">\n  <title>Meine Seite</title>\n</head>\n<body>\n  <h1>Hallo Welt!</h1>\n  <p>Meine erste eigene Seite.</p>\n</body>\n</html>',
            quiz: [{ q: 'Wo steht der sichtbare Inhalt?', a: ['im <head>', 'im <body>', 'im <title>'], ok: 1, why: 'Alles Sichtbare gehört in den body.' }] },
        { t: 'Text & Überschriften', live: 'html', text: '<p>Überschriften gehen von <code>h1</code> (wichtigste) bis <code>h6</code>. Absätze sind <code>p</code>. Mit <code>strong</code> und <code>em</code> hebst du Wörter hervor.</p>',
            code: '<h1>Mein Lieblingsspiel</h1>\n<h2>Warum?</h2>\n<p>Es ist <strong>spannend</strong> und <em>wunderschön</em>.</p>\n<p>Zeile eins<br>Zeile zwei</p>',
            quiz: [{ q: 'Welches Tag ist die wichtigste Überschrift?', a: ['<h6>', '<h1>', '<head>'], ok: 1, why: 'h1 ist die Hauptüberschrift.' }] },
        { t: 'Links & Bilder', live: 'html', text: '<p>Links bauen das Netz: <code>&lt;a href="…"&gt;</code>. Bilder brauchen <code>src</code> (Quelle) und <code>alt</code> (Beschreibung). Das Beispielbild steckt direkt im Code, damit nichts von fremden Servern geladen wird.</p>',
            code: '<p>Besuch <a href="https://example.com" target="_blank" rel="noopener">diese Seite</a>.</p>\n<img src="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27200%27 height=%27120%27%3E%3Crect width=%27200%27 height=%27120%27 rx=%2712%27 fill=%27%235eead4%27/%3E%3Ctext x=%27100%27 y=%2768%27 text-anchor=%27middle%27 font-family=%27sans-serif%27 font-size=%2720%27%3EMein Bild%3C/text%3E%3C/svg%3E" alt="Ein türkises Beispielbild">',
            quiz: [{ q: 'Welches Attribut beschreibt ein Bild für Screenreader?', a: ['src', 'alt', 'href'], ok: 1, why: 'alt ist der Ersatztext des Bildes.' }] },
        { t: 'Listen & Tabellen', live: 'html', text: '<p><code>ul</code> macht Punkte, <code>ol</code> Nummern, jeder Eintrag ist ein <code>li</code>. Tabellen bestehen aus Zeilen (<code>tr</code>) mit Zellen (<code>th</code>/<code>td</code>).</p>',
            code: '<ul>\n  <li>Diskette</li>\n  <li>CD</li>\n  <li>SSD</li>\n</ul>\n<table border="1">\n  <tr><th>Teil</th><th>Jahr</th></tr>\n  <tr><td>Diskette</td><td>1971</td></tr>\n  <tr><td>CD</td><td>1982</td></tr>\n</table>',
            quiz: [{ q: 'Was ist ein <td>?', a: ['Eine Tabellenzeile', 'Eine Tabellenzelle', 'Eine Überschrift'], ok: 1, why: 'td = table data, also eine Zelle.' }] },
        { t: 'Formulare', live: 'html', text: '<p>Formulare sammeln Eingaben. Jedes Feld bekommt ein <code>label</code> – das <code>for</code> zeigt auf die <code>id</code> des Feldes.</p>',
            code: '<form>\n  <label for="name">Name</label><br>\n  <input type="text" id="name" placeholder="Tom Mustermann"><br><br>\n  <label><input type="checkbox"> Newsletter</label><br><br>\n  <button type="button">Senden</button>\n</form>',
            quiz: [{ q: 'Wie verbindet man ein label mit einem input?', a: ['label for="x" + input id="x"', 'label name="x"', 'Gar nicht nötig'], ok: 0, why: 'for und id müssen gleich sein.' }] }
    ]
});
