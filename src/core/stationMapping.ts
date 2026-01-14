/**
 * Station name mapping and normalization
 * Maps timetable station names to canonical station IDs and coordinates
 */

import type { Position } from '../types/domain';

/**
 * Station data with canonical ID, name, and position
 */
export interface StationData {
  id: string;
  name: string;
  position: Position;
  aliases?: string[]; // Alternative names for fuzzy matching
}

/**
 * Comprehensive station database
 * This maps station names from timetables to canonical IDs and coordinates
 */
export const STATION_DATABASE: StationData[] = [
  // Major terminals
  { id: 'NYP', name: 'New York Penn Station', position: { lat: 40.7506, lng: -73.9935 } },
  { id: 'NWK', name: 'Newark Penn Station', position: { lat: 40.7347, lng: -74.1642 }, aliases: ['Newark', 'Newark Penn'] },
  { id: 'HOB', name: 'Hoboken', position: { lat: 40.7380, lng: -74.0307 }, aliases: ['Hoboken Terminal'] },
  { id: 'TRE', name: 'Trenton', position: { lat: 40.2176, lng: -74.7425 }, aliases: ['Trenton Transit Center'] },
  { id: 'SEC', name: 'Secaucus Junction', position: { lat: 40.7589, lng: -74.0771 }, aliases: ['Secaucus', 'Secaucus Junction6.137.29', 'Secaucus Junction12.561.58'] },
  
  // Northeast Corridor
  { id: 'EWR', name: 'Newark Airport', position: { lat: 40.6895, lng: -74.1745 }, aliases: ['Newark Liberty International Airport', 'Newark Airport Station', 'Newark Int\'l. Airport', 'Newark International Airport'] },
  { id: 'NB', name: 'Newark Broad St', position: { lat: 40.7323, lng: -74.1705 }, aliases: ['Newark Broad Street', 'Broad St'] },
  { id: 'SUB', name: 'Suburban Station', position: { lat: 39.9534, lng: -75.1656 }, aliases: ['Suburban'] },
  { id: 'JAV', name: 'Jersey Avenue', position: { lat: 40.4753, lng: -74.4563 } },
  { id: 'ELZ', name: 'Elizabeth', position: { lat: 40.6630, lng: -74.2150 } },
  { id: 'NEL', name: 'North Elizabeth', position: { lat: 40.6750, lng: -74.2050 } },
  { id: 'RAH', name: 'Rahway', position: { lat: 40.6080, lng: -74.2770 } },
  { id: 'LIN', name: 'Linden', position: { lat: 40.6220, lng: -74.2500 }, aliases: ['Linden5.355.415.486.356.426.507.437.49'] },
  { id: 'ED', name: 'Edison', position: { lat: 40.5180, lng: -74.4120 }, aliases: ['EdisonL'] },
  { id: 'MET', name: 'Metuchen', position: { lat: 40.5430, lng: -74.3610 }, aliases: ['MetuchenL'] },
  { id: 'METP', name: 'Metropark', position: { lat: 40.5680, lng: -74.3270 }, aliases: ['MetroparkL', 'Metropark5.556.577.588.589.59'] },
  { id: 'NBK', name: 'New Brunswick', position: { lat: 40.4860, lng: -74.4440 }, aliases: ['New BrunswickL'] },
  { id: 'HAM', name: 'Hamilton', position: { lat: 40.2270, lng: -74.6530 }, aliases: ['HamiltonL'] },
  { id: 'NYC', name: 'New York Penn Station', position: { lat: 40.7506, lng: -73.9935 }, aliases: ['NEW YORK', 'NEW YORKC', 'New York', 'NY Penn Station', 'Penn Station'] },
  
  // North Jersey Coast
  { id: 'LB', name: 'Long Branch', position: { lat: 40.3043, lng: -73.9924 } },
  { id: 'BH', name: 'Bay Head', position: { lat: 40.0715, lng: -74.0460 }, aliases: ['BAY HEAD', 'BAY HEAD9.2011.211.243.375.34'] },
  { id: 'PPB', name: 'Point Pleasant Beach', position: { lat: 40.0879, lng: -74.0482 } },
  { id: 'MSQ', name: 'Manasquan', position: { lat: 40.1237, lng: -74.0493 }, aliases: ['ManasquanL 9.01L 11.02'] },
  { id: 'SL', name: 'Spring Lake', position: { lat: 40.1515, lng: -74.0290 } },
  { id: 'BEL', name: 'Belmar', position: { lat: 40.1784, lng: -74.0221 } },
  { id: 'BB', name: 'Bradley Beach', position: { lat: 40.2018, lng: -74.0121 }, aliases: ['Bradley Beach5.376.247.379.3911.411.393.395.38'] },
  { id: 'AP', name: 'Asbury Park', position: { lat: 40.2204, lng: -74.0121 }, aliases: ['Asbury Park10.3411.321.333.24'] },
  { id: 'ALL', name: 'Allenhurst', position: { lat: 40.2368, lng: -74.0068 } },
  { id: 'ELB', name: 'Elberon', position: { lat: 40.2659, lng: -73.9956 } },
  { id: 'MP', name: 'Monmouth Park', position: { lat: 40.3081, lng: -73.9892 } },
  { id: 'LS', name: 'Little Silver', position: { lat: 40.3365, lng: -74.0443 }, aliases: ['Little Silver7.228.219.20'] },
  { id: 'RB', name: 'Red Bank', position: { lat: 40.3470, lng: -74.0643 } },
  { id: 'MID', name: 'Middletown', position: { lat: 40.3943, lng: -74.1179 } },
  { id: 'HAZ', name: 'Hazlet', position: { lat: 40.4148, lng: -74.1905 } },
  { id: 'ABM', name: 'Aberdeen-Matawan', position: { lat: 40.4123, lng: -74.2295 } },
  { id: 'SA', name: 'South Amboy', position: { lat: 40.4776, lng: -74.2901 } },
  { id: 'PA', name: 'Perth Amboy', position: { lat: 40.5065, lng: -74.2654 } },
  { id: 'WB', name: 'Woodbridge', position: { lat: 40.5545, lng: -74.2776 } },
  { id: 'AV', name: 'Avenel', position: { lat: 40.5809, lng: -74.2854 }, aliases: ['Avenel5.356.517.518.519.5311.532.043.514.545.536.538.0210.03'] },
  
  // Morris & Essex / Montclair-Boonton
  { id: 'SUM', name: 'Summit', position: { lat: 40.7170, lng: -74.3595 }, aliases: ['Summit - Arrive', 'Summit - Depart'] },
  { id: 'MOT', name: 'Morristown', position: { lat: 40.7970, lng: -74.4813 } },
  { id: 'MST', name: 'Montclair State University', position: { lat: 40.8667, lng: -74.1975 }, aliases: ['Montclair State', 'MSU', 'MONTCLAIR STATE UNIV', 'Montclair State Univ. - arrive', 'Montclair State Univ. - depart'] },
  { id: 'BON', name: 'Boonton', position: { lat: 40.9023, lng: -74.4079 } },
  // Montclair-Boonton additional stations (between Newark Broad St and Montclair State)
  { id: 'WAT', name: 'Watsessing Avenue', position: { lat: 40.7880, lng: -74.1950 } },
  { id: 'BLO', name: 'Bloomfield', position: { lat: 40.7920, lng: -74.1980 } },
  { id: 'GRI', name: 'Glen Ridge', position: { lat: 40.8050, lng: -74.2040 } },
  { id: 'UMC', name: 'Upper Montclair', position: { lat: 40.8440, lng: -74.2090 } },
  { id: 'MTH', name: 'Montclair Heights', position: { lat: 40.8600, lng: -74.2000 } },
  { id: 'WCA', name: 'Watchung Avenue', position: { lat: 40.8500, lng: -74.1950 } },
  { id: 'BAY', name: 'Bay Street', position: { lat: 40.8380, lng: -74.1900 }, aliases: ['Bay Street (Montclair)', 'Bay Street - Montclair'] },
  { id: 'WAL', name: 'Walnut Street', position: { lat: 40.8300, lng: -74.1850 } },
  { id: 'ESS', name: 'Essex Street', position: { lat: 40.8220, lng: -74.1800 } },
  { id: 'AND', name: 'Anderson Street', position: { lat: 40.8140, lng: -74.1750 } },
  { id: 'MOU', name: 'Mountain Avenue', position: { lat: 40.8060, lng: -74.1700 } },
  { id: 'LFP', name: 'Little Falls', position: { lat: 40.8780, lng: -74.2340 } },
  { id: 'MON', name: 'Mountain View', position: { lat: 40.8920, lng: -74.2500 } },
  { id: 'MONL', name: 'Mountain Lakes', position: { lat: 40.8950, lng: -74.4320 } },
  { id: 'TOW', name: 'Towaco', position: { lat: 40.9230, lng: -74.3440 } },
  { id: 'LINP', name: 'Lincoln Park', position: { lat: 40.9250, lng: -74.3020 } },
  { id: 'EME', name: 'Emerson', position: { lat: 40.9760, lng: -74.0260 } },
  { id: 'WEST', name: 'Westwood', position: { lat: 40.9910, lng: -74.0330 } },
  { id: 'HIL', name: 'Hillsdale', position: { lat: 41.0030, lng: -74.0400 } },
  { id: 'ORAD', name: 'Oradell', position: { lat: 40.9580, lng: -74.0320 } },
  { id: 'RIVE', name: 'River Edge', position: { lat: 40.9440, lng: -74.0400 } },
  { id: 'NBL', name: 'New Bridge Landing', position: { lat: 40.9300, lng: -74.0450 } },
  { id: 'TET', name: 'Teterboro', position: { lat: 40.8600, lng: -74.0600 } },
  { id: 'WAY', name: 'Wayne/Route 23', position: { lat: 40.9250, lng: -74.2300 } },
  // Morris & Essex Line stations (west of Summit)
  { id: 'HKT', name: 'Hackettstown', position: { lat: 40.8534, lng: -74.8290 }, aliases: ['HACKETTSTOWN'] },
  { id: 'MOL', name: 'Mount Olive', position: { lat: 40.8620, lng: -74.7280 } },
  { id: 'NET', name: 'Netcong', position: { lat: 40.8980, lng: -74.7050 } },
  { id: 'LHK', name: 'Lake Hopatcong', position: { lat: 40.9450, lng: -74.6200 } },
  { id: 'MAR', name: 'Mount Arlington', position: { lat: 40.9250, lng: -74.6350 } },
  { id: 'DOV', name: 'Dover', position: { lat: 40.8840, lng: -74.5620 }, aliases: ['DOVER'] },
  { id: 'DEN', name: 'Denville', position: { lat: 40.8930, lng: -74.4770 } },
  { id: 'MTB', name: 'Mount Tabor', position: { lat: 40.8750, lng: -74.4800 } },
  { id: 'MPL', name: 'Morris Plains', position: { lat: 40.8210, lng: -74.4810 } },
  { id: 'CNV', name: 'Convent', position: { lat: 40.8000, lng: -74.4700 } },
  // Morris & Essex Line stations (east of Summit)
  { id: 'MAD', name: 'Madison', position: { lat: 40.7580, lng: -74.4170 } },
  { id: 'CHT', name: 'Chatham', position: { lat: 40.7400, lng: -74.3840 } },
  { id: 'PPK', name: 'Peapack', position: { lat: 40.7180, lng: -74.6580 } },
  { id: 'FHL', name: 'Far Hills', position: { lat: 40.6900, lng: -74.6400 } },
  { id: 'BRG', name: 'Basking Ridge', position: { lat: 40.7060, lng: -74.5490 } },
  { id: 'LYN', name: 'Lyons', position: { lat: 40.6850, lng: -74.5450 } },
  { id: 'MIL', name: 'Millington', position: { lat: 40.6800, lng: -74.5200 } },
  { id: 'STG', name: 'Stirling', position: { lat: 40.6750, lng: -74.4950 } },
  { id: 'GIL', name: 'Gillette', position: { lat: 40.6800, lng: -74.4700 } },
  { id: 'BHG', name: 'Berkeley Heights', position: { lat: 40.6830, lng: -74.4430 } },
  { id: 'MUR', name: 'Murray Hill', position: { lat: 40.6950, lng: -74.4030 } },
  { id: 'NPV', name: 'New Providence', position: { lat: 40.6980, lng: -74.4010 } },
  { id: 'SHL', name: 'Short Hills', position: { lat: 40.7470, lng: -74.3250 } },
  { id: 'MLB', name: 'Millburn', position: { lat: 40.7230, lng: -74.3020 } },
  { id: 'MPW', name: 'Maplewood', position: { lat: 40.7310, lng: -74.2730 } },
  { id: 'SO', name: 'South Orange', position: { lat: 40.7480, lng: -74.2610 } },
  { id: 'MTS', name: 'Mountain Station', position: { lat: 40.7550, lng: -74.2500 } },
  { id: 'HLA', name: 'Highland Avenue', position: { lat: 40.7600, lng: -74.2400 } },
  { id: 'ORG', name: 'Orange', position: { lat: 40.7700, lng: -74.2300 } },
  { id: 'BRC', name: 'Brick Church', position: { lat: 40.7750, lng: -74.2200 } },
  { id: 'EO', name: 'East Orange', position: { lat: 40.7800, lng: -74.2100 } },
  
  // Main/Bergen
  { id: 'RWD', name: 'Ridgewood', position: { lat: 40.9793, lng: -74.1168 } },
  { id: 'SUF', name: 'Suffern', position: { lat: 41.1148, lng: -74.1496 } },
  { id: 'WDW', name: 'Waldwick', position: { lat: 41.0100, lng: -74.1180 } },
  { id: 'HHK', name: 'Ho-Ho-Kus', position: { lat: 40.9980, lng: -74.1010 } },
  { id: 'RAM', name: 'Ramsey', position: { lat: 41.0570, lng: -74.1400 }, aliases: ['Ramsey Route 17', 'Ramsey – Main Street', 'Ramsey Main Street', 'Ramsey – Main Street (NJT station)'] },
  { id: 'MAH', name: 'Mahwah', position: { lat: 41.0890, lng: -74.1440 } },
  { id: 'SLT', name: 'Sloatsburg', position: { lat: 41.1550, lng: -74.1920 }, aliases: ['METRO NORTH STATIONSSloatsburg'] },
  { id: 'TUX', name: 'Tuxedo', position: { lat: 41.1970, lng: -74.1850 } },
  { id: 'HAR', name: 'Harriman', position: { lat: 41.3080, lng: -74.1440 } },
  { id: 'SAL', name: 'Salisbury Mills', position: { lat: 41.4320, lng: -74.1110 } },
  { id: 'CAM', name: 'Campbell Hall', position: { lat: 41.4540, lng: -74.2530 } },
  { id: 'OTI', name: 'Otisville', position: { lat: 41.4730, lng: -74.5350 } },
  { id: 'POJ', name: 'Port Jervis', position: { lat: 41.3750, lng: -74.6920 }, aliases: ['PORT JERVIS', 'METRO NORTH STATIONSPORT JERVIS'] },
  { id: 'GLE', name: 'Glen Rock', position: { lat: 40.9630, lng: -74.1280 }, aliases: ['Glen Rock - Boro Hall', 'Glen Rock - Main Line', 'Glen Rock–Boro Hall', 'Glen Rock–Main Line'] },
  { id: 'RAD', name: 'Radburn', position: { lat: 40.9450, lng: -74.1300 } },
  { id: 'BRD', name: 'Broadway', position: { lat: 40.9300, lng: -74.1350 } },
  { id: 'PLA', name: 'Plauderville', position: { lat: 40.9150, lng: -74.1400 } },
  { id: 'GAR', name: 'Garfield', position: { lat: 40.8810, lng: -74.1130 } },
  { id: 'WES', name: 'Wesmont', position: { lat: 40.8700, lng: -74.1000 } },
  { id: 'RUT', name: 'Rutherford', position: { lat: 40.8260, lng: -74.1070 } },
  { id: 'LYD', name: 'Lyndhurst', position: { lat: 40.8120, lng: -74.1250 } },
  { id: 'DEL', name: 'Delawanna', position: { lat: 40.8000, lng: -74.1300 } },
  // Main/Bergen additional infill stations (east end)
  // Coordinates sourced from each station's Wikipedia article.
  // - Allendale station (NJ Transit): https://en.wikipedia.org/wiki/Allendale_station_(NJ_Transit)
  // - Kingsland station (NJ Transit): https://en.wikipedia.org/wiki/Kingsland_station_(NJ_Transit)
  // - Wood-Ridge station: https://en.wikipedia.org/wiki/Wood-Ridge_station
  { id: 'AZ', name: 'Allendale', position: { lat: 41.0309, lng: -74.1311 } },
  { id: 'KG', name: 'Kingsland', position: { lat: 40.8101, lng: -74.1172 } },
  { id: 'WR', name: 'Wood Ridge', position: { lat: 40.8437, lng: -74.0789 } },
  { id: 'PAS', name: 'Passaic', position: { lat: 40.8570, lng: -74.1280 } },
  { id: 'CLI', name: 'Clifton', position: { lat: 40.8780, lng: -74.1640 } },
  { id: 'PAT', name: 'Paterson', position: { lat: 40.9150, lng: -74.1710 } },
  { id: 'HAW', name: 'Hawthorne', position: { lat: 40.9510, lng: -74.1540 } },
  
  // Pascack Valley
  { id: 'WCL', name: 'Woodcliff Lake', position: { lat: 41.0234, lng: -74.0640 } },
  { id: 'SPV', name: 'Spring Valley', position: { lat: 41.1148, lng: -74.0448 }, aliases: ['METRO-NORTH STATIONSSPRING VALLEY'] },
  { id: 'PR', name: 'Park Ridge', position: { lat: 41.0376, lng: -74.0398 } },
  { id: 'MV', name: 'Montvale', position: { lat: 41.0468, lng: -74.0229 }, aliases: ['Montvale, NJ'] },
  { id: 'PRL', name: 'Pearl River', position: { lat: 41.0590, lng: -74.0220 }, aliases: ['Pearl River, NY', 'METRO-NORTH STATIONSPearl River, NY'] },
  { id: 'NAN', name: 'Nanuet', position: { lat: 41.0890, lng: -74.0130 }, aliases: ['Nanuet, NY'] },
  
  // Raritan Valley
  { id: 'RSP', name: 'Roselle Park', position: { lat: 40.6650, lng: -74.2593 }, aliases: ['Roselle Park12.321.342.333.334.184.546.076.367.33'] },
  { id: 'WFD', name: 'Westfield', position: { lat: 40.6520, lng: -74.3473 } },
  { id: 'PLF', name: 'Plainfield', position: { lat: 40.6178, lng: -74.4187 } },
  { id: 'HB', name: 'High Bridge', position: { lat: 40.6682, lng: -74.8959 } },
  { id: 'CRF', name: 'Cranford', position: { lat: 40.6550, lng: -74.3000 }, aliases: ['CranfordL'] },
  { id: 'GRW', name: 'Garwood', position: { lat: 40.6520, lng: -74.3230 }, aliases: ['GarwoodL'] },
  { id: 'NTH', name: 'Netherwood', position: { lat: 40.6480, lng: -74.3400 }, aliases: ['NetherwoodL'] },
  { id: 'FAN', name: 'Fanwood', position: { lat: 40.6410, lng: -74.3830 }, aliases: ['FanwoodL'] },
  { id: 'BBK', name: 'Bound Brook', position: { lat: 40.5680, lng: -74.5310 }, aliases: ['Bound BrookL', 'Bound Brook6.508.06'] },
  // Coordinates: https://en.wikipedia.org/wiki/Union_station_(NJ_Transit)
  { id: 'UN', name: 'Union Station', position: { lat: 40.68333, lng: -74.23861 }, aliases: ['Union StationL', 'Union Station6.147.30'] },
  { id: 'RAR', name: 'Raritan', position: { lat: 40.5690, lng: -74.6330 }, aliases: ['RARITAN', 'RARITANL'] },
  { id: 'BRW', name: 'Bridgewater', position: { lat: 40.5900, lng: -74.5880 }, aliases: ['BridgewaterL'] },
  { id: 'SOM', name: 'Somerville', position: { lat: 40.5740, lng: -74.6100 }, aliases: ['SomervilleL'] },
  { id: 'DUN', name: 'Dunellen', position: { lat: 40.5890, lng: -74.4610 }, aliases: ['Dunellen4.465.246.056.366.587.057.29', 'Dunellen8.189.1810.1811.1812.181.182.183.184.18'] },
  { id: 'WH', name: 'White House', position: { lat: 40.6150, lng: -74.7700 }, aliases: ['White HouseL'] },
  { id: 'NBH', name: 'North Branch', position: { lat: 40.6030, lng: -74.6870 }, aliases: ['North BranchL'] },
  { id: 'ANN', name: 'Annandale', position: { lat: 40.6380, lng: -74.8810 }, aliases: ['AnnandaleL'] },
  { id: 'LEB', name: 'Lebanon', position: { lat: 40.6380, lng: -74.8350 }, aliases: ['LebanonL'] },
  
  // Atlantic City
  { id: 'P30', name: 'Philadelphia 30th Street', position: { lat: 39.9558, lng: -75.1821 }, aliases: ['30th Street', 'Philadelphia', 'PHILADELPHIA 30TH ST.', 'PHILADELPHIA 30TH ST'] },
  { id: 'CHL', name: 'Cherry Hill', position: { lat: 39.9348, lng: -75.0306 } },
  { id: 'ATC', name: 'Atlantic City', position: { lat: 39.3643, lng: -74.4229 }, aliases: ['ATLANTIC CITY', 'ATLANTIC CITY8.039.5411.281.002.144.06'] },
  { id: 'ABS', name: 'Absecon', position: { lat: 39.4285, lng: -74.4957 } },
  { id: 'EHC', name: 'Egg Harbor City', position: { lat: 39.5290, lng: -74.6479 } },
  { id: 'HMT', name: 'Hammonton', position: { lat: 39.6365, lng: -74.8024 } },
  { id: 'ATCO', name: 'Atco', position: { lat: 39.7690, lng: -74.8832 } },
  { id: 'LDL', name: 'Lindenwold', position: { lat: 39.8173, lng: -75.0946 } },
  { id: 'PNS', name: 'Pennsauken', position: { lat: 39.9651, lng: -75.0580 } },
  { id: 'CTC', name: 'Camden Transit Center', position: { lat: 39.9440, lng: -75.1190 }, aliases: ['Camden Transit Center-Broadway'] },
  
  // Gladstone Branch
  { id: 'BER', name: 'Bernardsville', position: { lat: 40.7188, lng: -74.5699 } },
  { id: 'GLD', name: 'Gladstone', position: { lat: 40.7553, lng: -74.6624 } },
  
  // Princeton Branch
  { id: 'PJ', name: 'Princeton Junction', position: { lat: 40.3171, lng: -74.6235 }, aliases: ['Princeton Jct'] },
  { id: 'PRI', name: 'Princeton', position: { lat: 40.3495, lng: -74.6591 } },
];

/**
 * Fuzzy string matching using Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();

  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[bLower.length][aLower.length];
}

/**
 * Normalize station name for matching
 */
function normalizeStationName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]/g, '')
    .replace(/station$/, '')
    .replace(/st\./g, 'street')
    .replace(/ave\./g, 'avenue')
    .trim();
}

/**
 * Map a timetable station name to a canonical station ID
 * Uses fuzzy matching with fallback
 */
export function mapStationName(
  timetableName: string,
  lineId?: string
): { id: string; name: string; position: Position } | null {
  const normalized = normalizeStationName(timetableName);

  // Exact match first
  for (const station of STATION_DATABASE) {
    if (normalizeStationName(station.name) === normalized) {
      return {
        id: station.id,
        name: station.name,
        position: station.position,
      };
    }

    // Check aliases
    if (station.aliases) {
      for (const alias of station.aliases) {
        if (normalizeStationName(alias) === normalized) {
          return {
            id: station.id,
            name: station.name,
            position: station.position,
          };
        }
      }
    }
  }

  // Fuzzy match with threshold
  let bestMatch: { station: StationData; distance: number } | null = null;
  const threshold = Math.min(3, Math.floor(timetableName.length * 0.3)); // Adaptive threshold

  for (const station of STATION_DATABASE) {
    const distance = levenshteinDistance(normalized, normalizeStationName(station.name));
    if (distance <= threshold) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { station, distance };
      }
    }

    // Check aliases
    if (station.aliases) {
      for (const alias of station.aliases) {
        const aliasDistance = levenshteinDistance(normalized, normalizeStationName(alias));
        if (aliasDistance <= threshold) {
          if (!bestMatch || aliasDistance < bestMatch.distance) {
            bestMatch = { station, distance: aliasDistance };
          }
        }
      }
    }
  }

  if (bestMatch && bestMatch.distance <= threshold) {
    return {
      id: bestMatch.station.id,
      name: bestMatch.station.name,
      position: bestMatch.station.position,
    };
  }

  // No match found - fail closed
  console.warn(`[Station Mapping] Could not map station: "${timetableName}" (line: ${lineId || 'unknown'})`);
  return null;
}

/**
 * Get all stations for a given line (for geometry interpolation)
 */
export function getLineStations(lineId: string): Array<{ id: string; name: string; position: Position }> {
  // Map line ID to known stations (from TransitLines.tsx)
  const lineStationNames: Record<string, string[]> = {
    'Northeast Corridor': ['New York Penn Station', 'Secaucus Junction', 'Newark Penn Station', 'Newark Airport', 'Trenton'],
    'North Jersey Coast': ['New York Penn Station', 'Secaucus Junction', 'Newark Penn Station', 'Long Branch', 'Bay Head'],
    'Morris & Essex': ['Hoboken', 'Secaucus Junction', 'Newark Broad St', 'Summit', 'Morristown'],
    'Montclair-Boonton': ['Hoboken', 'Newark Broad St', 'Montclair State University', 'Boonton'],
    'Main Line': ['Hoboken', 'Secaucus Junction', 'Ridgewood', 'Suffern'],
    'Bergen County': ['Hoboken', 'Secaucus Junction', 'Ridgewood', 'Suffern'],
    'Port Jervis': ['Suffern', 'Sloatsburg', 'Port Jervis'],
    'Pascack Valley': ['Hoboken', 'Secaucus Junction', 'Woodcliff Lake', 'Spring Valley'],
    'Raritan Valley': ['Newark Penn Station', 'Roselle Park', 'Westfield', 'Plainfield', 'High Bridge'],
    'Atlantic City': ['Philadelphia 30th Street', 'Cherry Hill', 'Atlantic City'],
    'Gladstone Branch': ['Newark Broad St', 'Summit', 'Bernardsville', 'Gladstone'],
    'Princeton Branch': ['Princeton Junction', 'Princeton'],
  };

  const stationNames = lineStationNames[lineId] || [];
  const stations: Array<{ id: string; name: string; position: Position }> = [];

  for (const stationName of stationNames) {
    const mapped = mapStationName(stationName);
    if (mapped) {
      stations.push(mapped);
    }
  }

  return stations;
}

/**
 * Interpolate position between two stations
 */
export function interpolatePosition(
  fromStation: { position: Position },
  toStation: { position: Position },
  progress: number
): Position {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return {
    lat: fromStation.position.lat + (toStation.position.lat - fromStation.position.lat) * clampedProgress,
    lng: fromStation.position.lng + (toStation.position.lng - fromStation.position.lng) * clampedProgress,
  };
}

