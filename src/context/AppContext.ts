import {
  createContext,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { LatLngPosition, NearbyCrosswalk } from '../types/crosswalk'
import type { SignalState } from '../types/signal'

export type DataMode = 'mock' | 'replay' | 'live'
export type GpsMode = 'real' | 'virtual'

export interface AppContextValue {
  discoveredCrosswalks: NearbyCrosswalk[]
  setDiscoveredCrosswalks: Dispatch<SetStateAction<NearbyCrosswalk[]>>

  position: LatLngPosition | null
  setPosition: Dispatch<SetStateAction<LatLngPosition | null>>

  selectedCrosswalkId: string | null
  setSelectedCrosswalkId: Dispatch<SetStateAction<string | null>>

  dataMode: DataMode
  setDataMode: Dispatch<SetStateAction<DataMode>>

  gpsMode: GpsMode
  setGpsMode: Dispatch<SetStateAction<GpsMode>>

  speed: number
  setSpeed: Dispatch<SetStateAction<number>>

  forcedSignal: SignalState | null
  setForcedSignal: Dispatch<SetStateAction<SignalState | null>>

  demoPanelOpen: boolean
  setDemoPanelOpen: Dispatch<SetStateAction<boolean>>
}

export const AppContext = createContext<AppContextValue | undefined>(
  undefined,
)