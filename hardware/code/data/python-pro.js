/* Code-Bibliothek · Python Fortgeschritten */
XIRU_CODE.add({
    id: 'python-pro', n: 'Python · Fortgeschritten', icon: 'Py+', color: '#4b8bbe', comment: '#',
    tag: 'Für alle, die die Grundlagen können: sauberer, mächtiger Python-Code.',
    level: 'Fortgeschritten', use: 'OOP, Dekoratoren, Generatoren, Pakete, Tests',
    intro: 'Du kennst Variablen, Schleifen und Funktionen? Dann geht es hier weiter: wie du Python-Code <strong>kompakt, wiederverwendbar und robust</strong> schreibst – von Comprehensions über Objektorientierung und Dekoratoren bis zu Paketen, virtuellen Umgebungen und Tests. Voraussetzung ist der <a href="python.html">Einsteiger-Kurs</a>.',
    kw: ['def', 'return', 'yield', 'if', 'elif', 'else', 'for', 'in', 'while', 'import', 'from', 'as', 'True', 'False', 'None', 'and', 'or', 'not', 'try', 'except', 'finally', 'raise', 'class', 'with', 'lambda', 'self', 'super', 'pass', 'async', 'await', 'global', 'nonlocal', 'assert', 'del'],
    sheet: [
        { g: 'Comprehensions', items: [
            ['Liste', 'quadrate = [x*x for x in range(5)]', 'Baut eine Liste direkt aus einer Schleife.'],
            ['mit Bedingung', 'gerade = [x for x in zahlen if x % 2 == 0]', 'Nur Elemente, die die Bedingung erfüllen.'],
            ['Dict', '{w: len(w) for w in woerter}', 'Erzeugt ein Wörterbuch Schlüssel → Wert.'],
            ['Set', '{x % 3 for x in range(10)}', 'Comprehension mit { } ohne Doppelpunkt ergibt ein Set (ohne Duplikate).'],
            ['Generator', '(x*x for x in range(1000000))', 'Mit runden Klammern: faul, berechnet Werte erst beim Durchlaufen – spart Speicher.']
        ] },
        { g: 'Funktionen', items: [
            ['*args', 'def f(*args):', 'Sammelt beliebig viele Positions-Argumente als Tuple.'],
            ['**kwargs', 'def f(**kwargs):', 'Sammelt benannte Argumente als Dict.'],
            ['Keyword-only', 'def f(a, *, b):', 'Alles nach * muss benannt übergeben werden: f(1, b=2).'],
            ['Entpacken', 'f(*liste)   f(**dict)', 'Übergibt eine Liste/ein Dict als einzelne Argumente.'],
            ['lambda', 'sortiert = sorted(p, key=lambda x: x.alter)', 'Kurze, namenlose Funktion – oft als key= oder in map/filter.']
        ] },
        { g: 'Objektorientierung', items: [
            ['class', 'class Konto:', 'Bauplan für Objekte.'],
            ['__init__', 'def __init__(self, name):\n    self.name = name', 'Konstruktor: läuft beim Erzeugen, legt Attribute an.'],
            ['self', 'self.saldo', 'Verweist auf das eigene Objekt. Erster Parameter jeder Methode.'],
            ['Vererbung', 'class Sparkonto(Konto):', 'Erbt alles von der Oberklasse.'],
            ['super()', 'super().__init__(name)', 'Ruft die Methode der Oberklasse auf.'],
            ['@property', '@property\ndef voll(self): ...', 'Macht eine Methode wie ein Attribut lesbar (ohne Klammern).'],
            ['__str__', 'def __str__(self): return ...', 'Wie das Objekt bei print() aussieht. __repr__ ist die Entwickler-Ansicht.']
        ] },
        { g: 'Typen & Dataclasses', items: [
            ['Typ-Hinweis', 'def add(a: int, b: int) -> int:', 'Dokumentiert erwartete Typen. Python prüft sie nicht, Werkzeuge wie mypy schon.'],
            ['Variable', 'name: str = "Tom"', 'Auch Variablen können Typ-Hinweise tragen.'],
            ['Optional', 'x: int | None = None', 'Darf int oder None sein (ab Python 3.10). Davor: Optional[int].'],
            ['@dataclass', '@dataclass\nclass Punkt:\n    x: int\n    y: int = 0', 'Erzeugt __init__, __repr__ und __eq__ automatisch. import aus dataclasses.']
        ] },
        { g: 'Dekoratoren', items: [
            ['Anwenden', '@timer\ndef lade(): ...', 'Legt zusätzliches Verhalten um eine Funktion (Logging, Zeitmessung, Cache …).'],
            ['Definieren', 'def deko(fn):\n    def innen(*a, **k):\n        return fn(*a, **k)\n    return innen', 'Ein Dekorator ist eine Funktion, die eine Funktion nimmt und eine neue zurückgibt.'],
            ['@lru_cache', '@lru_cache\ndef fib(n): ...', 'Merkt sich Ergebnisse (aus functools) – macht rekursive Funktionen schnell.']
        ] },
        { g: 'Generatoren', items: [
            ['yield', 'def zaehle():\n    n = 0\n    while True:\n        yield n\n        n += 1', 'Gibt Werte einzeln zurück und merkt sich den Stand – endlos möglich.'],
            ['next', 'g = zaehle()\nnext(g)', 'Holt den nächsten Wert aus einem Generator.'],
            ['Vorteil', 'for z in zaehle():\n    if z > 5: break', 'Werte entstehen erst beim Durchlaufen – spart Speicher bei grossen/unendlichen Folgen.']
        ] },
        { g: 'Fehler & Kontext', items: [
            ['raise', 'raise ValueError("zu klein")', 'Löst selbst einen Fehler aus.'],
            ['eigene Exception', 'class KontoLeer(Exception): pass', 'Eigene Fehlerklasse von Exception ableiten.'],
            ['else / finally', 'try: ...\nexcept X: ...\nelse: ...\nfinally: ...', 'else läuft ohne Fehler, finally immer (auch bei Fehler).'],
            ['with', 'with open("a.txt") as f:\n    text = f.read()', 'Kontextmanager: schliesst die Datei automatisch, auch bei Fehler.']
        ] },
        { g: 'Module & Umgebung', items: [
            ['Modul', '# datei: werkzeuge.py\ndef gruss(): ...', 'Jede .py-Datei ist ein Modul, das man importieren kann.'],
            ['import', 'from werkzeuge import gruss', 'Holt einzelne Namen aus einem Modul.'],
            ['__main__', 'if __name__ == "__main__":', 'Läuft nur, wenn die Datei direkt gestartet wird – nicht beim Import.'],
            ['venv', 'python -m venv .venv', 'Erstellt eine virtuelle Umgebung: eigene Pakete pro Projekt.'],
            ['pip', 'pip install requests', 'Installiert Pakete aus dem Internet (PyPI). Liste: requirements.txt.']
        ] },
        { g: 'Standardbibliothek', items: [
            ['Counter', 'from collections import Counter\nCounter("banane")', 'Zählt Häufigkeiten blitzschnell.'],
            ['defaultdict', 'defaultdict(list)', 'Dict, das fehlende Schlüssel automatisch anlegt.'],
            ['itertools', 'from itertools import combinations', 'Fertige Bausteine für Kombinationen, Gruppierungen, endlose Folgen.'],
            ['pathlib', 'from pathlib import Path\nPath("a/b.txt").read_text()', 'Moderne, saubere Arbeit mit Dateipfaden.']
        ] },
        { g: 'Testen', items: [
            ['assert', 'assert doppelt(3) == 6', 'Prüft eine Annahme – schlägt fehl, wenn sie falsch ist.'],
            ['unittest', 'class T(unittest.TestCase):\n    def test_x(self): ...', 'Eingebautes Test-Gerüst. Beliebt ist auch pytest.']
        ] }
    ],
    lessons: [
        { t: 'Comprehensions', text: '<p>Statt eine leere Liste zu bauen und in einer Schleife zu füllen, schreibst du in Python oft eine <strong>Comprehension</strong> – kürzer und schneller.</p><p>Es gibt sie für Listen <code>[…]</code>, Dicts <code>{k: v …}</code> und Sets <code>{…}</code>. Mit runden Klammern wird daraus ein <strong>Generator</strong>: Die Werte entstehen erst beim Durchlaufen und sparen Speicher.</p>',
            code: '# statt: quadrate = []\n#        for x in range(5): quadrate.append(x*x)\nquadrate = [x*x for x in range(5)]          # [0, 1, 4, 9, 16]\n\ngerade = [x for x in range(10) if x % 2 == 0]   # [0, 2, 4, 6, 8]\nlaengen = {w: len(w) for w in ["ab", "code"]}   # {"ab": 2, "code": 4}\n\n# Generator: berechnet nichts im Voraus\ngross = (x*x for x in range(1_000_000))\nprint(next(gross))   # 0',
            quiz: [{ q: 'Was ergibt [x*2 for x in range(3)]?', a: ['[0, 2, 4]', '[2, 4, 6]', '[0, 1, 2]'], ok: 0, why: 'range(3) ist 0,1,2 – mal 2 ergibt 0,2,4.' },
                { q: 'Welche Klammern erzeugen einen speichersparenden Generator?', a: ['[ ]', '{ }', '( )'], ok: 2, why: 'Runde Klammern machen aus einer Comprehension einen faulen Generator.' }] },
        { t: 'Funktionen vertieft', text: '<p>Mit <code>*args</code> nimmt eine Funktion beliebig viele Argumente als Tuple, mit <code>**kwargs</code> benannte als Dict. Mit einem einzelnen <code>*</code> erzwingst du, dass Argumente <strong>benannt</strong> übergeben werden.</p><p><strong>Vorsicht-Falle:</strong> Ein veränderbarer Standardwert (z. B. <code>[]</code>) wird nur <em>einmal</em> angelegt und zwischen Aufrufen geteilt. Nimm stattdessen <code>None</code>.</p>',
            code: 'def summe(*args):\n    return sum(args)\nprint(summe(1, 2, 3))        # 6\n\ndef info(**kwargs):\n    for k, v in kwargs.items():\n        print(k, "=", v)\ninfo(name="Tom", level=3)\n\n# Falle vermeiden:\ndef anhaengen(x, liste=None):\n    if liste is None:\n        liste = []\n    liste.append(x)\n    return liste',
            quiz: [{ q: 'Was sammelt **kwargs?', a: ['Positions-Argumente als Liste', 'benannte Argumente als Dict', 'nur Zahlen'], ok: 1, why: '**kwargs bündelt benannte Argumente in einem Dict.' },
                { q: 'Welcher Standardwert ist eine typische Falle?', a: ['None', '0', '[]'], ok: 2, why: 'Veränderbare Defaults wie [] werden geteilt – lieber None nutzen.' }] },
        { t: 'Objektorientierung', text: '<p>Eine <strong>Klasse</strong> ist ein Bauplan. <code>__init__</code> ist der Konstruktor, <code>self</code> verweist auf das Objekt selbst. Klassen können von anderen <strong>erben</strong> und mit <code>super()</code> deren Methoden nutzen.</p><p>Spezielle „Dunder“-Methoden wie <code>__str__</code> steuern das Verhalten – etwa, wie das Objekt bei <code>print()</code> aussieht.</p>',
            code: 'class Konto:\n    def __init__(self, name, saldo=0):\n        self.name = name\n        self.saldo = saldo\n    def einzahlen(self, betrag):\n        self.saldo += betrag\n    def __str__(self):\n        return f"{self.name}: {self.saldo} CHF"\n\nclass Sparkonto(Konto):\n    def __init__(self, name, zins):\n        super().__init__(name)\n        self.zins = zins\n\nk = Sparkonto("Tom", 0.01)\nk.einzahlen(100)\nprint(k)          # Tom: 100 CHF',
            quiz: [{ q: 'Wofür steht self?', a: ['für die Klasse selbst', 'für das einzelne Objekt', 'für ein Modul'], ok: 1, why: 'self ist das konkrete Objekt, auf dem die Methode läuft.' },
                { q: 'Wie rufst du den Konstruktor der Oberklasse auf?', a: ['parent()', 'super().__init__()', 'base.init()'], ok: 1, why: 'super().__init__() ruft die Oberklasse auf.' }] },
        { t: 'Typ-Hinweise & Dataclasses', text: '<p><strong>Typ-Hinweise</strong> dokumentieren, welche Typen erwartet werden. Python erzwingt sie nicht, aber Editoren und Werkzeuge wie <em>mypy</em> finden damit Fehler früh.</p><p>Eine <code>@dataclass</code> nimmt dir viel Tipparbeit ab: <code>__init__</code>, <code>__repr__</code> und Vergleich entstehen automatisch aus den Feldern.</p>',
            code: 'from dataclasses import dataclass\n\ndef addiere(a: int, b: int) -> int:\n    return a + b\n\nname: str = "Tom"\nalter: int | None = None     # darf int oder None sein\n\n@dataclass\nclass Punkt:\n    x: int\n    y: int = 0\n\np = Punkt(3, 4)\nprint(p)             # Punkt(x=3, y=4)\nprint(p == Punkt(3, 4))   # True',
            quiz: [{ q: 'Prüft Python Typ-Hinweise zur Laufzeit?', a: ['Ja, immer', 'Nein – nur Werkzeuge wie mypy', 'Nur bei Funktionen'], ok: 1, why: 'Typ-Hinweise sind Doku; Python ignoriert sie, externe Prüfer nutzen sie.' },
                { q: 'Was erzeugt @dataclass automatisch?', a: ['nur __init__', '__init__, __repr__ und __eq__', 'gar nichts'], ok: 1, why: 'Eine Dataclass baut Konstruktor, Textausgabe und Vergleich selbst.' }] },
        { t: 'Dekoratoren', text: '<p>Ein <strong>Dekorator</strong> legt zusätzliches Verhalten <em>um</em> eine Funktion – ohne sie zu ändern. Geschrieben als <code>@name</code> über der Funktion. Typische Einsätze: Zeitmessung, Logging, Zugriffsschutz, Zwischenspeichern.</p><p>Technisch ist ein Dekorator eine Funktion, die eine Funktion bekommt und eine neue zurückgibt.</p>',
            code: 'import time\n\ndef timer(fn):\n    def innen(*args, **kwargs):\n        start = time.perf_counter()\n        ergebnis = fn(*args, **kwargs)\n        print(fn.__name__, "brauchte", time.perf_counter() - start, "s")\n        return ergebnis\n    return innen\n\n@timer\ndef lade_daten(n):\n    return sum(range(n))\n\nlade_daten(1_000_000)\n\n# Fertiger Dekorator: merkt sich Ergebnisse\nfrom functools import lru_cache\n@lru_cache\ndef fib(n):\n    return n if n < 2 else fib(n-1) + fib(n-2)',
            quiz: [{ q: 'Was ist ein Dekorator im Kern?', a: ['eine Klasse', 'eine Funktion, die eine Funktion nimmt und eine neue zurückgibt', 'ein Modul'], ok: 1, why: 'Er umhüllt eine Funktion und gibt eine erweiterte zurück.' }] },
        { t: 'Generatoren & yield', text: '<p>Eine Funktion mit <code>yield</code> ist ein <strong>Generator</strong>: Sie gibt Werte einzeln zurück und merkt sich jedes Mal, wo sie stehen geblieben ist. So lassen sich auch <em>unendliche</em> oder sehr grosse Folgen verarbeiten, ohne sie komplett im Speicher zu halten.</p>',
            code: 'def fibonacci():\n    a, b = 0, 1\n    while True:          # endlos – kein Problem\n        yield a\n        a, b = b, a + b\n\ng = fibonacci()\nprint(next(g), next(g), next(g))   # 0 1 1\n\n# bequem mit for und break\nfor zahl in fibonacci():\n    if zahl > 20:\n        break\n    print(zahl, end=" ")           # 0 1 1 2 3 5 8 13',
            quiz: [{ q: 'Was macht yield?', a: ['bricht die Funktion ab', 'gibt einen Wert zurück und merkt sich den Stand', 'wie return, aber schneller'], ok: 1, why: 'yield liefert einen Wert und pausiert die Funktion bis zum nächsten Abruf.' },
                { q: 'Warum sind Generatoren speichersparend?', a: ['sie berechnen alles im Voraus', 'sie erzeugen Werte erst beim Durchlaufen', 'sie nutzen die Festplatte'], ok: 1, why: 'Werte entstehen Stück für Stück, nicht alle auf einmal.' }] },
        { t: 'Fehler & Kontextmanager', text: '<p>Mit <code>raise</code> löst du selbst Fehler aus, und mit eigenen Exception-Klassen machst du sie aussagekräftig. <code>try</code> kennt neben <code>except</code> auch <code>else</code> (läuft ohne Fehler) und <code>finally</code> (läuft immer).</p><p>Ein <strong>Kontextmanager</strong> mit <code>with</code> räumt zuverlässig auf – z. B. schliesst er Dateien selbst, auch wenn ein Fehler auftritt.</p>',
            code: 'class KontoLeer(Exception):\n    pass\n\ndef abheben(saldo, betrag):\n    if betrag > saldo:\n        raise KontoLeer("nicht genug Geld")\n    return saldo - betrag\n\ntry:\n    rest = abheben(50, 80)\nexcept KontoLeer as e:\n    print("Abgelehnt:", e)\nelse:\n    print("Neuer Saldo:", rest)\nfinally:\n    print("Vorgang beendet")\n\nwith open("notiz.txt", "w") as f:\n    f.write("Hallo")        # Datei wird automatisch geschlossen',
            quiz: [{ q: 'Wann läuft der finally-Block?', a: ['nur bei einem Fehler', 'nur ohne Fehler', 'immer'], ok: 2, why: 'finally läuft in jedem Fall – ideal zum Aufräumen.' },
                { q: 'Was erledigt with open(...) für dich?', a: ['öffnet die Datei schneller', 'schliesst die Datei automatisch', 'verschlüsselt die Datei'], ok: 1, why: 'Der Kontextmanager schliesst die Datei zuverlässig, auch bei Fehler.' }] },
        { t: 'Module, Pakete & venv', text: '<p>Jede <code>.py</code>-Datei ist ein <strong>Modul</strong>. Mehrere Module in einem Ordner bilden ein <strong>Paket</strong>. Mit dem Schutz <code>if __name__ == "__main__":</code> trennst du „direkt gestartet“ von „importiert“.</p><p>Für jedes Projekt eine eigene <strong>virtuelle Umgebung</strong> (venv) anlegen – so beissen sich Paketversionen nicht. Pakete kommen mit <code>pip</code> von PyPI.</p>',
            code: '# werkzeuge.py\ndef gruss(name):\n    return f"Hallo, {name}!"\n\nif __name__ == "__main__":\n    print(gruss("Welt"))   # nur beim direkten Start\n\n# in einer anderen Datei:\nfrom werkzeuge import gruss\nprint(gruss("Tom"))\n\n# Terminal (nicht im Code):\n#   python -m venv .venv\n#   .venv\\Scripts\\activate        (Windows)\n#   pip install requests\n#   pip freeze > requirements.txt',
            quiz: [{ q: 'Wann läuft Code unter if __name__ == "__main__":?', a: ['immer', 'nur beim direkten Start der Datei', 'nur beim Import'], ok: 1, why: 'Beim Import ist __name__ der Modulname, nicht "__main__".' },
                { q: 'Wozu dient eine virtuelle Umgebung (venv)?', a: ['Python schneller machen', 'eigene Paketversionen pro Projekt', 'Dateien verschlüsseln'], ok: 1, why: 'Jedes Projekt bekommt seine eigenen Pakete, ohne Konflikte.' }] },
        { t: 'Starke Standardbibliothek & Tests', text: '<p>Vieles musst du nicht selbst bauen: <code>collections</code> bringt <code>Counter</code> und <code>defaultdict</code>, <code>itertools</code> fertige Kombinations-Bausteine, <code>pathlib</code> saubere Dateipfade.</p><p>Und teste deinen Code: ein schnelles <code>assert</code> prüft Annahmen, für mehr gibt es <code>unittest</code> (eingebaut) oder <em>pytest</em>.</p>',
            code: 'from collections import Counter\nfrom pathlib import Path\n\nhaeufig = Counter("banane")\nprint(haeufig.most_common(1))   # [("a", 3)]\n\npfad = Path("daten") / "notiz.txt"\n# pfad.write_text("Hallo");  text = pfad.read_text()\n\ndef doppelt(x):\n    return x * 2\n\nassert doppelt(3) == 6          # ok – keine Ausgabe\nassert doppelt("ab") == "abab"  # funktioniert auch für Text\nprint("Alle Tests bestanden")',
            quiz: [{ q: 'Was macht Counter("banane").most_common(1)?', a: ['zählt die Buchstaben und gibt den häufigsten', 'sortiert das Wort', 'entfernt Duplikate'], ok: 0, why: 'Counter zählt Häufigkeiten; most_common(1) gibt den häufigsten Eintrag.' },
                { q: 'Was passiert bei assert 1 == 2?', a: ['nichts', 'ein AssertionError', 'es gibt True aus'], ok: 1, why: 'Ein falsches assert löst einen AssertionError aus.' }] }
    ]
});
