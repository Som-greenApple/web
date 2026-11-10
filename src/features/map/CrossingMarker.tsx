import type { NearbyCrosswalk } from '../../types/crosswalk'
import CrosswalkMarker from './CrosswalkMarker'

/** 좌표 중심에 횡단보도 줄무늬를 놓고 그 위에 선택 가능한 신호 사과를 올린다. */
export default function CrossingMarker({ crosswalk, onSelect }: { crosswalk: NearbyCrosswalk; onSelect: (id: string) => void }) {
  return (
    <div className="relative h-6 w-7">
      <svg viewBox="0 0 28 24" className="h-full w-full" aria-hidden style={{ transform: `rotate(${crosswalk.mapRotation ?? 0}deg)` }}>
        <rect x="0" y="0" width="28" height="24" rx="2" fill="white" />
        {[2, 7, 12, 17].map(y => <rect key={y} x="2" y={y} width="24" height="3" fill="#111" />)}
      </svg>
      <div className="absolute bottom-full left-1/2 mb-0.5 -translate-x-1/2">
        <CrosswalkMarker crosswalk={crosswalk} onSelect={onSelect} showName={false} />
      </div>
    </div>
  )
}
