import type { ReactNode } from 'react'

interface StrategyCardProps {
  title: string
  description: string
  icon?: ReactNode
  /** 지금 건너도 될 때처럼 강조하는 검은 카드 */
  inverted?: boolean
}

/** 지금 어떻게 걸으면 되는지 알려주는 카드 */
function StrategyCard({ title, description, icon, inverted = false }: StrategyCardProps) {
  return (
    <section
      className={`flex items-center justify-between gap-3 rounded-2xl border-2 border-ink px-[18px] py-4 shadow-[6px_6px_0_var(--color-ink)] ${inverted ? 'bg-ink text-white' : 'bg-white'}`}
    >
      <div>
        <h2 className="text-2xl leading-[33px]">{title}</h2>
        <p className={`mt-[5px] break-keep text-base leading-[22px] tracking-tight ${inverted ? 'text-[#ccc]' : 'text-sub'}`}>
          {description}
        </p>
      </div>
      {icon && <div className="shrink-0">{icon}</div>}
    </section>
  )
}

export default StrategyCard
