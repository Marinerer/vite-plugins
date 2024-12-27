import type { Plugin } from 'vite'
import { PluginOptions } from './types'
import createMinifyPlugin from 'vite-plugin-minify-html'
import { createVanillaPlugin } from './vanillaPlugin'

export default function createPlugin(options: string | string[] | PluginOptions = {}): Plugin[] {
	const opts = Object.assign({ minify: true }, options)
	const plugins = [createVanillaPlugin(opts)]
	if (opts.minify) {
		plugins.push(createMinifyPlugin(opts.minify))
	}
	return plugins
}
