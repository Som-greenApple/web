interface SafetyNoteProps {
  /** 신호 정보가 몇 초 전 것인지. null이면 신호 정보 없음 */
  ageSec: number | null
}

function SafetyNote({ ageSec }: SafetyNoteProps) {
  return (
    <p className="text-center text-[15px] leading-[21px] text-sub">
      실제 신호등도 꼭 같이 보기! · {ageSec === null ? '신호 정보 없음' : `${ageSec}초 전 정보`}
    </p>
  )
}

export default SafetyNote
