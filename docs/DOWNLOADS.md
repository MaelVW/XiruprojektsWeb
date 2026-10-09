# Downloads hinzufügen (für Luka 😉)

Die Download-Liste steht in `studio/index.html` im Array `PROJEKTE`.

## Neues Projekt mit ZIP

1. ZIP-Datei in den Ordner `downloads/` legen (Ordner anlegen, falls er fehlt).
2. In `studio/index.html` im Array `PROJEKTE` einen Eintrag ergänzen:

```js
{ name: 'Projektname', icon: '🎮', art: 'Spiel', version: 'v1.0.0', status: 'stabil',
  beschreibung: 'Ein Satz, was es ist.',
  datei: 'projektname-v1.0.0.zip', groesse: '5 MB', seite: '' },
```

| Feld | Bedeutung |
|---|---|
| `art` | `Werkzeug`, `Spiel` oder `Web` (für die Filter) |
| `status` | `stabil`, `beta`, `alpha` oder `bald` |
| `datei` | Dateiname im Ordner `downloads/` **oder** eine volle URL (z. B. GitHub-Release). Leer = „Bald verfügbar" |
| `seite` | optional: eigene Projektseite im Ordner `studio/` (dann auch in `assets/js/site.js` eintragen) |
| `online` | `true`, wenn `datei` eine Seite dieser Website ist (z. B. ein Browserspiel) |

## Hinweis

Bezahl-Downloads gibt es bewusst nicht mehr: Ohne Server lässt sich ein Download nicht schützen
(jede Datei in `downloads/` ist für alle erreichbar, die den Namen kennen).

## Xiru Desktop Tools

Die C#-WinForms-Projekte liegen in `studio/apps/`. Zum Erstellen oder Aktualisieren der drei
Windows-x64-Pakete auf einem Windows-Rechner mit .NET 10 SDK:

```powershell
.\studio\apps\package.ps1
```

Das Skript veröffentlicht framework-dependent Apps und legt je ein ZIP in `downloads/` ab.
Auf dem Ziel-PC wird die kostenlose .NET 10 Desktop Runtime benötigt; die Download-Karten weisen
darauf hin. Quellcode und Funktionsübersicht stehen in `studio/apps/README.md`.
