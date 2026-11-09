import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import CrosswalkHeader from '../components/CrosswalkHeader'
import CrosswalkLoading from '../components/CrosswalkLoading'
import DataStatusBanner from '../components/DataStatusBanner'
import DemoControlPanel from '../components/DemoControlPanel'
import MobileFrame from '../components/MobileFrame'
import SafetyNote from '../components/SafetyNote'
import SignalApple from '../components/SignalApple'
import StatBox from '../components/StatBox'
import StrategyCard from '../components/StrategyCard'
import StrategyIcon from '../components/StrategyIcon'
import WalkProgress from '../components/WalkProgress'
import { nearbyCrosswalks } from '../data/crosswalks'
import {
  defaultStrategyByCrosswalk,
  guideScenarios,
  statusScenarios,
  strategyBySignal,
  type GuideScenario,
} from '../data/mockGuides'
import type { DataStatus, SignalState } from '../types/signal'
import { STRATEGY_TYPES, type StrategyType } from '../types/strategy'

// TODO: 신호 API 연동되면 실제 요청 시간으로 대체
const MOCK_LOADING_MS = 800

type LoadStatus = 'loading' | DataStatus

const PREVIEW_STATUSES: LoadStatus[] = ['loading', 'delayed', 'offline']

function isStrategyType(value: string | null): value is StrategyType {
  return STRATEGY_TYPES.includes(value as StrategyType)
}

function isPreviewStatus(value: string | null): value is LoadStatus {
  return PREVIEW_STATUSES.includes(value as LoadStatus)
}

interface CrosswalkGuideProps {
  name: string
  scenario: GuideScenario
  onCountdownEnd: () => void
}

/** 한 가지 안내 상태 화면. 상태가 바뀌면 key로 새로 그려서 카운트다운을 초기화한다 */
function CrosswalkGuide({ name, scenario, onCountdownEnd }: CrosswalkGuideProps) {
  const [remainSec, setRemainSec] = useState(scenario.remainSec)
  const { dataStatus } = scenario

  useEffect(() => {
    if (remainSec === undefined) return
    const timer = setTimeout(() => {
      if (remainSec > 0) setRemainSec(remainSec - 1)
      else onCountdownEnd()
    }, 1000)
    return () => clearTimeout(timer)
  }, [remainSec, onCountdownEnd])

  return (
    <div className="flex flex-1 flex-col px-[13px] pb-4 pt-[49px]">
      <CrosswalkHeader name={name} />

      <div className="mt-[21px]">
        <SignalApple signal={scenario.signal} remainSec={remainSec} showMessage={dataStatus === 'ok'} />
      </div>
      {dataStatus !== 'ok' && (
        <div className="mx-[11px] mt-2.5">
          <DataStatusBanner status={dataStatus} ageSec={scenario.ageSec} />
        </div>
      )}

      <div className={dataStatus === 'ok' ? 'mt-[35px]' : 'mt-[29px]'}>
        <WalkProgress distanceM={scenario.distanceM} signal={scenario.signal} arrived={scenario.strategy === 'CROSS_NOW'} />
      </div>

      <div className="mt-[26px]">
        <StatBox stats={scenario.stats} />
      </div>

      <div className="mr-1.5 mt-[18px]">
        <StrategyCard
          title={scenario.title}
          description={scenario.description}
          icon={<StrategyIcon strategy={scenario.strategy} />}
          inverted={scenario.strategy === 'CROSS_NOW'}
        />
      </div>

      <div className="mt-auto pt-[13px]">
        <SafetyNote ageSec={scenario.ageSec} />
      </div>
    </div>
  )
}

/**
 * A3 · B1~B5 · C2~C5 걷기 안내.
 * 목업 미리보기: ?state=GO_FASTER (안내 상태), ?status=loading|delayed|offline (데이터 상태), ?demo=1 (데모 패널)
 */
function CrosswalkPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const stateParam = searchParams.get('state')
  const statusParam = searchParams.get('status')
  const isDemo = searchParams.get('demo') === '1'

  const crosswalk = nearbyCrosswalks.find((item) => item.id === id)
  const name = crosswalk?.name ?? '이름 없는'
  const initialStrategy = isStrategyType(stateParam) ? stateParam : (defaultStrategyByCrosswalk[id] ?? 'NO_SIGNAL')

  const [strategy, setStrategy] = useState<StrategyType>(initialStrategy)
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(isPreviewStatus(statusParam) ? statusParam : 'loading')
  const [runId, setRunId] = useState(0)

  // 목업 로딩: 잠깐 C2를 보여준 뒤 안내 화면으로 (?status=loading이면 계속 로딩)
  useEffect(() => {
    if (loadStatus !== 'loading' || statusParam === 'loading') return
    const timer = setTimeout(() => setLoadStatus('ok'), MOCK_LOADING_MS)
    return () => clearTimeout(timer)
  }, [loadStatus, statusParam])

  const scenario = loadStatus === 'delayed' || loadStatus === 'offline' ? statusScenarios[loadStatus] : guideScenarios[strategy]

  // 목업 흐름: SLOW_DOWN → (빨간불 끝) → CROSS_NOW → (건너기 끝) → 결과 화면
  const handleCountdownEnd = () => {
    if (scenario.dataStatus !== 'ok') return
    if (scenario.next) setStrategy(scenario.next)
    else if (strategy === 'CROSS_NOW') navigate('/result')
  }

  const handleForceSignal = (signal: SignalState) => {
    setLoadStatus('ok')
    setStrategy(strategyBySignal[signal])
  }

  const handleRestart = () => {
    setLoadStatus('ok')
    setStrategy(initialStrategy)
    setRunId((prev) => prev + 1)
  }
    // 존재하지 않는 횡단보도는 안내 화면으로 처리한다.
  if (!crosswalk) {
    return (
      <MobileFrame>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <p className="text-xl">횡단보도를 찾을 수 없어요</p>
          <button
            type="button"
            onClick={() => navigate('/main')}
            className="rounded-lg border-2 border-ink px-4 py-2"
          >
            목록으로 돌아가기
          </button>
        </div>
      </MobileFrame>
    )
  }

  // 현장 확인 전에는 목업을 포함한 횡단 예측 안내를 표시하지 않는다.
  if (!crosswalk.verified) {
    return (
      <MobileFrame>
        <div className="flex flex-1 flex-col px-[13px] pb-4 pt-[49px]">
          <CrosswalkHeader name={crosswalk.name} />

          <div className="mt-[21px]">
            <SignalApple signal="UNKNOWN" showMessage={false} />
          </div>

          <h1 className="mt-8 text-center text-xl">
            현장 확인 전인 횡단보도예요
          </h1>

          <p className="mt-3 text-center text-sm leading-6 text-sub">
            실시간 신호와 횡단 예측을 제공하지 않아요.
            <br />
            현장의 신호등을 직접 확인해 주세요.
          </p>

          <button
            type="button"
            onClick={() => navigate('/main')}
            className="mx-auto mt-6 rounded-lg border-2 border-ink px-4 py-2"
          >
            목록으로 돌아가기
          </button>
        </div>
      </MobileFrame>
    )
  }
  
  return (
    <MobileFrame>
      {loadStatus === 'loading' ? (
        <CrosswalkLoading name={name} />
      ) : (
        <CrosswalkGuide
          key={`${strategy}-${loadStatus}-${runId}`}
          name={name}
          scenario={scenario}
          onCountdownEnd={handleCountdownEnd}
        />
      )}
      {isDemo && <DemoControlPanel signal={scenario.signal} onForceSignal={handleForceSignal} onRestart={handleRestart} />}
    </MobileFrame>
  )
}

export default CrosswalkPage
