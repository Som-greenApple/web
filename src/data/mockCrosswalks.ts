import type { SignalState } from '../types/signal'

// TODO: crosswalks.json + 실시간 신호 연동 전까지 쓰는 화면용 목업
export interface LatLngPosition {
  lat: number
  lng: number
}

export interface NearbyCrosswalk {
  id: string
  name: string
  signal: SignalState
  remainSec?: number
  distanceM: number
  /** 지도에 사과를 찍을 위치. 좌표가 없으면 지도에 표시하지 않는다 */
  position: LatLngPosition | null
}

// TODO(좌표): 횡단보도 위도·경도 준비되면 position 채우기 (지금은 null → 지도에 안 찍힘)
export const nearbyCrosswalks: NearbyCrosswalk[] = [
  { id: 'main-gate', name: '정문 앞', signal: 'GREEN', remainSec: 38, distanceM: 120, position: null },
  { id: 'main-gate-side', name: '정문 옆', signal: 'RED', remainSec: 21, distanceM: 140, position: null },
  { id: 'back-gate', name: '후문 쪽', signal: 'UNKNOWN', distanceM: 300, position: null },
]
