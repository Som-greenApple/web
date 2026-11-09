import hourglass from '../assets/figma/hourglass.svg'
import type { DataStatus } from '../types/signal'

interface DataStatusBannerProps {
  status: Exclude<DataStatus, 'ok'>
  ageSec: number | null
}

/** 신호 정보가 늦거나 끊겼을 때 사과 아래에 띄우는 안내 */
function DataStatusBanner({ status, ageSec }: DataStatusBannerProps) {
  const message = status === 'delayed' ? `정보가 ${ageSec}초 늦게 오고 있어요` : '최신 신호 정보를 확인할 수 없어요'

  return (
    <p role="status" className="flex h-11 items-center gap-[11px] rounded-[10px] border-2 border-dashed border-ink pl-[13px] text-lg leading-[25px]">
      <img src={hourglass} alt="" className="h-[26px] w-[18px]" />
      {message}
    </p>
  )
}

export default DataStatusBanner
