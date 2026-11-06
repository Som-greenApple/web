import appleLoading from '../assets/figma/apple-loading.svg'
import branch from '../assets/figma/branch.svg'
import stickmanReach from '../assets/figma/stickman-reach.svg'
import CrosswalkHeader from './CrosswalkHeader'

function SkeletonBar({ className }: { className: string }) {
  return <span className={`block h-3.5 rounded-full bg-[#e6e6e6] ${className}`} />
}

/** C2 신호 정보 불러오는 중 */
function CrosswalkLoading({ name }: { name: string }) {
  return (
    <div className="flex flex-1 flex-col px-4 pb-4 pt-[49px]" aria-busy>
      <div className="-mx-[3px]">
        <CrosswalkHeader name={name} />
      </div>

      {/* 나뭇가지에 매달린 점선 사과를 졸라맨이 따려는 그림 (피그마 좌표 그대로) */}
      <div className="relative mx-auto mt-1.5 h-[290px] w-[312px]" aria-hidden>
        <img src={branch} alt="" className="absolute left-[-1.5px] top-[-1px] h-[45.8px] w-[315px] max-w-none" />
        <img src={appleLoading} alt="" className="absolute left-[96.85px] top-[55.35px] h-[101px] w-[118.3px] max-w-none" />
        <span className="absolute inset-x-0 top-[66px] text-center text-[40px] leading-[55px]">...</span>
        <img src={stickmanReach} alt="" className="absolute left-[134.5px] top-[178.3px] h-[113px] w-[39px] max-w-none" />
      </div>

      <p className="mt-[18px] text-center text-[22px] leading-[30px]">사과 따오는 중...</p>
      <p className="mt-0.5 text-center text-base leading-[22px] text-sub">신호 정보를 불러오고 있어요</p>

      <div className="mt-8 flex h-[68px] items-center justify-between rounded-[14px] border-2 border-dashed border-ink px-[22px]">
        <SkeletonBar className="w-[60px]" />
        <SkeletonBar className="w-[60px]" />
        <SkeletonBar className="w-[60px]" />
      </div>
      <div className="mt-[18px] flex h-24 flex-col gap-4 rounded-2xl border-2 border-dashed border-ink px-[18px] pt-[22px]">
        <SkeletonBar className="w-[200px]" />
        <SkeletonBar className="w-[150px]" />
      </div>

      <p className="mt-auto pt-[17px] text-center text-[15px] leading-[21px] text-sub">5초 넘게 걸리면 데모 모드를 쓸 수 있어요</p>
    </div>
  )
}

export default CrosswalkLoading
