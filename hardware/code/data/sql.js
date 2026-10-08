/* Code-Bibliothek · SQL */
XIRU_CODE.add({
    id: 'sql', n: 'SQL', icon: 'SQL', color: '#34d399', comment: '--',
    tag: 'Die Sprache der Datenbanken: Daten suchen, sortieren, verknüpfen und ändern.',
    level: 'Einsteiger', use: 'Datenbanken (MySQL, PostgreSQL, SQLite …)',
    intro: 'Mit SQL fragst du Datenbanken ab. Daten liegen in <strong>Tabellen</strong> aus Zeilen und Spalten – fast wie Excel, nur viel grösser. Ein Befehl liest sich fast wie ein englischer Satz: <code>SELECT name FROM spieler WHERE level &gt; 3</code>.',
    kw: ['SELECT', 'FROM', 'WHERE', 'ORDER', 'BY', 'ASC', 'DESC', 'LIMIT', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'PRIMARY', 'KEY', 'INT', 'VARCHAR', 'JOIN', 'ON', 'AND', 'OR', 'NOT', 'NULL', 'COUNT', 'AVG', 'SUM', 'MAX', 'MIN', 'GROUP', 'AS', 'LIKE', 'IN', 'DISTINCT', 'INNER', 'LEFT'],
    sheet: [
        { g: 'Basics', items: [
            ['Tabelle', 'spieler (id, name, level)', 'Daten in Zeilen (Datensätze) und Spalten (Felder).'],
            ['SELECT', 'SELECT name FROM spieler;', 'Liest Spalten aus einer Tabelle.'],
            ['*', 'SELECT * FROM spieler;', 'Alle Spalten.'],
            ['Kommentar', '-- Notiz', 'Alles nach -- wird ignoriert.'],
            ['Semikolon', 'SELECT 1;', 'Beendet einen Befehl.']
        ] },
        { g: 'Filtern & Sortieren', items: [
            ['WHERE', 'SELECT * FROM spieler WHERE level > 3;', 'Nur Zeilen, die die Bedingung erfüllen.'],
            ['AND / OR', 'WHERE level > 3 AND name = \'Tom\'', 'Bedingungen verknüpfen.'],
            ['LIKE', "WHERE name LIKE 'T%'", 'Textmuster: % steht für beliebig viele Zeichen.'],
            ['IN', 'WHERE id IN (1, 2, 3)', 'Wert in einer Liste.'],
            ['ORDER BY', 'ORDER BY level DESC', 'Sortieren: ASC aufsteigend, DESC absteigend.'],
            ['LIMIT', 'LIMIT 10', 'Nur die ersten n Zeilen.'],
            ['DISTINCT', 'SELECT DISTINCT land FROM spieler;', 'Doppelte Werte nur einmal.']
        ] },
        { g: 'Zählen & Gruppieren', items: [
            ['COUNT', 'SELECT COUNT(*) FROM spieler;', 'Zählt Zeilen.'],
            ['AVG / SUM / MAX / MIN', 'SELECT AVG(level) FROM spieler;', 'Durchschnitt, Summe, Grösstes, Kleinstes.'],
            ['GROUP BY', 'SELECT land, COUNT(*) FROM spieler GROUP BY land;', 'Fasst Zeilen mit gleichem Wert zusammen.'],
            ['AS', 'SELECT COUNT(*) AS anzahl FROM spieler;', 'Gibt einer Spalte im Ergebnis einen Namen.']
        ] },
        { g: 'Ändern', items: [
            ['INSERT', "INSERT INTO spieler (name, level) VALUES ('Tom Mustermann', 1);", 'Fügt eine neue Zeile ein.'],
            ['UPDATE', 'UPDATE spieler SET level = 2 WHERE id = 1;', 'Ändert bestehende Zeilen. Ohne WHERE trifft es alle!'],
            ['DELETE', 'DELETE FROM spieler WHERE id = 1;', 'Löscht Zeilen. Ohne WHERE ist die Tabelle leer!'],
            ['CREATE TABLE', 'CREATE TABLE spieler (\n  id INT PRIMARY KEY,\n  name VARCHAR(50)\n);', 'Legt eine neue Tabelle mit Spalten und Typen an.'],
            ['PRIMARY KEY', 'id INT PRIMARY KEY', 'Eindeutige Kennung jeder Zeile.']
        ] },
        { g: 'Verknüpfen', items: [
            ['JOIN', 'SELECT s.name, k.punkte\nFROM spieler s\nJOIN konten k ON k.spieler_id = s.id;', 'Verbindet Zeilen aus zwei Tabellen über einen gemeinsamen Wert.', 'INNER JOIN (Standard) liefert nur Zeilen, die in beiden Tabellen einen Partner haben. LEFT JOIN liefert alle Zeilen der linken Tabelle, auch ohne Partner – die fehlenden Werte sind dann NULL.'],
            ['Fremdschlüssel', 'spieler_id INT', 'Spalte, die auf den Primärschlüssel einer anderen Tabelle zeigt.']
        ] }
    ],
    lessons: [
        { t: 'Tabellen & SELECT', text: '<p>Stell dir eine Tabelle <code>spieler</code> vor mit den Spalten <code>id</code>, <code>name</code>, <code>level</code>. Mit <code>SELECT</code> holst du Spalten heraus, mit <code>*</code> alle.</p>',
            code: '-- Alle Spalten aller Spieler\nSELECT * FROM spieler;\n\n-- Nur die Namen\nSELECT name FROM spieler;',
            quiz: [{ q: 'Was bedeutet SELECT * ?', a: ['Alle Tabellen', 'Alle Spalten', 'Alles löschen'], ok: 1, why: 'Der Stern steht für alle Spalten.' }] },
        { t: 'Filtern mit WHERE', text: '<p><code>WHERE</code> filtert Zeilen. Texte stehen in einfachen Anführungszeichen. Mit <code>LIKE</code> und <code>%</code> suchst du Muster.</p>',
            code: "SELECT name, level\nFROM spieler\nWHERE level >= 3 AND name LIKE 'T%';",
            quiz: [{ q: "Was findet LIKE 'T%'?", a: ['Nur den Namen T', 'Alles, was mit T beginnt', 'Alles mit %'], ok: 1, why: '% steht für beliebig viele Zeichen.' }] },
        { t: 'Sortieren & Zählen', text: '<p><code>ORDER BY</code> sortiert, <code>LIMIT</code> begrenzt – perfekt für eine Bestenliste. <code>COUNT</code>, <code>AVG</code> und Co. rechnen über viele Zeilen.</p>',
            code: '-- Top 3 nach Level\nSELECT name, level FROM spieler\nORDER BY level DESC\nLIMIT 3;\n\n-- Wie viele Spieler pro Land?\nSELECT land, COUNT(*) AS anzahl\nFROM spieler\nGROUP BY land;',
            quiz: [{ q: 'Wie sortierst du absteigend?', a: ['ORDER BY level ASC', 'ORDER BY level DESC', 'SORT level DOWN'], ok: 1, why: 'DESC = descending = absteigend.' }] },
        { t: 'Daten ändern', text: '<p><code>INSERT</code> fügt hinzu, <code>UPDATE</code> ändert, <code>DELETE</code> löscht. <strong>Wichtig:</strong> UPDATE und DELETE ohne <code>WHERE</code> treffen <em>alle</em> Zeilen!</p>',
            code: "INSERT INTO spieler (name, level) VALUES ('Tom Mustermann', 1);\n\nUPDATE spieler SET level = 2 WHERE name = 'Tom Mustermann';\n\nDELETE FROM spieler WHERE level = 0;",
            quiz: [{ q: 'Was passiert bei DELETE FROM spieler; ohne WHERE?', a: ['Nichts', 'Alle Zeilen werden gelöscht', 'Nur die erste Zeile'], ok: 1, why: 'Ohne Bedingung gilt der Befehl für die ganze Tabelle.' }] },
        { t: 'Tabellen verknüpfen', text: '<p>Daten sind oft auf mehrere Tabellen verteilt. Mit <code>JOIN</code> verbindest du sie über einen gemeinsamen Schlüssel.</p>',
            code: 'SELECT s.name, k.punkte\nFROM spieler s\nJOIN konten k ON k.spieler_id = s.id\nORDER BY k.punkte DESC;',
            quiz: [{ q: 'Wozu dient ON beim JOIN?', a: ['Es schaltet die Tabelle ein', 'Es sagt, welche Spalten zusammengehören', 'Es sortiert'], ok: 1, why: 'ON legt die Verbindungsbedingung fest.' }] }
    ]
});
