import { describe, expect, it } from 'vitest'
import {
  ARRIVED_M,
  MAX_GUIDE_SPEED,
  decideGuide,
  type GuideInput,
} from '../src/features/strategy/predict'

const base: GuideInput = {
  signal: 'GREEN',
  remainSec: 53,
  dataStatus: 'ok',
  distanceM: 30,
  lengthM: 20,
  speed: 1,
}

function guide(overrides: Partial<GuideInput> = {}) {
  return decideGuide({
    ...base,
    ...overrides,
  })
}

describe('초록 신호의 시간 경계', () => {
  // 도착 30초 + 횡단 20초 + 여유 3초 = 총 53초
  it.each([
    { remainSec: 54, expected: 'GO_NOW' },
    { remainSec: 53, expected: 'GO_NOW' },
    { remainSec: 52, expected: 'GO_FASTER' },
  ])(
    '남은 시간 $remainSec초 → $expected',
    ({ remainSec, expected }) => {
      expect(guide({ remainSec }).strategy).toBe(expected)
    },
  )

  it('도착 시간만 충분해도 횡단과 여유 시간이 부족하면 건너기 안내를 하지 않는다', () => {
    const result = guide({ remainSec: 30 })

    expect(result.arrivalSec).toBe(30)
    expect(result.strategy).toBe('WAIT_NEXT')
    expect(result.reason).toBe('TOO_LATE')
  })
})

describe('권장 속도 상한 경계', () => {
  // 남은 23초 - 여유 3초 = 이동에 사용할 수 있는 시간 20초
  // 거리 14m + 횡단 길이 14m라면 필요한 속도는 정확히 1.4m/s
  it.each([
    {
      lengthM: 13.98,
      expected: 'GO_FASTER',
      recommendedSpeed: 1.399,
    },
    {
      lengthM: 14,
      expected: 'GO_FASTER',
      recommendedSpeed: 1.4,
    },
    {
      lengthM: 14.02,
      expected: 'WAIT_NEXT',
      recommendedSpeed: null,
    },
  ])(
    '횡단 길이 $lengthM m → $expected',
    ({ lengthM, expected, recommendedSpeed }) => {
      const result = guide({
        distanceM: 14,
        lengthM,
        remainSec: 23,
      })

      expect(result.strategy).toBe(expected)

      if (recommendedSpeed === null) {
        expect(result.recommendedSpeed).toBeNull()
      } else {
        expect(result.recommendedSpeed).toBeCloseTo(
          recommendedSpeed,
          6,
        )
        expect(result.recommendedSpeed).toBeLessThanOrEqual(
          MAX_GUIDE_SPEED,
        )
      }
    },
  )

  it.each([1.399, 1.4, 1.401])(
    '입력 속도 %s m/s에서도 예측 속도 상한을 적용한다',
    (speed) => {
      const result = guide({
        speed,
        remainSec: 100,
      })

      const predictionSpeed = Math.min(speed, MAX_GUIDE_SPEED)

      expect(result.arrivalSec).toBeCloseTo(
        30 / predictionSpeed,
        6,
      )
      expect(result.crossSec).toBeCloseTo(
        20 / predictionSpeed,
        6,
      )
    },
  )
})

describe('빨간 신호의 도착 시간 경계', () => {
  // 현재 속도로 도착하기까지 30초
  it.each([
    { remainSec: 29.999, expected: 'GO_NOW' },
    { remainSec: 30, expected: 'GO_NOW' },
    { remainSec: 30.001, expected: 'SLOW_DOWN' },
  ])(
    '빨간 신호 잔여시간 $remainSec초 → $expected',
    ({ remainSec, expected }) => {
      const result = guide({
        signal: 'RED',
        remainSec,
      })

      expect(result.strategy).toBe(expected)
    },
  )
})

describe('도착 판정과 점멸', () => {
  it('도착 거리 경계 안이면 접근 시간을 0으로 계산한다', () => {
    const result = guide({
      distanceM: ARRIVED_M,
      remainSec: 23,
    })

    expect(result.arrivalSec).toBe(0)
    expect(result.strategy).toBe('CROSS_NOW')
  })

  it('도착 거리 경계를 넘으면 도착한 것으로 처리하지 않는다', () => {
    const result = guide({
      distanceM: ARRIVED_M + 0.001,
      remainSec: 23,
    })

    expect(result.arrivalSec).toBeGreaterThan(0)
    expect(result.strategy).not.toBe('CROSS_NOW')
  })

  it('점멸 중에는 시간이 충분해도 다음 신호를 기다린다', () => {
    const result = guide({
      signal: 'FLASHING',
      remainSec: 100,
      distanceM: 0,
    })

    expect(result.strategy).toBe('WAIT_NEXT')
    expect(result.reason).toBe('FLASHING')
  })
})

describe('정보 지연과 누락', () => {
  it('지연된 정보는 안전 여유 시간을 6초로 늘린다', () => {
    const enough = guide({
      dataStatus: 'delayed',
      remainSec: 56,
    })

    const short = guide({
      dataStatus: 'delayed',
      remainSec: 55,
    })

    expect(enough.marginSec).toBe(6)
    expect(enough.strategy).toBe('GO_NOW')
    expect(short.strategy).toBe('GO_FASTER')
  })

  it.each([
    {
      name: '연결 끊김',
      overrides: { dataStatus: 'offline' },
      reason: 'NO_DATA',
    },
    {
      name: '신호 미확인',
      overrides: { signal: 'UNKNOWN' },
      reason: 'NO_DATA',
    },
    {
      name: '잔여시간 누락',
      overrides: { remainSec: undefined },
      reason: 'NO_DATA',
    },
    {
      name: '위치 누락',
      overrides: { distanceM: null },
      reason: 'NO_POSITION',
    },
    {
      name: '횡단 길이 누락',
      overrides: { lengthM: null },
      reason: 'NO_LENGTH',
    },
    {
      name: '속도 0',
      overrides: { speed: 0 },
      reason: 'NO_SPEED',
    },
  ] satisfies {
    name: string
    overrides: Partial<GuideInput>
    reason: string
  }[])('$name이면 예측하지 않는다', ({ overrides, reason }) => {
    const result = guide(overrides)

    expect(result.strategy).toBe('NO_SIGNAL')
    expect(result.reason).toBe(reason)
    expect(result.recommendedSpeed).toBeNull()
  })
})