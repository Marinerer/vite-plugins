import type { Plugin } from 'vite'
import { PluginOptions } from './types'
import createMinifyPlugin from 'vite-plugin-minify-html'
import { createVanillaPlugin } from './vanillaPlugin'

export default function createPlugin(
	pages: string | string[],
	options: PluginOptions = {}
): Plugin[] {
	const opts = Object.assign({ minify: true }, options)
	const plugins = [createVanillaPlugin(pages, opts)]
	if (opts.minify) {
		plugins.push(createMinifyPlugin(opts.minify))
	}
	return plugins
}
