import { createContext, useContext } from 'react'
import type { LatLngPosition } from '../types/crosswalk'

// 정문 주변의 임시 기준점. 현장 확인 후 정확한 정문 좌표로 보정한다.
export const MAIN_GATE_POSITION: LatLngPosition = { lat: 37.6053, lng: 127.0414 }
export type LocationStatus = 'idle' | 'locating' | 'tracking' | 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'default'
export interface LocationState {
  position: LatLngPosition
  status: LocationStatus
  startTracking: () => void
  selectDefaultLocation: () => void
}
export const LocationContext = createContext<LocationState | null>(null)
export function useLocation() {
  const context = useContext(LocationContext)
  if (!context) throw new Error('LocationProvider가 필요합니다')
  return context
}
