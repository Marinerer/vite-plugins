import type { HtmlTagDescriptor } from 'vite'
import type { TerserOptions } from 'vite-plugin-minify-html'

export interface PluginOptions {
	/**
	 * @description HTML file pattern
	 */
	include?: string | string[]

	/**
	 * @description Exclude HTML file pattern
	 */
	exclude?: string[]

	/**
	 * @description page file suffix
	 * @default 'html'
	 */
	suffix?: string | string[]

	/**
	 * @description Base path removed in build.
	 * @default 'src'
	 */
	base?: string

	/**
	 * @description Minify HTML
	 * @default true
	 */
	minify?: boolean | TerserOptions

	/**
	 * @description Transform HTML
	 */
	transform?: (
		html: string,
		ctx: { originalUrl?: string; path: string }
	) => Promise<string> | string

	/**
	 * @description Inject data and tags to HTML
	 */
	inject?: InjectOptions

	/**
	 * @description Static replace `vite.define` in HTML.
	 * @default true
	 */
	replaceDefine?: Boolean
}

export interface Pages {
	[path: string]: PageItem
}

interface PageItem {
	/**
	 * @description html file path
	 * @example 'src/pages/index.html'
	 */
	file: string

	/**
	 * @description access url
	 * @example 'index'
	 */
	path: string

	/**
	 * @description full path
	 * @example '/Workspace/src/pages/index.html'
	 */
	filePath: string

	/**
	 * @description output path
	 * @example 'dist/index.html'
	 */
	output: string
}

interface InjectOptions {
	/** use for template */
	data?: Record<string, any>
	/**
	 * html tags to inject
	 * @see https://cn.vitejs.dev/guide/api-plugin.html#vite-specific-hooks
	 */
	tags?: HtmlTagDescriptor[]
}
