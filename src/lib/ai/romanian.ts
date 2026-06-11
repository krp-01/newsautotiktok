const ENGLISH_STOPWORDS =
  /\b(the|and|with|from|this|that|news|breaking|watch|live|update|report|said|will|have|been|were|your|their|about|after|before|today|yesterday|tomorrow|people|world|state|country|official|officials|government|president|minister|according|sources|source|video|click|read|more|here|share|follow|subscribe|latest|story|stories)\b/gi;

const ROMANIAN_MARKERS =
  /\b(este|sunt|au|fost|care|pentru|după|dupa|în|in|la|cu|despre|conform|anunță|anunta|declară|declara|ministrul|guvernul|românia|romania|știri|stiri|actualizări|actualizari|urmărește|urmaresti|rămâneți|ramaneti|conectat|informații|informatii)\b/gi;

export function countEnglishWords(text: string): number {
  return (text.match(ENGLISH_STOPWORDS) || []).length;
}

export function countRomanianMarkers(text: string): number {
  return (text.match(ROMANIAN_MARKERS) || []).length;
}

export function isMostlyRomanian(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 4) return true;

  const englishHits = countEnglishWords(trimmed);
  const romanianHits = countRomanianMarkers(trimmed);

  if (englishHits >= 4 && romanianHits === 0) return false;
  if (englishHits / words.length > 0.22 && romanianHits < 2) return false;

  return true;
}

export function clampVoiceoverLength(text: string, maxWords = 130): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ")}. Urmărește-ne pentru actualizări.`;
}

export function categoryBadgeLabel(category: string): string {
  const map: Record<string, string> = {
    general: "Știri",
    breaking: "Breaking",
    politic: "Politică",
    politica: "Politică",
    sport: "Sport",
    extern: "Extern",
    externe: "Extern",
    economie: "Economie",
    tech: "Tehnologie",
    romania: "România",
  };

  const key = category.toLowerCase().trim();
  return map[key] || category.charAt(0).toUpperCase() + category.slice(1);
}
