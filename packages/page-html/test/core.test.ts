import { describe, it, expect, vi } from 'vitest';
import { createRewrites, createPage } from '../src/utils/core';
import type { ResolvedConfig } from 'vite';
import type { PageItem, PluginOptions, Pages } from '../src/types';

// Minimal mock for Vite's ResolvedConfig
const mockViteConfig = (base: string = '/', proxy: Record<string, any> = {}): ResolvedConfig => ({
  base,
  server: { proxy },
  // Add other necessary ResolvedConfig properties if needed by the functions being tested
}) as ResolvedConfig;

describe('createPage function', () => {
  it('should create a single page configuration', () => {
    const options: PluginOptions = {
      entry: '/src/main.ts',
      title: 'Test App',
    };
    const pages = createPage(options);
    expect(pages).toHaveProperty('index');
    expect(pages['index'].entry).toBe('/src/main.ts');
    expect(pages['index'].title).toBe('Test App');
    expect(pages['index'].template).toBe('index.html');
  });

  it('should create multiple page configurations', () => {
    const options: PluginOptions = {
      page: {
        main: '/src/main.ts',
        admin: {
          entry: '/src/admin.ts',
          title: 'Admin Page',
          template: 'admin.html',
        },
      },
      title: 'Default Title', // Default title for pages without one
    };
    const pages = createPage(options);
    expect(pages).toHaveProperty('main');
    expect(pages).toHaveProperty('admin');
    expect(pages['main'].entry).toBe('/src/main.ts');
    expect(pages['main'].title).toBe('Default Title');
    expect(pages['admin'].entry).toBe('/src/admin.ts');
    expect(pages['admin'].title).toBe('Admin Page');
    expect(pages['admin'].template).toBe('admin.html');
  });

  it('should handle deprecated data option and prioritize inject.data', () => {
    const options: PluginOptions = {
      entry: '/src/main.ts',
      data: { old: 'value' }, // Deprecated
      inject: { data: { new: 'value' } },
    };
    const pages = createPage(options);
    expect(pages['index'].inject.data).toEqual({ new: 'value' });
  });

   it('should use deprecated data option if inject.data is not provided', () => {
    const options: PluginOptions = {
      entry: '/src/main.ts',
      data: { old: 'value' }, // Deprecated
    };
    const pages = createPage(options);
    expect(pages['index'].inject.data).toEqual({ old: 'value' });
  });
});

describe('createRewrites function', () => {
  const mockPages: Pages = {
    index: { path: 'index', template: 'index.html', entry: 'src/main.ts', title: 'Index', inject: {}, ejsOptions: {} },
    app: { path: 'app', template: 'app.html', entry: 'src/app.ts', title: 'App', inject: {}, ejsOptions: {} },
    'user/profile': { path: 'user/profile', template: 'user/profile.html', entry: 'src/user/profile.ts', title: 'User Profile', inject: {}, ejsOptions: {} },
  };

  it('should generate basic rewrites for pages', () => {
    const viteConfig = mockViteConfig('/');
    const rewrites = createRewrites(mockPages, viteConfig);
    // Expected number of rules: 3 pages * 1 rule each + 1 for /user/profile/index + 1 for __*__ + 1 for historyApiFallback.ignorePatterns (if any) + 1 for root
    // For now, let's check some specific `from` patterns
    expect(rewrites.some(r => r.from.source === '^/index((/)|(\\.html?)|(/index\\.html?))?$')).toBe(true);
    expect(rewrites.some(r => r.from.source === '^/app((/)|(\\.html?)|(/index\\.html?))?$')).toBe(true);
    expect(rewrites.some(r => r.from.source === '^/user/profile((/)|(\\.html?)|(/index\\.html?))?$')).toBe(true);
    // Check for the /user rule (from user/profile index)
    expect(rewrites.some(r => r.from.source === '^/user(/)?$')).toBe(true);
    // Check for the root rewrite
    expect(rewrites.some(r => r.from.source === '^/((/)|(\\.html?)|(/index\\.html?))?$')).toBe(true);
  });

  it('should generate rewrites with correct base path', () => {
    const viteConfig = mockViteConfig('/mybase/');
    const rewrites = createRewrites(mockPages, viteConfig);
    const toFn = rewrites.find(r => r.from.source === '^/index((/)|(\\.html?)|(/index\\.html?))?$')?.to;
    if (typeof toFn !== 'function') throw new Error('toFn is not a function');
    expect(toFn({ parsedUrl: { path: '/index.html' } } as any)).toBe('/mybase/index.html');
  });

  it('should not rewrite for proxy paths', () => {
    const viteConfig = mockViteConfig('/', { '/api': 'http://localhost:3000' });
    const rewrites = createRewrites(mockPages, viteConfig);
    const toFn = rewrites.find(r => r.from.source === '^/index((/)|(\\.html?)|(/index\\.html?))?$')?.to;
    if (typeof toFn !== 'function') throw new Error('toFn is not a function');
    expect(toFn({ parsedUrl: { path: '/api/data' } } as any)).toBe('/api/data');
  });

  it('should handle historyApiFallback.ignorePatterns option', () => {
    const viteConfig = mockViteConfig('/');
    const options: PluginOptions = {
      historyApiFallback: {
        ignorePatterns: /^\/custom-whitelist\//,
      }
    };
    const rewrites = createRewrites(mockPages, viteConfig, options);
    const whitelistRule = rewrites.find(r => r.from.source === '^\\/custom-whitelist\\/');
    expect(whitelistRule).toBeDefined();
    if (!whitelistRule || typeof whitelistRule.to !== 'function') throw new Error('Whitelist rule "to" is not a function');
    expect(whitelistRule.to({ parsedUrl: { pathname: '/custom-whitelist/path' } } as any)).toBe('/custom-whitelist/path');
  });

  it('should include default whitelist for /__*__/', () => {
    const viteConfig = mockViteConfig('/');
    const rewrites = createRewrites(mockPages, viteConfig, {});
    const devtoolsRule = rewrites.find(r => r.from.source === '^\\/__\\w+\\/$');
    expect(devtoolsRule).toBeDefined();
     if (!devtoolsRule || typeof devtoolsRule.to !== 'function') throw new Error('Devtools rule "to" is not a function');
    expect(devtoolsRule.to({ parsedUrl: { pathname: '/__vite__/client' } } as any)).toBe('/__vite__/client');
  });

  it('should correctly rewrite for paths matching page names exactly or with trailing slash', () => {
    const viteConfig = mockViteConfig('/');
    const pages: Pages = {
      dashboard: { path: 'dashboard', template: 'dashboard.html', entry: 'src/dashboard.ts', title: 'Dashboard', inject: {}, ejsOptions: {} },
    };
    const rewrites = createRewrites(pages, viteConfig);

    // Test '/dashboard'
    const dashboardRule = rewrites.find(r => r.from.test('/dashboard'));
    expect(dashboardRule).toBeDefined();
    if (!dashboardRule || typeof dashboardRule.to !== 'function') throw new Error('Dashboard rule "to" is not a function');
    expect(dashboardRule.to({ parsedUrl: { path: '/dashboard' } } as any)).toBe('/dashboard.html');

    // Test '/dashboard/'
    const dashboardSlashRule = rewrites.find(r => r.from.test('/dashboard/'));
    expect(dashboardSlashRule).toBeDefined();
    if (!dashboardSlashRule || typeof dashboardSlashRule.to !== 'function') throw new Error('Dashboard slash rule "to" is not a function');
    expect(dashboardSlashRule.to({ parsedUrl: { path: '/dashboard/' } } as any)).toBe('/dashboard.html');
  });

  it('should correctly rewrite for paths ending with .html or /index.html', () => {
    const viteConfig = mockViteConfig('/');
    const pages: Pages = {
      about: { path: 'about', template: 'about.html', entry: 'src/about.ts', title: 'About', inject: {}, ejsOptions: {} },
    };
    const rewrites = createRewrites(pages, viteConfig);

    // Test '/about.html'
    const aboutHtmlRule = rewrites.find(r => r.from.test('/about.html'));
    expect(aboutHtmlRule).toBeDefined();
     if (!aboutHtmlRule || typeof aboutHtmlRule.to !== 'function') throw new Error('About HTML rule "to" is not a function');
    expect(aboutHtmlRule.to({ parsedUrl: { path: '/about.html' } } as any)).toBe('/about.html');

    // Test '/about/index.html'
    const aboutIndexHtmlRule = rewrites.find(r => r.from.test('/about/index.html'));
    expect(aboutIndexHtmlRule).toBeDefined();
    if (!aboutIndexHtmlRule || typeof aboutIndexHtmlRule.to !== 'function') throw new Error('About Index HTML rule "to" is not a function');
    expect(aboutIndexHtmlRule.to({ parsedUrl: { path: '/about/index.html' } } as any)).toBe('/about.html');
  });
});
