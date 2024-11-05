<div align="center">
  <a href="https://vitejs.dev/">
    <img width="200" height="200" hspace="10" src="https://vitejs.dev/logo.svg" alt="vite logo" />
  </a>
  <h1>Vite plugins</h1>
  <p>
    Developing vite plugins.
  </p>
</div>



## 1. vite-plugin-page-html

[English](./packages/page-html/README.md) | [中文](./packages/page-html/README.zh_CN.md)

A simple and flexible Vite plugin for processing HTML pages, integrating multi-page application (MPA) configuration, EJS template support, and HTML compression. The MPA configuration is similar to the pages option in [vue-cli]((https://cli.vuejs.org/en/config/#pages)).

一个用于处理 HTML 页面的 `Vite` 插件，集成了多页面配置(`MPA`)`、EJS` 模板支持和 HTML 压缩功能。其多页面配置方式与 `vue-cli` 的[pages选项](https://cli.vuejs.org/en/config/#pages) 类似。


### Features

- 📚 `SPA` and `MPA` modes
- 📡 Customizable page alias
- 🔑 Shared or custom `template` and `entry`
- 🗳 `EJS` template syntax support
- 🗜 HTML file compression for faster loading
- 🔗 Easy inclusion CDN resources
