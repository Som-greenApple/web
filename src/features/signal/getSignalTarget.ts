import type { Crosswalk } from '../../types/crosswalk'
import type { SignalDirection } from './fetchSignal'

export interface SignalTarget {
  itstId: string
  direction: SignalDirection
}

function isSignalDirection(value: string): value is SignalDirection {
  switch (value) {
    case 'nt':
    case 'et':
    case 'st':
    case 'wt':
    case 'ne':
    case 'se':
    case 'sw':
    case 'nw':
      return true

    default:
      return false
  }
}

/**
 * 현장 확인과 신호 연결 정보가 모두 준비된 경우에만
 * API 요청에 사용할 교차로 ID와 방향을 반환한다.
 */
export function getSignalTarget(
  crosswalk: Crosswalk | undefined,
): SignalTarget | null {
  if (!crosswalk?.verified || crosswalk.signalPresence !== 'yes') {
    return null
  }

  const itstId = crosswalk.signalIntersectionId
  const direction = crosswalk.signalDirection

  if (
    typeof itstId !== 'string' ||
    !/^\d{1,5}$/.test(itstId) ||
    typeof direction !== 'string' ||
    !isSignalDirection(direction)
  ) {
    return null
  }

  return {
    itstId,
    direction,
  }
}