#!/usr/bin/env node
/**
 * Comprehensive verification script to ensure we have all trains and stations
 * Checks:
 * 1. Trip counts per line
 * 2. Station coverage per line
 * 3. Trip completeness (all trips have valid stops)
 * 4. Station usage statistics
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function main() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE DATA VERIFICATION');
  console.log('='.repeat(80));
  console.log();

  const weekdayPath = path.join(projectRoot, 'public', 'schedules', 'weekday.json');
  const weekendPath = path.join(projectRoot, 'public', 'schedules', 'weekend.json');

  const weekday = JSON.parse(await fs.readFile(weekdayPath, 'utf8'));
  const weekend = JSON.parse(await fs.readFile(weekendPath, 'utf8'));
  const allTrips = [...weekday, ...weekend];

  // Overall statistics
  console.log('=== OVERALL STATISTICS ===');
  console.log(`Total trips: ${allTrips.length} (${weekday.length} weekday + ${weekend.length} weekend)`);
  
  const allStations = new Set();
  allTrips.forEach(trip => {
    trip.stops.forEach(stop => allStations.add(stop.station_name));
  });
  console.log(`Total unique stations: ${allStations.size}`);
  console.log();

  // Trips by line
  console.log('=== TRIPS BY LINE (COMBINED) ===');
  const tripsByLine = {};
  allTrips.forEach(trip => {
    tripsByLine[trip.line_id] = (tripsByLine[trip.line_id] || 0) + 1;
  });
  Object.entries(tripsByLine)
    .sort((a, b) => b[1] - a[1])
    .forEach(([line, count]) => {
      console.log(`  ${line.padEnd(30)} ${count.toString().padStart(4)} trips`);
    });
  console.log();

  // Stations by line
  console.log('=== STATIONS BY LINE ===');
  const stationsByLine = {};
  allTrips.forEach(trip => {
    if (!stationsByLine[trip.line_id]) {
      stationsByLine[trip.line_id] = new Set();
    }
    trip.stops.forEach(stop => {
      stationsByLine[trip.line_id].add(stop.station_name);
    });
  });

  Object.entries(stationsByLine)
    .sort()
    .forEach(([line, stations]) => {
      console.log(`  ${line.padEnd(30)} ${stations.size.toString().padStart(3)} stations`);
    });
  console.log();

  // Trip quality checks
  console.log('=== TRIP QUALITY CHECKS ===');
  const incompleteTrips = allTrips.filter(t => t.stops.length < 2);
  const shortTrips = allTrips.filter(t => t.stops.length < 3);
  const avgStops = allTrips.reduce((sum, t) => sum + t.stops.length, 0) / allTrips.length;
  const maxStops = Math.max(...allTrips.map(t => t.stops.length));
  const minStops = Math.min(...allTrips.map(t => t.stops.length));

  console.log(`  Trips with < 2 stops: ${incompleteTrips.length} ${incompleteTrips.length === 0 ? '✓' : '⚠'}`);
  console.log(`  Trips with < 3 stops: ${shortTrips.length}`);
  console.log(`  Average stops per trip: ${avgStops.toFixed(1)}`);
  console.log(`  Min stops: ${minStops}, Max stops: ${maxStops}`);
  console.log();

  // Direction breakdown
  console.log('=== DIRECTION BREAKDOWN ===');
  const directions = { inbound: 0, outbound: 0 };
  allTrips.forEach(trip => {
    directions[trip.direction] = (directions[trip.direction] || 0) + 1;
  });
  console.log(`  Inbound: ${directions.inbound}`);
  console.log(`  Outbound: ${directions.outbound}`);
  console.log();

  // Service type breakdown
  console.log('=== SERVICE TYPE BREAKDOWN ===');
  const serviceTypes = { weekday: 0, weekend: 0 };
  allTrips.forEach(trip => {
    serviceTypes[trip.service_type] = (serviceTypes[trip.service_type] || 0) + 1;
  });
  console.log(`  Weekday: ${serviceTypes.weekday}`);
  console.log(`  Weekend: ${serviceTypes.weekend}`);
  console.log();

  // Most used stations
  console.log('=== TOP 15 MOST USED STATIONS ===');
  const stationUsage = {};
  allTrips.forEach(trip => {
    trip.stops.forEach(stop => {
      stationUsage[stop.station_name] = (stationUsage[stop.station_name] || 0) + 1;
    });
  });
  Object.entries(stationUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([name, count]) => {
      console.log(`  ${name.padEnd(40)} ${count.toString().padStart(4)} stops`);
    });
  console.log();

  // Line-specific analysis
  console.log('=== DETAILED LINE ANALYSIS ===');
  Object.entries(stationsByLine)
    .sort()
    .forEach(([line, stations]) => {
      const lineTrips = allTrips.filter(t => t.line_id === line);
      const totalStops = lineTrips.reduce((sum, t) => sum + t.stops.length, 0);
      const avgStops = lineTrips.length > 0 ? (totalStops / lineTrips.length).toFixed(1) : '0';
      
      console.log(`\n${line}:`);
      console.log(`  Trips: ${lineTrips.length}`);
      console.log(`  Unique stations: ${stations.size}`);
      console.log(`  Avg stops per trip: ${avgStops}`);
      console.log(`  Stations: ${Array.from(stations).sort().join(', ')}`);
    });
  console.log();

  console.log('='.repeat(80));
  console.log('VERIFICATION COMPLETE');
  console.log('='.repeat(80));
}

main().catch(console.error);
