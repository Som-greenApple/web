import { createContext, useContext } from 'react'
import type { LatLngPosition } from '../types/crosswalk'

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'error' | 'default'
export const DEFAULT_POSITION: LatLngPosition = { lat: 37.6058, lng: 127.0418 }
export interface UserLocationState {
  position: LatLngPosition | null
  status: LocationStatus
  startTracking: () => void
  selectDefaultLocation: () => void
}
export const UserLocationContext = createContext<UserLocationState | null>(null)
export function useUserLocation() {
  const context = useContext(UserLocationContext)
  if (!context) throw new Error('UserLocationProvider가 필요합니다')
  return context
}
