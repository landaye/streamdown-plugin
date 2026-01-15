# Streamdown-Plugin

一个专为 AI 流式输出设计的 react-markdown 替代品,基于Streamdown修改专用于浏览器插件StreamdownPlugin版本。

[![npm version](https://img.shields.io/npm/v/streamdown)](https://www.npmjs.com/package/streamdown)

## 概述

Streamdown-Plugin 是一个专为 AI 流式输出设计的 react-markdown 替代品,基于Streamdown修改专用于浏览器插件StreamdownPlugin版本。

格式化 Markdown 很简单，但当你对其进行标记化和流式处理时，会出现新的挑战。Streamdown 专门为处理来自 AI 模型的流式 Markdown 内容的独特需求而构建，即使在 Markdown 块不完整或未终止的情况下也能提供无缝的格式化。

Streamdown 为 [AI Elements Message](https://ai-sdk.dev/elements/components/message) 组件提供支持，但也可以作为独立包安装，用于您自己的流式处理需求。

## 特性

- 🚀 **即插即用** - 可直接替换 `react-markdown`
- 🔄 **流式优化** - 优雅地处理不完整的 Markdown
- 🎨 **未终止块解析** - 与 `remend` 一起构建，提供更好的流式处理质量
- 📊 **GitHub 风格 Markdown** - 支持表格、任务列表和删除线
- 🔢 **数学公式渲染** - 通过 KaTeX 渲染 LaTeX 方程
- 📈 **Mermaid 图表** - 将 Mermaid 图表渲染为代码块，带有渲染按钮
- 🎯 **代码语法高亮** - 使用 Shiki 实现精美的代码块
- 🛡️ **安全优先** - 使用 `rehype-harden` 构建，确保安全渲染
- ⚡ **性能优化** - 记忆化渲染，实现高效更新

## 安装

```bash
npm i streamdown-plugin
```

然后，更新您的 Tailwind `globals.css` 文件，包含以下内容：

```css
@source "../node_modules/streamdown-plugin/dist/*.js";
```

确保路径与您项目中 `node_modules` 文件夹的位置匹配。这将确保 Streamdown 的样式应用到您的项目中。

##注意
如果您在wxt框架开发浏览器插件，使用 StreamdownPlugin 时遇到问题，请确保您已正确安装并配置了 Streamdown。请配置utf8scripts.rar文件，将其放在项目根目录下。在wxt.config.ts文件中添加以下配置：

 解决wxt框架开发浏览器插件时，使用 StreamdownPlugin 时遇到的问题：
 Uncaught (in promise) Error: 无法为内容脚本加载“content-scripts/content.js”文件。该文件采用的不是 UTF-8 编码。

```ts
import { WxtViteConfig, defineConfig } from "wxt";

// 引入utf8scripts.rar文件
import toUtf8 from "./scripts/vite-plugin-to-utf8";

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: (env) => {
    return {
      plugins: [toUtf8()],
      legacy: {
        skipWebSocketTokenCheck: true,
      },
    } as WxtViteConfig;
  },
  },
});

```

## 使用方法

您可以在StreamdownPlugin 与 Streamdown 共享相同的 API，因此您可以按照 Streamdown 的文档使用 StreamdownPlugin。

```tsx
import { Streamdown } from "streamdown-plugin";

export default function Page() {
  const markdown = "# Hello World\n\nThis is **streaming** markdown!";

  return <Streamdown>{markdown}</Streamdown>;
}
```
## 原Streamdown使用文档，与StreamdownPlugin相同
有关更多信息，请查看 [文档](https://streamdown.ai/docs)。
