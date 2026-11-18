// Shopping checklist data and shareable-list helpers.
// No backend: data is saved in this browser, and shared links create a one-time copy.
export const STORAGE_KEY = "shopping-checklist-v2";
export const LEGACY_STORAGE_KEY = "shopping-checklist-v1";
export const MAX_ITEMS = 120;
export const CATEGORIES = ["grocery", "vegetable", "puja", "dryfruit", "snacks", "home", "other"];
export const UNITS = ["", "pcs", "kg", "g", "l", "ml", "packet", "dozen"];
export const LANGUAGES = ["en", "hi", "hinglish"];

export const SEEDS = [
  {key:"moong",hi:"खड़ी मूंग",en:"Whole green moong",hinglish:"Khadi moong",category:"grocery",icon:"🌱"},
  {key:"diya",hi:"दीया",en:"Diyas",hinglish:"Diye",category:"puja",icon:"🪔"},
  {key:"kishmish",hi:"किशमिश",en:"Raisins",hinglish:"Kishmish",category:"dryfruit",icon:"🍇"},
  {key:"batti",hi:"रुई की बत्ती",en:"Cotton wicks",hinglish:"Rui ki batti",category:"puja",icon:"🧵"},
  {key:"matches",hi:"माचिस",en:"Matchbox",hinglish:"Maachis",category:"home",icon:"🔥"},
  {key:"badam",hi:"बादाम",en:"Almonds",hinglish:"Badam",category:"dryfruit",icon:"🌰"},
  {key:"biscuit",hi:"बिस्कुट",en:"Biscuits",hinglish:"Biscuit",category:"snacks",icon:"🍪"},
  {key:"atta",hi:"आटा",en:"Wheat flour",hinglish:"Aata",category:"grocery",icon:"🌾"},
  {key:"ragi",hi:"रागी",en:"Ragi",hinglish:"Ragi",category:"grocery",icon:"🌾"},
  {key:"methi",hi:"मेथी",en:"Fenugreek",hinglish:"Methi",category:"grocery",icon:"🌿"},
  {key:"chuda",hi:"चूड़ा",en:"Flattened rice (poha)",hinglish:"Chooda / Poha",category:"grocery",icon:"🍚"},
  {key:"matar",hi:"मटर",en:"Green peas",hinglish:"Matar",category:"vegetable",icon:"🫛"}
];
const SEED_MAP = new Map(SEEDS.map(seed => [seed.key, seed]));

export function cleanName(value) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,72) : "";
}

export function normalizedQuantity(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number <= 9999 ? Math.round(number * 100) / 100 : null;
}

export function itemName(item, language) {
  const seed = SEED_MAP.get(item.seed);
  return seed ? (seed[language] || seed.hi) : item.name;
}

export function itemIcon(item) {
  const seed = SEED_MAP.get(item.seed);
  if (seed) return seed.icon;
  return {grocery:"🌾",vegetable:"🥦",puja:"🪔",dryfruit:"🌰",snacks:"🍪",home:"🏠",other:"🛍️"}[item.category] || "🛍️";
}

export function createDefaultItems(legacyChecked = []) {
  const doneSet = new Set(Array.isArray(legacyChecked) ? legacyChecked.filter(n => Number.isInteger(n) && n >= 0 && n < SEEDS.length) : []);
  return SEEDS.map((seed, index) => ({
    id:"seed-" + seed.key,
    seed:seed.key,
    name:seed.hi,
    quantity:null,
    unit:"",
    category:seed.category,
    done:doneSet.has(index)
  }));
}

export function normalizeItems(value) {
  if (!Array.isArray(value)) throw new Error("invalid-items");
  if (value.length > MAX_ITEMS) throw new Error("too-many-items");
  const ids = new Set();
  return value.map((source, index) => {
    if (!source || typeof source !== "object") throw new Error("invalid-item");
    const seed = typeof source.seed === "string" && SEED_MAP.has(source.seed) ? source.seed : null;
    const name = seed ? SEED_MAP.get(seed).hi : cleanName(source.name);
    if (!name) throw new Error("invalid-name");
    let id = typeof source.id === "string" ? source.id.trim().slice(0,72) : "";
    if (!id || ids.has(id)) id = "item-" + index + "-" + Math.random().toString(36).slice(2,9);
    ids.add(id);
    const category = CATEGORIES.includes(source.category) ? source.category : (seed ? SEED_MAP.get(seed).category : "other");
    const quantity = normalizedQuantity(source.quantity);
    const unit = quantity !== null && UNITS.includes(source.unit) ? source.unit : "";
    return {id,seed,name,quantity,unit,category,done:source.done === true};
  });
}

export function readSavedState(storage) {
  let stored = null;
  try { stored = storage.getItem(STORAGE_KEY); } catch (_) {}
  if (stored !== null) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && Array.isArray(parsed.items)) {
        return {
          items:normalizeItems(parsed.items),
          language:LANGUAGES.includes(parsed.language) ? parsed.language : "hi"
        };
      }
    } catch (_) {}
  }
  let checked = [];
  try {
    const legacy = JSON.parse(storage.getItem(LEGACY_STORAGE_KEY) || "[]");
    if (Array.isArray(legacy)) checked = legacy;
  } catch (_) {}
  return {items:createDefaultItems(checked),language:"hi"};
}

export function getProgress(items) {
  const total = items.length;
  const done = items.filter(item => item.done).length;
  return {total,done,remaining:total-done,percent:total ? Math.round((done/total)*100) : 0};
}

export function validateItemDraft(draft) {
  const name = cleanName(draft.name);
  if (!name) throw new Error("invalid-name");
  const raw = draft.quantity === undefined || draft.quantity === null ? "" : String(draft.quantity).trim();
  const quantity = normalizedQuantity(raw);
  if (raw && quantity === null) throw new Error("invalid-quantity");
  return {
    name,
    quantity,
    unit:quantity !== null && UNITS.includes(draft.unit) ? draft.unit : "",
    category:CATEGORIES.includes(draft.category) ? draft.category : "grocery"
  };
}

function encodeUtf8Base64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

function decodeUtf8Base64Url(code) {
  if (!/^[A-Za-z0-9_-]+$/.test(code) || code.length > 18000) throw new Error("invalid-link");
  const binary = atob(code.replace(/-/g,"+").replace(/_/g,"/"));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder("utf-8",{fatal:true}).decode(bytes);
}

export function encodeSharedList(items) {
  const payload = {v:2,a:items.map(item => [
    item.seed || "",
    item.seed ? "" : item.name,
    item.quantity ?? "",
    item.unit || "",
    item.category,
    item.done ? 1 : 0
  ])};
  return encodeUtf8Base64Url(JSON.stringify(payload));
}

export function decodeSharedList(code) {
  const parsed = JSON.parse(decodeUtf8Base64Url(code));
  if (!parsed || parsed.v !== 2 || !Array.isArray(parsed.a) || parsed.a.length > MAX_ITEMS) throw new Error("invalid-link");
  const raw = parsed.a.map((entry,index) => {
    if (!Array.isArray(entry) || entry.length !== 6) throw new Error("invalid-link");
    const [seed,name,quantity,unit,category,done] = entry;
    if (typeof seed !== "string" || (seed && !SEED_MAP.has(seed)) || (!seed && !cleanName(name))) throw new Error("invalid-link");
    if (quantity !== "" && normalizedQuantity(quantity) === null) throw new Error("invalid-link");
    if (!UNITS.includes(unit) || !CATEGORIES.includes(category) || ![0,1].includes(done)) throw new Error("invalid-link");
    return {id:"shared-" + index,seed:seed || null,name,quantity,unit,category,done:done===1};
  });
  return normalizeItems(raw);
}
