import clockFace from '../assets/figma/clock-face.svg'
import clockHands from '../assets/figma/clock-hands.svg'
import iconCheck from '../assets/figma/icon-check.svg'
import snailBody from '../assets/figma/snail-body.svg'
import snailShell from '../assets/figma/snail-shell.svg'
import speedLines from '../assets/figma/speed-lines.svg'
import walkerSm from '../assets/figma/walker-sm.svg'
import type { StrategyType } from '../types/strategy'

/** StrategyCard 오른쪽 그림 */
function StrategyIcon({ strategy }: { strategy: StrategyType }) {
  switch (strategy) {
    case 'SLOW_DOWN':
      return (
        <span className="relative block h-6 w-[38px]">
          <img src={snailShell} alt="" className="absolute -top-px left-[3px] h-[26px] w-[26px] max-w-none" />
          <img src={snailBody} alt="" className="absolute left-[-1px] top-[3px] h-[22px] w-10 max-w-none" />
        </span>
      )
    case 'GO_NOW':
      return <img src={walkerSm} alt="" className="h-[41.25px] w-[15.95px] max-w-none" />
    case 'GO_FASTER':
      return (
        <span className="relative block h-[41.25px] w-[41px]">
          <img src={speedLines} alt="" className="absolute left-0 top-[12.5px] h-[22px] w-[18px] max-w-none" />
          <img src={walkerSm} alt="" className="absolute left-[25px] top-0 h-[41.25px] w-[15.95px] max-w-none" />
        </span>
      )
    case 'WAIT_NEXT':
      return (
        <span className="relative block h-[34px] w-[34px]">
          <img src={clockFace} alt="" className="absolute inset-0 h-[34px] w-[34px] max-w-none" />
          <img src={clockHands} alt="" className="absolute left-[15px] top-[5px] h-4 w-[10px] max-w-none" />
        </span>
      )
    case 'CROSS_NOW':
      return <img src={iconCheck} alt="" className="h-8 w-9 max-w-none" />
    case 'NO_SIGNAL':
      return <span className="block w-5 text-center text-[40px] leading-[55px]">?</span>
  }
}

export default StrategyIcon
