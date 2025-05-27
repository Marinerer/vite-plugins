import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { createPagePlugin } from '../src/pagePlugin';
import { createPage, compileHtml, createRewrites } from '../src/utils/core';
import { createVirtualHtml, removeVirtualHtml } from '../src/utils/file';
import type { PluginOptions, Pages, PageItem } from '../src/types';
import type { ResolvedConfig, HtmlTagDescriptor, IndexHtmlTransformResult, IndexHtmlTransformContext, Connect, Plugin } from 'vite';
import historyFallback from 'connect-history-api-fallback';
import ejs from 'ejs';
import { getViteVersion } from '../src/utils/util';

// Mock dependencies
vi.mock('../src/utils/file', () => ({
  createVirtualHtml: vi.fn(),
  removeVirtualHtml: vi.fn(),
}));
vi.mock('connect-history-api-fallback');
vi.mock('ejs');
vi.mock('../src/utils/util', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    getViteVersion: vi.fn(),
    errlog: vi.fn(), // Mock errlog to prevent console output during tests
    cleanPageUrl: actual.cleanPageUrl, // Use actual implementation
    cleanUrl: actual.cleanUrl, // Use actual implementation
  };
});


const mockViteConfigBase: Partial<ResolvedConfig> = {
  base: '/',
  root: '/project',
  env: { DEV: true },
  server: { proxy: {} },
  build: { rollupOptions: {} },
};

describe('createPagePlugin', () => {
  let mockPlugin: Plugin;
  let mockViteConfig: ResolvedConfig;

  beforeEach(() => {
    vi.resetAllMocks();
    (getViteVersion as vi.Mock).mockReturnValue(5); // Default to Vite 5+
    (createVirtualHtml as vi.Mock).mockResolvedValue([]);
    (ejs.render as vi.Mock).mockImplementation((html, data) => {
      let output = html;
      if (data.pageHtmlVitePlugin.title) {
        output = output.replace(/<title>(.*?)<\/title>/, `<title>${data.pageHtmlVitePlugin.title}</title>`);
      }
      if (data.pageHtmlVitePlugin.data && data.pageHtmlVitePlugin.data.someValue) {
        output = output.replace('<!-- data_placeholder -->', `<div>${data.pageHtmlVitePlugin.data.someValue}</div>`);
      }
      if (data.pageHtmlVitePlugin.entry) {
         output = output.replace('</body>', `<script type="module" src="${data.pageHtmlVitePlugin.entry}"></script></body>`);
      }
      return Promise.resolve(output);
    });
  });

  describe('Plugin Initialization and Configuration', () => {
    it('should return a plugin object with correct name and enforce', () => {
      const plugin = createPagePlugin();
      expect(plugin.name).toBe('vite-plugin-page-html');
      expect(plugin.enforce).toBe('pre');
    });

    it('should correctly configure rollup input for build (SPA)', async () => {
      const options: PluginOptions = { entry: 'src/main.ts', template: 'template.html' };
      mockPlugin = createPagePlugin(options);
      const userConfig = {};
      // @ts-ignore
      const newConfig = await mockPlugin.config?.(userConfig, { command: 'build', mode: 'production' });
      expect(newConfig?.build?.rollupOptions?.input).toEqual({ index: 'index.html' });
    });

     it('should correctly configure rollup input for build (MPA)', async () => {
      const options: PluginOptions = {
        page: {
          main: 'src/main.ts',
          admin: { entry: 'src/admin.ts', template: 'admin-template.html' },
        }
      };
      mockPlugin = createPagePlugin(options);
      const userConfig = {};
      // @ts-ignore
      const newConfig = await mockPlugin.config?.(userConfig, { command: 'build', mode: 'production' });
      expect(newConfig?.build?.rollupOptions?.input).toEqual({
        main: 'main.html',
        admin: 'admin.html',
      });
    });


    it('should call createVirtualHtml during build and removeVirtualHtml on closeBundle', async () => {
      const virtualFiles = ['/project/index.html'];
      (createVirtualHtml as vi.Mock).mockResolvedValue(virtualFiles);
      mockPlugin = createPagePlugin({ entry: 'src/main.ts' });
      mockViteConfig = { ...mockViteConfigBase, command: 'build' } as ResolvedConfig;
      // @ts-ignore
      await mockPlugin.configResolved?.(mockViteConfig);
      expect(createVirtualHtml).toHaveBeenCalled();
      // @ts-ignore
      await mockPlugin.closeBundle?.();
      expect(removeVirtualHtml).toHaveBeenCalledWith(virtualFiles);
    });
  });

  describe('EJS Templating and HTML Transformation', () => {
    const simpleHtml = '<!DOCTYPE html><html><head><title>Old Title</title></head><body><!-- data_placeholder --></body></html>';

    beforeEach(async () => {
        mockPlugin = createPagePlugin({
            entry: '/src/entry.ts', // SPA default
            title: 'Default Title',
            inject: { data: { defaultKey: 'defaultValue' } },
        });
        mockViteConfig = { ...mockViteConfigBase, command: 'serve' } as ResolvedConfig;
        // @ts-ignore
        await mockPlugin.configResolved?.(mockViteConfig); // This initializes `renderHtml`
    });

    it('should inject title correctly', async () => {
      const ctx: IndexHtmlTransformContext = { path: '/index.html', originalUrl: '/index.html', filename: '/project/index.html' };
      // @ts-ignore
      const result = await mockPlugin.transformIndexHtml?.handler(simpleHtml, ctx) as IndexHtmlTransformResult;
      expect(result.html).toContain('<title>Default Title</title>');
    });

    it('should inject entry script correctly', async () => {
      const ctx: IndexHtmlTransformContext = { path: '/index.html', originalUrl: '/index.html', filename: '/project/index.html' };
       // @ts-ignore
      const result = await mockPlugin.transformIndexHtml?.handler(simpleHtml, ctx) as IndexHtmlTransformResult;
      expect(result.html).toContain('<script type="module" src="/src/entry.ts"></script></body>');
    });

    it('should make inject.data available in EJS template', async () => {
      mockPlugin = createPagePlugin({
        entry: '/src/entry.ts',
        inject: { data: { someValue: 'Injected Value' } }
      });
      // @ts-ignore
      await mockPlugin.configResolved?.(mockViteConfig);
      const ctx: IndexHtmlTransformContext = { path: '/index.html', originalUrl: '/index.html', filename: '/project/index.html' };
      // @ts-ignore
      const result = await mockPlugin.transformIndexHtml?.handler(simpleHtml, ctx) as IndexHtmlTransformResult;
      expect(result.html).toContain('<div>Injected Value</div>');
    });

    it('should prioritize inject.data over deprecated data option', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockPlugin = createPagePlugin({
        entry: '/src/entry.ts',
        data: { someValue: 'Deprecated Value', otherOld: 'val' }, // Deprecated
        inject: { data: { someValue: 'Injected Value', newKey: 'val2' } }
      });
       // @ts-ignore
      await mockPlugin.configResolved?.(mockViteConfig); // Re-initialize with new options

      // The createPage function (called internally by createPagePlugin) handles the data merging.
      // We check if the ejs.render mock receives the correctly prioritized data.
      const internalPagesRepresentation = createPage({
        entry: '/src/entry.ts',
        data: { someValue: 'Deprecated Value', otherOld: 'val' },
        inject: { data: { someValue: 'Injected Value', newKey: 'val2' } }
      });


      const ctx: IndexHtmlTransformContext = { path: '/index.html', originalUrl: '/index.html', filename: '/project/index.html' };
      // @ts-ignore
      await mockPlugin.transformIndexHtml?.handler(simpleHtml, ctx);

      expect(ejs.render).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        pageHtmlVitePlugin: expect.objectContaining({
          data: { someValue: 'Injected Value', newKey: 'val2' }
        })
      }), expect.any(Object));
      // consoleWarnSpy.mockRestore(); // TODO: Add warning for deprecated data
    });


    it('should use deprecated data if inject.data is not present', async () => {
        mockPlugin = createPagePlugin({
            entry: '/src/entry.ts',
            data: { someValue: 'From Deprecated Data' } // Deprecated
        });
        // @ts-ignore
        await mockPlugin.configResolved?.(mockViteConfig);

        const ctx: IndexHtmlTransformContext = { path: '/index.html', originalUrl: '/index.html', filename: '/project/index.html' };
        // @ts-ignore
        await mockPlugin.transformIndexHtml?.handler(simpleHtml, ctx);
        expect(ejs.render).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            pageHtmlVitePlugin: expect.objectContaining({
                data: { someValue: 'From Deprecated Data' }
            })
        }), expect.any(Object));
    });


    it('should inject tags from inject.tags', async () => {
      const tags: HtmlTagDescriptor[] = [{ tag: 'meta', attrs: { name: 'description', content: 'Test page' } }];
      mockPlugin = createPagePlugin({
        entry: '/src/entry.ts',
        inject: { tags }
      });
      // @ts-ignore
      await mockPlugin.configResolved?.(mockViteConfig);
      const ctx: IndexHtmlTransformContext = { path: '/index.html', originalUrl: '/index.html', filename: '/project/index.html' };
      // @ts-ignore
      const result = await mockPlugin.transformIndexHtml?.handler(simpleHtml, ctx) as IndexHtmlTransformResult;
      expect(result.tags).toEqual(tags);
    });

    it('should handle MPA transformations correctly', async () => {
        mockPlugin = createPagePlugin({
            page: {
                main: { entry: '/src/main.ts', title: 'Main Page', inject: { data: { page: 'main' } } },
                admin: { entry: '/src/admin.ts', template: 'admin.html', title: 'Admin Page', inject: { data: { page: 'admin' } } }
            }
        });
        // @ts-ignore
        await mockPlugin.configResolved?.(mockViteConfig);

        // Test main page
        const mainCtx: IndexHtmlTransformContext = { path: '/main.html', originalUrl: '/main.html', filename: '/project/main.html' };
        // @ts-ignore
        let result = await mockPlugin.transformIndexHtml?.handler(simpleHtml, mainCtx) as IndexHtmlTransformResult;
        expect(result.html).toContain('<title>Main Page</title>');
        expect(result.html).toContain('<script type="module" src="/src/main.ts"></script>');
        expect(ejs.render).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            pageHtmlVitePlugin: expect.objectContaining({ data: { page: 'main' }, title: 'Main Page' })
        }), {});


        // Test admin page
        const adminSimpleHtml = '<!DOCTYPE html><html><head><title>Admin</title></head><body></body></html>';
        const adminCtx: IndexHtmlTransformContext = { path: '/admin.html', originalUrl: '/admin.html', filename: '/project/admin.html' };
        // @ts-ignore
        result = await mockPlugin.transformIndexHtml?.handler(adminSimpleHtml, adminCtx) as IndexHtmlTransformResult;
        expect(result.html).toContain('<title>Admin Page</title>');
        expect(result.html).toContain('<script type="module" src="/src/admin.ts"></script>');
         expect(ejs.render).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            pageHtmlVitePlugin: expect.objectContaining({ data: { page: 'admin' }, title: 'Admin Page' })
        }), {});
    });

     it('should use correct transformIndexHtml for Vite < 5', async () => {
      (getViteVersion as vi.Mock).mockReturnValue(4);
      mockPlugin = createPagePlugin({ entry: 'src/main.ts' });
      // @ts-ignore
      expect(mockPlugin.transformIndexHtml?.enforce).toBe('pre');
      // @ts-ignore
      expect(typeof mockPlugin.transformIndexHtml?.transform).toBe('function');
    });

    it('should use correct transformIndexHtml for Vite >= 5', async () => {
      (getViteVersion as vi.Mock).mockReturnValue(5);
      mockPlugin = createPagePlugin({ entry: 'src/main.ts' });
      // @ts-ignore
      expect(mockPlugin.transformIndexHtml?.order).toBe('pre');
      // @ts-ignore
      expect(typeof mockPlugin.transformIndexHtml?.handler).toBe('function');
    });

  });

  describe('Server Configuration and History Fallback', () => {
    it('should configure connect-history-api-fallback middleware', async () => {
      mockPlugin = createPagePlugin({ entry: 'src/main.ts' });
      mockViteConfig = { ...mockViteConfigBase, command: 'serve' } as ResolvedConfig;
      // @ts-ignore
      await mockPlugin.configResolved?.(mockViteConfig);

      const mockServer: Connect.Server = { middlewares: { use: vi.fn() } } as any;
      // @ts-ignore
      mockPlugin.configureServer?.(mockServer);

      expect(historyFallback).toHaveBeenCalled();
      expect(mockServer.middlewares.use).toHaveBeenCalledWith(expect.any(Function));

      // Check if rewrites are passed (simplified check)
      const historyFallbackOptions = (historyFallback as Mocked<any>).mock.calls[0][0];
      expect(historyFallbackOptions.rewrites).toBeDefined();
      expect(Array.isArray(historyFallbackOptions.rewrites)).toBe(true);
    });
  });
});
