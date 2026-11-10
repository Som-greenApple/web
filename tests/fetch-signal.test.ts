import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchSignal, type SignalData } from '../src/features/signal/fetchSignal'

const response: SignalData = {
  itstId: '451', direction: 'ne', signal: 'GREEN', remainSec: 20,
  ageSec: 1, dataStatus: 'ok', sourceTimestamp: 99000,
  receivedAt: 100000, rawState: 'protected-Movement-Allowed', error: null,
}
const options = { itstId: '451', direction: 'ne' } as const

beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })

describe('브라우저의 프록시 응답 검사', () => {
  it('인증키 없이 동일 출처의 프록시만 호출한다', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(response)))
    const controller = new AbortController()
    expect(await fetchSignal({ ...options, signal: controller.signal })).toEqual(response)
    expect(fetch).toHaveBeenCalledWith('/api/signal?itstId=451&direction=ne', {
      method: 'GET', cache: 'no-store', signal: controller.signal,
    })
  })

  it.each([
    { name: 'null', payload: null },
    { name: '빈 객체', payload: {} },
    { name: '다른 교차로', payload: { ...response, itstId: '266' } },
    { name: '다른 방향', payload: { ...response, direction: 'nt' } },
    { name: '잘못된 색상', payload: { ...response, signal: 'BLUE' } },
    { name: '음수 잔여시간', payload: { ...response, remainSec: -1 } },
    { name: '문자열 경과시간', payload: { ...response, ageSec: '1' } },
  ])('$name 응답을 거부한다', async ({ payload }) => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(payload)))
    await expect(fetchSignal(options)).rejects.toThrow('응답 형식')
  })

  it('정상 형식의 offline 응답은 목업으로 바꾸지 않고 그대로 전달한다', async () => {
    const offline = { ...response, signal: 'UNKNOWN', remainSec: null, dataStatus: 'offline', error: 'STALE_DATA' }
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(offline)))
    expect(await fetchSignal(options)).toEqual(offline)
  })

  it('서버 오류 응답은 호출자에게 오류로 전달한다', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ...response, error: 'UPSTREAM_ERROR' }), { status: 502 }))
    await expect(fetchSignal(options)).rejects.toThrow('UPSTREAM_ERROR')
  })
})
