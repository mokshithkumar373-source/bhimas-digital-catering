export const ITEM_TRANSLATIONS: Record<string, string> = {
  Idly: "ఇడ్లీ",
  Vada: "వడ",
  Puri: "పూరీ",
  Dosa: "దోసె",
  Upma: "ఉప్మా",
  Pongal: "పొంగల్",
  "Poori Curry": "పూరీ కూర",
  Meals: "మీల్స్",
  "Veg Biryani": "వెజ్ బిర్యానీ",
  Pulihora: "పులిహోర",
  "Jeera Rice": "జీరా రైస్",
  "Paneer Curry": "పనీర్ కూర",
  "Brinjal Curry": "వంకాయ కూర",
  "Dal Fry": "పప్పు ఫ్రై",
  Sambar: "సాంబార్",
  Rasam: "రసం",
  Rasgulla: "రసగుల్లా",
  Kesari: "కేసరి",
  Laddu: "లడ్డూ",
  Badusha: "బాదుషా",
  "Gulab Jamun": "గులాబ్ జామున్",
  "Double Ka Meetha": "డబుల్ కా మీఠా",
  "Mirchi Bajji": "మిర్చి బజ్జీ",
  Pakodi: "పకోడీ",
  Cutlet: "కట్లెట్",
  Punugulu: "పునుగులు",
  Vanilla: "వెనిల్లా",
  Chocolate: "చాక్లెట్",
  Strawberry: "స్ట్రాబెర్రీ",
  "Water Bottle": "నీటి బాటిల్",
  "Cool Drinks": "కూల్ డ్రింక్స్",
  Tea: "టీ",
  Coffee: "కాఫీ",
  "Ice Cream": "ఐస్ క్రీమ్",
  "Fruit Juice": "పండ్ల రసం",
  Chapati: "చపాతీ",
  Rice: "రైస్",
};

export const REVERSE_ITEM_TRANSLATIONS: Record<string, string> = {};
Object.entries(ITEM_TRANSLATIONS).forEach(([en, te]) => {
  REVERSE_ITEM_TRANSLATIONS[te] = en;
});

export const CHECKLIST_TRANSLATIONS: Record<string, string> = {
  "Buffet plates": "బఫే ప్లేట్లు",
  "Drinking water": "తాగునీరు",
  Glasses: "గ్లాసెస్",
  Buckets: "బకెట్లు",
  Basins: "బేసిన్లు",
  "Serving ladles": "వడ్డించే గరిటెలు",
};

export const REVERSE_CHECKLIST_TRANSLATIONS: Record<string, string> = {};
Object.entries(CHECKLIST_TRANSLATIONS).forEach(([en, te]) => {
  REVERSE_CHECKLIST_TRANSLATIONS[te] = en;
});

export function translateItem(name: string, toLang: "te" | "en") {
  if (!name) return "";
  const trimmed = name.trim();
  if (toLang === "te") {
    return ITEM_TRANSLATIONS[trimmed] || trimmed;
  } else {
    return REVERSE_ITEM_TRANSLATIONS[trimmed] || trimmed;
  }
}

export function translateChecklistItem(name: string, toLang: "te" | "en") {
  if (!name) return "";
  const trimmed = name.trim();

  const findEntry = (dict: Record<string, string>, search: string) => {
    return Object.entries(dict).find(
      ([k, v]) =>
        k.toLowerCase() === search.toLowerCase() || v.toLowerCase() === search.toLowerCase(),
    );
  };

  if (toLang === "te") {
    const entry = findEntry(CHECKLIST_TRANSLATIONS, trimmed);
    return entry ? entry[1] : trimmed;
  } else {
    const entry = findEntry(REVERSE_CHECKLIST_TRANSLATIONS, trimmed);
    return entry ? entry[1] : trimmed;
  }
}
