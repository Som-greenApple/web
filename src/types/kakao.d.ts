// Kakao Maps SDK에서 쓰는 부분만 최소로 타입 선언
declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number)
  }

  class LatLngBounds {
    extend(latlng: LatLng): void
  }

  interface MapOptions {
    center: LatLng
    level?: number
  }

  class Map {
    constructor(container: HTMLElement, options: MapOptions)
    setBounds(bounds: LatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void
    setCenter(position: LatLng): void
    relayout(): void
  }

  interface CustomOverlayOptions {
    map?: Map
    position: LatLng
    content: HTMLElement | string
    yAnchor?: number
    xAnchor?: number
    clickable?: boolean
  }

  class CustomOverlay {
    constructor(options: CustomOverlayOptions)
    setPosition(position: LatLng): void
    setMap(map: Map | null): void
  }

  function load(callback: () => void): void
}

interface Window {
  kakao?: typeof kakao
}
