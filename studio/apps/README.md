# Xiru Desktop Tools

Drei kleine Windows-Desktopprogramme in C# und WinForms:

- **Xiru Rechner** – Grundrechenarten, Klammern, Tastaturbedienung und RGB-, Nacht-, CRT-, PIXMAG- und Hell-Farbwelten.
- **Xiru Pausenplaner** – Fokus-/Pausenintervalle, anpassbare Dauer und eine Erinnerung beim Wechsel.
- **Xiru Code-Notizbuch** – mehrere lokale Code-Notizen, automatische Speicherung, Sprachwahl, Kopieren und Export.

## Starten

Die Downloads enthalten startfertige Windows-x64-Programme. Installiere bei Bedarf das kostenlose
[.NET 10 Desktop Runtime](https://dotnet.microsoft.com/download/dotnet/10.0) (Windows Desktop Runtime),
entpacke das ZIP und starte die enthaltene EXE. Es wird keine Anmeldung benötigt.

Notizbuch-Dateien liegen als lesbare JSON-Dateien lokal unter `%LOCALAPPDATA%\XiruProjects\CodeNotizbuch`.
Es gibt keine Cloud-Synchronisierung oder Netzwerkverbindung. Speichere dort keine Passwörter,
Schlüssel oder andere Geheimnisse.

Der Pausenplaner zählt die aktive Fokuszeit pro geöffneter Sitzung; diese Statistik wird nicht dauerhaft gespeichert.

## Quellcode bauen

Mit dem .NET 10 SDK auf Windows im Projektordner:

```powershell
dotnet build Xiru.Rechner\Xiru.Rechner.csproj -c Release
dotnet build Xiru.Pausenplaner\Xiru.Pausenplaner.csproj -c Release
dotnet build Xiru.CodeNotizbuch\Xiru.CodeNotizbuch.csproj -c Release
```

`package.ps1` baut die drei Projekte und erzeugt die Download-ZIPs im Repository-Ordner `downloads/`.
