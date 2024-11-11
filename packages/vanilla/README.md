# vite-plugin-vanilla

Vanilla multi-page web development model based on `Vite`.

基于 `Vite` 的传统的多页面web开发模式。

## Installation

```
npm i vite-plugin-vanilla -D
```

## Usage

```js
import { defineConfig } from 'vite'
import vanilla from 'vite-plugin-vanilla'

export default defineConfig({
	plugins: [
		vanilla('src/pages/**/*.html', {
			base: 'src/pages',
		}),
	],
})
```

## API

```js
vanilla(pagePatterns, options)
```

### pagePatterns

- Type: `string | string[]`

The glob pattern of pages.

### options

| Name      | Type                         | Default | Description                  |
| --------- | ---------------------------- | ------- | ---------------------------- |
| base      | `string`                     | `'src'` | The base directory of pages. |
| minify    | `boolean`                    | `true`  | Whether to minify the HTML.  |
| transform | `Transform`                  |         | Transform the HTML.          |
| inject    | `{tags:HtmlTagDescriptor[]}` |         | Inject the HTML Tags.        |

**options.transform**

```typescript
type Transform = (
	html: string,
	ctx: { originalUrl?: string; path: string }
) => Promise<string> | string
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a [Pull Request](https://github.com/Marinerer/vite-plugins/pulls).
