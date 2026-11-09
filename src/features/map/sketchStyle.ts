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

/** 전 세계 벡터 타일에서 도로만 그리고 도로 사이는 하나의 흰 블록으로 남긴다. */
export function createSketchStyle(): StyleSpecification {
  const filter: ExpressionSpecification = ['all',
    ['==', ['geometry-type'], 'LineString'],
    ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service', 'track', 'path']]],
  ]
  return {
    version: 8,
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
    ],
  }
}
