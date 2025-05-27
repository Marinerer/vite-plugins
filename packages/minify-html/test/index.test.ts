import { describe, it, expect, vi } from 'vitest';
import createMinifyPlugin from '../index';
import { minify as minifyFn } from 'html-minifier-terser';

// Mock html-minifier-terser
vi.mock('html-minifier-terser', () => ({
  minify: vi.fn((html) => Promise.resolve(html + '<!-- minified -->')),
}));

describe('createMinifyPlugin', () => {
  it('should return a plugin object', () => {
    const plugin = createMinifyPlugin(true);
    expect(plugin).toBeTypeOf('object');
    expect(plugin.name).toBe('vite-plugin-minify-html');
    expect(plugin.enforce).toBe('post');
  });

  it('should not minify if minify option is false', async () => {
    const plugin = createMinifyPlugin(false);
    const outputBundle = {
      'index.html': {
        type: 'asset',
        fileName: 'index.html',
        source: '<html><body>Hello</body></html>',
      },
    };
    // @ts-ignore
    await plugin.generateBundle({}, outputBundle);
    expect(minifyFn).not.toHaveBeenCalled();
    expect(outputBundle['index.html'].source).toBe('<html><body>Hello</body></html>');
  });

  it('should minify HTML files if minify option is true', async () => {
    const plugin = createMinifyPlugin(true);
    const outputBundle = {
      'index.html': {
        type: 'asset',
        fileName: 'index.html',
        source: '<html><body>Hello</body></html>',
      },
      'script.js': {
        type: 'chunk',
        fileName: 'script.js',
        code: 'console.log("hello")',
      }
    };
    // @ts-ignore
    await plugin.generateBundle({}, outputBundle);
    expect(minifyFn).toHaveBeenCalledWith('<html><body>Hello</body></html>', {
      collapseWhitespace: true,
      keepClosingSlash: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      minifyCSS: true,
    });
    expect(outputBundle['index.html'].source).toBe('<html><body>Hello</body></html><!-- minified -->');
  });

  it('should use custom minify options if provided', async () => {
    const customOptions = { removeComments: false, collapseWhitespace: false };
    const plugin = createMinifyPlugin(customOptions);
    const outputBundle = {
      'index.html': {
        type: 'asset',
        fileName: 'index.html',
        source: '<html><body>Hello <!-- comment --></body></html>',
      },
    };
    // @ts-ignore
    await plugin.generateBundle({}, outputBundle);
    expect(minifyFn).toHaveBeenCalledWith('<html><body>Hello <!-- comment --></body></html>', {
      collapseWhitespace: false,
      keepClosingSlash: true,
      removeComments: false,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      minifyCSS: true,
      ...customOptions,
    });
    expect(outputBundle['index.html'].source).toBe('<html><body>Hello <!-- comment --></body></html><!-- minified -->');
  });

  it('should not process non-HTML files', async () => {
    const plugin = createMinifyPlugin(true);
    const outputBundle = {
      'style.css': {
        type: 'asset',
        fileName: 'style.css',
        source: 'body { color: red; }',
      },
    };
    // @ts-ignore
    await plugin.generateBundle({}, outputBundle);
    expect(minifyFn).not.toHaveBeenCalled();
    expect(outputBundle['style.css'].source).toBe('body { color: red; }');
  });
});
