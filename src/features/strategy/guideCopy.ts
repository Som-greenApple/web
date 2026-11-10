import type { DataStatus } from '../../types/signal'
import { DELAY_MARGIN_SEC, MAX_GUIDE_SPEED, type GuideDecision } from './predict.ts'

export interface GuideCopy {
  title: string
  description: string
}

/** 0.1m/s 단위로 표시한다. 느리게 걸을 땐 내림, 빨리 걸을 땐 올림해서 안전한 쪽으로 맞춘다. */
export function formatSpeed(speed: number, round: 'down' | 'up'): string {
  const value = round === 'down' ? Math.floor(speed * 10) / 10 : Math.min(MAX_GUIDE_SPEED, Math.ceil(speed * 10) / 10)
  return `${value.toFixed(1)}m/s`
}

function baseCopy(decision: GuideDecision): GuideCopy {
  const { strategy, reason, recommendedSpeed } = decision
  switch (strategy) {
    case 'SLOW_DOWN':
      return {
        title: '천천히 걸어도 괜찮아요',
        description: recommendedSpeed === null
          ? '횡단보도 앞에서 초록사과를 기다려요'
          : `${formatSpeed(recommendedSpeed, 'down')}로 걸으면 도착할 때 딱 초록사과`,
      }
    case 'GO_NOW':
      return {
        title: '지금 속도 그대로 가요',
        description: reason === 'RED_ARRIVE_AFTER' ? '도착할 때쯤 초록사과로 바뀌어요' : '도착해서 건너도 시간이 넉넉해요',
      }
    case 'GO_FASTER':
      return {
        title: '조금만 빨리 걸어요',
        description: `${formatSpeed(recommendedSpeed ?? MAX_GUIDE_SPEED, 'up')} 빠른 걸음이면 충분 · 뛰기 금지`,
      }
    case 'WAIT_NEXT':
      return {
        title: '다음 신호 기다려요',
        description: reason === 'FLASHING'
          ? '깜빡일 땐 새로 건너지 않아요'
          : reason === 'RED_AT_CROSSWALK'
            ? '횡단보도 앞에서 초록사과를 기다려요'
            : '이번 신호는 뛰어야 해서 다음 신호를 기다려요',
      }
    case 'CROSS_NOW':
      return { title: '지금 건너도 돼요', description: '좌우 한 번 보고 천천히 건너요' }
    case 'NO_SIGNAL':
      return {
        title: '신호 예측은 쉬어갈게요',
        description: reason === 'NO_POSITION'
          ? '내 위치와 횡단보도 좌표를 확인하고 있어요'
          : reason === 'NO_LENGTH'
            ? '횡단 길이가 등록되면 예측할 수 있어요'
            : reason === 'NO_SPEED'
              ? '걷는 속도를 재고 있어요'
              : '도착하면 진짜 신호등 보고 건너요',
      }
  }
}

/** 안내 카드의 제목·설명. 지연된 정보로 판정했으면 여유 시간을 더 뒀다고 알린다. */
export function guideCopy(decision: GuideDecision, dataStatus: DataStatus): GuideCopy {
  const copy = baseCopy(decision)
  if (dataStatus === 'delayed' && decision.strategy !== 'NO_SIGNAL') {
    return { ...copy, description: `${copy.description} · 늦게 온 정보라 ${DELAY_MARGIN_SEC}초 더 여유 뒀어요` }
  }
  return copy
}
