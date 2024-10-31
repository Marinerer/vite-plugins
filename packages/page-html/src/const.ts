import { createFilter } from '@rollup/pluginutils'

export const PLUGIN_NAME = 'vite-plugin-page-html'
export const htmlFilter = createFilter(['**/*.html'])

export const bodyInjectRE = /<\/body>/
export const scriptRE =
	/<script(?=\s)(?=[^>]*type=["']module["'])(?=[^>]*src=["'][^"']*["'])[^>]*>([\s\S]*?)<\/script>/gi
