# vite-plugin-page-html

**English** | [中文](https://github.com/Marinerer/vite-plugins/blob/main/packages/page-html/README.zh_CN.md)

A simple and flexible Vite plugin for processing HTML pages, integrating multi-page application (MPA) configuration, EJS template support, and HTML compression. The MPA configuration is similar to the pages option in [vue-cli]((https://cli.vuejs.org/en/config/#pages)).


## Features

- 📚 `SPA` and `MPA` modes
- 📡 Customizable page alias
- 🔑 Shared or custom `template` and `entry`
- 🗳 `EJS` template syntax support
- 🗜 HTML file compression for faster loading
- 🔗 Easy inclusion CDN resources

## Why ?

Although `Vite` supports multi-page applications natively, it requires html as entry, which means there must be these html.

If you put html in other directory, you need to add useless directories when accessing. There are also useless directories after build.

Although there are plug-ins that can solve these problems, but after using it, it can not satisfy my project, so I developed this plug-in `vite-plugin-page-html`.

## Install

- `node >= 14.x`
- `vite >= 2.x`

```bash
npm install -D vite-plugin-page-html
```

## Usage

Add EJS tags to html, such as `index.html`

> Tip: If `entry` is configured in vite.config.js, you need to delete the script tag in the html.

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title><%= pageHtmlVitePlugin.title %></title>
    <link rel="shortcut icon" href="<%= BASE_URL %>favicon.ico" type="image/x-icon">
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
```

### SPA

Single-page application configuration, in `vite.config.js` you can configure access url, entry and template.

```js
// vite.config.js
import PageHtml from 'vite-plugin-page-html'

export default defineConfig({
  plugins: [
    // ... plugins
    PageHtml({
      page: 'index',
      template: 'src/index.html',
      title: 'Vue App'
    })
  ]
})
```


### MPA

Multi-page application configuration, you can specify the access URL through the `key` of the `page` object, other configurations are the same as single page.

```js
// vite.config.js
import PageHtml from 'vite-plugin-page-html'

export default defineConfig({
  plugins: [
    // ... plugins
    PageHtml({
      template: 'src/index.html',
      page: {
        index: 'src/main.js',
        about: {
          entry: 'src/about/main.js',
          title: 'About Page',
        },
        'product/list': {
          entry: 'src/product/main.js',
          template: 'src/product/index.html', 
          title: 'Product list'
        }
      }
    })
  ]
})
```

After starting the dev server, browse:

- http://localhost:3000/index.html  
  Use `src/index.html` as the template and `src/main.js` as the entry.
- http://localhost:3000/about.html  
  Use `src/index.html` as the template and `src/about/main.js` as the entry.
- http://localhost:3000/product/list.html  
  Use `src/product/index.html` as the template and `src/product/main.js` as the entry.

The URL structure after the project is constructed is the same as that during development:

```
├── dist
│   ├── assets
│   ├── favicon.ico
│   ├── index.html
│   ├── about.html
│   ├── product
│   │   └── list.html
│   └──
```


## Configuration

```js
PageHtml(/* Options */)
```

### Options

```typescript
PageHtml({
  page: string | PageConfig;
  entry?: string;
  template?: string;
  title?: string;
  minify?: boolean | MinifyOptions;
  ejsOptions?: EjsOptions;
  inject?: InjectOptions;
})
```

| property     | default       | description                                                                                                     |
| ------------ | ------------- | --------------------------------------------------------------------------------------------------------------- |
| `page`       | `index`       | `requred` page configuration. If string, the value is the page path.<br>`PageConfig` [@See](#PageConfig)。      |
| `entry`      | `src/main.js` | entry file path. <br/>**WARNING:** The `entry` entry will be automatically written to html.                     |
| `template`   | `index.html`  | template file path.（`global`）                                                                                 |
| `title`      | -             | page title（`global`）                                                                                          |
| `minify`     | `false`       | Compressed file. `MinifyOptions` [@See](https://github.com/terser/html-minifier-terser#options-quick-reference) |
| `ejsOptions` | -             | `ejs` options, [@See](https://github.com/mde/ejs#options)                                                       |
| `inject`     | -             | Data injected into HTML. (`global`) `InjectOptions` [@see](#InjectOptions)                                      |

> 🚨 **WARNING:** The `entry` file has been written to html, you don't need to write it again.



### InjectOptions

```typescript
interface InjectOptions {
  /**
   * @see https://cn.vitejs.dev/guide/api-plugin.html#vite-specific-hooks
   */
  tags?: HtmlTagDescriptor[],
  /**
   * page data. Rendering via `ejs` : `<%= pageHtmlVitePlugin.data %>`
   */
  data?: Record<string, any>
}

interface HtmlTagDescriptor {
  tag: string
  attrs?: Record<string, string>
  children?: string | HtmlTagDescriptor[]
  /**
   * 默认： 'head-prepend'
   */
  injectTo?: 'head' | 'body' | 'head-prepend' | 'body-prepend'
}
```

| property | type                  | default | description                                                          |
| -------- | --------------------- | ------- | -------------------------------------------------------------------- |
| `tags`   | `HtmlTagDescriptor[]` | `[]`    | List of tags to inject. `HtmlTagDescriptor`                          |
| `data`   | `object`              | -       | page data <br>Rendering via `ejs` : `<%= pageHtmlVitePlugin.data %>` |

### PageConfig

```typescript
{
  [path: string]: string | PageOptions;
}
```

| property | default | description                                                                                                                                     |
| -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `path`   | -       | Single page configuration.<br>1. `path` as output. <br>2. If value is string, it is the entry file. <br>3. `PageOptions` [@See](#PageOptions)。 |

### PageOptions

```typescript
{
  entry: string;
  template?: string;
  title?: string;
  inject?: InjectOptions;
}
```

| property   | default      | description                                                     |
| ---------- | ------------ | --------------------------------------------------------------- |
| `entry`    | -            | `required` entry file                                           |
| `template` | `index.html` | template. Defaults is global `template`                         |
| `title`    | -            | title. Defaults is global `title`                               |
| `inject`   | -            | Data injected into HTML. `InjectOptions` [@see](#InjectOptions) |



## Externals

When we optimize the project build, we generally introduce commonly used external libraries through external links (CDN). This reduces build times and improves page load times in production.

Currently, `output.globals` is only used if `format` is `iife` or `umd`. If `format` is `es` and we want to map the external module to a global variable, we usually solve it with a third-party plugin.

I recommend [rollup-plugin-external-globals](https://github.com/eight04/rollup-plugin-external-globals) and [vite-plugin-externals](https://github.com/crcong/vite-plugin-externals) .

Next, we combine `rollup-plugin-external-globals` to implement the production environment and import the cdn file.

```html
<!-- index.html -->

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="<%= BASE_URL %>favicon.ico">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><%= pageHtmlVitePlugin.title %></title>
    
    <% for (var i in pageHtmlVitePlugin.data.styles) { %>
    <link rel="stylesheet" href="<%= pageHtmlVitePlugin.data.styles[i] %>">
    <% } %>
  </head>
  <body>
    <div id="app"></div>
    <% if(PROD) { %>
      <% for (var i in pageHtmlVitePlugin.data.scripts) { %>
      <script src="<%= pageHtmlVitePlugin.data.scripts[i] %>"></script>
      <% } %>
    <% } %>
  </body>
</html>
```

```js
// vite.config.js

import { defineConfig } from 'vite'
import PageHtml from 'vite-plugin-page-html'
import externalGlobals from 'rollup-plugin-external-globals'

export default defineConfig(({ command, mode }) => {
  // ...
  plugins: [
    // ... plugins
    PageHtml({
      page: {
        'index': 'src/main.js',
        'about': {
          entry: 'src/about/main.js',
          title: 'about US'
        },
      },
      template: 'public/template.html',
      inject: {
        data: {
          styles: [
            'https://cdn.jsdelivr.net/npm/element-ui@2.15.10/lib/theme-chalk/index.css'
          ],
          scripts: [
            'https://cdn.jsdelivr.net/npm/vue@2.7.10/dist/vue.min.js',
            'https://cdn.jsdelivr.net/npm/element-ui@2.15.10/lib/index.js',
            'https://cdn.jsdelivr.net/npm/axios@0.24.0/dist/axios.min.js'
          ],
          injectStyle: `<script src="./inject.css"></script>`,
          injectScript: `<script src="./inject.js"></script>`
        }
      }
    })
  ],
  build: {
    rollupOptions: {
      plugins: [
        externalGlobals({
          'vue': 'Vue',
          'axios': 'axios',
          'element-ui': 'ELEMENT',
        })
      ]
    }
  }
})
```

## Thanks

[vite.js](https://github.com/vitejs/vite) 、 [ejs]() 、[html-minifier-terser](https://github.com/terser/html-minifier-terser) 