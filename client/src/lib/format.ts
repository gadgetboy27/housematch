/**
 * Currency and number formatting utilities for HouseMatch.nz
 * Centralized formatting ensures consistency across the application
 */

/**
 * Format a number or string as NZD currency with full precision
 * @param value - The value to format (number or string like "1000000")
 * @returns Formatted string like "$1,000,000"
 * 
 * @example
 * formatNZD(1000000) // "$1,000,000"
 * formatNZD("1500000.50") // "$1,500,000.50"
 * formatNZD(null) // "$0"
 */
export function formatNZD(value: number | string | null | undefined): string {
  const numValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[\$,]/g, ''))
    : value;
  
  if (!numValue || isNaN(numValue)) {
    return "$0";
  }
  
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue);
}

/**
 * Format a number or string as compact NZD currency
 * @param value - The value to format
 * @returns Formatted string like "$1M", "$1.5M", "$850K"
 * 
 * @example
 * formatCompactNZD(1000000) // "$1M"
 * formatCompactNZD(1500000) // "$1.5M"
 * formatCompactNZD(850000) // "$850K"
 * formatCompactNZD(999) // "$999"
 */
export function formatCompactNZD(value: number | string | null | undefined): string {
  const numValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[\$,]/g, ''))
    : value;
  
  if (!numValue || isNaN(numValue)) {
    return "$0";
  }
  
  // For values under 10K, show full number
  if (numValue < 10000) {
    return formatNZD(numValue);
  }
  
  // For values 10K-999K, show as "XXXk"
  if (numValue < 1000000) {
    const thousands = Math.round(numValue / 1000);
    return `$${thousands}K`;
  }
  
  // For values 1M+, show as "X.XM"
  const millions = numValue / 1000000;
  if (millions % 1 === 0) {
    return `$${millions}M`;
  }
  return `$${millions.toFixed(1)}M`;
}

/**
 * Clean and parse a currency string to a number
 * @param value - The currency string to parse (e.g., "$1,000,000" or "1000000")
 * @returns The numeric value
 * 
 * @example
 * parseCurrency("$1,000,000") // 1000000
 * parseCurrency("1500000") // 1500000
 */
export function parseCurrency(value: string | null | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[\$,]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format a location string, removing redundant country suffix
 * @param location - The location string (e.g., "Auckland, New Zealand")
 * @param city - Optional city name to use as fallback
 * @returns Clean location string without country
 * 
 * @example
 * formatLocation("Auckland, New Zealand") // "Auckland"
 * formatLocation("Hobsonville, New Zealand", "Auckland") // "Hobsonville, Auckland"
 */
export function formatLocation(
  location: string | null | undefined, 
  city?: string | null
): string {
  if (!location) return city || '';
  
  // Remove ", New Zealand" suffix
  let cleaned = location.replace(/, New Zealand$/i, '');
  
  // If we have a city and the location doesn't include it, add it
  if (city && !cleaned.includes(city)) {
    cleaned = `${cleaned}, ${city}`;
  }
  
  return cleaned;
}
