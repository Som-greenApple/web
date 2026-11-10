import { useEffect, useState } from 'react'
import { signalAt } from '../demo/engine'
import type { GuideSignal } from '../strategy/PredictedGuide'

/** mock 모드용 생성 신호(빨강 23초 → 초록 50초 → 점멸 6초). 실제 신호가 아니다. */
export function useMockSignal(): GuideSignal {
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(startedAt)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return { ...signalAt((now - startedAt) / 1000), ageSec: 0, dataStatus: 'ok' }
}
