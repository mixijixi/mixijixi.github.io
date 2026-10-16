import { bindButton, bindPageCleanup, highScoreKey, readHighScore, required, saveHighScore, type Cleanup } from './shared';

type Matrix = number[][];
type Piece = { shape: Matrix; color: string; x: number; y: number };

const KEY = highScoreKey('tetris');
const COLS = 10;
const ROWS = 20;
const CELL = 30;
const COLORS = ['', '#67e8f9', '#a3e635', '#facc15', '#fb7185', '#c084fc', '#60a5fa', '#f97316'];
const SHAPES: Matrix[] = [
  [[1, 1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 1, 0], [0, 1, 1]]
];

function emptyBoard(): Matrix {
  return Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
}

function createPiece(): Piece {
  const index = Math.floor(Math.random() * SHAPES.length);
  return { shape: SHAPES[index].map((row) => [...row]), color: String(index + 1), x: 3, y: 0 };
}

function collides(board: Matrix, piece: Piece, offsetX = 0, offsetY = 0, shape = piece.shape): boolean {
  for (let y = 0; y < shape.length; y += 1) {
    for (let x = 0; x < shape[y].length; x += 1) {
      if (!shape[y][x]) continue;
      const boardX = piece.x + x + offsetX;
      const boardY = piece.y + y + offsetY;
      if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return true;
      if (boardY >= 0 && board[boardY][boardX]) return true;
    }
  }
  return false;
}

function rotate(shape: Matrix): Matrix {
  return shape[0].map((_, index) => shape.map((row) => row[index]).reverse());
}

export function startTetrisGame(root: HTMLElement): Cleanup {
  const canvas = required<HTMLCanvasElement>(root, 'canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable.');
  const scoreNode = required<HTMLElement>(root, '[data-score]');
  const highNode = required<HTMLElement>(root, '[data-high]');
  const levelNode = required<HTMLElement>(root, '[data-level]');
  const linesNode = required<HTMLElement>(root, '[data-lines]');
  const stateNode = required<HTMLElement>(root, '[data-state]');
  let board = emptyBoard();
  let current = createPiece();
  let next = createPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let running = false;
  let paused = false;
  let finished = false;
  let dropCounter = 0;
  let lastTime = 0;
  let raf = 0;
  let highScore = readHighScore(KEY);

  const updateHud = () => {
    scoreNode.textContent = String(score);
    highNode.textContent = String(Math.max(highScore, score));
    levelNode.textContent = String(level);
    linesNode.textContent = String(lines);
  };

  const setStatus = (message: string) => {
    stateNode.textContent = message;
  };

  const merge = () => {
    current.shape.forEach((row, y) => row.forEach((value, x) => {
      if (value && current.y + y >= 0) board[current.y + y][current.x + x] = Number(current.color);
    }));
  };

  const clearLines = () => {
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y -= 1) {
      if (board[y].every((value) => value !== 0)) {
        board.splice(y, 1);
        board.unshift(Array<number>(COLS).fill(0));
        cleared += 1;
        y += 1;
      }
    }
    if (cleared) {
      lines += cleared;
      level = Math.floor(lines / 8) + 1;
      score += [0, 100, 300, 500, 800][cleared] ?? cleared * 200;
      highScore = Math.max(highScore, score);
      saveHighScore(KEY, score);
      updateHud();
    }
  };

  const spawn = () => {
    current = next;
    next = createPiece();
    if (collides(board, current)) {
      running = false;
      finished = true;
      setStatus('方块堆满 · 游戏结束');
    }
  };

  const move = (dx: number, dy: number) => {
    if (!running || paused || finished) return;
    if (!collides(board, current, dx, dy)) {
      current.x += dx;
      current.y += dy;
      return true;
    }
    if (dy > 0) {
      merge();
      clearLines();
      spawn();
    }
    return false;
  };

  const hardDrop = () => {
    if (!running || paused || finished) return;
    while (move(0, 1)) {
      score += 2;
    }
    highScore = Math.max(highScore, score);
    saveHighScore(KEY, score);
    updateHud();
  };

  const rotatePiece = () => {
    if (!running || paused || finished) return;
    const rotated = rotate(current.shape);
    if (!collides(board, current, 0, 0, rotated)) current.shape = rotated;
  };

  const drawCell = (x: number, y: number, colorIndex: number, alpha = 1) => {
    context.globalAlpha = alpha;
    context.fillStyle = COLORS[colorIndex] ?? '#f8fafc';
    context.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
    context.globalAlpha = 1;
  };

  const draw = () => {
    context.clearRect(0, 0, COLS * CELL, ROWS * CELL);
    context.fillStyle = '#080d19';
    context.fillRect(0, 0, COLS * CELL, ROWS * CELL);
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (board[y][x]) drawCell(x, y, board[y][x]);
      }
    }
    current.shape.forEach((row, y) => row.forEach((value, x) => {
      if (value) drawCell(current.x + x, current.y + y, Number(current.color));
    }));
    context.strokeStyle = 'rgba(103, 232, 249, .08)';
    for (let x = 0; x <= COLS; x += 1) {
      context.beginPath();
      context.moveTo(x * CELL, 0);
      context.lineTo(x * CELL, ROWS * CELL);
      context.stroke();
    }
    for (let y = 0; y <= ROWS; y += 1) {
      context.beginPath();
      context.moveTo(0, y * CELL);
      context.lineTo(COLS * CELL, y * CELL);
      context.stroke();
    }
    const nextContext = canvas.parentElement?.querySelector<HTMLCanvasElement>('[data-next]')?.getContext('2d');
    if (nextContext) {
      nextContext.clearRect(0, 0, 120, 120);
      nextContext.fillStyle = '#080d19';
      nextContext.fillRect(0, 0, 120, 120);
      next.shape.forEach((row, y) => row.forEach((value, x) => {
        if (!value) return;
        nextContext.fillStyle = COLORS[Number(next.color)] ?? '#f8fafc';
        nextContext.fillRect(24 + x * 20, 24 + y * 20, 18, 18);
      }));
    }
  };

  const loop = (time: number) => {
    // 钳制 delta，避免切回标签页后瞬间掉落多格
    const delta = lastTime ? Math.min(time - lastTime, 240) : 0;
    lastTime = time;
    if (running && !paused && !finished) {
      dropCounter += delta;
      const interval = Math.max(100, 800 - (level - 1) * 65);
      if (dropCounter > interval) {
        move(0, 1);
        dropCounter = 0;
      }
    }
    draw();
    raf = window.requestAnimationFrame(loop);
  };

  const reset = () => {
    board = emptyBoard();
    current = createPiece();
    next = createPiece();
    score = 0;
    lines = 0;
    level = 1;
    running = false;
    paused = false;
    finished = false;
    dropCounter = 0;
    setStatus('按开始进入游戏');
    updateHud();
    draw();
  };

  const start = () => {
    if (finished) reset();
    running = true;
    paused = false;
    setStatus('进行中');
  };

  const togglePause = () => {
    if (finished) return;
    paused = !paused;
    setStatus(paused ? '已暂停' : '进行中');
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const key = event.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'a', 'd', 's', 'w', 'A', 'D', 'S', 'W'].includes(key)) {
      event.preventDefault();
      // 游戏结束不响应按键（需按重新开始）；暂停中按键不解除暂停
      if (finished) return;
      if (!running) start();
      if (paused) return;
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') move(-1, 0);
      if (key === 'ArrowRight' || key === 'd' || key === 'D') move(1, 0);
      if (key === 'ArrowDown' || key === 's' || key === 'S') {
        move(0, 1);
        score += 1;
        updateHud();
      }
      if (key === 'ArrowUp' || key === 'w' || key === 'W') rotatePiece();
      if (key === ' ') hardDrop();
    }
  };

  const unbinds = [
    bindButton(root, '[data-action="start"]', start),
    bindButton(root, '[data-action="pause"]', togglePause),
    bindButton(root, '[data-action="restart"]', () => {
      reset();
      start();
    }),
    bindButton(root, '[data-action="rotate"]', () => {
      start();
      rotatePiece();
    }),
    bindButton(root, '[data-action="drop"]', () => {
      start();
      hardDrop();
    }),
    ...[...root.querySelectorAll<HTMLButtonElement>('[data-move]')].map((button) => {
      const handler = () => {
        start();
        if (button.dataset.move === 'left') move(-1, 0);
        if (button.dataset.move === 'right') move(1, 0);
      };
      button.addEventListener('click', handler);
      return () => button.removeEventListener('click', handler);
    })
  ];
  window.addEventListener('keydown', onKeyDown);
  // 切走标签页时暂停、切回时恢复；离开页面才彻底清理
  let hiddenPaused = false;
  const unbindPage = bindPageCleanup(
    () => {
      running = false;
      window.cancelAnimationFrame(raf);
    },
    () => {
      if (running && !paused && !finished) {
        paused = true;
        hiddenPaused = true;
        setStatus('已暂停');
      }
    },
    () => {
      lastTime = 0;
      if (hiddenPaused) {
        paused = false;
        setStatus(running ? '进行中' : '按开始进入游戏');
      }
      hiddenPaused = false;
    }
  );

  reset();
  raf = window.requestAnimationFrame(loop);

  return () => {
    unbindPage();
    unbinds.forEach((unbind) => unbind());
    window.removeEventListener('keydown', onKeyDown);
    window.cancelAnimationFrame(raf);
  };
}


