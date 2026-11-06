/** 사과로 표현하는 신호 상태 */
export type SignalState = 'GREEN' | 'FLASHING' | 'RED' | 'UNKNOWN'

export const APPLE_LABEL: Record<SignalState, string> = {
  GREEN: '초록사과',
  FLASHING: '깜빡사과',
  RED: '빨간사과',
  UNKNOWN: '모르는사과',
}

/** 신호 데이터 수신 상태 (ageSec 10~30초면 delayed, 받아오기 실패면 offline) */
export type DataStatus = 'ok' | 'delayed' | 'offline'
