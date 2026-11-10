import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isWalkResult, loadWalkResult } from '../features/walk/record'
import appleGreen from '../assets/figma/apple-green.svg'
import confetti from '../assets/figma/confetti.svg'
import groundShadow from '../assets/figma/ground-shadow.svg'
import stickmanCheerLg from '../assets/figma/stickman-cheer-lg.svg'
import MobileFrame from '../components/MobileFrame'
import PrimaryButton from '../components/PrimaryButton'
import StatBox from '../components/StatBox'

/** A4 성공 (CROSS_NOW 뒤) */
function ResultPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [savedResult] = useState(loadWalkResult)
  const routeResult: unknown = (location.state as { walkResult?: unknown } | null)?.walkResult
  const result = isWalkResult(routeResult) ? routeResult : savedResult

  if (!result) {
    return (
      <MobileFrame>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <h1 className="text-3xl">아직 완료한 걷기가 없어요</h1>
          <p className="text-sub">횡단을 마치면 여기에 기록을 보여드릴게요</p>
          <PrimaryButton onClick={() => navigate('/main')}>주변 사과 보러 가기</PrimaryButton>
        </div>
      </MobileFrame>
    )
  }

  return (
    <MobileFrame>
      <div className="flex flex-1 flex-col px-4 pb-12 pt-[88px]">
        <h1 className="text-center text-[50px] leading-[69px]">축하합니다!</h1>
        <p className="-mt-0.5 text-center text-[19px] leading-[26px] text-sub">{result.source === 'demo' ? '데모 횡단 완료 · 시뮬레이션 기록' : '안전하게 건너기 완료'}</p>

        {/* 피그마 좌표대로 겹쳐 놓는 축하 일러스트 */}
        <div className="relative mx-auto mt-[15px] h-[277px] w-[328px]" aria-hidden>
          <img src={confetti} alt="" className="absolute left-[27px] top-[-1px] h-[154px] w-[274px] max-w-none" />
          <img src={appleGreen} alt="" className="absolute left-[130.5px] top-[6.3px] h-[68px] w-[65.5px] max-w-none" />
          <img src={stickmanCheerLg} alt="" className="absolute left-[126.5px] top-[74.5px] h-[177px] w-[75px] max-w-none" />
          <img src={groundShadow} alt="" className="absolute left-[109px] top-[262px] h-4 w-[110px] max-w-none" />
        </div>

        <div className="mt-[21px]">
          <StatBox
            size="lg"
            stats={[
              { label: '걸린 시간', value: `${result.elapsedSec}초` },
              { label: '평균 속도', value: `${result.avgSpeed.toFixed(1)}m/s` },
              { label: '뛴 횟수', value: `${result.runCount}번` },
            ]}
          />
        </div>

        <div className="mt-auto px-1.5 pt-8">
          <PrimaryButton onClick={() => navigate('/main')}>다른 사과 따러 가기</PrimaryButton>
        </div>
      </div>
    </MobileFrame>
  )
}

export default ResultPage
