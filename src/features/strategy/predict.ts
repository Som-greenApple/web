import type { DataStatus, SignalState } from '../../types/signal'
import type { StrategyType } from '../../types/strategy'

/** 안내할 수 있는 가장 빠른 걸음. 이보다 빨라야 하면 뛰어야 하므로 다음 신호를 기다린다. */
export const MAX_GUIDE_SPEED = 1.4
/** 이보다 느리게 걸으라고 안내하지 않는다. 더 느려야 하면 횡단보도 앞에서 기다린다. */
export const MIN_GUIDE_SPEED = 0.5
/** 건너기를 마치고도 남겨 둘 기본 여유 시간 */
export const SAFETY_MARGIN_SEC = 3
/** 지연된(10~30초 전) 신호 정보일 때 추가하는 여유 시간 */
export const DELAY_MARGIN_SEC = 3
/** GPS 오차를 고려해 이 거리 안이면 횡단보도에 도착한 것으로 본다 */
export const ARRIVED_M = 3

export interface GuideInput {
  signal: SignalState
  /** 현재 신호의 남은 시간(초) */
  remainSec?: number
  dataStatus: DataStatus
  /** 횡단보도까지 남은 거리(m). 위치·좌표를 모르면 null */
  distanceM: number | null
  /** 횡단 길이(m). 등록 전이면 null */
  lengthM: number | null
  /** 예측에 사용할 보행 속도(m/s) */
  speed: number | null
}

export type GuideReason =
  | 'NO_DATA'
  | 'NO_POSITION'
  | 'NO_LENGTH'
  | 'NO_SPEED'
  | 'ENOUGH_TIME'
  | 'CAN_CROSS'
  | 'NEED_FASTER'
  | 'TOO_LATE'
  | 'FLASHING'
  | 'RED_ARRIVE_EARLY'
  | 'RED_ARRIVE_AFTER'
  | 'RED_AT_CROSSWALK'

export interface GuideDecision {
  strategy: StrategyType
  reason: GuideReason
  /** 이번 판정에 적용한 여유 시간(초) */
  marginSec: number
  /** 지금 속도(상한 적용)로 횡단보도까지 걸리는 시간(초) */
  arrivalSec: number | null
  /** 지금 속도(상한 적용)로 건너는 데 걸리는 시간(초) */
  crossSec: number | null
  /** SLOW_DOWN · GO_FASTER일 때 권장 속도(m/s) */
  recommendedSpeed: number | null
}

function isNonNegative(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/**
 * 도착했을 때 초록불이 되도록 걷기 안내 상태를 판정한다.
 * - 뛰어야(1.4m/s 초과) 건널 수 있으면 다음 신호를 기다리게 한다.
 * - 깜빡일 때는 새로 건너지 않는다.
 * - 지연된 신호 정보는 여유 시간을 더 둔다.
 */
export function decideGuide(input: GuideInput): GuideDecision {
  const marginSec = SAFETY_MARGIN_SEC + (input.dataStatus === 'delayed' ? DELAY_MARGIN_SEC : 0)
  const empty = { marginSec, arrivalSec: null, crossSec: null, recommendedSpeed: null }
  const { signal, remainSec, distanceM, lengthM, speed } = input

  if (input.dataStatus === 'offline' || signal === 'UNKNOWN' || !isNonNegative(remainSec)) {
    return { ...empty, strategy: 'NO_SIGNAL', reason: 'NO_DATA' }
  }
  if (!isNonNegative(distanceM)) return { ...empty, strategy: 'NO_SIGNAL', reason: 'NO_POSITION' }
  if (!isNonNegative(lengthM) || lengthM === 0) return { ...empty, strategy: 'NO_SIGNAL', reason: 'NO_LENGTH' }
  if (!isNonNegative(speed) || speed === 0) return { ...empty, strategy: 'NO_SIGNAL', reason: 'NO_SPEED' }

  const pace = Math.min(speed, MAX_GUIDE_SPEED)
  const arrived = distanceM <= ARRIVED_M
  const toGo = arrived ? 0 : distanceM
  const arrivalSec = toGo / pace
  const crossSec = lengthM / pace
  const timing = { marginSec, arrivalSec, crossSec }

  if (signal === 'FLASHING') {
    return { ...timing, strategy: 'WAIT_NEXT', reason: 'FLASHING', recommendedSpeed: null }
  }

  if (signal === 'RED') {
    if (arrived) return { ...timing, strategy: 'WAIT_NEXT', reason: 'RED_AT_CROSSWALK', recommendedSpeed: null }
    // 빨간불이 끝나기 전에 도착하면 속도를 늦춰 초록불이 켜질 때 도착하게 한다.
    if (arrivalSec < remainSec) {
      const ideal = toGo / remainSec
      return {
        ...timing,
        strategy: 'SLOW_DOWN',
        reason: 'RED_ARRIVE_EARLY',
        recommendedSpeed: ideal >= MIN_GUIDE_SPEED ? ideal : null,
      }
    }
    // 다음 초록불 길이는 아직 모르므로, 초록불로 바뀐 뒤 다시 판정한다.
    return { ...timing, strategy: 'GO_NOW', reason: 'RED_ARRIVE_AFTER', recommendedSpeed: null }
  }

  // GREEN
  if (arrivalSec + crossSec + marginSec <= remainSec) {
    return arrived
      ? { ...timing, strategy: 'CROSS_NOW', reason: 'CAN_CROSS', recommendedSpeed: null }
      : { ...timing, strategy: 'GO_NOW', reason: 'ENOUGH_TIME', recommendedSpeed: null }
  }
  const usableSec = remainSec - marginSec
  if (!arrived && pace < MAX_GUIDE_SPEED && usableSec > 0) {
    const needed = (toGo + lengthM) / usableSec
    if (needed <= MAX_GUIDE_SPEED) {
      return { ...timing, strategy: 'GO_FASTER', reason: 'NEED_FASTER', recommendedSpeed: needed }
    }
  }
  return { ...timing, strategy: 'WAIT_NEXT', reason: 'TOO_LATE', recommendedSpeed: null }
}
