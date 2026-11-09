import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import walker from '../../assets/figma/walker.svg'
import AppleIcon from '../../components/AppleIcon'
import type { LatLngPosition, NearbyCrosswalk } from '../../types/crosswalk'
import { loadKakaoMap } from './loadKakaoMap'

export type PositionedCrosswalk = NearbyCrosswalk & { position: LatLngPosition }

interface KakaoMapProps {
  position: LatLngPosition
  isUserLocation: boolean
  appKey: string
  /** 한 개 이상, 렌더마다 새로 만들지 않은 배열을 넘길 것 (바뀌면 지도를 다시 그린다) */
  crosswalks: PositionedCrosswalk[]
  onSelectCrosswalk: (id: string) => void
}

interface OverlayTarget {
  crosswalk: PositionedCrosswalk
  element: HTMLDivElement
}

/** 실제 지도 위에 횡단보도마다 신호 사과를 올리고, 사과를 누르면 onSelectCrosswalk를 부른다 */
function KakaoMap({ appKey, crosswalks, position, isUserLocation, onSelectCrosswalk }: KakaoMapProps) {
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const locationOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null)
  const latestPosition = useRef(position)
  useEffect(() => { latestPosition.current = position }, [position])
  const [locationElement, setLocationElement] = useState<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [overlayTargets, setOverlayTargets] = useState<OverlayTarget[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const overlays: kakao.maps.CustomOverlay[] = []

    loadKakaoMap(appKey)
      .then((sdk) => {
        if (cancelled || !containerRef.current) return

        const toLatLng = ({ lat, lng }: LatLngPosition) => new sdk.maps.LatLng(lat, lng)
        const center = toLatLng(latestPosition.current)
        const map = new sdk.maps.Map(containerRef.current, { center, level: 3 })
        mapRef.current = map
        const locationElement = document.createElement('div')
        locationOverlayRef.current = new sdk.maps.CustomOverlay({ map, position: center, content: locationElement, yAnchor: 1 })
        setLocationElement(locationElement)

        // 사과는 React로 그리기 위해 빈 div를 오버레이에 넣고 portal로 채운다
        const targets = crosswalks.map((crosswalk) => {
          const element = document.createElement('div')
          const position = toLatLng(crosswalk.position)
          overlays.push(new sdk.maps.CustomOverlay({ map, position, content: element, yAnchor: 1, clickable: true }))
          return { crosswalk, element }
        })

        setOverlayTargets(targets)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      overlays.forEach((overlay) => overlay.setMap(null))
      locationOverlayRef.current?.setMap(null)
      locationOverlayRef.current = null
      mapRef.current = null
      setLocationElement(null)
      setOverlayTargets([])
    }
  }, [appKey, crosswalks])

  useEffect(() => {
    const sdk = window.kakao
    if (!sdk || !mapRef.current) return
    const center = new sdk.maps.LatLng(position.lat, position.lng)
    mapRef.current.setCenter(center)
    locationOverlayRef.current?.setPosition(center)
  }, [position, locationElement])

  if (failed) {
    return (
      <div className="flex h-[366px] w-[316px] items-center justify-center rounded-[14px] border-2 border-ink text-lg text-sub">
        지도를 불러오지 못했어요
      </div>
    )
  }

  return (
    <>
      <div ref={containerRef} className="h-[366px] w-[316px] overflow-hidden rounded-[14px] border-2 border-ink" />
      {locationElement && createPortal(
        <div className="flex flex-col items-center rounded-lg bg-white/90 px-2 py-1" aria-label={isUserLocation ? '내 위치' : '정문 기준 위치'}>
          {isUserLocation && <img src={walker} alt="" className="h-12 w-7" />}
          <span className="text-sm text-ink">{isUserLocation ? '나' : '정문 기준'}</span>
        </div>, locationElement,
      )}
      {overlayTargets.map(({ crosswalk, element }) =>
        createPortal(
          <button
            type="button"
            onClick={() => onSelectCrosswalk(crosswalk.id)}
            aria-label={`${crosswalk.name} 횡단보도 보기`}
            className="block p-1 transition-transform active:scale-90"
          >
            <AppleIcon signal={crosswalk.verified ? crosswalk.signal : 'UNKNOWN'} />
          </button>,
          element,
          crosswalk.id,
        ),
      )}
    </>
  )
}

export default KakaoMap
