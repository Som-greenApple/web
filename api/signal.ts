import type { VercelRequest, VercelResponse } from '@vercel/node'
import process from 'node:process'

type Direction = 'nt' | 'et' | 'st' | 'wt' | 'ne' | 'se' | 'sw' | 'nw'
type SignalState = 'GREEN' | 'FLASHING' | 'RED' | 'UNKNOWN'
type DataStatus = 'ok' | 'delayed' | 'offline'

type SignalError =
  | 'METHOD_NOT_ALLOWED'
  | 'INVALID_QUERY'
  | 'MISSING_API_KEY'
  | 'UPSTREAM_ERROR'
  | 'INVALID_RESPONSE'
  | 'NO_DATA'
  | 'INVALID_TIMESTAMP'
  | 'NO_SIGNAL_DATA'
  | 'UNSUPPORTED_SIGNAL_STATE'
  | 'STALE_DATA'

interface SignalResponse {
  itstId: string | null
  direction: Direction | null
  signal: SignalState
  remainSec: number | null
  ageSec: number | null
  dataStatus: DataStatus
  sourceTimestamp: number | null
  receivedAt: number
  rawState: string | null
  error: SignalError | null
}

const API_URL =
  'https://t-data.seoul.go.kr/apig/apiman-gateway/tapi/v2xSignalPhaseTimingFusionCurrentInfo/1.0'

const DIRECTIONS: Direction[] = [
  'nt',
  'et',
  'st',
  'wt',
  'ne',
  'se',
  'sw',
  'nw',
]

function isDirection(value: string): value is Direction {
  return DIRECTIONS.includes(value as Direction)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return null
  }

  if (typeof value === 'string' && value.trim() === '') {
    return null
  }

  const number = Number(value)

  return Number.isFinite(number) ? number : null
}

/**
 * 현재는 의미가 확인된 빨간 신호만 변환한다.
 * 보행 초록·점멸의 상태 코드가 확인되면 명시적으로 추가한다.
 * 잔여시간만으로 초록이나 점멸을 추정하지 않는다.
 */
function parseSignal(rawState: string | null): SignalState {
  if (rawState === 'stop-And-Remain') {
    return 'RED'
  }

  return 'UNKNOWN'
}

function emptyResponse(
  itstId: string | null,
  direction: Direction | null,
  error: SignalError,
): SignalResponse {
  return {
    itstId,
    direction,
    signal: 'UNKNOWN',
    remainSec: null,
    ageSec: null,
    dataStatus: 'offline',
    sourceTimestamp: null,
    receivedAt: Date.now(),
    rawState: null,
    error,
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // 신호 응답이 브라우저나 CDN에 캐시되지 않도록 한다.
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res
      .status(405)
      .json(emptyResponse(null, null, 'METHOD_NOT_ALLOWED'))
  }

  const idQuery = req.query.itstId
  const directionQuery = req.query.direction

  if (
    typeof idQuery !== 'string' ||
    !/^\d{5}$/.test(idQuery) ||
    typeof directionQuery !== 'string' ||
    !isDirection(directionQuery)
  ) {
    return res
      .status(400)
      .json(emptyResponse(null, null, 'INVALID_QUERY'))
  }

  const itstId = idQuery
  const direction = directionQuery
  const apiKey = process.env.TDATA_API_KEY?.trim()

  if (!apiKey) {
    return res
      .status(500)
      .json(emptyResponse(itstId, direction, 'MISSING_API_KEY'))
  }

  const url = new URL(API_URL)
  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('itstId', itstId)
  url.searchParams.set('type', 'json')

  let payload: unknown

  try {
    const upstream = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    })

    if (!upstream.ok) {
      return res
        .status(502)
        .json(emptyResponse(itstId, direction, 'UPSTREAM_ERROR'))
    }

    try {
      payload = await upstream.json()
    } catch {
      return res
        .status(502)
        .json(emptyResponse(itstId, direction, 'INVALID_RESPONSE'))
    }
  } catch {
    // キーを含むURLや例外本文は返さない。
    return res
      .status(502)
      .json(emptyResponse(itstId, direction, 'UPSTREAM_ERROR'))
  }

  // 配列形式と単一オブジェクト形式の両方を受け付ける。
  const records: unknown[] = Array.isArray(payload)
    ? payload
    : [payload]

  const matchingRecords = records
    .filter(isRecord)
    .filter((record) => String(record.itstId) === itstId)

  if (matchingRecords.length === 0) {
    return res
      .status(200)
      .json(emptyResponse(itstId, direction, 'NO_DATA'))
  }

  // 同じ交差点のレコードが複数ある場合は最新のものを選ぶ。
  const row = matchingRecords.reduce((latest, current) => {
    const latestTime = toFiniteNumber(latest.trsmUtcTime) ?? -Infinity
    const currentTime = toFiniteNumber(current.trsmUtcTime) ?? -Infinity

    return currentTime > latestTime ? current : latest
  })

  const receivedAt = Date.now()
  const sourceTimestamp = toFiniteNumber(row.trsmUtcTime)

  // 時刻不明・不正、または5秒を超える未来時刻は有効な情報として扱わない。
  if (
    sourceTimestamp === null ||
    sourceTimestamp <= 0 ||
    sourceTimestamp > receivedAt + 5_000
  ) {
    return res
      .status(200)
      .json(emptyResponse(itstId, direction, 'INVALID_TIMESTAMP'))
  }

  const ageSec = Math.max(
    0,
    (receivedAt - sourceTimestamp) / 1_000,
  )

  // このアプリの判定ルール:
  // 10秒未満はok、10〜30秒はdelayed、30秒超はoffline。
  const dataStatus: DataStatus =
    ageSec > 30 ? 'offline' : ageSec >= 10 ? 'delayed' : 'ok'

  const stateValue = row[`${direction}PdsgStatNm`]
  const rawState =
    typeof stateValue === 'string' && stateValue.trim() !== ''
      ? stateValue.trim()
      : null

  const rawRemain = toFiniteNumber(
    row[`${direction}PdsgRmdrCs`],
  )

  const parsedSignal = parseSignal(rawState)

  // 公式の値説明では1/10秒単位。
  const sourceRemainSec =
    rawRemain !== null && rawRemain >= 0
      ? rawRemain / 10
      : null

  // 受信までの経過時間を差し引く。
  // 元の残り時間が尽きていても次の信号状態は推測しない。
  const adjustedRemainSec =
    sourceRemainSec === null
      ? null
      : Math.max(0, sourceRemainSec - ageSec)

  let error: SignalError | null = null

  if (dataStatus === 'offline') {
    error = 'STALE_DATA'
  } else if (rawState === null || sourceRemainSec === null) {
    error = 'NO_SIGNAL_DATA'
  } else if (parsedSignal === 'UNKNOWN') {
    error = 'UNSUPPORTED_SIGNAL_STATE'
  } else if (adjustedRemainSec === 0) {
    error = 'STALE_DATA'
  }

  const usable = error === null

  const response: SignalResponse = {
    itstId,
    direction,
    signal: usable ? parsedSignal : 'UNKNOWN',
    remainSec:
      usable && adjustedRemainSec !== null
        ? Math.floor(adjustedRemainSec * 10) / 10
        : null,
    ageSec: Math.round(ageSec * 10) / 10,
    dataStatus,
    sourceTimestamp,
    receivedAt,
    rawState,
    error,
  }

  return res.status(200).json(response)
}