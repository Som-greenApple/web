
import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppleIcon from '../components/AppleIcon'
import LocationDeniedModal from '../components/LocationDeniedModal'
import MobileFrame from '../components/MobileFrame'
import { nearbyCrosswalks } from '../data/crosswalks'
import type { NearbyCrosswalk } from '../types/crosswalk'
import CrosswalkMap from '../features/map/CrosswalkMap'
import { useLocation } from '../context/location'
import { sortCrosswalksByDistance } from '../lib/distance'
import { useAppContext } from '../context/useAppContext'

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

  const {
    position,
    status,
    startTracking,
    selectDefaultLocation,
  } = useLocation()

  const {
    setSelectedCrosswalkId,
  } = useAppContext()

  const locationDenied =
    searchParams.get('location') === 'denied' ||
    ['denied', 'unavailable', 'timeout', 'unsupported'].includes(status)

  const sortedCrosswalks = useMemo(
    () => sortCrosswalksByDistance(nearbyCrosswalks, position),
    [position]
  )

  useEffect(() => {
    if (
      status === 'idle' &&
      searchParams.get('location') !== 'denied'
    ) {
      startTracking()
    }
  }, [status, searchParams, startTracking])

  const closeLocationModal = () => {
    setSearchParams(
      (params) => {
        params.delete('location')
        return params
      },
      { replace: true }
    )
  }

  const handleRetryLocation = () => {
    closeLocationModal()
    startTracking()
  }

  const handleUseDefault = () => {
    selectDefaultLocation()
    closeLocationModal()
  }

  const handleSelectCrosswalk = (id: string) => {
    setSelectedCrosswalkId(id)
    navigate(`/crosswalk/${id}`)
  }

  return (
    <MobileFrame>
      <div className="flex flex-1 flex-col px-6 pb-3 pt-[42px]">
        <header>
          <h1 className="text-[32px] leading-[44px]">
            GreenStep
          </h1>
          <p className="-mt-0.5 ml-[3px] text-sm leading-[19px] text-sub">
            오늘은 어떤 사과로 건널까?
          </p>
        </header>

        <div className="mt-3">
          <CrosswalkMap
            onSelectCrosswalk={handleSelectCrosswalk}
          />
        </div>

        <p
          className="mt-2 text-xs text-sub"
          role="status"
        >
          {status === 'tracking'
            ? '내 위치 기준 · 직선거리'
            : '동덕여대 정문 주변 기준 · 직선거리'}
        </p>

        <h2 className="ml-0.5 mt-[17px] text-[21px] leading-[29px]">
          가까운 횡단보도
        </h2>

        <ul className="mt-2">
          {sortedCrosswalks.map((crosswalk) => (
            <li
              key={crosswalk.id}
              className="border-ink [&+&]:border-t-2"
            >
              <button
                type="button"
                onClick={() =>
                  handleSelectCrosswalk(crosswalk.id)
                }
                className="flex w-full items-center py-[7px] text-left"
              >
                <AppleIcon
                  signal={
                    crosswalk.verified
                      ? crosswalk.signal
                      : 'UNKNOWN'
                  }
                  className="ml-[7px]"
                />

                <span className="ml-[18.6px] flex-1">
                  <span className="block text-xl leading-[27px]">
                    {crosswalk.name}
                  </span>
                  <span className="block text-[11px] leading-[15px] text-sub">
                    {signalSummary(crosswalk)}
                  </span>
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

      {locationDenied && (
        <LocationDeniedModal
          onRetry={handleRetryLocation}
          onUseDefault={handleUseDefault}
        />
      )}
    </MobileFrame>
  )
}

export default MainPage

