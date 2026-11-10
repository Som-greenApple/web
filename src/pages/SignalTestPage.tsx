import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import MobileFrame from '../components/MobileFrame'
import SignalApple from '../components/SignalApple'
import {
  fetchSignal,
  type SignalData,
} from '../features/signal/fetchSignal'
import type { DataStatus, SignalState } from '../types/signal'

const TEST_INTERSECTION_ID = '20386'
const TEST_DIRECTION = 'ne'

const STATUS_LABEL: Record<DataStatus, string> = {
  ok: '정상 수신',
  delayed: '정보 지연',
  offline: '유효한 최신 정보 없음',
}

function SignalTestPage() {
  const [data, setData] = useState<SignalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1_000)

    return () => {
      window.clearInterval(timer)
      requestRef.current?.abort()
      requestRef.current = null
    }
  }, [])

  const handleFetch = async () => {
    // 중복 클릭이나 이전 요청 결과가 새 결과를 덮어쓰는 것을 방지한다.
    if (requestRef.current !== null) return

    const controller = new AbortController()
    requestRef.current = controller

    setLoading(true)
    setError(null)
    setData(null)

    let timedOut = false

    const timeout = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 12_000)

    try {
      const result = await fetchSignal({
        itstId: TEST_INTERSECTION_ID,
        direction: TEST_DIRECTION,
        signal: controller.signal,
      })

      if (requestRef.current !== controller) return

      setData(result)
      setNow(Date.now())
    } catch (cause) {
      if (requestRef.current !== controller) return

      setError(
        timedOut
          ? '요청 시간이 초과됐어요. 다시 시도해 주세요.'
          : cause instanceof Error
            ? cause.message
            : '신호 정보를 가져오지 못했어요.',
      )
    } finally {
      window.clearTimeout(timeout)

      if (requestRef.current === controller) {
        requestRef.current = null
        setLoading(false)
      }
    }
  }

  // 서버가 응답을 만든 시점부터 화면에 머문 시간까지 반영한다.
  const elapsedSec = data
    ? Math.max(0, (now - data.receivedAt) / 1_000)
    : 0

  const ageSec =
    data?.ageSec == null ? null : data.ageSec + elapsedSec

  const dataStatus: DataStatus =
    !data || data.dataStatus === 'offline' || ageSec === null
      ? 'offline'
      : ageSec > 30
        ? 'offline'
        : ageSec >= 10 || data.dataStatus === 'delayed'
          ? 'delayed'
          : 'ok'

  const remaining =
    data?.remainSec == null
      ? null
      : Math.max(0, data.remainSec - elapsedSec)

  // API 오류, 오래된 정보, 잔여시간 만료 시 신호를 추측하지 않는다.
  const signal: SignalState =
    data &&
    data.error === null &&
    dataStatus !== 'offline' &&
    remaining !== null &&
    remaining > 0
      ? data.signal
      : 'UNKNOWN'

  const remainSec =
    signal !== 'UNKNOWN' && remaining !== null
      ? Math.floor(remaining)
      : undefined

  return (
    <MobileFrame>
      <div className="flex flex-1 flex-col gap-5 px-5 py-8">
        <header>
          <h1 className="text-2xl">신호 API 연결 테스트</h1>
          <p className="mt-2 text-sm leading-6 text-sub">
            테스트 교차로 {TEST_INTERSECTION_ID} · 북동 방향 보행 신호
            <br />
            정문·후문 횡단보도와 연결되지 않은 개발용 화면입니다.
          </p>
        </header>

        <div className="rounded-lg border-2 border-dashed border-ink p-3 text-sm leading-6">
          횡단 가능 여부를 안내하는 화면이 아닙니다.
          실제 신호등을 직접 확인해 주세요.
        </div>

        <SignalApple
          signal={signal}
          remainSec={remainSec}
          showMessage={false}
        />

        <p role="status" className="text-center text-sm">
          {loading
            ? '신호 정보를 요청하고 있어요.'
            : error
              ? '신호 요청에 실패했어요.'
              : data
                ? STATUS_LABEL[dataStatus]
                : '아래 버튼으로 신호 정보를 요청하세요.'}
        </p>

        {error && (
          <p role="alert" className="break-words text-sm text-red-700">
            {error}
          </p>
        )}

        {data && (
          <dl className="grid grid-cols-[100px_1fr] gap-2 break-all text-sm">
            <dt>표시 신호</dt>
            <dd>{signal}</dd>

            <dt>남은 시간</dt>
            <dd>
              {remainSec === undefined ? '정보 없음' : `${remainSec}초`}
            </dd>

            <dt>정보 경과</dt>
            <dd>
              {ageSec === null ? '정보 없음' : `${ageSec.toFixed(1)}초`}
            </dd>

            <dt>원본 상태</dt>
            <dd>{data.rawState ?? '정보 없음'}</dd>

            <dt>API 처리 결과</dt>
            <dd>{data.error ?? '정상'}</dd>
          </dl>
        )}

        <button
          type="button"
          onClick={handleFetch}
          disabled={loading}
          className="rounded-full border-2 border-ink px-4 py-3 disabled:opacity-50"
        >
          {loading ? '요청 중…' : '최신 신호 가져오기'}
        </button>

        <Link to="/main" className="text-center text-sm underline">
          메인으로 돌아가기
        </Link>
      </div>
    </MobileFrame>
  )
}

export default SignalTestPage