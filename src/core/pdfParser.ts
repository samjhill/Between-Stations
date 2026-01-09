/**
 * PDF Timetable Parser
 * Extracts train schedules from NJ Transit PDF timetables
 * 
 * NOTE: This module is intended for build-time use (Node.js environment).
 * For browser use, schedules should be pre-processed to JSON files.
 * 
 * This is a simplified parser that works with text-extracted PDFs.
 * In production, you might want more sophisticated table extraction.
 */

import type { ScheduledTrip } from '../types/schedule';
import { LINE_NAME_MAP } from '../types/schedule';
import { parseTime, normalizeOvernightTimes } from './timeUtils';
import { mapStationName } from './stationMapping';

/**
 * Parse a PDF timetable file (Node.js only - use at build time)
 * This function requires Node.js fs and pdf-parse
 */
export async function parseTimetablePDF(
  pdfPath: string,
  serviceType: 'weekday' | 'weekend'
): Promise<ScheduledTrip[]> {
  // This function should only be called in Node.js environment (build scripts)
  if (typeof window !== 'undefined') {
    throw new Error('parseTimetablePDF can only be used in Node.js environment. Use pre-processed JSON schedules in the browser.');
  }

  try {
    // Dynamic import for Node.js only dependencies
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    
    // Use pdf-extraction which is more Node.js friendly
    const pdfExtraction = await import('pdf-extraction');
    const pdfBuffer = await fs.readFile(pdfPath);
    
    const result = await pdfExtraction.default(pdfBuffer, {
      // Extract text only, no images
      normalizeWhitespace: true,
    });
    
    const text = result.text || '';

    // Extract line name from filename (e.g., "NEC-WKDY-0082425.pdf" -> "NEC")
    const filename = path.basename(pdfPath);
    const lineCode = filename.split('-')[0];
    const lineId = LINE_NAME_MAP[lineCode] || lineCode;

    // Parse the text to extract trips
    return parseTimetableText(text, lineId, serviceType);
  } catch (error) {
    console.error(`[PDF Parser] Error parsing ${pdfPath}:`, error);
    return [];
  }
}

/**
 * Parse timetable text content
 * Handles NJ Transit PDF format - supports both formats:
 * 1. Train numbers concatenated, station names with times on same line
 * 2. Train numbers spaced, station names on separate lines with times below
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

  // Find AM/PM sections - there might be both
  let amSectionEnd = -1;
  let pmSectionStart = -1;
  let amPmLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if ((lines[i].includes('A.M.') || lines[i].includes('A.M')) && amSectionEnd === -1) {
      amSectionEnd = i + 50; // Estimate AM section extends ~50 lines
      amPmLineIndex = i;
    }
    if (lines[i].includes('P.M.') || lines[i].includes('P.M')) {
      pmSectionStart = i;
      if (amPmLineIndex === -1) amPmLineIndex = i;
      break;
    }
  }
  if (amPmLineIndex === -1) amPmLineIndex = 0; // Default if not found

  // Find train number line - could be concatenated or spaced, might have "TRAINS" prefix
  let trainNumbers: string[] = [];
  let trainNumberLineIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle "TRAINS" prefix (Atlantic City format)
    let workingLine = line;
    if (line.includes('TRAINS')) {
      workingLine = line.replace(/TRAINS\s+/i, '');
    }
    
    // Try concatenated format (many 4-digit numbers together)
    const fourDigitMatches = workingLine.match(/\d{4}/g);
    if (fourDigitMatches && fourDigitMatches.length >= 5) {
      trainNumbers = fourDigitMatches;
      trainNumberLineIndex = i;
      break;
    }
    
    // Try spaced format (numbers separated by spaces)
    const spacedNumbers = workingLine.split(/\s+/).filter(n => /^\d{2,4}$/.test(n));
    if (spacedNumbers.length >= 5) {
      trainNumbers = spacedNumbers;
      trainNumberLineIndex = i;
      break;
    }
  }
  
  // Check for multiple train number lines (North Jersey Coast has multiple lines)
  // Look for additional lines with train numbers near the first one
  if (trainNumberLineIndex >= 0 && trainNumberLineIndex < lines.length - 2) {
    for (let i = trainNumberLineIndex + 1; i < Math.min(trainNumberLineIndex + 4, lines.length); i++) {
      const line = lines[i];
      // Skip AM/PM lines
      if (line.includes('A.M.') || line.includes('P.M.') || line.includes('Departing')) {
        continue;
      }
      
      // Try to extract additional train numbers
      const fourDigitMatches = line.match(/\d{4}/g);
      if (fourDigitMatches && fourDigitMatches.length >= 3) {
        trainNumbers.push(...fourDigitMatches);
      } else {
        const spacedNumbers = line.split(/\s+/).filter(n => /^\d{2,4}$/.test(n));
        if (spacedNumbers.length >= 3) {
          trainNumbers.push(...spacedNumbers);
        }
      }
    }
  }
  
  // Remove duplicates and sort
  trainNumbers = [...new Set(trainNumbers)];

  if (trainNumbers.length === 0) {
    console.warn(`[PDF Parser] No train numbers found in ${lineId}`);
    return [];
  }

  // Parse stations and times
  // Format 1: Station name on one line, times on same or next line(s)
  const stationRows: Array<{ name: string; times: string[]; lineIndex: number }> = [];
  
  // Look for station names (capitalized words, not numbers, not "A.M." etc.)
  // Allow all caps (like "ATLANTIC CITY") or mixed case
  const stationNamePattern = /^[A-Z][A-Za-z\s&'.,-]{2,}/;
  const timePattern = /\d{1,2}\.\d{2}/g;
  
  let i = Math.max(trainNumberLineIndex, amPmLineIndex) + 1;
  while (i < lines.length) {
    const line = lines[i];
    
    // Skip notes, headers, etc.
    if (line.includes('NOTES:') || line.includes('EFFECTIVE') || 
        line.includes('Q indicates') || line.includes('TRAINS') ||
        line.includes('via ') || line.includes('arrive ') ||
        line.length < 3) {
      i++;
      continue;
    }
    
    // Check if this looks like a station name
    // Filter out lines that are clearly not stations (AM/PM labels, etc.)
    // Also handle case where station name is directly followed by times (e.g., "ATLANTIC CITY4.11")
    // Check if line starts with station-like text (even if followed by numbers)
    const startsWithStation = /^[A-Z][A-Za-z\s&'.,-]{2,}/.test(line);
    const hasTimes = timePattern.test(line);
    const isStationLike = startsWithStation && !line.match(/^\d/) && 
        !line.includes('A.M.') && !line.includes('P.M.') && 
        !line.includes('A.M') && !line.includes('P.M') &&
        !line.match(/^[A-Z]\.[A-Z]\./) && // Don't match "A.M." pattern
        (hasTimes || (i + 1 < lines.length && timePattern.test(lines[i + 1]))); // Must have times
    
    if (isStationLike) {
      // Helper to extract times from a string (handles concatenated format)
      const extractTimes = (text: string): string[] => {
        // Match H.MM pattern, but handle concatenated cases
        // Split on patterns like "4.445.17" -> ["4.44", "5.17"]
        const matches: string[] = [];
        const regex = /\d{1,2}\.\d{2}/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
          matches.push(match[0]);
        }
        return matches;
      };
      
      // Extract station name - might have times attached directly
      let stationName = line.trim();
      
      // If line has times directly attached (e.g., "ATLANTIC CITY4.11"), split them
      const timeMatch = line.match(/^([A-Z][A-Za-z\s&'.,-]+?)(\d{1,2}\.\d{2})/);
      let lineForTimes = line;
      if (timeMatch) {
        stationName = timeMatch[1].trim();
        // Remove the station name part, keep the times
        lineForTimes = line.substring(timeMatch[1].length);
      }
      
      // Look ahead for times on this line or next few lines
      // Times can be concatenated like "4.445.175.516.08" or spaced
      const times: string[] = [];
      let timesFound = false;
      
      // Check current line first - times may be on same line as station name
      const currentTimes = extractTimes(lineForTimes);
      if (currentTimes && currentTimes.length > 0) {
        times.push(...currentTimes);
        timesFound = true;
      }
      
      // Also check the original line in case times are elsewhere
      if (currentTimes.length === 0) {
        const allTimes = extractTimes(line);
        if (allTimes && allTimes.length > 0) {
          times.push(...allTimes);
          timesFound = true;
        }
      }
      
      // Check next few lines for times (but not if it's another station)
      for (let j = 1; j <= 3 && i + j < lines.length; j++) {
        const nextLine = lines[i + j];
        // If next line is clearly another station name (capitalized, no numbers), stop
        if (stationNamePattern.test(nextLine) && !extractTimes(nextLine).length) {
          break;
        }
        const nextTimes = extractTimes(nextLine);
        if (nextTimes && nextTimes.length > 0) {
          // Only add if it looks like times, not a station name
          if (!stationNamePattern.test(nextLine) || extractTimes(nextLine).length > 2) {
            times.push(...nextTimes);
            timesFound = true;
            // If times were on a separate line, advance past it
            if (j === 1 && currentTimes.length === 0) {
              i++; // Skip the time line
            }
          } else {
            break; // Looks like another station
          }
        }
      }
      
      if (timesFound && times.length > 0) {
        stationRows.push({
          name: stationName,
          times,
          lineIndex: i,
        });
      }
    }
    
    i++;
  }

  if (stationRows.length === 0) {
    console.warn(`[PDF Parser] No station rows found in ${lineId}`);
    return [];
  }

  // Create trips - one per train number
  for (let trainIndex = 0; trainIndex < trainNumbers.length; trainIndex++) {
    const trainId = trainNumbers[trainIndex];
    const stops: Array<{ stop_id: string; station_name: string; arrival_time: number }> = [];

    // Extract time for this train at each station
    // Keep track of last station to avoid duplicates
    let lastStationId = '';
    for (const stationRow of stationRows) {
      // Times might not align perfectly with train positions
      // Try to match by position, but be flexible
      if (trainIndex < stationRow.times.length) {
        const timeStr = stationRow.times[trainIndex];
        
        // Convert "H.MM" format to "H:MM AM/PM"
        const [hours, minutes] = timeStr.split('.');
        const hourNum = parseInt(hours, 10);
        const minStr = minutes || '00';
        const minNum = parseInt(minStr, 10);
        
        // Determine AM/PM based on section and hour
        // Check if this station row is in AM or PM section
        const isInAMSection = amSectionEnd > 0 && stationRow.lineIndex < amSectionEnd;
        const isInPMSection = pmSectionStart > 0 && stationRow.lineIndex >= pmSectionStart;
        
        let hour24 = hourNum;
        let meridiem = 'AM';
        
        // Use section if available, otherwise use hour-based heuristic
        if (isInPMSection) {
          meridiem = 'PM';
          if (hourNum < 12) {
            hour24 = hourNum + 12;
          } else if (hourNum === 12) {
            hour24 = 12;
          }
        } else if (isInAMSection) {
          meridiem = 'AM';
          if (hourNum === 12) {
            hour24 = 0;
          } else {
            hour24 = hourNum;
          }
        } else {
          // Heuristic: early hours (1-6) are AM, later (7-11) could be either
          // For safety, assume AM for hours 1-11, PM only if hour is 12 or very high
          if (hourNum >= 1 && hourNum <= 11) {
            meridiem = 'AM';
            hour24 = hourNum;
          } else if (hourNum === 12) {
            // Noon - typically PM for transit schedules
            meridiem = 'PM';
            hour24 = 12;
          } else {
            // Shouldn't happen, but handle it
            meridiem = 'AM';
            hour24 = hourNum % 12;
          }
        }
        
        const timeFormatted = `${hour24}:${minStr.padStart(2, '0')} ${meridiem}`;
        const timeSeconds = parseTime(timeFormatted);
        
        if (timeSeconds !== null) {
          const mappedStation = mapStationName(stationRow.name, lineId);
          if (mappedStation && mappedStation.id !== lastStationId) {
            stops.push({
              stop_id: mappedStation.id,
              station_name: mappedStation.name,
              arrival_time: timeSeconds,
            });
            lastStationId = mappedStation.id;
          }
        }
      }
    }

    // Only create trip if it has at least 2 stops
    if (stops.length >= 2) {
      trips.push({
        train_id: trainId,
        line_id: lineId,
        direction,
        stops,
        service_type: serviceType,
      });
    }
  }

  // Normalize overnight times for each trip
  for (const trip of trips) {
    if (trip.stops.length > 1) {
      const times = trip.stops.map(s => s.arrival_time);
      const normalized = normalizeOvernightTimes(times);
      trip.stops.forEach((stop, i) => {
        stop.arrival_time = normalized[i];
      });
    }
  }

  console.log(`[PDF Parser] Extracted ${trips.length} trips from ${lineId} (${serviceType})`);
  
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

  for (const pdfFile of pdfFiles) {
    const pdfPath = path.join(serviceDir, pdfFile);
    const trips = await parseTimetablePDF(pdfPath, serviceType);
    allTrips.push(...trips);
  }

  console.log(`[PDF Parser] Loaded ${allTrips.length} total trips for ${serviceType}`);
  return allTrips;
}

