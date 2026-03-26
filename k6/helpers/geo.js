const COUNTRY_WEIGHTS = [
  { code: 'BD', weight: 40 },   // Bangladesh — 40%
  { code: 'US', weight: 20 },   // USA — 20%
  { code: 'GB', weight: 10 },   // UK — 10%
  { code: 'ES', weight: 10 },   // Spain — 10%
  { code: 'DE', weight: 5 },    // Germany — 5%
  { code: 'FR', weight: 5 },    // France — 5%
  { code: 'BR', weight: 5 },    // Brazil — 5%
  { code: 'IN', weight: 5 },    // India — 5%
];

const TOTAL_WEIGHT = COUNTRY_WEIGHTS.reduce((sum, c) => sum + c.weight, 0);

export function getRandomCountry() {
  let random = Math.random() * TOTAL_WEIGHT;
  for (const country of COUNTRY_WEIGHTS) {
    random -= country.weight;
    if (random <= 0) return country.code;
  }
  return 'US';
}
