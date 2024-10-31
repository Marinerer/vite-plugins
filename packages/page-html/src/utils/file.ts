import { resolve } from 'pathe'
import fs from 'fs/promises'
import fse from 'fs-extra'
import { errlog } from './util'
import { Pages } from '../types'

export async function checkExistOfPath(p: string, root: string): Promise<string> {
	if (!p || p === '.' || p === './') return ''

	const paths = p.replace(root, '').split('/')
	if (paths[0] === '') paths.shift()
	if (paths.length === 0) return ''

	let result = ''
	try {
		for (let i = 0; i < paths.length; i++) {
			result = resolve(root, ...paths.slice(0, i + 1))
			await fs.access(result, fs.constants.F_OK)
		}
		return result
	} catch {
		return result
	}
}

export async function copyOneFile(src: string, dest: string, root: string): Promise<string> {
	try {
		const result = await checkExistOfPath(dest, root)
		await fse.copy(src, dest, { overwrite: false, errorOnExist: true })
		return result
	} catch {
		return ''
	}
}

export async function createVirtualHtml(pages: Pages, root?: string): Promise<string[]> {
	const _root = root ?? process.cwd()
	return Promise.all(
		Object.entries(pages).map(([_, page]) =>
			copyOneFile(resolve(_root, page.template), resolve(_root, `${page.path}.html`), _root)
		)
	)
}

export async function removeVirtualHtml(files: string[]): Promise<void> {
	if (!files?.length) return

	try {
		const uniqueFiles = Array.from(new Set(files.filter(Boolean)))
		await Promise.all(uniqueFiles.map((file) => fse.remove(file)))
	} catch (e: any) {
		errlog(e.message)
	}
}
