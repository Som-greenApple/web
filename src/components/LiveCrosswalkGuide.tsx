import CrosswalkHeader from './CrosswalkHeader'
import CrosswalkLoading from './CrosswalkLoading'
import DataStatusBanner from './DataStatusBanner'
import SafetyNote from './SafetyNote'
import SignalApple from './SignalApple'
import type { Crosswalk } from '../types/crosswalk'
import { useCrosswalkSignals } from '../features/signal/useCrosswalkSignals'

/** 실제 신호를 표시하며, 횡단 가능 여부나 보행 속도는 예측하지 않는다. */
export default function LiveCrosswalkGuide({ crosswalk }: { crosswalk: Crosswalk }) {
  const { getState, refresh } = useCrosswalkSignals([crosswalk], true)
  const state = getState(crosswalk)
  if (state.loading) return <CrosswalkLoading name={crosswalk.name} />

  return (
    <div className="flex flex-1 flex-col gap-5 px-[13px] pb-4 pt-[49px]">
      <CrosswalkHeader name={crosswalk.name} />
      <SignalApple signal={state.signal} remainSec={state.remainSec} showMessage={false} />
      {state.supported && state.dataStatus !== 'ok' && (
        <DataStatusBanner status={state.dataStatus} ageSec={state.ageSec} />
      )}
      <p role="status" className="text-center text-base leading-6">
        {!state.supported
          ? '이 횡단보도의 신호 정보는 아직 연결되지 않았어요.'
          : state.error || state.signal === 'UNKNOWN'
            ? '유효한 신호 정보가 없어요. 현장의 신호등을 확인해 주세요.'
            : `현재 보행 신호 · 남은 시간 ${state.remainSec}초`}
      </p>
      {state.supported && (
        <button type="button" onClick={refresh} className="rounded-full border-2 border-ink px-4 py-3">
          신호 정보 다시 가져오기
        </button>
      )}
      <p className="text-center text-sm text-sub">횡단 가능 여부와 권장 보행 속도는 예측하지 않아요.</p>
      <div className="mt-auto"><SafetyNote ageSec={state.ageSec} /></div>
    </div>
  )
}
