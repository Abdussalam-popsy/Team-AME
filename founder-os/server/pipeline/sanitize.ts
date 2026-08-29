/**
 * Provider text is not trustworthy. Aviato descriptions in particular sometimes
 * contain SEO spam scraped from a squatted domain, so text is screened before it
 * reaches a model or the UI.
 */
const SPAM_MARKERS = [
  'casino',
  'pokies',
  'betting',
  'slots',
  'vip perks',
  'exclusive bonuses',
  'viagra',
  'porn',
  'escort',
  'crypto giveaway',
  'free spins',
  'sportsbook',
];

export function looksLikeSpam(text: string | undefined): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return SPAM_MARKERS.some((m) => t.includes(m));
}

/** Returns the text only if it passes screening, else undefined. */
export function cleanText(text: string | undefined, maxLen = 600): string | undefined {
  if (!text) return undefined;
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length < 8) return undefined;
  if (looksLikeSpam(trimmed)) return undefined;
  return trimmed.slice(0, maxLen);
}

export function normalizeDomain(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const stripped = url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
  return stripped.length > 3 ? stripped : undefined;
}

export function httpsUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const t = url.trim();
  if (!t) return undefined;
  return t.startsWith('http') ? t : `https://${t.replace(/^\/+/, '')}`;
}

export function median(values: number[]): number | undefined {
  const nums = values.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (nums.length === 0) return undefined;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 0 ? (nums[mid - 1]! + nums[mid]!) / 2 : nums[mid]!;
}

export function monthsAgo(date: string | undefined): number | undefined {
  if (!date) return undefined;
  const t = Date.parse(date);
  if (Number.isNaN(t)) return undefined;
  return (Date.now() - t) / (1000 * 60 * 60 * 24 * 30.44);
}
