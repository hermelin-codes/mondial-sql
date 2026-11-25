// Texte und Einstellungen der Website. HTML ist nur dort erlaubt, wo es dabei steht.

export const SITE = {
  name: 'mondial · sql',
  // Basis-URL für Canonical-Links, Sitemap und Vorschaubilder. Beim Build über SITE_URL überschreibbar.
  url: 'https://sql-trainer.pages.dev',
  repo: 'https://github.com/hermelin-codes/sql-trainer',
  lang: 'de',
};

export const MONDIAL = {
  homepage: 'https://www.dbis.informatik.uni-goettingen.de/Mondial/',
  license: 'https://creativecommons.org/licenses/by/3.0/deed.de',
  copy: 'https://github.com/ullenboom/mondial-database',
};

export const HOME = {
  title: 'SQL üben mit der Mondial-Datenbank – online im Browser',
  description: 'SQL online üben mit der MONDIAL-Geodatenbank: Abfragen direkt im Browser ausführen, Tabellen im ER-Diagramm sehen, Fehler erklärt bekommen. Kostenlos, ohne Installation.',
  h1: 'SQL üben mit der Mondial-Datenbank',
  sub: 'Direkt im Browser, ohne Installation. Deine Abfragen laufen lokal in SQLite.',
};

// FAQ auf der Startseite (sichtbar im Fuß und als FAQPage-JSON-LD). Antworten als Klartext.
export const FAQ = [
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
];

// Kurzbeschreibungen für die Schema-Seite.
export const TABLE_INFO = {
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
};

// Reihenfolge der Gruppen auf der Schema-Seite
export const TABLE_GROUPS = [
  { title: 'Länder und Kontinente', tables: ['Country', 'Continent', 'encompasses', 'borders', 'Economy', 'Politics', 'Population', 'Countrypops', 'Countrylocalname', 'Countryothername'] },
  { title: 'Provinzen und Städte', tables: ['Province', 'Provpops', 'Provincelocalname', 'Provinceothername', 'City', 'Citypops', 'Citylocalname', 'Cityothername', 'Airport'] },
  { title: 'Bevölkerung und Organisationen', tables: ['Language', 'Religion', 'EthnicGroup', 'Organization', 'isMember'] },
  { title: 'Geografie', tables: ['River', 'Lake', 'Sea', 'Mountain', 'Desert', 'Island', 'mergesWith', 'RiverThrough', 'islandIn', 'located', 'locatedOn', 'LakeOnIsland', 'RiverOnIsland', 'MountainOnIsland'] },
  { title: 'Wo liegt was (geo_-Tabellen)', tables: ['geo_River', 'geo_Source', 'geo_Estuary', 'geo_Lake', 'geo_Sea', 'geo_Mountain', 'geo_Desert', 'geo_Island'] },
  { title: 'Klimazonen', tables: ['zone', 'countryInZone'] },
];
