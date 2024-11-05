import type { Plugin } from 'vite'
import { minify as minifyFn, Options as MinifyOptions } from 'html-minifier-terser'
import { createFilter } from '@rollup/pluginutils'

const PLUGIN_NAME = 'vite-plugin-minify-html'
const htmlFilter = createFilter(['**/*.html']) // 过滤html文件

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

export default function createMinifyPlugin(minify: boolean | MinifyOptions): Plugin {
	return {
		name: PLUGIN_NAME,
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

export { MinifyOptions }
