import { Plugin } from 'vite'
import { PageOptions } from './types'
import { createPageHtmlPlugin } from './pageHtml'
import { createMinifyHtmlPlugin } from './minifyHtml'

export default function createPlugin(pluginOptions: PageOptions = {}): Plugin[] {
	return [createPageHtmlPlugin(pluginOptions), createMinifyHtmlPlugin(pluginOptions)]
}
