/* Code-Bibliothek · C# Fortgeschritten */
XIRU_CODE.add({
    id: 'csharp-pro', n: 'C# · Fortgeschritten', icon: 'C#+', color: '#8a5cd1', comment: '//',
    tag: 'Aufbaukurs für C#: LINQ, Generics, async/await und moderne Sprachfeatures.',
    level: 'Fortgeschritten', use: 'Grössere Programme, Spiele (Unity), Web-Backends',
    intro: 'Du beherrschst Variablen, Schleifen und Methoden in C#? Hier lernst du, grössere Programme sauber zu strukturieren: <strong>Sammlungen und LINQ</strong>, generische Typen, Interfaces, Records, Delegates und Events, <code>async/await</code> sowie moderne Features wie Pattern Matching. Voraussetzung ist der <a href="csharp.html">Einsteiger-Kurs</a>.',
    kw: ['using', 'namespace', 'class', 'record', 'struct', 'interface', 'enum', 'public', 'private', 'protected', 'internal', 'static', 'readonly', 'const', 'abstract', 'virtual', 'override', 'sealed', 'new', 'void', 'int', 'string', 'bool', 'double', 'var', 'return', 'if', 'else', 'switch', 'case', 'for', 'foreach', 'in', 'while', 'try', 'catch', 'finally', 'throw', 'async', 'await', 'Task', 'null', 'true', 'false', 'this', 'base', 'get', 'set', 'init', 'yield', 'where', 'select', 'from', 'orderby', 'is', 'as', 'default'],
    sheet: [
        { g: 'Sammlungen', items: [
            ['List<T>', 'var xs = new List<int> { 1, 2, 3 };\nxs.Add(4);', 'Veränderbare Liste eines Typs. Add, Remove, Count, [i].'],
            ['Dictionary', 'var d = new Dictionary<string, int>();\nd["tom"] = 3;', 'Schlüssel → Wert. TryGetValue prüft sicher.'],
            ['Array', 'int[] a = { 1, 2, 3 };', 'Feste Länge. a.Length.'],
            ['foreach', 'foreach (var x in xs) { }', 'Geht jedes Element durch.']
        ] },
        { g: 'LINQ', items: [
            ['Where', 'xs.Where(x => x > 2)', 'Filtert Elemente nach einer Bedingung.'],
            ['Select', 'xs.Select(x => x * 2)', 'Formt jedes Element um (map).'],
            ['OrderBy', 'leute.OrderBy(p => p.Alter)', 'Sortiert nach einem Schlüssel.'],
            ['First / Any', 'xs.FirstOrDefault(x => x > 5)\nxs.Any(x => x < 0)', 'Erstes Treffer-Element bzw. „gibt es überhaupt eines?“.'],
            ['Sum / Count', 'xs.Sum()   xs.Count(x => x > 0)', 'Rechnet oder zählt über die Folge.'],
            ['ToList', 'var r = abfrage.ToList();', 'Führt die (faule) LINQ-Abfrage aus und macht eine Liste.']
        ] },
        { g: 'Generics', items: [
            ['generische Klasse', 'class Box<T> { public T Wert; }', 'Ein Bauplan, der mit jedem Typ funktioniert.'],
            ['generische Methode', 'T Erstes<T>(List<T> xs) => xs[0];', 'Methode, die für beliebige Typen arbeitet.'],
            ['Einschränkung', 'where T : IComparable', 'Verlangt, dass T bestimmte Fähigkeiten hat.']
        ] },
        { g: 'Typen & OOP', items: [
            ['interface', 'interface IFahren { void Fahren(); }', 'Vertrag: Klassen, die ihn umsetzen, haben diese Methoden.'],
            ['abstract / virtual', 'abstract class Tier\nvirtual void Laut()', 'abstract = nicht direkt nutzbar; virtual = Methode überschreibbar.'],
            ['override', 'override void Laut() { }', 'Überschreibt eine virtuelle/abstrakte Methode.'],
            ['Property', 'public int Alter { get; set; }', 'Feld mit kontrolliertem Zugriff. { get; init; } = nur beim Erstellen setzbar.'],
            ['record', 'record Punkt(int X, int Y);', 'Unveränderbarer Werttyp mit automatischem Vergleich und ToString.']
        ] },
        { g: 'Delegates & Events', items: [
            ['Func / Action', 'Func<int,int> f = x => x*2;\nAction<string> log = Console.WriteLine;', 'Func gibt etwas zurück, Action nicht. Lambdas als Werte.'],
            ['event', 'public event Action? Gewonnen;', 'Mehrere Methoden können sich anmelden (+=) und werden benachrichtigt.'],
            ['auslösen', 'Gewonnen?.Invoke();', 'Ruft alle angemeldeten Zuhörer auf (nur wenn es welche gibt).']
        ] },
        { g: 'Fehler & Ressourcen', items: [
            ['try / catch', 'try { } catch (Exception e) { }\nfinally { }', 'Fängt Fehler ab; finally läuft immer.'],
            ['throw', 'throw new ArgumentException("x");', 'Löst selbst einen Fehler aus.'],
            ['using', 'using var f = File.OpenText("a.txt");', 'Gibt Ressourcen (Dateien, Verbindungen) automatisch frei.']
        ] },
        { g: 'async/await', items: [
            ['async Task', 'async Task LadenAsync() { }', 'Methode, die ohne Blockieren wartet. Rückgabe Task bzw. Task<T>.'],
            ['await', 'var s = await client.GetStringAsync(url);', 'Wartet auf das Ergebnis, lässt das Programm währenddessen weiterlaufen.']
        ] },
        { g: 'Moderne Features', items: [
            ['nullable', 'string? name = null;', 'Das ? erlaubt null und warnt vor vergessenen Prüfungen.'],
            ['pattern matching', 'if (obj is int n) { }', 'Prüft Typ und entpackt den Wert in einem Schritt.'],
            ['switch-Ausdruck', 'var t = note switch {\n  6 => "top", _ => "ok" };', 'Kompakte Variante von switch, die einen Wert zurückgibt.'],
            ['Objektinitialisierer', 'new Person { Name = "Tom", Alter = 3 }', 'Setzt Properties direkt beim Erstellen.']
        ] }
    ],
    lessons: [
        { t: 'Sammlungen', text: '<p>Statt Arrays mit fester Länge nimmst du meist <code>List&lt;T&gt;</code> (wächst mit) oder <code>Dictionary&lt;K,V&gt;</code> (Schlüssel → Wert). Das <code>&lt;T&gt;</code> legt den Elementtyp fest.</p>',
            code: 'using System.Collections.Generic;\n\nvar namen = new List<string> { "Tom", "Mia" };\nnamen.Add("Jo");\nSystem.Console.WriteLine(namen.Count);   // 3\n\nvar punkte = new Dictionary<string, int>();\npunkte["Tom"] = 10;\nif (punkte.TryGetValue("Tom", out int p))\n    System.Console.WriteLine(p);          // 10',
            quiz: [{ q: 'Welche Sammlung ordnet Schlüssel einem Wert zu?', a: ['List<T>', 'Dictionary<K,V>', 'Array'], ok: 1, why: 'Dictionary speichert Paare aus Schlüssel und Wert.' },
                { q: 'Wie fügst du einer List etwas hinzu?', a: ['.Push(x)', '.Add(x)', '.Append(x)'], ok: 1, why: 'List<T> nutzt Add.' }] },
        { t: 'LINQ – Abfragen über Daten', text: '<p>Mit <strong>LINQ</strong> filterst, formst und sortierst du Sammlungen in einer Kette. Die Methoden nehmen Lambdas (<code>x =&gt; …</code>). Die Abfrage ist <em>faul</em> – sie läuft erst bei <code>ToList()</code> oder beim Durchlaufen.</p>',
            code: 'using System.Linq;\n\nint[] zahlen = { 5, 2, 8, 1, 9, 3 };\n\nvar grosse = zahlen.Where(x => x > 3)\n                   .OrderBy(x => x)\n                   .ToList();           // 5, 8, 9\n\nint summe = zahlen.Sum();                // 28\nbool hatNeun = zahlen.Any(x => x == 9);  // true\nint ersteGerade = zahlen.First(x => x % 2 == 0);  // 2',
            quiz: [{ q: 'Welche LINQ-Methode filtert Elemente?', a: ['Select', 'Where', 'OrderBy'], ok: 1, why: 'Where behält nur Elemente, die die Bedingung erfüllen. Select formt um.' },
                { q: 'Wann läuft eine LINQ-Abfrage wirklich?', a: ['sofort', 'erst bei ToList() oder beim Durchlaufen', 'nie'], ok: 1, why: 'LINQ ist faul und wird erst bei Bedarf ausgeführt.' }] },
        { t: 'Generics', text: '<p><strong>Generics</strong> machen Code typunabhängig: <code>Box&lt;T&gt;</code> funktioniert mit jedem Typ, ohne dass du object nutzt (und dir die Typsicherheit verlierst). Mit <code>where</code> schränkst du ein, was T können muss.</p>',
            code: 'class Box<T>\n{\n    public T Wert { get; set; }\n    public Box(T wert) => Wert = wert;\n}\n\nstatic T Groesstes<T>(List<T> xs) where T : System.IComparable<T>\n{\n    T max = xs[0];\n    foreach (var x in xs)\n        if (x.CompareTo(max) > 0) max = x;\n    return max;\n}\n\nvar b = new Box<string>("Hallo");\nint m = Groesstes(new List<int> { 3, 9, 4 });  // 9',
            quiz: [{ q: 'Wofür stehen Generics?', a: ['schnellerer Code', 'typunabhängiger, aber typsicherer Code', 'weniger Speicher'], ok: 1, why: 'Generics arbeiten mit beliebigen Typen und behalten dabei die Typprüfung.' }] },
        { t: 'Interfaces & Vererbung', text: '<p>Ein <strong>Interface</strong> ist ein Vertrag: Es legt Methoden fest, die eine Klasse haben muss. <code>abstract</code>-Klassen geben teils fertigen Code vor, <code>virtual</code>-Methoden lassen sich mit <code>override</code> überschreiben. So funktioniert Polymorphie.</p>',
            code: 'interface ILaut\n{\n    string Laut();\n}\n\nabstract class Tier : ILaut\n{\n    public abstract string Laut();\n    public void Vorstellen() => System.Console.WriteLine($"Ich mache {Laut()}");\n}\n\nclass Hund : Tier\n{\n    public override string Laut() => "Wuff";\n}\n\nILaut t = new Hund();\nSystem.Console.WriteLine(t.Laut());   // Wuff',
            quiz: [{ q: 'Was ist ein Interface?', a: ['eine fertige Klasse', 'ein Vertrag aus Methoden ohne Umsetzung', 'eine Variable'], ok: 1, why: 'Ein Interface schreibt vor, welche Methoden es geben muss.' },
                { q: 'Womit überschreibst du eine virtuelle Methode?', a: ['new', 'override', 'virtual'], ok: 1, why: 'override ersetzt die Methode der Oberklasse.' }] },
        { t: 'Properties & Records', text: '<p><strong>Properties</strong> sind Felder mit kontrolliertem Zugriff: <code>{ get; set; }</code>. Mit <code>{ get; init; }</code> ist ein Wert nur beim Erstellen setzbar. Ein <strong>record</strong> ist ein unveränderbarer Werttyp – mit automatischem Vergleich und ToString.</p>',
            code: 'class Person\n{\n    public string Name { get; init; } = "";\n    public int Alter { get; set; }\n}\n\nvar p = new Person { Name = "Tom", Alter = 3 };\np.Alter = 4;            // ok\n// p.Name = "x";        // Fehler: init\n\nrecord Punkt(int X, int Y);\nvar a = new Punkt(1, 2);\nvar b = new Punkt(1, 2);\nSystem.Console.WriteLine(a == b);   // True – records vergleichen den Inhalt',
            quiz: [{ q: 'Was bedeutet { get; init; }?', a: ['nur lesbar', 'nur beim Erstellen setzbar', 'immer änderbar'], ok: 1, why: 'init erlaubt das Setzen nur im Objektinitialisierer.' },
                { q: 'Wie vergleichen zwei records mit gleichem Inhalt?', a: ['sie sind ungleich', 'sie sind gleich (==)', 'Fehler'], ok: 1, why: 'Records vergleichen standardmässig ihren Inhalt.' }] },
        { t: 'Delegates, Lambdas & Events', text: '<p>In C# sind Methoden auch Werte: <code>Func&lt;…&gt;</code> (gibt etwas zurück) und <code>Action&lt;…&gt;</code> (gibt nichts zurück) halten Lambdas. Ein <strong>event</strong> lässt mehrere Zuhörer sich anmelden und benachrichtigt sie – das Muster hinter Buttons und Spiel-Ereignissen.</p>',
            code: 'using System;\n\nFunc<int, int> quadrat = x => x * x;\nAction<string> log = s => Console.WriteLine("LOG: " + s);\nConsole.WriteLine(quadrat(5));   // 25\nlog("fertig");\n\nclass Spiel\n{\n    public event Action<int>? Gewonnen;\n    public void Beenden(int punkte) => Gewonnen?.Invoke(punkte);\n}\n\nvar s = new Spiel();\ns.Gewonnen += p => Console.WriteLine($"Sieg mit {p}!");\ns.Beenden(42);',
            quiz: [{ q: 'Was ist der Unterschied zwischen Func und Action?', a: ['keiner', 'Func gibt einen Wert zurück, Action nicht', 'Action ist schneller'], ok: 1, why: 'Func<…, TResult> liefert ein Ergebnis, Action nur Seiteneffekte.' }] },
        { t: 'Fehler & Ressourcen', text: '<p><code>try/catch/finally</code> fängt Fehler ab; eigene Exception-Klassen machen sie klar. Für Dinge, die freigegeben werden müssen (Dateien, Netzwerk), nutzt du <code>using</code> – das räumt automatisch auf, auch bei Fehlern.</p>',
            code: 'using System;\nusing System.IO;\n\ntry\n{\n    using var leser = new StreamReader("notiz.txt");\n    string text = leser.ReadToEnd();\n    Console.WriteLine(text);\n}\ncatch (FileNotFoundException)\n{\n    Console.WriteLine("Datei fehlt");\n}\nfinally\n{\n    Console.WriteLine("fertig");\n}\n\n// eigener Fehler:\nif (false) throw new InvalidOperationException("geht nicht");',
            quiz: [{ q: 'Wofür ist using var … gut?', a: ['schnelleres Lesen', 'gibt die Ressource automatisch frei', 'verschlüsselt die Datei'], ok: 1, why: 'using ruft am Ende automatisch Dispose() auf – auch bei Fehler.' }] },
        { t: 'async / await', text: '<p>Lange Aufgaben (Datei laden, Netzwerk) blockieren mit <code>async/await</code> nicht das ganze Programm. Eine <code>async</code>-Methode gibt <code>Task</code> bzw. <code>Task&lt;T&gt;</code> zurück; <code>await</code> wartet auf das Ergebnis und lässt alles andere weiterlaufen.</p>',
            code: 'using System;\nusing System.Net.Http;\nusing System.Threading.Tasks;\n\nasync Task<int> LaengeAsync(string url)\n{\n    using var client = new HttpClient();\n    string inhalt = await client.GetStringAsync(url);\n    return inhalt.Length;\n}\n\n// Aufruf:\nint n = await LaengeAsync("https://example.com");\nConsole.WriteLine(n);',
            quiz: [{ q: 'Was macht await?', a: ['blockiert alles', 'wartet auf das Ergebnis, lässt den Rest weiterlaufen', 'startet einen neuen Computer'], ok: 1, why: 'await wartet, ohne das Programm einzufrieren.' },
                { q: 'Was gibt eine async-Methode meist zurück?', a: ['void', 'Task oder Task<T>', 'string'], ok: 1, why: 'Async-Methoden liefern Task bzw. Task<T>.' }] },
        { t: 'Moderne Features', text: '<p>Neuere C#-Versionen helfen dir, sicherer und kürzer zu schreiben: <strong>nullable reference types</strong> (<code>string?</code>) warnen vor null-Fehlern, <strong>Pattern Matching</strong> prüft Typ und entpackt zugleich, und der <strong>switch-Ausdruck</strong> gibt direkt einen Wert zurück.</p>',
            code: 'object x = 42;\n\nif (x is int n && n > 10)\n    System.Console.WriteLine($"grosse Zahl: {n}");\n\nstring beschreibung = x switch\n{\n    int i when i < 0 => "negativ",\n    int    => "ganze Zahl",\n    string => "Text",\n    null   => "nichts",\n    _      => "etwas anderes"\n};\nSystem.Console.WriteLine(beschreibung);   // ganze Zahl',
            quiz: [{ q: 'Was macht if (x is int n)?', a: ['nur Typ prüfen', 'Typ prüfen und den Wert in n entpacken', 'x in int umwandeln, immer'], ok: 1, why: 'Pattern Matching prüft den Typ und legt den Wert gleich in n ab.' },
                { q: 'Wozu dient string? statt string?', a: ['schneller', 'erlaubt null und warnt vor fehlenden Prüfungen', 'nur Grossbuchstaben'], ok: 1, why: 'Das ? markiert, dass der Wert null sein darf.' }] }
    ]
});
