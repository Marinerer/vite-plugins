import * as vite from 'vite'
import { PLUGIN_NAME } from '../const'
import { error as errorLog, colors } from 'diy-log'

export function errlog(...args: any[]): void {
	errorLog(`[${colors.gray(PLUGIN_NAME)}] `, ...args)
}

export function getViteVersion(): number {
	return vite?.version ? Number(vite.version.split('.')[0]) : 2
}

/**
 * 清除 URL 中的 query 和 hash
 * 如果 URL 为空，则返回默认的 '/'。
 *
 * @param url - 要清理的 URL。
 * @returns 清理后的 URL。
 */
export function cleanUrl(url: string): string {
	if (!url) return '/'
	const queryRE = /\?.*$/s //`?` 查询部分
	const hashRE = /#.*$/s //`#` 哈希部分
	return url.replace(hashRE, '').replace(queryRE, '')
}

/**
 * 清除页面 URL 中的开头/结尾的`/`和`.html`后缀
 * @param path - 要清理的 URL 路径
 * @returns 清理后的 URL 路径
 */
export function cleanPageUrl(path: string): string {
	return path.replace(/(^\/)|(\/$)/g, '').replace(/\.htm(l)?$/i, '')
}

/**
 * 创建页面名称
 * 比如将 `path/to/page`转为 `pathToPage`
 * @param path - 页面路径
 * @returns 页面名称
 */
export function createPageName(path: string): string {
	const paths = path.split('/')
	return paths.length > 1
		? paths.reduce((res, p) => (res === '' ? p : res + p.charAt(0).toUpperCase() + p.slice(1)), '')
		: path
}
