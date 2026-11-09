import crosswalkData from './crosswalks.json'
import type { Crosswalk, NearbyCrosswalk } from '../types/crosswalk'

export const crosswalks: Crosswalk[] = crosswalkData

/**
 * 실제 신호 API와 사용자 위치가 연결되기 전의 화면 데이터.
 * 현장 확인 여부만으로 현재 신호를 알 수는 없으므로 UNKNOWN으로 시작한다.
 */
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