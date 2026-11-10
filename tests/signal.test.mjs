import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { setImmediate } from 'node:timers/promises'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(file, mocks = {}) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true },
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', outputText)(
    (id) => id in mocks ? mocks[id] : require(id), module, module.exports,
  )
  return module.exports
}
const { signalView } = load('../src/features/signal/signalView.ts')
const { getSignalTarget } = load('../src/features/signal/getSignalTarget.ts')
const handler = load('../api/signal.ts').default
const crosswalk = { id: 'fixture', verified: true, signalPresence: 'yes', signalIntersectionId: '451', signalDirection: 'ne' }
const data = {
  itstId: '451', direction: 'ne', signal: 'GREEN', remainSec: 20,
  ageSec: 2, dataStatus: 'ok', sourceTimestamp: 98000,
  receivedAt: 100000, rawState: 'protected-Movement-Allowed', error: null,
}

test('정보 경과에 따라 지연·만료 처리하고 다음 신호를 추측하지 않는다', () => {
  assert.equal(signalView(data, 108000).dataStatus, 'delayed')
  assert.equal(signalView(data, 108000).remainSec, 12)
  assert.equal(signalView({ ...data, remainSec: 60 }, 128000).dataStatus, 'delayed')
  assert.equal(signalView({ ...data, remainSec: 60 }, 128001).dataStatus, 'offline')
  assert.equal(signalView(data, 120000).signal, 'UNKNOWN')
  assert.equal(signalView(data, 120000).remainSec, undefined)
  assert.equal(signalView({ ...data, error: 'UNSUPPORTED_SIGNAL_STATE' }, 100000).signal, 'UNKNOWN')
})

test('현장 미확인·매핑 누락·잘못된 방향은 요청 대상으로 사용하지 않는다', () => {
  assert.equal(getSignalTarget({ ...crosswalk, verified: false }), null)
  for (const signalPresence of ['no', 'unknown']) {
    assert.equal(getSignalTarget({ ...crosswalk, signalPresence }), null)
  }
  assert.equal(getSignalTarget({ ...crosswalk, signalIntersectionId: null }), null)
  assert.equal(getSignalTarget({ ...crosswalk, signalDirection: 'invalid' }), null)
  assert.deepEqual(getSignalTarget(crosswalk), { itstId: '451', direction: 'ne' })
})

async function proxy(t, row, query = { itstId: '451', direction: 'ne' }, method = 'GET') {
  const previous = process.env.TDATA_API_KEY
  process.env.TDATA_API_KEY = 'fixture-key'
  t.after(() => {
    if (previous === undefined) delete process.env.TDATA_API_KEY
    else process.env.TDATA_API_KEY = previous
  })
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => row }))
  const response = {
    code: 200, headers: {}, body: null,
    setHeader(key, value) { this.headers[key] = value },
    status(code) { this.code = code; return this },
    json(body) { this.body = body; return this },
  }
  await handler({ method, query }, response)
  return response
}

for (const [raw, expected] of [
  ['stop-And-Remain', 'RED'],
  ['protected-Movement-Allowed', 'GREEN'],
  ['permissive-Movement-Allowed', 'GREEN'],
]) {
  test(`프록시: ${raw}를 ${expected}로 변환하고 차량 필드를 무시한다`, async (t) => {
    const response = await proxy(t, [{ itstId: '451', trsmUtcTime: Date.now(),
      nePdsgStatNm: raw, nePdsgRmdrCs: 200,
      neStsgStatNm: 'stop-And-Remain', neStsgRmdrCs: 900,
    }])
    assert.equal(response.body.signal, expected)
    assert.ok(response.body.remainSec > 19 && response.body.remainSec <= 20)
    assert.equal(response.headers['Cache-Control'], 'no-store')
    assert.ok(!JSON.stringify(response.body).includes('fixture-key'))
  })
}

test('프록시: 알 수 없는 점멸 코드를 임의로 변환하지 않는다', async (t) => {
  const response = await proxy(t, { itstId: '451', trsmUtcTime: Date.now(), nePdsgStatNm: 'unverified-flashing', nePdsgRmdrCs: 100 })
  assert.equal(response.body.signal, 'UNKNOWN')
  assert.equal(response.body.error, 'UNSUPPORTED_SIGNAL_STATE')
})

test('프록시: 30초 초과 데이터와 null 잔여시간을 사용하지 않는다', async (t) => {
  const response = await proxy(t, { itstId: '451', trsmUtcTime: Date.now() - 31000, nePdsgStatNm: 'protected-Movement-Allowed', nePdsgRmdrCs: 900 })
  assert.equal(response.body.signal, 'UNKNOWN')
  assert.equal(response.body.dataStatus, 'offline')
  assert.equal(response.body.error, 'STALE_DATA')
})

test('프록시: 정보가 없는 보행 신호를 빨강으로 추정하지 않는다', async (t) => {
  const response = await proxy(t, { itstId: '451', trsmUtcTime: Date.now(), nePdsgStatNm: null, nePdsgRmdrCs: null })
  assert.equal(response.body.signal, 'UNKNOWN')
  assert.equal(response.body.error, 'NO_SIGNAL_DATA')
})

test('프록시: 상류 서버 오류 본문이나 인증키를 반환하지 않는다', async (t) => {
  const previous = process.env.TDATA_API_KEY
  process.env.TDATA_API_KEY = 'fixture-secret'
  t.after(() => { if (previous === undefined) delete process.env.TDATA_API_KEY; else process.env.TDATA_API_KEY = previous })
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('fixture-secret') })
  const response = { status(code) { this.code = code; return this }, setHeader() {}, json(body) { this.body = body } }
  await handler({ method: 'GET', query: { itstId: '451', direction: 'ne' } }, response)
  assert.equal(response.code, 502)
  assert.equal(response.body.error, 'UPSTREAM_ERROR')
  assert.ok(!JSON.stringify(response.body).includes('fixture-secret'))
})

function hookFixture(fetchSignal) {
  const slots = [], effects = []
  let cursor = 0
  const react = {
    useState(initial) {
      const index = cursor++
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
      return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }]
    },
    useEffect(effect, deps) {
      const index = cursor++
      const old = effects[index]
      if (!old || deps.some((dep, i) => !Object.is(dep, old.deps[i]))) {
        old?.cleanup?.()
        effects[index] = { deps, cleanup: effect() }
      }
    },
  }
  const { useCrosswalkSignals } = load('../src/features/signal/useCrosswalkSignals.ts', {
    react, './fetchSignal': { fetchSignal }, './getSignalTarget': { getSignalTarget }, './signalView': { signalView },
  })
  return {
    render(crosswalks, enabled) { cursor = 0; return useCrosswalkSignals(crosswalks, enabled) },
    cleanup() { effects.forEach((effect) => effect?.cleanup?.()) },
  }
}

test('목록·상세 조회: mock 모드와 미확인 데이터에서는 네트워크 요청이 없다', () => {
  let calls = 0
  const fixture = hookFixture(async () => { calls++; return data })
  try {
    fixture.render([crosswalk], false)
    fixture.render([{ ...crosswalk, verified: false }], true)
    assert.equal(calls, 0)
  } finally { fixture.cleanup() }
})

test('같은 신호의 중복 요청을 합치고 실패 시 이전 신호를 제거한다', async () => {
  let calls = 0, fail = false
  const targets = [crosswalk, { ...crosswalk, id: 'second' }]
  const fixture = hookFixture(async () => {
    calls++
    if (fail) throw new Error('network')
    return { ...data, receivedAt: Date.now() }
  })
  try {
    fixture.render(targets, true)
    await setImmediate()
    let view = fixture.render(targets, true)
    assert.equal(calls, 1)
    assert.equal(view.getState(crosswalk).signal, 'GREEN')
    fail = true
    view.refresh()
    fixture.render(targets, true)
    await setImmediate()
    view = fixture.render(targets, true)
    assert.equal(view.getState(crosswalk).signal, 'UNKNOWN')
    assert.equal(view.getState(crosswalk).dataStatus, 'offline')
  } finally { fixture.cleanup() }
})

test('대상 변경·언마운트 시 요청을 취소하고 늦은 응답을 무시한다', async () => {
  const pending = []
  const fixture = hookFixture((options) => new Promise((resolve) => pending.push({ options, resolve })))
  try {
    fixture.render([crosswalk], true)
    const next = { ...crosswalk, id: 'next', signalIntersectionId: '266' }
    let view = fixture.render([next], true)
    assert.equal(pending[0].options.signal.aborted, true)
    pending[0].resolve(data)
    await setImmediate()
    view = fixture.render([next], true)
    assert.equal(view.getState(next).loading, true)
    assert.equal(view.getState(next).signal, 'UNKNOWN')
    fixture.cleanup()
    assert.equal(pending[1].options.signal.aborted, true)
    pending[1].resolve({ ...data, itstId: '266' })
    await setImmediate()
  } finally { fixture.cleanup() }
})
