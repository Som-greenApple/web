import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { LatLngPosition } from '../types/crosswalk'
import { UserLocationContext, type LocationStatus } from './userLocation'

export default function UserLocationProvider({ children }: { children: ReactNode }) {
  const [position, setPosition] = useState<LatLngPosition | null>(null)
  const [status, setStatus] = useState<LocationStatus>('idle')
  const watch = useRef<number | null>(null)
  const generation = useRef(0)
  const stop = useCallback(() => {
    generation.current += 1
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current)
    watch.current = null
  }, [])
  const startTracking = useCallback(() => {
    stop()
    if (!navigator.geolocation) {
      setStatus('error')
      return
    }
    setStatus('locating')
    const current = generation.current
    watch.current = navigator.geolocation.watchPosition(({ coords }) => {
      if (current !== generation.current) return
      setPosition({ lat: coords.latitude, lng: coords.longitude })
      setStatus('ready')
    }, (error) => {
      if (current !== generation.current) return
      stop()
      setStatus(error.code === 1 ? 'denied' : 'error')
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 })
  }, [stop])
  const selectDefaultLocation = useCallback(() => {
    stop()
    setPosition(null)
    setStatus('default')
  }, [stop])
  useEffect(() => stop, [stop])
  return <UserLocationContext.Provider value={{ position, status, startTracking, selectDefaultLocation }}>{children}</UserLocationContext.Provider>
}
