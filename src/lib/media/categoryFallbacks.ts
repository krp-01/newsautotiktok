/** Remote placeholder images by category — downloaded locally before FFmpeg use */
export const CATEGORY_FALLBACK_URLS: Record<string, string[]> = {
  general: [
    "https://picsum.photos/seed/news1/1080/1920",
    "https://picsum.photos/seed/news2/1080/1920",
    "https://picsum.photos/seed/news3/1080/1920",
  ],
  politic: [
    "https://picsum.photos/seed/politics1/1080/1920",
    "https://picsum.photos/seed/politics2/1080/1920",
    "https://picsum.photos/seed/politics3/1080/1920",
  ],
  sport: [
    "https://picsum.photos/seed/sport1/1080/1920",
    "https://picsum.photos/seed/sport2/1080/1920",
    "https://picsum.photos/seed/sport3/1080/1920",
  ],
  meteo: [
    "https://picsum.photos/seed/weather1/1080/1920",
    "https://picsum.photos/seed/weather2/1080/1920",
    "https://picsum.photos/seed/weather3/1080/1920",
  ],
  economie: [
    "https://picsum.photos/seed/business1/1080/1920",
    "https://picsum.photos/seed/business2/1080/1920",
    "https://picsum.photos/seed/business3/1080/1920",
  ],
};

export function getCategoryFallbackUrls(category: string): string[] {
  const key = category.toLowerCase().trim();
  if (CATEGORY_FALLBACK_URLS[key]) return CATEGORY_FALLBACK_URLS[key];
  if (key.includes("sport")) return CATEGORY_FALLBACK_URLS.sport;
  if (key.includes("meteo") || key.includes("weather")) return CATEGORY_FALLBACK_URLS.meteo;
  if (key.includes("polit")) return CATEGORY_FALLBACK_URLS.politic;
  if (key.includes("econom")) return CATEGORY_FALLBACK_URLS.economie;
  return CATEGORY_FALLBACK_URLS.general;
}
