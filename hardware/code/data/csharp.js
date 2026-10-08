/* Code-Bibliothek · C# */
XIRU_CODE.add({
    id: 'csharp', n: 'C#', icon: 'C#', color: '#a78bfa', comment: '//',
    tag: 'Die Sprache für Spiele (Unity), Windows-Programme und die Schule.',
    level: 'Einsteiger bis Profi', use: 'Unity-Spiele, Desktop, Web (ASP.NET)',
    intro: 'C# (sprich „C-Sharp“) ist streng typisiert: Jede Variable hat einen festen Datentyp. Das wirkt am Anfang streng, verhindert aber viele Fehler. Mit C# baust du Konsolenprogramme, Windows-Apps und Spiele in Unity.',
    kw: ['using', 'namespace', 'class', 'static', 'void', 'int', 'double', 'decimal', 'float', 'bool', 'char', 'string', 'var', 'const', 'if', 'else', 'switch', 'case', 'break', 'default', 'for', 'foreach', 'in', 'while', 'do', 'continue', 'return', 'new', 'public', 'private', 'protected', 'true', 'false', 'null', 'get', 'set', 'this', 'try', 'catch', 'finally', 'throw', 'List', 'Console'],
    sheet: [
        { g: 'Basics', items: [
            ['Variable', 'int x = 1;', 'Benannter Speicherplatz für einen Wert. Hat in C# immer einen Datentyp.', 'Eine Variable wird deklariert (Typ + Name) und meist gleich initialisiert (Startwert). Danach kann sich ihr Wert ändern, der Typ aber nicht.'],
            ['Datentyp', 'int, double, string, bool', 'Legt fest, welche Art von Wert eine Variable speichern kann (ganze Zahl, Kommazahl, Text, Wahrheitswert).'],
            ['Konstante', 'const double Pi = 3.14;', 'Wert, der sich nach der Zuweisung nie mehr ändern darf. Mit const markiert.'],
            ['Kommentar', '// eine Zeile\n/* mehrere\n   Zeilen */', 'Notiz im Code, die der Computer ignoriert. Erklärt, warum etwas passiert.'],
            ['Anweisung', 'x = x + 1;', 'Ein einzelner Befehl. Endet in C# immer mit einem Semikolon.'],
            ['Block', '{\n    x = 1;\n}', 'Geschweifte Klammern fassen mehrere Anweisungen zusammen, z. B. in if, Schleifen und Methoden.'],
            ['Main', 'static void Main(string[] args) { }', 'Startpunkt jedes Konsolenprogramms. Hier beginnt die Ausführung.'],
            ['using', 'using System;', 'Bindet einen Namensraum ein, damit man z. B. Console ohne vollen Namen schreiben kann.']
        ] },
        { g: 'Variablen & Datentypen', items: [
            ['int', 'int x = 3;', 'Ganze Zahl (ca. −2,1 bis +2,1 Milliarden).'],
            ['double', 'double y = 2.5;', 'Kommazahl mit doppelter Genauigkeit. Dezimaltrenner ist der Punkt.'],
            ['decimal', 'decimal y = 19.95m;', 'Sehr genaue Kommazahl für Geldbeträge. Endet mit m.'],
            ['bool', 'bool x = true;', 'Wahrheitswert: true oder false.'],
            ['char', "char x = 'A';", 'Ein einzelnes Zeichen in einfachen Anführungszeichen.'],
            ['string', 'string x = "Tom Mustermann";', 'Text (Zeichenkette) in doppelten Anführungszeichen.'],
            ['var', 'var x = 1;', 'Der Compiler erkennt den Typ selbst aus dem Startwert. Der Typ bleibt trotzdem fest.'],
            ['Konvertierung', 'int x = Convert.ToInt32("3");', 'Wandelt einen Wert in einen anderen Datentyp um, z. B. Text in Zahl.', 'Convert.ToInt32 und int.Parse werfen einen Fehler, wenn der Text keine Zahl ist. int.TryParse prüft vorher und gibt true/false zurück – sicherer bei Benutzereingaben.'],
            ['Casting', 'int x = (int)2.9;  // 2', 'Erzwingt eine Umwandlung. Bei Kommazahl → int wird abgeschnitten, nicht gerundet.']
        ] },
        { g: 'Ein- und Ausgabe (Konsole)', items: [
            ['Console.WriteLine', 'Console.WriteLine("Hallo");', 'Gibt Text aus und springt danach in eine neue Zeile.'],
            ['Console.Write', 'Console.Write("Name: ");', 'Gibt Text aus, bleibt aber in derselben Zeile.'],
            ['Console.ReadLine', 'string x = Console.ReadLine();', 'Liest eine ganze Zeile Eingabe als Text ein.'],
            ['String-Interpolation', 'Console.WriteLine($"x ist {x}");', 'Mit $ vor dem Text lassen sich Variablen direkt in {} einsetzen.']
        ] },
        { g: 'Operatoren', items: [
            ['Arithmetische Operatoren', 'x = 7 / 2;   // 3\ny = 7 % 2;   // 1', '+ − * / rechnen; % gibt den Rest. Teilen zweier int ergibt wieder int!'],
            ['Vergleichsoperatoren', 'x == 1  x != 2  x >= 3', 'Vergleichen zwei Werte und ergeben true oder false.'],
            ['Logische Operatoren', 'x > 1 && x < 3\nx == 1 || x == 2\n!x', '&& = und, || = oder, ! = nicht.'],
            ['Zuweisungsoperatoren', 'x += 2;  x++;', 'Kurzschreibweisen: x += 2 heisst x = x + 2; x++ erhöht um 1.']
        ] },
        { g: 'Alternation', items: [
            ['if / else', 'if (x > 1)\n{\n    y = 1;\n}\nelse\n{\n    y = 2;\n}', 'Führt Code nur aus, wenn die Bedingung wahr ist, sonst den else-Teil.'],
            ['else if', 'else if (x == 2) { }', 'Prüft eine weitere Bedingung, wenn die vorherige falsch war.'],
            ['switch', 'switch (x)\n{\n    case 1: y = 1; break;\n    default: y = 0; break;\n}', 'Wählt je nach Wert einen Fall aus. Jeder case endet mit break.'],
            ['Ternärer Operator', 'y = x > 1 ? 1 : 2;', 'Kurzform von if/else für einen Wert: Bedingung ? wenn wahr : wenn falsch.']
        ] },
        { g: 'Schleifen', items: [
            ['for', 'for (int i = 0; i < 3; i++)\n{\n    Console.WriteLine(i);\n}', 'Zählschleife: Start; Bedingung; Schritt. Ideal, wenn die Anzahl bekannt ist.'],
            ['while', 'while (x < 3)\n{\n    x++;\n}', 'Wiederholt, solange die Bedingung wahr ist. Prüft vor jedem Durchlauf.'],
            ['do while', 'do\n{\n    x++;\n} while (x < 3);', 'Läuft mindestens einmal, prüft erst danach.'],
            ['foreach', 'foreach (int x in zahlen) { }', 'Geht jedes Element einer Liste oder eines Arrays durch.'],
            ['break / continue', 'if (x == 2) break;', 'break beendet die Schleife sofort, continue springt zum nächsten Durchlauf.']
        ] },
        { g: 'Arrays & Listen', items: [
            ['Array', 'int[] x = { 1, 2, 3 };\nint y = x[0];  // 1', 'Feste Anzahl gleichartiger Werte. Der Index beginnt bei 0.'],
            ['List', 'List<int> x = new List<int>();\nx.Add(1);', 'Liste, die wachsen und schrumpfen kann. Braucht using System.Collections.Generic.'],
            ['Length / Count', 'x.Length   // Array\nx.Count    // List', 'Anzahl der Elemente.']
        ] },
        { g: 'Methoden', items: [
            ['Methode', 'static int Doppelt(int x)\n{\n    return x * 2;\n}', 'Benannter Codeblock, den man mehrmals aufrufen kann.'],
            ['Parameter', 'Doppelt(3);', 'Werte, die man einer Methode beim Aufruf mitgibt.'],
            ['return', 'return x * 2;', 'Gibt einen Wert zurück und beendet die Methode.'],
            ['void', 'static void Hallo() { }', 'Die Methode gibt nichts zurück.']
        ] },
        { g: 'Klassen & Objekte', items: [
            ['class', 'class Person\n{\n    public string Name;\n}', 'Bauplan für Objekte: beschreibt Eigenschaften und Methoden.'],
            ['Objekt (new)', 'Person x = new Person();', 'Ein konkretes Exemplar einer Klasse, erzeugt mit new.'],
            ['Eigenschaft', 'public string Name { get; set; }', 'Property: kontrollierter Zugriff auf einen Wert eines Objekts.'],
            ['Konstruktor', 'public Person(string name)\n{\n    Name = name;\n}', 'Spezielle Methode, die beim Erzeugen mit new läuft. Heisst wie die Klasse.'],
            ['public / private', 'private int x;', 'Zugriffsmodifizierer: public ist von aussen sichtbar, private nur innerhalb der Klasse.']
        ] },
        { g: 'Konventionen', items: [
            ['PascalCase', 'class SpielerKonto { }', 'Jedes Wort beginnt gross. Für Klassen, Methoden und Properties.'],
            ['camelCase', 'int anzahlLeben = 3;', 'Erstes Wort klein, weitere gross. Für lokale Variablen und Parameter.'],
            ['Sprechende Namen', 'int anzahlVersuche;', 'Namen sagen, was drin ist. Besser als a, b, temp.']
        ] }
    ],
    lessons: [
        { t: 'Hallo Welt & Aufbau', text: '<p>Jedes C#-Konsolenprogramm hat eine <strong>Main</strong>-Methode – dort beginnt alles. <code>Console.WriteLine</code> schreibt eine Zeile in die Konsole.</p><p>Anweisungen enden mit <code>;</code>, zusammengehörende Befehle stehen in <code>{ }</code>.</p>',
            code: 'using System;\n\nclass Programm\n{\n    static void Main(string[] args)\n    {\n        // Das ist ein Kommentar\n        Console.WriteLine("Hallo Welt!");\n    }\n}',
            quiz: [{ q: 'Womit endet in C# eine Anweisung?', a: ['Mit einem Punkt', 'Mit einem Semikolon ;', 'Mit einem Zeilenumbruch'], ok: 1, why: 'Das Semikolon trennt Anweisungen voneinander.' },
                { q: 'Wo startet ein Konsolenprogramm?', a: ['In der Methode Main', 'In der ersten Zeile der Datei', 'Bei using System'], ok: 0, why: 'Main ist der Einstiegspunkt.' }] },
        { t: 'Variablen & Datentypen', text: '<p>Eine Variable braucht in C# immer einen <strong>Datentyp</strong>. Für ganze Zahlen <code>int</code>, für Kommazahlen <code>double</code>, für Text <code>string</code>, für ja/nein <code>bool</code>.</p><p>Achtung: <code>7 / 2</code> ergibt bei zwei int-Werten <strong>3</strong>, nicht 3.5!</p>',
            code: 'int x = 7;\ndouble y = 2.5;\nstring name = "Tom Mustermann";\nbool aktiv = true;\n\nConsole.WriteLine(x / 2);      // 3\nConsole.WriteLine(x / 2.0);    // 3.5\nConsole.WriteLine($"{name} ist aktiv: {aktiv}");',
            quiz: [{ q: 'Welcher Datentyp passt für den Wert 19.95?', a: ['int', 'double', 'bool'], ok: 1, why: 'Kommazahlen brauchen double (oder decimal bei Geld).' },
                { q: 'Was gibt 7 / 2 aus, wenn beide Werte int sind?', a: ['3.5', '3', '4'], ok: 1, why: 'Ganzzahl-Division schneidet die Nachkommastellen ab.' }] },
        { t: 'Eingabe & Verzweigungen', text: '<p><code>Console.ReadLine()</code> liest Text ein. Für Zahlen musst du ihn umwandeln, z. B. mit <code>Convert.ToInt32</code> oder sicher mit <code>int.TryParse</code>.</p><p>Mit <code>if</code>, <code>else if</code> und <code>else</code> entscheidet dein Programm, was passiert.</p>',
            code: 'Console.Write("Wie alt bist du? ");\nint x = Convert.ToInt32(Console.ReadLine());\n\nif (x >= 18)\n{\n    Console.WriteLine("Volljährig");\n}\nelse if (x >= 16)\n{\n    Console.WriteLine("Fast geschafft");\n}\nelse\n{\n    Console.WriteLine("Noch etwas warten");\n}',
            quiz: [{ q: 'Was liefert Console.ReadLine() immer zurück?', a: ['Eine Zahl (int)', 'Einen Text (string)', 'true oder false'], ok: 1, why: 'Eingaben kommen als Text an und müssen bei Bedarf umgewandelt werden.' },
                { q: 'Welcher Operator bedeutet „und“?', a: ['&&', '||', '!='], ok: 0, why: '&& ist nur wahr, wenn beide Seiten wahr sind.' }] },
        { t: 'Schleifen', text: '<p>Schleifen wiederholen Code. <code>for</code> nimmst du, wenn du weisst, wie oft. <code>while</code>, wenn es von einer Bedingung abhängt. <code>foreach</code> geht alle Elemente einer Liste durch.</p>',
            code: 'for (int i = 1; i <= 3; i++)\n{\n    Console.WriteLine($"Runde {i}");\n}\n\nint[] zahlen = { 1, 2, 3 };\nint summe = 0;\nforeach (int x in zahlen)\n{\n    summe += x;\n}\nConsole.WriteLine(summe);   // 6',
            quiz: [{ q: 'Wie oft läuft for (int i = 0; i < 3; i++)?', a: ['2-mal', '3-mal', '4-mal'], ok: 1, why: 'i nimmt die Werte 0, 1 und 2 an.' },
                { q: 'Welche Schleife läuft mindestens einmal?', a: ['while', 'do while', 'for'], ok: 1, why: 'do while prüft die Bedingung erst am Ende.' }] },
        { t: 'Methoden & Klassen', text: '<p>Mit <strong>Methoden</strong> verpackst du Code, den du mehrmals brauchst. <strong>Klassen</strong> sind Baupläne für Objekte – zum Beispiel eine <code>Person</code> mit Name und einer Methode zum Begrüssen.</p>',
            code: 'class Person\n{\n    public string Name { get; set; }\n\n    public Person(string name)\n    {\n        Name = name;\n    }\n\n    public string Gruss()\n    {\n        return $"Hallo, ich bin {Name}!";\n    }\n}\n\n// Verwendung:\nPerson x = new Person("Tom Mustermann");\nConsole.WriteLine(x.Gruss());',
            quiz: [{ q: 'Was bedeutet void bei einer Methode?', a: ['Sie ist privat', 'Sie gibt nichts zurück', 'Sie ist leer'], ok: 1, why: 'void heisst: kein Rückgabewert.' },
                { q: 'Womit erzeugst du ein Objekt einer Klasse?', a: ['new', 'class', 'return'], ok: 0, why: 'new ruft den Konstruktor auf und erzeugt das Objekt.' }] }
    ]
});
