import ejs from 'ejs'
import { resolve } from 'pathe'
import { ResolvedConfig } from 'vite'
import type { Rewrite } from 'connect-history-api-fallback'
import { Pages, PluginOptions, PageItem } from '../types'
import { errlog, cleanPageUrl } from './util'
import { bodyInjectRE, scriptRE } from '../const'

// type HistoryRewrite = { from: RegExp; to: (context: { parsedUrl: { path: string } }) => string }[]

export async function compileHtml(
	ejsOptions: ejs.Options = {},
	extendData: Record<string, any> = {},
	viteConfig: ResolvedConfig
): Promise<(html: string, data?: PageItem) => Promise<string>> {
	return async function (html: string, data?: PageItem): Promise<string> {
		try {
			const ejsData = {
				...extendData,
				pageHtmlVitePlugin: {
					title: data?.title,
					entry: data?.entry,
					data: data?.inject.data,
				},
			}
			let result = await ejs.render(html, ejsData, ejsOptions)
			if (data?.entry) {
				// 1. 移除html中已有的 script[type=module] 标签
				// 2. 向html中注入 data.entry 文件
				result = result
					.replace(scriptRE, '')
					.replace(
						bodyInjectRE,
						`<script type="module" src="${resolve(
							viteConfig.base ?? '/',
							data.entry
						)}"></script>\n</body>`
					)
			}
			return result
		} catch (e: any) {
			errlog(e.message)
			return ''
		}
	}
}

/**
 * 通过配置项生成单/多页面数据
 */
export function createPage(options: PluginOptions = {}): Pages {
	const {
		entry,
		template = 'index.html',
		title = 'Vite App',
		data, // Keep data here to check if it's used
		ejsOptions = {},
		inject = {},
	} = options

	let finalInjectData = inject.data;
	if (data !== undefined) {
		if (inject.data === undefined) {
			finalInjectData = data;
			console.warn('[vite-plugin-page-html] WARN: The `data` option at the plugin root or page level is deprecated. Please use `inject.data` instead.');
		} else {
			// If both are present, inject.data is prioritized by default logic later,
			// but we can warn if the user explicitly provided the deprecated one.
			console.warn('[vite-plugin-page-html] WARN: The `data` option is deprecated. `inject.data` is being used.');
		}
	}


	const defaults: Omit<PageItem, 'path'> = {
		entry: entry as string,
		template,
		title,
		ejsOptions,
		inject: {
			data: finalInjectData ?? {}, // Use the resolved finalInjectData
			tags: inject.tags ?? [],
		},
	}

	const page = options.page || 'index'
	const pages: Pages = {}

	// 1. 单页面
	if (typeof page === 'string') {
		const pageUrl = cleanPageUrl(page)
		pages[pageUrl] = {
			...defaults,
			path: pageUrl,
		} as PageItem
	} else {
		// 2. 多页面
		Object.entries(page).forEach(([name, pageItem]) => {
			const pageUrl = cleanPageUrl(name)
			if (!pageItem || (typeof pageItem !== 'string' && !pageItem.entry)) {
				errlog(`page ${name} is invalid`)
				return
			}

			let pageSpecificInjectData = typeof pageItem !== 'string' && pageItem.inject?.data;
			// Handle deprecated 'data' at the page level
			if (typeof pageItem !== 'string' && pageItem.data !== undefined) {
				if (pageItem.inject?.data === undefined) {
					pageSpecificInjectData = pageItem.data;
					console.warn(`[vite-plugin-page-html] WARN: The \`data\` option for page "${name}" is deprecated. Please use \`inject.data\` instead.`);
				} else {
					console.warn(`[vite-plugin-page-html] WARN: The \`data\` option for page "${name}" is deprecated. \`inject.data\` is being used.`);
				}
			}


			if (typeof pageItem === 'string') {
				pageItem = { entry: pageItem }
			}

			// Merge inject objects carefully
			const defaultInject = { ...(defaults.inject ?? {}) };
			const pageItemInject = { ...(typeof pageItem !== 'string' ? (pageItem.inject ?? {}) : {}) };
			
			const mergedInjectData = pageSpecificInjectData ?? defaultInject.data;

			pages[pageUrl] = {
				...defaults, // Apply global defaults first
				...pageItem, // Then page-specific options (could override entry, title, template)
				inject: { // Carefully merge inject property
					tags: pageItemInject.tags ?? defaultInject.tags,
					data: mergedInjectData, // Use the data determined by deprecation logic
				},
				path: pageUrl,
			} as PageItem
		})
	}

	return pages
}

/**
 * 生成重写规则，并过滤代理规则
 */
function createRewrite(reg: string, page: PageItem, baseUrl: string, proxyKeys: string[]): Rewrite {
	return {
		from: new RegExp(`^/${reg}$`, 'i'),
		to: ({ parsedUrl }) => {
			const pathname = parsedUrl.path as string
			const template = resolve(baseUrl, page.template)
			const isProxyPath = proxyKeys.some((key) => pathname.startsWith(resolve(baseUrl, key)))
			return isProxyPath ? pathname : template
		},
	}
}

/**
 * 生成重写规则
 */
export function createRewrites(pages: Pages, viteConfig: ResolvedConfig, options: PluginOptions = {}): Rewrite[] {
	const rewrites: Rewrite[] = []
	const indexReg = /(\S+)(\/index\/?)$/
	const baseUrl = viteConfig.base ?? '/'
	const proxyKeys = Object.keys(viteConfig.server?.proxy ?? {})

	Object.entries(pages).forEach(([_, page]) => {
		// 1. 支持 `xxx`, `xxx/xxx`, `xxx[?/xxx].html`, `xxx[?/index.html]` 请求
		// `^/${page.path}((/)|(\\.html?)|(/index\\.html?))?$`
		rewrites.push(
			createRewrite(`${page.path}((/)|(\\.html?)|(/index\\.html?))?`, page, baseUrl, proxyKeys)
		)
		// 2. 支持 `xxx[?/xxx]/index` 通过 `xxx[?/xxx]` 请求
		if (indexReg.test(page.path)) {
			const _path = page.path.replace(indexReg, '$1')
			// `^/${_path}(/)?$`
			rewrites.push(createRewrite(`${_path}(/)?`, page, baseUrl, proxyKeys))
		}
	})
	// 3. 白名单，匹配到这些路径时不进行重定向, .e.g  /__unocss/, /__devtools__/, __vitest__
	rewrites.push({
		from: /^\/__\w+\/$/,
    to: ({ parsedUrl }) => parsedUrl.pathname as string
  })
	if (options.rewriteWhitelist instanceof RegExp) {
		rewrites.push({
			from: options.rewriteWhitelist,
			to: ({ parsedUrl }) => parsedUrl.pathname as string
		})
	}
	// 4. 支持 `/` 请求
	rewrites.push(createRewrite('', pages['index'] ?? {}, baseUrl, proxyKeys))

	return rewrites
}
