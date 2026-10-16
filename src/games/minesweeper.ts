import { bindButton, bindPageCleanup, readBestTime, required, saveBestTime, type Cleanup } from './shared';

type Level = 'easy' | 'medium' | 'hard';
type CellState = { mine: boolean; revealed: boolean; flagged: boolean; adjacent: number };

const LEVELS: Record<Level, { rows: number; cols: number; mines: number; label: string }> = {
  easy: { rows: 9, cols: 9, mines: 10, label: '初级' },
  medium: { rows: 12, cols: 12, mines: 25, label: '中级' },
  hard: { rows: 14, cols: 18, mines: 55, label: '高级' }
};

function neighbors(index: number, rows: number, cols: number): number[] {
  const x = index % cols;
  const y = Math.floor(index / cols);
  const result: number[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nextX = x + dx;
      const nextY = y + dy;
      if (nextX >= 0 && nextY >= 0 && nextX < cols && nextY < rows) {
        result.push(nextY * cols + nextX);
      }
    }
  }
  return result;
}

export function startMinesweeperGame(root: HTMLElement): Cleanup {
  const boardNode = required<HTMLElement>(root, '[data-board]');
  const levelNode = required<HTMLSelectElement>(root, '[data-level]');
  const markNode = required<HTMLButtonElement>(root, '[data-action="mark"]');
  const minesNode = required<HTMLElement>(root, '[data-mines]');
  const timeNode = required<HTMLElement>(root, '[data-time]');
  const bestNode = required<HTMLElement>(root, '[data-best]');
  const stateNode = required<HTMLElement>(root, '[data-state]');
  let level: Level = 'easy';
  let rows = LEVELS[level].rows;
  let cols = LEVELS[level].cols;
  let mineCount = LEVELS[level].mines;
  let cells: CellState[] = [];
  let generated = false;
  let revealedCount = 0;
  let flaggedCount = 0;
  let markMode = false;
  let seconds = 0;
  let timer = 0;
  let finished = false;
  let pausedByVisibility = false;
  let cleanupPage: Cleanup | null = null;

  const updateHud = () => {
    minesNode.textContent = String(Math.max(0, mineCount - flaggedCount));
    timeNode.textContent = `${seconds}s`;
    bestNode.textContent = readBestTime(level) ? `${readBestTime(level)}s` : '—';
  };

  const stopTimer = () => {
    if (timer) {
      window.clearInterval(timer);
      timer = 0;
    }
  };

  const startTimer = () => {
    if (timer || finished) return;
    timer = window.setInterval(() => {
      seconds += 1;
      updateHud();
    }, 1000);
  };

  const setStatus = (message: string) => {
    stateNode.textContent = message;
  };

  const render = (exploded = -1) => {
    boardNode.innerHTML = '';
    boardNode.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    cells.forEach((cell, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `mine-cell${cell.revealed ? ' revealed' : ''}${cell.flagged ? ' flagged' : ''}${index === exploded ? ' exploded' : ''}`;
      button.dataset.index = String(index);
      button.setAttribute('aria-label', cell.revealed ? `第 ${index + 1} 格，已翻开` : `第 ${index + 1} 格，未翻开`);
      if (cell.revealed) {
        button.textContent = cell.mine ? '✱' : cell.adjacent > 0 ? String(cell.adjacent) : '';
      } else if (cell.flagged) {
        button.textContent = '⚑';
      }
      boardNode.appendChild(button);
    });
  };

  const reset = () => {
    const config = LEVELS[level];
    rows = config.rows;
    cols = config.cols;
    mineCount = config.mines;
    cells = Array.from({ length: rows * cols }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }));
    generated = false;
    revealedCount = 0;
    flaggedCount = 0;
    seconds = 0;
    finished = false;
    pausedByVisibility = false;
    stopTimer();
    setStatus('点击任意格子开始 · 第一次点击永远安全');
    updateHud();
    render();
  };

  const placeMines = (safeIndex: number) => {
    const forbidden = new Set([safeIndex, ...neighbors(safeIndex, rows, cols)]);
    const available = cells.map((_, index) => index).filter((index) => !forbidden.has(index));
    for (let count = 0; count < mineCount && available.length; count += 1) {
      const chosen = available.splice(Math.floor(Math.random() * available.length), 1)[0];
      if (chosen !== undefined) cells[chosen].mine = true;
    }
    cells.forEach((cell, index) => {
      cell.adjacent = neighbors(index, rows, cols).filter((next) => cells[next].mine).length;
    });
    generated = true;
  };

  const reveal = (index: number) => {
    const cell = cells[index];
    if (!cell || cell.revealed || cell.flagged || finished) return;
    if (!generated) {
      placeMines(index);
      startTimer();
    }
    cell.revealed = true;
    if (cell.mine) {
      stopTimer();
      finished = true;
      cells.forEach((item) => {
        if (item.mine) item.revealed = true;
      });
      setStatus('踩到地雷了 · 点击重新开始');
      render(index);
      return;
    }
    revealedCount += 1;
    if (cell.adjacent === 0) {
      const queue = [index];
      while (queue.length) {
        const current = queue.shift() ?? 0;
        neighbors(current, rows, cols).forEach((next) => {
          const nextCell = cells[next];
          if (!nextCell.revealed && !nextCell.flagged && !nextCell.mine) {
            nextCell.revealed = true;
            revealedCount += 1;
            if (nextCell.adjacent === 0) queue.push(next);
          }
        });
      }
    }
    if (revealedCount === cells.length - mineCount) {
      stopTimer();
      finished = true;
      saveBestTime(level, seconds);
      setStatus(`通关！用时 ${seconds} 秒`);
    }
    render();
  };

  const toggleFlag = (index: number) => {
    const cell = cells[index];
    if (!cell || cell.revealed || finished) return;
    cell.flagged = !cell.flagged;
    flaggedCount += cell.flagged ? 1 : -1;
    updateHud();
    render();
  };

  const onBoardClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('.mine-cell');
    if (!button) return;
    const index = Number(button.dataset.index ?? -1);
    if (markMode) toggleFlag(index);
    else reveal(index);
  };

  const onContextMenu = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('.mine-cell');
    if (!button) return;
    event.preventDefault();
    toggleFlag(Number(button.dataset.index ?? -1));
  };

  const toggleMarkMode = () => {
    markMode = !markMode;
    markNode.textContent = markMode ? '标记模式：开' : '标记模式：关';
    markNode.setAttribute('aria-pressed', String(markMode));
    setStatus(markMode ? '标记模式开启，点击格子插旗' : '翻开模式，点击格子开始');
  };

  const unbinds = [
    bindButton(root, '[data-action="start"]', reset),
    bindButton(root, '[data-action="restart"]', reset),
    bindButton(root, '[data-action="mark"]', toggleMarkMode)
  ];

  const onLevelChange = () => {
    level = levelNode.value as Level;
    reset();
  };
  levelNode.addEventListener('change', onLevelChange);
  boardNode.addEventListener('click', onBoardClick);
  boardNode.addEventListener('contextmenu', onContextMenu);
  // 真正离开页面停表；切走标签页只暂停计时，切回后继续
  cleanupPage = bindPageCleanup(
    () => stopTimer(),
    () => {
      if (timer) {
        stopTimer();
        pausedByVisibility = true;
      }
    },
    () => {
      if (pausedByVisibility) {
        pausedByVisibility = false;
        startTimer();
      }
    }
  );

  reset();

  return () => {
    cleanupPage?.();
    stopTimer();
    unbinds.forEach((unbind) => unbind());
    levelNode.removeEventListener('change', onLevelChange);
    boardNode.removeEventListener('click', onBoardClick);
    boardNode.removeEventListener('contextmenu', onContextMenu);
  };
}

