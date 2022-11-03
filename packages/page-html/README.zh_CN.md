# vite-plugin-page-html

**中文** | [English](https://github.com/Meqn/vite-plugins/blob/main/packages/page-html/README.md)


简单灵活的处理html的Vite插件。支持EJS模板语法和多页面配置，可指定html文件目录及访问路径，类似于`vue-cli` 的[pages选项](https://cli.vuejs.org/en/config/#pages) 。


> **Examples:** 【[ React ](https://github.com/Meqn/vite-plugins/tree/main/examples/react)】 - 【[ Vue@3 ](https://github.com/Meqn/vite-plugins/tree/main/examples/vue)】 - 【[ Vue@2 ](https://github.com/Meqn/vite-plugins/tree/main/examples/vue2)】 - 【[ Svelte ](https://github.com/Meqn/vite-plugins/tree/main/examples/svelte)】


## Features

* 📚 单页面(SPA)和多页面(MPA)模式
* 📡 支持页面入口别名 (`自定义访问路径`)
* 📊 支持自定义 `template`
* 🔑 支持自定义 `entry`
* 🗳 支持 Ejs 模板语法
* 🔗 支持外部文件库引入 (CDN)
* 🗜 支持HTML文件压缩能力


## Why ?

虽然 Vite [原生支持多页应用](https://vitejs.dev/guide/build.html#multi-page-app)，但它需要以html作为入口文件，这意味着必须有这些html文件。

如果将html文件放置其他目录，那么在访问时需要添加多余的中间目录。与此同时在打包后的文件目录也存在多余的中间目录。

虽然目前也有一些Vite插件能够解决这些问题，但使用后并不能满足我之前的项目，所以便有了这个插件 `vite-plugin-page-html`。

> 补充：由于开发时的目标是多页面的配置，当时未发现 vite-plugin-html 插件。

## Install

- `node >= 14.x`
- `vite >= 2.x`

```bash
npm install vite-plugin-page-html -D
```

## Usage

在 html 中增加 `EJS` 标签, 比如 `index.html` :

> 提示：若在 vite.config.js 中配置了 entry ，则应删除 html模板 内的入口`script`标签。

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="ie=edge,chrome=1">
    <meta name="renderer" content="webkit">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="format-detection" content="telphone=no">
    <title><%= pageHtmlVitePlugin.title %></title>
    <meta name="description" content="">
    <meta name="keywords" content="">
    <link rel="shortcut icon" href="<%= BASE_URL %>favicon.ico" type="image/x-icon">
    <!-- injectStyle -->
    <%- pageHtmlVitePlugin.data.injectStyle %>
  </head>
  <body>
    <div id="app"></div>

    <% if(DEV) { %>
    <script src="/path/development-only-script.js"></script>
    <% } %>

    <% for (var i in pageHtmlVitePlugin.data.scripts) { %>
    <script src="<%= pageHtmlVitePlugin.data.scripts[i] %>"></script>
    <% } %>

    <!-- injectScript -->
    <%- pageHtmlVitePlugin.data.injectScript %>
  </body>
</html>
```

### SPA

单页应用配置，在 `vite.config.js` 中可随意指定 访问路径(`page`)、入口(`entry`)和 html模板(`template`)文件。

```js
// vite.config.js
import PageHtml from 'vite-plugin-page-html'

export default defineConfig({
  plugins: [
    // ... plugins
    PageHtml({
      /**
       * 指定访问地址. e.g. `page/about`
       * @default index.html
       */
      page: 'index',
      /**
       * 入口文件位置, 配置后将需要删除`index.html`内原有的 script 标签
       */
      entry: 'src/main.js',
      /**
       * 指定 html模板文件的位置
       * @default index.html 
       */
      template: 'src/index.html',
      title: 'Vue App',
      minify: false,
      /**
       * 注入 index.html ejs 模版的数据
       */
      inject: {
        data: {
          injectStyle: `<script src="./inject.css"></script>`,
          injectScript: `<script src="./inject.js"></script>`,
          scripts: ['https://cdnjs.com/lodash/index.js']
        },
        tags: [
          {
            injectTo: 'body-prepend',
            tag: 'div',
            attrs: {
              id: 'inject',
            }
          }
        ]
      }
    })
  ]
})
```


### MPA

多页应用配置，可通过配置 `page` 对象的 `key` 来指定访问路径，其他配置同 单页应用。

```js
// vite.config.js
import PageHtml from 'vite-plugin-page-html'

export default defineConfig({
  plugins: [
    // ... plugins
    PageHtml({
      template: 'src/index.html',
      minify: true,
      inject: {
        data: {
          injectStyle: `<script src="./inject.css"></script>`
        }
        tags: [
          {
            injectTo: 'body-prepend',
            tag: 'div',
            attrs: {
              id: 'inject',
            }
          }
        ]
      },
      page: {
        index: 'src/main.js',
        about: {
          entry: 'src/about/main.js',
          title: 'About Page',
        },
        'product/list': {
          entry: 'src/product/main.js',
          template: 'src/product/index.html', 
          title: 'Product list',
          /**
           * 将覆盖全局的 inject 数据
           */
          inject: {
            data: {
              injectStyle: `<script src="./product.css"></script>`
            },
            tags: []
          }
        }
      }
    })
  ]
})
```

启动 dev serve 服务，并打开浏览器：

- http://localhost:3000/index.html  
  Use `src/index.html` as the template and `src/main.js` as the entry.
- http://localhost:3000/about.html  
  Use `src/index.html` as the template and `src/about/main.js` as the entry.
- http://localhost:3000/product/list.html  
  Use `src/product/index.html` as the template and `src/product/main.js` as the entry.

项目构建后的目录结构与开发保持一致：

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
  inject?: InjectOptions
})
```

| property     | default       | description                                                                                                  |
| ------------ | ------------- | ------------------------------------------------------------------------------------------------------------ |
| `page`       | `index`       | `requred` 页面配置项。若为string，则值为页面path。`PageConfig` [详见](#PageConfig)。                         |
| `entry`      | `src/main.js` | 入口文件路径 (**注意：** entry文件会自动添加到html内，不需要手动添加)                                        |
| `template`   | `index.html`  | html文件路径（`global`）                                                                                     |
| `title`      | -             | 页面标题（`global`）                                                                                         |
| `minify`     | `false`       | 是否压缩html，`MinifyOptions` [详见](https://github.com/terser/html-minifier-terser#options-quick-reference) |
| `ejsOptions` | -             | `ejs` 配置项, [详见](https://github.com/mde/ejs#options)                                                     |
| `inject`     | -             | 需要注入 html ejs模板的数据. `InjectOptions` [@see](#InjectOptions)                                          |

> 🚨 **WARNING:** 入口文件 `entry` 将会自动添加到 html 内，不需要手动写入，请删除。



### InjectOptions

```typescript
interface InjectOptions {
  /**
   * @see https://cn.vitejs.dev/guide/api-plugin.html#vite-specific-hooks
   */
  tags?: HtmlTagDescriptor[]
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

| property | type                  | default | description                                                                     |
| -------- | --------------------- | ------- | ------------------------------------------------------------------------------- |
| `tags`   | `HtmlTagDescriptor[]` | `[]`    | 需要注入的标签列表. `HtmlTagDescriptor`                                         |
| `data`   | `object`              | -       | 需要注入的页面数据（`global`），通过`ejs`渲染。`<%= pageHtmlVitePlugin.data %>` |

### PageConfig

```typescript
{
  [path: string]: string | PageOptions;
}
```

| property | default | description                                                                                                                         |
| -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `path`   | -       | 单个页面配置项。<br>1. `path` 将作为输出路径<br>2. `path`的值若为string，则为入口文件路径。<br>`PageOptions` [详见](#PageOptions)。 |

### PageOptions

```typescript
{
  entry: string;
  template?: string;
  title?: string;
  inject?: InjectOptions;
}
```

| property   | default      | description                                                         |
| ---------- | ------------ | ------------------------------------------------------------------- |
| `entry`    | -            | `required` 页面入口文件路径                                         |
| `template` | `index.html` | 模板，默认为全局`template`                                          |
| `title`    | -            | 标题，默认为全局`title`                                             |
| `inject`   | -            | 需要注入 html ejs模板的数据. `InjectOptions` [@see](#InjectOptions) |



## Externals

我们在优化项目打包时，一般会将常用的外部库通过外链的方式引入（CDN）。这可以减少构建时间，并且提高生产环境中页面加载速度。

目前 `rollup` 的 `output.globals` 仅在`format` 是 `iife` 或 `umd` 时有效。如果`format` 是 `es` 时就需要通过第三方插件将外部模块映射到全局变量。

我比较推荐 [rollup-plugin-external-globals](https://github.com/eight04/rollup-plugin-external-globals) 和 [vite-plugin-externals](https://github.com/crcong/vite-plugin-externals) 这两款插件。

下面结合 `rollup-plugin-external-globals` 实现生产环境引入cdn文件库。

```html
// index.html

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

export default defineConfig({
  // ...
  plugins: [
    // ... plugins
    PageHtml({
      page: {
        'index': 'src/main.js',
        'about': {
          entry: 'src/about/main.js',
          title: '关于我们'
        },
      },
      template: 'public/template.html',
      data: {
        styles: [
          'https://cdn.jsdelivr.net/npm/element-ui@2.15.10/lib/theme-chalk/index.css'
        ],
        scripts: [
          'https://cdn.jsdelivr.net/npm/vue@2.7.10/dist/vue.min.js',
          'https://cdn.jsdelivr.net/npm/element-ui@2.15.10/lib/index.js',
          'https://cdn.jsdelivr.net/npm/axios@0.24.0/dist/axios.min.js'
        ]
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


