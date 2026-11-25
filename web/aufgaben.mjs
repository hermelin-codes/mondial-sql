// Übungsaufgaben für /aufgaben/. Jede Lösung wird beim Build gegen die Datenbank ausgeführt
// und muss mindestens eine Zeile liefern, sonst bricht der Build ab.
// Felder: id (Anker), title, task, hint, solution, note (optional, Erklärung nach der Lösung).

export const LEVELS = [
  {
    title: 'Einstieg',
    intro: 'Eine Tabelle, filtern, sortieren, zählen.',
    tasks: [
      {
        id: 'bevoelkerungsreichste-laender',
        title: 'Länder mit über 100 Millionen Einwohnern',
        task: 'Gib Name und Einwohnerzahl aller Länder mit mehr als 100 Millionen Einwohnern aus, die größten zuerst.',
        hint: 'Alles steht in der Tabelle Country. Du brauchst WHERE und ORDER BY … DESC.',
        solution: `SELECT Name, Population
FROM Country
WHERE Population > 100000000
ORDER BY Population DESC;`,
      },
      {
        id: 'flaechengroesste-laender',
        title: 'Die zehn flächengrößten Länder',
        task: 'Welche zehn Länder haben die größte Fläche? Gib Name und Fläche aus.',
        hint: 'Sortiere nach Area und begrenze das Ergebnis mit LIMIT.',
        solution: `SELECT Name, Area
FROM Country
ORDER BY Area DESC
LIMIT 10;`,
        note: 'In Oracle schreibst du statt LIMIT 10 am Ende FETCH FIRST 10 ROWS ONLY.',
      },
      {
        id: 'grosse-staedte-deutschland',
        title: 'Große Städte in Deutschland',
        task: 'Liste alle deutschen Städte mit mehr als 500.000 Einwohnern auf, sortiert nach Einwohnerzahl.',
        hint: 'In City steht das Land als Ländercode. Deutschland hat in MONDIAL den Code \'D\'.',
        solution: `SELECT Name, Population
FROM City
WHERE Country = 'D' AND Population > 500000
ORDER BY Population DESC;`,
      },
      {
        id: 'anzahl-laender',
        title: 'Wie viele Länder gibt es?',
        task: 'Zähle die Länder in der Datenbank.',
        hint: 'COUNT(*) zählt Zeilen.',
        solution: `SELECT COUNT(*) AS Anzahl
FROM Country;`,
      },
      {
        id: 'laender-mit-ma',
        title: 'Länder, die mit „Ma“ beginnen',
        task: 'Gib alle Länder aus, deren Name mit „Ma“ beginnt, alphabetisch sortiert.',
        hint: 'LIKE mit dem Platzhalter % steht für beliebig viele Zeichen.',
        solution: `SELECT Name
FROM Country
WHERE Name LIKE 'Ma%'
ORDER BY Name;`,
      },
    ],
  },
  {
    title: 'JOINs',
    intro: 'Tabellen über ihre Schlüssel verbinden.',
    tasks: [
      {
        id: 'hauptstaedte',
        title: 'Hauptstädte mit Einwohnerzahl',
        task: 'Gib für jedes Land die Hauptstadt und deren Einwohnerzahl aus.',
        hint: 'Country.Capital enthält nur den Namen der Stadt. Städtenamen sind nicht eindeutig, verbinde deshalb über Name, Land und Provinz.',
        solution: `SELECT co.Name AS Land, ci.Name AS Hauptstadt, ci.Population
FROM Country co
JOIN City ci
  ON ci.Name = co.Capital
 AND ci.Country = co.Code
 AND ci.Province = co.Province
ORDER BY ci.Population DESC;`,
        note: 'Ein Städtename wie „Frankfurt“ kommt mehrfach vor. Erst Name, Land und Provinz zusammen identifizieren eine Stadt eindeutig.',
      },
      {
        id: 'nachbarlaender-deutschland',
        title: 'Nachbarländer von Deutschland',
        task: 'Welche Länder grenzen an Deutschland? Gib ihre Namen aus.',
        hint: 'In borders steht jede Grenze nur einmal, Deutschland kann also in Country1 oder in Country2 stehen.',
        solution: `SELECT c.Name
FROM borders b
JOIN Country c
  ON c.Code = CASE WHEN b.Country1 = 'D' THEN b.Country2 ELSE b.Country1 END
WHERE 'D' IN (b.Country1, b.Country2)
ORDER BY c.Name;`,
        note: 'Alternativ zwei SELECTs mit UNION: einmal über Country1, einmal über Country2.',
      },
      {
        id: 'laender-in-afrika',
        title: 'Alle Länder in Afrika',
        task: 'Gib alle Länder aus, die (zumindest teilweise) in Afrika liegen.',
        hint: 'Die Zuordnung Land zu Kontinent steht in encompasses.',
        solution: `SELECT c.Name, e.Percentage
FROM Country c
JOIN encompasses e ON e.Country = c.Code
WHERE e.Continent = 'Africa'
ORDER BY c.Name;`,
        note: 'Percentage sagt, welcher Anteil der Fläche auf dem Kontinent liegt. Ägypten liegt zum Beispiel teilweise in Asien.',
      },
      {
        id: 'fluesse-deutschland',
        title: 'Flüsse durch Deutschland',
        task: 'Welche Flüsse fließen durch Deutschland? Gib Name und Gesamtlänge aus, die längsten zuerst.',
        hint: 'geo_River sagt, durch welche Provinzen ein Fluss fließt. Ein Fluss steht dort also mehrfach pro Land.',
        solution: `SELECT DISTINCT r.Name, r.Length
FROM geo_River g
JOIN River r ON r.Name = g.River
WHERE g.Country = 'D'
ORDER BY r.Length DESC;`,
      },
    ],
  },
  {
    title: 'Gruppieren',
    intro: 'GROUP BY, Aggregatfunktionen und HAVING.',
    tasks: [
      {
        id: 'laender-pro-kontinent',
        title: 'Länder pro Kontinent',
        task: 'Wie viele Länder liegen auf jedem Kontinent?',
        hint: 'Gruppiere encompasses nach Continent und zähle.',
        solution: `SELECT Continent, COUNT(*) AS Laender
FROM encompasses
GROUP BY Continent
ORDER BY Laender DESC;`,
        note: 'Länder auf zwei Kontinenten, etwa Russland oder die Türkei, werden bei beiden mitgezählt.',
      },
      {
        id: 'viele-nachbarn',
        title: 'Länder mit vielen Nachbarn',
        task: 'Welche Länder haben mindestens acht Nachbarländer?',
        hint: 'Bring beide Spalten von borders mit UNION ALL in eine Spalte, dann GROUP BY und HAVING.',
        solution: `SELECT c.Name, COUNT(*) AS Nachbarn
FROM (
  SELECT Country1 AS Land FROM borders
  UNION ALL
  SELECT Country2 FROM borders
) n
JOIN Country c ON c.Code = n.Land
GROUP BY c.Name
HAVING COUNT(*) >= 8
ORDER BY Nachbarn DESC;`,
      },
      {
        id: 'sprachen-pro-land',
        title: 'Länder mit den meisten Sprachen',
        task: 'Welche fünf Länder haben die meisten Einträge in der Tabelle Language?',
        hint: 'GROUP BY auf das Land, COUNT, sortieren, LIMIT.',
        solution: `SELECT c.Name, COUNT(*) AS Sprachen
FROM Language l
JOIN Country c ON c.Code = l.Country
GROUP BY c.Name
ORDER BY Sprachen DESC
LIMIT 5;`,
      },
      {
        id: 'staedte-pro-land',
        title: 'Durchschnittliche Stadtgröße',
        task: 'Berechne für jedes Land mit mindestens 50 Städten in der Datenbank die durchschnittliche Einwohnerzahl dieser Städte.',
        hint: 'WHERE filtert Zeilen vor dem Gruppieren, HAVING filtert Gruppen danach.',
        solution: `SELECT c.Name, COUNT(*) AS Staedte, ROUND(AVG(ci.Population)) AS Schnitt
FROM City ci
JOIN Country c ON c.Code = ci.Country
GROUP BY c.Name
HAVING COUNT(*) >= 50
ORDER BY Schnitt DESC;`,
      },
    ],
  },
  {
    title: 'Unterabfragen',
    intro: 'Abfragen in Abfragen, auch korreliert.',
    tasks: [
      {
        id: 'groesstes-land',
        title: 'Das größte Land ohne LIMIT',
        task: 'Finde das Land mit der größten Fläche, ohne ORDER BY und LIMIT zu verwenden.',
        hint: 'Vergleiche Area mit dem Ergebnis von SELECT MAX(Area) FROM Country.',
        solution: `SELECT Name, Area
FROM Country
WHERE Area = (SELECT MAX(Area) FROM Country);`,
      },
      {
        id: 'europa-ohne-eu',
        title: 'Europäische Länder außerhalb der EU',
        task: 'Welche Länder liegen in Europa, sind aber kein Mitglied der EU?',
        hint: 'Mitgliedschaften stehen in isMember. Mit NOT IN oder NOT EXISTS schließt du die EU-Mitglieder aus.',
        solution: `SELECT c.Name
FROM Country c
JOIN encompasses e ON e.Country = c.Code
WHERE e.Continent = 'Europe'
  AND c.Code NOT IN (
    SELECT Country FROM isMember
    WHERE Organization = 'EU' AND Type = 'member'
  )
ORDER BY c.Name;`,
        note: 'Achtung bei NOT IN: Liefert die Unterabfrage auch nur ein NULL, kommt gar nichts zurück. NOT EXISTS hat dieses Problem nicht.',
      },
      {
        id: 'ueber-kontinentschnitt',
        title: 'Bevölkerungsreicher als der Schnitt',
        task: 'Welche Länder haben mehr Einwohner als der Durchschnitt aller Länder auf ihrem Kontinent?',
        hint: 'Eine korrelierte Unterabfrage berechnet den Schnitt für den Kontinent der aktuellen Zeile.',
        solution: `SELECT c.Name, e.Continent, c.Population
FROM Country c
JOIN encompasses e ON e.Country = c.Code
WHERE c.Population > (
  SELECT AVG(c2.Population)
  FROM Country c2
  JOIN encompasses e2 ON e2.Country = c2.Code
  WHERE e2.Continent = e.Continent
)
ORDER BY e.Continent, c.Population DESC;`,
      },
      {
        id: 'hoechster-berg-pro-land',
        title: 'Höchster Berg jedes Landes',
        task: 'Gib für jedes Land seinen höchsten Berg mit Höhe aus.',
        hint: 'Verbinde geo_Mountain mit Mountain und behalte nur Berge, deren Höhe dem Maximum des Landes entspricht.',
        solution: `SELECT DISTINCT c.Name AS Land, m.Name AS Berg, m.Elevation
FROM geo_Mountain g
JOIN Mountain m ON m.Name = g.Mountain
JOIN Country c ON c.Code = g.Country
WHERE m.Elevation = (
  SELECT MAX(m2.Elevation)
  FROM geo_Mountain g2
  JOIN Mountain m2 ON m2.Name = g2.Mountain
  WHERE g2.Country = g.Country
)
ORDER BY m.Elevation DESC;`,
      },
    ],
  },
];
