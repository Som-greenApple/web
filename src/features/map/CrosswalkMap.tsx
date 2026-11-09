import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Map, Marker, NavigationControl, AttributionControl, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import walker from '../../assets/figma/walker.svg'
import { MAIN_GATE_POSITION as DEFAULT_POSITION, useLocation } from '../../context/location'
import { nearbyCrosswalks } from '../../data/crosswalks'
import type { NearbyCrosswalk } from '../../types/crosswalk'
import CrosswalkMarker from './CrosswalkMarker'
import { createSketchStyle } from './sketchStyle'

setWorkerUrl(workerUrl)

interface CrosswalkMapProps {
  onSelectCrosswalk: (id: string) => void
}
interface MarkerTarget { crosswalk: NearbyCrosswalk; element: HTMLDivElement }

/** 지역 제한 없이 실제 도로만 흑백 블록 스타일로 그린다. */
function CrosswalkMap({ onSelectCrosswalk }: CrosswalkMapProps) {
  const { position, status, startTracking } = useLocation()
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const userMarker = useRef<Marker | null>(null)
  const follow = useRef(true)
  const latestPosition = useRef(position)
  useEffect(() => { latestPosition.current = position }, [position])
  const [targets, setTargets] = useState<MarkerTarget[]>([])
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!container.current) return
    let map: Map
    let cancelled = false
    const markers: Marker[] = []
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const center = latestPosition.current ?? DEFAULT_POSITION
      map = new Map({
        container: container.current,
        style: createSketchStyle(),
        center: [center.lng, center.lat],
        zoom: 16.5,
        minZoom: 3,
        maxZoom: 20,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        canvasContextAttributes: { antialias: true },
      })
      mapRef.current = map
      map.touchZoomRotate.disableRotation()
      map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
      map.addControl(new AttributionControl({ compact: true }), 'bottom-left')
      map.on('dragstart', () => { follow.current = false })
      map.on('error', () => {
        if (!cancelled) setMapStatus('error')
      })
      map.on('idle', () => {
        if (!cancelled && map.areTilesLoaded()) {
          clearTimeout(timer)
          setMapStatus('ready')
        }
      })
      timer = setTimeout(() => { if (!cancelled) setMapStatus('error') }, 25_000)
      map.on('load', () => {
        if (cancelled) return
        const nextTargets: MarkerTarget[] = []
        for (const crosswalk of nearbyCrosswalks) {
          if (!crosswalk.position) continue
          const element = document.createElement('div')
          markers.push(new Marker({ element, anchor: 'center' }).setLngLat([crosswalk.position.lng, crosswalk.position.lat]).addTo(map))
          nextTargets.push({ crosswalk, element })
        }
        setTargets(nextTargets)
      })
      const observer = new ResizeObserver(() => map.resize())
      observer.observe(container.current)
      return () => {
        cancelled = true
        clearTimeout(timer)
        observer.disconnect()
        markers.forEach((marker) => marker.remove())
        userMarker.current?.remove()
        userMarker.current = null
        mapRef.current = null
        map.remove()
      }
    } catch {
      // WebGL 미지원 등 동기 초기화 실패도 사용자에게 표시한다.
      queueMicrotask(() => { if (!cancelled) setMapStatus('error') })
      return () => {
        cancelled = true
        clearTimeout(timer)
        mapRef.current?.remove()
        mapRef.current = null
      }
    }
  }, [attempt])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!position || status !== 'tracking') {
      userMarker.current?.remove()
      userMarker.current = null
      if (status === 'default') map.jumpTo({ center: [DEFAULT_POSITION.lng, DEFAULT_POSITION.lat], zoom: 16.5 })
      return
    }
    if (!userMarker.current) {
      const element = document.createElement('div')
      element.className = 'sketch-user-marker'
      const image = document.createElement('img')
      image.src = walker
      image.alt = '내 위치'
      const label = document.createElement('span')
      label.textContent = '나'
      element.append(image, label)
      userMarker.current = new Marker({ element, anchor: 'center' }).setLngLat([position.lng, position.lat]).addTo(map)
    } else userMarker.current.setLngLat([position.lng, position.lat])
    if (follow.current) map.easeTo({ center: [position.lng, position.lat], duration: 600 })
  }, [position, status, attempt])

  const locate = () => {
    follow.current = true
    if (position && status === 'tracking') mapRef.current?.easeTo({ center: [position.lng, position.lat], zoom: 16.5, duration: 600 })
    else startTracking()
  }
  const locating = status === 'idle' || status === 'locating'
  return (
    <figure className="-ml-[2.5px] w-[319px]">
      <div className="sketch-map relative h-[370px] overflow-hidden rounded-[20px] border-[3px] border-ink bg-white">
        <div ref={container} className="h-full w-full" aria-label="내 위치 주변의 도로를 단순화한 지도" />
        {(locating || mapStatus === 'loading') && mapStatus !== 'error' && (
          <p role="status" className="pointer-events-none absolute left-3 right-12 top-3 rounded-lg bg-white/95 px-3 py-2 text-center text-sm">{locating ? '내 위치를 확인하고 있어요' : '주변 지도를 불러오고 있어요'}</p>
        )}
        {mapStatus === 'error' && (
          <div role="alert" className="absolute inset-x-3 top-3 rounded-xl border-2 border-ink bg-white p-3 text-center text-sm">
            <p>지도를 불러오지 못했어요</p>
            <button type="button" className="mt-2 rounded-full border border-ink px-3 py-1" onClick={() => { setMapStatus('loading'); setAttempt((value) => value + 1) }}>다시 시도</button>
          </div>
        )}
        <button type="button" onClick={locate} disabled={status === 'locating'} className="absolute bottom-8 right-2 rounded-full border-2 border-ink bg-white px-3 py-1 text-xs disabled:opacity-50">{status === 'locating' ? '위치 확인 중' : '내 위치'}</button>
        {targets.map(({ crosswalk, element }) => createPortal(<CrosswalkMarker crosswalk={crosswalk} onSelect={onSelectCrosswalk} showName={false} />, element, crosswalk.id))}
      </div>
      {status === 'default' && <figcaption className="mt-1 text-center text-xs text-sub">위치 권한 없이 동덕여대 주변을 보고 있어요</figcaption>}
    </figure>
  )
}

export default CrosswalkMap
