import type { Plugin, ResolvedConfig, ConfigEnv } from 'vite'
import historyFallback from 'connect-history-api-fallback'
import { PluginOptions, PageItem } from './types'
import { cleanUrl, cleanPageUrl, errlog, getViteVersion } from './utils/util'
import { createPage, compileHtml, createRewrites } from './utils/core'
import { createVirtualHtml, removeVirtualHtml } from './utils/file'

import { PLUGIN_NAME } from './const'

export function createPagePlugin(pluginOptions: PluginOptions = {}): Plugin {
	let viteConfig: ResolvedConfig
	let renderHtml: (html: string, data?: PageItem) => Promise<string>
	const pageInput: Record<string, string> = {}
	// 创建的临时入口html
	let needRemoveVirtualHtml: string[] = []
	const pages = createPage(pluginOptions)
	// 兼容旧版本的transformIndexHtml
	const transformIndexHtmlHandler = async (html, ctx) => {
		let pageUrl = cleanUrl(ctx.originalUrl ?? ctx.path)
		if (pageUrl.startsWith(viteConfig.base)) {
			pageUrl = pageUrl.replace(viteConfig.base, '')
		}
		pageUrl = cleanPageUrl(pageUrl) || 'index'
		const pageData = pages[pageUrl] || pages[`${pageUrl}/index`]
		if (pageData) {
			html = await renderHtml(html, pageData)
			return {
				html,
				tags: pageData.inject.tags,
			}
		} else {
			errlog(`${ctx.originalUrl ?? ctx.path} not found!`)
			return html
		}
	}

	return {
		name: PLUGIN_NAME,
		enforce: 'pre' as const,

		async config(config, { command }: ConfigEnv) {
			Object.entries(pages).forEach(([name, current]) => {
				//dev:动态获取入口, build:静态获取入口
				const template = command === 'build' ? `${current.path}.html` : current.template
				pageInput[name] = template
			})

			if (!config.build?.rollupOptions?.input) {
				return { build: { rollupOptions: { input: pageInput } } }
			}

			config.build.rollupOptions.input = pageInput
		},

		async configResolved(resolvedConfig) {
			viteConfig = resolvedConfig

			if (resolvedConfig.command === 'build') {
				needRemoveVirtualHtml = await createVirtualHtml(pages, resolvedConfig.root)
			}

			renderHtml = await compileHtml(
				pluginOptions.ejsOptions,
				{ ...resolvedConfig.env },
				resolvedConfig
			)
		},

		configureServer(server) {
			server.middlewares.use(
				historyFallback({
					verbose: !!process.env.DEBUG && process.env.DEBUG !== 'false',
					disableDotRule: undefined,
					htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
					rewrites: createRewrites(pages, viteConfig),
				})
			)
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
			if (needRemoveVirtualHtml.length) {
				removeVirtualHtml(needRemoveVirtualHtml)
			}
		},
	}
}
