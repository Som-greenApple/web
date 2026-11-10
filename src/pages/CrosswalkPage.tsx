import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import RealWalkRecorder from '../features/walk/RealWalkRecorder'
import CrosswalkHeader from '../components/CrosswalkHeader'
import CrosswalkLoading from '../components/CrosswalkLoading'
import DataStatusBanner from '../components/DataStatusBanner'
import MobileFrame from '../components/MobileFrame'
import LiveCrosswalkGuide from '../components/LiveCrosswalkGuide'
import SafetyNote from '../components/SafetyNote'
import SignalApple from '../components/SignalApple'
import StatBox from '../components/StatBox'
import StrategyCard from '../components/StrategyCard'
import StrategyIcon from '../components/StrategyIcon'
import WalkProgress from '../components/WalkProgress'
import { loadCrosswalkById } from '../features/map/nearbyCrosswalks'
import PredictedGuide from '../features/strategy/PredictedGuide'
import { useMockSignal } from '../features/signal/useMockSignal'
import type { NearbyCrosswalk } from '../types/crosswalk'
import { nearbyCrosswalks } from '../data/crosswalks'
import { useAppContext } from '../context/useAppContext'
import {
  defaultStrategyByCrosswalk,
  guideScenarios,
  statusScenarios,
  type GuideScenario,
} from '../data/mockGuides'
import type { DataStatus } from '../types/signal'
import DemoCrosswalkPage from '../features/demo/DemoCrosswalkPage'
import { STRATEGY_TYPES, type StrategyType } from '../types/strategy'

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

/** 피그마 미리보기용 안내 화면. 상태가 바뀌면 key로 새로 그려서 카운트다운을 초기화한다 */
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

/** 피그마 화면 미리보기: ?state=GO_FASTER (안내 상태), ?status=loading|delayed|offline (데이터 상태) */
function GuidePreview({ crosswalk }: { crosswalk: NearbyCrosswalk }) {
  const [searchParams] = useSearchParams()
  const stateParam = searchParams.get('state')
  const statusParam = searchParams.get('status')
  const loadStatus: LoadStatus = isPreviewStatus(statusParam) ? statusParam : 'ok'
  const [strategy, setStrategy] = useState<StrategyType>(
    isStrategyType(stateParam) ? stateParam : (defaultStrategyByCrosswalk[crosswalk.id] ?? 'NO_SIGNAL')
  )
  const scenario = loadStatus === 'delayed' || loadStatus === 'offline' ? statusScenarios[loadStatus] : guideScenarios[strategy]

  // 미리보기의 타이머는 걷기 완료로 간주하지 않는다.
  const handleCountdownEnd = () => {
    if (scenario.dataStatus !== 'ok') return
    if (scenario.next) setStrategy(scenario.next)
  }

  return (
    <MobileFrame>
      {loadStatus === 'loading' ? (
        <CrosswalkLoading name={crosswalk.name} />
      ) : (
        <CrosswalkGuide
          key={`${strategy}-${loadStatus}`}
          name={crosswalk.name}
          scenario={scenario}
          onCountdownEnd={handleCountdownEnd}
        />
      )}
    </MobileFrame>
  )
}

/** mock 모드: 생성 신호 + 실제 GPS · 보행 속도로 예측한다. */
function MockCrosswalkGuide({ crosswalk }: { crosswalk: NearbyCrosswalk }) {
  const signal = useMockSignal()
  return (
    <PredictedGuide
      crosswalk={crosswalk}
      signal={signal}
      footer={<p role="status" className="mt-3 text-center text-xs text-sub">데모 신호 · 실제 신호가 아니에요</p>}
    />
  )
}

/** A3 · B1~B5 · C2~C5 걷기 안내 */
function LegacyCrosswalkPage({ crosswalk }: { crosswalk?: NearbyCrosswalk }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isPreview = isStrategyType(searchParams.get('state')) || isPreviewStatus(searchParams.get('status'))
  const { setSelectedCrosswalkId, dataMode } = useAppContext()

  const selectedId = crosswalk?.id ?? null

  useEffect(() => {
    setSelectedCrosswalkId(selectedId)
  }, [selectedId, setSelectedCrosswalkId])

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

  if (isPreview) return <GuidePreview crosswalk={crosswalk} />

  if (dataMode === 'replay') {
    return (
      <MobileFrame>
        <div className="flex flex-1 flex-col gap-5 px-[13px] pt-[49px]">
          <CrosswalkHeader name={crosswalk.name} />
          <SignalApple signal="UNKNOWN" showMessage={false} />
          <p role="status" className="text-center">기록 재생은 준비 중이에요.</p>
          <button type="button" onClick={() => navigate('/main')}>목록으로 돌아가기</button>
        </div>
      </MobileFrame>
    )
  }

  return (
    <MobileFrame>
      {dataMode === 'live'
        ? <LiveCrosswalkGuide key={crosswalk.id} crosswalk={crosswalk} />
        : <MockCrosswalkGuide crosswalk={crosswalk} />}
      <RealWalkRecorder crosswalk={crosswalk} />
    </MobileFrame>
  )
}

export default function CrosswalkPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const { discoveredCrosswalks } = useAppContext()
  const [remote, setRemote] = useState<NearbyCrosswalk | null>(null)
  const [failedId, setFailedId] = useState<string | null>(null)
  const [detailAttempt, setDetailAttempt] = useState(0)
  const known = nearbyCrosswalks.find(item => item.id === id) ?? discoveredCrosswalks.find(item => item.id === id)
  const crosswalk = known ?? (remote?.id === id ? remote : undefined)
  useEffect(() => {
    if (crosswalk || !/^osm-(node|way)-\d+$/.test(id)) return
    const controller = new AbortController()
    loadCrosswalkById(id, controller.signal).then(item => {
      if (controller.signal.aborted) return
      if (item) setRemote(item)
      else setFailedId(id)
    }).catch(() => { if (!controller.signal.aborted) setFailedId(id) })
    return () => controller.abort()
  }, [id, crosswalk, detailAttempt])
  if (!crosswalk && failedId === id) {
    return <MobileFrame><div className="m-auto flex flex-col items-center gap-4 p-6 text-center"><p role="alert">횡단보도 정보를 불러오지 못했어요</p><button type="button" className="rounded-full border-2 border-ink px-4 py-2" onClick={() => { setFailedId(null); setDetailAttempt(value => value + 1) }}>다시 시도</button></div></MobileFrame>
  }
  if (!crosswalk && /^osm-(node|way)-\d+$/.test(id) && failedId !== id) {
    return <MobileFrame><p role="status" className="m-auto p-6 text-center">횡단보도 정보를 불러오고 있어요</p></MobileFrame>
  }
  if (params.get('demo') === '1' && crosswalk) return <DemoCrosswalkPage crosswalk={crosswalk} />
  return <LegacyCrosswalkPage key={id} crosswalk={crosswalk} />
}
