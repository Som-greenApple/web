import type { LatLngPosition } from '../../types/crosswalk'

export interface WalkResult {
  crosswalkId: string
  source: 'gps' | 'demo'
  startedAt: number
  completedAt: number
  elapsedSec: number
  distanceM: number
  avgSpeed: number
  runCount: number
}
export interface WalkRecord {
  crosswalkId: string
  source: WalkResult['source']
  startedAt: number
  lastAt: number
  lastPosition: LatLngPosition
  distanceM: number
  runCount: number
  running: boolean
  fastSec: number
  slowSec: number
  crossingStartM: number | null
  crossingStartPosition: LatLngPosition | null
}
export function metersBetween(a: LatLngPosition, b: LatLngPosition): number {
  const rad = (v: number) => v * Math.PI / 180
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 12_742_000 * Math.asin(Math.sqrt(Math.min(1, h)))
}
export function createWalkRecord(crosswalkId: string, source: WalkResult['source'], position: LatLngPosition, now: number): WalkRecord {
  return { crosswalkId, source, startedAt: now, lastAt: now, lastPosition: position, distanceM: 0, runCount: 0, running: false, fastSec: 0, slowSec: 0, crossingStartM: null, crossingStartPosition: null }
}
export function sampleWalk(record: WalkRecord, position: LatLngPosition, now: number): WalkRecord {
  if (now <= record.lastAt) return record
  const seconds = (now - record.lastAt) / 1000
  const distance = metersBetween(record.lastPosition, position)
  const speed = distance / seconds
  const next = { ...record, lastAt: now, lastPosition: position }
  // GPS 재연결·순간 이동은 거리와 달리기 이벤트에서 제외한다.
  if (!Number.isFinite(speed) || (record.source === 'gps' && (seconds > 10 || speed > 6))) {
    return { ...next, fastSec: 0, slowSec: 0, running: false }
  }
  next.distanceM += distance
  next.fastSec = speed >= 2 ? record.fastSec + seconds : 0
  next.slowSec = speed < 1.6 ? record.slowSec + seconds : 0
  if (!record.running && next.fastSec >= 3) { next.running = true; next.runCount += 1 }
  if (record.running && next.slowSec >= 2) next.running = false
  return next
}
export function beginCrossing(record: WalkRecord): WalkRecord {
  if (record.crossingStartM !== null) return record
  return { ...record, crossingStartM: record.distanceM, crossingStartPosition: record.lastPosition }
}
export function canFinishWalk(record: WalkRecord, lengthM: number | null): boolean {
  if (record.crossingStartM === null || !record.crossingStartPosition || lengthM === null || !Number.isFinite(lengthM) || lengthM <= 0) return false
  const moved = record.distanceM - record.crossingStartM
  const displacement = metersBetween(record.crossingStartPosition, record.lastPosition)
  return moved >= lengthM - 0.2 && displacement >= lengthM * 0.8
}
export function finishWalk(record: WalkRecord, lengthM: number | null, now: number): WalkResult | null {
  if (!canFinishWalk(record, lengthM) || now <= record.startedAt) return null
  const seconds = (now - record.startedAt) / 1000
  return { crosswalkId: record.crosswalkId, source: record.source, startedAt: record.startedAt, completedAt: now, elapsedSec: Math.ceil(seconds), distanceM: record.distanceM, avgSpeed: record.distanceM / seconds, runCount: record.runCount }
}
const STORAGE_KEY = 'greenstep:last-walk:v1'
export function isWalkResult(value: unknown): value is WalkResult {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.crosswalkId === 'string' && v.crosswalkId.length > 0 && ['gps', 'demo'].includes(String(v.source)) &&
    ['startedAt', 'completedAt', 'elapsedSec', 'distanceM', 'avgSpeed', 'runCount'].every(key => typeof v[key] === 'number' && Number.isFinite(v[key]) && (v[key] as number) >= 0) &&
    (v.completedAt as number) > (v.startedAt as number) && (v.elapsedSec as number) > 0 && Number.isInteger(v.runCount)
}
export function saveWalkResult(result: WalkResult): void {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result)) } catch { /* 저장 불가 시 라우터 상태로 전달한다. */ }
}
export function loadWalkResult(): WalkResult | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null')
    return isWalkResult(value) ? value : null
  } catch { return null }
}
export function clearWalkResult(): void {
  try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* 저장소를 사용할 수 없어도 기록은 진행한다. */ }
}
