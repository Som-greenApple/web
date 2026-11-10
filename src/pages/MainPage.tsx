import { lazy, Suspense, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppleIcon from '../components/AppleIcon'
import LocationDeniedModal from '../components/LocationDeniedModal'
import MobileFrame from '../components/MobileFrame'
import { mergeCrosswalks } from '../features/map/nearbyCrosswalks'
import { nearbyCrosswalks } from '../data/crosswalks'
import type { NearbyCrosswalk } from '../types/crosswalk'
import { useCrosswalkSignals } from '../features/signal/useCrosswalkSignals'

import { useLocation } from '../context/location'
import { sortCrosswalksByDistance } from '../lib/distance'
import { useAppContext } from '../context/useAppContext'

const CrosswalkMap = lazy(() => import('../features/map/CrosswalkMap'))

function signalSummary(crosswalk: NearbyCrosswalk) {
  if (crosswalk.signalPresence === 'no') {
    return '무신호 횡단보도'
  }

  if (crosswalk.signalPresence !== 'yes') {
    return '신호 유무 미확인'
  }

  if (!crosswalk.verified) {
    return '신호등 있음 · 실시간 정보 없음'
  }

  const { signal, remainSec } = crosswalk

  if (signal === 'UNKNOWN' || remainSec === undefined) {
    return '신호등 있음 · 실시간 정보 없음'
  }

  switch (signal) {
    case 'GREEN':
      return `초록사과 ${remainSec}초 남음`
    case 'FLASHING':
      return `깜빡사과 ${remainSec}초 남음`
    case 'RED':
      return `빨간사과 ${remainSec}초 남음`
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
    dataMode,
    setDataMode,
    discoveredCrosswalks,
  } = useAppContext()

  const locationDenied =
    searchParams.get('location') === 'denied' ||
    ['denied', 'unavailable', 'timeout', 'unsupported'].includes(status)

  const liveSignals = useCrosswalkSignals(nearbyCrosswalks, dataMode === 'live')
  const allCrosswalks = useMemo(() => mergeCrosswalks(nearbyCrosswalks, discoveredCrosswalks), [discoveredCrosswalks])

  const sortedCrosswalks = useMemo(
    () => sortCrosswalksByDistance(allCrosswalks, position),
    [allCrosswalks, position]
  )

  const mapCrosswalks = useMemo(() => sortedCrosswalks.slice(0, 5), [sortedCrosswalks])
  const listCrosswalks = useMemo(() => sortedCrosswalks.slice(0, 5), [sortedCrosswalks])

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
          <Suspense fallback={<div role="status" className="flex h-[370px] w-[319px] items-center justify-center rounded-[20px] border-[3px] border-ink">지도를 불러오고 있어요</div>}>
            <CrosswalkMap crosswalks={mapCrosswalks} onSelectCrosswalk={handleSelectCrosswalk} />
          </Suspense>
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

        <label className="mt-2 flex items-center justify-between text-sm">
          신호 데이터
          <select aria-label="신호 데이터 모드" value={dataMode} onChange={(event) => {
            const mode = event.target.value
            if (mode === 'mock' || mode === 'replay' || mode === 'live') setDataMode(mode)
          }} className="rounded border border-ink bg-white px-2 py-1">
            <option value="mock">데모</option>
            <option value="live">실시간</option>
            <option value="replay">기록 재생 · 준비 중</option>
          </select>
        </label>
        <ul className="mt-2">
          {listCrosswalks.map((crosswalk) => (
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
                    !crosswalk.verified || crosswalk.signalPresence !== 'yes'
                      ? 'UNKNOWN'
                      : dataMode === 'live'
                        ? liveSignals.getState(crosswalk).signal
                        : dataMode === 'mock' ? crosswalk.signal : 'UNKNOWN'
                  }
                  className="ml-[7px]"
                />

                <span className="ml-[18.6px] flex-1">
                  <span className="block text-xl leading-[27px]">
                    {crosswalk.name}
                  </span>
                  <span className="block text-[11px] leading-[15px] text-sub">
                    {!crosswalk.verified || crosswalk.signalPresence !== 'yes' ? signalSummary(crosswalk)
                      : dataMode === 'replay' ? '기록 재생은 준비 중이에요'
                      : dataMode !== 'live' ? signalSummary(crosswalk)
                      : !liveSignals.getState(crosswalk).supported ? '신호 정보 미연결'
                      : liveSignals.getState(crosswalk).loading ? '신호 정보를 불러오고 있어요'
                      : liveSignals.getState(crosswalk).dataStatus === 'offline' ? '최신 신호 정보를 확인할 수 없어요'
                      : liveSignals.getState(crosswalk).signal === 'UNKNOWN' ? '현재 신호 정보 없음'
                      : `${liveSignals.getState(crosswalk).dataStatus === 'delayed' ? '정보 지연 · ' : ''}${signalSummary({ ...crosswalk, signal: liveSignals.getState(crosswalk).signal, remainSec: liveSignals.getState(crosswalk).remainSec })}`}
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
