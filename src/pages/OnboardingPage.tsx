
import { useNavigate } from 'react-router-dom'
import stickmanCheer from '../assets/figma/stickman-cheer.svg'
import AppleIcon from '../components/AppleIcon'
import MobileFrame from '../components/MobileFrame'
import PrimaryButton from '../components/PrimaryButton'
import { useLocation } from '../context/location'
import type { SignalState } from '../types/signal'

const LEGEND: {
  signal: SignalState
  title: string
  description: string
}[] = [
  {
    signal: 'GREEN',
    title: '초록사과',
    description: '지금 건너도 돼요',
  },
  {
    signal: 'FLASHING',
    title: '깜빡사과',
    description: '새로 건너지 않기',
  },
  {
    signal: 'RED',
    title: '빨간사과',
    description: '숫자만큼 기다리기',
  },
  {
    signal: 'UNKNOWN',
    title: '모르는사과',
    description: '정보 없음 · 예측 안 함',
  },
]

/** A1 첫 실행 */
function OnboardingPage() {
  const navigate = useNavigate()

  const { startTracking } = useLocation()
  const handleStart = () => {
    startTracking()
    navigate('/main')
  }

  return (
    <MobileFrame>
      <div className="flex flex-1 flex-col items-center px-[22px] pb-4 pt-[58px]">
        <h1 className="text-[46px] leading-[63px]">
          GreenStep
        </h1>

        <p className="-mt-0.5 text-[19px] leading-[26px] text-sub">
          신호등을 사과로 보여줄게
        </p>

        <AppleIcon
          signal="GREEN"
          size="lg"
          className="mt-5"
        />

        <img
          src={stickmanCheer}
          alt=""
          className="mt-2.5 h-[121px] w-[63px]"
        />

        <ul className="mt-6 w-full border-t-2 border-dashed border-ink px-3.5 pt-[18px]">
          {LEGEND.map(({ signal, title, description }) => (
            <li
              key={signal}
              className="flex items-start gap-[13px] [&+&]:mt-[13px]"
            >
              <span className="flex w-10 shrink-0">
                <AppleIcon
                  signal={signal}
                  className={
                    signal === 'FLASHING'
                      ? ''
                      : 'ml-[4.8px] mt-[5.6px]'
                  }
                />
              </span>

              <div>
                <p className="text-lg leading-[25px]">
                  {title}
                </p>

                <p className="mt-0.5 text-xs leading-4 text-sub">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-auto w-full pt-[17px]">
          <PrimaryButton onClick={handleStart}>
            위치 켜고 시작하기
          </PrimaryButton>

          <p className="mt-[11px] text-center text-[15px] leading-[21px] text-sub">
            진짜 신호등이 항상 먼저예요
          </p>
        </div>
      </div>
    </MobileFrame>
  )
}

export default OnboardingPage
