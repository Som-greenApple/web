import CrosswalkHeader from './CrosswalkHeader'
import CrosswalkLoading from './CrosswalkLoading'
import SafetyNote from './SafetyNote'
import SignalApple from './SignalApple'
import type { Crosswalk } from '../types/crosswalk'
import { useCrosswalkSignals } from '../features/signal/useCrosswalkSignals'
import PredictedGuide from '../features/strategy/PredictedGuide'

/** 실시간 신호와 GPS 보행 속도로 걷기 안내를 예측한다. */
export default function LiveCrosswalkGuide({ crosswalk }: { crosswalk: Crosswalk }) {
  const { getState, refresh } = useCrosswalkSignals([crosswalk], true)
  const state = getState(crosswalk)
  if (state.loading) return <CrosswalkLoading name={crosswalk.name} />

  if (!state.supported) {
    return (
      <div className="flex flex-1 flex-col gap-5 px-[13px] pb-4 pt-[49px]">
        <CrosswalkHeader name={crosswalk.name} />
        <SignalApple signal="UNKNOWN" showMessage={false} />
        <p role="status" className="text-center text-base leading-6">
          이 횡단보도의 신호 정보는 아직 연결되지 않았어요.
        </p>
        <div className="mt-auto"><SafetyNote ageSec={null} /></div>
      </div>
    )
  }

  return (
    <PredictedGuide
      crosswalk={crosswalk}
      signal={state}
      footer={state.error || state.signal === 'UNKNOWN'
        ? (
            <button type="button" onClick={refresh} className="mx-auto mt-4 rounded-full border-2 border-ink px-4 py-2 text-sm">
              신호 정보 다시 가져오기
            </button>
          )
        : null}
    />
  )
}
