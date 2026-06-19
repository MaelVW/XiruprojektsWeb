So funktioniert es Luka:

Neues Projekt hinzufügen:

ZIP-Datei in den Ordner downloads legen
In download.html im projekte-Array einen neuen Eintrag eintragen:

{
    name:         'Projektname',
    version:      'v1.0.0',
    beschreibung: 'Kurze Beschreibung.',
    datei:        'dateiname.zip',   // ← exakter Dateiname im /downloads/ Ordner
    groesse:      '12 MB'
},
