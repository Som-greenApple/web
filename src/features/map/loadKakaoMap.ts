const SDK_URL = 'https://dapi.kakao.com/v2/maps/sdk.js'

let sdkPromise: Promise<typeof kakao> | null = null

/** SDK를 공유하고 실패 시 스크립트를 정리해 재시도를 허용한다. */
export function loadKakaoMap(appKey: string): Promise<typeof kakao> {
  if (sdkPromise) return sdkPromise
  if (!appKey.trim()) return Promise.reject(new Error('Kakao JavaScript 키가 필요해요'))

  const pending = new Promise<typeof kakao>((resolve, reject) => {
    const script = document.createElement('script')
    const timer = window.setTimeout(() => fail(), 15_000)
    let settled = false
    const cleanup = () => {
      window.clearTimeout(timer)
      script.onload = null
      script.onerror = null
    }
    const fail = () => {
      if (settled) return
      settled = true
      cleanup()
      script.remove()
      reject(new Error('Kakao Maps SDK를 불러오지 못했어요'))
    }
    script.src = `${SDK_URL}?appkey=${encodeURIComponent(appKey)}&autoload=false`
    script.async = true
    script.onload = () => {
      const sdk = window.kakao
      if (!sdk?.maps?.load) {
        fail()
        return
      }
      try {
        sdk.maps.load(() => {
          if (settled) return
          settled = true
          cleanup()
          resolve(sdk)
        })
      } catch {
        fail()
      }
    }
    script.onerror = fail
    document.head.appendChild(script)
  })
  sdkPromise = pending.catch((error: unknown) => {
    sdkPromise = null
    throw error
  })
  return sdkPromise
}
