import { init, resize } from './init'

self.onmessage = function (message) {
  const { data } = message
  const { type } = data
  if (type === 'init') {
    const { canvas, label, width, height, top, left, pixelRatio } = data
    init({ canvas, label, width, height, top, left, pixelRatio })
  } else if (type === 'resize') {
    const { width, height, top, left } = data
    resize({ width, height, top, left })
  }
}
