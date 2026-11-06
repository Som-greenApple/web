import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import AppleIcon from '../../components/AppleIcon'
import type { LatLngPosition, NearbyCrosswalk } from '../../data/mockCrosswalks'
import { loadKakaoMap } from './loadKakaoMap'

export type PositionedCrosswalk = NearbyCrosswalk & { position: LatLngPosition }

interface KakaoMapProps {
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
function KakaoMap({ appKey, crosswalks, onSelectCrosswalk }: KakaoMapProps) {
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
        // TODO(GPS): 내 위치가 생기면 지도 중심을 내 위치로 바꾸고 "나" 졸라맨 오버레이 추가
        const map = new sdk.maps.Map(containerRef.current, { center: toLatLng(crosswalks[0].position), level: 3 })
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
  }, [appKey, crosswalks])

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
      {overlayTargets.map(({ crosswalk, element }) =>
        createPortal(
          <button
            type="button"
            onClick={() => onSelectCrosswalk(crosswalk.id)}
            aria-label={`${crosswalk.name} 횡단보도 보기`}
            className="block p-1 transition-transform active:scale-90"
          >
            <AppleIcon signal={crosswalk.signal} />
          </button>,
          element,
          crosswalk.id,
        ),
      )}
    </>
  )
}

export default KakaoMap
