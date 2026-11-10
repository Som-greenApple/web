import type { LatLngPosition } from '../../types/crosswalk'
import { metersBetween } from '../walk/record.ts'
import { MAX_GUIDE_SPEED } from './predict.ts'

export interface SpeedSample {
  position: LatLngPosition
  at: number
}

/** 최근 이 시간 동안의 이동으로 속도를 잰다 */
export const SPEED_WINDOW_MS = 10_000
/** 측정 구간이 이보다 짧으면 속도를 내지 않는다 */
export const MIN_SPAN_MS = 3_000
/** GPS 갱신이 이보다 오래 끊기면 기록을 새로 시작한다 */
export const MAX_GAP_MS = 10_000
/** 이보다 빠른 이동은 GPS 튐으로 보고 기록을 새로 시작한다 */
export const MAX_JUMP_SPEED = 6
/** 측정 속도가 이보다 느리면 멈춰 있는 것으로 보고 기본 속도로 예측한다 */
export const MIN_MOVING_SPEED = 0.5
/** 측정 전이거나 멈춰 있을 때 예측에 쓰는 일반 보행 속도 */
export const DEFAULT_WALK_SPEED = 1.2

/** GPS 위치를 기록에 추가한다. 끊김·튐이 있으면 그 지점부터 새로 잰다. */
export function addSpeedSample(samples: readonly SpeedSample[], position: LatLngPosition, at: number): SpeedSample[] {
  const last = samples.at(-1)
  if (last && at <= last.at) return [...samples]
  if (last) {
    const seconds = (at - last.at) / 1000
    const jump = metersBetween(last.position, position) / seconds
    if (at - last.at > MAX_GAP_MS || !Number.isFinite(jump) || jump > MAX_JUMP_SPEED) {
      return [{ position, at }]
    }
  }
  return [...samples, { position, at }].filter((sample) => at - sample.at <= SPEED_WINDOW_MS)
}

/**
 * 측정 구간 처음과 마지막 위치의 직선 이동 거리로 속도를 잰다.
 * 제자리 GPS 흔들림이 누적되지 않도록 경로 합 대신 순이동을 쓰고,
 * 마지막 갱신 이후 시간도 포함해서 멈추면 속도가 줄어든다.
 */
export function estimateSpeed(samples: readonly SpeedSample[], now: number): number | null {
  if (samples.length < 2) return null
  const first = samples[0]
  const last = samples.at(-1)!
  if (now - last.at > MAX_GAP_MS) return null
  const spanMs = Math.max(now, last.at) - first.at
  if (spanMs < MIN_SPAN_MS) return null
  return metersBetween(first.position, last.position) / (spanMs / 1000)
}

/** 측정값을 예측용 속도로 바꾼다. 측정 전·정지 상태는 기본 속도, 빠른 걸음은 상한으로 자른다. */
export function speedForPrediction(measured: number | null): { speed: number; assumed: boolean } {
  if (measured === null || !Number.isFinite(measured) || measured < MIN_MOVING_SPEED) {
    return { speed: DEFAULT_WALK_SPEED, assumed: true }
  }
  return { speed: Math.min(measured, MAX_GUIDE_SPEED), assumed: false }
}
