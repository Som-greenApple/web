import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import CrosswalkMarker from './CrosswalkMarker'
import type { LatLngPosition, NearbyCrosswalk } from '../../types/crosswalk'
import { loadKakaoMap } from './loadKakaoMap'

export type PositionedCrosswalk = NearbyCrosswalk & { position: LatLngPosition }

interface KakaoMapProps {
  appKey: string
  /** 안정적인 배열 참조를 넘길 것. 빈 배열이면 캠퍼스 주변 지도를 표시한다. */
  crosswalks: PositionedCrosswalk[]
  onSelectCrosswalk: (id: string) => void
}

interface OverlayTarget {
  crosswalk: PositionedCrosswalk
  element: HTMLDivElement
}

/** 실제 지도 위에 횡단보도마다 신호 사과를 올리고, 사과를 누르면 onSelectCrosswalk를 부른다 */
function KakaoMap({ appKey, crosswalks, onSelectCrosswalk }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [overlayTargets, setOverlayTargets] = useState<OverlayTarget[]>([])
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const overlays: kakao.maps.CustomOverlay[] = []

    loadKakaoMap(appKey)
      .then((sdk) => {
        if (cancelled || !containerRef.current) return

        const toLatLng = ({ lat, lng }: LatLngPosition) => new sdk.maps.LatLng(lat, lng)
        // TODO(GPS): 내 위치가 생기면 지도 중심을 내 위치로 바꾸고 "나" 졸라맨 오버레이 추가
        const map = new sdk.maps.Map(containerRef.current, {
          center: toLatLng(crosswalks[0]?.position ?? { lat: 37.6063, lng: 127.0418 }),
          level: 3,
        })
        const bounds = new sdk.maps.LatLngBounds()

        // 사과는 React로 그리기 위해 빈 div를 오버레이에 넣고 portal로 채운다
        const targets = crosswalks.map((crosswalk) => {
          const element = document.createElement('div')
          const position = toLatLng(crosswalk.position)
          bounds.extend(position)
          overlays.push(new sdk.maps.CustomOverlay({ map, position, content: element, yAnchor: 1, clickable: true }))
          return { crosswalk, element }
        })
        if (crosswalks.length > 1) map.setBounds(bounds)

        setOverlayTargets(targets)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      overlays.forEach((overlay) => overlay.setMap(null))
      setOverlayTargets([])
    }
  }, [appKey, crosswalks, attempt])

  if (failed) {
    return (
      <div role="alert" className="flex h-[366px] w-[316px] flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-ink p-5 text-center text-sub">
        <p>지도를 불러오지 못했어요</p>
        <p className="text-sm">잠시 후 다시 시도해 주세요</p>
        <button type="button" className="rounded-full border-2 border-ink px-4 py-2" onClick={() => { setFailed(false); setAttempt((value) => value + 1) }}>다시 시도</button>
      </div>
    )
  }

  return (
    <>
      <div ref={containerRef} aria-label="주변 횡단보도 지도" className="h-[366px] w-[316px] overflow-hidden rounded-[14px] border-2 border-ink" />
      {overlayTargets.map(({ crosswalk, element }) =>
        createPortal(
          <CrosswalkMarker crosswalk={crosswalk} onSelect={onSelectCrosswalk} />,
          element,
          crosswalk.id,
        ),
      )}
    </>
  )
}

export default KakaoMap
