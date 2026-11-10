import crosswalkData from './crosswalks.json'
import type {
  Crosswalk,
  NearbyCrosswalk,
  SignalPresence,
} from '../types/crosswalk'

function parseSignalPresence(value: string): SignalPresence {
  switch (value) {
    case 'yes':
    case 'no':
    case 'unknown':
      return value

    default:
      throw new Error(`잘못된 signalPresence 값: ${value}`)
  }
}

export const crosswalks: Crosswalk[] = crosswalkData.map(
  (crosswalk) => ({
    ...crosswalk,
    signalPresence: parseSignalPresence(crosswalk.signalPresence),
  }),
)

export const nearbyCrosswalks: NearbyCrosswalk[] = crosswalks.map(
  (crosswalk) => ({
    ...crosswalk,
    signal: 'UNKNOWN',
    distanceM: null,
  }),
)

export function getCrosswalkById(id: string): Crosswalk | undefined {
  return crosswalks.find((crosswalk) => crosswalk.id === id)
}