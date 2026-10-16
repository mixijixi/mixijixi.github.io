import { bindButton, bindPageCleanup, highScoreKey, readHighScore, required, saveHighScore, type Cleanup } from './shared';

type Direction = 'up' | 'down' | 'left' | 'right';
type MoveResult = { board: number[]; gained: number; moved: boolean };

const KEY = highScoreKey('2048');
const SIZE = 4;


function indexOf(x: number, y: number): number {
  return y * SIZE + x;
}

function collapseLine(line: number[]): { line: number[]; gained: number } {
  const values = line.filter((value) => value !== 0);
  const result: number[] = [];
  let gained = 0;
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === values[index + 1]) {
      const merged = values[index] * 2;
      result.push(merged);
      gained += merged;
      index += 1;
    } else {
      result.push(values[index]);
    }
  }
  while (result.length < SIZE) result.push(0);
  return { line: result, gained };
}

export function moveBoard(board: number[], direction: Direction): MoveResult {
  const next = [...board];
  let gained = 0;
  let moved = false;
  for (let outer = 0; outer < SIZE; outer += 1) {
    const line: number[] = [];
    for (let inner = 0; inner < SIZE; inner += 1) {
      const x = direction === 'left' || direction === 'right' ? inner : outer;
      const y = direction === 'up' || direction === 'down' ? inner : outer;
      line.push(next[indexOf(x, y)]);
    }
    const ordered = direction === 'right' || direction === 'down' ? [...line].reverse() : line;
    const collapsed = collapseLine(ordered);
    gained += collapsed.gained;
    const restored = direction === 'right' || direction === 'down' ? [...collapsed.line].reverse() : collapsed.line;
    for (let inner = 0; inner < SIZE; inner += 1) {
      const x = direction === 'left' || direction === 'right' ? inner : outer;
      const y = direction === 'up' || direction === 'down' ? inner : outer;
      const position = indexOf(x, y);
      if (next[position] !== restored[inner]) moved = true;
      next[position] = restored[inner];
    }
  }
  return { board: next, gained, moved };
}

function spawn(board: number[]): number[] {
  const empty = board.map((value, index) => value === 0 ? index : -1).filter((index) => index >= 0);
  if (!empty.length) return board;
  const position = empty[Math.floor(Math.random() * empty.length)];
  const next = [...board];
  next[position] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

export function start2048Game(root: HTMLElement): Cleanup {
  const boardNode = required<HTMLElement>(root, '[data-board]');
  const scoreNode = required<HTMLElement>(root, '[data-score]');
  const highNode = required<HTMLElement>(root, '[data-high]');
  const stateNode = required<HTMLElement>(root, '[data-state]');
  let board = Array<number>(SIZE * SIZE).fill(0);
  let score = 0;
  let highScore = readHighScore(KEY);
  let started = false;
  let finished = false;
  let celebrated = false;
  let pointerStart: { x: number; y: number } | null = null;

  const updateHud = () => {
    scoreNode.textContent = String(score);
    highNode.textContent = String(Math.max(highScore, score));
  };

  const render = () => {
    boardNode.innerHTML = '';
    board.forEach((value) => {
      const cell = document.createElement('div');
      cell.className = `tile${value ? ` tile-${Math.min(value, 2048)}` : ''}`;
      cell.textContent = value ? String(value) : '';
      boardNode.appendChild(cell);
    });
  };

  const checkEnd = () => {
    // 达成 2048 只提示一次，不结束本局，可继续挑战更高数字
    if (!celebrated && board.includes(2048)) {
      celebrated = true;
      stateNode.textContent = '达成 2048！胜利，可继续挑战更高数字。';
      return;
    }
    const hasEmpty = board.includes(0);
    const hasMove = board.some((value, index) => {
      const x = index % SIZE;
      const y = Math.floor(index / SIZE);
      return (x < SIZE - 1 && value === board[index + 1]) || (y < SIZE - 1 && value === board[index + SIZE]);
    });
    if (!hasEmpty && !hasMove) {
      finished = true;
      stateNode.textContent = '没有可移动的格子了 · 游戏结束';
    }
  };

  const reset = () => {
    board = Array<number>(SIZE * SIZE).fill(0);
    board = spawn(spawn(board));
    score = 0;
    started = false;
    finished = false;
    celebrated = false;
    stateNode.textContent = '按开始或使用方向键开始';
    updateHud();
    render();
  };

  const move = (direction: Direction) => {
    if (!started || finished) return;
    const result = moveBoard(board, direction);
    if (!result.moved) return;
    board = spawn(result.board);
    score += result.gained;
    highScore = Math.max(highScore, score);
    saveHighScore(KEY, score);
    updateHud();
    render();
    if (!finished) {
      stateNode.textContent = celebrated ? '进行中 · 继续挑战更高数字' : '进行中';
    }
    checkEnd();
  };

  const start = () => {
    if (finished) reset();
    started = true;
    stateNode.textContent = '进行中';
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const keyMap: Record<string, Direction> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up',
      a: 'left',
      s: 'down',
      d: 'right',
      W: 'up',
      A: 'left',
      S: 'down',
      D: 'right'
    };
    const direction = keyMap[event.key];
    if (!direction) return;
    event.preventDefault();
    start();
    move(direction);
  };

  const onPointerDown = (event: PointerEvent) => {
    pointerStart = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    start();
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  const unbinds = [
    bindButton(root, '[data-action="start"]', start),
    bindButton(root, '[data-action="restart"]', () => {
      reset();
      start();
    })
  ];

  window.addEventListener('keydown', onKeyDown);
  boardNode.addEventListener('pointerdown', onPointerDown);
  boardNode.addEventListener('pointerup', onPointerUp);
  const unbindPage = bindPageCleanup(() => undefined);

  reset();
  return () => {
    unbindPage();
    unbinds.forEach((unbind) => unbind());
    window.removeEventListener('keydown', onKeyDown);
    boardNode.removeEventListener('pointerdown', onPointerDown);
    boardNode.removeEventListener('pointerup', onPointerUp);
  };
}

export { spawn as spawn2048Tile };


