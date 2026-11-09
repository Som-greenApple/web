import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { LocationContext, MAIN_GATE_POSITION, type LocationStatus } from './location'
import type { LatLngPosition } from '../types/crosswalk'

export default function LocationProvider({ children }: { children: ReactNode }) {
  const [position, setPosition] = useState<LatLngPosition>(MAIN_GATE_POSITION)
  const [status, setStatus] = useState<LocationStatus>('idle')
  const watchRef = useRef<number | null>(null)
  const generation = useRef(0)
  const stopTracking = useCallback(() => {
    generation.current += 1
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    watchRef.current = null
  }, [])
  const startTracking = useCallback(() => {
    stopTracking()
    if (!navigator.geolocation) {
      setStatus('unsupported')
      return
    }
    setStatus('locating')
    const currentGeneration = generation.current
    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (generation.current !== currentGeneration) return
        setPosition({ lat: coords.latitude, lng: coords.longitude })
        setStatus('tracking')
      },
      (error) => {
        if (generation.current !== currentGeneration) return
        setPosition(MAIN_GATE_POSITION)
        setStatus(error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable')
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 },
    )
  }, [stopTracking])
  const selectDefaultLocation = useCallback(() => {
    stopTracking()
    setPosition(MAIN_GATE_POSITION)
    setStatus('default')
  }, [stopTracking])
  useEffect(() => stopTracking, [stopTracking])
  return <LocationContext.Provider value={{ position, status, startTracking, selectDefaultLocation }}>{children}</LocationContext.Provider>
}
