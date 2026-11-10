import type { SignalState } from './signal'

/** 신호등 있음 / 없음 / 미확인 */
export type SignalPresence = 'yes' | 'no' | 'unknown'

export interface LatLngPosition {
  lat: number
  lng: number
}

/** 횡단보도 기본 정보 */
export interface Crosswalk {
  id: string
  name: string
  position: LatLngPosition | null
  /** 횡단 길이, 단위: 미터 */
  lengthM: number | null
  controllerId: string | null
  /** T Data 교차로 ID. 장비 ID와 구분한다. */
  signalIntersectionId: string | null
  /** 보행 신호 방향: nt / et / st / wt / ne / se / sw / nw */
  signalDirection: string | null
  /** 신호등 유무. 실시간 신호 연결 검증 여부와는 별개다. */
  signalPresence: SignalPresence
  /** 현장에서 정보를 확인한 경우에만 true */
  verified: boolean
  /** 지도 줄무늬 회전각. OSM 경로 방향으로 계산한다. */
  mapRotation?: number
}

/** 목록과 지도에서 사용하는 화면 데이터 */
export interface NearbyCrosswalk extends Crosswalk {
  signal: SignalState
  remainSec?: number
  /** 사용자와의 거리. 위치 정보가 없으면 null */
  distanceM: number | null
}