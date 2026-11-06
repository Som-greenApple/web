import stickmanConfused from '../assets/figma/stickman-confused.svg'

interface LocationDeniedModalProps {
  onRetry: () => void
  onUseDefault: () => void
}

/** C1 위치 권한 거부 → 정문 기준으로 보여줄지 묻는 모달 */
function LocationDeniedModal({ onRetry, onUseDefault }: LocationDeniedModalProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 px-6" role="dialog" aria-modal aria-labelledby="location-denied-title">
      <div className="relative h-[380px] w-full max-w-[312px] rounded-2xl border-2 border-ink bg-white shadow-[6px_6px_0_var(--color-ink)]">
        <div className="relative mx-auto h-[156px] w-full" aria-hidden>
          <span className="absolute left-[110px] top-[22px] text-[22px] leading-[30px]">?</span>
          <span className="absolute left-[190px] top-[26px] text-[30px] leading-[41px]">?</span>
          <img src={stickmanConfused} alt="" className="absolute left-[126px] top-[44.5px] h-[109px] w-[49.5px] max-w-none" />
        </div>

        <h2 id="location-denied-title" className="mt-3.5 text-center text-[26px] leading-9">
          어디 계신지 몰라요
        </h2>
        <p className="mt-px text-center text-base leading-[22px] text-sub">
          위치가 꺼져 있으면
          <br />
          동덕여대 정문 기준으로 보여줄게요
        </p>

        <div className="absolute inset-x-5 top-[266px] flex flex-col gap-2.5">
          <button type="button" onClick={onRetry} className="h-12 rounded-full bg-ink text-xl text-white active:scale-[0.98]">
            설정에서 위치 켜기
          </button>
          <button type="button" onClick={onUseDefault} className="h-11 rounded-full border-2 border-ink text-[19px] active:scale-[0.98]">
            정문 기준으로 볼게요
          </button>
        </div>
      </div>
    </div>
  )
}

export default LocationDeniedModal
