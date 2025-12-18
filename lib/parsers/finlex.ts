import { Regulation, RSSItem } from '@/types';

// Finlex Open Data API endpoint
const FINLEX_API_BASE = 'https://opendata.finlex.fi/finlex/avoindata/v1';
const FINLEX_API_LIST = `${FINLEX_API_BASE}/akn/fi/act/statute/list`;

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

interface FinlexApiItem {
  akn_uri: string;
  status: string;
}

/**
 * Fetch statute details from Finlex API
 */
async function fetchStatuteDetails(aknUri: string): Promise<any> {
  try {
    const response = await fetch(aknUri, {
      headers: {
        'User-Agent': 'regulatory-intelligence-engine',
        'Accept': 'application/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const xml = await response.text();
    return parseXmlTitle(xml);
  } catch (error) {
    console.error(`Failed to fetch statute details from ${aknUri}:`, error);
    return null;
  }
}

/**
 * Extract title and date from Akoma Ntoso XML
 */
function parseXmlTitle(xml: string): { title: string; date: string } | null {
  try {
    // Extract title from FRBRalias or MainTitle elements
    const titleMatch = xml.match(/<FRBRalias\s+name="[^"]*"\s+value="([^"]*)"/);
    const title = titleMatch ? titleMatch[1] : 'Statute';

    // Extract date from FRBRWork/FRBRdate
    const dateMatch = xml.match(/<FRBRdate\s+date="([^"]*)"/) ||
                      xml.match(/<issued\s+date="([^"]*)"/) ||
                      xml.match(/<date\s+date="([^"]*)"/);
    const date = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();

    return { title, date };
  } catch (error) {
    console.error('Failed to parse XML:', error);
    return null;
  }
}

/**
 * Fetch and parse Finlex statutes from REST API
 */
export async function fetchFinlexRSS(): Promise<RSSItem[]> {
  try {
    // Simple API call - just get latest statutes
    const url = `${FINLEX_API_LIST}?format=json`;
    console.log(`Fetching from Finlex API: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'regulatory-intelligence-engine',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const items: FinlexApiItem[] = await response.json();
    console.log(`Fetched ${items.length} items from Finlex API`);

    // Fetch details for each statute and filter for chemical keywords
    const results: RSSItem[] = [];
    let checked = 0;

    for (const item of items) {
      // Only check first 20 to avoid too many API calls
      if (checked >= 20) break;
      checked++;

      const details = await fetchStatuteDetails(item.akn_uri);
      if (details && isChemicalRelated(details.title)) {
        results.push({
          title: details.title,
          link: item.akn_uri,
          pubDate: details.date,
          description: details.title,
          guid: item.akn_uri,
        });
      }
    }

    console.log(`Filtered to ${results.length} chemical-related regulations from ${checked} checked`);
    return results;
  } catch (error) {
    console.error('Failed to fetch Finlex regulations:', error);
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
 * Test Finlex API connection
 */
export async function testFinlexConnection(): Promise<boolean> {
  try {
    const items = await fetchFinlexRSS();
    console.log(`Successfully connected to Finlex API. Found ${items.length} items.`);
    return true; // Even if no chemical items found, API is accessible
  } catch (error) {
    console.error('Failed to connect to Finlex API:', error);
    return false;
  }
}
