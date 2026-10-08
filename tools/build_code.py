"""Erzeugt die Sprachseiten der Code-Bibliothek (hardware/code/<id>.html).

    python tools/build_code.py

Inhalt (Kurs + Cheat-Sheet) steht in hardware/code/data/<id>.js, gerendert von hardware/code/js/code.js.
Neue Sprache: Datendatei anlegen, hier in LANGS eintragen, in assets/js/site.js registrieren, Skript laufen lassen.
"""
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'hardware', 'code')

# (id, Anzeigename, Beschreibung für <meta>)
LANGS = [
    ('csharp', 'C#', 'C# lernen: Kurs mit Quiz und Cheat-Sheet als Word-Datei.'),
    ('python', 'Python', 'Python lernen: Kurs mit Quiz und Cheat-Sheet als Word-Datei.'),
    ('html', 'HTML', 'HTML lernen: Kurs mit Live-Vorschau und Cheat-Sheet als Word-Datei.'),
    ('css', 'CSS', 'CSS lernen: Kurs mit Live-Vorschau und Cheat-Sheet als Word-Datei.'),
    ('javascript', 'JavaScript', 'JavaScript lernen: Kurs mit Live-Ausführung und Cheat-Sheet als Word-Datei.'),
    ('sql', 'SQL', 'SQL lernen: Datenbanken abfragen – Kurs mit Quiz und Cheat-Sheet als Word-Datei.'),
    ('git', 'Git', 'Git lernen: Versionen speichern und zusammenarbeiten – Kurs und Cheat-Sheet als Word-Datei.'),
    ('java', 'Java', 'Java lernen: Kurs mit Quiz und Cheat-Sheet als Word-Datei.'),
    ('cpp', 'C++', 'C++ lernen: Kurs mit Quiz und Cheat-Sheet als Word-Datei.'),
    ('lua', 'Lua', 'Lua lernen (Roblox/Luau): Kurs mit Quiz und Cheat-Sheet als Word-Datei.'),
    ('powershell', 'PowerShell', 'PowerShell lernen: Windows automatisieren – Kurs und Cheat-Sheet als Word-Datei.'),
    ('bash', 'Bash', 'Bash lernen: die Linux-Kommandozeile – Kurs und Cheat-Sheet als Word-Datei.'),
]

PAGE = '''<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{n} lernen · Code-Bibliothek · Xiruprojekts</title>
    <meta name="description" content="{desc}">
    <link rel="stylesheet" href="../../assets/css/main.css">
    <link rel="stylesheet" href="../../assets/css/themes/hardware.css">
    <link rel="stylesheet" href="css/code.css">
    <script src="../../assets/js/site.js"></script>
    <script src="../../assets/js/core.js"></script>
    <script src="../../assets/js/docx.js"></script>
    <script src="js/code.js"></script>
    <script src="data/{id}.js"></script>
</head>
<body class="theme-hardware">
<main class="content">
    <div id="lang"></div>
</main>
<script>XIRU.ready(function () {{ XIRU_CODE.page('{id}'); }});</script>
</body>
</html>
'''

for lid, name, desc in LANGS:
    path = os.path.join(OUT, lid + '.html')
    with io.open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(PAGE.format(id=lid, n=name, desc=desc))
    print('geschrieben:', os.path.relpath(path, ROOT))
