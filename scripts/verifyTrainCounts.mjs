#!/usr/bin/env node
/**
 * Verification script to check train counts and positions per line
 * Compares schedule-based predictions with expected service levels
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Expected typical weekday morning (7-10 AM) train counts per line
// Based on NJ Transit service patterns
const EXPECTED_MORNING_COUNTS = {
  'Northeast Corridor': { min: 8, max: 15, typical: 12 },
  'North Jersey Coast': { min: 6, max: 12, typical: 9 },
  'Raritan Valley': { min: 4, max: 8, typical: 6 },
  'Morris & Essex': { min: 5, max: 10, typical: 7 },
  'Main/Bergen': { min: 4, max: 8, typical: 6 },
  'Montclair-Boonton': { min: 2, max: 5, typical: 3 },
  'Pascack Valley': { min: 1, max: 3, typical: 2 },
  'Atlantic City': { min: 1, max: 4, typical: 2 },
  'Gladstone Branch': { min: 1, max: 3, typical: 2 },
};

async function analyzeScheduleFile(filePath, serviceType) {
  const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
  const now = new Date();
  const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  
  // Find active trips
  const activeTrips = data.filter(trip => {
    if (!trip.stops || trip.stops.length === 0) return false;
    const first = trip.stops[0]?.arrival_time;
    const last = trip.stops[trip.stops.length - 1]?.arrival_time;
    if (!first || !last) return false;
    
    // Handle overnight trips
    const lastAdjusted = last < first ? last + 86400 : last;
    return currentSeconds >= first && currentSeconds <= lastAdjusted;
  });
  
  // Group by line
  const byLine = {};
  activeTrips.forEach(trip => {
    const lineId = trip.line_id || 'Unknown';
    if (!byLine[lineId]) {
      byLine[lineId] = {
        count: 0,
        trips: [],
        directions: { inbound: 0, outbound: 0 },
      };
    }
    byLine[lineId].count++;
    byLine[lineId].trips.push({
      train_id: trip.train_id,
      direction: trip.direction,
      firstStop: trip.stops[0]?.station_name,
      lastStop: trip.stops[trip.stops.length - 1]?.station_name,
      startTime: trip.stops[0]?.arrival_time,
      endTime: trip.stops[trip.stops.length - 1]?.arrival_time,
    });
    byLine[lineId].directions[trip.direction] = (byLine[lineId].directions[trip.direction] || 0) + 1;
  });
  
  return {
    currentTime: now.toLocaleTimeString(),
    serviceType,
    totalActive: activeTrips.length,
    byLine,
  };
}

async function main() {
  console.log('='.repeat(80));
  console.log('NJ TRANSIT TRAIN COUNT VERIFICATION');
  console.log('='.repeat(80));
  console.log();
  
  const weekdayPath = path.join(projectRoot, 'public', 'schedules', 'weekday.json');
  const weekendPath = path.join(projectRoot, 'public', 'schedules', 'weekend.json');
  
  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const schedulePath = isWeekend ? weekendPath : weekdayPath;
  const serviceType = isWeekend ? 'weekend' : 'weekday';
  
  console.log(`Current time: ${now.toLocaleString()}`);
  console.log(`Service type: ${serviceType}`);
  console.log();
  
  try {
    const analysis = await analyzeScheduleFile(schedulePath, serviceType);
    
    console.log('ACTIVE TRAINS BY LINE:');
    console.log('-'.repeat(80));
    
    const sortedLines = Object.entries(analysis.byLine).sort((a, b) => b[1].count - a[1].count);
    
    for (const [lineId, data] of sortedLines) {
      const expected = EXPECTED_MORNING_COUNTS[lineId];
      const status = expected 
        ? (data.count >= expected.min && data.count <= expected.max ? '✓' : '⚠')
        : '?';
      
      console.log(`${status} ${lineId.padEnd(25)} ${data.count.toString().padStart(3)} trains`);
      console.log(`   Inbound: ${data.directions.inbound || 0}, Outbound: ${data.directions.outbound || 0}`);
      
      if (expected && (data.count < expected.min || data.count > expected.max)) {
        console.log(`   Expected range: ${expected.min}-${expected.max} (typical: ${expected.typical})`);
      }
    }
    
    console.log();
    console.log('-'.repeat(80));
    console.log(`TOTAL ACTIVE TRAINS: ${analysis.totalActive}`);
    console.log();
    
    // Show sample trips for verification
    console.log('SAMPLE ACTIVE TRIPS (first 5 per line):');
    console.log('-'.repeat(80));
    
    for (const [lineId, data] of sortedLines.slice(0, 5)) {
      console.log(`\n${lineId}:`);
      data.trips.slice(0, 5).forEach(trip => {
        const startHr = Math.floor(trip.startTime / 3600);
        const startMin = Math.floor((trip.startTime % 3600) / 60);
        const endHr = Math.floor(trip.endTime / 3600);
        const endMin = Math.floor((trip.endTime % 3600) / 60);
        console.log(`  ${trip.train_id.padEnd(10)} ${trip.direction.padEnd(8)} ${startHr}:${startMin.toString().padStart(2, '0')}-${endHr}:${endMin.toString().padStart(2, '0')} ${trip.firstStop} → ${trip.lastStop}`);
      });
    }
    
    console.log();
    console.log('='.repeat(80));
    console.log('VERIFICATION COMPLETE');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('Error analyzing schedules:', error);
    process.exit(1);
  }
}

main().catch(console.error);
