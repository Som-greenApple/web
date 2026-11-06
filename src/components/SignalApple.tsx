import appleFlashLg from '../assets/figma/apple-flash-lg.svg'
import appleGreenLg from '../assets/figma/apple-green-lg.svg'
import appleNoneLg from '../assets/figma/apple-none-lg.svg'
import appleRedLg from '../assets/figma/apple-red-lg.svg'
import { APPLE_LABEL, type SignalState } from '../types/signal'

interface SignalAppleProps {
  signal: SignalState
  /** 남은 초. 모르는사과는 숫자를 보여주지 않는다 */
  remainSec?: number
  /** 사과 아래 한 줄 설명 (데이터 상태 배너를 띄울 땐 숨긴다) */
  showMessage?: boolean
}

function signalMessage(signal: SignalState, remainSec?: number) {
  switch (signal) {
    case 'GREEN':
      return `초록사과! ${remainSec}초 남았어요`
    case 'RED':
      return `빨간사과! ${remainSec}초 뒤에 초록으로 익어요`
    case 'FLASHING':
      return '깜빡사과! 이번 신호는 보내줘요'
    case 'UNKNOWN':
      return '실시간 신호 정보가 없는 곳이에요'
  }
}

/** 큰 사과 + 남은 초 + 한 줄 설명 */
function SignalApple({ signal, remainSec, showMessage = true }: SignalAppleProps) {
  const showCount = signal !== 'UNKNOWN' && remainSec !== undefined

  return (
    <div>
      {/* 사과 몸통 기준 189 x 197 박스. 깜빡사과 그림은 베어 문 자국과 반짝임 때문에 더 크다 */}
      <div className="relative mx-auto h-[197px] w-[189px]">
        {signal === 'FLASHING' ? (
          <img src={appleFlashLg} alt={APPLE_LABEL.FLASHING} className="absolute left-[-34.4px] top-[-40.5px] h-[280px] w-[282px] max-w-none" />
        ) : (
          <img
            src={{ GREEN: appleGreenLg, RED: appleRedLg, UNKNOWN: appleNoneLg }[signal]}
            alt={APPLE_LABEL[signal]}
            className="absolute left-[-3.2px] top-[-2.7px] h-[203px] w-[195.6px] max-w-none"
          />
        )}
        {showCount && (
          <>
            <p className="absolute inset-x-0 top-[61px] text-center text-[72px] leading-[99px] text-white">{remainSec}</p>
            <p className="absolute inset-x-0 top-[143px] text-center text-xl leading-[27px] text-white">초</p>
          </>
        )}
      </div>
      {showMessage && <p className="mt-[22px] text-center text-[19px] leading-[26px]">{signalMessage(signal, remainSec)}</p>}
    </div>
  )
}

export default SignalApple
