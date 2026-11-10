import assert from 'node:assert/strict'
import test from 'node:test'
import { signalAt, REPLAY_PHASES, startingPosition, advancePosition, distanceM, readLiveSignal, liveSignalAt, predictGuide } from '../src/features/demo/engine.ts'

const target = { lat: 37.6053, lng: 127.0414 }
test('mock 신호가 잔여시간에 맞춰 RED → GREEN → FLASHING → RED로 순환한다', () => {
  assert.deepEqual(signalAt(0), { signal: 'RED', remainSec: 23 })
  assert.deepEqual(signalAt(23), { signal: 'GREEN', remainSec: 50 })
  assert.deepEqual(signalAt(73), { signal: 'FLASHING', remainSec: 6 })
  assert.deepEqual(signalAt(79), signalAt(0))
})

test('replay는 별도 시간표를 재생하고 재시작 시 첫 프레임으로 돌아간다', () => {
  assert.deepEqual(signalAt(0, REPLAY_PHASES), { signal: 'GREEN', remainSec: 12 })
  assert.equal(signalAt(12, REPLAY_PHASES).signal, 'FLASHING')
  assert.equal(signalAt(18, REPLAY_PHASES).signal, 'RED')
  assert.deepEqual(signalAt(88, REPLAY_PHASES), signalAt(0, REPLAY_PHASES))
})

test('강제 신호도 실제 타이머 흐름으로 진행하고 UNKNOWN은 예측하지 않는다', () => {
  assert.deepEqual(signalAt(0, undefined, 'GREEN'), { signal: 'GREEN', remainSec: 50 })
  assert.equal(signalAt(50, undefined, 'GREEN').signal, 'FLASHING')
  assert.equal(signalAt(56, undefined, 'GREEN').signal, 'RED')
  assert.deepEqual(signalAt(1000, undefined, 'UNKNOWN'), { signal: 'UNKNOWN' })
})

test('가상 속도를 바꾸면 다음 구간부터 이동량과 예측에 반영된다', () => {
  const start = startingPosition(target)
  assert.ok(Math.abs(distanceM(start, target) - 60) < 0.1)
  const slow = advancePosition(start, target, 0.5, 10)
  const fast = advancePosition(slow, target, 1.4, 10)
  assert.ok(Math.abs(distanceM(slow, target) - 55) < 0.1)
  assert.ok(Math.abs(distanceM(fast, target) - 41) < 0.1)
  assert.equal(predictGuide('GREEN', 60, 30, 0.5, 20, 'ok'), 'GO_FASTER')
  assert.equal(predictGuide('GREEN', 60, 30, 1.4, 20, 'ok'), 'GO_NOW')
})

test('가상 위치는 목표를 지나치지 않으며 재시작은 출발점부터 시작한다', () => {
  const start = startingPosition(target)
  assert.deepEqual(advancePosition(start, target, 1.4, 1000), target)
  assert.deepEqual(advancePosition(start, target, 0, 10), start)
  assert.deepEqual(startingPosition(target), start)
})

test('점멸·시간 부족·지연·위치나 횡단 길이 누락 시 건너기 안내를 하지 않는다', () => {
  assert.equal(predictGuide('FLASHING', 50, 0, 1.4, 20, 'ok'), 'WAIT_NEXT')
  assert.equal(predictGuide('GREEN', 4, 0, 1.4, 20, 'ok'), 'WAIT_NEXT')
  assert.equal(predictGuide('GREEN', 50, 0, 1, 20, 'ok'), 'CROSS_NOW')
  assert.equal(predictGuide('GREEN', 50, 0, 1, 20, 'delayed'), 'NO_SIGNAL')
  assert.equal(predictGuide('GREEN', 50, null, 1, 20, 'ok'), 'NO_SIGNAL')
  assert.equal(predictGuide('GREEN', 50, 0, 1, null, 'ok'), 'NO_SIGNAL')
})

test('live 응답을 검증하고 경과시간을 반영하며 오래된 신호는 폐기한다', () => {
  const now = 1_000_000
  const sample = readLiveSignal({ signal: 'GREEN', remainSec: 40, updatedAt: now }, now)
  assert.equal(liveSignalAt(sample, now + 5_000, false).remainSec, 35)
  assert.equal(liveSignalAt(sample, now + 10_000, false).dataStatus, 'delayed')
  assert.equal(liveSignalAt(sample, now + 31_000, false).signal, 'UNKNOWN')
  assert.equal(liveSignalAt(sample, now + 1_000, true).dataStatus, 'offline')
  assert.equal(liveSignalAt(null, now, false).signal, 'UNKNOWN')
  assert.equal(liveSignalAt({ ...sample, remainSec: 4 }, now + 4_000, false).signal, 'UNKNOWN')
})

test('잘못된 live 응답을 목업으로 대신하지 않고 거부한다', () => {
  const now = Date.now()
  for (const sample of [null, {}, { signal: 'GREEN', remainSec: -1, updatedAt: now }, { signal: 'RED', updatedAt: now }, { signal: 'GREEN', remainSec: 10, updatedAt: now + 60_000 }]) {
    assert.throws(() => readLiveSignal(sample, now))
  }
})
