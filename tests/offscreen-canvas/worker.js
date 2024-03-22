import { init, resize } from './init'

self.onmessage = function (message) {
  const { data } = message
  const { type } = data
  if (type === 'init') {
    const { canvas, label, width, height, pixelRatio } = data
    init({ canvas, label, width, height, pixelRatio })
  } else if (type === 'resize') {
    const { width, height } = data
    resize({ width, height })
  }
}
