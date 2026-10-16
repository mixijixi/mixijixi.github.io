---
title: "把个人博客部署到 GitHub Pages"
description: "从静态构建、仓库分支到项目路径，记录一次完整的 GitHub Pages 部署实践。"
pubDate: 2026-01-08
tags:
  - GitHub Pages
  - Astro
  - 部署
draft: false
---

GitHub Pages 适合放个人主页、项目文档和技术博客。它不需要服务端运行环境，只要构建出静态文件，就可以把知识稳定地发布到互联网上。

## 先确定仓库类型

GitHub Pages 有两种常见布局：

1. 用户主页仓库，例如 `username.github.io`；
2. 普通项目仓库，例如 `pixel-home`。

第二种仓库会多一层路径，例如：

```text
https://username.github.io/pixel-home/
```

因此 Astro 配置中的 `base` 不能写死为 `/`，否则部署后 CSS、JavaScript 和图片路径都可能失效。

## 让配置自动识别路径

可以在构建时读取 `GITHUB_REPOSITORY`，再判断当前仓库是不是用户主页仓库：

```ts
const isProjectPage = repositoryName !== `${owner}.github.io`;
const base = isProjectPage ? `/${repositoryName}/` : '/';
```

本地开发时保持根路径，部署时交给 Actions 注入环境变量。

## 部署检查清单

发布前至少检查：

- 博客列表页和详情页可以访问；
- 图片、字体和脚本没有 404；
- 页面刷新后不会落到 404；
- 构建日志没有 TypeScript 错误；
- 生产分支确实指向 `main`。

部署不是把代码推上去就结束了，真正重要的是确认用户打开链接后看到的页面和本地预览一致。
