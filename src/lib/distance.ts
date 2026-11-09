import type { LatLngPosition, NearbyCrosswalk } from '../types/crosswalk'

/** 두 좌표 사이의 직선거리(m). 보행 경로 거리가 아니다. */
export function distanceMeters(from: LatLngPosition, to: LatLngPosition): number {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const dLat = radians(to.lat - from.lat)
  const dLng = radians(to.lng - from.lng)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(6_371_000 * 2 * Math.asin(Math.sqrt(Math.min(1, a))))
}

export function sortCrosswalksByDistance(crosswalks: NearbyCrosswalk[], position: LatLngPosition): NearbyCrosswalk[] {
  return crosswalks.map((crosswalk) => ({
    ...crosswalk,
    distanceM: crosswalk.position ? distanceMeters(position, crosswalk.position) : null,
  })).sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity))
}
