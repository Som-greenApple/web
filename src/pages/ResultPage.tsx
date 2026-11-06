import { useNavigate } from 'react-router-dom'
import appleGreen from '../assets/figma/apple-green.svg'
import confetti from '../assets/figma/confetti.svg'
import groundShadow from '../assets/figma/ground-shadow.svg'
import stickmanCheerLg from '../assets/figma/stickman-cheer-lg.svg'
import MobileFrame from '../components/MobileFrame'
import PrimaryButton from '../components/PrimaryButton'
import StatBox from '../components/StatBox'

// TODO: 실제 걷기 기록으로 교체
const MOCK_RESULT = { elapsedSec: 52, avgSpeed: 1.1, runCount: 0 }

/** A4 성공 (CROSS_NOW 뒤) */
function ResultPage() {
  const navigate = useNavigate()

  return (
    <MobileFrame>
      <div className="flex flex-1 flex-col px-4 pb-12 pt-[88px]">
        <h1 className="text-center text-[50px] leading-[69px]">축하합니다!</h1>
        <p className="-mt-0.5 text-center text-[19px] leading-[26px] text-sub">초록사과 타이밍 성공</p>

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
              { label: '걸린 시간', value: `${MOCK_RESULT.elapsedSec}초` },
              { label: '평균 속도', value: `${MOCK_RESULT.avgSpeed}m/s` },
              { label: '뛴 횟수', value: `${MOCK_RESULT.runCount}번` },
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
