import assert from 'node:assert/strict'
import test from 'node:test'
import { loadNearbyCrosswalks, loadCrosswalkById, mergeCrosswalks, parseCrosswalks } from '../src/features/map/nearbyCrosswalks.ts'

const fixture = { elements: [
  { type: 'node', id: 1, lat: 37.6, lon: 127.04, tags: { highway: 'crossing', 'name:ko': '정문 횡단보도', crossing: 'traffic_signals' } },
  { type: 'node', id: 2, lat: 37.6001, lon: 127.04 },
  { type: 'node', id: 3, lat: 37.5999, lon: 127.04 },
  { type: 'way', id: 10, nodes: [2, 1, 3], tags: { highway: 'residential' } },
  { type: 'node', id: 4, lat: 37.6, lon: 127.041, tags: { highway: 'traffic_signals' } },
  { type: 'node', id: 5, lat: 37.6, lon: 127.042, tags: { highway: 'crossing', crossing: 'no' } },
] }

test('실제 crossing 태그만 횡단보도로 만들고 신호는 UNKNOWN으로 유지한다', () => {
  const rows = parseCrosswalks(fixture)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, 'osm-node-1')
  assert.equal(rows[0].name, '정문 횡단보도')
  assert.deepEqual(rows[0].position, { lat: 37.6, lng: 127.04 })
  assert.equal(rows[0].signal, 'UNKNOWN')
  assert.equal(rows[0].verified, false)
  assert.equal(rows[0].controllerId, null)
  assert.ok(Number.isFinite(rows[0].mapRotation))
})

test('crossing 경로 중앙을 사용하고 경로에 포함된 노드는 중복 표시하지 않는다', () => {
  const rows = parseCrosswalks({ elements: [
    ...fixture.elements,
    { type: 'way', id: 20, nodes: [3, 1, 2], tags: { highway: 'footway', footway: 'crossing' } },
  ] })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, 'osm-way-20')
  assert.ok(Math.abs(rows[0].position.lat - 37.6) < 0.00001)
})

test('좌표가 없거나 잘못된 응답을 가짜 위치로 보완하지 않는다', () => {
  assert.throws(() => parseCrosswalks({ error: 'failure' }))
  assert.deepEqual(parseCrosswalks({ elements: [{ type: 'node', id: 8, lat: 200, lon: 10, tags: { highway: 'crossing' } }] }), [])
})

test('등록된 신호 데이터는 유지하고 가까운 OSM 중복만 제거한다', () => {
  const found = parseCrosswalks(fixture)
  const known = { ...found[0], id: 'registered', signal: 'GREEN', verified: true }
  const unknownPosition = { ...known, id: 'unpositioned', position: null }
  const merged = mergeCrosswalks([known, unknownPosition], found)
  assert.equal(merged.length, 2)
  assert.equal(merged[0].signal, 'GREEN')
})

test('조회 실패 시 다른 제공자로 재시도하고 같은 지역은 캐시에서 읽는다', async () => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async url => {
    calls.push(String(url))
    if (calls.length === 1) throw new Error('network')
    return { ok: true, json: async () => fixture }
  }
  try {
    const signal = new AbortController().signal
    const rows = await loadNearbyCrosswalks({ lat: 37.6, lng: 127.04 }, signal)
    assert.equal(rows[0].id, 'osm-node-1')
    assert.equal(calls.length, 2)
    assert.deepEqual(await loadNearbyCrosswalks({ lat: 37.6, lng: 127.04 }, signal), rows)
    assert.equal(calls.length, 2)
  } finally { globalThis.fetch = original }
})

test('조회 취소 시 이후 제공자를 요청하지 않고 잘못된 상세 ID는 요청하지 않는다', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('unexpected') }
  try {
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(loadNearbyCrosswalks({ lat: 40, lng: 130 }, controller.signal))
    assert.equal(await loadCrosswalkById('../../secret', new AbortController().signal), null)
    assert.equal(calls, 0)
  } finally { globalThis.fetch = original }
})
