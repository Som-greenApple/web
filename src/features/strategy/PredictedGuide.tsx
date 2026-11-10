import { useEffect, type ReactNode } from 'react'
import CrosswalkHeader from '../../components/CrosswalkHeader'
import DataStatusBanner from '../../components/DataStatusBanner'
import SafetyNote from '../../components/SafetyNote'
import SignalApple from '../../components/SignalApple'
import StatBox from '../../components/StatBox'
import StrategyCard from '../../components/StrategyCard'
import StrategyIcon from '../../components/StrategyIcon'
import WalkProgress from '../../components/WalkProgress'
import { useLocation } from '../../context/location'
import type { Crosswalk } from '../../types/crosswalk'
import type { DataStatus, SignalState } from '../../types/signal'
import { metersBetween } from '../walk/record'
import { guideCopy } from './guideCopy'
import { ARRIVED_M, decideGuide } from './predict'
import { speedForPrediction } from './speed'
import { useWalkingSpeed } from './useWalkingSpeed'

export interface GuideSignal {
  signal: SignalState
  remainSec?: number
  ageSec: number | null
  dataStatus: DataStatus
}

function formatDuration(seconds: number): string {
  const total = Math.ceil(seconds)
  return total < 60 ? `${total}초` : `${Math.floor(total / 60)}분 ${total % 60}초`
}

/** 실제 GPS 위치 · 측정 보행 속도 · 주어진 신호로 걷기 안내를 판정해서 보여준다. */
export default function PredictedGuide({ crosswalk, signal, footer }: { crosswalk: Crosswalk; signal: GuideSignal; footer?: ReactNode }) {
  const { position, status, startTracking } = useLocation()
  useEffect(() => {
    if (status === 'idle') startTracking()
  }, [status, startTracking])

  const measured = useWalkingSpeed()
  const { speed, assumed } = speedForPrediction(measured)
  const distance = status === 'tracking' && crosswalk.position ? metersBetween(position, crosswalk.position) : null
  const decision = decideGuide({
    signal: signal.signal,
    remainSec: signal.remainSec,
    dataStatus: signal.dataStatus,
    distanceM: distance,
    lengthM: crosswalk.lengthM,
    speed,
  })
  const copy = guideCopy(decision, signal.dataStatus)
  const arrived = distance !== null && distance <= ARRIVED_M

  const stats = arrived
    ? [
        { label: '남은 거리', value: `${Math.ceil(distance)}m` },
        { label: '건널 길이', value: crosswalk.lengthM === null ? '미확인' : `${Math.ceil(crosswalk.lengthM)}m` },
        { label: '필요 시간', value: decision.crossSec === null ? '미확인' : formatDuration(decision.crossSec + decision.marginSec) },
      ]
    : [
        { label: '거리', value: distance === null ? '미확인' : `${Math.ceil(distance)}m` },
        { label: assumed ? '기본 속도' : '내 속도', value: `${speed.toFixed(1)}m/s` },
        { label: '도착까지', value: distance === null ? '미확인' : formatDuration(distance / speed) },
      ]

  return (
    <div className="flex flex-1 flex-col px-[13px] pb-4 pt-[49px]">
      <CrosswalkHeader name={crosswalk.name} />

      <div className="mt-[21px]">
        <SignalApple signal={signal.signal} remainSec={signal.remainSec} showMessage={signal.dataStatus === 'ok'} />
      </div>
      {signal.dataStatus !== 'ok' && (
        <div className="mx-[11px] mt-2.5">
          <DataStatusBanner status={signal.dataStatus} ageSec={signal.ageSec} />
        </div>
      )}

      <div className={signal.dataStatus === 'ok' ? 'mt-[35px]' : 'mt-[29px]'}>
        {distance !== null
          ? <WalkProgress distanceM={Math.ceil(distance)} signal={signal.signal} arrived={arrived} />
          : <p role="status" className="py-6 text-center text-sm text-sub">현재 위치 또는 횡단보도 좌표를 확인해 주세요</p>}
      </div>

      <div className="mt-[26px]">
        <StatBox stats={stats} />
      </div>

      <div className="mr-1.5 mt-[18px]">
        <StrategyCard
          title={copy.title}
          description={copy.description}
          icon={<StrategyIcon strategy={decision.strategy} />}
          inverted={decision.strategy === 'CROSS_NOW'}
        />
      </div>

      {footer}

      <div className="mt-auto pt-[13px]">
        <SafetyNote ageSec={signal.ageSec} />
      </div>
    </div>
  )
}
