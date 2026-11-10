import { useMemo, useState, type ReactNode } from 'react'
import {
  AppContext,
  type AppContextValue,
  type DataMode,
  type GpsMode,
} from './AppContext'
import type { LatLngPosition, NearbyCrosswalk } from '../types/crosswalk'
import type { SignalState } from '../types/signal'

interface AppProviderProps {
  children: ReactNode
}

export default function AppProvider({ children }: AppProviderProps) {
  const [discoveredCrosswalks, setDiscoveredCrosswalks] = useState<NearbyCrosswalk[]>([])
  const [position, setPosition] = useState<LatLngPosition | null>(null)

  const [selectedCrosswalkId, setSelectedCrosswalkId] =
    useState<string | null>(null)

  const [dataMode, setDataMode] = useState<DataMode>('mock')
  const [gpsMode, setGpsMode] = useState<GpsMode>('virtual')
  const [speed, setSpeed] = useState(0.9)

  const [forcedSignal, setForcedSignal] =
    useState<SignalState | null>(null)

  const [demoPanelOpen, setDemoPanelOpen] = useState(true)

  const value = useMemo<AppContextValue>(
    () => ({
      discoveredCrosswalks,
      setDiscoveredCrosswalks,
      position,
      setPosition,
      selectedCrosswalkId,
      setSelectedCrosswalkId,
      dataMode,
      setDataMode,
      gpsMode,
      setGpsMode,
      speed,
      setSpeed,
      forcedSignal,
      setForcedSignal,
      demoPanelOpen,
      setDemoPanelOpen,
    }),
    [
      discoveredCrosswalks,
      position,
      selectedCrosswalkId,
      dataMode,
      gpsMode,
      speed,
      forcedSignal,
      demoPanelOpen,
    ],
  )

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}