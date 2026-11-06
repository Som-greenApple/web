import appleFlashMd from '../assets/figma/apple-flash-md.svg'
import appleFlashSm from '../assets/figma/apple-flash-sm.svg'
import appleGreen from '../assets/figma/apple-green.svg'
import appleGreenMd from '../assets/figma/apple-green-md.svg'
import appleGreenSm from '../assets/figma/apple-green-sm.svg'
import appleNoneMd from '../assets/figma/apple-none-md.svg'
import appleNoneSm from '../assets/figma/apple-none-sm.svg'
import appleRedMd from '../assets/figma/apple-red-md.svg'
import appleRedSm from '../assets/figma/apple-red-sm.svg'
import { APPLE_LABEL, type SignalState } from '../types/signal'

const SMALL_SRC: Record<SignalState, string> = {
  GREEN: appleGreenSm,
  FLASHING: appleFlashSm,
  RED: appleRedSm,
  UNKNOWN: appleNoneSm,
}

interface AppleIconProps {
  signal: SignalState
  /** sm: 목록 아이콘(26px), md: 진행 그림 목표(37px), lg: 강조용(53px, 초록만) */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/** 신호 상태를 나타내는 사과 아이콘 */
function AppleIcon({ signal, size = 'sm', className = '' }: AppleIconProps) {
  const label = APPLE_LABEL[signal]

  if (size === 'md') {
    switch (signal) {
      case 'GREEN':
        return <img src={appleGreenMd} alt={label} className={`h-[39.6px] w-[38.1px] ${className}`} />
      case 'RED':
        return <img src={appleRedMd} alt={label} className={`h-[39.6px] w-[38.1px] ${className}`} />
      // 깜빡사과는 반짝임 선 때문에 박스가 더 크다
      case 'FLASHING':
        return <img src={appleFlashMd} alt={label} className={`h-[55px] w-14 ${className}`} />
      case 'UNKNOWN':
        return (
          <span role="img" aria-label={label} className={`relative block h-[39.6px] w-[38.2px] ${className}`}>
            <img src={appleNoneMd} alt="" className="h-full w-full" />
            <span className="absolute left-[15px] top-[13px] w-2 text-center text-base leading-[20.5px]">?</span>
          </span>
        )
    }
  }

  if (signal === 'FLASHING') {
    return <img src={appleFlashSm} alt={label} className={`h-[39px] w-10 ${className}`} />
  }
  if (size === 'lg' && signal === 'GREEN') {
    return <img src={appleGreen} alt={label} className={`h-[55px] w-[53px] ${className}`} />
  }
  return <img src={SMALL_SRC[signal]} alt={label} className={`h-[27.5px] w-[26.4px] ${className}`} />
}

export default AppleIcon
