import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { createVanillaPlugin } from '../src/vanillaPlugin';
import type { PluginOptions } from '../src/types';
import type { ResolvedConfig, UserConfig, Plugin } from 'vite';
import glob from 'fast-glob';
import path from 'pathe';
import fs from 'fs/promises';
import { moveFile } from 'mv-file';
import { getViteVersion } from '../src/utils';


// Mock dependencies
vi.mock('fast-glob');
vi.mock('fs/promises');
vi.mock('mv-file');
vi.mock('../src/utils', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    getViteVersion: vi.fn(),
    errlog: vi.fn(), // Mock errlog to prevent console output during tests
  };
});

const mockViteConfigBase: Partial<ResolvedConfig> = {
  root: '/project',
  base: '/', // Vite's base URL, not plugin's base option for file paths
  define: {},
  build: { outDir: 'dist', rollupOptions: {} },
  // ... other necessary ResolvedConfig properties
};


describe('createVanillaPlugin', () => {
  let mockPlugin: Plugin;
  let mockUserConfig: UserConfig;
  let mockResolvedConfig: ResolvedConfig;

  beforeEach(() => {
    vi.resetAllMocks();
    (getViteVersion as vi.Mock).mockReturnValue(5); // Default to Vite 5+
    (glob.sync as vi.Mock).mockReturnValue([]); // Default mock for glob.sync
    mockUserConfig = {};
    mockResolvedConfig = { ...mockViteConfigBase } as ResolvedConfig;
  });

  describe('Plugin Initialization and HTML File Discovery (config hook)', () => {
    it('should return a plugin object with correct name', () => {
      mockPlugin = createVanillaPlugin();
      expect(mockPlugin.name).toBe('vite-plugin-vanilla');
    });

    it('should discover HTML files based on default options', () => {
      const htmlFiles = ['src/index.html', 'src/about.html'];
      (glob.sync as vi.Mock).mockReturnValue(htmlFiles);
      mockPlugin = createVanillaPlugin();
      // @ts-ignore
      const newConfig = mockPlugin.config?.(mockUserConfig, { command: 'build', mode: 'production' });
      
      expect(glob.sync).toHaveBeenCalledWith('src/**/*.html', { ignore: [] });
      expect(newConfig?.appType).toBe('mpa');
      expect(newConfig?.build?.rollupOptions?.input).toEqual({
        'index': path.resolve('/project/src/index.html'),
        'about': path.resolve('/project/src/about.html'),
      });
    });

    it('should use custom include, exclude, base, and suffix options', () => {
      const htmlFiles = ['pages/home.htm', 'pages/contact.htm'];
      (glob.sync as vi.Mock).mockReturnValue(htmlFiles);
      const options: PluginOptions = {
        include: 'pages/**/*.htm',
        exclude: ['pages/admin.htm'],
        suffix: 'htm',
        base: 'pages', // Plugin's base option for structuring output
      };
      mockPlugin = createVanillaPlugin(options);
       // @ts-ignore
      const newConfig = mockPlugin.config?.(mockUserConfig, { command: 'build', mode: 'production' });

      expect(glob.sync).toHaveBeenCalledWith('pages/**/*.htm', { ignore: ['pages/admin.htm'] });
      expect(newConfig?.appType).toBe('mpa');
      // Relative path from project root + 'pages' (plugin base) to the file
      // Output path should be relative to plugin's 'base'
      expect(newConfig?.build?.rollupOptions?.input).toEqual({
        'home': path.resolve('/project/pages/home.htm'), // Input path is always absolute
        'contact': path.resolve('/project/pages/contact.htm'),
      });
    });

     it('should handle different project root correctly', () => {
      const htmlFiles = ['src/index.html'];
      (glob.sync as vi.Mock).mockReturnValue(htmlFiles);
      mockPlugin = createVanillaPlugin();
      const userConfigWithRoot = { root: '/custom/root' };
      // @ts-ignore
      const newConfig = mockPlugin.config?.(userConfigWithRoot, { command: 'build', mode: 'production' });
      
      expect(glob.sync).toHaveBeenCalledWith('src/**/*.html', { ignore: [] });
      expect(newConfig?.build?.rollupOptions?.input).toEqual({
        'index': path.resolve('/custom/root/src/index.html'),
      });
    });

    it('should correctly structure output paths when plugin base is nested', () => {
      // Scenario: project root is /project, plugin base is src/pages
      // An HTML file is at /project/src/pages/user/profile.html
      // Expected output in dist: user/profile.html
      const htmlFiles = ['src/pages/user/profile.html'];
      (glob.sync as vi.Mock).mockReturnValue(htmlFiles);
      const options: PluginOptions = {
        include: 'src/pages/**/*.html',
        base: 'src/pages',
      };
      mockPlugin = createVanillaPlugin(options);
      // @ts-ignore
      mockPlugin.config?.(mockUserConfig, { command: 'build', mode: 'production' });
      // @ts-ignore
      mockPlugin.configResolved?.(mockResolvedConfig); // to set viteConfig for closeBundle

      // The input path for Rollup should be absolute
      // The `htmlPages` internal store is what matters for `closeBundle` output path calculation
      // We will test `closeBundle` separately to check the `page.output` logic
      // For now, just verify glob and input are as expected.
      expect(glob.sync).toHaveBeenCalledWith('src/pages/**/*.html', { ignore: [] });
      expect(mockUserConfig.build?.rollupOptions?.input).toEqual({
         'user/profile': path.resolve('/project/src/pages/user/profile.html'),
      });
    });
  });

  describe('replaceDefine and transform option (transformIndexHtml hook)', () => {
    beforeEach(() => {
      mockResolvedConfig = {
        ...mockViteConfigBase,
        define: {
          __APP_VERSION__: '"1.0.0"',
          __FEATURE_ENABLED__: true,
          __USER_NAME__: JSON.stringify('John "The Man" Doe'),
          'process.env.NODE_ENV': '"development"',
          'import.meta.env.VITE_API_URL': JSON.stringify('https://api.example.com')
        }
      } as ResolvedConfig;
      mockPlugin = createVanillaPlugin(); // Default options: replaceDefine = true
      // @ts-ignore
      mockPlugin.configResolved?.(mockResolvedConfig);
    });

    const basicHtml = '<html><head></head><body><p>__APP_VERSION__</p><p>__USER_NAME__</p><p>import.meta.env.VITE_API_URL</p></body></html>';

    it('should replace viteConfig.define values in HTML if replaceDefine is true', async () => {
      // @ts-ignore
      const result = await mockPlugin.transformIndexHtml?.handler(basicHtml, {}) as { html: string, tags: any[] };
      expect(result.html).toContain('<p>1.0.0</p>');
      expect(result.html).toContain('<p>John "The Man" Doe</p>');
      expect(result.html).toContain('<p>https://api.example.com</p>');
      expect(result.html).not.toContain('__APP_VERSION__');
      expect(result.html).not.toContain('__USER_NAME__');
      expect(result.html).not.toContain('import.meta.env.VITE_API_URL');
    });

    it('should NOT replace viteConfig.define values if replaceDefine is false', async () => {
      mockPlugin = createVanillaPlugin({ replaceDefine: false });
      // @ts-ignore
      mockPlugin.configResolved?.(mockResolvedConfig);
      // @ts-ignore
      const result = await mockPlugin.transformIndexHtml?.handler(basicHtml, {}) as { html: string, tags: any[] };
      expect(result.html).toContain('<p>__APP_VERSION__</p>');
      expect(result.html).toContain('<p>__USER_NAME__</p>');
    });

    it('should apply custom transform function to HTML content', async () => {
      const transformFn = vi.fn((html, _ctx) => Promise.resolve(html.replace('<p>', '<p class="transformed">')));
      mockPlugin = createVanillaPlugin({ transform: transformFn, replaceDefine: false }); // replaceDefine:false to isolate transform
      // @ts-ignore
      mockPlugin.configResolved?.(mockResolvedConfig);
      // @ts-ignore
      await mockPlugin.transformIndexHtml?.handler(basicHtml, {});
      expect(transformFn).toHaveBeenCalled();
      // @ts-ignore
      const transformedResult = await mockPlugin.transformIndexHtml?.handler(basicHtml, {}) as { html: string, tags: any[] };
      expect(transformedResult.html).toContain('<p class="transformed">__APP_VERSION__</p>');
    });

    it('should apply both replaceDefine and transform if both are enabled', async () => {
      const transformFn = vi.fn((html, _ctx) => Promise.resolve(html.replace('<p>', '<p class="transformed">')));
      mockPlugin = createVanillaPlugin({ transform: transformFn, replaceDefine: true });
       // @ts-ignore
      mockPlugin.configResolved?.(mockResolvedConfig);
       // @ts-ignore
      const result = await mockPlugin.transformIndexHtml?.handler(basicHtml, {}) as { html: string, tags: any[] };
      expect(transformFn).toHaveBeenCalled();
      expect(result.html).toContain('<p class="transformed">1.0.0</p>');
      expect(result.html).toContain('<p class="transformed">John "The Man" Doe</p>');
    });

    it('should add inject.tags to the result', async () => {
      const tags = [{ tag: 'meta', attrs: { name: 'description', content: 'Test' } }];
      mockPlugin = createVanillaPlugin({ inject: { tags }, replaceDefine: false });
       // @ts-ignore
      mockPlugin.configResolved?.(mockResolvedConfig);
       // @ts-ignore
      const result = await mockPlugin.transformIndexHtml?.handler(basicHtml, {}) as { html: string, tags: any[] };
      expect(result.tags).toEqual(tags);
    });

    it('should use correct transformIndexHtml for Vite < 5', async () => {
      (getViteVersion as vi.Mock).mockReturnValue(4);
      mockPlugin = createVanillaPlugin();
      // @ts-ignore
      expect(mockPlugin.transformIndexHtml?.enforce).toBe('pre');
      // @ts-ignore
      expect(typeof mockPlugin.transformIndexHtml?.transform).toBe('function');
    });

    it('should use correct transformIndexHtml for Vite >= 5', async () => {
      (getViteVersion as vi.Mock).mockReturnValue(5);
      mockPlugin = createVanillaPlugin();
      // @ts-ignore
      expect(mockPlugin.transformIndexHtml?.order).toBe('pre');
      // @ts-ignore
      expect(typeof mockPlugin.transformIndexHtml?.handler).toBe('function');
    });
  });

  describe('Dev Server Middleware (configureServer hook)', () => {
    let mockServer: any;
    const sampleHtmlContent = '<html><body>Test</body></html>';

    beforeEach(() => {
      // Setup htmlPages store as if config hook ran
      (glob.sync as vi.Mock).mockReturnValue(['src/index.html', 'src/about/us.html']);
      mockPlugin = createVanillaPlugin({ base: 'src' }); // Plugin base is 'src'
      // @ts-ignore
      mockPlugin.config?.(mockUserConfig, { command: 'serve', mode: 'development' });
      // @ts-ignore
      mockPlugin.configResolved?.(mockResolvedConfig);

      mockServer = {
        middlewares: { use: vi.fn() },
        transformIndexHtml: vi.fn((_url, html, _originalUrl) => Promise.resolve(html + '<!-- transformed -->')),
        watcher: { add: vi.fn(), on: vi.fn() },
        ws: { send: vi.fn() },
        restart: vi.fn(),
      };
      // @ts-ignore
      mockPlugin.configureServer?.(mockServer);
    });

    it('should add middleware to server', () => {
      expect(mockServer.middlewares.use).toHaveBeenCalledOnce();
    });

    it('should serve known HTML file and transform it', async () => {
      (fs.readFile as vi.Mock).mockResolvedValue(sampleHtmlContent);
      const middleware = mockServer.middlewares.use.mock.calls[0][0];
      const mockReq = { url: '/index.html', originalUrl: '/index.html' }; // Request for root, maps to src/index.html
      const mockRes = { setHeader: vi.fn(), end: vi.fn() };
      const mockNext = vi.fn();

      await middleware(mockReq, mockRes, mockNext);

      expect(fs.readFile).toHaveBeenCalledWith(path.resolve('/project/src/index.html'), 'utf-8');
      expect(mockServer.transformIndexHtml).toHaveBeenCalledWith('/index.html', sampleHtmlContent, '/index.html');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(mockRes.end).toHaveBeenCalledWith(sampleHtmlContent + '<!-- transformed -->');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should serve HTML file with nested path correctly', async () => {
      (fs.readFile as vi.Mock).mockResolvedValue(sampleHtmlContent);
      const middleware = mockServer.middlewares.use.mock.calls[0][0];
      // Request for /about/us.html, maps to src/about/us.html because plugin base is 'src'
      const mockReq = { url: '/about/us.html', originalUrl: '/about/us.html' };
      const mockRes = { setHeader: vi.fn(), end: vi.fn() };
      const mockNext = vi.fn();

      await middleware(mockReq, mockRes, mockNext);
      expect(fs.readFile).toHaveBeenCalledWith(path.resolve('/project/src/about/us.html'), 'utf-8');
      expect(mockServer.transformIndexHtml).toHaveBeenCalledWith('/about/us.html', sampleHtmlContent, '/about/us.html');
      expect(mockRes.end).toHaveBeenCalledWith(sampleHtmlContent + '<!-- transformed -->');
    });

    it('should serve / as index.html', async () => {
      (fs.readFile as vi.Mock).mockResolvedValue(sampleHtmlContent);
      const middleware = mockServer.middlewares.use.mock.calls[0][0];
      const mockReq = { url: '/', originalUrl: '/' };
      const mockRes = { setHeader: vi.fn(), end: vi.fn() };
      const mockNext = vi.fn();
      await middleware(mockReq, mockRes, mockNext);
      expect(fs.readFile).toHaveBeenCalledWith(path.resolve('/project/src/index.html'), 'utf-8');
      expect(mockServer.transformIndexHtml).toHaveBeenCalledWith('/', sampleHtmlContent, '/');
    });


    it('should call next() if HTML file not found in store', async () => {
      const middleware = mockServer.middlewares.use.mock.calls[0][0];
      const mockReq = { url: '/nonexistent.html' };
      const mockRes = { setHeader: vi.fn(), end: vi.fn() };
      const mockNext = vi.fn();
      await middleware(mockReq, mockRes, mockNext);
      expect(fs.readFile).not.toHaveBeenCalled();
      expect(mockRes.end).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next(err) if fs.readFile fails', async () => {
      const error = new Error('Read error');
      (fs.readFile as vi.Mock).mockRejectedValue(error);
      const middleware = mockServer.middlewares.use.mock.calls[0][0];
      const mockReq = { url: '/index.html' }; // Assumes index maps to a file
      const mockRes = { setHeader: vi.fn(), end: vi.fn() };
      const mockNext = vi.fn();
      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    // File watching tests are conceptual as direct testing is hard
    it('should add HTML files to watcher', () => {
        expect(mockServer.watcher.add).toHaveBeenCalledWith(path.resolve('/project/src/index.html'));
        expect(mockServer.watcher.add).toHaveBeenCalledWith(path.resolve('/project/src/about/us.html'));
    });

    it('should setup watcher events for change, unlink, add', () => {
        expect(mockServer.watcher.on).toHaveBeenCalledWith('change', expect.any(Function));
        expect(mockServer.watcher.on).toHaveBeenCalledWith('unlink', expect.any(Function));
        expect(mockServer.watcher.on).toHaveBeenCalledWith('add', expect.any(Function));
    });

    // Conceptual: Test what the handlers do
    it('watcher change/unlink should trigger full-reload', () => {
        const changeHandler = mockServer.watcher.on.mock.calls.find((call: any) => call[0] === 'change')[1];
        changeHandler('src/index.html');
        expect(mockServer.ws.send).toHaveBeenCalledWith({ type: 'full-reload', path: '*' });
    });
     it('watcher add (inside base) should trigger server restart', () => {
        const addHandler = mockServer.watcher.on.mock.calls.find((call: any) => call[0] === 'add')[1];
        addHandler('src/new-page.html'); // Assumes 'src' is the plugin base
        expect(mockServer.restart).toHaveBeenCalled();
    });
     it('watcher add (outside base) should not trigger server restart', () => {
        const addHandler = mockServer.watcher.on.mock.calls.find((call: any) => call[0] === 'add')[1];
        addHandler('other/new-page.html');
        expect(mockServer.restart).not.toHaveBeenCalled();
    });

  });

  describe('moveFile logic (closeBundle hook)', () => {
    beforeEach(() => {
      // Minimal setup for htmlPages store for closeBundle testing
      // (glob.sync as vi.Mock).mockReturnValue(['src/index.html', 'src/sub/contact.html', 'src/assets/data.html']);
      mockPlugin = createVanillaPlugin({ base: 'src' }); // Plugin base is 'src'
      // Simulate config hook populating htmlPages
      // @ts-ignore
      const configResult = mockPlugin.config?.({ root: '/project' }, { command: 'build', mode: 'production' });
      // Manually set htmlPages based on what config() would do
      // This is a bit of a workaround because htmlPages is internal to the plugin closure
      // A more robust way would be to directly set the internal state if possible, or refactor plugin for testability
      // For now, we rely on the previous tests of config() to ensure htmlPages is built correctly.
      // We will call configResolved to set viteConfig
      mockResolvedConfig = {
        ...mockViteConfigBase,
        root: '/project',
        build: { outDir: 'dist', rollupOptions: configResult?.build?.rollupOptions || {} },
      } as ResolvedConfig;
      // @ts-ignore
      mockPlugin.configResolved?.(mockResolvedConfig);
    });
    
    // Helper to re-run config for specific file setup for closeBundle
    const setupHtmlPagesForCloseBundle = (files: string[], pluginOptions: PluginOptions = { base: 'src' }) => {
        (glob.sync as vi.Mock).mockReturnValue(files);
        mockPlugin = createVanillaPlugin(pluginOptions);
        const userCfg = { root: '/project' };
        // @ts-ignore
        const buildCfg = mockPlugin.config?.(userCfg, { command: 'build', mode: 'production' });
        mockResolvedConfig = {
            ...mockViteConfigBase,
            root: '/project',
            build: { outDir: 'dist', rollupOptions: buildCfg?.build?.rollupOptions || {} },
        } as ResolvedConfig;
        // @ts-ignore
        mockPlugin.configResolved?.(mockResolvedConfig);
    };


    it('should call moveFile with correct arguments', () => {
      setupHtmlPagesForCloseBundle(['src/index.html', 'src/about.html']);
      // @ts-ignore
      mockPlugin.closeBundle?.();

      const expectedDest = 'dist'; // viteConfig.build.outDir
      const expectedFilesToMove = {
        [path.join(expectedDest, 'src/index.html')]: 'index.html', // src in path is from original file structure, output is relative to plugin base
        [path.join(expectedDest, 'src/about.html')]: 'about.html',
      };

      expect(moveFile).toHaveBeenCalledWith(expectedFilesToMove, {
        base: expectedDest,
        dest: expectedDest,
        clean: true,
        force: true,
      });
    });

    it('should calculate output paths correctly when plugin base is nested', () => {
      // Files are in src/pages/, plugin base is src/pages
      // Output should be like contact.html, user/profile.html in the dist root
      setupHtmlPagesForCloseBundle(
        ['src/pages/contact.html', 'src/pages/user/profile.html'],
        { base: 'src/pages' }
      );
      // @ts-ignore
      mockPlugin.closeBundle?.();

      const expectedDest = 'dist';
      const expectedFilesToMove = {
        [path.join(expectedDest, 'src/pages/contact.html')]: 'contact.html',
        [path.join(expectedDest, 'src/pages/user/profile.html')]: 'user/profile.html',
      };
      expect(moveFile).toHaveBeenCalledWith(expectedFilesToMove, {
        base: expectedDest,
        dest: expectedDest,
        clean: true,
        force: true,
      });
    });

    it('should use custom viteConfig.build.outDir', () => {
      setupHtmlPagesForCloseBundle(['src/index.html']);
      mockResolvedConfig.build.outDir = 'custom_dist'; // Override outDir
      // @ts-ignore
      mockPlugin.configResolved?.(mockResolvedConfig); // Re-run with new outDir
      // @ts-ignore
      mockPlugin.closeBundle?.();
      
      const expectedDest = 'custom_dist';
      const expectedFilesToMove = {
        [path.join(expectedDest, 'src/index.html')]: 'index.html',
      };
      expect(moveFile).toHaveBeenCalledWith(expectedFilesToMove, {
        base: expectedDest,
        dest: expectedDest,
        clean: true,
        force: true,
      });
    });
  });
});
