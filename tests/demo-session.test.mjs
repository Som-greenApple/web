import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import * as engine from '../src/features/demo/engine.ts'
import * as walkRecord from '../src/features/walk/record.ts'
import * as predict from '../src/features/strategy/predict.ts'
import * as speed from '../src/features/strategy/speed.ts'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../src/features/demo/useDemoSession.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })

// 실제 hook을 가짜 시계와 Context에 연결해 패널 변경부터 거리/신호/예측까지 검증한다.
function setup() {
  const original = { now: Date.now, setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval }
  let clock = 1_000_000, cursor = 0, timerId = 0, output
  const slots = [], effects = [], timers = new Map()
  const app = { dataMode: 'mock', gpsMode: 'virtual', speed: 1, position: null, forcedSignal: null, setPosition(value) { app.position = value } }
  const target = { lat: 37.6053, lng: 127.0414 }
  const crosswalk = { id: 'main-gate', position: null, verified: false, controllerId: null, lengthM: null }
  const location = { status: 'idle', position: target, startTracking() {} }
  Date.now = () => clock
  globalThis.setInterval = (callback, ms) => { const id = ++timerId; timers.set(id, { callback, ms, next: clock + ms }); return id }
  globalThis.clearInterval = id => timers.delete(id)
  const react = {
    useState(initial) {
      const index = cursor++
      if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial }
      return [slots[index].value, value => { slots[index].value = typeof value === 'function' ? value(slots[index].value) : value }]
    },
    useRef(initial) { const index = cursor++; if (!slots[index]) slots[index] = { current: initial }; return slots[index] },
    useEffect(callback, dependencies) {
      const index = cursor++
      const previous = slots[index]
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
        effects.push(() => { previous?.cleanup?.(); slots[index] = { dependencies, cleanup: callback() } })
      }
    },
  }
  const module = { exports: {} }
  new Function('require', 'module', 'exports', outputText)((id) => {
    if (id === 'react') return react
    if (id.endsWith('useAppContext')) return { useAppContext: () => app }
    if (id.endsWith('context/location')) return { MAIN_GATE_POSITION: target, useLocation: () => location }
    if (id === './engine') return engine
    if (id === '../walk/record') return walkRecord
    if (id === '../strategy/predict') return predict
    if (id === '../strategy/speed') return speed
    // 가상 걷기 테스트는 GPS 측정 속도를 쓰지 않는다.
    if (id === '../strategy/useWalkingSpeed') return { useWalkingSpeed: () => null }
    return require(id)
  }, module, module.exports)
  function render() { cursor = 0; output = module.exports.useDemoSession(crosswalk); while (effects.length) effects.shift()(); return output }
  render(); render()
  return {
    app, render, get session() { return output },
    advance(seconds) {
      const until = clock + seconds * 1000
      while (timers.size) {
        const next = Math.min(...[...timers.values()].map(timer => timer.next))
        if (next > until) break
        clock = next
        for (const timer of timers.values()) if (timer.next <= clock) { timer.next += timer.ms; timer.callback() }
        render()
      }
      clock = until
      return render()
    },
    cleanup() {
      slots.forEach(slot => slot?.cleanup?.())
      assert.equal(timers.size, 0, '타이머를 모두 해제해야 한다')
      Date.now = original.now
      globalThis.setInterval = original.setInterval
      globalThis.clearInterval = original.clearInterval
    },
  }
}

test('가상 걷기 → 속도 변경 → 거리와 도착 예측이 같은 세션에서 갱신된다', () => {
  const fixture = setup()
  try {
    fixture.advance(10)
    assert.ok(Math.abs(fixture.session.distance - 50) < 0.2)
    fixture.app.speed = 0.5
    fixture.render()
    fixture.advance(10)
    assert.ok(Math.abs(fixture.session.distance - 45) < 0.2)
    assert.equal(fixture.session.walkSpeed, 0.5)
    assert.ok(fixture.app.position.lat > 37.604)
    fixture.advance(3)
    assert.equal(fixture.session.signal.signal, 'GREEN')
  } finally { fixture.cleanup() }
})

test('강제 신호는 새 카운트다운으로 시작하고 해제하면 원본 시간표로 복귀한다', () => {
  const fixture = setup()
  try {
    fixture.advance(10)
    fixture.app.forcedSignal = 'GREEN'
    fixture.session.force()
    fixture.render()
    assert.equal(fixture.session.signal.remainSec, 50)
    fixture.advance(5)
    assert.equal(fixture.session.signal.remainSec, 45)
    fixture.app.forcedSignal = null
    fixture.render()
    assert.deepEqual(fixture.session.signal.signal, 'RED')
    assert.equal(fixture.session.signal.remainSec, 8)
  } finally { fixture.cleanup() }
})


test('횡단보도 도착만으로 성공하지 않고 가상 횡단까지 마쳐야 실제 세션 기록을 반환한다', () => {
  const fixture = setup()
  try {
    fixture.advance(60)
    assert.equal(fixture.session.completedResult, null)
    fixture.advance(80)
    const result = fixture.session.completedResult
    assert.ok(result)
    assert.equal(fixture.session.phase, 'complete')
    assert.equal(result.source, 'demo')
    assert.ok(Math.abs(result.distanceM - 80) < 0.5)
    assert.ok(result.elapsedSec > 100)
    assert.ok(result.avgSpeed < 1, '대기 시간을 포함한 평균 속도여야 한다')
    assert.equal(result.runCount, 0)
    fixture.advance(10)
    assert.equal(fixture.session.completedResult, result, '완료 기록은 한 번만 생성한다')
  } finally { fixture.cleanup() }
})

test('속도를 바꾼 세션의 결과는 마지막 슬라이더 값이 아닌 총 거리/전체 시간으로 계산한다', () => {
  const fixture = setup()
  try {
    fixture.advance(10)
    fixture.app.speed = 1.4
    fixture.render()
    fixture.advance(80)
    const result = fixture.session.completedResult
    assert.ok(result)
    assert.ok(result.avgSpeed > 1 && result.avgSpeed < 1.4)
    assert.ok(Math.abs(result.avgSpeed - result.distanceM / ((result.completedAt - result.startedAt) / 1000)) < 0.0001)
  } finally { fixture.cleanup() }
})
