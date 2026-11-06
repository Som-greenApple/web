/** 현재 위치를 한 번 받아온다. 권한 거부 · 미지원 · 시간 초과면 reject */
export function requestCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('이 브라우저는 위치를 지원하지 않아요'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10_000 })
  })
}
