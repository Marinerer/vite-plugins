import type { HtmlTagDescriptor } from 'vite'
import type { MinifyOptions } from 'vite-plugin-minify-html'
import type { Options as EjsOptions } from 'ejs'

/** plugin configurations */
export interface PageOptions {
	/**
	 * @description page configuration.
	 * @summary If string, the value is the page path
	 * @type {string | { path: PageConfig }}
	 */
	page?: string | Record<string, string | PageConfig>

	/**
	 * @description page entry.
	 * @type {string}
	 */
	entry?: string

	/**
	 * @description page template. as global html
	 * @type {string}
	 */
	template?: string

	/**
	 * @description page title.
	 * @summary when using title option, template title tag needs to be <title><%= pageHtmlVitePlugin.title %></title>
	 * @type {string}
	 */
	title?: string

	/**
	 * @description page data.
	 * @deprecated use inject.data instead.
	 * @type {Record<string, any>}
	 */
	data?: Record<string, any>

	/**
	 * @description minify html.
	 * @type {boolean | MinifyOptions}
	 * @default true
	 */
	minify?: boolean | MinifyOptions

	/**
	 * @description ejs options.
	 * @type {EjsOptions}
	 * @see https://github.com/mde/ejs#options
	 */
	ejsOptions?: EjsOptions

	/**
	 * @description inject data and tags to html.
	 * @type {InjectOptions}
	 */
	inject?: InjectOptions
}

/** page configurations */
export interface PageConfig {
	/**
	 * @description page entry.
	 * @type {string}
	 * @example 'src/main.ts'
	 */
	entry: string

	/**
	 * @description page template
	 * @type {string}
	 * @example 'index.html'
	 */
	template?: string

	/**
	 * @description page title.
	 * @type {string}
	 */
	title?: string

	/**
	 * @description inject data and tags to html.
	 * @type {InjectOptions}
	 */
	inject?: InjectOptions
}

/** SAP data */
export interface PageItem extends Required<PageConfig> {
	path: string
	template: string
	minify?: boolean | MinifyOptions
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
