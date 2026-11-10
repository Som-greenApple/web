import { useEffect, useState } from 'react'
import type { Crosswalk } from '../../types/crosswalk'
import { fetchSignal, type SignalData } from './fetchSignal'
import { getSignalTarget, type SignalTarget } from './getSignalTarget'
import { signalView } from './signalView'

interface Result { data: SignalData | null; error: string | null }
interface Snapshot { key: string; results: Record<string, Result> }

/** live 모드의 확인된 대상만 조회한다. 요청은 겹치지 않으며 화면을 떠나면 취소한다. */
export function useCrosswalkSignals(crosswalks: readonly Crosswalk[], enabled: boolean) {
  const config = JSON.stringify(enabled ? crosswalks.flatMap((crosswalk) => {
    const target = getSignalTarget(crosswalk)
    return target ? [{ id: crosswalk.id, ...target }] : []
  }) : [])
  const [revision, setRevision] = useState(0)
  const key = `${revision}:${config}`
  const [snapshot, setSnapshot] = useState<Snapshot>({ key: '', results: {} })
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const targets = JSON.parse(config) as (SignalTarget & { id: string })[]
    if (targets.length === 0) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const clock = setInterval(() => setNow(Date.now()), 1000)

    const load = async () => {
      // 같은 교차로와 방향의 중복 요청을 하나로 합친다.
      const requests = new Map<string, Promise<Result>>()
      const entries = await Promise.all(targets.map(async (target) => {
        const targetKey = `${target.itstId}:${target.direction}`
        if (!requests.has(targetKey)) {
          requests.set(targetKey, fetchSignal({
            ...target,
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
          }).then((data) => ({ data, error: null })).catch(() => ({
            data: null, error: '신호 정보를 가져오지 못했어요.',
          })))
        }
        return [target.id, await requests.get(targetKey)!] as const
      }))
      if (controller.signal.aborted) return
      setSnapshot({ key, results: Object.fromEntries(entries) })
      setNow(Date.now())
      // 요청 완료 후 다음 조회를 예약해 느린 요청이 겹치지 않도록 한다.
      timer = setTimeout(() => { void load() }, 10000)
    }
    void load()
    return () => {
      controller.abort()
      clearTimeout(timer)
      clearInterval(clock)
    }
  }, [config, key])

  const results = snapshot.key === key ? snapshot.results : {}
  return {
    getState(crosswalk: Crosswalk) {
      const supported = enabled && getSignalTarget(crosswalk) !== null
      const result = supported ? results[crosswalk.id] : undefined
      const view = signalView(result?.data ?? null, now)
      return {
        ...view,
        supported,
        loading: supported && !result,
        error: result?.error ?? view.error,
      }
    },
    refresh: () => setRevision((value) => value + 1),
  }
}
