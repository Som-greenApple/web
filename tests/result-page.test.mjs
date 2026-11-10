import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const cache = new Map()
function load(path) {
  if (cache.has(path)) return cache.get(path)
  const module = { exports: {} }
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } })
  new Function('require', 'module', 'exports', outputText)((id) => {
    if (!id.startsWith('.')) return require(id)
    const target = resolve(dirname(path), id)
    if (id.endsWith('.svg')) return { default: target }
    const file = [target, `${target}.tsx`, `${target}.ts`].find(existsSync)
    if (!file) throw new Error(`Missing ${id}`)
    return load(file)
  }, module, module.exports)
  cache.set(path, module.exports)
  return module.exports
}
const ResultPage = load(fileURLToPath(new URL('../src/pages/ResultPage.tsx', import.meta.url))).default
function render(walkResult) {
  return renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [{ pathname: '/result', state: walkResult ? { walkResult } : null }] }, createElement(ResultPage)))
}
const result = { crosswalkId: 'main-gate', source: 'gps', startedAt: 1_000_000, completedAt: 1_025_000, elapsedSec: 25, distanceM: 30, avgSpeed: 1.2, runCount: 2 }

test('결과 화면은 실제 전달된 시간·평균 속도·뛴 횟수를 렌더링한다', () => {
  const html = render(result)
  assert.ok(html.includes('25초'))
  assert.ok(html.includes('1.2m/s'))
  assert.ok(html.includes('2번'))
  assert.ok(!html.includes('52초'))
  assert.ok(html.includes('다른 사과 따러 가기'))
})

test('기록 없는 직접 접근이나 잘못된 기록에서는 성공 화면을 만들지 않는다', () => {
  for (const value of [undefined, { ...result, avgSpeed: Infinity }]) {
    const html = render(value)
    assert.ok(html.includes('아직 완료한 걷기가 없어요'))
    assert.ok(!html.includes('축하합니다!'))
    assert.ok(!html.includes('52초'))
  }
})

test('가상 기록은 결과 화면에서도 시뮬레이션이라고 구분한다', () => {
  const html = render({ ...result, source: 'demo' })
  assert.ok(html.includes('시뮬레이션 기록'))
})
