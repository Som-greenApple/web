import assert from 'node:assert/strict'
import test from 'node:test'
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import { createSketchStyle } from '../src/features/map/sketchStyle.ts'

test('전 세계 타일 기반 스타일이 MapLibre 명세 검증을 통과한다', () => {
  assert.deepEqual(validateStyleMin(createSketchStyle()), [])
})

test('건물이나 지명 레이어 없이 도로와 흰 블록만 그린다', () => {
  const style = createSketchStyle()
  assert.deepEqual(style.layers.map(layer => layer.type), ['background', 'line', 'line'])
  assert.ok(style.layers.filter(layer => layer.type === 'line').every(layer => layer['source-layer'] === 'transportation'))
  assert.equal(style.layers[0].paint['background-color'], '#ffffff')
  assert.equal(style.layers[1].paint['line-color'], '#111111')
  assert.equal(style.layers[2].paint['line-color'], '#ffffff')
})
