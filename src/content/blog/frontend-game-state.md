---
title: "前端小游戏的状态管理：从变量到可测试规则"
description: "把贪吃蛇、2048 和俄罗斯方块的状态拆成纯函数，让游戏逻辑更容易测试和维护。"
pubDate: 2026-01-15
tags:
  - TypeScript
  - 游戏开发
  - 状态管理
draft: false
---

小游戏看起来简单，但如果所有逻辑都写在事件回调里，很快就会长成难以维护的代码。一个实用的做法是把「规则」和「渲染」分开。

## 规则层回答发生了什么

规则层不需要知道 Canvas，也不需要知道按钮颜色。例如 2048 的移动可以写成：

```ts
function move(board: number[], direction: Direction) {
  const next = collapse(board, direction);
  return {
    board: next.board,
    score: next.gained,
    moved: next.moved
  };
}
```

同一份规则可以被键盘、触摸滑动、自动测试或未来的服务端回放复用。

## 渲染层负责把状态画出来

渲染函数只关心当前状态：

- 棋盘格子在哪里；
- 蛇身是什么颜色；
- 分数显示是否更新；
- 游戏结束提示是否出现。

这样游戏循环只需要做三件事：接收输入、更新状态、绘制画面。

## 本地最高分不是业务数据库

最高分适合先放在 `localStorage`，但键名一定要按游戏和难度隔离：

```text
pixel-home:high-score:snake
pixel-home:high-score:minesweeper:easy
```

如果未来要做跨设备排行榜，再把这套状态边界替换成 API 即可，不需要一开始就引入后端。
