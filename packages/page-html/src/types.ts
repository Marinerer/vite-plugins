import type { HtmlTagDescriptor } from 'vite'
import type { Options as EjsOptions } from 'ejs'
import type { TerserOptions } from 'vite-plugin-minify-html'

/** plugin configurations */
export interface PluginOptions {
	/**
	 * @description page configuration.
	 * @summary If string, the value is the page path
	 */
	page?: string | Record<string, string | PageConfig>

	/**
	 * @description page entry.
	 */
	entry?: string

	/**
	 * @description page template. as global html
	 */
	template?: string

	/**
	 * @description page title.
	 * @summary when using title option, template title tag needs to be <title><%= pageHtmlVitePlugin.title %></title>
	 */
	title?: string

	/**
	 * @description page data.
	 * @deprecated use inject.data instead.
	 */
	data?: Record<string, any>

	/**
	 * @description minify html.
	 * @default true
	 */
	minify?: boolean | TerserOptions

	/**
	 * @description ejs options.
	 * @see https://github.com/mde/ejs#options
	 */
	ejsOptions?: EjsOptions

	/**
	 * @description inject data and tags to html.
	 */
	inject?: InjectOptions

	/**
	 * @description Whitelist, where no redirection is performed when matched to these paths
	 */
	rewriteWhitelist?: RegExp
}

/** page configurations */
export interface PageConfig {
	/**
	 * @description page entry.
	 * @example 'src/main.ts'
	 */
	entry: string

	/**
	 * @description page template
	 * @example 'index.html'
	 */
	template?: string

	/**
	 * @description page title.
	 */
	title?: string

	/**
	 * @description inject data and tags to html.
	 */
	inject?: InjectOptions
}

/** SAP data */
export interface PageItem extends Required<PageConfig> {
	path: string
	template: string
	ejsOptions?: EjsOptions
	inject: InjectOptions
}

/** MPA data */
export interface Pages {
	[key: string]: PageItem
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
