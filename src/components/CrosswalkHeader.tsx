import { useNavigate } from 'react-router-dom'
import iconBack from '../assets/figma/icon-back.svg'

/** 뒤로 가기 + 횡단보도 이름 */
function CrosswalkHeader({ name }: { name: string }) {
  const navigate = useNavigate()

  return (
    <header className="flex items-center">
      <button type="button" onClick={() => navigate(-1)} aria-label="뒤로 가기" className="ml-1.5 p-1">
        <img src={iconBack} alt="" className="h-[23px] w-[13px]" />
      </button>
      <h1 className="ml-[11px] text-2xl leading-[33px]">{name} 횡단보도</h1>
    </header>
  )
}

export default CrosswalkHeader
