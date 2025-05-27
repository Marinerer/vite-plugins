import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import fse from 'fs-extra';
import { createVirtualHtml, removeVirtualHtml, checkExistOfPath, copyOneFile } from '../src/utils/file';
import type { Pages } from '../src/types';
import { resolve } from 'pathe';

// Mock fs-extra
vi.mock('fs-extra', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    copy: vi.fn(),
    remove: vi.fn(),
    ensureDir: vi.fn(() => Promise.resolve()), // Common utility, mock if used
  };
});

// Mock fs/promises
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    access: vi.fn(),
  };
});

const mockRoot = '/mock/project/root';

describe('file utility functions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('checkExistOfPath', () => {
    it('should return empty for invalid paths', async () => {
      expect(await checkExistOfPath('', mockRoot)).toBe('');
      expect(await checkExistOfPath('.', mockRoot)).toBe('');
      expect(await checkExistOfPath('./', mockRoot)).toBe('');
    });

    it('should return the path if it exists', async () => {
      (fs.access as vi.Mock).mockResolvedValue(undefined);
      const path = 'some/existing/path';
      const fullPath = resolve(mockRoot, path);
      expect(await checkExistOfPath(path, mockRoot)).toBe(fullPath);
      expect(fs.access).toHaveBeenCalledWith(resolve(mockRoot, 'some'), fs.constants.F_OK);
      expect(fs.access).toHaveBeenCalledWith(resolve(mockRoot, 'some/existing'), fs.constants.F_OK);
      expect(fs.access).toHaveBeenCalledWith(fullPath, fs.constants.F_OK);
    });

    it('should return the partially existing path if full path does not exist', async () => {
      (fs.access as vi.Mock)
        .mockResolvedValueOnce(undefined) // /mock/project/root/some exists
        .mockRejectedValueOnce(new Error('ENOENT')); // /mock/project/root/some/nonexistent does not
      const path = 'some/nonexistent/file';
      expect(await checkExistOfPath(path, mockRoot)).toBe(resolve(mockRoot, 'some/nonexistent'));
    });
  });

  describe('copyOneFile', () => {
    it('should copy a file if destination does not exist or overwrite is allowed', async () => {
      (fs.access as vi.Mock).mockResolvedValue(undefined); // Simulates path check success
      (fse.copy as vi.Mock).mockResolvedValue(undefined);
      const src = resolve(mockRoot, 'template.html');
      const dest = resolve(mockRoot, 'output.html');
      await copyOneFile(src, dest, mockRoot);
      expect(fse.copy).toHaveBeenCalledWith(src, dest, { overwrite: false, errorOnExist: true });
    });

    it('should return empty string if copy fails', async () => {
      (fs.access as vi.Mock).mockResolvedValue(undefined);
      (fse.copy as vi.Mock).mockRejectedValue(new Error('Copy failed'));
      const src = resolve(mockRoot, 'template.html');
      const dest = resolve(mockRoot, 'output.html');
      expect(await copyOneFile(src, dest, mockRoot)).toBe('');
    });
  });

  describe('createVirtualHtml', () => {
    it('should attempt to copy files for each page entry', async () => {
      (fs.access as vi.Mock).mockResolvedValue(undefined); // Mock path check
      (fse.copy as vi.Mock).mockResolvedValue(undefined); // Mock copy success

      const pages: Pages = {
        index: { path: 'index', template: 'templates/main.html', entry: '', title: '', inject: {}, ejsOptions: {} },
        admin: { path: 'admin', template: 'templates/admin.html', entry: '', title: '', inject: {}, ejsOptions: {} },
      };
      await createVirtualHtml(pages, mockRoot);

      expect(fse.copy).toHaveBeenCalledTimes(2);
      expect(fse.copy).toHaveBeenCalledWith(
        resolve(mockRoot, 'templates/main.html'),
        resolve(mockRoot, 'index.html'),
        { overwrite: false, errorOnExist: true }
      );
      expect(fse.copy).toHaveBeenCalledWith(
        resolve(mockRoot, 'templates/admin.html'),
        resolve(mockRoot, 'admin.html'),
        { overwrite: false, errorOnExist: true }
      );
    });

    it('should return an array of destination paths that were attempted', async () => {
      // Simulate that checkExistOfPath returns the dest path for the copy function
      // For createVirtualHtml, the important part is that copyOneFile is called.
      // copyOneFile itself calls checkExistOfPath, so we're indirectly testing it.
      // We assume copyOneFile returns the destination path string on success.
      (fse.copy as vi.Mock).mockImplementation((src, dest) => Promise.resolve(dest));
       vi.mocked(fs.access).mockImplementation((path) => {
        // Allow all paths for this specific test of createVirtualHtml
        return Promise.resolve();
      });


      const pages: Pages = {
        page1: { path: 'page1', template: 't1.html', entry: '', title: '', inject: {}, ejsOptions: {} },
        page2: { path: 'page2', template: 't2.html', entry: '', title: '', inject: {}, ejsOptions: {} },
      };
      const results = await createVirtualHtml(pages, mockRoot);

      // This expectation depends on the mock of copyOneFile.
      // If copyOneFile is mocked to return the destination path upon successful copy:
      expect(results).toContain(resolve(mockRoot, 'page1.html'));
      expect(results).toContain(resolve(mockRoot, 'page2.html'));
    });
  });

  describe('removeVirtualHtml', () => {
    it('should not do anything if no files are provided', async () => {
      await removeVirtualHtml([]);
      expect(fse.remove).not.toHaveBeenCalled();
    });

    it('should call fse.remove for each unique, non-empty file path', async () => {
      const files = [
        resolve(mockRoot, 'file1.html'),
        resolve(mockRoot, 'file2.html'),
        resolve(mockRoot, 'file1.html'), // duplicate
        '', // empty
        null, // null, should be filtered
      ];
      // @ts-ignore
      await removeVirtualHtml(files);
      expect(fse.remove).toHaveBeenCalledTimes(2);
      expect(fse.remove).toHaveBeenCalledWith(resolve(mockRoot, 'file1.html'));
      expect(fse.remove).toHaveBeenCalledWith(resolve(mockRoot, 'file2.html'));
    });

    it('should log an error if fse.remove fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // Mock console.error if errlog uses it
      const errlogSpy = vi.spyOn(import('../src/utils/util'), 'errlog').mockImplementation(() => {});


      (fse.remove as vi.Mock).mockRejectedValueOnce(new Error('Deletion failed'));
      const files = [resolve(mockRoot, 'file1.html')];
      await removeVirtualHtml(files);
      expect(errlogSpy).toHaveBeenCalledWith('Deletion failed');
      
      consoleErrorSpy.mockRestore();
      errlogSpy.mockRestore();
    });
  });
});
