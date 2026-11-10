import assert from 'node:assert/strict'
import test from 'node:test'
import { beginCrossing, canFinishWalk, createWalkRecord, finishWalk, sampleWalk, isWalkResult, saveWalkResult, loadWalkResult, clearWalkResult } from '../src/features/walk/record.ts'

const point = (meters) => ({ lat: meters / 111_195, lng: 0 })
const at = 1_000_000
function start() { return createWalkRecord('main-gate', 'gps', point(0), at) }

test('거리와 전체 경과시간으로 평균속도를 계산하고 대기 시간도 포함한다', () => {
  let record = beginCrossing(start())
  record = sampleWalk(record, point(10), at + 10_000)
  record = sampleWalk(record, point(10), at + 20_000)
  record = sampleWalk(record, point(20), at + 30_000)
  const result = finishWalk(record, 20, at + 30_000)
  assert.ok(result)
  assert.equal(result.elapsedSec, 30)
  assert.ok(Math.abs(result.distanceM - 20) < 0.01)
  assert.ok(Math.abs(result.avgSpeed - 2 / 3) < 0.01)
  assert.equal(result.runCount, 0)
})

test('횡단 시작 전 이동·정지·제자리 왕복은 완료로 판정하지 않는다', () => {
  let record = sampleWalk(start(), point(20), at + 10_000)
  assert.equal(canFinishWalk(record, 20), false)
  record = beginCrossing(record)
  assert.equal(canFinishWalk(record, 20), false)
  record = sampleWalk(record, point(30), at + 20_000)
  record = sampleWalk(record, point(20), at + 30_000)
  assert.equal(canFinishWalk(record, 20), false)
  assert.equal(finishWalk(record, null, at + 30_000), null)
})

test('GPS 순간 이동·오래된 샘플·재연결 거리는 누적하지 않는다', () => {
  const record = start()
  assert.equal(sampleWalk(record, point(1000), at - 1000), record)
  assert.equal(sampleWalk(record, point(1000), at + 1000).distanceM, 0)
  assert.equal(sampleWalk(record, point(20), at + 20_000).distanceM, 0)
})

test('3초 이상 달리기를 1회로 세고 2초간 속도를 낮춘 뒤 다시 뛰면 2회로 센다', () => {
  let record = start()
  let distance = 0
  let time = at
  const move = (speed, seconds) => {
    for (let i = 0; i < seconds; i++) {
      distance += speed
      time += 1000
      record = sampleWalk(record, point(distance), time)
    }
  }
  move(2.5, 2)
  assert.equal(record.runCount, 0)
  move(2.5, 5)
  assert.equal(record.runCount, 1)
  move(1, 2)
  move(2.5, 3)
  assert.equal(record.runCount, 2)
})

test('결과 저장·새로고침 복원·초기화 및 손상된 기록을 처리한다', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
  const storage = new Map()
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    setItem: (key, value) => storage.set(key, value), getItem: key => storage.get(key) ?? null, removeItem: key => storage.delete(key),
  } })
  try {
    assert.equal(loadWalkResult(), null)
    const record = sampleWalk(beginCrossing(start()), point(20), at + 10_000)
    const result = finishWalk(record, 20, at + 10_000)
    assert.ok(isWalkResult(result))
    saveWalkResult(result)
    assert.deepEqual(loadWalkResult(), result)
    for (const key of storage.keys()) storage.set(key, '{broken')
    assert.equal(loadWalkResult(), null)
    clearWalkResult()
    assert.equal(loadWalkResult(), null)
    assert.equal(isWalkResult({ ...result, avgSpeed: Infinity }), false)
    assert.equal(isWalkResult({ ...result, completedAt: result.startedAt }), false)
    assert.equal(isWalkResult({ ...result, runCount: 1.5 }), false)
  } finally {
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original)
    else delete globalThis.sessionStorage
  }
})
