export type Cleanup = () => void;

export function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element;
}

export function highScoreKey(game: string, suffix = 'default'): string {
  return `pixel-home:high-score:${game}:${suffix}`;
}

export function readHighScore(key: string): number {
  try {
    return Number(window.localStorage.getItem(key) ?? '0') || 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(key: string, score: number): void {
  try {
    if (score > readHighScore(key)) {
      window.localStorage.setItem(key, String(score));
    }
  } catch {
    // localStorage may be disabled; gameplay should continue.
  }
}

const MINESWEEPER_BEST_PREFIX = 'pixel-home:best-time:minesweeper';

// 扫雷最快通关秒数键（集中管理，供游戏页与“最佳成绩”列表复用）
export function minesweeperBestKey(level: string): string {
  return `${MINESWEEPER_BEST_PREFIX}:${level}`;
}

export function readBestTime(level: string): number {
  try {
    return Number(window.localStorage.getItem(minesweeperBestKey(level)) ?? '0') || 0;
  } catch {
    return 0;
  }
}

export function saveBestTime(level: string, seconds: number): void {
  try {
    const current = readBestTime(level);
    if (!current || seconds < current) {
      window.localStorage.setItem(minesweeperBestKey(level), String(seconds));
    }
  } catch {
    // localStorage may be disabled; gameplay should continue.
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// 真正离开页面（关闭/跳转）时执行清理；标签页切走时只暂停、切回时恢复，
// 避免游戏在用户切走再切回后被永久停止。
export function bindPageCleanup(cleanup: Cleanup, onPause?: Cleanup, onResume?: Cleanup): Cleanup {
  const onLeave = () => cleanup();
  const onVisibility = () => {
    if (document.hidden) onPause?.();
    else onResume?.();
  };
  window.addEventListener('pagehide', onLeave);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    window.removeEventListener('pagehide', onLeave);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

export function bindButton(root: ParentNode, selector: string, handler: () => void): Cleanup {
  const button = required<HTMLButtonElement>(root, selector);
  button.addEventListener('click', handler);
  return () => button.removeEventListener('click', handler);
}
