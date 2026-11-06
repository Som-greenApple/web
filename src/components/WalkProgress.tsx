import crosswalkTrackArrived from '../assets/figma/crosswalk-track-arrived.svg'
import crosswalkTrack from '../assets/figma/crosswalk-track.svg'
import walker from '../assets/figma/walker.svg'
import type { SignalState } from '../types/signal'
import AppleIcon from './AppleIcon'

interface WalkProgressProps {
  distanceM: number
  signal: SignalState
  /** 횡단보도 앞에 도착함 (거리 화살표 없이 졸라맨이 횡단보도 앞에 선다) */
  arrived?: boolean
}

/** 나 → 횡단보도까지 남은 거리를 보여주는 진행 그림 */
function WalkProgress({ distanceM, signal, arrived = false }: WalkProgressProps) {
  return (
    <div className="relative mx-auto h-[74px] w-[312px]">
      <img
        src={walker}
        alt="나"
        className={`absolute top-[-1.5px] h-[75px] w-[29px] ${arrived ? 'left-[186.5px]' : 'left-[31.5px]'}`}
      />
      {!arrived && <span className="absolute left-[128.5px] top-[28px] text-lg leading-[25px]">{distanceM}m</span>}
      <AppleIcon
        signal={signal}
        size="md"
        className={`absolute ${signal === 'FLASHING' ? 'left-[243px] top-[-3px]' : 'left-[247px] top-[6px]'}`}
      />
      {arrived ? (
        <img src={crosswalkTrackArrived} alt="" className="absolute left-[1.5px] top-[57px] h-[18px] w-[315px] max-w-none" />
      ) : (
        <img src={crosswalkTrack} alt="" className="absolute left-[-1.5px] top-[50px] h-[25.5px] w-[315px] max-w-none" />
      )}
    </div>
  )
}

export default WalkProgress
