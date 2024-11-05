import type { Plugin } from 'vite'
import { htmlRE, cleanPageUrl, cleanUrl } from './utils'
import { PluginOptions, Pages } from './types'

import fs from 'fs/promises'
import path from 'pathe'
import glob from 'fast-glob'
import { moveFile } from './mv'

const PLUGIN_NAME = 'vite-plugin-vanilla'

const defaults: PluginOptions = {
	baseDir: 'src',
	// index: 'index.html',
	minify: true,
	compiler: undefined,
	inject: { data: {}, tags: [] },
}

export function createVanillaPlugin(
	pagesPatterns: string | string[],
	options: PluginOptions = {}
): Plugin {
	const htmlPages: Pages = {}
	let viteConfig
	const opts = Object.assign({}, defaults, options) as Required<PluginOptions>

	return {
		name: PLUGIN_NAME,

		configResolved(resolvedConfig) {
			viteConfig = resolvedConfig
		},

		config(config) {
			// Bug 修复：将 pagesPatterns 转换为数组
			const patterns = Array.isArray(pagesPatterns) ? pagesPatterns : [pagesPatterns]
			const input: { [key: string]: string } = {}

			patterns.forEach((pattern) => {
				const files = glob.sync(pattern)

				files.forEach((file) => {
					// 过滤非 html 文件
					if (!htmlRE.test(file)) return

					// 获取绝对路径
					const absolutePath = path.resolve(file)
					// 获取相对于 base 目录的路径
					const relativePath = path.relative(
						path.join(config?.root ?? process.cwd(), opts.baseDir),
						absolutePath
					)
					const fileKey = cleanPageUrl(relativePath)

					input[fileKey] = absolutePath
					htmlPages[fileKey] = {
						file,
						path: fileKey,
						filePath: absolutePath,
						output: relativePath,
					}
				})
			})
			// console.log('input : ', input)
			// console.log('htmlPages : ', htmlPages)
			return {
				build: {
					rollupOptions: {
						input,
					},
				},
			}
		},

		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				let url = cleanUrl(req.url || '')

				// 移除 base 路径
				if (url.startsWith(viteConfig.base)) {
					url = url.replace(viteConfig.base, '')
				}

				// 移除开头的 / 和结尾的 .html
				url = cleanPageUrl(url)

				// 处理根路径
				if (url === '') {
					url = 'index'
				}

				const reg = /\.htm(l)?/i
				const pageData = reg.test(req.url || '')
					? htmlPages[url]
					: htmlPages[url] || htmlPages[`${url}/index`]
				// 查找匹配的页面
				if (pageData) {
					try {
						const html = await fs.readFile(pageData.filePath, 'utf-8')
						// 注入 Vite 客户端代码，支持热更新
						const transformedHtml = await server.transformIndexHtml(url, html)

						res.setHeader('Content-Type', 'text/html')
						return res.end(transformedHtml)
					} catch (e) {
						return next(e)
					}
				}

				next()
			})

			// 监听 HTML 文件变化
			const watcher = server.watcher
			Object.values(htmlPages).forEach(({ filePath }) => {
				watcher.add(filePath)
			})

			// 处理热更新
			watcher.on('change', (file) => {
				server.ws.send({
					type: 'full-reload',
					path: '*',
				})
			})
		},

		transformIndexHtml: {
			order: 'pre',
			handler(html, ctx) {
				// console.log('transformIndexHtml html : ', html)
				console.log('transformIndexHtml ctx : ', ctx.originalUrl, ctx.path)
				if (viteConfig.define) {
					for (const key in viteConfig.define) {
						const _value = viteConfig.define[key]
						html = html.replace(key, typeof _value === 'string' ? JSON.parse(_value) : _value)
					}
				}
				return html
			},
		},
		closeBundle() {
			const files = Object.values(htmlPages).reduce((acc, page) => {
				acc[page.file] = page.output
				return acc
			}, {})
			moveFile(files, 'dist')
		},
	}
}
