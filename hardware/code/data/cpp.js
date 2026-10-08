/* Code-Bibliothek · C++ */
XIRU_CODE.add({
    id: 'cpp', n: 'C++', icon: 'C++', color: '#60a5fa', comment: '//',
    tag: 'Schnell und hardwarenah: Spiele-Engines, Treiber und alles, was Leistung braucht.',
    level: 'Fortgeschritten', use: 'Spiele-Engines (Unreal), Systeme, Mikrocontroller',
    intro: 'C++ ist eine der schnellsten Sprachen überhaupt. Du hast viel Kontrolle – zum Beispiel über den Speicher – und damit auch mehr Verantwortung. Die Unreal Engine, viele Spiele und auch Arduino-Projekte nutzen C++.',
    kw: ['include', 'using', 'namespace', 'std', 'int', 'double', 'float', 'bool', 'char', 'void', 'auto', 'const', 'return', 'if', 'else', 'for', 'while', 'class', 'struct', 'public', 'private', 'new', 'delete', 'true', 'false', 'nullptr', 'cout', 'cin', 'endl', 'vector', 'string'],
    sheet: [
        { g: 'Basics', items: [
            ['#include', '#include <iostream>', 'Bindet eine Bibliothek ein, hier für Ein- und Ausgabe.'],
            ['main', 'int main() {\n    return 0;\n}', 'Einstiegspunkt. return 0 heisst „alles gut“.'],
            ['std::cout', 'std::cout << "Hallo" << std::endl;', 'Ausgabe in die Konsole.'],
            ['std::cin', 'std::cin >> x;', 'Eingabe von der Tastatur in eine Variable.'],
            ['using namespace', 'using namespace std;', 'Spart das std:: – in grossen Projekten lieber vermeiden.']
        ] },
        { g: 'Datentypen', items: [
            ['int / double', 'int x = 3;\ndouble y = 2.5;', 'Ganze Zahl / Kommazahl.'],
            ['bool', 'bool x = true;', 'Wahrheitswert.'],
            ['std::string', 'std::string x = "Tom";', 'Text (braucht #include <string>).'],
            ['auto', 'auto x = 1;', 'Der Compiler leitet den Typ ab.'],
            ['const', 'const int MAX = 3;', 'Wert darf sich nicht ändern.']
        ] },
        { g: 'Kontrollstrukturen & Container', items: [
            ['for', 'for (int i = 0; i < 3; i++) { }', 'Zählschleife.'],
            ['range-for', 'for (int x : zahlen) { }', 'Geht alle Elemente durch.'],
            ['std::vector', 'std::vector<int> x = {1, 2};\nx.push_back(3);', 'Wachsende Liste (#include <vector>).']
        ] },
        { g: 'Speicher & Zeiger', items: [
            ['Referenz &', 'void f(int& x) { x++; }', 'Übergibt das Original statt einer Kopie.'],
            ['Zeiger *', 'int* p = &x;\n*p = 5;', 'Speichert eine Adresse; *p greift auf den Wert zu.', 'Zeiger sind mächtig, aber fehleranfällig: ein Zeiger ins Leere (nullptr) oder auf bereits freigegebenen Speicher lässt das Programm abstürzen. Modernes C++ nutzt deshalb oft Smart Pointer wie std::unique_ptr.'],
            ['new / delete', 'int* p = new int(3);\ndelete p;', 'Speicher selbst anfordern und wieder freigeben.']
        ] },
        { g: 'Klassen', items: [
            ['class', 'class Mech {\npublic:\n    int leben = 100;\n};', 'Bauplan für Objekte. Standard ist private.'],
            ['struct', 'struct Punkt { int x, y; };', 'Wie class, aber standardmässig public.']
        ] }
    ],
    lessons: [
        { t: 'Hallo C++', text: '<p>Mit <code>#include</code> holst du Bibliotheken. Ausgabe über <code>std::cout</code> und den Pfeil-Operator <code>&lt;&lt;</code>.</p>',
            code: '#include <iostream>\n\nint main() {\n    std::cout << "Hallo Welt!" << std::endl;\n    return 0;\n}',
            quiz: [{ q: 'Was bedeutet return 0 in main?', a: ['Fehler', 'Programm erfolgreich beendet', 'Neustart'], ok: 1, why: '0 heisst traditionell: alles in Ordnung.' }] },
        { t: 'Variablen & Eingabe', text: '<p>Eingaben liest <code>std::cin &gt;&gt;</code> direkt in eine Variable.</p>',
            code: '#include <iostream>\n#include <string>\n\nint main() {\n    std::string name;\n    int x;\n    std::cout << "Name? ";\n    std::cin >> name;\n    std::cout << "Zahl? ";\n    std::cin >> x;\n    std::cout << name << " hat " << x * 2 << std::endl;\n}',
            quiz: [{ q: 'Welcher Operator liest mit cin ein?', a: ['<<', '>>', '->'], ok: 1, why: 'cin >> x schiebt die Eingabe in x.' }] },
        { t: 'vector & Schleifen', text: '<p><code>std::vector</code> ist die Standardliste. Die range-for-Schleife geht alle Elemente durch.</p>',
            code: '#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> x = {1, 2, 3};\n    x.push_back(4);\n    int summe = 0;\n    for (int z : x) summe += z;\n    std::cout << summe << std::endl;  // 10\n}',
            quiz: [{ q: 'Wie hängt man an einen vector an?', a: ['add()', 'push_back()', 'append()'], ok: 1, why: 'vector nutzt push_back.' }] },
        { t: 'Referenzen & Zeiger', text: '<p>Mit <code>&amp;</code> übergibst du das Original statt einer Kopie. Zeiger speichern Adressen – mächtig, aber mit Vorsicht zu benutzen.</p>',
            code: 'void verdoppeln(int& x) {\n    x = x * 2;\n}\n\nint main() {\n    int a = 21;\n    verdoppeln(a);   // a ist jetzt 42\n    int* p = &a;\n    *p = 7;          // a ist jetzt 7\n}',
            quiz: [{ q: 'Was macht int& x als Parameter?', a: ['Kopiert den Wert', 'Arbeitet mit dem Original', 'Macht x konstant'], ok: 1, why: 'Eine Referenz ist ein zweiter Name für dieselbe Variable.' }] }
    ]
});
