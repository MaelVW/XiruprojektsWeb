/* Code-Bibliothek · Netzwerke & IT-Grundlagen */
XIRU_CODE.add({
    id: 'netzwerk', n: 'Netzwerke & IT', icon: '🌐', color: '#38bdf8', comment: '#',
    tag: 'Kein Programmieren, sondern das Drumherum: wie Netzwerke, WLAN und das Internet funktionieren.',
    level: 'IT-Grundlagen', use: 'Heimnetz verstehen, WLAN einrichten, Probleme selbst lösen',
    intro: 'Wie kommt eine Webseite auf deinen Bildschirm? Was passiert, wenn du dich mit dem WLAN verbindest? Dieser Kurs erklärt die <strong>Grundlagen von Netzwerken und IT</strong> – Schritt für Schritt und ohne Vorwissen: IP-Adressen, Router, Wi-Fi, DNS, das Internet und wie du typische Probleme selbst findest.',
    kw: ['ping', 'ipconfig', 'ifconfig', 'tracert', 'traceroute', 'nslookup', 'GET', 'HTTP', 'HTTPS', 'TCP', 'UDP', 'IP', 'DNS', 'DHCP', 'NAT', 'SSID', 'WPA2', 'WPA3', 'VPN', 'localhost'],
    sheet: [
        { g: 'Grundbegriffe', items: [
            ['Netzwerk', '', 'Mehrere Geräte, die Daten austauschen – per Kabel oder Funk.'],
            ['LAN', '', 'Local Area Network: dein lokales Netz zu Hause oder im Büro.'],
            ['WAN', '', 'Wide Area Network: weiträumig verbunden – das Internet ist das grösste WAN.'],
            ['Client / Server', '', 'Der Client fragt an (dein Browser), der Server antwortet (die Webseite).'],
            ['Bandbreite', '100 Mbit/s', 'Wie viele Daten pro Sekunde durchpassen („wie breit das Rohr“).'],
            ['Latenz (Ping)', '20 ms', 'Wie lange ein Datenpaket hin und zurück braucht („Reaktionszeit“).']
        ] },
        { g: 'Adressen', items: [
            ['IPv4', '192.168.1.42', 'Adresse eines Geräts: vier Zahlen von 0–255.'],
            ['IPv6', '2001:db8::1', 'Neuere, viel grössere Adressen (es gehen IPv4 aus).'],
            ['privat', '192.168.x.x / 10.x.x.x', 'Nur im Heimnetz gültig. Nach aussen tritt der Router mit EINER öffentlichen IP auf.'],
            ['localhost', '127.0.0.1', 'Das Gerät selbst – nützlich fürs Entwickeln.'],
            ['MAC-Adresse', 'A9:3F:1C:0B:22:77', 'Fest eingebrannte Hardware-Adresse jeder Netzwerkkarte.'],
            ['Port', ':443', 'Tür für einen Dienst. 80 = HTTP, 443 = HTTPS, 53 = DNS.']
        ] },
        { g: 'Heimnetz & WLAN', items: [
            ['Router', '', 'Das Herz des Heimnetzes: verbindet dein LAN mit dem Internet.'],
            ['Switch', '', 'Verteilt Daten per Kabel an die richtigen Geräte im LAN.'],
            ['Gateway', '192.168.1.1', 'Die „Tür nach draussen“ – meist die IP deines Routers.'],
            ['DHCP', '', 'Vergibt automatisch IP-Adressen an neue Geräte.'],
            ['NAT', '', 'Übersetzt zwischen deiner einen öffentlichen IP und den vielen Geräten im Heimnetz.'],
            ['SSID', '"Xiru-WLAN"', 'Der sichtbare Name deines WLANs.'],
            ['Frequenzband', '2,4 / 5 / 6 GHz', '2,4 GHz: mehr Reichweite. 5/6 GHz: schneller, aber kürzere Reichweite.'],
            ['WPA3', '', 'Aktuelle WLAN-Verschlüsselung. WPA2 ist noch ok, WEP ist unsicher.']
        ] },
        { g: 'Internet & Web', items: [
            ['DNS', '', 'Telefonbuch des Internets: wandelt Namen (xiru.ch) in IP-Adressen um.'],
            ['TCP/IP', '', 'Die Sprachregeln des Internets: IP adressiert, TCP sorgt für vollständige Übertragung.'],
            ['Paket', '', 'Daten werden in kleine Pakete zerlegt, einzeln geschickt und am Ziel zusammengesetzt.'],
            ['HTTP / HTTPS', 'https://…', 'Protokoll für Webseiten. HTTPS ist verschlüsselt (Schloss-Symbol).'],
            ['URL', 'https://xiru.ch/hilfe', 'Adresse einer Webseite: Protokoll + Domain + Pfad.']
        ] },
        { g: 'Werkzeuge & Sicherheit', items: [
            ['ping', 'ping 8.8.8.8', 'Prüft, ob ein Ziel erreichbar ist, und misst die Latenz.'],
            ['ipconfig', 'ipconfig /all', 'Zeigt deine IP-Einstellungen (Windows). Linux/macOS: ip a bzw. ifconfig.'],
            ['tracert', 'tracert xiru.ch', 'Zeigt den Weg (die „Hops“) bis zum Ziel.'],
            ['nslookup', 'nslookup xiru.ch', 'Fragt den DNS: welche IP steckt hinter diesem Namen?'],
            ['Firewall', '', 'Türsteher: erlaubt oder blockiert Verbindungen.'],
            ['VPN', '', 'Verschlüsselter Tunnel – schützt vor allem in fremden/öffentlichen Netzen.']
        ] }
    ],
    lessons: [
        { t: 'Was ist ein Netzwerk?', text: '<p>Ein <strong>Netzwerk</strong> ist einfach: mehrere Geräte, die Daten austauschen – per Kabel oder Funk. Dein Heimnetz ist ein <strong>LAN</strong> (Local Area Network). Das weltweite Netz aus Millionen Netzwerken ist das Internet, ein riesiges <strong>WAN</strong>.</p><p>Fast alles im Netz folgt dem Muster <strong>Client &amp; Server</strong>: Dein Browser (Client) stellt eine Anfrage, ein Server antwortet mit der Webseite.</p>',
            code: '# So sieht die Rollenverteilung aus:\nDein Laptop  ──Anfrage──▶  Webserver von xiru.ch\nDein Laptop  ◀─Antwort───  (die Webseite)\n\n# Zwei Kennzahlen beschreiben eine Verbindung:\nBandbreite = wie viel pro Sekunde (z. B. 100 Mbit/s)\nLatenz     = wie schnell die Reaktion (z. B. 20 ms Ping)',
            quiz: [{ q: 'Wie nennt man dein lokales Heimnetz?', a: ['WAN', 'LAN', 'DNS'], ok: 1, why: 'LAN = Local Area Network, das lokale Netz. Das Internet ist ein WAN.' },
                { q: 'Was beschreibt die Latenz?', a: ['die Datenmenge pro Sekunde', 'die Reaktionszeit (Hin und zurück)', 'die WLAN-Reichweite'], ok: 1, why: 'Latenz (Ping) ist die Verzögerung; Bandbreite ist die Datenmenge.' }] },
        { t: 'IP-Adressen', text: '<p>Damit Daten ihr Ziel finden, hat jedes Gerät eine <strong>IP-Adresse</strong>. Die bekannte Form ist <strong>IPv4</strong>: vier Zahlen von 0–255, z. B. <code>192.168.1.42</code>. Weil die ausgehen, gibt es das viel grössere <strong>IPv6</strong>.</p><p>Adressen wie <code>192.168.x.x</code> sind <strong>privat</strong> – sie gelten nur im Heimnetz. Nach aussen tritt dein ganzes Netz mit <em>einer</em> öffentlichen IP auf (die deines Routers). <code>127.0.0.1</code> ist <strong>localhost</strong>: das Gerät selbst.</p>',
            code: '# Deine IP herausfinden:\nipconfig            # Windows\nip a                # Linux\nifconfig            # macOS / älteres Linux\n\n# Beispiele:\n192.168.1.42        # privat (nur im Heimnetz)\n127.0.0.1           # localhost = dieser Computer\n2001:db8::1         # eine IPv6-Adresse',
            quiz: [{ q: 'Welche Adresse ist eine typische private Heimnetz-IP?', a: ['8.8.8.8', '192.168.1.42', '127.0.0.1'], ok: 1, why: '192.168.x.x ist privat. 8.8.8.8 ist öffentlich (ein Google-DNS), 127.0.0.1 ist localhost.' },
                { q: 'Wofür steht 127.0.0.1?', a: ['den Router', 'das Gerät selbst (localhost)', 'das Internet'], ok: 1, why: 'localhost zeigt immer auf den eigenen Computer.' }] },
        { t: 'Der Router & dein Heimnetz', text: '<p>Der <strong>Router</strong> ist das Herz deines Heimnetzes. Er verbindet dein LAN mit dem Internet und erledigt mehrere Jobs gleichzeitig:</p><ul><li><strong>DHCP</strong> – vergibt automatisch IP-Adressen an neue Geräte, damit du nichts von Hand einstellen musst.</li><li><strong>NAT</strong> – übersetzt zwischen deiner einen öffentlichen IP und den vielen Geräten drinnen.</li><li><strong>Gateway</strong> – die „Tür nach draussen“, meist <code>192.168.1.1</code>.</li></ul><p>Ein <strong>Switch</strong> (oft im Router eingebaut) verteilt Kabel-Daten an das richtige Gerät.</p>',
            code: '# Typischer Aufbau zu Hause:\n          Internet\n             │\n         [ Router ]  ← Gateway 192.168.1.1, macht DHCP + NAT\n          /   │   \\\n     Laptop  TV   Handy   ← bekommen IPs wie 192.168.1.20, .21, .22',
            quiz: [{ q: 'Was macht DHCP?', a: ['verschlüsselt das WLAN', 'vergibt automatisch IP-Adressen', 'speichert Webseiten'], ok: 1, why: 'DHCP teilt neuen Geräten automatisch eine IP zu.' },
                { q: 'Wozu dient NAT im Router?', a: ['viele Geräte teilen sich eine öffentliche IP', 'es beschleunigt das WLAN', 'es blockiert Viren'], ok: 0, why: 'NAT übersetzt zwischen der einen öffentlichen IP und den vielen privaten.' }] },
        { t: 'WLAN / Wi-Fi', text: '<p><strong>Wi-Fi</strong> ist einfach ein Netzwerk per Funk statt Kabel. Der Name, den du siehst, ist die <strong>SSID</strong>. Das Funksignal läuft auf Frequenzbändern:</p><ul><li><strong>2,4 GHz</strong>: grosse Reichweite, geht gut durch Wände – aber langsamer und voller (viele Geräte).</li><li><strong>5 GHz</strong> und <strong>6 GHz</strong>: viel schneller, aber kürzere Reichweite.</li></ul><p>Die Generationen heissen <strong>Wi-Fi 5, 6, 6E und 7</strong> – jede neuere ist schneller und besser bei vielen Geräten. Tipp: näher zum Router, weniger Wände, und 5 GHz für Tempo wählen.</p>',
            code: '# Faustregeln:\n2,4 GHz  →  Reichweite  (Keller, Garten, durch Wände)\n5/6 GHz  →  Tempo       (nahe am Router, Gaming, 4K-Streaming)\n\n# WLAN-Infos ansehen (Windows):\nnetsh wlan show interfaces   # zeigt SSID, Band, Signalstärke',
            quiz: [{ q: 'Welches Band hat die grössere Reichweite?', a: ['2,4 GHz', '5 GHz', 'beide gleich'], ok: 0, why: '2,4 GHz kommt weiter und besser durch Wände, ist aber langsamer.' },
                { q: 'Was ist die SSID?', a: ['das WLAN-Passwort', 'der sichtbare Name des WLANs', 'die IP des Routers'], ok: 1, why: 'Die SSID ist der Netzwerkname, den du in der WLAN-Liste siehst.' }] },
        { t: 'WLAN sicher machen', text: '<p>Funk geht durch Wände – also auch zu den Nachbarn. Darum wird WLAN <strong>verschlüsselt</strong>. Achte auf den Standard:</p><ul><li><strong>WPA3</strong> – aktuell und am sichersten.</li><li><strong>WPA2</strong> – noch in Ordnung.</li><li><strong>WEP</strong> – uralt und in Minuten geknackt: niemals benutzen.</li></ul><p>Weitere einfache Regeln: ein langes, eigenes WLAN-Passwort, das Standard-Admin-Passwort des Routers ändern, Updates einspielen und für Gäste ein <strong>Gastnetz</strong> einrichten (trennt sie von deinen Geräten).</p>',
            code: '# Reihenfolge von sicher nach unsicher:\nWPA3   ✅ bestes\nWPA2   🟡 ok\nWEP    ⛔ gilt als geknackt – nie verwenden\n\n# Gutes Passwort: lang und einzigartig\n"Kristall-Diskette-Nebel-7!"   statt   "12345678"',
            quiz: [{ q: 'Welche WLAN-Verschlüsselung solltest du meiden?', a: ['WPA3', 'WPA2', 'WEP'], ok: 2, why: 'WEP ist unsicher und schnell zu knacken. Nimm WPA2 oder besser WPA3.' }] },
        { t: 'DNS – das Telefonbuch', text: '<p>Computer finden sich über IP-Adressen – aber <code>142.250.74.228</code> merkt sich niemand. Das <strong>DNS</strong> (Domain Name System) ist das Telefonbuch des Internets: Es wandelt Namen wie <code>xiru.ch</code> in die passende IP-Adresse um.</p><p>Tippst du eine Adresse ein, fragt dein Gerät zuerst einen DNS-Server: „Welche IP gehört zu diesem Namen?“ – und verbindet sich dann mit dieser IP.</p>',
            code: '# Namen nachschlagen:\nnslookup xiru.ch\n\n# Ablauf (vereinfacht):\n"xiru.ch"  ──an DNS──▶  "Die IP ist 203.0.113.9"\nDein Gerät ─verbindet─▶  203.0.113.9  (der Webserver)',
            quiz: [{ q: 'Was macht DNS?', a: ['verschlüsselt Daten', 'wandelt Namen in IP-Adressen um', 'vergibt WLAN-Passwörter'], ok: 1, why: 'DNS übersetzt menschenlesbare Namen in IP-Adressen.' }] },
        { t: 'Wie eine Webseite lädt', text: '<p>Rufst du eine Seite auf, passiert in Sekundenbruchteilen viel: Der Name wird per <strong>DNS</strong> zur IP, dann baut dein Browser eine Verbindung auf und schickt eine <strong>HTTP(S)</strong>-Anfrage. Die Antwort kommt nicht am Stück, sondern in vielen kleinen <strong>Paketen</strong>, die über mehrere Router (<em>Hops</em>) reisen und am Ziel wieder zusammengesetzt werden.</p><p>Dafür sorgt <strong>TCP/IP</strong>: IP kümmert sich um die Adressierung, TCP darum, dass wirklich alles vollständig und in der richtigen Reihenfolge ankommt. <strong>HTTPS</strong> verschlüsselt das Ganze – daher das Schloss im Browser.</p>',
            code: '# Was beim Öffnen von https://xiru.ch passiert:\n1. DNS:  xiru.ch  →  203.0.113.9\n2. Verbindung zum Server (Port 443 = HTTPS)\n3. Browser sendet:  GET /  HTTP/1.1\n4. Server antwortet mit der Seite – in vielen Paketen\n5. TCP setzt die Pakete korrekt zusammen → Seite erscheint',
            quiz: [{ q: 'Was ist der erste Schritt beim Öffnen einer Webseite?', a: ['das Passwort prüfen', 'den Namen per DNS in eine IP umwandeln', 'das WLAN neu starten'], ok: 1, why: 'Zuerst muss der Name zur IP-Adresse aufgelöst werden (DNS).' },
                { q: 'Was bedeutet das Schloss-Symbol / HTTPS?', a: ['die Seite ist schnell', 'die Verbindung ist verschlüsselt', 'die Seite ist offiziell'], ok: 1, why: 'HTTPS verschlüsselt die Verbindung – ein Schloss heisst „sicher übertragen“, nicht „vertrauenswürdiger Inhalt“.' }] },
        { t: 'Probleme selbst finden', text: '<p>Internet weg? Mit ein paar Befehlen grenzt du das Problem ein. Grundregel: von innen nach aussen prüfen – erst das eigene Gerät, dann der Router, dann das Internet.</p><p>Und ja – <strong>Router aus- und nach 30 Sekunden wieder einschalten</strong> löst erstaunlich viele Probleme (Verbindungen werden sauber neu aufgebaut).</p>',
            code: '# Schritt für Schritt eingrenzen:\nping 127.0.0.1        # funktioniert mein Netzwerk-Stack überhaupt?\nping 192.168.1.1      # erreiche ich den Router?\nping 8.8.8.8          # komme ich ins Internet (per IP)?\nping xiru.ch          # funktioniert auch DNS (Name)?\n\n# Reagiert 8.8.8.8, aber xiru.ch nicht  →  DNS-Problem\n# Kommt nicht mal der Router  →  Kabel/WLAN/Router prüfen',
            quiz: [{ q: 'ping 8.8.8.8 klappt, aber ping xiru.ch nicht. Woran liegt es wahrscheinlich?', a: ['das Kabel ist ab', 'ein DNS-Problem', 'der Bildschirm ist kaputt'], ok: 1, why: 'Die IP ist erreichbar, nur die Namensauflösung nicht – also DNS.' },
                { q: 'Was prüft ping 192.168.1.1 typischerweise?', a: ['ob der Router erreichbar ist', 'ob DNS geht', 'die WLAN-Geschwindigkeit'], ok: 0, why: '192.168.1.1 ist meist der Router (das Gateway).' }] },
        { t: 'Sicher unterwegs', text: '<p>Zum Schluss ein paar Alltags-Regeln, die dich schützen:</p><ul><li><strong>Firewall an lassen</strong> – sie ist der Türsteher für Verbindungen (in Windows/macOS eingebaut).</li><li><strong>Updates einspielen</strong> – die meisten Angriffe nutzen längst behobene Lücken.</li><li><strong>HTTPS beachten</strong> – gib Passwörter nur auf Seiten mit Schloss ein.</li><li><strong>Öffentliches WLAN</strong> (Café, Bahnhof) ist unsicher – für Sensibles ein <strong>VPN</strong> nutzen, ein verschlüsselter Tunnel.</li><li><strong>Phishing</strong> – prüfe Absender und Link-Ziel, bevor du klickst.</li></ul>',
            code: '# Ein VPN legt einen verschlüsselten Tunnel:\nDein Gerät ═══(verschlüsselt)═══▶ VPN-Server ──▶ Internet\n\n# So kann im Café-WLAN niemand mitlesen, was du überträgst.',
            quiz: [{ q: 'Wofür ist ein VPN vor allem gut?', a: ['schnelleres Internet', 'verschlüsselter Schutz in fremden/öffentlichen Netzen', 'mehr WLAN-Reichweite'], ok: 1, why: 'Ein VPN verschlüsselt deinen Verkehr – besonders wichtig in offenen WLANs.' },
                { q: 'Warum sind Updates wichtig für die Sicherheit?', a: ['sie machen den PC schneller', 'sie schliessen bekannte Sicherheitslücken', 'sie sind Pflicht'], ok: 1, why: 'Viele Angriffe nutzen längst bekannte, per Update behebbare Lücken.' }] }
    ]
});
