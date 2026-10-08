/* Code-Bibliothek · Lua (Roblox) */
XIRU_CODE.add({
    id: 'lua', n: 'Lua', icon: 'Lua', color: '#818cf8', comment: '--',
    tag: 'Klein und flink: die Skriptsprache von Roblox (Luau) und vielen Spielen.',
    level: 'Einsteiger', use: 'Roblox-Spiele (Luau), Mods, Spiele-Skripte',
    intro: 'Lua ist eine kleine, schnelle Skriptsprache, die sich gut in Spiele einbauen lässt. <strong>Roblox</strong> nutzt eine Variante namens <strong>Luau</strong>. Blöcke enden mit <code>end</code>, Listen heissen <strong>Tabellen</strong> und zählen ab 1.',
    kw: ['local', 'function', 'end', 'if', 'then', 'elseif', 'else', 'for', 'do', 'while', 'repeat', 'until', 'return', 'nil', 'true', 'false', 'and', 'or', 'not', 'in', 'pairs', 'ipairs', 'print', 'game', 'workspace'],
    sheet: [
        { g: 'Basics', items: [
            ['print', 'print("Hallo")', 'Gibt etwas aus (in Roblox im Output-Fenster).'],
            ['local', 'local x = 1', 'Lokale Variable – fast immer local verwenden.'],
            ['Kommentar', '-- eine Zeile\n--[[ mehrere ]]', 'Wird ignoriert.'],
            ['nil', 'local x = nil', 'Steht für „kein Wert“.'],
            ['..', 'print("Hallo " .. name)', 'Texte verbinden (Konkatenation).']
        ] },
        { g: 'Kontrollstrukturen', items: [
            ['if / then / end', 'if x > 1 then\n    print("gross")\nelseif x == 1 then\n    print("eins")\nelse\n    print("klein")\nend', 'Verzweigung. Ungleich ist ~=.'],
            ['for', 'for i = 1, 3 do\n    print(i)\nend', 'Zählt von 1 bis 3 (inklusive).'],
            ['while', 'while x < 3 do\n    x += 1\nend', 'Wiederholt, solange die Bedingung wahr ist. += gibt es in Luau.'],
            ['repeat … until', 'repeat\n    x -= 1\nuntil x <= 0', 'Läuft mindestens einmal.']
        ] },
        { g: 'Tabellen', items: [
            ['Tabelle (Liste)', 'local x = {"CPU", "GPU"}\nprint(x[1])  -- CPU', 'Liste. Der Index beginnt bei 1, nicht bei 0!'],
            ['Tabelle (Wörterbuch)', 'local x = {name = "Tom", leben = 100}\nprint(x.name)', 'Schlüssel-Wert-Paare.'],
            ['#', 'print(#x)', 'Länge einer Liste.'],
            ['ipairs / pairs', 'for i, v in ipairs(x) do\n    print(i, v)\nend', 'ipairs für Listen (der Reihe nach), pairs für alle Schlüssel.'],
            ['table.insert', 'table.insert(x, "RAM")', 'Element hinten anhängen.']
        ] },
        { g: 'Funktionen', items: [
            ['function', 'local function doppelt(x)\n    return x * 2\nend', 'Eigene Funktion.']
        ] },
        { g: 'Roblox (Luau)', items: [
            ['game / workspace', 'local teil = workspace.Teil', 'workspace enthält alles, was in der 3D-Welt steht.'],
            ['Instance.new', 'local p = Instance.new("Part")\np.Parent = workspace', 'Erzeugt ein neues Objekt.'],
            ['Event', 'teil.Touched:Connect(function(hit)\n    print(hit.Name)\nend)', 'Reagiert auf ein Ereignis, z. B. Berührung.'],
            ['task.wait', 'task.wait(1)', 'Wartet eine Sekunde.'],
            ['Server / Client', 'Script / LocalScript', 'Script läuft auf dem Server, LocalScript beim Spieler.', 'Alles, was für alle gilt (Punkte, Türen, Schaden), gehört in ein Script auf dem Server. LocalScripts steuern nur die eigene Ansicht und Eingaben – sonst können Spieler schummeln.']
        ] }
    ],
    lessons: [
        { t: 'Hallo Lua', text: '<p>Variablen erstellst du mit <code>local</code>. Texte verbindest du mit <code>..</code>. Kommentare beginnen mit <code>--</code>.</p>',
            code: 'local name = "Tom Mustermann"\nlocal leben = 100\nprint("Hallo " .. name .. ", du hast " .. leben .. " Leben")',
            quiz: [{ q: 'Womit verbindet man Texte in Lua?', a: ['+', '..', '&'], ok: 1, why: 'Lua nutzt zwei Punkte zum Verbinden.' }] },
        { t: 'Entscheidungen & Schleifen', text: '<p>Blöcke enden mit <code>end</code>. <code>if</code> braucht <code>then</code>, Schleifen <code>do</code>. „Ungleich“ schreibt man <code>~=</code>.</p>',
            code: 'for i = 1, 5 do\n    if i % 2 == 0 then\n        print(i .. " ist gerade")\n    elseif i ~= 5 then\n        print(i .. " ist ungerade")\n    else\n        print("Fünf!")\n    end\nend',
            quiz: [{ q: 'Wie schreibt man „ungleich“ in Lua?', a: ['!=', '~=', '<>'], ok: 1, why: 'Lua nutzt ~=.' }] },
        { t: 'Tabellen', text: '<p>Tabellen sind Listen <em>und</em> Wörterbücher. Achtung: Der erste Eintrag hat den Index <strong>1</strong>.</p>',
            code: 'local teile = {"CPU", "GPU", "RAM"}\ntable.insert(teile, "SSD")\nprint(#teile)        -- 4\n\nfor i, t in ipairs(teile) do\n    print(i, t)\nend\n\nlocal spieler = {name = "Tom", punkte = 10}\nprint(spieler.name)',
            quiz: [{ q: 'Welchen Index hat das erste Element einer Lua-Liste?', a: ['0', '1', '-1'], ok: 1, why: 'Lua zählt ab 1.' }] },
        { t: 'Roblox: Teil berühren', text: '<p>In Roblox Studio steckt dieses Skript in einem Part. Berührt jemand das Teil, wird es rot und verschwindet nach einer Sekunde.</p>',
            code: 'local teil = script.Parent\n\nteil.Touched:Connect(function(hit)\n    local mensch = hit.Parent:FindFirstChild("Humanoid")\n    if mensch then\n        teil.BrickColor = BrickColor.new("Really red")\n        task.wait(1)\n        teil:Destroy()\n    end\nend)',
            quiz: [{ q: 'Wo läuft ein normales „Script“ in Roblox?', a: ['Beim Spieler', 'Auf dem Server', 'Nur im Studio'], ok: 1, why: 'Scripts laufen auf dem Server, LocalScripts beim Spieler.' }] }
    ]
});
