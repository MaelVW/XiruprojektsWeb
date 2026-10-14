# Online – der Xiru-Server

Die Website bleibt eine statische Seite (läuft auch offline). Online-Funktionen sind **freiwillig**
(Einstellung „Online“, standardmässig aus; nach dem Anmelden wird einmal gefragt) und sprechen mit
einem kleinen eigenen Server: **PocketBase** als Docker-Container auf Maels Unraid-Homeserver.

## Was online passiert

| Funktion | Wo | Daten |
|---|---|---|
| Wer ist unterwegs | Plakette unten links (alle Seiten) | Spitzname, Level, Gegend (Insel/Region), Kern-Bauteil des Mechs |
| Weltranglisten | Seitenleiste jedes Spiels in der Spielhalle | Spitzname + bester Wert je Spiel |
| Grüsse | Liste „Gerade unterwegs“ | vorgefertigte Grüsse (kein Freitext), an eine Person oder alle in der Gegend |
| Begegnungen auf Mnemora | mnemora.html: Figuren anderer Reisender an ihrem Ort, Treffpunkte Port Puffer + Registra, „… ist auch hier“, Grüsse an Ort | Gegend = `mnemora:<Ort>`, Mech = aktives Gehäuse (gleiche Felder wie oben, kein neuer Server-Teil) |
| Geräte-Sync | Einstellungen → Online, Anmeldeseite | Kontoname + Passwort (Server speichert nur den Hash), Spielstand, grobe Gerätebezeichnung |
| Mnemora-MMO | mnemora.html: Seitenleiste (Trupp, Weltboss, Schnellchat), Reiter „Treffpunkt“ (Chronik, Tauschbörse, Duellring, Ranglisten) | `players.party/kit/mn/mns`, Tabellen `mn_feed`, `mn_trades`, `mn_takes` (siehe unten) |
| Anti-Cheat | überall (Siegel), Einstellungen → Online (Status), Hooks auf dem Server | geprüfte Zusammenfassung des Spielstands je Konto (`users.ac`), Sperrgrund (`users.locked`), Verknüpfung Spieler ↔ Konto (`players.user`) |

Kein Passwort, keine E-Mail, keine Cookies. Jeder Browser legt beim ersten Online-Gang einen
zufälligen Schlüssel an (48 Hex-Zeichen) – gespeichert in der Tabelle `keys`, die von aussen **nur
angelegt, nie gelesen** werden kann – und einen Spieler-Datensatz, der darauf verweist. Ändern darf den
Spieler nur, wer den Schlüssel mitschickt (`players.updateRule: key.secret = @request.body.secret`,
der Verweis selbst ist danach unveränderlich). Lokal gespeichert unter `xiru:online:<konto>`.
(Versteckte Felder gehen dafür nicht: PocketBase lässt sie von aussen gar nicht beschreiben.)

**Geräte-Sync (seit 2026-10-13):** Tabelle `users` (PocketBase-Konten, Anmeldung mit `username` statt E-Mail, E-Mail optional,
Passwort ≥ 6, Name eindeutig ohne Gross/Klein, keine Login-Mails, Token 30 Tage, wird täglich aufgefrischt) und `saves`
(ein Datensatz je Konto: `owner` → users, `data` = Spielstand im Export-Format, `device`; lesen/ändern nur `owner = @request.auth.id`).
Ablauf in `online.js` (`XIRU.online.cloud`): Mit Online und angemeldetem Konto fragt die Website einmal nach dem Passwort und legt das
Server-Konto an (oder meldet dort an). Neues Gerät: Auf der Anmeldeseite einen Namen eingeben, den es im Browser nicht gibt → „Vom Server holen“.
Abgleich beim Laden jeder Seite, danach jede Minute und beim Verlassen, wenn sich etwas geändert hat (`xiru:mod:<konto>`, core.js).
Wer zuletzt gespeichert hat, gewinnt; haben beide Seiten Neues, wird gefragt, und der verworfene Stand bleibt als Sicherung (`xiru:cloudbak:<konto>`, Profil).
Nie übertragen (`LOCAL_ONLY` in core.js): API-Schlüssel, Liminal-Teil (`why-*`, `liminal-*`, Besuche dort), lokaler Spielzeit-Zähler (`local-usage`),
Werkzeug-, KI- und Mixer-Daten (`notizen`, `timer-tag`, `einheiten-*`, `bildwerk*`, `orakel*`, `mixer-*`) – deren Seiten versprechen „bleibt in deinem Browser“.
Prüfung beim Einlesen: `XIRU.savegame` in core.js (gleiche Prüfung wie beim Datei-Import).

Code: `assets/js/online.js` (wird von core.js nur bei eingeschaltetem Online geladen, `XIRU.online`),
Schalter/Spitzname/Server-Adresse in `konto/einstellungen.html#online`, Stil am Ende von `assets/css/main.css`.

## Mnemora-MMO (seit 2026-10-13, „halb-live“)

Code: `assets/js/mnemora-net.js` (`XIRU.mnNet`: **alles**, was das MMO mit dem Server austauscht – Abfragen, Aktionen, Ereignisse) und
`assets/js/mnemora-mmo.js` (`XIRU.mnMMO`: Oberfläche). Regeln/Daten (Weltboss der Woche, Tauschwaren, Kampfprofil) in `mnemora.js`.
**Halb-live:** Listen werden im Takt `EVERY` abgefragt (Reisende 20 s, Funk 25 s, Trupp 30 s, Tausch 45 s, Weltboss 60 s); neue Einträge in
`mn_feed` kommen zusätzlich sofort über Realtime (`XIRU.online.subscribe`). **Ziel später: Echtzeit** – dann die Abfragen in `PULL`
(mnemora-net.js) durch Realtime-Abos ersetzen; die Oberfläche hört nur auf Ereignisse und muss nicht umgebaut werden.

| Baustein | Daten |
|---|---|
| Trupp (bis 3) | `players.party` = zufällige Trupp-Kennung; Einladung/Beitritt als `mn_feed` (`inv`, `join`, `leave`). Kamerad:innen kämpfen auf Strassen als KI-Kopie ihres `players.kit` mit (Gegner dafür zäher), bekommen einen Anteil (`help`, wird bei ihnen gutgeschrieben). |
| Weltboss | jede Kalenderwoche einer (`MN.worldBoss()`, Ort fest je Boss), 15 000 Lebenspunkte; jeder Angriff (6 Runden, alle 2 h) = `mn_feed` `wb` mit `a` = Woche, `n` = Schaden. Rest = 15 000 − Summe. Beute einmal pro Woche für alle Beteiligten. |
| Duelle | Gegner = `players.kit` (Geist), Ergebnis als `mn_feed` `duel` (`to` = Geist, `n` = 1 Sieg). Rangliste je Monat: Sieg +3 (je Gegner/Tag einmal), gehaltene Verteidigung +1. |
| Tauschbörse | `mn_trades` (Angebot, Ware liegt sofort im „Treuhandfach“), `mn_takes` (Annahme; **eindeutiger Index je Angebot** → nur eine:r bekommt es). Wer anbietet, bekommt das Gewünschte beim nächsten Besuch (Angebot → `done`). Vertrauensbasis: Spielstände sind lokal. |
| Chronik, Schnellchat | `mn_feed` (`say` nur mit Satz-ID + Wort-ID aus festen Listen, kein Freitext; Chronik: `arrive`, `place`, `road`, `gc`, `wbdown`, `duel`, `trade`, `join`) |
| Rangliste | `players.mns` (Fortschritt: Strassen × 10 + Orte × 6 + Garbage Collector × 60 + Gehäuse × 4), `players.mn` = Details |

Nachrichten an dich (`mn_feed.to`) werden nur einmal verarbeitet (`mnemora.fx` im Spielstand, auch über Geräte hinweg).

Mit dem Anti-Cheat (unten) gibt es Trupp, Weltboss, Duelle, Tausch und Chronik-Einträge **nur mit verbundenem Konto** (Geräte-Sync);
ohne Konto sieht man andere Reisende und darf den Schnellchat benutzen. Tabellen und Regeln legt die Migration an (siehe Anti-Cheat → Einrichtung).
Pflege: alte `mn_feed`-Einträge gelegentlich löschen (älter als ~60 Tage; Ranglisten brauchen nur den laufenden Monat bzw. die Woche).

## Anti-Cheat (seit 2026-10-14)

Ziel: **Manipulationen bringen online nichts.** Alles, was andere sehen oder was andere betrifft – Level, Weltranglisten, Mech-Werte im Duell
und im Trupp, Mnemora-Rangliste, Weltboss, Tausch –, kommt aus dem **geprüften Spielstand** des Kontos, nicht aus dem, was der Browser behauptet.
Offline bleibt das Spiel frei: Wer schummelt, schummelt nur für sich.

**Drei Schichten:**
1. **Siegel im Browser** (`core.js`, `X.store` / `X.taint`): Jeder Schreibvorgang des Spiels legt neben Profil und Spielständen eine Prüfsumme ab
   (`xiru:sg:<Schlüssel>`). Wer den Speicher von Hand ändert (Entwicklerwerkzeuge) oder eine bearbeitete/alte Export-Datei einliest, bricht das
   Siegel → `xiru:taint:<konto>`, Online für dieses Konto gesperrt, der Server wird benachrichtigt (`POST /xiru/taint`). Export-Dateien und die
   Cookie-Sicherung tragen ebenfalls ein Siegel. Hält keine Profis auf – darum die Schichten 2 und 3.
2. **Prüfstelle auf dem Server** (PocketBase-Hooks `server/pb_hooks/`):
   - `players`: verknüpft den Eintrag mit dem Konto (`players.user`); **Level, Mech-Werte (`kit`), Mnemora-Fortschritt** rechnet der Server selbst
     aus dem geprüften Stand (Gehäuse + Steckkarten + Pilotenbonus aus dem Seemech). Ohne Konto: Level 0 (in der Liste „–“), kein Mech, kein Trupp.
   - `scores`: nur mit Konto und nur genau der Rekord, der im geprüften Stand steht (sonst 409 → die Website gleicht ab und meldet nach).
     Grobe Höchstwerte je Spiel in `xiru_lib.js` (`SCORE_CAP`) – Rekorde darüber zählen nicht für die Weltrangliste. **TODO: realistische Höchstwerte mit Mael/Luca.**
   - `mn_feed`: Weltboss-Schaden höchstens, was das Gehäuse in 6 Runden schafft, 2 h Abkühlzeit; Duell-Sieg nur bei plausibler Stärke;
     Chronik (Strasse, Ort, Garbage Collector) nur, wenn es im geprüften Stand steht. `mn_trades`/`mn_takes`: Ware muss frei im geprüften Stand liegen.
3. **Geprüfter Spielstand** (Hook auf `saves`): Jeder Geräte-Sync wird mit der letzten Prüfung (`users.ac`, nur für Superuser sichtbar) verglichen.
   Zuwachs, der an Ereignisse gebunden ist (neue Kristalle mit ihren XP, Orte, Spieltage, erste Spiele, Verkäufe, Tausch, Trupp-Anteile), ist frei;
   alles andere kommt aus „Eimern“, die sich mit der Zeit füllen (je Stunde: 2500 XP, 5000 Taler, 700 Material, 200 Fische, 30 Teile, 25 Karten;
   Werte in `xiru_lib.js`). Unmöglich → Spielstand abgelehnt, **Konto gesperrt** (`users.locked` = Grund). Erster Abgleich eines Kontos: nur grobe
   Obergrenzen (z. B. höchstens 250 000 XP).

**Gesperrt** heisst: kein Online für dieses Konto (Plakette „gesperrt“, Hinweis mit Grund). Offline geht alles weiter.
**Entsperren:** Einstellungen → Fortschritt zurücksetzen (der frische Stand wird hochgeladen, geprüft und die Sperre aufgehoben) –
oder ein Superuser leert in der Admin-Oberfläche bei `users` das Feld `locked` (z. B. bei einem Irrtum). Nutzer:innen können `locked` nicht selbst ändern.

Antworten der Hooks beginnen mit einer Kennung, auf die `online.js` reagiert: `xiru-locked:` (sperren), `xiru-auth:` (neu anmelden), `xiru-sync:` (erst abgleichen).

**Dateien:**
- `server/pb_hooks/xiru.pb.js` (Hooks), `xiru_hooks.js` (Logik mit Datenbank), `xiru_lib.js` (Regeln, Grenzwerte), `xiru_data.js` (Spieldaten,
  **erzeugt** von `python tools/build_server_data.py` aus site.js/mnemora.js – nach Änderungen an Kristallen, Seiten, Mech-Teilen, Gehäusen, Karten
  neu erzeugen und auf den Server kopieren; `tools/check_site.py` meldet, wenn sie veraltet ist).
- `server/pb_migrations/1760436000_xiru_mmo_anticheat.js`: legt beim Start alles an, was fehlt (users `locked`/`ac`, players `user`/`party`/`kit`/`mn`/`mns`,
  `mn_feed`, `mn_trades`, `mn_takes`) und setzt die Regeln (scores nur mit Konto, MMO nur mit Konto). Darf mehrfach laufen, löscht nie Daten.

**Einrichtung auf Maels Unraid (einmalig – erledigt am 2026-10-14; `/pb_migrations` war schon gemappt, PocketBase startet ohne `--hooksDir` und sucht die Hooks darum in `/pb_hooks`):**
1. Ordner anlegen: `/mnt/user/appdata/pocketbase/pb_hooks` und `/mnt/user/appdata/pocketbase/pb_migrations`.
2. Unraid → Docker → pocketbase → Edit → „Add another Path“ (zweimal): Container `/pb_hooks` → Host `/mnt/user/appdata/pocketbase/pb_hooks`,
   Container `/pb_migrations` → Host `/mnt/user/appdata/pocketbase/pb_migrations`. Apply.
3. Die vier Dateien aus `server/pb_hooks/` und die Datei aus `server/pb_migrations/` in diese Ordner kopieren.
4. Container neu starten. Im Log sollte die Migration `1760436000_xiru_mmo_anticheat.js` erscheinen. Test von aussen:
   `https://xiru.tail9e3f56.ts.net/xiru/me` muss **401** liefern (Route existiert, braucht Anmeldung) – 404 hiesse: Hooks nicht geladen.
5. Optional: alte Einträge der Weltranglisten (`scores`, vor dem Anti-Cheat ungeprüft) löschen. Rate limits: `mn_feed:create` 8 / 10 s,
   `mn_trades:create` 5 / 60 s, `mn_takes:create` 5 / 60 s.
(Die frühere Datei `docs/pocketbase-mmo-import.json` ist damit überflüssig und wurde entfernt.)

**Admin-Seite (seit 2026-10-14):** `konto/admin.html` (versteckt, `noindex`). Anmelden mit einem Xiru-Konto, das `users.role = admin` hat –
der Server prüft das bei jeder Anfrage (`server/pb_hooks/xiru_admin.js`, Routen `/xiru/admin/users|act|create|purge`). Kann: Konten suchen/filtern
(gesperrt, Admins) mit geprüftem Stand, **sperren** (mit Grund), **entsperren** (setzt `users.pardon`; der Browser hebt dann auch ein gebrochenes Siegel auf),
**entsperren + Stand annehmen** (löscht `users.ac` → nächster Spielstand = neuer Ausgangspunkt), Admin-Rolle geben/entziehen, **Admin-Konten anlegen**,
Wartung (ungeprüfte Weltranglisten-Einträge, alter Mnemora-Funk). **Admin-Konten** = Testkonten: werden vom Anti-Cheat nicht geprüft, zählen in keiner
Rangliste; „Admin-Spielkonto ausstatten“ schaltet im Browser alles frei (Level 99, alle Teile mythisch, Mnemora komplett), der Sync nimmt es an.
`role` und `pardon` können Nutzer:innen nicht selbst setzen. Feld-Migration: `server/pb_migrations/1760500000_xiru_admin.js`.
**Ersten Admin festlegen:** PocketBase-Oberfläche (Heimnetz) → users → Konto → `role` = `admin`. Weitere Admins danach über die Admin-Seite.
Test lokal: `python dev/pocketbase/test_admin.py` (14 Fälle).

**Lokal testen:** echtes PocketBase 0.23.12 in `dev/pocketbase/` (nicht im Git): `python dev/pocketbase/setup.py admin`, dann `.claude/launch.json`
„xiru-pb“ starten (Port 8091, Hooks und Migrationen direkt aus `server/`), `python dev/pocketbase/setup.py schema` (Tabellen wie auf Maels Server),
Website: `XIRU.setting('onlineUrl', 'http://127.0.0.1:8091/api')`. Automatischer Test: `python dev/pocketbase/test_anticheat.py` (30 Fälle).
Der ältere Python-Nachbau `dev/mock-pocketbase.py` kennt Anmeldung und Hooks nicht – nur noch für einfache Oberflächen-Tests ohne Konto.

## Server (Unraid, seit 2026-10-13 öffentlich über Tailscale Funnel)

- Container `pocketbase` (Image `spectado/pocketbase:0.23.12`), im Heimnetz `http://mael.local:8090` (Unraid jetzt 192.168.0.199 hinter dem D-Link-Router).
  Daten in `/mnt/user/appdata/pocketbase/pb_data`. Admin-Oberfläche **nur im Heimnetz**: `http://mael.local:8090/_/` (Superuser legt Mael selbst an).
- Tabellen: `pocketbase-collections.json` (keys, players, scores, greets, saves, mn_feed, mn_trades, mn_takes inkl. API-Regeln), angelegt per Admin-API bzw. Import.
  Die System-Tabelle `users` wurde dafür angepasst (Feld `username`, eindeutiger Index ohne Gross/Klein, `passwordAuth.identityFields = [username]`,
  E-Mail optional, Passwort-Minimum 6, `authAlert` aus, Token 30 Tage) – siehe Abschnitt Geräte-Sync oben.
- Settings → Application → **User IP proxy headers**: `X-Forwarded-For`, „Use rightmost IP“ – sonst sehen alle Funnel-Anfragen wie `::1` aus
  und teilen sich die Rate-Limits (Tailscale setzt den Header selbst und überschreibt gefälschte Werte).
- Settings → Application → **Rate limits** an: u. a. `greets:create` 5 / 10 s, `players:create` 5 / 60 s, `*:create` 20 / 5 s, `/api/` 300 / 10 s. App-Name „Xiru-Server“.

**Öffentliche Adresse: `https://xiru.tail9e3f56.ts.net`** – das ist die **API-Wurzel** (entspricht `/api` von PocketBase).
`…ts.net/health` → PocketBase `/api/health`. Alles ausserhalb von `/api` (z. B. `/_/`) ist von aussen nicht erreichbar.
Darum ruft `online.js` Pfade **ohne** `/api` auf (`/collections/…`, `/realtime`, `/health`); im Heimnetz wäre die Adresse `http://mael.local:8090/api`.

Einstellungen im Unraid-Docker-Template (Use Tailscale = an, „Show Advanced Settings“ an):

| Feld | Wert |
|---|---|
| Tailscale Hostname | `xiru` |
| Tailscale Serve | `Funnel` |
| Tailscale Serve Port | `80` (Port im Container) |
| Tailscale Serve Local Path | `/api` |
| Tailscale Serve Path | **leer lassen** – das Unraid-Skript macht daraus `--https=443=/api`, was Tailscale 1.104 ablehnt |
| Tailscale State Directory | `/tailscale/.tailscale_state` |
| zusätzlicher Pfad | Container `/tailscale` → `/mnt/user/appdata/pocketbase/tailscale/` |

Im Tailscale-Konto (Mael, Anmeldung über GitHub) einmalig: MagicDNS + HTTPS-Zertifikate an, Funnel in der Zugriffsregel
(„Add Funnel to policy“), beim Gerät `xiru` **Disable key expiry** (sonst geht der Server nach 180 Tagen offline).
Das erste Zertifikat kann länger als die 30 s dauern, die das Unraid-Skript wartet → Container dann einfach neu starten
(Zertifikat liegt danach im State-Ordner). Logs: Unraid → Docker → pocketbase → Logs.

Die Website-Adresse steht in `XIRU.ONLINE_DEFAULT` (`assets/js/core.js`); jede:r kann sie unter Einstellungen → Online → Server ändern.

## Pflege

- Datensätze löschen/sperren in der PocketBase-Admin-Oberfläche.
- Neue Grüsse: in `online.js` (`O.GREETS`) **und** in der `greets.kind`-Auswahl ergänzen.
- Alte `greets` regelmässig löschen (z. B. alles älter als 7 Tage).
