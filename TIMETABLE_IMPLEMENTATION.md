# Timetable-Driven Train Position Extrapolation

## Overview

This implementation provides **Scheduled Estimation Mode** - a timetable-driven system that extrapolates train positions from official PDF timetables. This produces time-correct, geography-correct, but delay-unaware train positions.

## Architecture

### Core Components

1. **Schedule Types** (`src/types/schedule.ts`)
   - `ScheduledStop`: Represents a stop with station ID, name, and arrival time
   - `ScheduledTrip`: Represents a complete train trip with train ID, line, direction, and stops

2. **Station Mapping** (`src/core/stationMapping.ts`)
   - Maps timetable station names to canonical IDs and coordinates
   - Fuzzy matching with Levenshtein distance for name variations
   - Comprehensive station database with aliases

3. **Time Utilities** (`src/core/timeUtils.ts`)
   - Parses time strings (12-hour and 24-hour formats)
   - Handles overnight rollover (next-day times)
   - Converts to seconds since midnight

4. **PDF Parser** (`src/core/pdfParser.ts`)
   - Extracts train schedules from PDF timetables (build-time only)
   - Heuristic parsing for train numbers, stations, and times
   - Handles weekday/weekend service types

5. **Timetable Provider** (`src/providers/TimetableProvider.ts`)
   - Runtime position extrapolation from schedules
   - Active trip detection based on current time
   - Segment resolution and progress calculation
   - Spatial placement via linear interpolation

6. **Inference Engine Updates** (`src/core/inference.ts`)
   - Handles schedule evidence with `estimated_low` confidence
   - Priority system: GPS > Station-board > Schedule > Unknown

## Usage

### 1. Process Timetables

Extract schedules from PDF files:

```bash
npm run process-timetables
```

This will:
- Read PDFs from `schedules/weekday/` and `schedules/weekend/`
- Extract train schedules using PDF parsing
- Output JSON files to `public/schedules/weekday.json` and `public/schedules/weekend.json`

### 2. Run the Application

The timetable provider is already integrated into `App.tsx`. It will:
- Load schedules from JSON files on startup
- Automatically detect weekday vs. weekend
- Extrapolate positions every 10 seconds

```bash
npm run dev
```

### 3. Provider Configuration

The timetable provider is registered in `MapView.tsx`:

```typescript
const timetableProvider = new TimetableProvider();
manager.register(timetableProvider);
```

The application uses only real train schedules from PDF extraction - no mock data is used.

## Features

### Position Extrapolation

- **Active Trip Detection**: Only shows trains during their scheduled time windows
- **Segment Resolution**: Determines which station-to-station segment a train is on
- **Progress Calculation**: Computes progress (0.0-1.0) along current segment
- **Spatial Placement**: Linear interpolation between station coordinates

### Confidence System

All timetable-derived trains use `confidence: "estimated_low"` because:
- No delay awareness
- No real-time confirmation
- Still geographically and temporally valid

### Evidence Priority

The inference engine prioritizes evidence sources:
1. **GPS/Live position** (high confidence)
2. **Station-board inference** (medium confidence)
3. **Timetable schedule** (low confidence - this implementation)
4. **Unknown** (no evidence)

If higher-confidence evidence exists for a train, timetable placement is suppressed.

### Overnight Handling

- Automatically handles trips that span midnight
- Adds 24 hours to times when rollover detected
- Correctly handles early-morning trips (before 6 AM)

## Station Mapping

Station names from timetables are mapped to canonical IDs using:
- Exact name matching
- Alias matching
- Fuzzy matching with adaptive threshold
- Fail-closed: unmapped stations cause trips to be dropped

To add more stations, edit `src/core/stationMapping.ts`:

```typescript
{
  id: 'STATION_ID',
  name: 'Canonical Name',
  position: { lat: 40.xxxx, lng: -74.xxxx },
  aliases: ['Alternative Name 1', 'Alt Name 2'],
}
```

## PDF Parser Notes

The current PDF parser is a **heuristic parser** that:
- Extracts text from PDFs using `pdf-parse`
- Looks for train number patterns (3-4 digits)
- Identifies station names from known keywords
- Matches times to stations (simplified order-based approach)

**Limitations:**
- Table structure detection is basic
- May miss some trips if PDF format is complex
- Requires PDF text extraction to work well

**Improvements needed:**
- More sophisticated table parsing
- Better handling of multi-page schedules
- Support for special symbols (*, †) and footnotes
- Holiday variant handling

## File Structure

```
src/
  types/
    schedule.ts          # Schedule domain types
  core/
    stationMapping.ts    # Station name → ID mapping
    timeUtils.ts         # Time parsing and normalization
    pdfParser.ts         # PDF extraction (build-time)
    inference.ts         # Evidence fusion (updated)
    Provider.ts          # Provider abstraction
  providers/
    TimetableProvider.ts # Runtime position extrapolation
scripts/
  processTimetables.mjs  # Build script for PDF processing
public/
  schedules/
    weekday.json         # Generated from PDFs
    weekend.json         # Generated from PDFs
schedules/
  weekday/               # Source PDF files
  weekend/               # Source PDF files
```

## Success Criteria

The implementation is correct if:

✅ Trains appear only when scheduled  
✅ Train counts match the timetable  
✅ Movement direction matches reality  
✅ Station ordering is always correct  
✅ The map feels alive even with no live feeds  
✅ Smooth, continuous movement (no sudden jumps)  
✅ Trains fade in/out appropriately  

## Limitations (Intentional)

This mode does NOT attempt:
- ❌ Delay modeling
- ❌ Holding at stations
- ❌ Overtaking or rescheduling
- ❌ Service disruption logic

Those belong to higher-fidelity providers (future implementations).

## Next Steps

1. **Improve PDF Parser**: Enhance table structure detection for better accuracy
2. **Add More Stations**: Expand station database with all NJ Transit stations
3. **GTFS Integration**: Use official GTFS data for better station mapping
4. **Visual Enhancements**: Smooth fade in/out animations for train appearance/disappearance
5. **Testing**: Add unit tests for time parsing, station mapping, and position calculation

## Troubleshooting

**No trains appearing?**
- Check that `public/schedules/*.json` files exist and have data
- Verify current time is within scheduled service hours
- Check browser console for errors

**Stations not matching?**
- Check `src/core/stationMapping.ts` for station aliases
- Add fuzzy matching rules if needed
- Check console for "Could not map station" warnings

**PDF parsing issues?**
- Ensure PDFs are text-extractable (not scanned images)
- Check PDF structure - parser expects train numbers and times in consistent format
- Consider manual JSON creation for complex schedules


