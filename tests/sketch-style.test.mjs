import assert from 'node:assert/strict'
import test from 'node:test'
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import { createSketchStyle } from '../src/features/map/sketchStyle.ts'

test('전 세계 타일 기반 스타일이 MapLibre 명세 검증을 통과한다', () => {
  assert.deepEqual(validateStyleMin(createSketchStyle()), [])
})

test('건물 윤곽 없이 흑백 도로·블록 스타일을 유지한다', () => {
  const style = createSketchStyle()
  assert.deepEqual(style.layers.filter(layer => layer.type !== 'symbol').map(layer => layer.type), ['background', 'line', 'line'])
  assert.ok(style.layers.filter(layer => layer.type === 'line').every(layer => layer['source-layer'] === 'transportation'))
  assert.equal(style.layers[0].paint['background-color'], '#ffffff')
  assert.equal(style.layers[1].paint['line-color'], '#111111')
  assert.equal(style.layers[2].paint['line-color'], '#ffffff')
})


test('한글 우선 지명·장소명·도로명을 겹침 없이 표시할 글꼴과 레이어가 있다', () => {
  const style = createSketchStyle()
  assert.ok(style.glyphs.includes('{fontstack}/{range}.pbf'))
  const labels = style.layers.filter(layer => layer.type === 'symbol')
  assert.deepEqual(labels.map(layer => layer['source-layer']), ['place', 'poi', 'transportation_name'])
  for (const label of labels) {
    assert.deepEqual(label.layout['text-field'][1], ['get', 'name:ko'])
    assert.notEqual(label.layout['text-allow-overlap'], true)
    assert.equal(label.paint['text-halo-color'], '#ffffff')
  }
})


test('지도 글자에 앱과 같은 손글씨 파일을 연결한다', () => {
  const style = createSketchStyle()
  const faces = style['font-faces']
  for (const layer of style.layers.filter(layer => layer.type === 'symbol')) {
    const font = layer.layout['text-font'][0]
    assert.equal(faces[font][0].url, '/fonts/Griun_AhyoungsHandwriteIn2019-Rg.ttf')
  }
})
