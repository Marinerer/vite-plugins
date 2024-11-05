export const htmlRE = /\.htm(l)?$/i

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
	return path.replace(/(^\/)|(\/$)/g, '').replace(htmlRE, '')
}
