import type { DataStatus, SignalState } from '../../types/signal'
import type { SignalData } from './fetchSignal'

export interface SignalView {
  signal: SignalState
  remainSec: number | undefined
  ageSec: number | null
  dataStatus: DataStatus
  error: string | null
}

/** 서버 응답 이후의 시간도 반영하며, 만료된 신호의 다음 상태는 추측하지 않는다. */
export function signalView(data: SignalData | null, now: number): SignalView {
  if (!data) {
    return { signal: 'UNKNOWN', remainSec: undefined, ageSec: null, dataStatus: 'offline', error: null }
  }
  const elapsed = Math.max(0, (now - data.receivedAt) / 1000)
  const age = data.ageSec === null ? null : data.ageSec + elapsed
  const remaining = data.remainSec === null ? null : Math.max(0, data.remainSec - elapsed)
  const status: DataStatus = data.dataStatus === 'offline' || age === null || age > 30
    ? 'offline'
    : data.dataStatus === 'delayed' || age >= 10 ? 'delayed' : 'ok'
  const usable = status !== 'offline' && data.error === null && remaining !== null && remaining > 0
  return {
    signal: usable ? data.signal : 'UNKNOWN',
    remainSec: usable && data.signal !== 'UNKNOWN' ? Math.floor(remaining!) : undefined,
    ageSec: age === null ? null : Math.round(age * 10) / 10,
    dataStatus: status,
    error: data.error ?? (remaining === 0 ? 'STALE_DATA' : null),
  }
}
