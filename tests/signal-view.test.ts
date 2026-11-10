import { describe, expect, it } from 'vitest'
import { signalView } from '../src/features/signal/signalView'
import type { SignalData } from '../src/features/signal/fetchSignal'

const base: SignalData = {
  itstId: '451', direction: 'ne', signal: 'GREEN', remainSec: 60,
  ageSec: 2, dataStatus: 'ok', sourceTimestamp: 98000,
  receivedAt: 100000, rawState: 'protected-Movement-Allowed', error: null,
}

describe('서버 수신 후 화면의 정보 경과와 만료', () => {
  it('데이터가 없으면 오프라인·UNKNOWN으로 표시한다', () => {
    expect(signalView(null, 100000)).toMatchObject({ signal: 'UNKNOWN', remainSec: undefined, dataStatus: 'offline' })
  })

  it.each([
    { now: 107999, status: 'ok' },
    { now: 108000, status: 'delayed' },
    { now: 128000, status: 'delayed' },
    { now: 128001, status: 'offline' },
  ])('현재 시각 $now에서 $status', ({ now, status }) => {
    const view = signalView(base, now)
    expect(view.dataStatus).toBe(status)
    if (status === 'offline') {
      expect(view.signal).toBe('UNKNOWN')
      expect(view.remainSec).toBeUndefined()
    }
  })

  it('원래 잔여시간이 끝나면 자동으로 빨강으로 바꾸지 않는다', () => {
    expect(signalView({ ...base, remainSec: 5 }, 105000)).toMatchObject({ signal: 'UNKNOWN', remainSec: undefined, error: 'STALE_DATA' })
  })

  it('서버가 오프라인으로 판정한 데이터는 화면에서 되살리지 않는다', () => {
    expect(signalView({ ...base, dataStatus: 'offline' }, 100000).signal).toBe('UNKNOWN')
  })
})
