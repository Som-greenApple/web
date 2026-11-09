import { useEffect, useRef, useState } from 'react'
import { useAppContext } from '../../context/useAppContext'
import { MAIN_GATE_POSITION, useLocation } from '../../context/location'
import type { Crosswalk } from '../../types/crosswalk'
import type { SignalSample } from './engine'
import { advancePosition, distanceM, liveSignalAt, predictGuide, REPLAY_PHASES, readLiveSignal, signalAt, startingPosition } from './engine'

export function useDemoSession(crosswalk: Crosswalk) {
  const { dataMode, gpsMode, speed, position, setPosition, forcedSignal } = useAppContext()
  const { startTracking, status: gpsStatus, position: gpsPosition } = useLocation()
  const target = crosswalk.position ?? MAIN_GATE_POSITION
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(startedAt)
  const [forceStartedAt, setForceStartedAt] = useState(startedAt)
  const virtualPosition = useRef(startingPosition(target))
  const speedRef = useRef(speed)
  useEffect(() => { speedRef.current = speed }, [speed])
  const [measuredSpeed, setMeasuredSpeed] = useState<number | null>(null)
  const latestGps = useRef({ position: gpsPosition, status: gpsStatus, at: startedAt })
  const previousGps = useRef<{ position: typeof gpsPosition; at: number } | null>(null)
  useEffect(() => { latestGps.current = { position: gpsPosition, status: gpsStatus, at: Date.now() } }, [gpsPosition, gpsStatus])
  const [sample, setSample] = useState<SignalSample | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(dataMode === 'live')
  const [error, setError] = useState('')

  useEffect(() => {
    if (gpsMode === 'real') {
      startTracking()
      return
    }
    setPosition(virtualPosition.current)
    let previous = Date.now()
    const timer = setInterval(() => {
      const next = Date.now()
      virtualPosition.current = advancePosition(virtualPosition.current, target, speedRef.current, (next - previous) / 1000)
      previous = next
      setPosition(virtualPosition.current)
    }, 250)
    return () => clearInterval(timer)
  }, [gpsMode, startTracking, setPosition, target])

  useEffect(() => {
    const timer = setInterval(() => {
      const time = Date.now()
      setNow(time)
      if (gpsMode !== 'real') return
      const current = latestGps.current
      const previous = previousGps.current
      if (current.status !== 'tracking' || time - current.at > 10_000) {
        setMeasuredSpeed(null)
        return
      }
      if (previous && current.at !== previous.at) {
        const seconds = (current.at - previous.at) / 1000
        const measured = seconds > 0 ? distanceM(previous.position, current.position) / seconds : 0
        setMeasuredSpeed(measured <= 3 ? measured : null)
      }
      previousGps.current = current
    }, 250)
    return () => clearInterval(timer)
  }, [gpsMode])

  useEffect(() => {
    if (dataMode !== 'live') return
    let cancelled = false
    let active: AbortController | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    const poll = async () => {
      if (cancelled) return
      if (!crosswalk.verified || !crosswalk.controllerId) {
        setFailed(true)
        setLoading(false)
        setError('현장 확인과 신호 제어기 등록 후 live를 사용할 수 있어요')
        return
      }
      active = new AbortController()
      const timeout = setTimeout(() => active?.abort(), 8_000)
      try {
        const query = new URLSearchParams({ crosswalkId: crosswalk.id, controllerId: crosswalk.controllerId })
        const response = await fetch(`/api/signal?${query}`, { signal: active.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('실시간 신호를 가져오지 못했어요')
        const next = readLiveSignal(await response.json(), Date.now())
        if (!cancelled) { setSample(next); setFailed(false); setError('') }
      } catch {
        if (!cancelled) { setFailed(true); setError('실시간 신호 연결을 확인해 주세요 · 자동 재시도 중') }
      } finally {
        clearTimeout(timeout)
        if (!cancelled) { setLoading(false); timer = setTimeout(poll, 3_000) }
      }
    }
    void poll()
    return () => { cancelled = true; active?.abort(); clearTimeout(timer) }
  }, [dataMode, crosswalk.id, crosswalk.verified, crosswalk.controllerId])

  const live = liveSignalAt(sample, now, failed)
  const simulated = signalAt((now - (forcedSignal === null ? startedAt : forceStartedAt)) / 1000, dataMode === 'replay' ? REPLAY_PHASES : undefined, forcedSignal)
  const signal = dataMode === 'live' && forcedSignal === null ? live : { ...simulated, ageSec: 0, dataStatus: 'ok' as const }
  const actualPosition = gpsMode === 'virtual' ? position : gpsStatus === 'tracking' ? gpsPosition : null
  const distance = actualPosition && (gpsMode === 'virtual' || crosswalk.position) ? distanceM(actualPosition, target) : null
  const length = dataMode === 'live' && !crosswalk.verified ? null : crosswalk.lengthM ?? (dataMode === 'live' ? null : 20)
  const walkSpeed = gpsMode === 'virtual' ? speed : measuredSpeed
  const strategy = predictGuide(signal.signal, signal.remainSec, distance, Math.min(walkSpeed ?? 0, 1.4), length, signal.dataStatus)
  return {
    signal, distance, length, strategy, walkSpeed, loading: loading && forcedSignal === null, error: forcedSignal === null ? error : '',
    elapsedSec: Math.floor((now - startedAt) / 1000),
    force: () => { const time = Date.now(); setForceStartedAt(time); setNow(time) },
  }
}
