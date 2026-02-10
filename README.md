# Moodle Downloader (DHBW Ravensburg) – Chrome Extension

**Domain:** https://elearning.dhbw-ravensburg.de/  
**Option A:** alle Dateien in einen Ordner (unter deinem normalen Downloads-Ordner)

## Installation (Windows / Chrome)

1. Entpacke dieses Projekt (oder ZIP) in einen Ordner.
2. Öffne Chrome: `chrome://extensions`
3. Schalte **Entwicklermodus** ein (rechts oben).
4. Klicke **Entpackte Erweiterung laden** und wähle den Projektordner.

## Benutzung

1. Logge dich in Moodle ein und öffne eine Kursseite (z.B. `.../course/view.php?id=...`).
2. Klicke auf das Extension-Icon (Puzzle/Toolbar).
3. **Scan aktuelle Seite** → es werden Links gefunden.
4. Optional: Ordnernamen anpassen.
5. **Download alle Dateien**.

### Hinweise / typische Stolpersteine

- In Chrome ist es am besten, wenn **"Vor jedem Download nach Speicherort fragen"** deaktiviert ist,
  sonst bekommst du viele Dialoge.
- Die Extension lädt primär `pluginfile.php`-Links (Moodle-Dateien).
- Falls ein Element nur als `mod/resource/view.php` oder `mod/folder/view.php` verlinkt ist,
  versucht die Extension die Seite zu laden und darin die `pluginfile.php`-Links zu extrahieren.
