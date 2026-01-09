/**
 * Line color configuration for NJ Transit
 * Official NJ Transit brand colors as specified in Graphics Standards Manual
 * Colors converted from Pantone to hex codes
 */

export const LINE_COLORS: Record<string, string> = {
  'Northeast Corridor': '#DA291C',      // Red (Pantone 485)
  'North Jersey Coast': '#001489',      // Light Blue (Pantone Reflex Blue)
  'Morris & Essex': '#009739',          // Dark Green (Pantone 354)
  'Montclair-Boonton': '#6A5D1B',       // Light Brown (Pantone 450)
  'Main/Bergen': '#FFCD00',             // Yellow (Pantone 116)
  'Pascack Valley': '#A20067',          // Purple (Pantone 246)
  'Raritan Valley': '#FF671F',          // Orange (Pantone 165)
  'Atlantic City': '#002D72',           // Dark Blue (Navy blue variant for distinction)
  'Gladstone Branch': '#66B84F',        // Light Green (lighter variant of Pantone 354 for branch distinction)
  'Princeton Branch': '#C41E3A',        // Dark Red (darker variant of Pantone 485 for branch distinction)
};

/**
 * Get color for a line, with fallback
 */
export function getLineColor(line: string): string {
  return LINE_COLORS[line] || '#95A5A6'; // Default gray
}

/**
 * Major stations that should be rendered larger and more prominently
 * These are major terminals, hubs, and important transfer points
 */
export const MAJOR_STATIONS = new Set([
  'New York Penn Station',
  'Newark Penn Station',
  'Hoboken',
  'Trenton',
  'Newark Broad St',
  'Secaucus Junction',
  'Newark Airport',
  'Morristown',
  'Summit',
  'Long Branch',
  'Ridgewood',
  'Princeton Junction',
  'Atlantic City',
]);

