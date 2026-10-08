/* Code-Bibliothek · Java */
XIRU_CODE.add({
    id: 'java', n: 'Java', icon: 'J', color: '#f97316', comment: '//',
    tag: 'Läuft fast überall: Android-Apps, Minecraft-Mods und grosse Firmensoftware.',
    level: 'Einsteiger bis Fortgeschritten', use: 'Android, Minecraft (Java Edition), Server',
    intro: 'Java ist C# sehr ähnlich: streng typisiert, objektorientiert, mit geschweiften Klammern. Der Code läuft in der <strong>Java Virtual Machine</strong> – deshalb funktioniert dasselbe Programm auf Windows, Mac und Linux. Minecraft Java Edition ist in Java geschrieben.',
    kw: ['public', 'private', 'class', 'static', 'void', 'int', 'double', 'boolean', 'char', 'String', 'new', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'true', 'false', 'null', 'import', 'extends', 'implements', 'this', 'final', 'try', 'catch', 'System'],
    sheet: [
        { g: 'Basics', items: [
            ['main', 'public static void main(String[] args) { }', 'Einstiegspunkt jedes Java-Programms.'],
            ['System.out.println', 'System.out.println("Hallo");', 'Gibt eine Zeile in der Konsole aus.'],
            ['Klasse', 'public class Main { }', 'Jeder Code steht in einer Klasse. Dateiname = Klassenname (Main.java).'],
            ['Kommentar', '// eine Zeile\n/* mehrere */', 'Wird ignoriert.']
        ] },
        { g: 'Datentypen', items: [
            ['int', 'int x = 3;', 'Ganze Zahl.'],
            ['double', 'double y = 2.5;', 'Kommazahl.'],
            ['boolean', 'boolean x = true;', 'Wahrheitswert (in Java heisst er boolean, nicht bool).'],
            ['String', 'String x = "Tom Mustermann";', 'Text. Gross geschrieben, weil es eine Klasse ist.'],
            ['char', "char x = 'A';", 'Einzelnes Zeichen.'],
            ['final', 'final int MAX = 3;', 'Konstante: Wert kann nicht mehr geändert werden.']
        ] },
        { g: 'Kontrollstrukturen', items: [
            ['if / else', 'if (x > 1) { } else { }', 'Verzweigung.'],
            ['for', 'for (int i = 0; i < 3; i++) { }', 'Zählschleife.'],
            ['for-each', 'for (int x : zahlen) { }', 'Geht alle Elemente durch (mit Doppelpunkt).'],
            ['while', 'while (x < 3) { x++; }', 'Wiederholt, solange die Bedingung wahr ist.']
        ] },
        { g: 'Arrays & Listen', items: [
            ['Array', 'int[] x = {1, 2, 3};', 'Feste Grösse, Index ab 0.'],
            ['ArrayList', 'ArrayList<String> x = new ArrayList<>();\nx.add("Tom");', 'Wachsende Liste. Braucht import java.util.ArrayList;'],
            ['length / size()', 'x.length   // Array\nx.size()   // Liste', 'Anzahl der Elemente.']
        ] },
        { g: 'Klassen & Objekte', items: [
            ['Konstruktor', 'public Person(String name) {\n    this.name = name;\n}', 'Wird beim Erzeugen mit new aufgerufen.'],
            ['extends', 'class Hund extends Tier { }', 'Vererbung: Hund übernimmt alles von Tier.'],
            ['Getter / Setter', 'public String getName() { return name; }', 'Methoden, um private Felder zu lesen oder zu setzen.']
        ] }
    ],
    lessons: [
        { t: 'Hallo Java', text: '<p>Jedes Programm braucht eine Klasse mit einer <code>main</code>-Methode. <code>System.out.println</code> gibt eine Zeile aus.</p>',
            code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hallo Welt!");\n    }\n}',
            quiz: [{ q: 'Wie heisst der Wahrheitswert-Typ in Java?', a: ['bool', 'boolean', 'Bool'], ok: 1, why: 'Java schreibt boolean aus.' }] },
        { t: 'Variablen & Eingabe', text: '<p>Texte sind vom Typ <code>String</code> (gross!). Eingaben liest man mit einem <code>Scanner</code>.</p>',
            code: 'import java.util.Scanner;\n\nScanner sc = new Scanner(System.in);\nSystem.out.print("Name: ");\nString name = sc.nextLine();\nint x = 3;\nSystem.out.println("Hallo " + name + ", x ist " + x);',
            quiz: [{ q: 'Welche Klasse liest Eingaben ein?', a: ['Reader', 'Scanner', 'Input'], ok: 1, why: 'java.util.Scanner liest von System.in.' }] },
        { t: 'Schleifen & Listen', text: '<p><code>ArrayList</code> kann wachsen. Die for-each-Schleife nutzt einen Doppelpunkt.</p>',
            code: 'ArrayList<String> teile = new ArrayList<>();\nteile.add("CPU");\nteile.add("GPU");\n\nfor (String t : teile) {\n    System.out.println("Eingebaut: " + t);\n}',
            quiz: [{ q: 'Wie viele Elemente hat eine ArrayList?', a: ['x.length', 'x.size()', 'x.count'], ok: 1, why: 'Listen haben size(), Arrays length.' }] },
        { t: 'Klassen', text: '<p>Wie in C#: Klassen sind Baupläne. Mit <code>extends</code> erbt eine Klasse von einer anderen.</p>',
            code: 'class Tier {\n    String name;\n    Tier(String name) { this.name = name; }\n    void laut() { System.out.println("..."); }\n}\n\nclass Hund extends Tier {\n    Hund(String name) { super(name); }\n    void laut() { System.out.println(name + ": Wuff!"); }\n}',
            quiz: [{ q: 'Womit erbt eine Klasse in Java?', a: [':', 'extends', 'inherits'], ok: 1, why: 'Java nutzt extends (C# einen Doppelpunkt).' }] }
    ]
});
