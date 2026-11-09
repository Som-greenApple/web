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

/** 지원하는 방향 값인지 확인한다. */
function isDirection(value: string): value is Direction {
  return DIRECTIONS.includes(value as Direction)
}

/** 배열과 null을 제외한 객체인지 확인한다. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

/** 숫자 또는 숫자 문자열을 유한한 숫자로 변환한다. */
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
 * 표준의 빨강·초록 상태를 앱의 신호 상태로 변환한다.
 * 서울 보행 점멸 신호의 매핑은 추가 확인이 필요하다.
 * 잔여시간만으로 점멸 여부나 다음 신호를 추정하지 않는다.
 */
function parseSignal(rawState: string | null): SignalState {
  switch (rawState) {
    case 'stop-And-Remain':
      return 'RED'

    case 'protected-Movement-Allowed':
    case 'permissive-Movement-Allowed':
      return 'GREEN'

    default:
      return 'UNKNOWN'
  }
}

/** 유효한 신호 정보를 제공할 수 없을 때 반환할 응답을 만든다. */
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

  // GET 요청만 허용한다.
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')

    return res
      .status(405)
      .json(emptyResponse(null, null, 'METHOD_NOT_ALLOWED'))
  }

  const idQuery = req.query.itstId
  const directionQuery = req.query.direction

  // 교차로 ID와 보행 신호 방향을 검사한다.
  if (
    typeof idQuery !== 'string' ||
    !/^\d{1,5}$/.test(idQuery) ||
    typeof directionQuery !== 'string' ||
    !isDirection(directionQuery)
  ) {
    return res
      .status(400)
      .json(emptyResponse(null, null, 'INVALID_QUERY'))
  }

  const itstId = idQuery
  const direction = directionQuery

  // 인증키는 서버 환경변수에서만 읽는다.
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
    // 인증키가 포함된 요청 URL이나 예외 본문은 반환하지 않는다.
    return res
      .status(502)
      .json(emptyResponse(itstId, direction, 'UPSTREAM_ERROR'))
  }

  // 배열과 단일 객체 형식의 응답을 모두 처리한다.
  const records: unknown[] = Array.isArray(payload)
    ? payload
    : [payload]

  // 요청한 교차로에 해당하는 데이터만 사용한다.
  const matchingRecords = records
    .filter(isRecord)
    .filter((record) => String(record.itstId) === itstId)

  if (matchingRecords.length === 0) {
    return res
      .status(200)
      .json(emptyResponse(itstId, direction, 'NO_DATA'))
  }

  // 같은 교차로 데이터가 여러 개라면 전송 시각이 가장 최신인 것을 선택한다.
  const row = matchingRecords.reduce((latest, current) => {
    const latestTime =
      toFiniteNumber(latest.trsmUtcTime) ?? -Infinity

    const currentTime =
      toFiniteNumber(current.trsmUtcTime) ?? -Infinity

    return currentTime > latestTime ? current : latest
  })

  const receivedAt = Date.now()
  const sourceTimestamp = toFiniteNumber(row.trsmUtcTime)

  // 전송 시각이 없거나 잘못됐거나, 현재보다 5초 넘게 미래라면 사용하지 않는다.
  if (
    sourceTimestamp === null ||
    sourceTimestamp <= 0 ||
    sourceTimestamp > receivedAt + 5_000
  ) {
    return res
      .status(200)
      .json(emptyResponse(itstId, direction, 'INVALID_TIMESTAMP'))
  }

  // 원본 데이터가 전송된 시점부터 경과한 시간을 초 단위로 계산한다.
  const ageSec = Math.max(
    0,
    (receivedAt - sourceTimestamp) / 1_000,
  )

  // 앱의 정보 지연 판정 기준:
  // 10초 미만은 정상, 10~30초는 지연, 30초 초과는 사용 불가로 처리한다.
  const dataStatus: DataStatus =
    ageSec > 30
      ? 'offline'
      : ageSec >= 10
        ? 'delayed'
        : 'ok'

  // 차량 신호 대신 요청한 방향의 보행 신호 필드만 읽는다.
  const stateValue = row[`${direction}PdsgStatNm`]

  const rawState =
    typeof stateValue === 'string' && stateValue.trim() !== ''
      ? stateValue.trim()
      : null

  const rawRemain = toFiniteNumber(
    row[`${direction}PdsgRmdrCs`],
  )

  const parsedSignal = parseSignal(rawState)

  // 공식 문서의 값 설명에 따라 1/10초 단위를 초로 변환한다.
  const sourceRemainSec =
    rawRemain !== null && rawRemain >= 0
      ? rawRemain / 10
      : null

  // 서버에 도착하기까지 경과한 시간을 잔여시간에서 차감한다.
  // 잔여시간이 끝나더라도 다음 신호 상태로 자동 전환하지 않는다.
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