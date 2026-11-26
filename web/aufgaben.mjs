// Übungsaufgaben für /aufgaben/. Jede Lösung wird beim Build gegen die Datenbank ausgeführt
// und muss mindestens eine Zeile liefern, sonst bricht der Build ab.
// Felder: id (Anker), title, task, hint, solution, note (optional, Erklärung nach der Lösung).
// en: englische Fassung (id, title, task, hint, note; solution nur, wenn sich z. B. Aliasse unterscheiden).

export const LEVELS = [
  {
    title: 'Einstieg',
    en: { title: "Basics", intro: "One table: filter, sort, count." },
    intro: 'Eine Tabelle, filtern, sortieren, zählen.',
    tasks: [
      {
        id: 'bevoelkerungsreichste-laender',
        en: { id: "most-populous-countries", title: "Countries with more than 100 million people", task: "Output the name and population of all countries with more than 100 million inhabitants, largest first.", hint: "Everything is in the Country table. You need WHERE and ORDER BY … DESC." },
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
        en: { id: "largest-countries-by-area", title: "The ten largest countries by area", task: "Which ten countries have the largest area? Output name and area.", hint: "Sort by Area and limit the result with LIMIT.", note: "In Oracle you write FETCH FIRST 10 ROWS ONLY at the end instead of LIMIT 10." },
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
        en: { id: "large-cities-germany", title: "Large cities in Germany", task: "List all German cities with more than 500,000 inhabitants, sorted by population.", hint: "City stores the country as a country code. In MONDIAL, Germany has the code 'D'." },
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
        en: { id: "number-of-countries", title: "How many countries are there?", task: "Count the countries in the database.", hint: "COUNT(*) counts rows.", solution: `SELECT COUNT(*) AS Total
FROM Country;` },
        title: 'Wie viele Länder gibt es?',
        task: 'Zähle die Länder in der Datenbank.',
        hint: 'COUNT(*) zählt Zeilen.',
        solution: `SELECT COUNT(*) AS Anzahl
FROM Country;`,
      },
      {
        id: 'laender-mit-ma',
        en: { id: "countries-starting-with-ma", title: "Countries starting with “Ma”", task: "Output all countries whose name starts with “Ma”, sorted alphabetically.", hint: "LIKE with the wildcard % matches any number of characters." },
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
    en: { title: "JOINs", intro: "Combine tables through their keys." },
    intro: 'Tabellen über ihre Schlüssel verbinden.',
    tasks: [
      {
        id: 'hauptstaedte',
        en: { id: "capitals", title: "Capitals with population", task: "For each country, output its capital and the capital’s population.", hint: "Country.Capital only contains the city name. City names are not unique, so join on name, country and province.", solution: `SELECT co.Name AS Country, ci.Name AS Capital, ci.Population
FROM Country co
JOIN City ci
  ON ci.Name = co.Capital
 AND ci.Country = co.Code
 AND ci.Province = co.Province
ORDER BY ci.Population DESC;`, note: "A city name like “Frankfurt” appears more than once. Only name, country and province together identify a city." },
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
        en: { id: "neighbors-of-germany", title: "Neighbors of Germany", task: "Which countries border Germany? Output their names.", hint: "Each border appears only once in borders, so Germany can be in Country1 or in Country2.", note: "Alternatively, use two SELECTs with UNION: one via Country1, one via Country2." },
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
        en: { id: "countries-in-africa", title: "All countries in Africa", task: "Output all countries that lie (at least partly) in Africa.", hint: "The assignment of countries to continents is in encompasses.", note: "Percentage tells you which share of the area lies on the continent. Egypt, for example, lies partly in Asia." },
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
        en: { id: "rivers-through-germany", title: "Rivers through Germany", task: "Which rivers flow through Germany? Output name and total length, longest first.", hint: "geo_River lists the provinces a river flows through, so a river appears several times per country." },
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
    en: { title: "Grouping", intro: "GROUP BY, aggregate functions and HAVING." },
    intro: 'GROUP BY, Aggregatfunktionen und HAVING.',
    tasks: [
      {
        id: 'laender-pro-kontinent',
        en: { id: "countries-per-continent", title: "Countries per continent", task: "How many countries are on each continent?", hint: "Group encompasses by Continent and count.", solution: `SELECT Continent, COUNT(*) AS Countries
FROM encompasses
GROUP BY Continent
ORDER BY Countries DESC;`, note: "Countries on two continents, such as Russia or Turkey, are counted for both." },
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
        en: { id: "many-neighbors", title: "Countries with many neighbors", task: "Which countries have at least eight neighboring countries?", hint: "Use UNION ALL to put both columns of borders into one column, then GROUP BY and HAVING.", solution: `SELECT c.Name, COUNT(*) AS Neighbors
FROM (
  SELECT Country1 AS Code FROM borders
  UNION ALL
  SELECT Country2 FROM borders
) n
JOIN Country c ON c.Code = n.Code
GROUP BY c.Name
HAVING COUNT(*) >= 8
ORDER BY Neighbors DESC;` },
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
        en: { id: "languages-per-country", title: "Countries with the most languages", task: "Which five countries have the most entries in the Language table?", hint: "GROUP BY country, COUNT, sort, LIMIT.", solution: `SELECT c.Name, COUNT(*) AS Languages
FROM Language l
JOIN Country c ON c.Code = l.Country
GROUP BY c.Name
ORDER BY Languages DESC
LIMIT 5;` },
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
        en: { id: "average-city-size", title: "Average city size", task: "For every country with at least 50 cities in the database, compute the average population of those cities.", hint: "WHERE filters rows before grouping, HAVING filters groups afterwards.", solution: `SELECT c.Name, COUNT(*) AS Cities, ROUND(AVG(ci.Population)) AS Average
FROM City ci
JOIN Country c ON c.Code = ci.Country
GROUP BY c.Name
HAVING COUNT(*) >= 50
ORDER BY Average DESC;` },
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
    en: { title: "Subqueries", intro: "Queries inside queries, including correlated ones." },
    intro: 'Abfragen in Abfragen, auch korreliert.',
    tasks: [
      {
        id: 'groesstes-land',
        en: { id: "largest-country", title: "The largest country without LIMIT", task: "Find the country with the largest area without using ORDER BY and LIMIT.", hint: "Compare Area with the result of SELECT MAX(Area) FROM Country." },
        title: 'Das größte Land ohne LIMIT',
        task: 'Finde das Land mit der größten Fläche, ohne ORDER BY und LIMIT zu verwenden.',
        hint: 'Vergleiche Area mit dem Ergebnis von SELECT MAX(Area) FROM Country.',
        solution: `SELECT Name, Area
FROM Country
WHERE Area = (SELECT MAX(Area) FROM Country);`,
      },
      {
        id: 'europa-ohne-eu',
        en: { id: "europe-outside-eu", title: "European countries outside the EU", task: "Which countries are in Europe but not members of the EU?", hint: "Memberships are in isMember. Use NOT IN or NOT EXISTS to exclude the EU members.", note: "Careful with NOT IN: if the subquery returns even a single NULL, nothing comes back. NOT EXISTS does not have this problem." },
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
        en: { id: "above-continent-average", title: "More populous than average", task: "Which countries have more inhabitants than the average of all countries on their continent?", hint: "A correlated subquery computes the average for the continent of the current row." },
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
        en: { id: "highest-mountain-per-country", title: "Highest mountain of each country", task: "For each country, output its highest mountain with its elevation.", hint: "Join geo_Mountain with Mountain and keep only mountains whose elevation equals the country’s maximum.", solution: `SELECT DISTINCT c.Name AS Country, m.Name AS Mountain, m.Elevation
FROM geo_Mountain g
JOIN Mountain m ON m.Name = g.Mountain
JOIN Country c ON c.Code = g.Country
WHERE m.Elevation = (
  SELECT MAX(m2.Elevation)
  FROM geo_Mountain g2
  JOIN Mountain m2 ON m2.Name = g2.Mountain
  WHERE g2.Country = g.Country
)
ORDER BY m.Elevation DESC;` },
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
