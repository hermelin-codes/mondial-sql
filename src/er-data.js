// Anordnung und Beziehungen der Tabellen im ER-Diagramm.
// Wird vom Build auch für die Schema-Seite gelesen.

const ER_COLUMNS = [
  ['Organization', 'isMember', 'Country', 'borders', 'Countrylocalname', 'Countrypops', 'Economy', 'Politics', 'Population', 'Airport'],
  ['City', 'Citypops', 'Citylocalname', 'Province', 'Provincelocalname', 'Provpops', 'Continent', 'encompasses', 'Language', 'Religion', 'EthnicGroup'],
  ['geo_Sea', 'geo_Lake', 'LakeOnIsland', 'RiverOnIsland', 'geo_River', 'geo_Source', 'geo_Estuary', 'located', 'geo_Island', 'locatedOn', 'geo_Mountain', 'geo_Desert'],
  ['Sea', 'mergesWith', 'Lake', 'RiverThrough', 'River', 'islandIn', 'Island', 'MountainOnIsland', 'Mountain', 'Desert'],
];
const ER_NODE_NAMES = new Set(ER_COLUMNS.flat());
const ER_COL_INDEX = {};
ER_COLUMNS.forEach((col, ci) => col.forEach(n => { ER_COL_INDEX[n] = ci; }));

// Referentielle Abhängigkeiten: [von, nach, Beschreibung]. "von" verweist auf "nach".
const ER_EDGES = [
  // Country als zentrale Referenz
  ['City', 'Country', 'City.Country = Country.Code'],
  ['City', 'Province', 'City.(Country, Province) = Province.(Country, Name)'],
  ['Province', 'Country', 'Province.Country = Country.Code'],
  ['Economy', 'Country', 'Economy.Country = Country.Code'],
  ['Politics', 'Country', 'Politics.Country / Politics.Dependent = Country.Code'],
  ['Population', 'Country', 'Population.Country = Country.Code'],
  ['Countrypops', 'Country', 'Countrypops.Country = Country.Code'],
  ['Countrylocalname', 'Country', 'Countrylocalname.Country = Country.Code'],
  ['Language', 'Country', 'Language.Country = Country.Code'],
  ['Religion', 'Country', 'Religion.Country = Country.Code'],
  ['EthnicGroup', 'Country', 'EthnicGroup.Country = Country.Code'],
  ['Organization', 'Country', 'Organization.Country = Country.Code'],
  ['Organization', 'City', 'Organization.(City, Country, Province) = City'],
  ['isMember', 'Country', 'isMember.Country = Country.Code'],
  ['isMember', 'Organization', 'isMember.Organization = Organization.Abbreviation'],
  ['borders', 'Country', 'borders.Country1 / borders.Country2 = Country.Code'],
  ['encompasses', 'Country', 'encompasses.Country = Country.Code'],
  ['encompasses', 'Continent', 'encompasses.Continent = Continent.Name'],
  ['Airport', 'Country', 'Airport.Country = Country.Code'],
  ['Airport', 'City', 'Airport.(City, Province, Country) = City'],
  ['Airport', 'Island', 'Airport.Island = Island.Name'],
  // City / Province Zusatztabellen
  ['Citypops', 'City', 'Citypops.(City, Country, Province) = City'],
  ['Citylocalname', 'City', 'Citylocalname.(City, Country, Province) = City'],
  ['Provincelocalname', 'Province', 'Provincelocalname.(Country, Province) = Province'],
  ['Provpops', 'Province', 'Provpops.(Country, Province) = Province'],
  // geo_* Brücken: Land + Geo-Objekt
  ['geo_Sea', 'Country', 'geo_Sea.Country = Country.Code'],
  ['geo_Sea', 'Sea', 'geo_Sea.Sea = Sea.Name'],
  ['geo_Lake', 'Country', 'geo_Lake.Country = Country.Code'],
  ['geo_Lake', 'Lake', 'geo_Lake.Lake = Lake.Name'],
  ['geo_River', 'Country', 'geo_River.Country = Country.Code'],
  ['geo_River', 'River', 'geo_River.River = River.Name'],
  ['geo_Source', 'Country', 'geo_Source.Country = Country.Code'],
  ['geo_Source', 'River', 'geo_Source.River = River.Name'],
  ['geo_Estuary', 'Country', 'geo_Estuary.Country = Country.Code'],
  ['geo_Estuary', 'River', 'geo_Estuary.River = River.Name'],
  ['geo_Island', 'Country', 'geo_Island.Country = Country.Code'],
  ['geo_Island', 'Island', 'geo_Island.Island = Island.Name'],
  ['geo_Mountain', 'Country', 'geo_Mountain.Country = Country.Code'],
  ['geo_Mountain', 'Mountain', 'geo_Mountain.Mountain = Mountain.Name'],
  ['geo_Desert', 'Country', 'geo_Desert.Country = Country.Code'],
  ['geo_Desert', 'Desert', 'geo_Desert.Desert = Desert.Name'],
  // located / locatedOn
  ['located', 'City', 'located.(City, Province, Country) = City'],
  ['located', 'River', 'located.River = River.Name'],
  ['located', 'Lake', 'located.Lake = Lake.Name'],
  ['located', 'Sea', 'located.Sea = Sea.Name'],
  ['locatedOn', 'City', 'locatedOn.(City, Province, Country) = City'],
  ['locatedOn', 'Island', 'locatedOn.Island = Island.Name'],
  // Insel-Brücken
  ['LakeOnIsland', 'Lake', 'LakeOnIsland.Lake = Lake.Name'],
  ['LakeOnIsland', 'Island', 'LakeOnIsland.Island = Island.Name'],
  ['RiverOnIsland', 'River', 'RiverOnIsland.River = River.Name'],
  ['RiverOnIsland', 'Island', 'RiverOnIsland.Island = Island.Name'],
  ['MountainOnIsland', 'Mountain', 'MountainOnIsland.Mountain = Mountain.Name'],
  ['MountainOnIsland', 'Island', 'MountainOnIsland.Island = Island.Name'],
  // Gewässer untereinander
  ['River', 'River', 'River.River = River.Name (mündet in Fluss)'],
  ['River', 'Lake', 'River.Lake = Lake.Name (mündet in See)'],
  ['River', 'Sea', 'River.Sea = Sea.Name (mündet ins Meer)'],
  ['Lake', 'River', 'Lake.River = River.Name (Abfluss)'],
  ['mergesWith', 'Sea', 'mergesWith.Sea1 / mergesWith.Sea2 = Sea.Name'],
  ['RiverThrough', 'River', 'RiverThrough.River = River.Name'],
  ['RiverThrough', 'Lake', 'RiverThrough.Lake = Lake.Name'],
  ['islandIn', 'Island', 'islandIn.Island = Island.Name'],
  ['islandIn', 'Sea', 'islandIn.Sea = Sea.Name'],
  ['islandIn', 'Lake', 'islandIn.Lake = Lake.Name'],
  ['islandIn', 'River', 'islandIn.River = River.Name'],
];

// Englische Fassung der Klammerzusätze in ER_EDGES
const ER_NOTES_EN = { 'mündet in Fluss': 'flows into river', 'mündet in See': 'flows into lake', 'mündet ins Meer': 'flows into sea', 'Abfluss': 'outflow' };
function edgeVia(via, lang) {
  return lang === 'en' ? via.replace(/\(([^()]*)\)$/, (m, n) => '(' + (ER_NOTES_EN[n] || n) + ')') : via;
}
