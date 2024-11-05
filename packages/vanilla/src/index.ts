import type { Plugin } from 'vite'
import { PluginOptions } from './types'
import createMinifyPlugin from 'vite-plugin-minify-html'
import { createVanillaPlugin } from './vanillaPlugin'

export default function createPlugin(
	pagesPatterns: string | string[],
	options: PluginOptions = {}
): Plugin[] {
	const plugins = [createVanillaPlugin(pagesPatterns, options)]
	if (options.minify) {
		plugins.push(createMinifyPlugin(options.minify))
	}
  return plugins
}
