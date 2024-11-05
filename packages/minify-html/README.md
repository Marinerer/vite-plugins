# vite-plugin-minify-html

Minify HTML files.

## Install

```sh
npm i -D vite-plugin-minify-html
```

## Usage

```js
// vite.config.js

import { minifyHtml } from 'vite-plugin-minify-html'

export default {
  plugins: [minifyHtml()]
}
```

## API

```typescript
minifyHtml(options?: boolean | Options)
```

## License

MIT
