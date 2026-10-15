# Mahjong

Ein ruhiger Moment. Minimalistisches, deutsches Mahjong Solitaire mit TypeScript und SCSS, ohne UI-Framework, externe Schriften oder Bilddienste.

## Lokal starten

Voraussetzung: Node.js 24 und npm.

```sh
npm ci
npm run dev
```

Die Entwicklungsansicht ist unter der im Terminal angezeigten Adresse erreichbar. Für die vollständige Offline-PWA den Produktionsbuild verwenden:

```sh
npm run build
npm run preview
```

Standardadresse der Produktionsvorschau: http://127.0.0.1:4173/.

## Spiel

- Drei Layouts: Schildkröte (144 Steine), Brücke und Lotus (je 112 Steine).
- Zwei gleiche, freie Steine antippen. Frei bedeutet: kein Stein darüber und mindestens eine offene Seite der ursprünglichen Reihe.
- Im Hochformat wird das Feld gedreht, die Symbole bleiben aufrecht. Die Reihen verlaufen dann senkrecht; eine offene Seite bedeutet oben oder unten. Standardmäßig sehen alle Steine gleich hell aus. „Freie Steine hervorheben“ lässt sich in den Einstellungen aktivieren und wird auf diesem Gerät gespeichert.
- Alle Startstellungen sind durch eine gültige vollständige Abbaufolge garantiert lösbar. Eigene Züge können eine Sackgasse erzeugen.
- „Zurück“, „Hinweis“ und „Reset“ liegen am unteren Bildschirmrand. Reset stellt dieselbe ursprüngliche Startstellung wieder her und leert den Zugverlauf.
- Passende Steine fliegen zur Bildschirmmitte, stoßen einmal zusammen und zerfallen beim Auseinandergehen in Bruchstücke mit einem kurzen Lichtimpuls.
- Das Menü enthält neue Spiele, Hell/Dunkel/System, die optionale Hervorhebung und die Anleitung.
- Pinch-Zoom: Auf dem Spielfeld zwei Finger auseinanderziehen oder die Zoomgeste auf dem Trackpad verwenden. Danach mit einem Finger oder der Maus verschieben. Browser-Doppeltap-Zoom ist deaktiviert. Der Spielfeld-Zoom reicht von 1× bis 3×.
- Tastatur: Tab zu einem freien Stein, Pfeiltasten zum nächsten freien Stein, Enter/Leertaste zum Auswählen; H für Hinweis, R für Reset, Strg/⌘ + Z für Zurück, +/− für Zoom, 0 oder Escape für die Gesamtansicht.
- Spielstand und Darstellung werden auf diesem Gerät gespeichert, sofern der Browser lokalen Speicher erlaubt. Kein Backend, kein Tracking, kein Konto. Bei eingeschränktem Speicher kann die Runde trotzdem gespielt werden.
- Animationen beachten die Systemeinstellung für reduzierte Bewegung.

## Offline und Installation

Der Produktionsbuild speichert beim ersten erfolgreichen Laden alle benötigten Dateien in einem Service Worker. Nach abgeschlossener Vorbereitung funktioniert auch das Neuladen ohne Internet. HTTPS oder localhost ist erforderlich.

Installation ist browserabhängig: In unterstützten Browsern erscheint im Menü „App installieren“. Auf iPhone/iPad in Safari „Teilen → Zum Home-Bildschirm“ verwenden. Der Offline-Modus funktioniert auch ohne Installation. Löschen der Browserdaten entfernt Cache und Spielstand. Betriebssysteme können Webspeicher bei Platzmangel entfernen.

Updates werden beim nächsten vollständigen Öffnen übernommen; die laufende Runde wird nicht automatisch neu geladen. Der Cache ist pro Installationspfad getrennt.

## Prüfungen

```sh
npm test
npm run build
# Produktionsvorschau parallel laufen lassen:
npm run preview
# Einmalig, falls die Testbrowser noch fehlen:
npx playwright install chromium firefox webkit
npx playwright test
```

Regeltests prüfen Blockierung, gültige Paarzüge, die komplette Lösbarkeit aller Layouts über mehrere Zufallsstarts, Rückgängig, Reset und beschädigte Spielstände. Browsertests prüfen Bedienung, Speichern, fünf Bildschirmgrößen, Pinch-/Trackpad-Zoom, optionale Hervorhebung, die mittige Trefferanimation, reduzierte Bewegung und Offline-Neuladen. WebKit-Offline ist im automatisierten Test ausgenommen, weil Playwright dort Service Worker nicht bereitstellt; für installierte Safari-PWAs ist ein Gerätetest erforderlich. Chromium und WebKit wurden lokal geprüft; der vorhandene Firefox-Testbrowser startet auf diesem Rechner wegen eines Profilfehlers nicht. Firefox-Verifikation steht deshalb noch aus.

## GitHub Pages

Die Veröffentlichung ist vorbereitet, wurde aber noch nicht ausgeführt.

1. Die Dateien in `paranerd/mahjong` auf den Branch `main` übernehmen.
2. Im Repository **Settings → Pages → Source: GitHub Actions** einstellen.
3. Der Workflow `.github/workflows/deploy.yml` prüft, baut und veröffentlicht die App bei einem Push auf `main` oder manuell über „Run workflow“.
4. Zieladresse: https://paranerd.github.io/mahjong/.

Alle Asset-, Manifest- und Service-Worker-Pfade sind relativ. Die App funktioniert unter `/mahjong/` ebenso wie im Wurzelverzeichnis. Es werden nur statische Dateien aus `dist/` veröffentlicht.

## Aufbau

- `src/game.ts`: Spielregeln, Layouts, lösbare Verteilung, Speicherung prüfen.
- `src/main.ts`: Oberfläche, Eingaben, Animationen und PWA-Registrierung.
- `src/faces.ts`: lokal erzeugte SVG-Symbole für alle 36 Steinmotive.
- `src/style.scss`: Bildschirmaufteilung, Darstellung und Animationen.
- `public/`: Manifest, Service Worker und App-Icons.
- `vite.config.ts`: relativer Build und automatische Offline-Dateiliste mit Inhaltsversion.
