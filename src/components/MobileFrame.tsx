import type { ReactNode } from 'react'

interface MobileFrameProps {
  children: ReactNode
}

/** 모바일에선 전체 화면, 넓은 화면에선 피그마의 폰 프레임(360x720)처럼 보여준다 */
function MobileFrame({ children }: MobileFrameProps) {
  return (
    <div className="flex min-h-dvh justify-center sm:items-center sm:py-8">
      <main className="relative flex min-h-dvh w-full max-w-[360px] flex-col bg-white sm:min-h-[720px] sm:rounded-[28px] sm:border-2 sm:border-ink sm:overflow-hidden sm:shadow-[7px_7px_0_var(--color-ink)]">
        {children}
      </main>
    </div>
  )
}

export default MobileFrame
