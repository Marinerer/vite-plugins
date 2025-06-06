import type { Plugin, ResolvedConfig, IndexHtmlTransformHook } from 'vite'
import fs from 'fs/promises'
import path from 'pathe'
import glob from 'fast-glob'
import { PLUGIN_NAME, getPageRE, cleanPageUrl, cleanUrl, errlog, getViteVersion } from './utils'
import { PluginOptions, Pages } from './types'
// import { moveFile } from './mv'
import { moveFile } from 'mv-file'

const defaults: PluginOptions = {
	include: 'src/**/*.html',
	exclude: [],
	suffix: 'html',
	base: 'src',
	minify: true,
	// transform: ()=>{},
	inject: { data: {}, tags: [] },
	replaceDefine: true,
}

export function createVanillaPlugin(options: PluginOptions = {}): Plugin {
	const htmlPages: Pages = {}
	let viteConfig: ResolvedConfig
	const opts = Object.assign({}, defaults, options) as Required<PluginOptions>
	const pageRE = getPageRE(opts.suffix)
	const pagePathRE = getPageRE(opts.suffix, false)
	const basePathResolve = path.resolve(opts.base)

	// 处理 transformIndexHtml 选项
	const transformIndexHtmlHandler: IndexHtmlTransformHook = async (html, ctx) => {
		try {
			if (opts.replaceDefine && viteConfig.define) {
				for (const key in viteConfig.define) {
					const _value = viteConfig.define[key]
					// 全局替换，且处理包含特殊字符
					const keyReg = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
					html = html.replace(keyReg, typeof _value === 'string' ? JSON.parse(_value) : _value)
				}
			}
			if (typeof opts.transform === 'function') {
				html = await opts.transform(html, ctx)
			}
		} catch (err: unknown) {
			errlog((<Error>err).message)
		}

		return {
			html,
			tags: opts.inject?.tags || [],
		}
	}

	return {
		name: PLUGIN_NAME,

		configResolved(resolvedConfig) {
			viteConfig = resolvedConfig
		},

		config(config) {
			const input: { [key: string]: string } = {}

			const files = glob.sync(opts.include, { ignore: opts.exclude })

			files.forEach((file) => {
				// 过滤非 html 文件
				if (!pageRE.test(file)) return
				// 获取绝对路径
				const absolutePath = path.resolve(file)
				// 获取相对于 base 目录的路径
				const relativePath = path.relative(
					path.join(config?.root ?? process.cwd(), opts.base),
					absolutePath
				)
				const fileUrl = cleanPageUrl(relativePath, pageRE)

				input[fileUrl] = absolutePath
				htmlPages[fileUrl] = {
					file, //文件路径
					path: fileUrl, //访问路径
					filePath: absolutePath, // 绝对路径
					output: relativePath, // 输出路径
				}
			})

			return {
				appType: 'mpa',
				build: {
					rollupOptions: {
						input,
					},
				},
			}
		},

		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				let url = cleanUrl(req.url ?? req.originalUrl ?? '')
				const baseDir = viteConfig.base

				// 移除 base 路径
				if (baseDir && url.startsWith(baseDir)) {
					url = url.substring(baseDir.length)
				}

				// 移除开头的 / 和结尾的 .html
				url = cleanPageUrl(url, pageRE)

				// 处理根路径
				if (url === '') {
					url = 'index'
				}

				const pageData = pagePathRE.test(req.url || '')
					? htmlPages[url]
					: htmlPages[url] || htmlPages[`${url}/index`]
				// 查找匹配的页面
				if (pageData) {
					try {
						const html = await fs.readFile(pageData.filePath, 'utf-8')
						// 注入 Vite 客户端代码，支持热更新
						const transformedHtml = await server.transformIndexHtml(
							req.url || `/${url}`,
							html,
							req.originalUrl
						)
						res.setHeader('Content-Type', 'text/html')
						return res.end(transformedHtml)
					} catch (err: unknown) {
						errlog((<Error>err).message)
						return next(err)
					}
				}

				next()
			})

			// 监听 HTML 文件变化
			const watcher = server.watcher
			Object.values(htmlPages).forEach(({ filePath }) => {
				watcher.add(filePath)
			})

			function handleChangeFile(_file: string) {
				server.ws.send({
					type: 'full-reload',
					path: '*',
				})
			}
			function handleAddFile(file: string) {
				const _path = path.resolve(file)
				if (_path.includes(basePathResolve) && pageRE.test(_path)) {
					server.restart()
				}
			}

			// 处理热更新
			watcher.on('change', handleChangeFile)
			watcher.on('unlink', handleChangeFile)
			watcher.on('add', handleAddFile)
		},

		transformIndexHtml:
			getViteVersion() < 5
				? {
						enforce: 'pre' as const,
						transform: transformIndexHtmlHandler,
					}
				: {
						order: 'pre' as const,
						handler: transformIndexHtmlHandler,
					},

		closeBundle() {
			const dest = viteConfig.build.outDir || 'dist'
			const files = Object.values(htmlPages).reduce<Record<string, string>>((acc, page) => {
				const _src = path.join(dest, page.file)
				acc[_src] = page.output
				return acc
			}, {})
			moveFile(files, { base: dest, dest, clean: true, force: true })
		},
	}
}
