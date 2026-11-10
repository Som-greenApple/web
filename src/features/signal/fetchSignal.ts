import type { DataStatus, SignalState } from '../../types/signal'

export type SignalDirection =
  | 'nt'
  | 'et'
  | 'st'
  | 'wt'
  | 'ne'
  | 'se'
  | 'sw'
  | 'nw'

export interface SignalData {
  itstId: string
  direction: SignalDirection
  signal: SignalState
  remainSec: number | null
  ageSec: number | null
  dataStatus: DataStatus
  sourceTimestamp: number | null
  receivedAt: number
  rawState: string | null
  error: string | null
}

const SIGNALS: SignalState[] = [
  'GREEN',
  'FLASHING',
  'RED',
  'UNKNOWN',
]

const DATA_STATUSES: DataStatus[] = [
  'ok',
  'delayed',
  'offline',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isNullableNumber(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0)
  )
}

function isSignalData(
  value: unknown,
  itstId: string,
  direction: SignalDirection,
): value is SignalData {
  if (!isRecord(value)) return false

  return (
    value.itstId === itstId &&
    value.direction === direction &&
    SIGNALS.includes(value.signal as SignalState) &&
    DATA_STATUSES.includes(value.dataStatus as DataStatus) &&
    isNullableNumber(value.remainSec) &&
    isNullableNumber(value.ageSec) &&
    isNullableNumber(value.sourceTimestamp) &&
    typeof value.receivedAt === 'number' &&
    Number.isFinite(value.receivedAt) &&
    value.receivedAt > 0 &&
    (value.rawState === null || typeof value.rawState === 'string') &&
    (value.error === null || typeof value.error === 'string')
  )
}

interface FetchSignalOptions {
  itstId: string
  direction: SignalDirection
  signal?: AbortSignal
}

/**
 * 인증키 없이 우리 서버의 프록시만 호출한다.
 * 화면을 벗어날 때 요청을 취소할 수 있도록 AbortSignal을 받는다.
 */
export async function fetchSignal({
  itstId,
  direction,
  signal,
}: FetchSignalOptions): Promise<SignalData> {
  const params = new URLSearchParams({
    itstId,
    direction,
  })

  const response = await fetch(`/api/signal?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
    signal,
  })

  const payload: unknown = await response.json()

  if (!isSignalData(payload, itstId, direction)) {
    throw new Error('신호 API 응답 형식이 올바르지 않습니다.')
  }

  if (!response.ok) {
    throw new Error(payload.error ?? '신호 정보를 가져오지 못했습니다.')
  }

  return payload
}