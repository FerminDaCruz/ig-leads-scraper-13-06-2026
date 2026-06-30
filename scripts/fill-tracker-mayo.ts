import { runTracker } from './tracker-lib'

runTracker({
  file: './data/Tracker de prospección IG 2026  - Mayo.csv',
  monthName: 'Mayo',
  monthNum: '05',
  source: 'tracker-mayo',
  unmatchedOut: './data/_sin_match_mayo.csv',
}).catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
