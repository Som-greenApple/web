import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl'

function roadWidth(outline = 0): ExpressionSpecification {
  const widthAtZoom = (major: number, medium: number, minor: number, path: number): ExpressionSpecification => [
    'match', ['get', 'class'],
    ['motorway', 'trunk', 'primary'], major + outline,
    ['secondary', 'tertiary'], medium + outline,
    ['minor', 'service'], minor + outline,
    path + outline,
  ]
  return ['interpolate', ['exponential', 2], ['zoom'],
    10, widthAtZoom(2, 1, 1, 1),
    16, widthAtZoom(16, 12, 8, 3),
    20, widthAtZoom(96, 72, 48, 16),
  ]
}

/** 흑백 도로·블록 위에 한국어 우선 지명과 도로명을 표시한다. */
export function createSketchStyle(): StyleSpecification {
  const filter: ExpressionSpecification = ['all',
    ['==', ['geometry-type'], 'LineString'],
    ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service', 'track', 'path']]],
  ]
  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    // 이 스택을 앱의 Ayoung 파일로 먼저 그린다. 파일에 없는 문자는 Noto glyph로 보완한다.
    'font-faces': {
      'Noto Sans Regular': [{ url: '/fonts/Griun_AhyoungsHandwriteIn2019-Rg.ttf' }],
    },
    sources: {
      world: { type: 'vector', url: 'https://tiles.openfreemap.org/planet/latest', attribution: '<a href="https://openfreemap.org/">OpenFreeMap</a> © <a href="https://openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' },
    },
    layers: [
      { id: 'paper', type: 'background', paint: { 'background-color': '#ffffff' } },
      { id: 'road-outline', type: 'line', source: 'world', 'source-layer': 'transportation', filter,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#111111', 'line-width': roadWidth(2.5) } },
      { id: 'road-surface', type: 'line', source: 'world', 'source-layer': 'transportation', filter,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': roadWidth() } },
      {
        id: 'place-label', type: 'symbol', source: 'world', 'source-layer': 'place',
        layout: {
          'text-field': ['coalesce', ['get', 'name:ko'], ['get', 'name'], ['get', 'name:latin'], ''],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, 12, 16, 16],
          'text-max-width': 9,
          'text-padding': 12,
          'symbol-sort-key': ['coalesce', ['get', 'rank'], 100],
        },
        paint: { 'text-color': '#111111', 'text-halo-color': '#ffffff', 'text-halo-width': 2 },
      },
      {
        id: 'poi-label', type: 'symbol', source: 'world', 'source-layer': 'poi', minzoom: 16,
        layout: {
          'text-field': ['coalesce', ['get', 'name:ko'], ['get', 'name'], ['get', 'name:latin'], ''],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
          'text-max-width': 8,
          'text-padding': 8,
          'symbol-sort-key': ['coalesce', ['get', 'rank'], 100],
        },
        paint: { 'text-color': '#333333', 'text-halo-color': '#ffffff', 'text-halo-width': 2 },
      },
      {
        id: 'road-label', type: 'symbol', source: 'world', 'source-layer': 'transportation_name', minzoom: 14,
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 220,
          'text-field': ['coalesce', ['get', 'name:ko'], ['get', 'name'], ['get', 'name:latin'], ''],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-padding': 5,
          'text-keep-upright': true,
        },
        paint: { 'text-color': '#555555', 'text-halo-color': '#ffffff', 'text-halo-width': 2 },
      },
    ],
  }
}
