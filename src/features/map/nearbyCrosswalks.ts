import type { LatLngPosition, NearbyCrosswalk } from '../../types/crosswalk'

interface OsmElement {
  type: string
  id: number
  lat?: number
  lon?: number
  nodes?: number[]
  geometry?: { lat: number; lon: number }[]
  tags?: Record<string, string>
}
export function metersApart(a: LatLngPosition, b: LatLngPosition): number {
  const lat = (a.lat + b.lat) / 2 * Math.PI / 180
  return Math.hypot((a.lat - b.lat) * 111_195, (a.lng - b.lng) * 111_195 * Math.cos(lat))
}
function validPosition(lat: unknown, lng: unknown): boolean {
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}
function angle(a: LatLngPosition, b: LatLngPosition): number {
  return Math.atan2((b.lng - a.lng) * Math.cos(a.lat * Math.PI / 180), b.lat - a.lat) * 180 / Math.PI
}
/** OSM의 실제 crossing 태그만 사용한다. 신호색·제어기·현장 검증 여부는 추정하지 않는다. */
export function parseCrosswalks(value: unknown): NearbyCrosswalk[] {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { elements?: unknown }).elements)) throw new Error('횡단보도 응답을 읽을 수 없어요')
  if (typeof (value as { remark?: unknown }).remark === 'string') throw new Error('횡단보도 조회가 지연되고 있어요')
  const elements = (value as { elements: OsmElement[] }).elements.filter(element => element && Number.isSafeInteger(element.id) && element.id > 0)
  const nodes = new Map(elements.filter(element => element.type === 'node' && validPosition(element.lat, element.lon)).map(element => [element.id, { lat: element.lat!, lng: element.lon! }]))
  const geometry = (element: OsmElement) => element.geometry
    ? element.geometry.filter(point => validPosition(point.lat, point.lon)).map(point => ({ lat: point.lat, lng: point.lon }))
    : (element.nodes ?? []).flatMap(id => nodes.has(id) ? [nodes.get(id)!] : [])
  const crossingWays = elements.filter(element => element.type === 'way' && element.tags?.footway === 'crossing')
  const coveredNodes = new Set(crossingWays.filter(way => geometry(way).length >= 2).flatMap(way => way.nodes ?? []))
  const roads = elements.filter(element => element.type === 'way' && element.tags?.highway && !['footway', 'path', 'steps', 'cycleway'].includes(element.tags.highway))
  const crossings: NearbyCrosswalk[] = []
  const seen = new Set<string>()
  for (const element of elements) {
    const tags = element.tags ?? {}
    if (tags.crossing === 'no') continue
    const isNode = element.type === 'node' && tags.highway === 'crossing' && !coveredNodes.has(element.id)
    const isWay = element.type === 'way' && tags.footway === 'crossing'
    if (!isNode && !isWay) continue
    const points = isWay ? geometry(element) : []
    const position = isNode ? nodes.get(element.id) : points.length >= 2 ? points[Math.floor(points.length / 2)] : null
    if (!position) continue
    // 선분 중간점을 사용해 횡단보도 중앙에 표시한다.
    const center = isWay ? { lat: (points[0].lat + points.at(-1)!.lat) / 2, lng: (points[0].lng + points.at(-1)!.lng) / 2 } : position
    const connectedRoad = roads.find(way => isNode ? way.nodes?.includes(element.id) : way.nodes?.some(id => element.nodes?.includes(id)))
    const roadName = connectedRoad?.tags?.['name:ko'] || connectedRoad?.tags?.name
    let rotation = isWay ? angle(points[0], points.at(-1)!) : 0
    if (isNode) {
      const road = connectedRoad
      if (road) {
        const path = geometry(road)
        const index = road.nodes!.indexOf(element.id)
        const a = path[Math.max(0, index - 1)], b = path[Math.min(path.length - 1, index + 1)]
        if (a && b) rotation = angle(a, b) - 90
      }
    }
    const id = `osm-${element.type}-${element.id}`
    if (seen.has(id)) continue
    seen.add(id)
    crossings.push({ id, name: tags['name:ko'] || tags.name || (roadName ? `${roadName} 인근` : '주변 횡단보도'), position: center, lengthM: null, controllerId: null, verified: false, signal: 'UNKNOWN', distanceM: null, mapRotation: rotation })
  }
  return crossings
}

const cache = new Map<string, { at: number; crossings: NearbyCrosswalk[] }>()
const TIMEOUT_MS = 8_000
async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const response = await fetch(url, { signal: AbortSignal.any([signal, timeout]), headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('횡단보도를 불러오지 못했어요')
  return response.json()
}
function queryUrls(query: string): string[] {
  return ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'].map(url => `${url}?data=${encodeURIComponent(query)}`)
}
export async function loadNearbyCrosswalks(center: LatLngPosition, signal: AbortSignal): Promise<NearbyCrosswalk[]> {
  const key = `${center.lat.toFixed(3)},${center.lng.toFixed(3)}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.at < 300_000) return cached.crossings
  const dy = 450 / 111_195, dx = 450 / (111_195 * Math.max(0.01, Math.cos(center.lat * Math.PI / 180)))
  const box = `${Math.max(-90, center.lat - dy)},${Math.max(-180, center.lng - dx)},${Math.min(90, center.lat + dy)},${Math.min(180, center.lng + dx)}`
  const query = `[out:json][timeout:6];(node[highway=crossing](${box});way[footway=crossing](${box});)->.crossings;.crossings out body geom;way(bn.crossings)[highway];out body geom;`
  const osmBox = `${Math.max(-180, center.lng - dx)},${Math.max(-90, center.lat - dy)},${Math.min(180, center.lng + dx)},${Math.min(90, center.lat + dy)}`
  const urls = [...queryUrls(query), `https://api.openstreetmap.org/api/0.6/map.json?bbox=${osmBox}`]
  for (const url of urls) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    try {
      const crossings = parseCrosswalks(await fetchJson(url, signal)).sort((a, b) => metersApart(a.position!, center) - metersApart(b.position!, center)).slice(0, 100)
      cache.set(key, { at: Date.now(), crossings })
      if (cache.size > 20) cache.delete(cache.keys().next().value!)
      return crossings
    } catch (error) { if (signal.aborted) throw error }
  }
  throw new Error('주변 횡단보도를 불러오지 못했어요. 잠시 후 다시 시도해 주세요')
}
export async function loadCrosswalkById(id: string, signal: AbortSignal): Promise<NearbyCrosswalk | null> {
  const match = /^osm-(node|way)-(\d+)$/.exec(id)
  if (!match) return null
  const [, type, osmId] = match
  const suffix = type === 'way' ? '/full' : ''
  return parseCrosswalks(await fetchJson(`https://api.openstreetmap.org/api/0.6/${type}/${osmId}${suffix}.json`, signal)).find(crosswalk => crosswalk.id === id) ?? null
}
export function mergeCrosswalks(registered: NearbyCrosswalk[], discovered: NearbyCrosswalk[]): NearbyCrosswalk[] {
  return [...registered, ...discovered.filter(item => !registered.some(known => known.id === item.id || (known.position && item.position && metersApart(known.position, item.position) < 8)))]
}
