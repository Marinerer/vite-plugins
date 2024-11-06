import type { HtmlTagDescriptor } from 'vite'
import type { Options as MinifyOptions } from 'html-minifier-terser'

export interface PluginOptions {
	baseDir?: string
	minify?: boolean | MinifyOptions
	compiler?: (html: string, ctx: { originalUrl: string; path: string }) => Promise<string> | string
	inject?: InjectOptions
}

export interface Pages {
	[path: string]: PageItem
}

interface PageItem {
	file: string
	path: string
	filePath: string
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
