import ejs from 'ejs'
import { resolve } from 'pathe'
import { ResolvedConfig, normalizePath } from 'vite'
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
	return async function (html: string, data: PageItem = {} as PageItem): Promise<string> {
		try {
			const ejsData = {
				...extendData,
				pageHtmlVitePlugin: {
					title: data?.title,
					entry: data?.entry,
					data: data?.inject.data,
				},
				...data,
			}
			let result = await ejs.render(html, ejsData, ejsOptions)
			if (data?.entry) {
				// 1. 移除html中已有的 script[type=module] 标签
				// 2. 向html中注入 data.entry 文件
				result = result
					.replace(scriptRE, '')
					.replace(
						bodyInjectRE,
						`<script type="module" src="${normalizePath(data.entry)}"></script>\n</body>`
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
		data = {},
		ejsOptions = {},
		inject = {},
	} = options

	const defaults: Omit<PageItem, 'path'> = {
		entry: entry as string,
		template,
		title,
		ejsOptions,
		inject: {
			data: inject.data ?? data,
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

			if (typeof pageItem === 'string') {
				pageItem = { entry: pageItem }
			}

			pages[pageUrl] = {
				...defaults,
				...pageItem,
				inject: {
					...defaults.inject,
					...(pageItem.inject ?? {}),
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
function createRewire(
	reg: string | RegExp,
	page: PageItem,
	baseUrl: string,
	proxyKeys: string[],
	whitelist?: RegExp[]
): Rewrite {
	const from = typeof reg === 'string' ? new RegExp(`^/${reg}*`) : reg
	return {
		from,
		to: ({ parsedUrl }) => {
			const pathname = parsedUrl.path as string
			const excludeBaseUrl = pathname.replace(baseUrl, '/') // 去掉baseUrl
			const template = resolve(baseUrl, page.template)

			// 静态资源
			if (excludeBaseUrl.startsWith('/static')) {
				return excludeBaseUrl
			}
			// 首页
			if (excludeBaseUrl === '/') {
				return template
			}
			// 白名单
			if (whitelist?.some((reg) => reg.test(excludeBaseUrl))) {
				return pathname
			}
			const isProxyPath = proxyKeys.some((key) => pathname.startsWith(resolve(baseUrl, key)))
			return isProxyPath ? pathname : template
		},
	}
}

function createWhitelist(rewrites?: string | RegExp | (RegExp | string)[]): RegExp[] {
	//默认暴力过滤掉一些路径，比如 `/__unocss/, /__devtools__/, __vitest__`
	const result = [/^\/__\w+\/$/]
	if (rewrites) {
		rewrites = Array.isArray(rewrites) ? rewrites : [rewrites]
		for (const reg of rewrites) {
			result.push(typeof reg === 'string' ? new RegExp(reg) : reg)
		}
	}
	return result
}

/**
 * 生成重写规则
 */
export function createRewrites(
	pages: Pages,
	viteConfig: ResolvedConfig,
	options: PluginOptions = {}
): Rewrite[] {
	const rewrites: Rewrite[] = []
	const baseUrl = viteConfig.base ?? '/'
	const proxyKeys = Object.keys(viteConfig.server?.proxy ?? {})
	const whitelist = createWhitelist(options.rewriteWhitelist)

	// 1. 匹配页面，支持 `xxx`, `xxx/xxx`, `xxx[?/xxx].html`, `xxx[?/index.html]` 访问
	Object.entries(pages).forEach(([_, page]) => {
		const reg = new RegExp(`${page.path}(\\/|\\.html|\\/index\\.html)?$`, 'i')
		rewrites.push(createRewire(reg, page, baseUrl, proxyKeys, whitelist))
	})
	// 2. 支持 `/` 请求
	rewrites.push(createRewire('', pages['index'] ?? {}, baseUrl, proxyKeys, whitelist))

	return rewrites
}
