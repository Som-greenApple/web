import { useLocation } from '../../context/location'
import { KAKAO_JS_KEY } from '../../config/env'
import { nearbyCrosswalks } from '../../data/crosswalks'
import KakaoMap, { type PositionedCrosswalk } from './KakaoMap'

// 좌표가 있는 횡단보도만 지도에 찍는다
const mappableCrosswalks = nearbyCrosswalks.filter(
  (crosswalk): crosswalk is PositionedCrosswalk => crosswalk.position !== null,
)

interface CrosswalkMapProps {
  onSelectCrosswalk: (id: string) => void
}

/** 메인 화면 지도. 카카오 키와 좌표가 준비되면 실제 지도, 아니면 피그마 일러스트 */
function CrosswalkMap({ onSelectCrosswalk }: CrosswalkMapProps) {
  const { position, status } = useLocation()
  if (!KAKAO_JS_KEY) {
    return <div className="flex h-[366px] w-[316px] items-center justify-center rounded-[14px] border-2 border-ink p-6 text-center text-sub">지도 설정이 없어 지도를 표시할 수 없어요</div>
  }
  return <KakaoMap appKey={KAKAO_JS_KEY} crosswalks={mappableCrosswalks} position={position} isUserLocation={status === 'tracking'} onSelectCrosswalk={onSelectCrosswalk} />
}

export default CrosswalkMap
