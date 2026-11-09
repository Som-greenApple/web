import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../src/context/LocationProvider.tsx', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } })

function setup() {
  const state = [], cleanups = [], watches = [], cleared = []
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation: {
    watchPosition(success, error) { watches.push({ success, error }); return watches.length },
    clearWatch(id) { cleared.push(id) },
  } } })
  const module = { exports: {} }
  const react = {
    useState(initial) { const i = state.length; state.push(initial); return [initial, value => { state[i] = value }] },
    useRef(value) { return { current: value } },
    useCallback(callback) { return callback },
    useEffect(effect) { cleanups.push(effect()) },
  }
  new Function('require', 'module', 'exports', outputText)((id) => id === 'react' ? react : id === './location' ? { LocationContext: { Provider: 'provider' }, MAIN_GATE_POSITION: { lat: 37.6053, lng: 127.0414 } } : id === './useAppContext' ? { useAppContext: () => ({ setPosition() {}, setGpsMode() {} }) } : require(id), module, module.exports)
  const value = module.exports.default({ children: null }).props.value
  return { value, state, watches, cleared, cleanup() {
    cleanups.forEach(callback => callback?.())
    if (previous) Object.defineProperty(globalThis, 'navigator', previous)
    else delete globalThis.navigator
  } }
}

test('동덕여대 밖의 국내외 좌표도 그대로 저장한다', () => {
  const fixture = setup()
  try {
    fixture.value.startTracking()
    for (const [latitude, longitude] of [[37.5665, 126.978], [48.8566, 2.3522], [-33.8688, 151.2093]]) {
      fixture.watches[0].success({ coords: { latitude, longitude } })
      assert.deepEqual(fixture.state[0], { lat: latitude, lng: longitude })
      assert.equal(fixture.state[1], 'tracking')
    }
  } finally { fixture.cleanup() }
})

test('재시도·기본 위치 선택 시 이전 추적을 해제하고 늦게 도착한 콜백을 무시한다', () => {
  const fixture = setup()
  try {
    fixture.value.startTracking()
    fixture.value.startTracking()
    assert.deepEqual(fixture.cleared, [1])
    fixture.watches[0].success({ coords: { latitude: 1, longitude: 2 } })
    assert.deepEqual(fixture.state[0], { lat: 37.6053, lng: 127.0414 })
    fixture.value.selectDefaultLocation()
    fixture.watches[1].success({ coords: { latitude: 3, longitude: 4 } })
    assert.deepEqual(fixture.state[0], { lat: 37.6053, lng: 127.0414 })
    assert.equal(fixture.state[1], 'default')
    assert.deepEqual(fixture.cleared, [1, 2])
  } finally { fixture.cleanup() }
})

test('권한 거부 시 추적을 종료하고 오류 상태를 전달한다', () => {
  const fixture = setup()
  try {
    fixture.value.startTracking()
    fixture.watches[0].error({ code: 1 })
    assert.equal(fixture.state[1], 'denied')
    assert.deepEqual(fixture.cleared, [1])
  } finally { fixture.cleanup() }
})
