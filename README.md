# 明心的像素工坊

这是一个使用 Astro、TypeScript 和原生 CSS 构建的中文个人主页、技术博客与原创像素风小游戏合集。

## 功能

- `/`：个人简介、状态、最新文章、小游戏入口（可进入全部游戏）、技术栈、项目时间线和联系方式；
- `/blog/`：文章列表、标签筛选、关键词搜索和空状态；
- `/blog/[slug]`：Markdown 文章详情、目录、上一篇/下一篇、代码一键复制和返回顶部按钮；
- `/games/`：小游戏合集和各游戏最佳成绩（读取本机 `localStorage`）；
- 六个原创游戏：
  - 贪吃蛇；
  - 2048；
  - 扫雷；
  - 打砖块；
  - 俄罗斯方块；
  - 魂斗罗风格横版射击。

游戏最高分使用浏览器 `localStorage` 保存，不依赖后端服务。

## 本地运行

```bash
npm install
npm run dev
```

打开终端输出的本地地址即可预览。

## 构建与检查

```bash
npm run check
npm run build
npm run preview
```

## 替换个人信息

真实资料集中在：

```text
src/data/profile.ts
```

当前文件使用了示例昵称、邮箱和项目描述。部署前请替换为你的真实信息，或者改成你希望公开展示的内容。

## 添加博客

在以下目录新增 Markdown 文件：

```text
src/content/blog/
```

每篇文章使用如下 frontmatter：

```yaml
---
title: "文章标题"
description: "文章摘要"
pubDate: 2026-02-01
tags:
  - Astro
draft: false
---
```

## GitHub Pages

仓库使用 `.github/workflows/deploy.yml` 在 push 到 `main` 时构建并发布 `dist`。

Astro 配置会根据 `GITHUB_REPOSITORY` 自动判断：

- `username.github.io` 仓库：部署到根路径；
- 普通项目仓库：自动加入 `/<repository-name>/` 基础路径。

如果生产分支不是 `main`，请同时修改工作流中的分支配置。

## 项目结构

```text
src/
  components/       页面组件
  content/blog/     Markdown 博客
  data/             个人资料配置
  games/            游戏规则和渲染逻辑
  layouts/          全局布局
  pages/            Astro 路由
  styles/           全局像素风样式
```

## 版权说明

所有游戏逻辑、Canvas 绘制和关卡内容均为本项目原创实现，不包含商业游戏 ROM、原版素材、音乐、角色立绘或商标化界面。
