import { useEffect, useRef, useState } from 'react'
import { useAppContext } from '../../context/useAppContext'
import { MAIN_GATE_POSITION, useLocation } from '../../context/location'
import type { Crosswalk } from '../../types/crosswalk'
import { beginCrossing, clearWalkResult, createWalkRecord, finishWalk, sampleWalk, type WalkRecord, type WalkResult } from '../walk/record'
import type { SignalSample } from './engine'
import { advancePosition, distanceM, liveSignalAt, REPLAY_PHASES, readLiveSignal, signalAt, startingPosition } from './engine'
import { decideGuide, type GuideDecision } from '../strategy/predict'
import { speedForPrediction } from '../strategy/speed'
import { useWalkingSpeed } from '../strategy/useWalkingSpeed'

export function useDemoSession(crosswalk: Crosswalk) {
  const { dataMode, gpsMode, speed, position, setPosition, forcedSignal } = useAppContext()
  const { startTracking, status: gpsStatus, position: gpsPosition } = useLocation()
  const target = crosswalk.position ?? MAIN_GATE_POSITION
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(startedAt)
  const [forceStartedAt, setForceStartedAt] = useState(startedAt)
  const record = useRef<WalkRecord | null>(null)
  const phaseRef = useRef<'approach' | 'crossing' | 'complete'>('approach')
  const [phase, setPhase] = useState<'approach' | 'crossing' | 'complete'>('approach')
  const [completedResult, setCompletedResult] = useState<WalkResult | null>(null)
  const guidance = useRef<{ mayCross: boolean; length: number | null }>({ mayCross: false, length: null })
  const virtualPosition = useRef(startingPosition(target))
  const speedRef = useRef(speed)
  useEffect(() => { speedRef.current = speed }, [speed])
  const measuredSpeed = useWalkingSpeed()
  const [sample, setSample] = useState<SignalSample | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(dataMode === 'live')
  const [error, setError] = useState('')

  useEffect(() => {
    if (gpsMode === 'real') {
      startTracking()
      return
    }
    clearWalkResult()
    record.current = createWalkRecord(crosswalk.id, 'demo', virtualPosition.current, Date.now())
    setPosition(virtualPosition.current)
    let previous = Date.now()
    const timer = setInterval(() => {
      const next = Date.now()
      if (phaseRef.current === 'complete' || !record.current) return
      const crossingLength = guidance.current.length
      if (phaseRef.current === 'approach' && distanceM(virtualPosition.current, target) <= 0.2 && guidance.current.mayCross && crossingLength !== null) {
        phaseRef.current = 'crossing'
        setPhase('crossing')
        record.current = beginCrossing(record.current)
      }
      const goal = phaseRef.current === 'crossing' && crossingLength !== null
        ? { lat: target.lat + crossingLength / 111_195, lng: target.lng }
        : target
      virtualPosition.current = advancePosition(virtualPosition.current, goal, speedRef.current, (next - previous) / 1000)
      record.current = sampleWalk(record.current, virtualPosition.current, next)
      previous = next
      setPosition(virtualPosition.current)
      if (phaseRef.current === 'crossing' && distanceM(virtualPosition.current, goal) <= 0.05) {
        const result = finishWalk(record.current, crossingLength, next)
        if (result) {
          phaseRef.current = 'complete'
          setPhase('complete')
          setCompletedResult(result)
          clearInterval(timer)
        }
      }
    }, 250)
    return () => clearInterval(timer)
  }, [gpsMode, startTracking, setPosition, target, crosswalk.id])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [])

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
  const length = dataMode === 'live' && !crosswalk.verified ? null : crosswalk.lengthM ?? (dataMode === 'live' ? null : 20)
  const goal = phase === 'crossing' && length !== null ? { lat: target.lat + length / 111_195, lng: target.lng } : target
  const distance = actualPosition && (gpsMode === 'virtual' || crosswalk.position) ? distanceM(actualPosition, goal) : null
  const walkSpeed = gpsMode === 'virtual' ? speed : measuredSpeed
  const predictionSpeed = gpsMode === 'virtual' ? speed : speedForPrediction(measuredSpeed).speed
  const decision: GuideDecision = decideGuide({ signal: signal.signal, remainSec: signal.remainSec, dataStatus: signal.dataStatus, distanceM: distance, lengthM: length, speed: predictionSpeed })
  const strategy = phase === 'crossing' ? 'CROSS_NOW' : decision.strategy
  useEffect(() => { guidance.current = { mayCross: strategy === 'CROSS_NOW' && phase === 'approach', length } }, [strategy, phase, length])
  return {
    phase, completedResult,
    signal, distance, length, strategy, decision, walkSpeed, loading: loading && forcedSignal === null, error: forcedSignal === null ? error : '',
    elapsedSec: Math.floor((now - startedAt) / 1000),
    force: () => { const time = Date.now(); setForceStartedAt(time); setNow(time) },
  }
}
