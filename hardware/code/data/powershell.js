/* Code-Bibliothek · PowerShell */
XIRU_CODE.add({
    id: 'powershell', n: 'PowerShell', icon: 'PS', color: '#38bdf8', comment: '#',
    tag: 'Windows automatisieren: Dateien, Programme und Einstellungen per Skript – Floppy Hub ist so gebaut.',
    level: 'Einsteiger', use: 'Windows-Automatisierung, Admin-Aufgaben, Werkzeuge',
    intro: 'PowerShell ist die Kommandozeile und Skriptsprache von Windows. Befehle heissen <strong>Cmdlets</strong> und folgen dem Muster <strong>Verb-Nomen</strong> (z. B. <code>Get-ChildItem</code>). Ergebnisse sind Objekte, die man mit <code>|</code> weiterreicht. Unser Floppy Hub ist ein PowerShell-Projekt.',
    kw: ['if', 'else', 'elseif', 'foreach', 'for', 'while', 'function', 'param', 'return', 'switch', 'in', 'true', 'false', 'null', 'Write-Host', 'Get-ChildItem', 'Read-Host', 'Where-Object', 'Select-Object', 'ForEach-Object', 'Test-Path', 'Get-Content', 'Set-Content'],
    sheet: [
        { g: 'Basics', items: [
            ['Cmdlet', 'Get-Date', 'Befehl im Muster Verb-Nomen.'],
            ['Write-Host', 'Write-Host "Hallo"', 'Gibt Text in der Konsole aus.'],
            ['Variable', '$x = 1', 'Variablen beginnen immer mit $.'],
            ['Kommentar', '# eine Zeile\n<# mehrere #>', 'Wird ignoriert.'],
            ['Get-Help', 'Get-Help Get-ChildItem -Examples', 'Hilfe und Beispiele zu einem Befehl.']
        ] },
        { g: 'Dateien & Ordner', items: [
            ['Get-ChildItem', 'Get-ChildItem C:\\Spiele', 'Listet Dateien und Ordner (Kurzform: ls, dir).'],
            ['Test-Path', 'Test-Path .\\game.txt', 'Prüft, ob eine Datei oder ein Ordner existiert.'],
            ['Get-Content', 'Get-Content .\\game.txt', 'Liest eine Textdatei Zeile für Zeile.'],
            ['Set-Content', 'Set-Content .\\x.txt "Hallo"', 'Schreibt Text in eine Datei (überschreibt).'],
            ['Join-Path', 'Join-Path $PSScriptRoot "game.txt"', 'Baut Pfade sicher zusammen.']
        ] },
        { g: 'Pipeline', items: [
            ['|', 'Get-ChildItem | Select-Object Name', 'Reicht Ergebnisse an den nächsten Befehl weiter.'],
            ['Where-Object', 'Get-Process | Where-Object CPU -gt 10', 'Filtert Objekte.'],
            ['ForEach-Object', '1..3 | ForEach-Object { $_ * 2 }', 'Macht etwas mit jedem Objekt. $_ ist das aktuelle.'],
            ['Sort-Object', 'Get-ChildItem | Sort-Object Length', 'Sortiert nach einer Eigenschaft.']
        ] },
        { g: 'Logik', items: [
            ['Vergleich', '$x -eq 1   $x -ne 2   $x -gt 3', 'Vergleiche mit -eq, -ne, -gt, -lt, -ge, -le statt == oder >.', 'Weil > in Konsolen für Umleitung in Dateien steht, nutzt PowerShell Wörter: -eq (equal), -gt (greater than), -lt (less than). Für Texte gibt es -like mit Platzhaltern und -match mit regulären Ausdrücken.'],
            ['if / else', 'if ($x -gt 1) { "gross" } else { "klein" }', 'Verzweigung.'],
            ['foreach', 'foreach ($d in $dateien) { $d.Name }', 'Geht eine Sammlung durch.'],
            ['Read-Host', '$a = Read-Host "Weiter? (J/N)"', 'Fragt den Benutzer – wie Floppy Hub vor jedem pcrun.']
        ] },
        { g: 'Funktionen', items: [
            ['function', 'function Gruss($name) {\n    "Hallo $name"\n}', 'Eigene Funktion. In "…" werden Variablen eingesetzt.'],
            ['param', 'param([string]$Name = "Tom")', 'Parameter mit Typ und Standardwert.']
        ] }
    ],
    lessons: [
        { t: 'Erste Befehle', text: '<p>Cmdlets heissen <strong>Verb-Nomen</strong>. Variablen beginnen mit <code>$</code>. In doppelten Anführungszeichen werden Variablen direkt eingesetzt.</p>',
            code: '$name = "Tom Mustermann"\nWrite-Host "Hallo $name!"\nGet-Date\nGet-ChildItem',
            quiz: [{ q: 'Womit beginnen Variablen in PowerShell?', a: ['@', '$', '%'], ok: 1, why: 'Alle Variablen starten mit $.' }] },
        { t: 'Die Pipeline', text: '<p>Mit <code>|</code> gibst du Ergebnisse weiter. <code>$_</code> steht für das aktuelle Objekt.</p>',
            code: '# Die 5 grössten Dateien im Ordner\nGet-ChildItem -File |\n    Sort-Object Length -Descending |\n    Select-Object -First 5 Name, Length',
            quiz: [{ q: 'Was ist $_ ?', a: ['Eine leere Variable', 'Das aktuelle Objekt in der Pipeline', 'Ein Fehler'], ok: 1, why: '$_ ist das Element, das gerade verarbeitet wird.' }] },
        { t: 'Vergleiche & Fragen', text: '<p>Statt <code>==</code> und <code>&gt;</code> nutzt PowerShell <code>-eq</code> und <code>-gt</code>. Mit <code>Read-Host</code> fragst du nach – so wie Floppy Hub vor gefährlichen Befehlen um Erlaubnis bittet.</p>',
            code: '$antwort = Read-Host "Programm starten? (J/N)"\nif ($antwort -eq "J") {\n    Write-Host "Starte …"\n} else {\n    Write-Host "Abgebrochen."\n}',
            quiz: [{ q: 'Wie schreibt man „grösser als“?', a: ['>', '-gt', '-greater'], ok: 1, why: '-gt steht für greater than.' }] },
        { t: 'Dateien lesen', text: '<p><code>Get-Content</code> liest eine Datei Zeile für Zeile – perfekt für Konfigurationsdateien wie Floppy Hubs <code>game.txt</code>.</p>',
            code: '$datei = Join-Path $PSScriptRoot "game.txt"\nif (Test-Path $datei) {\n    foreach ($zeile in Get-Content $datei) {\n        if ($zeile -like "name=*") {\n            Write-Host "Spiel: $($zeile.Substring(5))"\n        }\n    }\n}',
            quiz: [{ q: 'Welcher Befehl prüft, ob eine Datei existiert?', a: ['Test-Path', 'Get-File', 'Exists'], ok: 0, why: 'Test-Path gibt True oder False zurück.' }] }
    ]
});
