/**
 * Official NJ Transit train line routes
 * Station sequences from official NJ Transit system maps
 * Routes are ordered from one terminus to the other
 */

import { mapStationName } from '../core/stationMapping';

export interface TrainRoute {
  lineId: string;
  stations: string[]; // Station names in order from terminus to terminus
}

/**
 * Official station sequences for each NJ Transit line
 * Based on official NJ Transit system maps
 */
export const TRAIN_ROUTES: Record<string, string[]> = {
  'Northeast Corridor': [
    'New York Penn Station',
    'Secaucus Junction',
    'Newark Penn Station',
    'Newark Airport',
    'North Elizabeth',
    'Elizabeth',
    'Linden',
    'Rahway',
    'Metropark',
    'Metuchen',
    'Edison',
    'New Brunswick',
    'Jersey Avenue',
    'Princeton Junction',
    'Hamilton',
    'Trenton',
  ],

  'North Jersey Coast': [
    'New York Penn Station',
    'Secaucus Junction',
    'Newark Penn Station',
    'Newark Airport',
    'North Elizabeth',
    'Elizabeth',
    'Linden',
    'Rahway',
    'Avenel',
    'Woodbridge',
    'Perth Amboy',
    'South Amboy',
    'Aberdeen-Matawan',
    'Hazlet',
    'Middletown',
    'Red Bank',
    'Little Silver',
    'Long Branch',
    'Elberon',
    'Allenhurst',
    'Asbury Park',
    'Bradley Beach',
    'Belmar',
    'Spring Lake',
    'Manasquan',
    'Point Pleasant Beach',
    'Bay Head',
  ],

  'Raritan Valley': [
    'Newark Penn Station',
    'Union Station',
    'Roselle Park',
    'Cranford',
    'Garwood',
    'Westfield',
    'Fanwood',
    'Netherwood',
    'Plainfield',
    'Dunellen',
    'Bound Brook',
    'Bridgewater',
    'Somerville',
    'Raritan',
    'North Branch',
    'White House',
    'Lebanon',
    'Annandale',
    'High Bridge',
  ],

  'Morris & Essex': [
    'Hoboken',
    'Secaucus Junction',
    'Newark Broad St',
    'East Orange',
    'Brick Church',
    'Orange',
    'Highland Avenue',
    'Mountain Station',
    'South Orange',
    'Maplewood',
    'Millburn',
    'Short Hills',
    'Summit',
    // Morristown Line west of Summit
    'Chatham',
    'Madison',
    'Convent',
    'Morristown',
    'Morris Plains',
    'Denville',
    'Dover',
  ],

  'Montclair-Boonton': [
    // West → East (per requested visualization order)
    'Hackettstown',
    'Mount Olive',
    'Netcong',
    'Lake Hopatcong',
    'Mount Arlington',
    'Dover',
    'Denville',
    'Mountain Lakes',
    'Boonton',
    'Towaco',
    'Lincoln Park',
    'Mountain View',
    'Wayne/Route 23',
    'Little Falls',

    // Montclair segment (explicit order)
    'Montclair State University',
    'Montclair Heights',
    'Upper Montclair',
    'Watchung Avenue',
    'Walnut Street',
    'Bay Street',
    'Glen Ridge',
    'Bloomfield',
    'Newark Broad St',
    'Hoboken',
  ],

  'Main Line': [
    'Hoboken',
    'Secaucus Junction',
    'Lyndhurst',
    'Delawanna',
    'Passaic',
    'Clifton',
    'Paterson',
    'Hawthorne',
    'Glen Rock',
    'Ridgewood',
    'Ho-Ho-Kus',
    'Waldwick',
    'Allendale',
    'Ramsey',
    'Mahwah',
    'Suffern',
  ],

  'Bergen County': [
    'Hoboken',
    'Secaucus Junction',
    'Rutherford',
    'Wesmont',
    'Garfield',
    'Plauderville',
    'Broadway',
    'Radburn',
    'Glen Rock',
    'Ridgewood',
    'Ho-Ho-Kus',
    'Waldwick',
    'Allendale',
    'Ramsey',
    'Mahwah',
    'Suffern',
  ],

  'Port Jervis': [
    'Suffern',
    'Sloatsburg',
    'Tuxedo',
    'Harriman',
    'Salisbury Mills',
    'Campbell Hall',
    'Otisville',
    'Port Jervis',
  ],

  'Pascack Valley': [
    'Hoboken',
    'Secaucus Junction',
    'New York Penn Station',
    'Rutherford',
    'Lyndhurst',
    'Delawanna',
    'Passaic',
    'Clifton',
    'Paterson',
    'Hawthorne',
    'Broadway',
    'Radburn',
    'Glen Rock',
    'Ridgewood',
    'Ho-Ho-Kus',
    'Waldwick',
    'Ramsey',
    'Mahwah',
    'Woodcliff Lake',
    'Park Ridge',
    'Montvale',
    'Pearl River',
    'Nanuet',
    'Spring Valley',
  ],

  'Atlantic City': [
    'Philadelphia 30th Street',
    'Camden Transit Center',
    'Pennsauken',
    'Cherry Hill',
    'Lindenwold',
    'Atco',
    'Hammonton',
    'Egg Harbor City',
    'Absecon',
    'Atlantic City',
  ],

  'Gladstone Branch': [
    'Newark Broad St',
    'Summit',
    'New Providence',
    'Murray Hill',
    'Berkeley Heights',
    'Gillette',
    'Stirling',
    'Millington',
    'Lyons',
    'Basking Ridge',
    'Bernardsville',
    'Far Hills',
    'Peapack',
    'Gladstone',
  ],

  'Princeton Branch': [
    'Princeton Junction',
    'Princeton',
  ],
};

/**
 * Get route coordinates for a line
 * Returns array of [lat, lng] coordinates following the official route
 */
export function getRouteCoordinates(lineId: string): Array<[number, number]> {
  const stationNames = TRAIN_ROUTES[lineId];
  if (!stationNames) {
    return [];
  }

  const seen = new Set<string>();
  const coordinates: Array<[number, number]> = [];

  stationNames.forEach(stationName => {
    const mapped = mapStationName(stationName, lineId);
    if (mapped) {
      const key = `${mapped.position.lat.toFixed(6)},${mapped.position.lng.toFixed(6)}`;
      if (!seen.has(key)) {
        seen.add(key);
        coordinates.push([mapped.position.lat, mapped.position.lng]);
      }
    }
  });

  return coordinates;
}
