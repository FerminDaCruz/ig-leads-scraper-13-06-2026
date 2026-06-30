import { runTracker } from './tracker-lib'

runTracker({
  file: './data/Tracker de prospección IG 2026  - Junio.csv',
  monthName: 'Junio',
  monthNum: '06',
  source: 'tracker-junio',
  unmatchedOut: './data/_sin_match_junio.csv',
}).catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
