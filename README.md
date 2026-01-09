# Between Stations

A real-time map that shows where NJ Transit trains are right now, even when they're between stations.

## What is this?

Ever wonder where your train is when it's not at a station? This web app shows you the approximate location of trains on NJ Transit rail lines in real-time. It's built to handle uncertainty gracefully—when we don't know exactly where a train is, we show our best guess with a confidence level, rather than pretending we know for sure.

## Features

- **Live train positions** - See trains moving on an interactive map of New Jersey
- **Smart inference** - Estimates train locations using schedules, station reports, and other evidence
- **Confidence levels** - Clear indicators of how certain we are about each train's position
- **Filter and search** - Find trains by line, direction, or destination
- **Follow mode** - Lock onto a specific train and watch it move
- **Works offline-ish** - Uses schedule-based predictions when real-time data isn't available

## How it works

Instead of treating location as absolute fact, this app treats it as a hypothesis with a confidence level:

- **High confidence**: Recent GPS data or direct position reports
- **Medium confidence**: Multiple indirect signals that agree
- **Low confidence**: Minimal information or educated guesses
- **Unknown**: Not enough data to make an estimate

The app combines evidence from multiple sources (schedules, station arrivals, GPS when available) to build the best picture possible of where trains actually are.

## Getting started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Open http://localhost:5173 in your browser
```

## Building for production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Technology

Built with React, TypeScript, and Leaflet. Uses Vite for fast development and builds.

## License

This project is licensed under a Non-Commercial License. See [LICENSE](LICENSE) for details.

## Contributing

Ideas, bug reports, and pull requests are welcome! This is a work in progress, and there's plenty to improve.
