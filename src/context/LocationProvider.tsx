import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { LocationContext, MAIN_GATE_POSITION, type LocationStatus } from './location'
import { useAppContext } from './useAppContext'
import type { LatLngPosition } from '../types/crosswalk'

export default function LocationProvider({ children }: { children: ReactNode }) {
  const { setPosition: setAppPosition, setGpsMode, gpsMode } = useAppContext()
  const [position, setPosition] = useState<LatLngPosition>(MAIN_GATE_POSITION)
  const [status, setStatus] = useState<LocationStatus>('idle')
  const gpsModeRef = useRef(gpsMode)
  useEffect(() => { gpsModeRef.current = gpsMode }, [gpsMode])
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
      setAppPosition(null)
      setStatus('unsupported')
      return
    }
    setGpsMode('real')
    gpsModeRef.current = 'real'
    setStatus('locating')
    const currentGeneration = generation.current
    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (generation.current !== currentGeneration) return
        const nextPosition = { lat: coords.latitude, lng: coords.longitude }
        setPosition(nextPosition)
        if (gpsModeRef.current === 'real') setAppPosition(nextPosition)
        setStatus('tracking')
      },
      (error) => {
        if (generation.current !== currentGeneration) return
        stopTracking()
        if (gpsModeRef.current === 'real') setAppPosition(null)
        setPosition(MAIN_GATE_POSITION)
        setStatus(error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable')
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 },
    )
  }, [stopTracking, setAppPosition, setGpsMode])
  const selectDefaultLocation = useCallback(() => {
    stopTracking()
    setPosition(MAIN_GATE_POSITION)
    setAppPosition(null)
    setGpsMode('virtual')
    setStatus('default')
  }, [stopTracking, setAppPosition, setGpsMode])
  useEffect(() => stopTracking, [stopTracking])
  return <LocationContext.Provider value={{ position, status, startTracking, selectDefaultLocation }}>{children}</LocationContext.Provider>
}
