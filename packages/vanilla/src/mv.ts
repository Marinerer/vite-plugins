import path from 'pathe'
import * as fs from 'fs/promises'

// 定义映射表接口
interface IMappingTable {
	[key: string]: string
}

// 定义错误类型
class FileTransferError extends Error {
	constructor(
		message: string,
		public readonly cause?: Error
	) {
		super(message)
		this.name = 'FileTransferError'
	}
}

export class FileTransfer {
	private readonly baseDir: string
	private readonly mappingTable: IMappingTable

	constructor(mappingTable: IMappingTable, baseDir: string = '') {
		this.mappingTable = mappingTable
		this.baseDir = path.resolve(baseDir)
	}

	/**
	 * 获取文件的完整路径
	 * @param filePath 相对或绝对路径
	 * @returns 完整的文件路径
	 */
	private getFullPath(filePath: string): string {
		return path.isAbsolute(filePath) ? filePath : path.join(this.baseDir, filePath)
	}

	/**
	 * 检查目录是否为空
	 * @param dirPath 目录路径
	 * @returns 目录是否为空
	 */
	private async isDirEmpty(dirPath: string): Promise<boolean> {
		try {
			const files = await fs.readdir(dirPath)
			return files.length === 0
		} catch (error) {
			throw new FileTransferError(
				`Failed to check if directory ${dirPath} is empty`,
				error instanceof Error ? error : undefined
			)
		}
	}

	/**
	 * 递归删除空目录
	 * @param dirPath 目录路径
	 */
	private async removeEmptyDirs(dirPath: string): Promise<void> {
		try {
			const fullPath = this.getFullPath(dirPath)
			const isEmpty = await this.isDirEmpty(fullPath)

			if (isEmpty) {
				await fs.rmdir(fullPath)
				const parentDir = path.dirname(fullPath)

				// 检查父目录是否为空，但不超出基础目录
				if (parentDir !== fullPath && parentDir.startsWith(this.baseDir)) {
					await this.removeEmptyDirs(parentDir)
				}
			}
		} catch (error) {
			throw new FileTransferError(
				`Failed to remove empty directory ${dirPath}`,
				error instanceof Error ? error : undefined
			)
		}
	}

	/**
	 * 确保目录存在
	 * @param dirPath 目录路径
	 */
	private async ensureDir(dirPath: string): Promise<void> {
		try {
			await fs.access(dirPath)
		} catch {
			await fs.mkdir(dirPath, { recursive: true })
		}
	}

	/**
	 * 转移单个文件
	 * @param sourcePath 源文件路径
	 * @param targetPath 目标文件路径
	 */
	private async transferFile(sourcePath: string, targetPath: string): Promise<void> {
		const fullSourcePath = this.getFullPath(sourcePath)
		const fullTargetPath = this.getFullPath(targetPath)

		try {
			// 检查源文件是否存在
			await fs.access(fullSourcePath)

			// 如果源路径和目标路径相同，不执行转移
			if (path.resolve(fullSourcePath) === path.resolve(fullTargetPath)) {
				console.log(`Skipping transfer - source and target are identical: ${sourcePath}`)
				return
			}

			// 确保目标目录存在
			const targetDir = path.dirname(fullTargetPath)
			await this.ensureDir(targetDir)

			// 转移文件
			await fs.rename(fullSourcePath, fullTargetPath)
			console.log(`Successfully transferred: ${sourcePath} -> ${targetPath}`)

			// 删除源文件所在的空目录
			const sourceDir = path.dirname(fullSourcePath)
			await this.removeEmptyDirs(sourceDir)
		} catch (error) {
			throw new FileTransferError(
				`Failed to transfer file ${sourcePath}`,
				error instanceof Error ? error : undefined
			)
		}
	}

	/**
	 * 执行所有文件转移
	 * @throws {FileTransferError} 当文件转移过程中发生错误时
	 */
	public async execute(): Promise<void> {
		try {
			const transfers = Object.entries(this.mappingTable).map(([source, target]) =>
				this.transferFile(source, target)
			)

			await Promise.all(transfers)
			console.log('All file transfers completed successfully')
		} catch (error) {
			throw new FileTransferError(
				'File transfer process failed',
				error instanceof Error ? error : undefined
			)
		}
	}
}

export async function moveFile(mappingTable, baseDir = 'src') {
	const fileTransfer = new FileTransfer(mappingTable, baseDir)
	await fileTransfer.execute()
}
