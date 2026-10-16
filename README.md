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

- Drei Layouts: Schildkröte, Brücke und Lotus. Jedes Layout gibt es in Leicht (48 Steine), Mittel (96 Steine) und Schwer (144 Steine). Die Auswahl gilt ab dem nächsten neuen Spiel. Ältere Spielstände mit 112 Steinen bleiben spielbar.
- Zwei gleiche, freie Steine antippen. Frei bedeutet: kein Stein darüber und mindestens eine offene Seite der ursprünglichen Reihe.
- Im Hochformat wird das Feld gedreht, die Symbole bleiben aufrecht. Die Reihen verlaufen dann senkrecht; eine offene Seite bedeutet oben oder unten. Standardmäßig sehen alle Steine gleich hell aus. „Freie Steine hervorheben“ lässt sich in den Einstellungen aktivieren und wird auf diesem Gerät gespeichert.
- Alle Startstellungen sind durch eine gültige vollständige Abbaufolge garantiert lösbar. Eigene Züge können eine Sackgasse erzeugen.
- „Zurück“, „Hinweis“, „Mischen“ und „Reset“ liegen im Hochformat unten und im Querformat als vertikale Leiste rechts, in der Höhe zentriert. Das Spielfeld hält Abstand zur Leiste; ihre Höhe passt sich an niedrige Fenster an. Mischen und Reset öffnen zuerst eine Bestätigung; Abbrechen ist vorausgewählt. Mischen verteilt nur die verbleibenden Steine neu und lösbar und leert den Zugverlauf. Reset stellt dieselbe ursprüngliche Startstellung wieder her, auch nach dem Mischen. Ist die Restgeometrie nicht auflösbar, bleibt der Spielstand beim Mischen unverändert.
- Passende Steine fliegen zur Bildschirmmitte, stoßen einmal zusammen und zerfallen beim Auseinandergehen in Bruchstücke mit einem kurzen Lichtimpuls.
- Deutliche Seitenkanten, ein größerer Versatz und stärkere Schatten unter erhöhten Steinen machen die Ebenen sichtbar. Die Steinflächen bleiben einheitlich.
- Auf Tablets wird zusätzlicher Abstand unterhalb der oberen sicheren Bildschirmzone reserviert.
- Oben rechts öffnet das Plus „Neues Spiel“ mit Layout und Schwierigkeit. Der Einstellungsbutton daneben öffnet ein separates Overlay für Hell/Dunkel/System, die optionale Hervorhebung und die Anleitung. Schließen oder Escape ändert die laufende Runde nicht.
- Dialoge haben einen festen Kopfbereich mit Titel und Einleitung sowie feste Aktionen am Ende. Nur der mittlere Inhalt scrollt, auch per Tastatur. Bei niedrigen Fenstern wird der Kopfbereich kompakter.
- Hinweise erscheinen oben mittig zwischen Spielstand und den beiden Bedienelementen; auf kleinen Displays umbrechen sie innerhalb des freien Platzes.
- Pinch-Zoom: Auf dem Spielfeld zwei Finger auseinanderziehen oder die Zoomgeste auf dem Trackpad verwenden. Danach mit einem Finger oder der Maus verschieben. Browser-Doppeltap-Zoom ist deaktiviert. Der Spielfeld-Zoom reicht von 1× bis 3×.
- Tastatur: Tab zu einem freien Stein, Pfeiltasten zum nächsten freien Stein, Enter/Leertaste zum Auswählen; H für Hinweis, M für Mischen, R für Reset, Strg/⌘ + Z für Zurück, +/− für Zoom, 0 oder Escape für die Gesamtansicht.
- Spielstand und Darstellung werden auf diesem Gerät gespeichert, sofern der Browser lokalen Speicher erlaubt. Kein Backend, kein Tracking, kein Konto. Bei eingeschränktem Speicher kann die Runde trotzdem gespielt werden.
- Animationen beachten die Systemeinstellung für reduzierte Bewegung.

## Arcade-Modus

In den Einstellungen lässt sich „Arcade-Modus“ einschalten. Die Auswahl gilt ab dem nächsten neuen Spiel; die laufende Runde bleibt in ihrem Modus. Arcade ist standardmäßig aus. Die Classic-Spielansicht und ihre kostenlosen Hilfen bleiben unverändert.

- Jedes Paar bringt 100 Punkte, ohne Zeitlimit oder Zeitbonus. Die Leiste zeigt drei Kristalle bei 50 %, 75 % und 100 % der möglichen Punkte, passend zur Steinezahl der Runde. Beim Erreichen leuchten sie kurz auf. Punktabzüge können die Bewertung wieder senken.
- Ein Hinweis kostet 1 Kristall und 100 Punkte. Mischen kostet 2 Kristalle und 300 Punkte. Rückgängig kostet 1 Kristall und nimmt die Punkte des wiederhergestellten Paares zurück. Punktabzüge werden auch bei einem sichtbaren Punktestand von 0 weiter verrechnet. Ohne ausreichendes Guthaben sind die Hilfen einschließlich ihrer Tastenkürzel gesperrt.
- Abgebrochene und fehlgeschlagene Aktionen kosten nichts. Reset bleibt kostenlos, setzt die Rundenpunkte und Punktabzüge zurück und erstattet keine ausgegebenen Kristalle.
- Das Profil beginnt einmalig mit Level 1 und 5 Kristallen. Jede gewonnene Arcade-Runde bringt ein Level und die am Ende erreichten Kristalle. Der Sieg zeigt die Belohnung und den animierten Levelaufstieg. Schwierigkeit und Layout bleiben frei wählbar.
- Dieselbe Runde wird nur einmal belohnt, auch nach Neuladen, Rückgängig oder Reset. Profil, Modusauswahl, Runde und Belohnungsbeleg werden zusammen auf diesem Gerät gespeichert. Classic-Spiele verändern das Arcade-Profil nicht.
- Level, Guthaben, Punkteleiste, Preise und der Pandakopf erscheinen ausschließlich in Arcade. Der Panda wird lokal mitgeliefert und funktioniert offline. Alle neuen Animationen beachten reduzierte Bewegung.
- Das Arcade-Panel sitzt mittig im HUD, auf schmalen Handys in einer zweiten Zeile. Die Kristalle auf der Leiste haben keinen Hintergrund. Tool-Preise stehen als kleine Indikatoren oben rechts am jeweiligen Button; bei zu wenig Kristallen wird das Tool ausgegraut.
- Bei einem gefundenen Paar, einem Klick auf den Panda oder seiner Aktivierung mit Enter/Leertaste zeigt er kurz einen von drei anderen Gesichtsausdrücken: Zwinkern, Lachen oder Staunen. Der Panda in der Ecke ist bis zu 112 Pixel breit und passt sich bei wenig Platz an. Spielfeld und Werkzeugleiste lassen auch für seine Animation genügend Abstand; im Querformat erhält er einen eigenen Seitenbereich. Bei einem Paarfund vergrößert er sich kurz und neigt sich leicht gegen den Uhrzeigersinn. Nach 1,6 Sekunden kehrt das Standardgesicht zurück. Wiederholtes Klicken startet die Zeit neu und wählt einen anderen Ausdruck. Eine ausgewählte Spielkachel bleibt dabei ausgewählt. Im „Gelöst“-Overlay sitzt der Panda größer und oben mittig über der Überschrift und bleibt anklickbar. Alle Gesichter funktionieren offline.

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

Arcade-Tests prüfen Bewertungsgrenzen aller Schwierigkeiten, Punktabzüge, Kosten, leeres Guthaben, Moduswechsel, Speichern, einmalige Belohnungen, Reset, Animationen, kleine Bildschirme und das Offline-Maskottchen. Regeltests prüfen Blockierung, gültige Paarzüge, die komplette Lösbarkeit aller Layouts über mehrere Zufallsstarts, Rückgängig, Mischen, Reset, alle neun Layout-/Schwierigkeitskombinationen und ältere bzw. beschädigte Spielstände. Browsertests prüfen Bedienung, Speichern, kleine Smartphones und iPad-Hoch-/Querformat mit simulierter sicherer Bildschirmzone, Bestätigungen für Mischen und Reset, Schwierigkeitsauswahl, Pinch-/Trackpad-Zoom, optionale Hervorhebung, die mittige Trefferanimation, reduzierte Bewegung und Offline-Neuladen. WebKit-Offline ist im automatisierten Test ausgenommen, weil Playwright dort Service Worker nicht bereitstellt; für installierte Safari-PWAs ist ein Gerätetest erforderlich. Chromium und WebKit wurden lokal geprüft; der vorhandene Firefox-Testbrowser startet auf diesem Rechner wegen eines Profilfehlers nicht. Firefox-Verifikation steht deshalb noch aus.

## GitHub Pages

Für GitHub Pages steht ein automatischer Workflow bereit.

1. Änderungen in `paranerd/mahjong` auf den Branch `main` pushen.
2. Im Repository **Settings → Pages → Source: GitHub Actions** einstellen.
3. Der Workflow `.github/workflows/deploy.yml` prüft, baut und veröffentlicht die App bei einem Push auf `main` oder manuell über „Run workflow“.
4. Zieladresse: https://paranerd.github.io/mahjong/.

Alle Asset-, Manifest- und Service-Worker-Pfade sind relativ. Die App funktioniert unter `/mahjong/` ebenso wie im Wurzelverzeichnis. Es werden nur statische Dateien aus `dist/` veröffentlicht.

## Aufbau

- `src/game.ts`: Spielregeln, Layouts, lösbare Verteilung, Speicherung prüfen.
- `src/arcade.ts`: Punkte, Kristallkosten, Bewertung, Profil und einmalige Belohnungen.
- `src/assets/panda.png`: lokal mitgelieferter Pandakopf; Erstellungsnotizen in `src/assets/panda.md`.
- `src/main.ts`: Oberfläche, Eingaben, Animationen und PWA-Registrierung.
- `src/faces.ts`: lokal erzeugte SVG-Symbole für alle 36 Steinmotive.
- `src/style.scss`: Bildschirmaufteilung, Darstellung und Animationen.
- `public/`: Manifest, Service Worker und App-Icons.
- `vite.config.ts`: relativer Build und automatische Offline-Dateiliste mit Inhaltsversion.
