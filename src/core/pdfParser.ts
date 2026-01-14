/**
 * PDF Timetable Parser
 * Extracts train schedules from NJ Transit PDF timetables
 * 
 * NOTE: This module is intended for build-time use (Node.js environment).
 * For browser use, schedules should be pre-processed to JSON files.
 * 
 * This parser extracts all times at each station, then builds trips from time sequences.
 */

import type { ScheduledTrip } from '../types/schedule';
import { LINE_NAME_MAP } from '../types/schedule';
import { normalizeOvernightTimes } from './timeUtils';
import { mapStationName } from './stationMapping';

/**
 * Map PDF filename patterns to canonical line names
 * Filenames now include the full line name (e.g., "atlantic-city.pdf", "main-bergen.pdf")
 */
const FILENAME_TO_LINE_MAP: Record<string, string> = {
  'atlantic-city': 'Atlantic City',
  // This PDF includes multiple services; we treat it as Main Line by default and
  // further classify trips into Main Line / Bergen County / Port Jervis based on stops.
  'main-bergen': 'Main Line',
  'montclair-boonton': 'Montclair-Boonton',
  'morris-essex': 'Morris & Essex',
  'north-jersey-coastline': 'North Jersey Coast',
  'pascack-valley': 'Pascack Valley',
  'raritan-valley': 'Raritan Valley',
  'trenton': 'Northeast Corridor',
};

/**
 * Extract line name from PDF filename
 * Handles formats like:
 * - "atlantic-city.pdf" → "Atlantic City"
 * - "atlantic-city-weekend.pdf" → "Atlantic City"
 * - "main-bergen.pdf" → "Main Line" (then split to Main Line / Bergen County / Port Jervis)
 */
function extractLineNameFromFilename(filename: string): string {
  // Remove .pdf extension
  let nameWithoutExt = filename.replace(/\.pdf$/i, '');
  
  // Remove "-weekend" suffix if present
  nameWithoutExt = nameWithoutExt.replace(/-weekend$/i, '');
  
  // Look up in filename-to-line mapping
  const lineName = FILENAME_TO_LINE_MAP[nameWithoutExt];
  if (lineName) {
    return lineName;
  }
  
  // Fallback: try to match partial patterns (for backwards compatibility)
  // Check if any key in the map is contained in the filename
  for (const [key, value] of Object.entries(FILENAME_TO_LINE_MAP)) {
    if (nameWithoutExt.includes(key) || key.includes(nameWithoutExt)) {
      console.log(`[PDF Parser]   Matched "${nameWithoutExt}" to "${value}" via partial match with "${key}"`);
      return value;
    }
  }
  
  // Last resort: try old code-based approach for backwards compatibility
  const lineCode = nameWithoutExt.split('-')[0].toUpperCase();
  const mappedLine = LINE_NAME_MAP[lineCode];
  if (mappedLine) {
    console.log(`[PDF Parser]   Matched "${nameWithoutExt}" to "${mappedLine}" via code "${lineCode}"`);
    return mappedLine;
  }
  
  // If all else fails, return a normalized version of the filename
  console.warn(`[PDF Parser]   ⚠ Could not map filename "${filename}" to a line name. Using normalized filename.`);
  return nameWithoutExt
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Parse a PDF timetable file (Node.js only - use at build time)
 */
export async function parseTimetablePDF(
  pdfPath: string,
  serviceType: 'weekday' | 'weekend'
): Promise<ScheduledTrip[]> {
  if (typeof window !== 'undefined') {
    throw new Error('parseTimetablePDF can only be used in Node.js environment. Use pre-processed JSON schedules in the browser.');
  }

  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const filename = path.basename(pdfPath);

  try {
    const pdfExtraction = await import('pdf-extraction');
    const pdfBuffer = await fs.readFile(pdfPath);
    
    const result = await pdfExtraction.default(pdfBuffer, {
      normalizeWhitespace: true,
    });
    
    const text = result.text || '';
    const textLength = text.length;
    
    console.log(`[PDF Parser] Processing: ${filename}`);
    console.log(`[PDF Parser]   Extracted ${textLength} characters from PDF`);

    const lineId = extractLineNameFromFilename(filename);
    console.log(`[PDF Parser]   Mapped to line: ${lineId}`);

    if (textLength < 100) {
      console.warn(`[PDF Parser]   ⚠ WARNING: Very little text extracted (${textLength} chars). PDF may be corrupted or image-based.`);
    }

    const trips = parseTimetableText(text, lineId, serviceType);
    
    if (trips.length === 0) {
      console.warn(`[PDF Parser]   ⚠ WARNING: No trips extracted from ${filename} (line: ${lineId})`);
      console.warn(`[PDF Parser]   This could indicate:`);
      console.warn(`[PDF Parser]     - PDF format not recognized`);
      console.warn(`[PDF Parser]     - No valid station/time data found`);
      console.warn(`[PDF Parser]     - Station mapping issues`);
    } else {
      // Group trips by detected line (in case line detection changed them)
      const tripsByLine: Record<string, number> = {};
      trips.forEach(trip => {
        tripsByLine[trip.line_id] = (tripsByLine[trip.line_id] || 0) + 1;
      });
      
      console.log(`[PDF Parser]   ✓ Extracted ${trips.length} trips`);
      if (Object.keys(tripsByLine).length > 1) {
        console.log(`[PDF Parser]   Line breakdown: ${Object.entries(tripsByLine).map(([line, count]) => `${line} (${count})`).join(', ')}`);
      }
    }

    return trips;
  } catch (error) {
    console.error(`[PDF Parser]   ✗ ERROR parsing ${filename}:`, error);
    if (error instanceof Error) {
      console.error(`[PDF Parser]   Error message: ${error.message}`);
      console.error(`[PDF Parser]   Stack: ${error.stack}`);
    }
    return [];
  }
}

/**
 * Station with all its times extracted
 */
interface StationTimes {
  name: string;
  times: Array<{ timeStr: string; hour: number; minute: number; lineIndex: number }>;
  lineIndex: number;
}

/**
 * Detect the correct line/branch ID based on stations in the trip
 * This handles cases where one PDF contains multiple branches (e.g., ME PDF has both Morristown and Gladstone)
 */
function detectLineIdFromStations(
  stops: Array<{ stop_id: string; station_name: string }>,
  baseLineId: string
): string {
  // Get all station IDs and names in the trip
  const stationIds = new Set(stops.map(s => s.stop_id));
  const stationNames = stops.map(s => s.station_name.toLowerCase());

  // Check for branch-specific terminal stations first (most specific checks)
  
  // Gladstone Branch: trips that include Gladstone (from ME PDF)
  if (stationIds.has('GLD') || stationNames.some(name => name.includes('gladstone'))) {
    return 'Gladstone Branch';
  }

  // Raritan Valley: trips that include High Bridge (terminal station for RVL)
  if (stationIds.has('HB') || stationNames.some(name => name.includes('high bridge'))) {
    return 'Raritan Valley';
  }

  // Montclair-Boonton: trips that include Boonton (terminal station)
  // Only if coming from MB PDF (to avoid misclassification from other PDFs)
  if (baseLineId === 'Montclair-Boonton' || baseLineId === 'Main Line') {
    if (stationIds.has('BON') || stationNames.some(name => name.includes('boonton'))) {
      return 'Montclair-Boonton';
    }
  }

  // Split Main Line / Bergen County / Port Jervis from the combined main-bergen PDF.
  if (baseLineId === 'Main Line') {
    // Port Jervis: identify by western NY terminals.
    if (stationIds.has('POJ') || stationNames.some((n) => n.includes('port jervis'))) {
      return 'Port Jervis';
    }

    // Bergen County: identify by Bergen-only infill stations.
    if (stationIds.has('WES') || stationNames.some((n) => n.includes('wesmont'))) return 'Bergen County';
    if (stationIds.has('PLA') || stationNames.some((n) => n.includes('plauderville'))) return 'Bergen County';
    if (stationIds.has('RAD') || stationNames.some((n) => n.includes('radburn'))) return 'Bergen County';
    if (stationIds.has('RUT') || stationNames.some((n) => n.includes('rutherford'))) return 'Bergen County';

    return 'Main Line';
  }

  // Morristown Line: trips that include Morristown (and not Gladstone, which we already checked)
  // These stay as "Morris & Essex" since Morristown is the main line
  // (Morristown Line is part of the Morris & Essex system)

  // Default: return the base line ID from the PDF filename
  return baseLineId;
}

/**
 * Parse timetable text content
 * New approach: Extract all times at each station, then build trips from time sequences
 */
function parseTimetableText(
  text: string,
  lineId: string,
  serviceType: 'weekday' | 'weekend'
): ScheduledTrip[] {
  const trips: ScheduledTrip[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Determine direction from header
  let direction: 'inbound' | 'outbound' = 'inbound';
  if (text.includes('TO TRENTON') || text.includes('FROM NEW YORK') || text.includes('TO HOBOKEN')) {
    direction = 'outbound';
  } else if (text.includes('TO NY') || text.includes('TO NEW YORK') || text.includes('FROM TRENTON')) {
    direction = 'inbound';
  }

  // Extract all station rows with their times
  const stationTimes: StationTimes[] = [];
  const timePattern = /\d{1,2}\.\d{2}/g;
  const stationNamePattern = /^[A-Z][A-Za-z\s&'.,-]{2,}/;

  // Helper to extract all times from a string
  const extractTimes = (text: string): Array<{ timeStr: string; hour: number; minute: number }> => {
    const matches: Array<{ timeStr: string; hour: number; minute: number }> = [];
    const regex = /\d{1,2}\.\d{2}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const [hourStr, minuteStr] = match[0].split('.');
      matches.push({
        timeStr: match[0],
        hour: parseInt(hourStr, 10),
        minute: parseInt(minuteStr, 10),
      });
    }
    return matches;
  };

  // Find all station rows and extract their times
  // Handle two formats:
  // 1. Station name and times on same line: "TRENTON3.474.175.06..."
  // 2. Station name on one line, times on next line(s): "Mount Arlington\n6.10   6.22"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip notes, headers, etc.
    if (line.includes('NOTES:') || line.includes('EFFECTIVE') || 
        line.includes('Q indicates') || line.includes('TRAINS') ||
        line.includes('via ') || line.includes('arrive ') ||
        line.includes('Departing from:') || line.includes('Jefferson Station') ||
        line.includes('Suburban Station') || line.includes('30th Street Station') ||
        line.length < 3) {
      continue;
    }
    
    // Check if this looks like a station name
    const startsWithStation = /^[A-Z][A-Za-z\s&'.,-]{2,}/.test(line);
    const hasTimes = timePattern.test(line);
    const isStationLike = startsWithStation && !line.match(/^\d/) && 
        !line.includes('A.M.') && !line.includes('P.M.') && 
        !line.includes('A.M') && !line.includes('P.M') &&
        !line.match(/^[A-Z]\.[A-Z]\./);
    
    // Format 1: Station name and times on same line
    const isStationWithTimes = isStationLike && hasTimes;
    // Format 2: Station name on this line, times on next line(s)
    const isStationNameOnly = isStationLike && !hasTimes && 
        i + 1 < lines.length && timePattern.test(lines[i + 1]) &&
        !stationNamePattern.test(lines[i + 1]); // Next line is not another station
    
    if (isStationWithTimes || isStationNameOnly) {
      // Extract station name
      let stationName = line.trim();
      let lineForTimes = '';
      
      if (isStationWithTimes) {
        // Format 1: Station name and times on same line
        // Try to match station name before first time pattern
        // Handle cases like "PHILADELPHIA 30TH ST.5.47" or "TRENTON3.47"
        const timeMatch = line.match(/^([A-Z][A-Za-z\s&'.,-]+?)(\d{1,2}\.\d{2})/);
        if (timeMatch) {
          stationName = timeMatch[1].trim();
          lineForTimes = line.substring(timeMatch[1].length);
        } else {
          // Try alternative: look for common station name patterns followed by spaces and times
          const spacedTimeMatch = line.match(/^([A-Z][A-Za-z\s&'.,-]{3,}?)\s+(\d{1,2}\.\d{2})/);
          if (spacedTimeMatch) {
            stationName = spacedTimeMatch[1].trim();
            lineForTimes = line.substring(spacedTimeMatch[1].length).trim();
          } else {
            // Last resort: find where times start (first occurrence of digit.digit pattern)
            const firstTimeMatch = line.match(/(\d{1,2}\.\d{2})/);
            if (firstTimeMatch && firstTimeMatch.index !== undefined) {
              stationName = line.substring(0, firstTimeMatch.index).trim();
              lineForTimes = line.substring(firstTimeMatch.index);
            } else {
              lineForTimes = line;
            }
          }
        }
      } else {
        // Format 2: Station name only, times on next line(s)
        // Times will be extracted from next lines
      }
      
      // Clean up station name
      stationName = stationName.replace(/\.+$/, '').trim();
      
      // Skip if station name is too short or looks invalid
      if (stationName.length < 3 || /^[A-Z]$/.test(stationName)) {
        continue;
      }
      
      // Extract all times from this line and next few lines
      const allTimes: Array<{ timeStr: string; hour: number; minute: number; lineIndex: number }> = [];
      
      // Check current line first (if it has times)
      if (lineForTimes) {
        const currentTimes = extractTimes(lineForTimes);
        currentTimes.forEach(t => {
          allTimes.push({ ...t, lineIndex: i });
        });
      }
      
      // Check next few lines for times (but not if it's another station)
      // For format 2, start from next line; for format 1, continue from current
      const startJ = isStationNameOnly ? 1 : (lineForTimes ? 1 : 0);
      for (let j = startJ; j <= 5 && i + j < lines.length; j++) {
        const nextLine = lines[i + j];
        // If next line is clearly another station name (capitalized, no numbers), stop
        if (stationNamePattern.test(nextLine) && !extractTimes(nextLine).length && j > 1) {
          break;
        }
        const nextTimes = extractTimes(nextLine);
        if (nextTimes.length > 0) {
          // Add times if line doesn't look like a station name, or has many times
          if (!stationNamePattern.test(nextLine) || nextTimes.length > 2) {
            nextTimes.forEach(t => {
              allTimes.push({ ...t, lineIndex: i + j });
            });
            // For format 2, stop after first line with times
            if (isStationNameOnly && j === 1) {
              break;
            }
          } else {
            break;
          }
        } else if (isStationNameOnly && j === 1) {
          // For format 2, if first next line has no times, this might not be a valid station
          break;
        }
      }
      
      if (allTimes.length > 0) {
        stationTimes.push({
          name: stationName,
          times: allTimes,
          lineIndex: i,
        });
      }
    }
  }

  if (stationTimes.length === 0) {
    console.warn(`[PDF Parser] No station rows found in ${lineId}`);
    return [];
  }

  // Now build trips from time sequences
  // Strategy: For each time at the first station, try to find a matching sequence
  // of times at subsequent stations that progress logically
  
  // Group times by hour to help with AM/PM detection
  const detectAMPM = (stationTimesList: StationTimes[]): Map<number, 'AM' | 'PM'> => {
    const timeContext = new Map<number, 'AM' | 'PM'>();
    
    // Look for patterns: 12.x followed by 1-11.x (PM pattern)
    // Or early hours (1-6) followed by later hours (7-12) (AM to PM transition)
    for (const station of stationTimesList) {
      const hours = station.times.map(t => t.hour);
      
      // Check for 12.x -> 1-11.x pattern
      for (let i = 0; i < hours.length - 1; i++) {
        if (hours[i] === 12 && hours[i + 1] >= 1 && hours[i + 1] <= 11) {
          // Mark 12.x and subsequent 1-11.x as PM
          for (let j = i; j < hours.length; j++) {
            if (hours[j] === 12 || (hours[j] >= 1 && hours[j] <= 11)) {
              timeContext.set(station.times[j].lineIndex * 10000 + j, 'PM');
            }
          }
        }
      }
      
      // Check for early hours (1-6) -> later hours (7-12) transition
      for (let i = 0; i < hours.length - 1; i++) {
        if (hours[i] >= 1 && hours[i] <= 6 && hours[i + 1] >= 7 && hours[i + 1] <= 12) {
          // Times before transition are AM, after are PM
          for (let j = 0; j <= i; j++) {
            if (hours[j] >= 1 && hours[j] <= 6) {
              timeContext.set(station.times[j].lineIndex * 10000 + j, 'AM');
            }
          }
          for (let j = i + 1; j < hours.length; j++) {
            if (hours[j] >= 7 && hours[j] <= 12) {
              timeContext.set(station.times[j].lineIndex * 10000 + j, 'PM');
            }
          }
        }
      }
      
      // If times start with 7-12 and we're in a later part of the PDF, likely PM
      if (station.lineIndex > 50 && hours.length > 0 && hours[0] >= 7 && hours[0] <= 12) {
        station.times.forEach((t, idx) => {
          if (t.hour >= 7 && t.hour <= 12) {
            timeContext.set(t.lineIndex * 10000 + idx, 'PM');
          }
        });
      }
    }
    
    return timeContext;
  };

  const ampmContext = detectAMPM(stationTimes);

  // Find AM/PM indicator line to determine which columns are AM vs PM
  const findAMPMColumns = (): Map<number, 'AM' | 'PM'> => {
    const columnAMPM = new Map<number, 'AM' | 'PM'>();
    
    // Look for AM/PM indicator lines in the text
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if ((line.includes('A.M.') || line.includes('A.M') || line.includes('P.M.') || line.includes('P.M')) &&
          (line.match(/A\.M\.?/g) || []).length + (line.match(/P\.M\.?/g) || []).length >= 5) {
        // This is an AM/PM indicator line
        const amMatches = line.match(/A\.M\.?/g) || [];
        const pmMatches = line.match(/P\.M\.?/g) || [];
        const amCount = amMatches.length;
        
        // Mark columns: first amCount columns are AM, rest are PM
        for (let col = 0; col < amCount; col++) {
          columnAMPM.set(col, 'AM');
        }
        for (let col = amCount; col < amCount + pmMatches.length; col++) {
          columnAMPM.set(col, 'PM');
        }
        break; // Use first valid AM/PM line
      }
    }
    
    return columnAMPM;
  };

  const columnAMPM = findAMPMColumns();

  // Build trips by matching times by COLUMN POSITION (not time sequence)
  // In PDFs, times are arranged in columns - same column = same train
  const usedTimes = new Set<string>();
  let tripCounter = 0;

  if (stationTimes.length === 0) return [];

  // Find the maximum number of times across all stations (number of trains/columns)
  const maxTimes = Math.max(...stationTimes.map(s => s.times.length));
  
  // Build trips by column position
  for (let columnIdx = 0; columnIdx < maxTimes; columnIdx++) {
    const stops: Array<{ stop_id: string; station_name: string; arrival_time: number }> = [];
    let currentIsPM: boolean | null = null;
    
    // For each station, try to get the time at this column position
    for (let stationIdx = 0; stationIdx < stationTimes.length; stationIdx++) {
      const station = stationTimes[stationIdx];
      
      // Skip if this station doesn't have a time at this column
      if (columnIdx >= station.times.length) {
        continue; // Express train - skip this station
      }
      
      const time = station.times[columnIdx];
      const timeKey = `${station.lineIndex}-${time.timeStr}-${columnIdx}`;
      
      // Skip if we've already used this time (shouldn't happen, but safety check)
      if (usedTimes.has(timeKey)) {
        continue;
      }
      
      // Determine AM/PM for this time
      // Priority: column AM/PM indicator > context > heuristics
      let isPM = false;
      
      if (columnAMPM.has(columnIdx)) {
        // Use column-level AM/PM indicator (most reliable)
        isPM = columnAMPM.get(columnIdx) === 'PM';
      } else {
        // Fall back to context or heuristics
        const contextKey = time.lineIndex * 10000 + columnIdx;
        isPM = ampmContext.get(contextKey) === 'PM';
        
        if (!ampmContext.has(contextKey)) {
          // Use heuristics or inherit from previous station in same column
          if (currentIsPM !== null) {
            isPM = currentIsPM; // Inherit from previous station
          } else if (time.hour >= 7 && time.hour <= 12 && station.lineIndex > 50) {
            isPM = true;
          } else if (time.hour >= 1 && time.hour <= 6) {
            isPM = false;
          } else {
            isPM = time.hour >= 7; // Default heuristic
          }
        }
      }
      
      currentIsPM = isPM;
      
      // Convert to 24-hour format
      let hour24 = time.hour;
      if (isPM && time.hour < 12) {
        hour24 = time.hour + 12;
      } else if (!isPM && time.hour === 12) {
        hour24 = 0;
      }
      
      const timeSeconds = hour24 * 3600 + time.minute * 60;
      const mappedStation = mapStationName(station.name, lineId);
      
      if (mappedStation) {
        // Validate: time should be after the last stop (or handle overnight)
        let isValidTime = true;
        if (stops.length > 0) {
          const lastTime = stops[stops.length - 1].arrival_time;
          let timeDiff = timeSeconds - lastTime;
          if (timeDiff < 0) timeDiff += 86400; // Overnight
          
          // Time should be at least 1 minute after last stop, and at most 4 hours
          if (timeDiff < 60 || timeDiff > 14400) {
            isValidTime = false;
          }
          
          // Don't add duplicate stations (same station ID)
          if (mappedStation.id === stops[stops.length - 1].stop_id) {
            isValidTime = false;
          }
        }
        
        if (isValidTime) {
          // Additional check: don't add if this station was just added (prevents duplicates)
          if (stops.length > 0 && stops[stops.length - 1].stop_id === mappedStation.id) {
            // Same station as last - skip (might be from different section)
            continue;
          }
          
          stops.push({
            stop_id: mappedStation.id,
            station_name: mappedStation.name,
            arrival_time: timeSeconds,
          });
          usedTimes.add(timeKey);
        }
      }
      // Continue even if station doesn't map (express train might skip unmapped stations)
    }

    // Remove any remaining duplicates (by station ID) before creating trip
    const uniqueStops: typeof stops = [];
    const seenStationIds = new Set<string>();
    for (const stop of stops) {
      if (!seenStationIds.has(stop.stop_id)) {
        uniqueStops.push(stop);
        seenStationIds.add(stop.stop_id);
      }
    }
    
    // Only create trip if it has at least 3 stops (more realistic)
    // But allow 2 stops for very short routes
    if (uniqueStops.length >= 2) {
      tripCounter++;
      const trainId = `AUTO-${tripCounter}`;
      
      // Normalize overnight times
      const times = uniqueStops.map(s => s.arrival_time);
      const normalized = normalizeOvernightTimes(times);
      uniqueStops.forEach((stop, i) => {
        stop.arrival_time = normalized[i];
      });
      
      // Sort by time
      uniqueStops.sort((a, b) => a.arrival_time - b.arrival_time);
      
      // Final validation: ensure times are in reasonable order
      let isValidTrip = true;
      for (let i = 1; i < uniqueStops.length; i++) {
        const prevTime = uniqueStops[i - 1].arrival_time;
        const currTime = uniqueStops[i].arrival_time;
        let timeDiff = currTime - prevTime;
        if (timeDiff < 0) timeDiff += 86400; // Overnight
        
        // Times should be increasing and reasonable (1 min to 4 hours)
        if (timeDiff < 60 || timeDiff > 14400) {
          isValidTrip = false;
          break;
        }
      }
      
      if (isValidTrip) {
        // Detect the correct line/branch ID based on stations in the trip
        // This handles cases where one PDF contains multiple branches
        const detectedLineId = detectLineIdFromStations(uniqueStops, lineId);
        
        trips.push({
          train_id: trainId,
          line_id: detectedLineId,
          direction,
          stops: uniqueStops,
          service_type: serviceType,
        });
      }
    }
  }

  // Log detailed statistics
  if (stationTimes.length === 0) {
    console.warn(`[PDF Parser]   ⚠ No station rows found in text for ${lineId}`);
  } else {
    console.log(`[PDF Parser]   Found ${stationTimes.length} stations with time data`);
    const totalTimes = stationTimes.reduce((sum, st) => sum + st.times.length, 0);
    console.log(`[PDF Parser]   Total time entries: ${totalTimes}`);
    console.log(`[PDF Parser]   Max times per station: ${Math.max(...stationTimes.map(st => st.times.length))}`);
  }

  console.log(`[PDF Parser]   Extracted ${trips.length} trips from ${lineId} (${serviceType})`);
  
  // Log trip direction breakdown
  if (trips.length > 0) {
    const inboundCount = trips.filter(t => t.direction === 'inbound').length;
    const outboundCount = trips.filter(t => t.direction === 'outbound').length;
    console.log(`[PDF Parser]   Direction breakdown: ${inboundCount} inbound, ${outboundCount} outbound`);
  }
  
  return trips;
}

/**
 * Load all timetable PDFs for a service type (Node.js only - use at build time)
 */
export async function loadAllTimetables(
  schedulesDir: string,
  serviceType: 'weekday' | 'weekend'
): Promise<ScheduledTrip[]> {
  if (typeof window !== 'undefined') {
    throw new Error('loadAllTimetables can only be used in Node.js environment. Use pre-processed JSON schedules in the browser.');
  }

  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  const serviceDir = path.join(schedulesDir, serviceType);
  const files = await fs.readdir(serviceDir);
  const pdfFiles = files.filter((f: string) => f.endsWith('.pdf'));

  const allTrips: ScheduledTrip[] = [];
  const processingStats: Array<{ filename: string; trips: number; lineId: string }> = [];

  console.log(`[PDF Parser] Found ${pdfFiles.length} PDF files to process`);
  console.log(`[PDF Parser] Files: ${pdfFiles.join(', ')}`);
  console.log('');

  for (const pdfFile of pdfFiles) {
    const pdfPath = path.join(serviceDir, pdfFile);
    const trips = await parseTimetablePDF(pdfPath, serviceType);
    
    // Determine line ID from filename for stats
    const lineId = extractLineNameFromFilename(pdfFile);
    processingStats.push({
      filename: pdfFile,
      trips: trips.length,
      lineId: lineId,
    });
    
    allTrips.push(...trips);
    console.log(''); // Blank line between files
  }

  // Summary statistics
  console.log('='.repeat(80));
  console.log(`[PDF Parser] PROCESSING SUMMARY for ${serviceType.toUpperCase()}`);
  console.log('='.repeat(80));
  
  const tripsByLine: Record<string, number> = {};
  allTrips.forEach(trip => {
    tripsByLine[trip.line_id] = (tripsByLine[trip.line_id] || 0) + 1;
  });
  
  console.log(`Total trips extracted: ${allTrips.length}`);
  console.log('');
  console.log('Trips by PDF file:');
  processingStats.forEach(stat => {
    const status = stat.trips > 0 ? '✓' : '✗';
    console.log(`  ${status} ${stat.filename.padEnd(35)} → ${stat.trips.toString().padStart(4)} trips (line: ${stat.lineId})`);
  });
  
  console.log('');
  console.log('Trips by line (after line detection):');
  Object.entries(tripsByLine)
    .sort((a, b) => b[1] - a[1])
    .forEach(([line, count]) => {
      console.log(`  ${line.padEnd(30)} ${count.toString().padStart(4)} trips`);
    });
  
  console.log('='.repeat(80));
  console.log('');

  return allTrips;
}
