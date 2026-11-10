import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)

const source = readFileSync(
  new URL('../src/features/map/nearbyCrosswalks.ts', import.meta.url),
  'utf8',
)

const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
})

const loadedModule = { exports: {} }

new Function('require', 'module', 'exports', outputText)(
  require,
  loadedModule,
  loadedModule.exports,
)

const { parseCrosswalks } = loadedModule.exports

function crossing(id, tags) {
  return {
    type: 'node',
    id,
    lat: 37.604,
    lon: 127.043,
    tags: {
      highway: 'crossing',
      ...tags,
    },
  }
}

const cases = [
  {
    name: '명시적인 신호 태그가 있으면 yes',
    tags: { 'crossing:signals': 'yes' },
    expected: 'yes',
  },
  {
    name: '기존 traffic_signals 태그도 yes',
    tags: { crossing: 'traffic_signals' },
    expected: 'yes',
  },
  {
    name: '명시적인 무신호 태그가 있으면 no',
    tags: { 'crossing:signals': 'no' },
    expected: 'no',
  },
  {
    name: 'uncontrolled 태그는 no',
    tags: { crossing: 'uncontrolled' },
    expected: 'no',
  },
  {
    name: '신호 태그가 없으면 unknown',
    tags: {},
    expected: 'unknown',
  },
  {
    name: '노면 표시가 없다는 정보만으로 무신호로 판단하지 않는다',
    tags: {
      crossing: 'unmarked',
      'crossing:markings': 'no',
    },
    expected: 'unknown',
  },
  {
    name: '신호 있음과 없음이 충돌하면 unknown',
    tags: {
      crossing: 'traffic_signals',
      'crossing:signals': 'no',
    },
    expected: 'unknown',
  },
  {
    name: '반대 방향의 태그 충돌도 unknown',
    tags: {
      crossing: 'uncontrolled',
      'crossing:signals': 'yes',
    },
    expected: 'unknown',
  },
]

for (const { name, tags, expected } of cases) {
  test(name, () => {
    const result = parseCrosswalks({
      elements: [crossing(1, tags)],
    })

    assert.equal(result.length, 1)
    assert.equal(result[0].signalPresence, expected)

    // 신호등 유무만으로 실시간 신호나 현장 검증을 추정하지 않는다.
    assert.equal(result[0].signal, 'UNKNOWN')
    assert.equal(result[0].verified, false)
    assert.equal(result[0].controllerId, null)
  })
}

test('신호 있음·없음·미확인 모두 검색 결과에 유지한다', () => {
  const result = parseCrosswalks({
    elements: [
      crossing(1, { 'crossing:signals': 'yes' }),
      crossing(2, { 'crossing:signals': 'no' }),
      crossing(3, {}),
    ],
  })

  assert.equal(result.length, 3)
  assert.deepEqual(
    result.map((item) => item.signalPresence),
    ['yes', 'no', 'unknown'],
  )
})