import { SearchItem } from '../types/search';

/**
 * Normalizes a string by converting to lowercase and stripping extra whitespaces.
 */
export function normalizeString(str: string): string {
  return str.trim().toLowerCase();
}

/**
 * Calculates a match score for a search item against a search query.
 * Returns 0 if there is no match. Higher scores mean better matches.
 */
export function calculateMatchScore(item: SearchItem, query: string): number {
  const normalizedQuery = normalizeString(query);
  if (!normalizedQuery) return 0;

  const normalizedTitle = normalizeString(item.title);
  const normalizedDescription = normalizeString(item.description);
  
  let score = 0;

  // 1. Exact match on title
  if (normalizedTitle === normalizedQuery) {
    score += 100;
  }
  // 2. Prefix match on title
  else if (normalizedTitle.startsWith(normalizedQuery)) {
    score += 80;
  }
  // 3. Substring match on title
  else if (normalizedTitle.includes(normalizedQuery)) {
    score += 50;
  }

  // 4. Substring match on description
  if (normalizedDescription.includes(normalizedQuery)) {
    score += 20;
  }

  // 5. Individual word matching (fuzzy/partial check)
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
  const titleWords = normalizedTitle.split(/\s+/).filter(w => w.length > 0);
  const descWords = normalizedDescription.split(/\s+/).filter(w => w.length > 0);

  let wordMatches = 0;
  for (const qWord of queryWords) {
    // Check if query word matches any title word as a prefix
    const titleWordMatch = titleWords.some(tWord => tWord.startsWith(qWord));
    if (titleWordMatch) {
      score += 15;
      wordMatches++;
    }

    // Check tags
    if (item.tags) {
      const tagMatch = item.tags.some(tag => normalizeString(tag).includes(qWord));
      if (tagMatch) {
        score += 15;
        wordMatches++;
      }
    }

    // Check if query word matches any description word as a prefix
    const descWordMatch = descWords.some(dWord => dWord.startsWith(qWord));
    if (descWordMatch) {
      score += 5;
      wordMatches++;
    }
  }

  // If there are multiple query words and none match, reject the match
  if (queryWords.length > 1 && wordMatches === 0 && !normalizedTitle.includes(normalizedQuery) && !normalizedDescription.includes(normalizedQuery)) {
    return 0;
  }

  return score;
}

/**
 * Searches and filters a list of SearchItems using calculated scores, returned sorted.
 */
export function fuzzySearch(items: SearchItem[], query: string): SearchItem[] {
  if (!query.trim()) return [];

  return items
    .map(item => ({ item, score: calculateMatchScore(item, query) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(result => result.item);
}
