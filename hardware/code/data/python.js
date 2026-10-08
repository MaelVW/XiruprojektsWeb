/* Code-Bibliothek · Python */
XIRU_CODE.add({
    id: 'python', n: 'Python', icon: 'Py', color: '#facc15', comment: '#',
    tag: 'Leicht zu lesen, riesig im Einsatz: Skripte, KI, Daten und Automatisierung.',
    level: 'Einsteiger', use: 'Skripte, KI & Daten, Automatisierung',
    intro: 'Python liest sich fast wie Englisch. Statt geschweifter Klammern zählt die <strong>Einrückung</strong>, und Variablen brauchen keinen festen Datentyp. Ideal für den Einstieg – und trotzdem die Sprache hinter vielen KI-Projekten.',
    kw: ['def', 'return', 'if', 'elif', 'else', 'for', 'in', 'while', 'break', 'continue', 'import', 'from', 'as', 'True', 'False', 'None', 'and', 'or', 'not', 'try', 'except', 'finally', 'class', 'print', 'input', 'range', 'len', 'int', 'str', 'float', 'list', 'dict', 'with', 'pass', 'lambda'],
    sheet: [
        { g: 'Basics', items: [
            ['print', 'print("Hallo")', 'Gibt etwas in der Konsole aus.'],
            ['Variable', 'x = 1', 'Name für einen Wert. Der Typ ergibt sich automatisch aus dem Wert.'],
            ['Kommentar', '# Das ist ein Kommentar', 'Alles nach # wird ignoriert.'],
            ['Einrückung', 'if x > 1:\n    print("gross")', 'Python erkennt Blöcke an der Einrückung (meist 4 Leerzeichen) statt an { }.', 'Falsche oder gemischte Einrückung (Tabs und Leerzeichen) führt zu einem IndentationError. Editoren wandeln Tab meist automatisch in 4 Leerzeichen um.'],
            ['Doppelpunkt', 'for x in range(3):', 'Leitet einen neuen Block ein (nach if, for, while, def …).']
        ] },
        { g: 'Datentypen', items: [
            ['int', 'x = 3', 'Ganze Zahl, beliebig gross.'],
            ['float', 'y = 2.5', 'Kommazahl.'],
            ['str', 'x = "Tom Mustermann"', 'Text, in einfachen oder doppelten Anführungszeichen.'],
            ['bool', 'x = True', 'Wahrheitswert True oder False (gross geschrieben).'],
            ['list', 'x = [1, 2, 3]', 'Veränderbare Liste von Werten.'],
            ['dict', 'x = {"name": "Tom", "alter": 1}', 'Wörterbuch: Schlüssel → Wert.'],
            ['tuple', 'x = (1, 2)', 'Unveränderbare Liste.'],
            ['None', 'x = None', 'Steht für „kein Wert“.'],
            ['type', 'type(x)', 'Zeigt, welchen Datentyp ein Wert hat.']
        ] },
        { g: 'Ein- und Ausgabe', items: [
            ['input', 'x = input("Name: ")', 'Liest eine Eingabe als Text ein.'],
            ['int()', 'x = int(input("Alter: "))', 'Wandelt Text in eine ganze Zahl um.'],
            ['f-String', 'print(f"x ist {x}")', 'Mit f vor dem Text lassen sich Variablen in {} einsetzen.']
        ] },
        { g: 'Operatoren', items: [
            ['Rechnen', 'x = 7 / 2   # 3.5\ny = 7 // 2  # 3', '/ teilt immer mit Komma, // ganzzahlig, % gibt den Rest, ** ist hoch.'],
            ['Vergleichen', 'x == 1   x != 2', 'Ergeben True oder False.'],
            ['Logik', 'x > 1 and x < 3', 'and, or, not – als Wörter geschrieben.']
        ] },
        { g: 'Verzweigungen', items: [
            ['if / elif / else', 'if x > 1:\n    y = 1\nelif x == 1:\n    y = 0\nelse:\n    y = -1', 'Entscheidet anhand von Bedingungen. elif heisst „sonst wenn“.']
        ] },
        { g: 'Schleifen', items: [
            ['for', 'for x in [1, 2, 3]:\n    print(x)', 'Geht jedes Element einer Folge durch.'],
            ['range', 'for i in range(3):  # 0, 1, 2', 'Erzeugt Zahlenfolgen: range(start, ende, schritt). Das Ende ist nicht dabei.'],
            ['while', 'while x < 3:\n    x += 1', 'Wiederholt, solange die Bedingung wahr ist.'],
            ['break / continue', 'if x == 2:\n    break', 'break bricht ab, continue springt zum nächsten Durchlauf.']
        ] },
        { g: 'Listen & Texte', items: [
            ['append', 'x.append(4)', 'Hängt ein Element ans Ende der Liste.'],
            ['len', 'len(x)', 'Anzahl der Elemente oder Zeichen.'],
            ['Index', 'x[0]   x[-1]', 'Zugriff per Position. 0 ist das erste, -1 das letzte Element.'],
            ['Slicing', 'x[1:3]', 'Schneidet einen Teil heraus (von 1 bis vor 3).'],
            ['split / join', '"a,b".split(",")\n", ".join(x)', 'Text in eine Liste teilen bzw. eine Liste zu Text verbinden.']
        ] },
        { g: 'Funktionen', items: [
            ['def', 'def doppelt(x):\n    return x * 2', 'Definiert eine Funktion.'],
            ['return', 'return x * 2', 'Gibt einen Wert zurück.'],
            ['Standardwert', 'def gruss(name="Tom"):', 'Parameter mit Vorgabe, falls nichts übergeben wird.']
        ] },
        { g: 'Module & Fehler', items: [
            ['import', 'import random\nx = random.randint(1, 3)', 'Lädt fertige Funktionen aus einem Modul.'],
            ['try / except', 'try:\n    x = int("abc")\nexcept ValueError:\n    x = 0', 'Fängt Fehler ab, statt dass das Programm abstürzt.']
        ] },
        { g: 'Konventionen', items: [
            ['snake_case', 'anzahl_leben = 3', 'Variablen und Funktionen: klein, Wörter mit Unterstrich.'],
            ['PascalCase', 'class SpielerKonto:', 'Klassennamen beginnen jedes Wort gross.']
        ] }
    ],
    lessons: [
        { t: 'Hallo Python', text: '<p>Ein Python-Programm braucht kein Grundgerüst – eine Zeile reicht. <code>print()</code> gibt etwas aus. Kommentare beginnen mit <code>#</code>.</p>',
            code: '# Mein erstes Programm\nprint("Hallo Welt!")\nprint(1 + 2)',
            quiz: [{ q: 'Womit beginnt ein Kommentar in Python?', a: ['//', '#', '--'], ok: 1, why: 'In Python leitet # einen Kommentar ein.' }] },
        { t: 'Variablen & Typen', text: '<p>Variablen entstehen einfach durch eine Zuweisung. Python erkennt den Typ selbst. Mit <code>type()</code> kannst du nachsehen.</p><p><code>7 / 2</code> ergibt in Python <strong>3.5</strong> – für ganzzahliges Teilen gibt es <code>//</code>.</p>',
            code: 'x = 7\ny = 2.5\nname = "Tom Mustermann"\n\nprint(type(x))    # <class \'int\'>\nprint(x / 2)      # 3.5\nprint(x // 2)     # 3\nprint(f"{name} rechnet: {x * y}")',
            quiz: [{ q: 'Was ergibt 7 // 2?', a: ['3.5', '3', '4'], ok: 1, why: '// teilt ganzzahlig und schneidet ab.' },
                { q: 'Wie schreibt man „wahr“ in Python?', a: ['true', 'True', 'TRUE'], ok: 1, why: 'True und False beginnen mit einem Grossbuchstaben.' }] },
        { t: 'Eingabe & Entscheidungen', text: '<p><code>input()</code> liefert immer Text. Für Zahlen umwandeln mit <code>int()</code>. Blöcke erkennt Python an der <strong>Einrückung</strong> und am Doppelpunkt.</p>',
            code: 'alter = int(input("Wie alt bist du? "))\n\nif alter >= 18:\n    print("Volljährig")\nelif alter >= 16:\n    print("Fast geschafft")\nelse:\n    print("Noch etwas warten")',
            quiz: [{ q: 'Wie heisst „sonst wenn“ in Python?', a: ['else if', 'elif', 'elseif'], ok: 1, why: 'Python kürzt es zu elif ab.' }] },
        { t: 'Schleifen & Listen', text: '<p>Mit <code>for</code> gehst du Listen oder Zahlenfolgen durch. <code>range(3)</code> liefert 0, 1, 2 – das Ende ist nie dabei.</p>',
            code: 'zahlen = [1, 2, 3]\nzahlen.append(4)\n\nsumme = 0\nfor x in zahlen:\n    summe += x\nprint(summe)        # 10\n\nfor i in range(3):\n    print("Runde", i)',
            quiz: [{ q: 'Welche Zahlen liefert range(3)?', a: ['1, 2, 3', '0, 1, 2', '0, 1, 2, 3'], ok: 1, why: 'range beginnt bei 0 und hört vor dem Ende auf.' },
                { q: 'Wie fügst du einer Liste etwas hinzu?', a: ['x.add(4)', 'x.append(4)', 'x.push(4)'], ok: 1, why: 'Listen haben die Methode append.' }] },
        { t: 'Funktionen', text: '<p>Mit <code>def</code> baust du eigene Funktionen. Mit <code>return</code> geben sie ein Ergebnis zurück. Parameter können Standardwerte haben.</p>',
            code: 'def gruss(name="Tom Mustermann"):\n    return f"Hallo, {name}!"\n\ndef doppelt(x):\n    return x * 2\n\nprint(gruss())\nprint(doppelt(3))   # 6',
            quiz: [{ q: 'Mit welchem Wort definierst du eine Funktion?', a: ['function', 'def', 'func'], ok: 1, why: 'def steht für „define“.' }] }
    ]
});
