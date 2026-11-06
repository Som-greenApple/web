const SDK_URL = 'https://dapi.kakao.com/v2/maps/sdk.js'

let sdkPromise: Promise<typeof kakao> | null = null

/** Kakao Maps SDK를 한 번만 불러온다 */
export function loadKakaoMap(appKey: string): Promise<typeof kakao> {
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${SDK_URL}?appkey=${appKey}&autoload=false`
    script.async = true
    script.onload = () => {
      const sdk = window.kakao
      if (!sdk) {
        reject(new Error('Kakao Maps SDK를 찾을 수 없어요'))
        return
      }
      sdk.maps.load(() => resolve(sdk))
    }
    script.onerror = () => {
      sdkPromise = null
      reject(new Error('Kakao Maps SDK를 불러오지 못했어요'))
    }
    document.head.appendChild(script)
  })

  return sdkPromise
}
