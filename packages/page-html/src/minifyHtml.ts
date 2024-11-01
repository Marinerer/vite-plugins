import { minify as minifyFn, Options as MinifyOptions } from 'html-minifier-terser'
import type { Plugin } from 'vite'
import { htmlFilter } from './const'
import { PageOptions } from './types'

function minifyOptions(options: true | MinifyOptions): MinifyOptions {
	const opts = options === true ? {} : options
	return {
		collapseWhitespace: true,
		keepClosingSlash: true,
		removeComments: true,
		removeRedundantAttributes: true,
		removeScriptTypeAttributes: true,
		removeStyleLinkTypeAttributes: true,
		useShortDoctype: true,
		minifyCSS: true,
		...opts,
	}
}

async function minifyHtml(html: string, minify: boolean | MinifyOptions): Promise<string> {
	if (typeof minify === 'boolean' && !minify) {
		return html
	}
	return await minifyFn(html, minifyOptions(minify))
}

export function createMinifyHtmlPlugin({ minify }: PageOptions = {}): Plugin {
	return {
		name: 'vite-plugin-minify-html',
		enforce: 'post' as const,
		// apply: 'build' as const,
		async generateBundle(_, outputBundle) {
			if (minify) {
				for (const bundle of Object.values(outputBundle)) {
					if (
						bundle.type === 'asset' &&
						htmlFilter(bundle.fileName) &&
						typeof bundle.source === 'string'
					) {
						bundle.source = await minifyHtml(bundle.source, minify)
					}
				}
			}
		},
	}
}
