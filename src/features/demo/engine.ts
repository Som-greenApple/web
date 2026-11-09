import type { LatLngPosition } from '../../types/crosswalk'
import type { SignalState, DataStatus } from '../../types/signal'
import type { StrategyType } from '../../types/strategy'

export interface SignalSample { signal: SignalState; remainSec?: number; updatedAt: number }
export const MOCK_PHASES: { signal: SignalState; durationSec: number }[] = [
  { signal: 'RED', durationSec: 23 }, { signal: 'GREEN', durationSec: 50 }, { signal: 'FLASHING', durationSec: 6 },
]
// 시연용 타임라인 fixture. 실제 관측 기록이 아니다.
export const REPLAY_PHASES: { signal: SignalState; durationSec: number }[] = [
  { signal: 'GREEN', durationSec: 12 }, { signal: 'FLASHING', durationSec: 6 },
  { signal: 'RED', durationSec: 30 }, { signal: 'GREEN', durationSec: 40 },
]
export function signalAt(elapsedSec: number, phases = MOCK_PHASES, forced: SignalState | null = null): Omit<SignalSample, 'updatedAt'> {
  if (forced === 'UNKNOWN') return { signal: 'UNKNOWN' }
  let sequence = phases
  if (forced) {
    const index = MOCK_PHASES.findIndex((phase) => phase.signal === forced)
    sequence = [...MOCK_PHASES.slice(index), ...MOCK_PHASES.slice(0, index)]
  }
  const cycle = sequence.reduce((sum, phase) => sum + phase.durationSec, 0)
  let elapsed = Math.max(0, elapsedSec) % cycle
  for (const phase of sequence) {
    if (elapsed < phase.durationSec) return { signal: phase.signal, remainSec: Math.ceil(phase.durationSec - elapsed) }
    elapsed -= phase.durationSec
  }
  return { signal: 'UNKNOWN' }
}

export function distanceM(a: LatLngPosition, b: LatLngPosition): number {
  const rad = (d: number) => d * Math.PI / 180
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 12_742_000 * Math.asin(Math.sqrt(Math.min(1, h)))
}
export function startingPosition(target: LatLngPosition, distance = 60): LatLngPosition {
  return { lat: target.lat - distance / 111_195, lng: target.lng }
}
export function advancePosition(current: LatLngPosition, target: LatLngPosition, speed: number, seconds: number): LatLngPosition {
  const distance = distanceM(current, target)
  if (distance < 0.001) return target
  const fraction = Math.min(1, Math.max(0, speed) * Math.max(0, seconds) / distance)
  return { lat: current.lat + (target.lat - current.lat) * fraction, lng: current.lng + (target.lng - current.lng) * fraction }
}
export function readLiveSignal(value: unknown, now: number): SignalSample {
  if (typeof value !== 'object' || value === null) throw new Error('신호 응답 형식이 올바르지 않아요')
  const v = value as Record<string, unknown>
  if (!['GREEN', 'FLASHING', 'RED', 'UNKNOWN'].includes(String(v.signal))) throw new Error('알 수 없는 신호예요')
  if (typeof v.updatedAt !== 'number' || !Number.isFinite(v.updatedAt) || v.updatedAt <= 0 || v.updatedAt > now + 5_000) throw new Error('신호 수신 시간이 올바르지 않아요')
  if (v.signal !== 'UNKNOWN' && (typeof v.remainSec !== 'number' || !Number.isFinite(v.remainSec) || v.remainSec < 0)) throw new Error('신호 잔여시간이 없어요')
  return { signal: v.signal as SignalState, remainSec: v.signal === 'UNKNOWN' ? undefined : v.remainSec as number, updatedAt: v.updatedAt }
}
export function liveSignalAt(sample: SignalSample | null, now: number, failed: boolean): { signal: SignalState; remainSec?: number; ageSec: number | null; dataStatus: DataStatus } {
  if (!sample || failed) return { signal: 'UNKNOWN', ageSec: null, dataStatus: 'offline' }
  const ageSec = Math.max(0, Math.floor((now - sample.updatedAt) / 1000))
  if (ageSec > 30 || (sample.remainSec !== undefined && ageSec >= sample.remainSec)) return { signal: 'UNKNOWN', ageSec, dataStatus: 'offline' }
  return { signal: sample.signal, remainSec: sample.remainSec === undefined ? undefined : Math.max(0, Math.ceil(sample.remainSec - ageSec)), ageSec, dataStatus: ageSec >= 10 ? 'delayed' : 'ok' }
}

export function predictGuide(signal: SignalState, remainSec: number | undefined, distance: number | null, speed: number, lengthM: number | null, dataStatus: DataStatus): StrategyType {
  if (dataStatus !== 'ok' || signal === 'UNKNOWN' || remainSec === undefined || distance === null || lengthM === null || speed <= 0 || !Number.isFinite(speed)) return 'NO_SIGNAL'
  if (signal === 'FLASHING') return 'WAIT_NEXT'
  if (signal === 'RED') return 'SLOW_DOWN'
  const needed = (distance + lengthM) / speed + 3
  if (needed <= remainSec) return distance <= 1 ? 'CROSS_NOW' : 'GO_NOW'
  if (distance > 1 && (distance + lengthM) / 1.4 + 3 <= remainSec) return 'GO_FASTER'
  return 'WAIT_NEXT'
}
