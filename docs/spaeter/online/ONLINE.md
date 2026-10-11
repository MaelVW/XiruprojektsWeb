# Online – der Xiru-Server (geparkt)

> **Stand 2026-10-11: für den ersten Release ausgebaut.** Mael will Online erst viel später.
> Alles liegt hier in `docs/spaeter/online/` und kann so wieder eingebaut werden:
>
> 1. `online.js` → nach `assets/js/online.js` kopieren.
> 2. Im Projektordner `git apply docs/spaeter/online/online.patch` (prüfen vorher mit `git apply --check …`).
>    Der Patch enthält: core.js (Einstellungen `online`/`onlineAsked`/`onlineUrl`, `XIRU.ONLINE_DEFAULT`, `XIRU.online` mit
>    `load/enable/ask`, Start in `boot()`, `lower` im `score`-Ereignis), main.css (Stil Plakette/Liste/Weltrangliste),
>    `konto/einstellungen.html#online` (Schalter, Spitzname, Server-Adresse), `konto/profil.html` (Import der Einstellungen),
>    `datenschutz.html` (Abschnitt 5 „Online-Funktionen“, Rest neu nummeriert), `hilfe.html` (2 Fragen).
> 3. Klappt der Patch nicht mehr (Dateien haben sich inzwischen geändert): die Stellen im Patch von Hand übernehmen – er ist lesbar.
> 4. `XIRU.ONLINE_DEFAULT` auf die öffentliche **HTTPS**-Adresse des Servers setzen (siehe unten), `python tools/check_site.py`, im Browser testen.
>
> Der PocketBase-Container auf Unraid (Tabellen, Regeln, Rate-Limits) wurde dabei **nicht** verändert.

Die Website bleibt eine statische Seite (läuft auch offline). Online-Funktionen sind **freiwillig**
(Einstellung „Online“, standardmässig aus; nach dem Anmelden wird einmal gefragt) und sprechen mit
einem kleinen eigenen Server: **PocketBase** als Docker-Container auf Maels Unraid-Homeserver.

## Was online passiert

| Funktion | Wo | Daten |
|---|---|---|
| Wer ist unterwegs | Plakette unten links (alle Seiten) | Spitzname, Level, Gegend (Insel/Region), Kern-Bauteil des Mechs |
| Weltranglisten | Seitenleiste jedes Spiels in der Spielhalle | Spitzname + bester Wert je Spiel |
| Grüsse | Liste „Gerade unterwegs“ | vorgefertigte Grüsse (kein Freitext), an eine Person oder alle in der Gegend |

Kein Passwort, keine E-Mail, keine Cookies. Jeder Browser legt beim ersten Online-Gang einen
zufälligen Schlüssel an (48 Hex-Zeichen) – gespeichert in der Tabelle `keys`, die von aussen **nur
angelegt, nie gelesen** werden kann – und einen Spieler-Datensatz, der darauf verweist. Ändern darf den
Spieler nur, wer den Schlüssel mitschickt (`players.updateRule: key.secret = @request.body.secret`,
der Verweis selbst ist danach unveränderlich). Lokal gespeichert unter `xiru:online:<konto>`.
(Versteckte Felder gehen dafür nicht: PocketBase lässt sie von aussen gar nicht beschreiben.)

Code: `assets/js/online.js` (wird von core.js nur bei eingeschaltetem Online geladen, `XIRU.online`),
Schalter/Spitzname/Server-Adresse in `konto/einstellungen.html#online`, Stil am Ende von `assets/css/main.css`.

## Server einrichten (Unraid)

1. Array starten (Main → Start), dann **Apps** → nach „PocketBase“ suchen → installieren.
   Port **8090**, Daten-Ordner z. B. `/mnt/user/appdata/pocketbase`.
2. Admin-Oberfläche öffnen: `http://mael.local:8090/_/` → **Superuser selbst anlegen** (eigene E-Mail + Passwort).
3. Tabellen anlegen: `pocketbase-collections.json` (liegt hier daneben) (keys, players, scores, greets inkl. API-Regeln).
   Über Settings → Import collections oder per Admin-API (`POST /api/collections`, so am 2026-10-10 eingerichtet).
4. Settings → Application → **Rate limits** an: u. a. `greets:create` 5 / 10 s, `players:create` 5 / 60 s, `*:create` 20 / 5 s, `/api/` 300 / 10 s.
   App-Name „Xiru-Server“.
5. In der Website unter Einstellungen → Online → Server: Adresse prüfen (Standard `http://mael.local:8090`), „Testen“.

## Später: von aussen erreichbar machen (Mael)

Die Website wird bei einem Bekannten gehostet (HTTPS). Browser erlauben von einer HTTPS-Seite aus
nur Anfragen an **HTTPS**-Server. Der Xiru-Server braucht also eine öffentliche HTTPS-Adresse, z. B.
- Cloudflare Tunnel (Container „cloudflared“, kein offener Port nötig) oder
- Reverse Proxy (Nginx Proxy Manager / SWAG) + Port-Weiterleitung 443 + DynDNS.
Danach `XIRU.ONLINE_DEFAULT` in `assets/js/core.js` auf die neue Adresse setzen.

## Pflege

- Datensätze löschen/sperren in der PocketBase-Admin-Oberfläche.
- Neue Grüsse: in `online.js` (`O.GREETS`) **und** in der `greets.kind`-Auswahl ergänzen.
- Alte `greets` regelmässig löschen (z. B. alles älter als 7 Tage).
