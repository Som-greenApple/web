import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocation } from '../../context/location'
import type { Crosswalk } from '../../types/crosswalk'
import { beginCrossing, canFinishWalk, clearWalkResult, createWalkRecord, finishWalk, metersBetween, sampleWalk, saveWalkResult, type WalkRecord } from './record'

/** 횡단 방향 정보가 없어 GPS 이동과 사용자의 완료 확인을 함께 사용한다. */
export default function RealWalkRecorder({ crosswalk }: { crosswalk: Crosswalk }) {
  const navigate = useNavigate()
  const { position, status, startTracking } = useLocation()
  const latest = useRef({ position, status, at: 0 })
  const recordRef = useRef<WalkRecord | null>(null)
  const [record, setRecord] = useState<WalkRecord | null>(null)
  const [now, setNow] = useState(0)
  const completed = useRef(false)
  useEffect(() => { latest.current = { position, status, at: Date.now() } }, [position, status])
  useEffect(() => {
    clearWalkResult()
    startTracking()
    const timer = setInterval(() => {
      const time = Date.now()
      setNow(time)
      const sample = latest.current
      if (completed.current || sample.status !== 'tracking' || time - sample.at > 10_000 || recordRef.current?.lastAt === sample.at) return
      recordRef.current = recordRef.current
        ? sampleWalk(recordRef.current, sample.position, sample.at)
        : createWalkRecord(crosswalk.id, 'gps', sample.position, sample.at)
      setRecord(recordRef.current)
    }, 250)
    return () => clearInterval(timer)
  }, [crosswalk.id, startTracking])
  const fresh = status === 'tracking' && record !== null && now - record.lastAt <= 10_000
  const canStart = fresh && crosswalk.verified && crosswalk.position !== null && crosswalk.lengthM !== null && crosswalk.lengthM > 0 && metersBetween(position, crosswalk.position) <= 10
  const canFinish = fresh && record !== null && canFinishWalk(record, crosswalk.lengthM)
  const start = () => {
    if (!recordRef.current || !canStart) return
    recordRef.current = beginCrossing(recordRef.current)
    setRecord(recordRef.current)
  }
  const finish = () => {
    if (!recordRef.current || !canFinish || completed.current) return
    const result = finishWalk(recordRef.current, crosswalk.lengthM, Date.now())
    if (!result) return
    completed.current = true
    saveWalkResult(result)
    navigate('/result', { state: { walkResult: result } })
  }
  return (
    <section aria-label="실제 걷기 기록" className="mx-4 mb-5 rounded-xl border-2 border-ink p-3 text-center text-sm">
      <p>걷기 기록 · 이동 {record ? Math.round(record.distanceM) : 0}m · 뛴 횟수 {record?.runCount ?? 0}번</p>
      <p className="mt-1 text-xs text-sub">현장 신호를 확인하고 횡단 기록을 시작해 주세요. 횡단 거리만큼 이동한 뒤 완료를 확인해요.</p>
      {record?.crossingStartM === null || !record
        ? <button type="button" disabled={!canStart} onClick={start} className="mt-2 rounded-full border-2 border-ink px-4 py-2 disabled:opacity-40">횡단 기록 시작</button>
        : <button type="button" disabled={!canFinish} onClick={finish} className="mt-2 rounded-full bg-ink px-4 py-2 text-white disabled:opacity-40">안전하게 건너기 완료</button>}
      {(!crosswalk.position || !crosswalk.lengthM) && <p className="mt-2 text-xs text-sub">횡단보도 좌표와 길이 등록 후 완료를 기록할 수 있어요</p>}
    </section>
  )
}
