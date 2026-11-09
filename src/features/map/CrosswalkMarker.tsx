import AppleIcon from '../../components/AppleIcon'
import type { NearbyCrosswalk } from '../../types/crosswalk'

interface CrosswalkMarkerProps {
  crosswalk: NearbyCrosswalk
  onSelect: (id: string) => void
  showName?: boolean
}

/** 지도 오버레이의 터치 및 키보드로 선택 가능한 사과 마커. */
export default function CrosswalkMarker({ crosswalk, onSelect, showName = true }: CrosswalkMarkerProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(crosswalk.id)}
      aria-label={`${crosswalk.name} 횡단보도 보기`}
      className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-lg p-1 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-90"
    >
      <AppleIcon signal={crosswalk.verified ? crosswalk.signal : 'UNKNOWN'} size="md" />
      {showName && <span className="whitespace-nowrap rounded bg-white/95 px-2 py-0.5 text-xs text-ink">{crosswalk.name}</span>}
    </button>
  )
}
