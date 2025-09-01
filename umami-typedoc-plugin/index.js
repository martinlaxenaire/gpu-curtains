import { JSX } from 'typedoc'

export function load(app) {
  app.renderer.hooks.on('body.end', () => {
    return JSX.createElement('script', {
      defer: true,
      src: 'https://cloud.umami.is/script.js',
      'data-website-id': '5633e080-94cc-462b-9158-a45314c01630',
      'data-domains': 'martinlaxenaire.github.io',
    })
  })
}
