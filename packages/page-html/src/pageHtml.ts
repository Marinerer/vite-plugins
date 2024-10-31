import * as vite from 'vite'
import type { Plugin, ResolvedConfig, ConfigEnv } from 'vite'
import historyFallback from 'connect-history-api-fallback'
import { PageOptions, PageItem } from './types'
import { cleanUrl, cleanPageUrl, errlog } from './utils/util'
import { createPage, compileHtml, createRewrites } from './utils/core'
import { createVirtualHtml, removeVirtualHtml } from './utils/file'

import { PLUGIN_NAME } from './const'

const viteMajorVersion = vite?.version ? Number(vite.version.split('.')[0]) : 2

export function createPageHtmlPlugin(pluginOptions: PageOptions = {}): Plugin {
	let viteConfig: ResolvedConfig
	let renderHtml: (html: string, data?: PageItem) => Promise<string>
	const pageInput: Record<string, string> = {}
	// 创建的临时入口html
	let needRemoveVirtualHtml: string[] = []
	const pages = createPage(pluginOptions)
	// 兼容旧版本的transformIndexHtml
	const transformIndexHtmlHandler = async (html, ctx) => {
		try {
			const pageUrl =
				cleanPageUrl(cleanUrl(decodeURIComponent(ctx.originalUrl ?? ctx.path))) || 'index'
			const pageData = pages[pageUrl] || pages[`${pageUrl}/index`]
			if (pageData) {
				const _html = await renderHtml(html, pageData)
				return {
					html: _html,
					tags: pageData.inject.tags,
				}
			}

			throw new Error(`${ctx.originalUrl ?? ctx.path} not found!`)
		} catch (e: any) {
			errlog(e.message)
			return e.message
		}
	}

	return {
		name: PLUGIN_NAME,
		enforce: 'pre' as const,

		async config(config, { command }: ConfigEnv) {
			Object.entries(pages).forEach(([name, current]) => {
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
					rewrites: createRewrites(pages, viteConfig.base ?? '/'),
				})
			)
		},

		transformIndexHtml:
			viteMajorVersion < 5
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
