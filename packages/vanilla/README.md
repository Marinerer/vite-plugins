# vite-plugin-vanilla

Vanilla multi-page web development mode based on `Vite`.

基于 `Vite` 的传统多页面 web 开发模式。

- [Online Example](https://stackblitz.com/edit/vite-plugin-vanilla-example)

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
		vanilla({
			include: 'src/pages/**/*.html',
			base: 'src/pages',
		}),
	],
})

// `/index.html` -> src/pages/index.html
// `/about/index.html` -> src/pages/about/index.html
```

## API

```js
vanilla(options: string | string[] | object)
```

### options

| Name            | Type                         | Default | Description                           |
| --------------- | ---------------------------- | ------- | ------------------------------------- |
| `include`       | `string\|string[]`           |         | The pattern of pages.                 |
| `exclude`       | `string[]`                   | `[]`    | The pattern of pages to exclude.      |
| `base`          | `string`                     | `'src'` | The base directory of pages.          |
| `minify`        | `boolean`                    | `true`  | Whether to minify the HTML.           |
| `transform`     | `Transform`                  |         | Transform the HTML.                   |
| `inject`        | `{tags:HtmlTagDescriptor[]}` |         | Inject the HTML Tags.                 |
| `replaceDefine` | `boolean`                    | `true`  | Static replace `vite.define` in HTML. |

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
