import { useState } from 'react'
import ringDashed from '../assets/figma/ring-dashed.svg'
import type { SignalState } from '../types/signal'
import AppleIcon from './AppleIcon'

type DataMode = 'mock' | 'replay' | 'live'
type GpsMode = 'real' | 'virtual'

const FORCE_SIGNALS: SignalState[] = ['GREEN', 'FLASHING', 'RED', 'UNKNOWN']

interface SegmentedProps<T extends string> {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex h-[34px] rounded-full border-2 border-ink p-[1px]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-full text-base leading-[23px] ${option.value === value ? 'bg-ink text-white' : ''}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

interface DemoControlPanelProps {
  /** 지금 화면의 사과 (강제 전환에서 선택 표시) */
  signal: SignalState
  onForceSignal: (signal: SignalState) => void
  onRestart: () => void
}

/** C5 데모 패널 (?demo=1 일 때만). 시연용으로 신호·위치를 바꿔 본다 */
function DemoControlPanel({ signal, onForceSignal, onRestart }: DemoControlPanelProps) {
  const [open, setOpen] = useState(true)
  // TODO: 신호 API · GPS · 보행 속도 연동되면 아래 설정을 실제 데이터 소스에 연결
  const [dataMode, setDataMode] = useState<DataMode>('mock')
  const [gpsMode, setGpsMode] = useState<GpsMode>('virtual')
  const [speed, setSpeed] = useState(0.9)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="absolute right-5 top-10 z-30 h-[34px] w-[110px] rounded-full bg-ink text-base text-white"
      >
        데모 모드
      </button>

      {open && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end bg-white/60">
          <section
            aria-label="데모 패널"
            className="relative h-[440px] rounded-t-[28px] border-2 border-b-0 border-ink bg-white px-[30px] pt-6 sm:border-x-0"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="데모 패널 닫기"
              className="absolute left-1/2 top-2 h-3.5 w-[60px] -translate-x-1/2"
            >
              <span className="block h-1.5 rounded-full bg-ink" />
            </button>

            <h2 className="text-2xl leading-[33px]">데모 패널</h2>

            <p className="mt-[9px] text-base leading-[22px] text-sub">신호 데이터</p>
            <div className="mt-0.5">
              <Segmented
                label="신호 데이터"
                value={dataMode}
                onChange={setDataMode}
                options={[
                  { value: 'mock', label: 'mock' },
                  { value: 'replay', label: 'replay' },
                  { value: 'live', label: 'live' },
                ]}
              />
            </div>

            <p className="mt-3.5 text-base leading-[22px] text-sub">GPS</p>
            <div className="mt-0.5">
              <Segmented
                label="GPS"
                value={gpsMode}
                onChange={setGpsMode}
                options={[
                  { value: 'real', label: '진짜 위치' },
                  { value: 'virtual', label: '가상 걷기' },
                ]}
              />
            </div>

            <p className="mt-3.5 text-base leading-[22px] text-sub">신호 강제 전환</p>
            <div className="ml-3 mt-0.5 flex gap-5">
              {FORCE_SIGNALS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onForceSignal(item)}
                  aria-pressed={item === signal}
                  className="relative flex h-[52px] w-[52px] items-center justify-center"
                >
                  {item === signal && <img src={ringDashed} alt="" className="absolute inset-[-1px] h-[54px] w-[54px] max-w-none" />}
                  <span className="scale-120">
                    <AppleIcon signal={item} />
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-3.5 flex items-end justify-between">
              <label htmlFor="demo-speed" className="text-base leading-[22px] text-sub">
                가상 속도
              </label>
              <span className="text-lg leading-[25px]">{speed.toFixed(1)}m/s</span>
            </div>
            <input
              id="demo-speed"
              type="range"
              min={0.5}
              max={1.4}
              step={0.1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="mt-0.5 h-5 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-white [&::-moz-range-track]:h-0.5 [&::-moz-range-track]:bg-ink [&::-webkit-slider-runnable-track]:h-0.5 [&::-webkit-slider-runnable-track]:bg-ink [&::-webkit-slider-thumb]:-mt-[9px] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink [&::-webkit-slider-thumb]:bg-white"
            />

            <button
              type="button"
              onClick={onRestart}
              className="mt-3 h-12 w-full rounded-full border-2 border-ink text-[19px] active:scale-[0.98]"
            >
              처음부터 다시 걷기
            </button>
          </section>
        </div>
      )}
    </>
  )
}

export default DemoControlPanel
