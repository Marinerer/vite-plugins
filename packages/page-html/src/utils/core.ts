import ejs from 'ejs'
import { resolve } from 'pathe'
import { ResolvedConfig } from 'vite'
import { Pages, PageConfig, PageOptions, PageItem } from '../types'
import { errlog, cleanPageUrl } from './util'
import { bodyInjectRE, scriptRE } from '../const'

type HistoryRewrite = { from: RegExp; to: any }[]

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
export function createPage(options: PageOptions = {}): Pages {
	const {
		page = 'index',
		entry = 'src/main.js',
		template = 'index.html',
		title = 'Vite App',
		data = {},
		minify = true,
		ejsOptions = {},
		inject = {},
	} = options

	const defaults: Omit<PageItem, 'path'> = {
		entry,
		template,
		title,
		minify: minify as boolean,
		ejsOptions,
		inject: {
			data: inject.data ?? data, //! 待移除 data
			tags: inject.tags ?? [],
		},
	}

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
				path: pageUrl,
			} as PageItem
		})
	}

	return pages
}

export function createRewrites(pages: Pages, baseUrl: string): HistoryRewrite {
	const rewrites: HistoryRewrite = []
	const indexReg = /(\S+)(\/index\/?)$/

	Object.entries(pages).forEach(([_, page]) => {
		// 1. 支持 `xxx`, `xxx/xxx`, `xxx[?/xxx].html`, `xxx[?/index.html]` 请求
		rewrites.push({
			from: new RegExp(`^/${page.path}((/)|(\\.html?)|(/index\\.html?))?$`, 'i'),
			to: ({ parsedUrl }) => resolve(baseUrl, page.template),
		})
		// 2. 支持 `xxx[?/xxx]/index` 通过 `xxx[?/xxx]` 请求
		if (indexReg.test(page.path)) {
			const _path = page.path.replace(indexReg, '$1')
			rewrites.push({
				from: new RegExp(`^/${_path}(/)?$`, 'i'),
				to: ({ parsedUrl }) => resolve(baseUrl, page.template),
			})
		}
	})
	// 3. 支持 `/` 请求
	rewrites.push({
		from: /^\/$/,
		to: ({ parsedUrl }) => {
			const page = pages['index']
			return page ? resolve(baseUrl, page.template) : '/'
		},
	})

	return rewrites
}