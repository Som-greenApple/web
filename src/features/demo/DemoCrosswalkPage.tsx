import { useNavigate } from 'react-router-dom'
import { saveWalkResult } from '../walk/record'
import RealWalkRecorder from '../walk/RealWalkRecorder'
import { useEffect, useRef, useState } from 'react'
import CrosswalkHeader from '../../components/CrosswalkHeader'
import CrosswalkLoading from '../../components/CrosswalkLoading'
import DemoControlPanel from '../../components/DemoControlPanel'
import MobileFrame from '../../components/MobileFrame'
import SafetyNote from '../../components/SafetyNote'
import SignalApple from '../../components/SignalApple'
import StatBox from '../../components/StatBox'
import StrategyCard from '../../components/StrategyCard'
import StrategyIcon from '../../components/StrategyIcon'
import WalkProgress from '../../components/WalkProgress'
import { useAppContext } from '../../context/useAppContext'
import { guideScenarios } from '../../data/mockGuides'
import type { Crosswalk } from '../../types/crosswalk'
import { useDemoSession } from './useDemoSession'

function DemoRun({ crosswalk, onRestart }: { crosswalk: Crosswalk; onRestart: () => void }) {
  const { dataMode, gpsMode, forcedSignal, setSelectedCrosswalkId } = useAppContext()
  const session = useDemoSession(crosswalk)
  const navigate = useNavigate()
  const navigated = useRef(false)
  useEffect(() => {
    if (!session.completedResult || navigated.current) return
    navigated.current = true
    saveWalkResult(session.completedResult)
    navigate('/result', { state: { walkResult: session.completedResult } })
  }, [session.completedResult, navigate])
  const { signal, distance, strategy, walkSpeed } = session
  const content = guideScenarios[strategy]
  useEffect(() => { setSelectedCrosswalkId(crosswalk.id) }, [crosswalk.id, setSelectedCrosswalkId])
  const description = strategy === 'NO_SIGNAL'
    ? '위치·속도·신호·횡단 길이가 준비되면 예측을 다시 계산해요'
    : strategy === 'SLOW_DOWN'
      ? '빨간 신호예요. 횡단보도 앞에서 다음 초록 신호를 기다려요'
      : content.description
  return (
    <MobileFrame>
      <div className="flex flex-1 flex-col px-[13px] pb-4 pt-[49px]">
        <CrosswalkHeader name={crosswalk.name} />
        <p role="status" className="mx-2 mt-3 rounded-lg border border-dashed border-ink px-3 py-2 text-xs text-sub">
          {dataMode === 'live' && forcedSignal === null ? 'live 연결' : `${forcedSignal !== null ? '강제 신호' : dataMode} 시뮬레이션 · 실제 신호가 아니에요`}
          {' · '}{gpsMode === 'virtual' ? '가상 걷기' : '실제 GPS'} · {session.elapsedSec}초
          {gpsMode === 'virtual' && !crosswalk.position && <span className="block">좌표 미등록 · 정문 주변의 가상 출발점과 목표(60m)를 사용해요</span>}
        </p>
        {session.loading ? <CrosswalkLoading name={crosswalk.name} /> : <>
          <div className="mt-4"><SignalApple signal={signal.signal} remainSec={signal.remainSec} showMessage={false} /></div>
          {session.error && <p role="alert" className="mx-2 mt-3 text-center text-sm text-sub">{session.error}</p>}
          {signal.dataStatus === 'delayed' && <p role="status" className="mt-2 text-center text-sm">{signal.ageSec}초 전 정보 · 예측을 중지했어요</p>}
          <div className="mt-6">
            {distance !== null ? <WalkProgress distanceM={Math.ceil(distance)} signal={signal.signal} arrived={session.phase === 'crossing' || distance <= 1} /> : <p className="py-8 text-center text-sub">현재 위치 또는 횡단보도 좌표를 확인해 주세요</p>}
          </div>
          <div className="mt-6"><StatBox stats={[
            { label: '남은 거리', value: distance === null ? '미확인' : `${Math.ceil(distance)}m` },
            { label: gpsMode === 'virtual' ? '가상 속도' : '내 속도', value: walkSpeed === null ? '측정 중' : `${walkSpeed.toFixed(1)}m/s` },
            { label: '도착까지', value: distance === null || walkSpeed === null || walkSpeed <= 0 ? '미확인' : `${Math.ceil(distance / walkSpeed)}초` },
          ]} /></div>
          <div className="mt-5"><StrategyCard title={session.phase === 'crossing' ? '횡단 중이에요' : content.title} description={session.phase === 'crossing' ? '가상 횡단을 마치면 걷기 기록을 보여드릴게요' : description} icon={<StrategyIcon strategy={strategy} />} inverted={strategy === 'CROSS_NOW'} /></div>
          <div className="mt-auto pt-4"><SafetyNote ageSec={signal.ageSec} /></div>
        </>}
      </div>
      {gpsMode === 'real' && <RealWalkRecorder crosswalk={crosswalk} />}
      <DemoControlPanel signal={signal.signal} onForceSignal={session.force} onRestart={onRestart} />
    </MobileFrame>
  )
}

export default function DemoCrosswalkPage({ crosswalk }: { crosswalk: Crosswalk }) {
  const { dataMode, gpsMode } = useAppContext()
  const [run, setRun] = useState(0)
  return <DemoRun key={`${crosswalk.id}:${dataMode}:${gpsMode}:${run}`} crosswalk={crosswalk} onRestart={() => setRun((value) => value + 1)} />
}
