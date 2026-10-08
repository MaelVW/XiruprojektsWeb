/* Code-Bibliothek · Bash */
XIRU_CODE.add({
    id: 'bash', n: 'Bash', icon: '$_', color: '#4ade80', comment: '#',
    tag: 'Die Kommandozeile von Linux und macOS: Dateien, Server und Raspberry Pi steuern.',
    level: 'Einsteiger', use: 'Linux, macOS, Server, Raspberry Pi, Git Bash',
    intro: 'Bash ist die klassische Shell auf Linux und macOS – und unter Windows als „Git Bash“ dabei. Du tippst Befehle, verkettest sie mit <code>|</code> und schreibst daraus kleine Skripte. Wer Server oder einen Raspberry Pi steuert, kommt an Bash kaum vorbei.',
    kw: ['echo', 'cd', 'ls', 'pwd', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep', 'if', 'then', 'else', 'fi', 'for', 'in', 'do', 'done', 'while', 'read', 'chmod', 'sudo', 'export', 'function'],
    sheet: [
        { g: 'Basics', items: [
            ['echo', 'echo "Hallo"', 'Gibt Text aus.'],
            ['Variable', 'name="Tom"\necho "Hallo $name"', 'Ohne Leerzeichen um das = ! Abrufen mit $.'],
            ['Kommentar', '# Notiz', 'Wird ignoriert.'],
            ['Shebang', '#!/bin/bash', 'Erste Zeile eines Skripts: sagt, womit es ausgeführt wird.'],
            ['man', 'man ls', 'Handbuch zu einem Befehl (beenden mit q).']
        ] },
        { g: 'Dateien & Ordner', items: [
            ['pwd / cd', 'pwd\ncd ~/projekte', 'Wo bin ich? / Ordner wechseln (~ ist dein Home-Ordner).'],
            ['ls', 'ls -la', 'Inhalt auflisten, -la zeigt auch versteckte Dateien und Details.'],
            ['mkdir / touch', 'mkdir neu\ntouch datei.txt', 'Ordner bzw. leere Datei anlegen.'],
            ['cp / mv / rm', 'cp a.txt b.txt\nmv b.txt c.txt\nrm c.txt', 'Kopieren, verschieben/umbenennen, löschen. rm fragt nicht nach – Vorsicht!'],
            ['cat', 'cat datei.txt', 'Inhalt einer Datei anzeigen.']
        ] },
        { g: 'Pipes & Suche', items: [
            ['|', 'ls | wc -l', 'Ausgabe als Eingabe an den nächsten Befehl.'],
            ['grep', 'grep "Fehler" log.txt', 'Zeilen mit einem Suchbegriff finden.'],
            ['> / >>', 'echo "x" > a.txt\necho "y" >> a.txt', 'In Datei schreiben (überschreiben / anhängen).']
        ] },
        { g: 'Skripte', items: [
            ['if', 'if [ "$x" -gt 1 ]; then\n  echo "gross"\nfi', 'Verzweigung. Leerzeichen in [ ] sind Pflicht, Ende mit fi.'],
            ['for', 'for f in *.txt; do\n  echo "$f"\ndone', 'Schleife über Dateien oder Listen.'],
            ['read', 'read -p "Name? " name', 'Eingabe vom Benutzer.'],
            ['chmod +x', 'chmod +x skript.sh\n./skript.sh', 'Skript ausführbar machen und starten.'],
            ['sudo', 'sudo apt update', 'Befehl mit Administratorrechten ausführen – nur, wenn du weisst, was er tut.']
        ] }
    ],
    lessons: [
        { t: 'Erste Schritte', text: '<p>Mit <code>pwd</code> siehst du, wo du bist, <code>ls</code> zeigt den Inhalt, <code>cd</code> wechselt den Ordner.</p>',
            code: 'pwd\nls -la\nmkdir test\ncd test\necho "Hallo" > gruss.txt\ncat gruss.txt',
            quiz: [{ q: 'Welcher Befehl zeigt den aktuellen Ordner?', a: ['ls', 'pwd', 'cd'], ok: 1, why: 'pwd = print working directory.' }] },
        { t: 'Variablen', text: '<p>Bei der Zuweisung keine Leerzeichen um <code>=</code>! Abgerufen werden Variablen mit <code>$</code> – am besten in Anführungszeichen.</p>',
            code: 'name="Tom Mustermann"\nanzahl=3\necho "$name hat $anzahl Kristalle"',
            quiz: [{ q: 'Was ist korrekt?', a: ['x = 1', 'x=1', '$x = 1'], ok: 1, why: 'Bash erlaubt keine Leerzeichen um das = bei der Zuweisung.' }] },
        { t: 'Pipes', text: '<p>Mit <code>|</code> verkettest du Befehle: Die Ausgabe des einen ist die Eingabe des nächsten.</p>',
            code: '# Wie viele Dateien liegen hier?\nls | wc -l\n\n# Alle Zeilen mit "Fehler" zählen\ngrep "Fehler" log.txt | wc -l',
            quiz: [{ q: 'Was macht >> ?', a: ['Überschreibt die Datei', 'Hängt an die Datei an', 'Liest die Datei'], ok: 1, why: '> überschreibt, >> hängt an.' }] },
        { t: 'Ein kleines Skript', text: '<p>Skripte beginnen mit dem Shebang <code>#!/bin/bash</code>. Mit <code>chmod +x</code> machst du sie ausführbar.</p>',
            code: '#!/bin/bash\nread -p "Wie heisst du? " name\nif [ -z "$name" ]; then\n  echo "Niemand da?"\nelse\n  echo "Hallo, $name!"\nfi\n\nfor i in 1 2 3; do\n  echo "Runde $i"\ndone',
            quiz: [{ q: 'Womit endet ein if-Block in Bash?', a: ['end', 'fi', 'done'], ok: 1, why: 'fi ist if rückwärts geschrieben.' }] }
    ]
});
