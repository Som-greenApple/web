import type { DataStatus, SignalState } from '../types/signal'
import type { StrategyType } from '../types/strategy'

// 피그마 화면 미리보기(?state=, ?status=) 전용 고정값 (피그마 A3, B1~B5 값 그대로).
// 실제 안내는 features/strategy의 예측 로직을 사용한다.
export interface GuideScenario {
  strategy: StrategyType
  signal: SignalState
  /** 큰 사과에 표시할 남은 초 (모르는사과는 없음) */
  remainSec?: number
  distanceM: number
  stats: { label: string; value: string }[]
  title: string
  description: string
  /** 신호 정보가 몇 초 전 것인지 (null: 신호 정보 없음) */
  ageSec: number | null
  dataStatus: DataStatus
  /** 목업 흐름: 카운트다운이 끝나면 넘어갈 상태 */
  next?: StrategyType
}

export const guideScenarios: Record<StrategyType, GuideScenario> = {
  SLOW_DOWN: {
    strategy: 'SLOW_DOWN',
    signal: 'RED',
    remainSec: 23,
    distanceM: 60,
    stats: [
      { label: '거리', value: '60m' },
      { label: '내 속도', value: '1.2m/s' },
      { label: '도착까지', value: '50초' },
    ],
    title: '천천히 걸어도 괜찮아요',
    description: '0.9m/s로 걸으면 도착할 때 딱 초록사과',
    ageSec: 3,
    dataStatus: 'ok',
    next: 'CROSS_NOW',
  },
  GO_NOW: {
    strategy: 'GO_NOW',
    signal: 'GREEN',
    remainSec: 50,
    distanceM: 30,
    stats: [
      { label: '거리', value: '30m' },
      { label: '내 속도', value: '1.2m/s' },
      { label: '도착까지', value: '25초' },
    ],
    title: '지금 속도 그대로 가요',
    description: '도착해서 건너도 시간이 넉넉해요',
    ageSec: 3,
    dataStatus: 'ok',
  },
  GO_FASTER: {
    strategy: 'GO_FASTER',
    signal: 'GREEN',
    remainSec: 45,
    distanceM: 30,
    stats: [
      { label: '거리', value: '30m' },
      { label: '내 속도', value: '1.0m/s' },
      { label: '도착까지', value: '30초' },
    ],
    title: '조금만 빨리 걸어요',
    description: '1.4m/s 빠른 걸음이면 충분 · 뛰기 금지',
    ageSec: 3,
    dataStatus: 'ok',
  },
  WAIT_NEXT: {
    strategy: 'WAIT_NEXT',
    signal: 'FLASHING',
    remainSec: 6,
    distanceM: 50,
    stats: [
      { label: '거리', value: '50m' },
      { label: '내 속도', value: '1.2m/s' },
      { label: '도착까지', value: '42초' },
    ],
    title: '다음 신호 기다려요',
    description: '깜빡일 땐 새로 건너지 않아요',
    ageSec: 3,
    dataStatus: 'ok',
  },
  CROSS_NOW: {
    strategy: 'CROSS_NOW',
    signal: 'GREEN',
    remainSec: 30,
    distanceM: 8,
    stats: [
      { label: '남은 거리', value: '8m' },
      { label: '건널 길이', value: '20m' },
      { label: '필요 시간', value: '23초' },
    ],
    title: '지금 건너도 돼요',
    description: '좌우 한 번 보고 천천히 건너요',
    ageSec: 3,
    dataStatus: 'ok',
  },
  NO_SIGNAL: {
    strategy: 'NO_SIGNAL',
    signal: 'UNKNOWN',
    distanceM: 300,
    stats: [
      { label: '거리', value: '300m' },
      { label: '내 속도', value: '1.2m/s' },
      { label: '도착까지', value: '4분 10초' },
    ],
    title: '신호 예측은 쉬어갈게요',
    description: '도착하면 진짜 신호등 보고 건너요',
    ageSec: 3,
    dataStatus: 'ok',
  },
}

/** C3 정보 지연 · C4 연결 끊김 (피그마 값 그대로) */
export const statusScenarios: Record<Exclude<DataStatus, 'ok'>, GuideScenario> = {
  delayed: {
    strategy: 'WAIT_NEXT',
    signal: 'GREEN',
    remainSec: 20,
    distanceM: 40,
    stats: [
      { label: '거리', value: '40m' },
      { label: '내 속도', value: '1.2m/s' },
      { label: '도착까지', value: '33초' },
    ],
    title: '다음 신호 기다려요',
    description: '늦게 온 정보라 3초 더 여유 뒀어요',
    ageSec: 14,
    dataStatus: 'delayed',
  },
  offline: {
    strategy: 'NO_SIGNAL',
    signal: 'UNKNOWN',
    distanceM: 60,
    stats: [
      { label: '거리', value: '60m' },
      { label: '내 속도', value: '1.2m/s' },
      { label: '도착까지', value: '50초' },
    ],
    title: '신호 예측은 쉬어갈게요',
    description: '연결되면 바로 다시 알려줄게요',
    ageSec: null,
    dataStatus: 'offline',
  },
}

/** 데모 패널 신호 강제 전환 → 보여줄 상태 */
export const strategyBySignal: Record<SignalState, StrategyType> = {
  GREEN: 'GO_NOW',
  FLASHING: 'WAIT_NEXT',
  RED: 'SLOW_DOWN',
  UNKNOWN: 'NO_SIGNAL',
}

/** 횡단보도별 기본 목업 상태 (목록의 사과 색과 맞춤) */
export const defaultStrategyByCrosswalk: Record<string, StrategyType> = {
  'main-gate': 'GO_NOW',
  'main-gate-side': 'SLOW_DOWN',
  'back-gate': 'NO_SIGNAL',
}
