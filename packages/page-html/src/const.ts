export const PLUGIN_NAME = 'vite-plugin-page-html'
export const bodyInjectRE = /<\/body>/
export const scriptRE =
	/<script(?=\s)(?=[^>]*type=["']module["'])(?=[^>]*src=["'][^"']*["'])[^>]*>([\s\S]*?)<\/script>/gi
