interface Stat {
  label: string
  value: string
}

interface StatBoxProps {
  stats: Stat[]
  /** lg: 결과 화면처럼 숫자를 더 크게 */
  size?: 'md' | 'lg'
}

/** 거리 · 속도 · 시간처럼 숫자 세 개를 나란히 보여주는 박스 */
function StatBox({ stats, size = 'md' }: StatBoxProps) {
  const isLarge = size === 'lg'

  return (
    <dl className={`grid grid-cols-3 rounded-[14px] border-2 border-ink text-center ${isLarge ? 'pb-3.5 pt-[13px]' : 'pb-1.5 pt-2'}`}>
      {stats.map((stat, i) => (
        <div key={stat.label} className="relative flex flex-col">
          {i > 0 && (
            <span
              aria-hidden
              className={`absolute left-0 top-1/2 w-0.5 -translate-y-1/2 bg-ink ${isLarge ? 'h-[58px]' : 'h-11'}`}
            />
          )}
          <dt className="text-[15px] leading-[21px] text-sub">{stat.label}</dt>
          <dd className={isLarge ? 'text-[26px] leading-9' : 'text-2xl leading-[33px]'}>{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default StatBox
