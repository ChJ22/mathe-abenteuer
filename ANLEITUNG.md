# Mathe-Abenteuer mit Datenbank

Diese Version ist vorbereitet; ohne die folgenden Einrichtungsschritte bleibt sie im Gastmodus.

## 1. Supabase

Du kannst ein eigenes Supabase-Projekt anlegen oder das bestehende Sprachtrainer-Projekt verwenden. Dieses Skript legt ausschließlich `mathe_game_saves` und `mathe_save` an und verändert keine Sprachtrainer-Tabellen. Bei derselben Supabase-Instanz werden Benutzerkonten gemeinsam genutzt, die Spielstände sind getrennt.

Im SQL Editor den gesamten Inhalt von `supabase.sql` ausführen.

In `config.js` die Project URL und den öffentlichen Publishable Key eintragen (alternativ den älteren `anon`-Key). Keine Datenbank-Passwörter, `service_role`- oder `sb_secret_`-Schlüssel verwenden.

Unter Authentication → URL Configuration die GitHub-Seite als erlaubte Redirect URL ergänzen:
`https://chj22.github.io/mathe-abenteuer/`

Wenn dieses Projekt bereits den Sprachtrainer betreibt, dessen Site URL und Redirect URLs beibehalten; nur die Mathe-Adresse ergänzen. Neue Benutzer bestätigen ihre E-Mail, sofern die E-Mail-Bestätigung eingeschaltet ist.

## 2. GitHub

ZIP entpacken und diese drei Dateien direkt ins Hauptverzeichnis des Repositories hochladen:
- `index.html` (vorhandene Datei ersetzen)
- `config.js`
- `cloud.js`

Die SQL-Datei wird im Supabase SQL Editor ausgeführt, nicht auf GitHub Pages. Die HTML-Datei allein reicht für diese Version nicht mehr aus. Bestehende Pages-Einstellungen bleiben gültig.

## 3. Benutzung

- Als Gast üben: Spielstand bleibt lokal wie bisher.
- Konto erstellen oder anmelden: persönlicher Cloud-Spielstand wird geladen.
- Bestehende lokale Fortschritte mit „Gast-Spielstand übernehmen“ ausdrücklich in das Konto übertragen.
- Nach Aufgaben und Ausrüstungswechseln speichert die App automatisch. Auf „In der Cloud gespeichert“ achten, bevor das Gerät gewechselt wird.
- Bei Verbindungsproblemen bleibt der Stand in einer Gerätesicherung, die an dieses Konto gebunden ist. „Synchronisieren“ versucht erneut zu speichern.
- Jedes andere Gerät meldet sich mit dem gewünschten Konto an.
- Bei gleichzeitig geänderten Ständen zeigt die App einen Konflikt. Zuerst bei Bedarf eine Sicherung herunterladen; danach Cloud- oder Gerätestand wählen. Die erste Version führt zwei gleichzeitig veränderte Stände nicht automatisch zusammen.
- Auf gemeinsam genutzten Geräten abmelden. Konten bleiben sonst angemeldet.
- Lernstatistik wird nach Bruch-/Dezimalrechnung und Schwierigkeit aufgeschlüsselt. Ältere Aufgaben zählen in der bisherigen Gesamtstatistik weiter; die neue Aufschlüsselung beginnt mit dieser Version.
- Gespeichert werden XP, Levelgrundlage, Statistiken, Serien, Ausrüstung, Siege, Erfolge und Erfolgskarten-Schnappschüsse. PNG-Karten werden daraus beim Öffnen erzeugt, daher ist kein Bildspeicher nötig.
- Ein laufender Kampf ist gerätegebunden und startet nach dem Laden eines Spielstands neu.
- „Fortschritt zurücksetzen“ setzt auch den Kontostand beim nächsten erfolgreichen Speichern zurück.

## Prüfen nach Einrichtung

1. Zwei Konten erstellen. Bei Konto A einige Aufgaben lösen, erfolgreiche Cloud-Speicherung prüfen.
2. Abmelden, Konto B anmelden: eigener Stand ohne Fortschritt von A.
3. Konto A auf einem anderen Gerät öffnen: dessen Stand muss geladen werden.
4. Auf zwei Geräten gleichzeitig üben: bei veralteter Revision muss die Konfliktauswahl erscheinen.
5. Flugmodus einschalten, üben, Verbindung wiederherstellen und synchronisieren.
6. Supabase: ausgeloggte Besucher dürfen keine Spielstände lesen; Konto A darf den Stand von B weder lesen noch schreiben.

Frontend-Synchronisierung und Mathematik wurden automatisiert mit simulierten Serverantworten geprüft. Die SQL-Funktion und Zugriffsregeln müssen nach Einrichtung an der echten Datenbank geprüft werden. Kein Live-Projekt wurde verändert.

Technische Grundlage: Supabase Auth, RLS und revisionsgeprüfte Speicherung. Die Lern-App berechnet Fortschritte im Browser; sie ist kein manipulationssicheres Prüfungs- oder Ranglistensystem.

Supabase-Dokumentation:
https://supabase.com/docs/guides/database/postgres/row-level-security
https://supabase.com/docs/guides/api/api-keys

## Neue Szenengrafiken
Die neun modernen Blockwelt-Szenen sind direkt in index.html eingebettet. Es müssen weiterhin nur index.html, config.js und cloud.js auf GitHub hochgeladen werden. Bereits gespeicherte Erfolge erhalten automatisch die passende neue Illustration. Name, Erfolgsdatum und Spielstand bleiben erhalten.
