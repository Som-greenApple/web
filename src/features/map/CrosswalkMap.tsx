import mapCampus from '../../assets/figma/map-campus.svg'
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
  // TODO(카카오 키 · 좌표): 둘 다 준비되면 아래 일러스트 대체 분기는 지워도 된다
  if (!KAKAO_JS_KEY || mappableCrosswalks.length === 0) {
    return <img src={mapCampus} alt="주변 횡단보도 지도" className="-ml-[2.5px] h-[370px] w-[319px] max-w-none" />
  }

  return <KakaoMap appKey={KAKAO_JS_KEY} crosswalks={mappableCrosswalks} onSelectCrosswalk={onSelectCrosswalk} />
}

export default CrosswalkMap
