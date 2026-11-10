import type { VercelRequest, VercelResponse } from '@vercel/node'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../api/signal'

const NOW = Date.UTC(2026, 10, 10, 12)
const KEY = 'unit-test-key'

function row(overrides: Record<string, unknown> = {}) {
  return {
    itstId: '451',
    trsmUtcTime: NOW,
    nePdsgStatNm: 'protected-Movement-Allowed',
    nePdsgRmdrCs: 900,
    ...overrides,
  }
}

function upstream(payload: unknown) {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(payload)))
}

async function request(query: VercelRequest['query'] = { itstId: '451', direction: 'ne' }, method = 'GET') {
  const response = {
    code: 200,
    headers: {} as Record<string, unknown>,
    body: undefined as unknown,
    setHeader(name: string, value: unknown) { this.headers[name] = value; return this },
    status(code: number) { this.code = code; return this },
    json(body: unknown) { this.body = body; return this },
  }
  await handler({ method, query } as VercelRequest, response as unknown as VercelResponse)
  return response
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  vi.stubEnv('TDATA_API_KEY', KEY)
  // 모든 요청을 가로채 실제 API와 인증키 없이 실행한다.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('예상하지 못한 요청')))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('정상 신호 응답 파싱', () => {
  it.each([
    { raw: 'stop-And-Remain', expected: 'RED' },
    { raw: 'protected-Movement-Allowed', expected: 'GREEN' },
    { raw: 'permissive-Movement-Allowed', expected: 'GREEN' },
  ])('$raw → $expected', async ({ raw, expected }) => {
    upstream([row({ nePdsgStatNm: raw })])
    const result = await request()
    expect(result.code).toBe(200)
    expect(result.body).toMatchObject({ signal: expected, remainSec: 90, ageSec: 0, dataStatus: 'ok', error: null })
    expect(result.headers['Cache-Control']).toBe('no-store')
  })

  it('단일 객체 응답과 숫자 문자열을 처리하고 전송 지연을 차감한다', async () => {
    upstream(row({ nePdsgRmdrCs: '414', trsmUtcTime: NOW - 2000 }))
    expect((await request()).body).toMatchObject({ remainSec: 39.4, ageSec: 2, error: null })
  })

  it('요청한 교차로의 최신 레코드를 선택하고 차량 신호는 무시한다', async () => {
    upstream([
      row({ trsmUtcTime: NOW - 1000, nePdsgStatNm: 'stop-And-Remain' }),
      row({ itstId: '266' }),
      row({ neStsgStatNm: 'stop-And-Remain', neStsgRmdrCs: 1 }),
    ])
    expect((await request()).body).toMatchObject({ itstId: '451', signal: 'GREEN', remainSec: 90, ageSec: 0 })
  })
})

describe('빈 응답과 유효하지 않은 데이터', () => {
  it.each([
    { name: '빈 배열', payload: [] },
    { name: 'null', payload: null },
    { name: '빈 객체', payload: {} },
    { name: '다른 교차로', payload: [row({ itstId: '266' })] },
    { name: '잘못된 배열 원소', payload: [null, 1, 'invalid'] },
  ])('$name이면 NO_DATA', async ({ payload }) => {
    upstream(payload)
    expect((await request()).body).toMatchObject({ signal: 'UNKNOWN', remainSec: null, dataStatus: 'offline', error: 'NO_DATA' })
  })

  it.each([null, '', 'invalid', -1])('잘못된 잔여시간 %s를 사용하지 않는다', async (remain) => {
    upstream(row({ nePdsgRmdrCs: remain }))
    expect((await request()).body).toMatchObject({ signal: 'UNKNOWN', remainSec: null, error: 'NO_SIGNAL_DATA' })
  })

  it('보행 신호가 없으면 차량 신호를 대신 쓰지 않는다', async () => {
    upstream(row({ nePdsgStatNm: null, nePdsgRmdrCs: null, neStsgStatNm: 'protected-Movement-Allowed', neStsgRmdrCs: 900 }))
    expect((await request()).body).toMatchObject({ signal: 'UNKNOWN', error: 'NO_SIGNAL_DATA' })
  })

  it('확인되지 않은 점멸 코드는 임의로 FLASHING으로 변환하지 않는다', async () => {
    upstream(row({ nePdsgStatNm: 'unverified-flashing' }))
    expect((await request()).body).toMatchObject({ signal: 'UNKNOWN', error: 'UNSUPPORTED_SIGNAL_STATE' })
  })
})

describe('지연·만료 경계', () => {
  it.each([
    { ms: 9999, status: 'ok', signal: 'GREEN', error: null },
    { ms: 10000, status: 'delayed', signal: 'GREEN', error: null },
    { ms: 30000, status: 'delayed', signal: 'GREEN', error: null },
    { ms: 30001, status: 'offline', signal: 'UNKNOWN', error: 'STALE_DATA' },
  ])('$ms ms 경과 → $status', async ({ ms, status, signal, error }) => {
    upstream(row({ trsmUtcTime: NOW - ms }))
    expect((await request()).body).toMatchObject({ dataStatus: status, signal, error })
  })

  it('잔여시간이 정확히 만료되면 다음 신호를 추정하지 않는다', async () => {
    upstream(row({ trsmUtcTime: NOW - 2000, nePdsgRmdrCs: 20 }))
    expect((await request()).body).toMatchObject({ signal: 'UNKNOWN', remainSec: null, error: 'STALE_DATA' })
  })

  it.each([null, 0, 'invalid', NOW + 5001])('잘못된 전송 시각 %s를 거부한다', async (timestamp) => {
    upstream(row({ trsmUtcTime: timestamp }))
    expect((await request()).body).toMatchObject({ signal: 'UNKNOWN', error: 'INVALID_TIMESTAMP' })
  })
})

describe('요청 검사와 실패 처리', () => {
  it('GET 이외의 요청은 API를 호출하지 않는다', async () => {
    const response = await request(undefined, 'POST')
    expect(response.code).toBe(405)
    expect(response.headers.Allow).toBe('GET')
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    { itstId: 'invalid', direction: 'ne' },
    { itstId: '123456', direction: 'ne' },
    { itstId: '451', direction: 'invalid' },
    { itstId: ['451', '266'], direction: 'ne' },
  ])('잘못된 쿼리 $itstId / $direction를 거부한다', async (query) => {
    expect((await request(query)).code).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('인증키가 없으면 외부 API를 호출하지 않는다', async () => {
    vi.stubEnv('TDATA_API_KEY', '')
    const response = await request()
    expect(response.code).toBe(500)
    expect(response.body).toMatchObject({ error: 'MISSING_API_KEY' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('상류 HTTP 실패를 처리하고 키와 오류 본문을 반환하지 않는다', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(KEY, { status: 403 }))
    const response = await request()
    expect(response.code).toBe(502)
    expect(response.body).toMatchObject({ error: 'UPSTREAM_ERROR' })
    expect(JSON.stringify(response.body)).not.toContain(KEY)
  })

  it('잘못된 JSON 응답을 처리한다', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('not-json'))
    const response = await request()
    expect(response.code).toBe(502)
    expect(response.body).toMatchObject({ error: 'INVALID_RESPONSE' })
  })

  it('네트워크·타임아웃 오류에도 인증키를 노출하지 않는다', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error(`timeout ${KEY}`))
    const response = await request()
    expect(response.code).toBe(502)
    expect(response.body).toMatchObject({ error: 'UPSTREAM_ERROR' })
    expect(JSON.stringify(response.body)).not.toContain(KEY)
  })
})
