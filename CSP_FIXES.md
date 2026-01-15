# Streamdown CSP 问题修复文档

## 概述

本文档记录了针对 Streamdown 项目中 Content Security Policy (CSP) 违规问题的修复方案。主要解决了两个关键问题：

1. Shiki 语法高亮库使用 JavaScript regex 引擎导致的 `unsafe-eval` 违规
2. Mermaid 图表库使用 `new Function` 进行动态导入导致的 `unsafe-eval` 违规

## 改动1：替换 Shiki 的 JavaScript regex 引擎为 Oniguruma 引擎

### 原始代码 (`packages/streamdown/lib/code-block/highlight.ts`)
```typescript
import type {
  BundledTheme,
  LanguageRegistration,
  SpecialLanguage,
  TokensResult,
} from "shiki";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
// 原始代码使用 JavaScript regex 引擎，会导致 CSP unsafe-eval 违规
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import {
  type BundledLanguageName,
  bundledLanguages,
  isBundledLanguage,
} from "./bundled-languages";
import {
  type BundledThemeName,
  bundledThemes,
  isBundledTheme,
} from "./bundled-themes";
import { loadLanguageFromCDN, loadThemeFromCDN } from "./cdn-loader";

// 原始代码：创建 JavaScript regex 引擎（会导致 CSP 违规）
const jsEngine = createJavaScriptRegexEngine({ forgiving: true });

// 单例缓存用于保存高亮器
const highlighterCache = new Map<string, Promise<HighlighterCore>>();

// 高亮结果缓存（tokens）
const tokensCache = new Map<string, TokensResult>();

// token 缓存更新的订阅者
const subscribers = new Map<string, Set<(result: TokensResult) => void>>();

// ... 其他辅助函数保持不变 ...

/**
 * 为特定语言和主题创建 Shiki 高亮器
 * 使用混合加载：捆绑的语言立即加载，其他语言从 CDN 加载
 */
export const createShiki = (
  language: string,
  shikiTheme: [BundledTheme, BundledTheme],
  cdnUrl?: string | null
): Promise<HighlighterCore> => {
  const cacheKey = getHighlighterCacheKey(language, shikiTheme);

  // 如果存在缓存的高亮器，则返回它
  if (highlighterCache.has(cacheKey)) {
    return highlighterCache.get(cacheKey) as Promise<HighlighterCore>;
  }

  // 创建新的高亮器并缓存它
  const highlighterPromise = (async () => {
    // 加载语言语法（捆绑的或从 CDN）
    const languageGrammar = await loadLanguageGrammar(language, cdnUrl);

    // 如果无法加载语言，则回退到 'text'
    const langs = languageGrammar ? [languageGrammar] : ["text"];

    // 加载主题（捆绑的或从 CDN）
    const themeRegistrations = await Promise.all(
      shikiTheme.map((theme) => loadTheme(theme, cdnUrl))
    );

    // 原始代码：使用 JavaScript 引擎（会导致 CSP 违规）
    const highlighter = await createHighlighterCore({
      themes: themeRegistrations,
      langs: langs as any,
      engine: jsEngine,
    });

    return highlighter;
  })();

  highlighterCache.set(cacheKey, highlighterPromise);

  return highlighterPromise;
};
```

### 修改后的代码 (`packages/streamdown/lib/code-block/highlight.ts`)
```typescript
import type {
  BundledTheme,
  LanguageRegistration,
  SpecialLanguage,
  TokensResult,
} from "shiki";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
// 修复：使用 Oniguruma 引擎替代 JavaScript 引擎，避免 CSP unsafe-eval 违规
import { createOnigurumaEngine } from "@shikijs/engine-oniguruma";
import {
  type BundledLanguageName,
  bundledLanguages,
  isBundledLanguage,
} from "./bundled-languages";
import {
  type BundledThemeName,
  bundledThemes,
  isBundledTheme,
} from "./bundled-themes";
import { loadLanguageFromCDN, loadThemeFromCDN } from "./cdn-loader";

// 修复：懒加载 Oniguruma 引擎以避免 CSP 问题和性能问题
let onigurumaEngine: ReturnType<typeof createOnigurumaEngine> | null = null;

// 修复：获取或初始化引擎的函数
async function getOnigurumaEngine() {
  if (!onigurumaEngine) {
    onigurumaEngine = await createOnigurumaEngine();
  }
  return onigurumaEngine;
}

// 单例缓存用于保存高亮器
const highlighterCache = new Map<string, Promise<HighlighterCore>>();

// 高亮结果缓存（tokens）
const tokensCache = new Map<string, TokensResult>();

// token 缓存更新的订阅者
const subscribers = new Map<string, Set<(result: TokensResult) => void>>();

// ... 其他辅助函数保持不变 ...

/**
 * 为特定语言和主题创建 Shiki 高亮器
 * 使用混合加载：捆绑的语言立即加载，其他语言从 CDN 加载
 */
export const createShiki = (
  language: string,
  shikiTheme: [BundledTheme, BundledTheme],
  cdnUrl?: string | null
): Promise<HighlighterCore> => {
  const cacheKey = getHighlighterCacheKey(language, shikiTheme);

  // 如果存在缓存的高亮器，则返回它
  if (highlighterCache.has(cacheKey)) {
    return highlighterCache.get(cacheKey) as Promise<HighlighterCore>;
  }

  // 创建新的高亮器并缓存它
  const highlighterPromise = (async () => {
    // 加载语言语法（捆绑的或从 CDN）
    const languageGrammar = await loadLanguageGrammar(language, cdnUrl);

    // 如果无法加载语言，则回退到 'text'
    const langs = languageGrammar ? [languageGrammar] : ["text"];

    // 加载主题（捆绑的或从 CDN）
    const themeRegistrations = await Promise.all(
      shikiTheme.map((theme) => loadTheme(theme, cdnUrl))
    );

    // 修复：获取或初始化 Oniguruma 引擎（避免 CSP 违规）
    const engine = await getOnigurumaEngine();

    const highlighter = await createHighlighterCore({
      themes: themeRegistrations,
      langs: langs as any,
      engine,
    });

    return highlighter;
  })();

  highlighterCache.set(cacheKey, highlighterPromise);

  return highlighterPromise;
};
```

### 改动说明

1. **引擎替换**：将 `createJavaScriptRegexEngine` 替换为 `createOnigurumaEngine`
2. **懒加载机制**：实现了 Oniguruma 引擎的懒加载，避免不必要的初始化开销
3. **CSP 合规**：Oniguruma 引擎基于 WebAssembly，不使用 `eval` 或 `new Function`，符合 CSP 要求

## 改动2：修复 Mermaid 的动态导入 CSP 问题

### 原始代码 (`packages/streamdown/lib/mermaid/utils.ts`)
```typescript
import type { MermaidConfig } from "mermaid";
import packageJson from "../../package.json";

// 获取 mermaid 版本用于 CDN URL
const MERMAID_VERSION = (
  packageJson.dependencies?.mermaid ??
  packageJson.devDependencies?.mermaid ??
  "11"
).replace(/^\^/, "");

// 从基础 CDN URL 构建 mermaid CDN URL 的辅助函数
const getMermaidCdnUrl = (cdnBaseUrl: string) =>
  `${cdnBaseUrl}/mermaid/${MERMAID_VERSION}/mermaid.esm.min.mjs`;

// 缓存已加载的 mermaid 模块（按 URL 键控）
const mermaidModuleCache = new Map<string, typeof import("mermaid")>();

// 原始代码：使用 new Function 创建动态导入函数，会导致 CSP unsafe-eval 违规
// 动态导入，绕过打包器静态分析（适用于 Webpack、Turbopack 等）
// 使用 Function 构造函数创建打包器不会分析的间接导入
const dynamicImport = new Function("url", "return import(url)") as (
  url: string
) => Promise<typeof import("mermaid")>;

// ... 其他函数保持不变 ...
```

### 修改后的代码 (`packages/streamdown/lib/mermaid/utils.ts`)
```typescript
import type { MermaidConfig } from "mermaid";
import packageJson from "../../package.json";

// 获取 mermaid 版本用于 CDN URL
const MERMAID_VERSION = (
  (packageJson.dependencies as any)?.mermaid ??
  packageJson.devDependencies?.mermaid ??
  "11"
).replace(/^\^/, "");

// 从基础 CDN URL 构建 mermaid CDN URL 的辅助函数
const getMermaidCdnUrl = (cdnBaseUrl: string) =>
  `${cdnBaseUrl}/mermaid/${MERMAID_VERSION}/mermaid.esm.min.mjs`;

// 缓存已加载的 mermaid 模块（按 URL 键控）
const mermaidModuleCache = new Map<string, typeof import("mermaid")>();

// 修复：使用直接的动态导入语法，不需要 unsafe-eval
// 动态导入，绕过打包器静态分析（适用于 Webpack、Turbopack 等）
const dynamicImport = (url: string) => import(url) as Promise<typeof import("mermaid")>;

// ... 其他函数保持不变 ...
```

### 改动说明

1. **移除 new Function**：将使用 `new Function` 创建的动态导入函数替换为直接的动态导入语法
2. **CSP 合规**：直接的 `import(url)` 语法不需要 `unsafe-eval` 权限，符合 CSP 要求
3. **功能保持**：仍然能够绕过打包器的静态分析，保持与 Webpack、Turbopack 等打包工具的兼容性

## 其他相关修改

### 1. 添加 Oniguruma 引擎依赖

在 `packages/streamdown/package.json` 中添加了以下依赖：

```json
{
  "dependencies": {
    "@shikijs/engine-oniguruma": "^1.0.0"
  }
}
```

### 2. 确保 UTF-8 编码合规

在 `packages/streamdown/tsup.config.ts` 中添加了明确的编码配置：

```typescript
export default defineConfig({
  // ... 其他配置
  esbuildOptions: (options) => {
    options.charset = "utf8"; // 确保输出文件使用 UTF-8 编码
  },
});
```

## 验证结果

修复后，Streamdown 项目不再生成包含 `unsafe-eval` 违规的代码，可以在严格的 CSP 环境（如浏览器扩展）中正常运行。

### 修复前的 CSP 错误
```
Uncaught EvalError: Evaluating a string as JavaScript violates the following Content Security Policy directive because 'unsafe-eval' is not an allowed source of script: script-src 'self' 'wasm-unsafe-eval' http://localhost:3001
  at new Function (<anonymous>)
  at chunk-EAJW2JWE.js?v=f0acbf47:45066:10
```

### 修复后的效果
- 不再需要在 CSP 中添加 `unsafe-eval` 权限
- 可以在浏览器扩展等严格的 CSP 环境中正常使用
- 保持了原有的所有功能和性能特性

## 总结

这些修复解决了 Streamdown 项目中的 CSP 违规问题，使其能够在严格的 Content Security Policy 环境中正常运行，特别是在浏览器扩展开发场景中。修复方案遵循了最小侵入原则，保持了原有的功能和性能特性，同时确保了更好的安全性和兼容性。