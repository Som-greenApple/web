import type { ButtonHTMLAttributes } from 'react'

/** 검은 알약 모양 메인 버튼 */
function PrimaryButton({ className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`h-[60px] w-full rounded-full bg-ink text-[22px] text-white transition-transform active:scale-[0.98] ${className}`}
      {...props}
    />
  )
}

export default PrimaryButton
