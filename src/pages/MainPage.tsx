import { useNavigate, useSearchParams } from 'react-router-dom'
import AppleIcon from '../components/AppleIcon'
import LocationDeniedModal from '../components/LocationDeniedModal'
import MobileFrame from '../components/MobileFrame'
import { nearbyCrosswalks } from '../data/crosswalks'
import type { NearbyCrosswalk } from '../types/crosswalk'
import CrosswalkMap from '../features/map/CrosswalkMap'
import { requestCurrentPosition } from '../features/map/geolocation'

function signalSummary(crosswalk: NearbyCrosswalk) {
 if (!crosswalk.verified) {
   return '현장 확인 전 · 실시간 예측을 제공하지 않아요'
  }

   const { signal, remainSec } = crosswalk

  if (signal !== 'UNKNOWN' && remainSec === undefined) {
    return '실시간 신호 정보가 없어요'
  }
  switch (signal) {
    case 'GREEN':
      return `초록사과 ${remainSec}초 남음`
    case 'FLASHING':
      return `깜빡사과 ${remainSec}초 남음`
    case 'RED':
      return `빨간사과 ${remainSec}초 남음`
    case 'UNKNOWN':
      return '이 사과는 정보가 없어요'
  }
}

/** A2 지도 · 주변 사과 */
function MainPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const locationDenied = searchParams.get('location') === 'denied'

  const closeLocationModal = () => setSearchParams({}, { replace: true })

  // 웹에서는 설정 화면을 직접 열 수 없어서 권한 요청을 다시 띄운다
  // TODO(GPS): 브라우저에서 아예 차단된 경우 권한 허용 방법 안내 추가
  const handleRetryLocation = () => {
    requestCurrentPosition()
      .then(closeLocationModal)
      .catch(() => {})
  }

  return (
    <MobileFrame>
      <div className="flex flex-1 flex-col px-6 pb-3 pt-[42px]">
        <header>
          <h1 className="text-[32px] leading-[44px]">GreenStep</h1>
          <p className="-mt-0.5 ml-[3px] text-sm leading-[19px] text-sub">오늘은 어떤 사과로 건널까?</p>
        </header>

        <div className="mt-3">
          <CrosswalkMap onSelectCrosswalk={(id) => navigate(`/crosswalk/${id}`)} />
        </div>

        <h2 className="ml-0.5 mt-[17px] text-[21px] leading-[29px]">가까운 횡단보도</h2>
        <ul className="mt-2">
          {nearbyCrosswalks.map((crosswalk) => (
            <li key={crosswalk.id} className="border-ink [&+&]:border-t-2">
              <button
                type="button"
                onClick={() => navigate(`/crosswalk/${crosswalk.id}`)}
                className="flex w-full items-center py-[7px] text-left"
              >
                <AppleIcon 
                  signal={crosswalk.verified ? crosswalk.signal : 'UNKNOWN'}
                  className="ml-[7px]" 
                />
                <span className="ml-[18.6px] flex-1">
                  <span className="block text-xl leading-[27px]">{crosswalk.name}</span>
                  <span className="block text-[11px] leading-[15px] text-sub">{signalSummary(crosswalk)}</span>
                </span>
                <span className="text-xl leading-[27px]">
                  {crosswalk.distanceM === null
                    ? '거리 미확인'
                    : `${crosswalk.distanceM}m`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* TODO(좌표): 정문 기준 보기 선택 시 동덕여대 정문 좌표를 내 위치 대신 사용 */}
      {locationDenied && <LocationDeniedModal onRetry={handleRetryLocation} onUseDefault={closeLocationModal} />}
    </MobileFrame>
  )
}

export default MainPage
