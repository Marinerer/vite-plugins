import { Plugin } from 'vite'
import { PageOptions } from './types'
import { createPageHtmlPlugin } from './pageHtml'
import createMinifyHtmlPlugin from 'vite-plugin-minify-html'

export default function createPlugin(pluginOptions: PageOptions = {}): Plugin[] {
	const plugins = [createPageHtmlPlugin(pluginOptions)]
	if (pluginOptions.minify) plugins.push(createMinifyHtmlPlugin(pluginOptions.minify))
	return plugins
}
