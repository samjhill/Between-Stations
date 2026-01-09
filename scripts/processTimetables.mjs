#!/usr/bin/env node
/**
 * Build script to process PDF timetables and generate JSON schedule files
 * 
 * Usage: npm run process-timetables
 * 
 * This script:
 * 1. Reads PDF files from schedules/weekday and schedules/weekend
 * 2. Extracts train schedules using PDF parsing
 * 3. Outputs JSON files to public/schedules/ for browser consumption
 * 
 * NOTE: This requires the pdfParser module to be available. Since it uses
 * TypeScript, you may need to compile first or use ts-node.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Import the parser module (tsx will handle TypeScript compilation)
async function loadParser() {
  const parserModule = await import('../src/core/pdfParser.ts');
  return parserModule;
}

async function main() {
  const schedulesDir = path.join(projectRoot, 'schedules');
  const outputDir = path.join(projectRoot, 'public', 'schedules');

  // Create output directory if it doesn't exist
  await fs.mkdir(outputDir, { recursive: true });

  console.log('Loading PDF parser...');
  const parser = await loadParser();
  const { loadAllTimetables } = parser;

  console.log('Processing timetables...\n');

  // Process weekday schedules
  console.log('Processing weekday schedules...');
  const weekdayTrips = await loadAllTimetables(schedulesDir, 'weekday');
  const weekdayOutput = path.join(outputDir, 'weekday.json');
  await fs.writeFile(weekdayOutput, JSON.stringify(weekdayTrips, null, 2));
  console.log(`✓ Wrote ${weekdayTrips.length} weekday trips to ${weekdayOutput}\n`);

  // Process weekend schedules
  console.log('Processing weekend schedules...');
  const weekendTrips = await loadAllTimetables(schedulesDir, 'weekend');
  const weekendOutput = path.join(outputDir, 'weekend.json');
  await fs.writeFile(weekendOutput, JSON.stringify(weekendTrips, null, 2));
  console.log(`✓ Wrote ${weekendTrips.length} weekend trips to ${weekendOutput}\n`);

  console.log('✓ Timetable processing complete!');
  console.log(`Total: ${weekdayTrips.length + weekendTrips.length} scheduled trips`);
}

main().catch((error) => {
  console.error('Error processing timetables:', error);
  process.exit(1);
});

