import type { HtmlTagDescriptor } from 'vite'
import type { Options as MinifyOptions } from 'html-minifier-terser'

export interface PluginOptions {
	/**
	 * @description Base path removed in build.
	 * @default 'src'
	 */
	base?: string

	/**
	 * @description minify html
	 * @default true
	 */
	minify?: boolean | MinifyOptions

	/**
	 * @description transform html
	 */
	transform?: (
		html: string,
		ctx: { originalUrl?: string; path: string }
	) => Promise<string> | string

	/**
	 * @description inject data and tags to html
	 */
	inject?: InjectOptions
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
