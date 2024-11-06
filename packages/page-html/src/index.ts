import { Plugin } from 'vite'
import { PluginOptions } from './types'
import { createPagePlugin } from './pagePlugin'
import createMinifyPlugin from 'vite-plugin-minify-html'

export default function createPlugin(pluginOptions: PluginOptions = {}): Plugin[] {
	const opts = Object.assign({ minify: true }, pluginOptions)
	const plugins = [createPagePlugin(opts)]
	if (opts.minify) {
		plugins.push(createMinifyPlugin(opts.minify))
	}
	return plugins
}
