import { useEffect, useRef, useState } from 'react'
import { useLocation } from '../../context/location'
import { addSpeedSample, estimateSpeed, type SpeedSample } from './speed'

/** GPS 위치 변화로 보행 속도(m/s)를 잰다. 위치를 추적하지 않거나 측정 중이면 null */
export function useWalkingSpeed(): number | null {
  const { position, status } = useLocation()
  const latest = useRef({ position, status, at: 0 })
  const [speed, setSpeed] = useState<number | null>(null)

  useEffect(() => {
    latest.current = { position, status, at: Date.now() }
  }, [position, status])

  useEffect(() => {
    let samples: SpeedSample[] = []
    let lastAt = 0
    const timer = setInterval(() => {
      const current = latest.current
      if (current.status !== 'tracking' || current.at === 0) {
        samples = []
        lastAt = 0
        setSpeed(null)
        return
      }
      if (current.at !== lastAt) {
        samples = addSpeedSample(samples, current.position, current.at)
        lastAt = current.at
      }
      setSpeed(estimateSpeed(samples, Date.now()))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return speed
}
