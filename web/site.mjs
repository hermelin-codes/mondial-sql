// Texte und Einstellungen der Website. HTML ist nur dort erlaubt, wo es dabei steht.

export const SITE = {
  name: 'Mondial SQL',
  logo: 'mondial · sql',   // Schriftzug oben links
  // Basis-URL für Canonical-Links, Sitemap und Vorschaubilder. Beim Build über SITE_URL überschreibbar.
  url: 'https://mondial-sql.pages.dev',
  repo: 'https://github.com/hermelin-codes/mondial-sql',
  lang: 'de',   // Standardsprache, Englisch liegt unter /en/
};

export const MONDIAL = {
  homepage: 'https://www.dbis.informatik.uni-goettingen.de/Mondial/',
  license: 'https://creativecommons.org/licenses/by/3.0/deed.de',
  copy: 'https://github.com/ullenboom/mondial-database',
};
// Lizenztext je Sprache
export const LICENSE_URL = {
  de: 'https://creativecommons.org/licenses/by/3.0/deed.de',
  en: 'https://creativecommons.org/licenses/by/3.0/deed.en',
};

export const HOME = {
  de: {
  title: 'SQL üben mit der Mondial-Datenbank – online im Browser',
  description: 'SQL online üben mit der MONDIAL-Geodatenbank: Abfragen direkt im Browser ausführen, Tabellen im ER-Diagramm sehen, Fehler erklärt bekommen. Kostenlos, ohne Installation.',
  h1: 'SQL üben mit der Mondial-Datenbank',
  sub: 'Direkt im Browser, ohne Installation. Deine Abfragen laufen lokal in SQLite.',
  },
  en: {
    title: 'Practice SQL with the Mondial Database – online in your browser',
    description: 'Practice SQL online with the MONDIAL geography database: run queries right in your browser, see the tables in an ER diagram and get errors explained. Free, no installation.',
    h1: 'Practice SQL with the Mondial Database',
    sub: 'Right in your browser, no installation. Your queries run locally in SQLite.',
  },
};

// FAQ auf der Startseite, je Sprache (sichtbar im Fuß und als FAQPage-JSON-LD). Antworten als Klartext.
export const FAQ = {
  de: [
  {
    q: 'Was ist die Mondial-Datenbank?',
    a: 'MONDIAL ist eine geografische Beispieldatenbank von Wolfgang May (Universität Göttingen) mit Ländern, Städten, Provinzen, Flüssen, Seen, Bergen, Wüsten, Inseln, Sprachen, Religionen und internationalen Organisationen. Sie wird an vielen Hochschulen in Datenbank-Vorlesungen zum Üben von SQL verwendet.',
  },
  {
    q: 'Brauche ich eine Installation oder ein Konto?',
    a: 'Nein. Die komplette Datenbank wird beim Öffnen der Seite in deinen Browser geladen (etwa 3 MB), danach laufen alle Abfragen lokal.',
  },
  {
    q: 'Welcher SQL-Dialekt wird verwendet?',
    a: 'SQLite. Die meisten Abfragen aus Vorlesungen funktionieren unverändert. Wenn ihr Oracle verwendet, gibt es ein paar Unterschiede: EXCEPT statt MINUS, IFNULL statt NVL und LIMIT statt FETCH FIRST oder ROWNUM.',
  },
  {
    q: 'Werden meine Abfragen gespeichert oder hochgeladen?',
    a: 'Nein. Abfragen werden nur in deinem Browser ausgeführt, der Verlauf liegt nur auf deinem Gerät. Erst wenn du auf „ChatGPT fragen“ oder „Claude fragen“ klickst, wird deine Abfrage samt Fehlermeldung an den gewählten Dienst übergeben.',
  },
  {
    q: 'Was zeigt das Diagramm neben dem Editor?',
    a: 'Alle Tabellen und ihre Verknüpfungen. Tabellen, die deine Abfrage benutzt, werden hervorgehoben. Mit dem Mausrad oder zwei Fingern zoomst du, durch Ziehen verschiebst du das Diagramm. Der Reiter „Ablauf“ zeigt, in welcher Reihenfolge die Teile einer Abfrage ausgewertet werden.',
  },
  {
    q: 'Gibt es Übungsaufgaben mit Lösungen?',
    a: 'Ja, unter Aufgaben findest du Übungen vom Einstieg bis zu korrelierten Unterabfragen, jeweils mit Hinweis, Lösung und Link direkt in den Trainer.',
  },
  ],
  en: [
  {
    q: 'What is the Mondial database?',
    a: 'MONDIAL is a sample geography database by Wolfgang May (University of Göttingen) with countries, cities, provinces, rivers, lakes, mountains, deserts, islands, languages, religions and international organizations. Many universities use it in database courses to practice SQL.',
  },
  {
    q: 'Do I need to install anything or create an account?',
    a: 'No. The whole database is loaded into your browser when you open the page (about 3 MB). After that, all queries run locally.',
  },
  {
    q: 'Which SQL dialect is used?',
    a: 'SQLite. Most queries from lectures work unchanged. If your course uses Oracle, there are a few differences: EXCEPT instead of MINUS, IFNULL instead of NVL and LIMIT instead of FETCH FIRST or ROWNUM.',
  },
  {
    q: 'Are my queries stored or uploaded?',
    a: 'No. Queries run only in your browser and the history stays on your device. Only when you click “Ask ChatGPT” or “Ask Claude” is your query, including the error message, passed to the service you chose.',
  },
  {
    q: 'What does the diagram next to the editor show?',
    a: 'All tables and how they are linked. Tables used by your query are highlighted. Zoom with the mouse wheel or two fingers and drag to move the diagram. The “Order” tab shows the order in which the parts of a query are evaluated.',
  },
  {
    q: 'Are there exercises with solutions?',
    a: 'Yes, under Exercises you will find tasks from the basics up to correlated subqueries, each with a hint, a solution and a link straight into the trainer.',
  },
  ],
};

// Kurzbeschreibungen für die Schema-Seite, je Sprache.
export const TABLE_INFO = {
  de: {
  Country: 'Alle Länder mit Ländercode, Hauptstadt, Fläche (km²) und Einwohnerzahl. Der Code (zum Beispiel D für Deutschland) ist der Schlüssel, auf den fast alle anderen Tabellen verweisen.',
  City: 'Städte mit Land, Provinz, Einwohnerzahl und Koordinaten. Eindeutig ist eine Stadt erst über Name, Land und Provinz zusammen.',
  Province: 'Verwaltungseinheiten (Bundesländer, Regionen, Bundesstaaten) mit Einwohnern, Fläche und Hauptstadt.',
  Continent: 'Die fünf Kontinente mit ihrer Fläche.',
  encompasses: 'Ordnet Länder Kontinenten zu. Percentage ist der Flächenanteil auf dem Kontinent; Länder wie Russland oder die Türkei stehen deshalb zweimal drin.',
  borders: 'Gemeinsame Grenzen zweier Länder mit Länge in km. Jede Grenze steht nur einmal, das Land kann also in Country1 oder Country2 stehen.',
  Economy: 'Wirtschaftsdaten je Land: BIP, Anteile von Landwirtschaft, Industrie und Dienstleistung, Inflation und Arbeitslosigkeit.',
  Politics: 'Unabhängigkeitsdatum, frühere Abhängigkeit und Regierungsform je Land.',
  Population: 'Bevölkerungswachstum und Säuglingssterblichkeit je Land.',
  Countrypops: 'Einwohnerzahlen der Länder in verschiedenen Jahren.',
  Citypops: 'Einwohnerzahlen der Städte in verschiedenen Jahren.',
  Provpops: 'Einwohnerzahlen der Provinzen in verschiedenen Jahren.',
  Countrylocalname: 'Name eines Landes in der Landessprache.',
  Countryothername: 'Weitere Namen eines Landes.',
  Citylocalname: 'Name einer Stadt in der Landessprache, oft in eigener Schrift.',
  Cityothername: 'Weitere Namen und Schreibweisen einer Stadt.',
  Provincelocalname: 'Name einer Provinz in der Landessprache.',
  Provinceothername: 'Weitere Namen einer Provinz.',
  Language: 'Gesprochene Sprachen je Land mit Anteil an der Bevölkerung.',
  Religion: 'Religionen je Land mit Anteil an der Bevölkerung.',
  EthnicGroup: 'Ethnische Gruppen je Land mit Anteil an der Bevölkerung.',
  Organization: 'Internationale Organisationen mit Abkürzung, Sitz und Gründungsdatum.',
  isMember: 'Mitgliedschaften von Ländern in Organisationen. Type unterscheidet zum Beispiel member, observer und candidate.',
  Airport: 'Flughäfen mit IATA-Code, Stadt, Koordinaten, Höhe und Zeitzone.',
  River: 'Flüsse mit Länge, Quelle und Mündung. River, Lake und Sea geben an, wohin der Fluss mündet.',
  Lake: 'Seen mit Fläche, Tiefe und Höhenlage. River ist der Abfluss.',
  Sea: 'Meere und Ozeane mit Fläche und maximaler Tiefe.',
  Mountain: 'Berge mit Höhe, Gebirge und Typ (zum Beispiel Vulkan).',
  Desert: 'Wüsten mit Fläche und Koordinaten.',
  Island: 'Inseln mit Fläche, Höhe und Inselgruppe.',
  mergesWith: 'Welche Meere aneinandergrenzen.',
  RiverThrough: 'Flüsse, die durch einen See fließen.',
  islandIn: 'In welchem Meer, See oder Fluss eine Insel liegt.',
  located: 'Städte, die an einem Fluss, See oder Meer liegen.',
  locatedOn: 'Städte, die auf einer Insel liegen.',
  LakeOnIsland: 'Seen auf Inseln.',
  RiverOnIsland: 'Flüsse auf Inseln.',
  MountainOnIsland: 'Berge auf Inseln.',
  geo_River: 'Durch welche Länder und Provinzen ein Fluss fließt.',
  geo_Source: 'In welchem Land und welcher Provinz ein Fluss entspringt.',
  geo_Estuary: 'In welchem Land und welcher Provinz ein Fluss mündet.',
  geo_Lake: 'In welchen Ländern und Provinzen ein See liegt.',
  geo_Sea: 'An welche Länder und Provinzen ein Meer grenzt.',
  geo_Mountain: 'In welchen Ländern und Provinzen ein Berg liegt.',
  geo_Desert: 'In welchen Ländern und Provinzen eine Wüste liegt.',
  geo_Island: 'Zu welchen Ländern und Provinzen eine Insel gehört.',
  zone: 'Klimazonen mit Temperatur- und Niederschlagsbereich (nur wenige Beispielzeilen).',
  countryInZone: 'Ordnet Länder Klimazonen zu (nur wenige Beispielzeilen).',
  },
  en: {
  Country: 'All countries with country code, capital, area (km²) and population. The code (for example D for Germany) is the key that almost every other table refers to.',
  City: 'Cities with country, province, population and coordinates. A city is only unique by name, country and province together.',
  Province: 'Administrative divisions (German states, regions, US states) with population, area and capital.',
  Continent: 'The five continents with their area.',
  encompasses: 'Assigns countries to continents. Percentage is the share of the area on that continent, which is why countries like Russia or Turkey appear twice.',
  borders: 'Shared borders of two countries with their length in km. Each border appears only once, so a country can be in Country1 or Country2.',
  Economy: 'Economic data per country: GDP, shares of agriculture, industry and services, inflation and unemployment.',
  Politics: 'Independence date, former dependency and form of government per country.',
  Population: 'Population growth and infant mortality per country.',
  Countrypops: 'Population of countries in different years.',
  Citypops: 'Population of cities in different years.',
  Provpops: 'Population of provinces in different years.',
  Countrylocalname: 'Name of a country in its local language.',
  Countryothername: 'Other names of a country.',
  Citylocalname: 'Name of a city in its local language, often in its own script.',
  Cityothername: 'Other names and spellings of a city.',
  Provincelocalname: 'Name of a province in its local language.',
  Provinceothername: 'Other names of a province.',
  Language: 'Languages spoken per country with their share of the population.',
  Religion: 'Religions per country with their share of the population.',
  EthnicGroup: 'Ethnic groups per country with their share of the population.',
  Organization: 'International organizations with abbreviation, headquarters and founding date.',
  isMember: 'Memberships of countries in organizations. Type distinguishes, for example, member, observer and candidate.',
  Airport: 'Airports with IATA code, city, coordinates, elevation and time zone.',
  River: 'Rivers with length, source and mouth. River, Lake and Sea say where the river flows into.',
  Lake: 'Lakes with area, depth and elevation. River is the outflow.',
  Sea: 'Seas and oceans with area and maximum depth.',
  Mountain: 'Mountains with elevation, mountain range and type (for example volcano).',
  Desert: 'Deserts with area and coordinates.',
  Island: 'Islands with area, elevation and island group.',
  mergesWith: 'Which seas border each other.',
  RiverThrough: 'Rivers that flow through a lake.',
  islandIn: 'Which sea, lake or river an island lies in.',
  located: 'Cities located on a river, lake or sea.',
  locatedOn: 'Cities located on an island.',
  LakeOnIsland: 'Lakes on islands.',
  RiverOnIsland: 'Rivers on islands.',
  MountainOnIsland: 'Mountains on islands.',
  geo_River: 'Which countries and provinces a river flows through.',
  geo_Source: 'In which country and province a river rises.',
  geo_Estuary: 'In which country and province a river ends.',
  geo_Lake: 'Which countries and provinces a lake lies in.',
  geo_Sea: 'Which countries and provinces border a sea.',
  geo_Mountain: 'Which countries and provinces a mountain lies in.',
  geo_Desert: 'Which countries and provinces a desert lies in.',
  geo_Island: 'Which countries and provinces an island belongs to.',
  zone: 'Climate zones with temperature and precipitation ranges (only a few sample rows).',
  countryInZone: 'Assigns countries to climate zones (only a few sample rows).',
  },
};

// Reihenfolge der Gruppen auf der Schema-Seite
export const TABLE_GROUPS = [
  { title: { de: 'Länder und Kontinente', en: 'Countries and continents' }, tables: ['Country', 'Continent', 'encompasses', 'borders', 'Economy', 'Politics', 'Population', 'Countrypops', 'Countrylocalname', 'Countryothername'] },
  { title: { de: 'Provinzen und Städte', en: 'Provinces and cities' }, tables: ['Province', 'Provpops', 'Provincelocalname', 'Provinceothername', 'City', 'Citypops', 'Citylocalname', 'Cityothername', 'Airport'] },
  { title: { de: 'Bevölkerung und Organisationen', en: 'Population and organizations' }, tables: ['Language', 'Religion', 'EthnicGroup', 'Organization', 'isMember'] },
  { title: { de: 'Geografie', en: 'Geography' }, tables: ['River', 'Lake', 'Sea', 'Mountain', 'Desert', 'Island', 'mergesWith', 'RiverThrough', 'islandIn', 'located', 'locatedOn', 'LakeOnIsland', 'RiverOnIsland', 'MountainOnIsland'] },
  { title: { de: 'Wo liegt was (geo_-Tabellen)', en: 'What is where (geo_ tables)' }, tables: ['geo_River', 'geo_Source', 'geo_Estuary', 'geo_Lake', 'geo_Sea', 'geo_Mountain', 'geo_Desert', 'geo_Island'] },
  { title: { de: 'Klimazonen', en: 'Climate zones' }, tables: ['zone', 'countryInZone'] },
];
