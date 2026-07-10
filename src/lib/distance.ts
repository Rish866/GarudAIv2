// Common Indian logistics routes with approximate distances (km)
const ROUTE_DISTANCES: Record<string, number> = {
  'pune-mumbai': 150,
  'mumbai-pune': 150,
  'mumbai-delhi': 1400,
  'delhi-mumbai': 1400,
  'pune-delhi': 1420,
  'delhi-pune': 1420,
  'mumbai-hyderabad': 710,
  'hyderabad-mumbai': 710,
  'mumbai-bangalore': 980,
  'bangalore-mumbai': 980,
  'delhi-jaipur': 280,
  'jaipur-delhi': 280,
  'pune-bangalore': 840,
  'bangalore-pune': 840,
  'mumbai-ahmedabad': 530,
  'ahmedabad-mumbai': 530,
  'delhi-chandigarh': 250,
  'chandigarh-delhi': 250,
  'mumbai-goa': 590,
  'goa-mumbai': 590,
  'bangalore-chennai': 350,
  'chennai-bangalore': 350,
  'delhi-lucknow': 550,
  'lucknow-delhi': 550,
  'pune-hyderabad': 560,
  'hyderabad-pune': 560,
  'mumbai-nagpur': 820,
  'nagpur-mumbai': 820,
  'bangalore-goa': 560,
  'goa-bangalore': 560,
  'delhi-kolkata': 1470,
  'kolkata-delhi': 1470,
  'mumbai-chennai': 1330,
  'chennai-mumbai': 1330,
  'ahmedabad-delhi': 940,
  'delhi-ahmedabad': 940,
  'pune-nagpur': 700,
  'nagpur-pune': 700,
  'jamnagar-mumbai': 680,
  'mumbai-jamnagar': 680,
  'jamnagar-delhi': 1050,
  'delhi-jamnagar': 1050,
  'manesar-chennai': 2180,
  'chennai-manesar': 2180,
  'ankleshwar-ahmedabad': 230,
  'ahmedabad-ankleshwar': 230,
  'bangalore-hubli': 400,
  'hubli-bangalore': 400,
  'bhopal-delhi': 780,
  'delhi-bhopal': 780,
  'indore-mumbai': 590,
  'mumbai-indore': 590,
};

/**
 * Normalize city name for lookup
 */
function normalizeCity(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/maharashtra|karnataka|gujarat|rajasthan|telangana|tamilnadu|haryana/g, '')
    .trim();
}

/**
 * Extract city name from full address
 * "Pune, Maharashtra" -> "pune"
 * "Mumbai JNPT Port" -> "mumbai"
 */
function extractCity(address: string): string {
  const city = address.split(',')[0].split(' ')[0].toLowerCase().trim();
  // Common aliases
  const aliases: Record<string, string> = {
    'bengaluru': 'bangalore',
    'bengalore': 'bangalore',
    'kolkatta': 'kolkata',
    'calcutta': 'kolkata',
    'bombay': 'mumbai',
    'madras': 'chennai',
    'trivandrum': 'thiruvananthapuram',
    'gurgaon': 'manesar',
    'gurugram': 'manesar',
    'noida': 'delhi',
    'faridabad': 'delhi',
    'ghaziabad': 'delhi',
    'navi': 'mumbai',
    'thane': 'mumbai',
    'pimpri': 'pune',
  };
  return aliases[city] || city;
}

/**
 * Estimate distance between two locations
 * Returns km or 0 if unable to estimate
 */
export function estimateDistance(origin: string, destination: string): number {
  if (!origin || !destination) return 0;

  const from = extractCity(origin);
  const to = extractCity(destination);

  if (from === to) return 50; // Same city, assume 50km local

  const key = `${from}-${to}`;

  // Direct lookup
  if (ROUTE_DISTANCES[key]) {
    return ROUTE_DISTANCES[key];
  }

  // Try partial match
  for (const [route, distance] of Object.entries(ROUTE_DISTANCES)) {
    const [routeFrom, routeTo] = route.split('-');
    if (from.includes(routeFrom) && to.includes(routeTo)) return distance;
    if (routeFrom.includes(from) && routeTo.includes(to)) return distance;
  }

  // Fallback: return 0 (user enters manually)
  return 0;
}

// Export normalizeCity for potential use elsewhere
export { normalizeCity };
