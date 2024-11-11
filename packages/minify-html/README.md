# vite-plugin-minify-html

Minify HTML files.

## Install

```sh
npm i -D vite-plugin-minify-html
```

## Usage

```js
// vite.config.js

import minifyHtml from 'vite-plugin-minify-html'

export default {
	plugins: [minifyHtml()],
}
```

## API

```typescript
minifyHtml(options?: boolean | MinifyOptions)
```

For more configurations, see [html-minifier-terser](https://www.npmjs.com/package/html-minifier-terser#options-quick-reference).

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a [Pull Request](https://github.com/Marinerer/vite-plugins/pulls).
