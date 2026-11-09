import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
// Node는 SVG를 읽지 않으므로 아이콘만 대체하고 실제 마커 컴포넌트를 실행한다.
const source = readFileSync(new URL('../src/features/map/CrosswalkMarker.tsx', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
})
const module = { exports: {} }
new Function('require', 'module', 'exports', outputText)(
  (id) => id.includes('AppleIcon') ? { default: () => null } : require(id), module, module.exports,
)
const CrosswalkMarker = module.exports.default
const base = { id: 'main-gate', name: '정문 앞', verified: false, signal: 'GREEN' }

test('마커 선택 시 해당 횡단보도 ID를 전달한다', () => {
  const selected = []
  const marker = CrosswalkMarker({ crosswalk: base, onSelect: (id) => selected.push(id) })
  assert.equal(marker.type, 'button')
  assert.equal(marker.props.type, 'button')
  assert.equal(marker.props['aria-label'], '정문 앞 횡단보도 보기')
  marker.props.onClick()
  assert.deepEqual(selected, ['main-gate'])
})

test('미확인 횡단보도는 입력 신호와 무관하게 UNKNOWN으로 표시한다', () => {
  const marker = CrosswalkMarker({ crosswalk: base, onSelect() {} })
  assert.equal(marker.props.children[0].props.signal, 'UNKNOWN')
})

test('확인된 횡단보도의 각 신호를 사과에 전달한다', () => {
  for (const signal of ['GREEN', 'FLASHING', 'RED', 'UNKNOWN']) {
    const marker = CrosswalkMarker({ crosswalk: { ...base, verified: true, signal }, onSelect() {} })
    assert.equal(marker.props.children[0].props.signal, signal)
  }
})
