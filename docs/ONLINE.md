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
| Geräte-Sync | Einstellungen → Online, Anmeldeseite | Kontoname + Passwort (Server speichert nur den Hash), Spielstand, grobe Gerätebezeichnung |

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
Nie übertragen: API-Schlüssel, Liminal-Teil (`why-*`, `liminal-*`, Besuche dort), lokaler Spielzeit-Zähler (`local-usage`).
Prüfung beim Einlesen: `XIRU.savegame` in core.js (gleiche Prüfung wie beim Datei-Import).

Code: `assets/js/online.js` (wird von core.js nur bei eingeschaltetem Online geladen, `XIRU.online`),
Schalter/Spitzname/Server-Adresse in `konto/einstellungen.html#online`, Stil am Ende von `assets/css/main.css`.

## Server (Unraid, seit 2026-10-13 öffentlich über Tailscale Funnel)

- Container `pocketbase` (Image `spectado/pocketbase:0.23.12`), im Heimnetz `http://mael.local:8090` (Unraid jetzt 192.168.0.199 hinter dem D-Link-Router).
  Daten in `/mnt/user/appdata/pocketbase/pb_data`. Admin-Oberfläche **nur im Heimnetz**: `http://mael.local:8090/_/` (Superuser legt Mael selbst an).
- Tabellen: `pocketbase-collections.json` (keys, players, scores, greets, saves inkl. API-Regeln), angelegt per Admin-API.
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
