import Parser from 'rss-parser';
import { Regulation, RSSItem } from '@/types';

const parser = new Parser();

// Finlex RSS feed URL for Finnish legislation
const FINLEX_RSS_URL = 'https://finlex.fi/fi/laki/ajantasa/feed';

// Keywords to filter for chemical-related regulations
const CHEMICAL_KEYWORDS = [
  'kemi', // chemistry/chemical in Finnish
  'REACH',
  'CLP',
  'vaarallinen aine', // dangerous substance in Finnish
  'kemikaalit', // chemicals in Finnish
  'vesienhoid', // water treatment in Finnish
  'vesike', // water in Finnish context
  'kloori', // chlorine
  'kloridit', // chlorides
  'sulfaat', // sulfate
  'fosfaat', // phosphate
  'alkaliteet', // alkalinity
  'kemian teollisuus', // chemical industry
  'haitalliset aineet', // harmful substances
];

/**
 * Fetch and parse Finlex RSS feed
 */
export async function fetchFinlexRSS(): Promise<RSSItem[]> {
  try {
    const feed = await parser.parseURL(FINLEX_RSS_URL);
    console.log(`Fetched ${feed.items.length} items from Finlex RSS`);

    const items: RSSItem[] = feed.items
      .filter((item) => isChemicalRelated(item.title || ''))
      .map((item) => ({
        title: item.title || '',
        link: item.link || '',
        pubDate: item.pubDate || new Date().toISOString(),
        description: item.description || '',
        guid: item.guid || item.link || item.title || '',
      }));

    console.log(
      `Filtered to ${items.length} chemical-related regulations`
    );
    return items;
  } catch (error) {
    console.error('Failed to fetch Finlex RSS:', error);
    throw error;
  }
}

/**
 * Check if an item is chemistry-related based on title and keywords
 */
function isChemicalRelated(text: string): boolean {
  const lowerText = text.toLowerCase();

  // Check if any chemical keywords are present
  return CHEMICAL_KEYWORDS.some((keyword) =>
    lowerText.includes(keyword.toLowerCase())
  );
}

/**
 * Extract Finlex document ID from URL
 * Finlex URLs typically look like: https://finlex.fi/fi/laki/alkup/YYYY/20YYnnnn
 */
export function parseFinlexId(url: string): string {
  try {
    // Extract the numeric ID from the URL
    const match = url.match(/(\d{8})/);
    if (match) {
      return match[1];
    }

    // Fallback: use full URL as ID if numeric ID not found
    return url.replace(/[^a-zA-Z0-9]/g, '').substring(0, 50);
  } catch (error) {
    console.error('Failed to parse Finlex ID:', error);
    // Fallback to URL hash
    return Buffer.from(url).toString('base64').substring(0, 50);
  }
}

/**
 * Normalize RSS item to internal Regulation format
 */
export function normalizeRegulation(item: RSSItem): Partial<Regulation> {
  const finlexId = parseFinlexId(item.guid || item.link || item.title);

  return {
    title: item.title,
    description: cleanHtml(item.description),
    source_url: item.link,
    published_date: new Date(item.pubDate).toISOString(),
    finlex_id: finlexId,
  };
}

/**
 * Remove HTML tags from description
 */
function cleanHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Fetch regulations from Finlex RSS and return normalized data
 */
export async function getFreshRegulations(): Promise<Partial<Regulation>[]> {
  const rssItems = await fetchFinlexRSS();
  return rssItems.map((item) => normalizeRegulation(item));
}

/**
 * Test Finlex RSS feed connection
 */
export async function testFinlexConnection(): Promise<boolean> {
  try {
    const items = await fetchFinlexRSS();
    console.log(`Successfully connected to Finlex RSS. Found ${items.length} items.`);
    return items.length > 0;
  } catch (error) {
    console.error('Failed to connect to Finlex RSS:', error);
    return false;
  }
}
