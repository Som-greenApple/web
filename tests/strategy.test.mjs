import assert from 'node:assert/strict'
import test from 'node:test'
import { ARRIVED_M, decideGuide, MAX_GUIDE_SPEED } from '../src/features/strategy/predict.ts'
import { addSpeedSample, DEFAULT_WALK_SPEED, estimateSpeed, speedForPrediction } from '../src/features/strategy/speed.ts'
import { formatSpeed, guideCopy } from '../src/features/strategy/guideCopy.ts'

const base = { signal: 'GREEN', remainSec: 50, dataStatus: 'ok', distanceM: 30, lengthM: 20, speed: 1 }
const guide = (overrides) => decideGuide({ ...base, ...overrides })

test('정보·위치·횡단 길이·속도가 없으면 예측하지 않고 이유를 남긴다', () => {
  assert.equal(guide({ signal: 'UNKNOWN' }).reason, 'NO_DATA')
  assert.equal(guide({ dataStatus: 'offline' }).reason, 'NO_DATA')
  assert.equal(guide({ remainSec: undefined }).reason, 'NO_DATA')
  assert.equal(guide({ distanceM: null }).reason, 'NO_POSITION')
  assert.equal(guide({ lengthM: null }).reason, 'NO_LENGTH')
  assert.equal(guide({ lengthM: 0 }).reason, 'NO_LENGTH')
  assert.equal(guide({ speed: 0 }).reason, 'NO_SPEED')
  assert.equal(guide({ speed: Number.NaN }).reason, 'NO_SPEED')
  for (const overrides of [{ signal: 'UNKNOWN' }, { distanceM: null }, { lengthM: null }, { speed: null }]) {
    assert.equal(guide(overrides).strategy, 'NO_SIGNAL')
  }
})

test('초록불: 도착 + 건너기 + 여유 3초가 남은 시간과 같으면 그대로 가고, 1초라도 모자라면 빨리 걷기', () => {
  // 30m + 20m를 1m/s → 50초 + 여유 3초 = 53초
  assert.equal(guide({ remainSec: 53 }).strategy, 'GO_NOW')
  const faster = guide({ remainSec: 52 })
  assert.equal(faster.strategy, 'GO_FASTER')
  assert.ok(faster.recommendedSpeed > 1 && faster.recommendedSpeed <= MAX_GUIDE_SPEED)
})

test('초록불: 1.4m/s로도 못 건너면 뛰지 않고 다음 신호를 기다린다', () => {
  // 50m / 1.4 ≈ 35.7초 + 3초 = 38.7초
  assert.equal(guide({ remainSec: 39 }).strategy, 'GO_FASTER')
  assert.equal(guide({ remainSec: 38 }).strategy, 'WAIT_NEXT')
  assert.equal(guide({ remainSec: 38 }).reason, 'TOO_LATE')
  // 이미 1.4m/s 이상이면 더 빨리 걸으라고 하지 않는다
  assert.equal(guide({ remainSec: 30, speed: 2 }).strategy, 'WAIT_NEXT')
})

test('예측 속도는 1.4m/s 상한을 넘지 않는다 (빨리 걸어도 더 여유 있게 계산하지 않음)', () => {
  // 실제 2m/s면 25초면 되지만 1.4m/s로 보고 35.7초 + 3초 필요
  assert.equal(guide({ remainSec: 30, speed: 2 }).strategy, 'WAIT_NEXT')
  assert.equal(guide({ remainSec: 39, speed: 2 }).strategy, 'GO_NOW')
})

test('횡단보도 앞(3m 이내)에서는 지금 건널 수 있는지만 판단한다', () => {
  assert.equal(guide({ distanceM: ARRIVED_M, remainSec: 23 }).strategy, 'CROSS_NOW') // 20초 + 3초
  assert.equal(guide({ distanceM: 0, remainSec: 22 }).strategy, 'WAIT_NEXT')
  assert.equal(guide({ distanceM: 0, remainSec: 22, speed: 0.5 }).strategy, 'WAIT_NEXT')
})

test('깜빡일 땐 시간이 넉넉해도 새로 건너지 않는다', () => {
  assert.equal(guide({ signal: 'FLASHING', remainSec: 100 }).strategy, 'WAIT_NEXT')
  assert.equal(guide({ signal: 'FLASHING', remainSec: 100, distanceM: 0 }).reason, 'FLASHING')
})

test('빨간불: 먼저 도착하면 초록불에 맞춰 천천히, 늦게 도착하면 그대로 가기', () => {
  // 30m를 1m/s → 30초, 빨간불 40초 남음 → 0.75m/s 권장
  const slow = guide({ signal: 'RED', remainSec: 40 })
  assert.equal(slow.strategy, 'SLOW_DOWN')
  assert.equal(slow.recommendedSpeed, 0.75)
  // 권장 속도가 0.5m/s보다 느리면 속도 대신 앞에서 기다리라고 안내
  const wait = guide({ signal: 'RED', remainSec: 120 })
  assert.equal(wait.strategy, 'SLOW_DOWN')
  assert.equal(wait.recommendedSpeed, null)
  // 도착 시점(30초)에 이미 초록불
  assert.equal(guide({ signal: 'RED', remainSec: 30 }).strategy, 'GO_NOW')
  assert.equal(guide({ signal: 'RED', remainSec: 30 }).reason, 'RED_ARRIVE_AFTER')
  assert.equal(guide({ signal: 'RED', remainSec: 10, distanceM: 1 }).strategy, 'WAIT_NEXT')
})

test('지연된 정보는 여유 시간을 3초 더 둔다', () => {
  assert.equal(guide({ remainSec: 53, dataStatus: 'delayed' }).marginSec, 6)
  assert.equal(guide({ remainSec: 56, dataStatus: 'delayed' }).strategy, 'GO_NOW')
  assert.equal(guide({ remainSec: 55, dataStatus: 'delayed' }).strategy, 'GO_FASTER')
  assert.equal(guide({ remainSec: 23, distanceM: 0, dataStatus: 'delayed' }).strategy, 'WAIT_NEXT')
})

const at = (meters) => ({ lat: 37.6 + meters / 111_195, lng: 127 })

test('보행 속도: 최근 이동의 순이동 거리로 재고, 3초 미만이면 측정 중', () => {
  let samples = addSpeedSample([], at(0), 0)
  samples = addSpeedSample(samples, at(1.2), 1000)
  assert.equal(estimateSpeed(samples, 1000), null)
  samples = addSpeedSample(samples, at(2.4), 2000)
  samples = addSpeedSample(samples, at(3.6), 3000)
  assert.ok(Math.abs(estimateSpeed(samples, 3000) - 1.2) < 0.01)
})

test('보행 속도: 멈추면 줄고, 10초 넘게 끊기면 측정을 다시 시작한다', () => {
  let samples = addSpeedSample([], at(0), 0)
  samples = addSpeedSample(samples, at(4), 4000)
  assert.ok(Math.abs(estimateSpeed(samples, 4000) - 1) < 0.01)
  assert.ok(Math.abs(estimateSpeed(samples, 8000) - 0.5) < 0.01)
  assert.equal(estimateSpeed(samples, 14_001), null)
  assert.equal(addSpeedSample(samples, at(10), 20_000).length, 1)
})

test('보행 속도: GPS 튐(6m/s 초과)은 버리고 그 지점부터 다시 잰다', () => {
  let samples = addSpeedSample([], at(0), 0)
  samples = addSpeedSample(samples, at(2), 2000)
  samples = addSpeedSample(samples, at(40), 3000)
  assert.equal(samples.length, 1)
  assert.equal(estimateSpeed(samples, 3000), null)
})

test('보행 속도: 10초보다 오래된 위치는 측정에서 뺀다', () => {
  let samples = []
  for (let second = 0; second <= 15; second += 1) samples = addSpeedSample(samples, at(second), second * 1000)
  assert.equal(samples[0].at, 5000)
})

test('예측용 속도: 측정 전·정지 상태는 기본 1.2m/s, 빠른 걸음은 1.4m/s로 자른다', () => {
  assert.deepEqual(speedForPrediction(null), { speed: DEFAULT_WALK_SPEED, assumed: true })
  assert.deepEqual(speedForPrediction(0.2), { speed: DEFAULT_WALK_SPEED, assumed: true })
  assert.deepEqual(speedForPrediction(1.1), { speed: 1.1, assumed: false })
  assert.deepEqual(speedForPrediction(2.5), { speed: MAX_GUIDE_SPEED, assumed: false })
})

test('안내 문구: 권장 속도는 안전한 쪽으로 반올림하고 지연 정보면 여유 시간을 알린다', () => {
  assert.equal(formatSpeed(0.79, 'down'), '0.7m/s')
  assert.equal(formatSpeed(1.31, 'up'), '1.4m/s')
  assert.equal(formatSpeed(1.39, 'up'), '1.4m/s')
  assert.equal(guideCopy(guide({ signal: 'RED', remainSec: 40 }), 'ok').description, '0.7m/s로 걸으면 도착할 때 딱 초록사과')
  assert.match(guideCopy(guide({ remainSec: 100, dataStatus: 'delayed' }), 'delayed').description, /3초 더 여유/)
  assert.equal(guideCopy(guide({ signal: 'FLASHING' }), 'ok').description, '깜빡일 땐 새로 건너지 않아요')
  assert.equal(guideCopy(guide({ distanceM: null }), 'delayed').title, '신호 예측은 쉬어갈게요')
})
