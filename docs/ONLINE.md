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

**Einrichtung auf dem Server (einmalig, macht Mael in der Admin-Oberfläche `http://mael.local:8090/_/`):**
1. Tabelle **players** → Bearbeiten → vier Felder hinzufügen: `party` (Plain text, Max 20), `kit` (JSON, Max size 4000), `mn` (JSON, Max size 1000), `mns` (Number, Min 0, Max 1000000, „No decimals“). Speichern.
2. Settings → **Import collections** → Inhalt von `docs/pocketbase-mmo-import.json` einfügen → **„Merge“ anhaken** (sonst würden alle anderen Tabellen gelöscht!) →
   in der Vorschau dürfen nur **drei neue** Tabellen (`mn_feed`, `mn_trades`, `mn_takes`) stehen, nichts Rotes/Gelöschtes → Import bestätigen.
   (Die Datei verweist auf die players-Tabelle per ID `pbc_3072146508` – das ist die ID auf Maels Server. Auf einem neuen Server die ID dort ersetzen.)
3. Optional: Settings → Rate limits: `mn_feed:create` 8 / 10 s, `mn_trades:create` 5 / 60 s, `mn_takes:create` 5 / 60 s.
4. Pflege: alte `mn_feed`-Einträge gelegentlich löschen (älter als ~60 Tage; Ranglisten brauchen nur den laufenden Monat bzw. die Woche).

**Lokal testen ohne echten Server:** `dev/mock-pocketbase.py` (Nachbau der API inkl. Regeln, Realtime und Test-Helfern `/_mock/seed`, `/_mock/dump`),
starten über `.claude/launch.json` „xiru-mock“ (Port 8099), dann `XIRU.setting('onlineUrl', 'http://localhost:8099')`. `dev/` wird nicht veröffentlicht.

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
