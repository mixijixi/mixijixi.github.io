import { bindButton, bindPageCleanup, highScoreKey, readHighScore, required, saveHighScore, type Cleanup } from './shared';

type Point = { x: number; y: number };

const GRID = 18;
const CELL = 20;
const KEY = highScoreKey('snake');

const DIRECTIONS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  a: { x: -1, y: 0 },
  s: { x: 0, y: 1 },
  d: { x: 1, y: 0 },
  W: { x: 0, y: -1 },
  A: { x: -1, y: 0 },
  S: { x: 0, y: 1 },
  D: { x: 1, y: 0 }
};

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function randomFood(snake: Point[]): Point {
  const open: Point[] = [];
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (!snake.some((part) => samePoint(part, { x, y }))) {
        open.push({ x, y });
      }
    }
  }
  return open[Math.floor(Math.random() * open.length)] ?? { x: 0, y: 0 };
}

export function startSnakeGame(root: HTMLElement): Cleanup {
  const canvas = required<HTMLCanvasElement>(root, 'canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is unavailable.');
  }

  const scoreNode = required<HTMLElement>(root, '[data-score]');
  const highNode = required<HTMLElement>(root, '[data-high]');
  const stateNode = required<HTMLElement>(root, '[data-state]');
  let snake: Point[] = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }];
  let direction: Point = { x: 1, y: 0 };
  let nextDirection: Point = direction;
  let food = randomFood(snake);
  let score = 0;
  let running = false;
  let gameOver = false;
  let accumulator = 0;
  let lastTime = 0;
  let raf = 0;
  let highScore = readHighScore(KEY);

  const setScore = () => {
    scoreNode.textContent = String(score);
    highNode.textContent = String(Math.max(highScore, score));
  };

  const drawCell = (point: Point, color: string, inset = 1) => {
    context.fillStyle = color;
    context.fillRect(point.x * CELL + inset, point.y * CELL + inset, CELL - inset * 2, CELL - inset * 2);
  };

  const draw = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#080d19';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(103, 232, 249, .08)';
    for (let i = 0; i <= GRID; i += 1) {
      context.beginPath();
      context.moveTo(i * CELL, 0);
      context.lineTo(i * CELL, GRID * CELL);
      context.stroke();
      context.beginPath();
      context.moveTo(0, i * CELL);
      context.lineTo(GRID * CELL, i * CELL);
      context.stroke();
    }
    drawCell(food, '#facc15', 3);
    snake.forEach((part, index) => drawCell(part, index === 0 ? '#f8fafc' : '#67e8f9', 2));
  };

  const finish = (message: string) => {
    running = false;
    gameOver = true;
    stateNode.textContent = message;
    highScore = Math.max(highScore, score);
    saveHighScore(KEY, score);
    setScore();
  };

  const step = () => {
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const hitsWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
    const hitsSelf = snake.some((part) => samePoint(part, head));
    if (hitsWall || hitsSelf) {
      finish('游戏结束 · 按重新开始再来一局');
      return;
    }
    snake.unshift(head);
    if (samePoint(head, food)) {
      score += 10;
      food = randomFood(snake);
      setScore();
    } else {
      snake.pop();
    }
    draw();
  };

  const loop = (time: number) => {
    // 钳制 delta：切回标签页或窗口卡顿后不会瞬间连跳多步
    const delta = lastTime ? Math.min(time - lastTime, 240) : 0;
    lastTime = time;
    if (running) {
      accumulator += delta;
      while (accumulator >= 120) {
        accumulator -= 120;
        step();
      }
    }
    raf = window.requestAnimationFrame(loop);
  };

  const reset = () => {
    snake = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }];
    direction = { x: 1, y: 0 };
    nextDirection = direction;
    food = randomFood(snake);
    score = 0;
    running = false;
    gameOver = false;
    accumulator = 0;
    stateNode.textContent = '按开始进入游戏';
    setScore();
    draw();
  };

  const start = () => {
    if (gameOver) {
      reset();
    }
    running = true;
    stateNode.textContent = '运行中';
  };

  const togglePause = () => {
    if (gameOver) return;
    running = !running;
    stateNode.textContent = running ? '运行中' : '已暂停';
  };

  const setDirection = (next: Point) => {
    if (next.x === -direction.x && next.y === -direction.y) return;
    nextDirection = next;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const next = DIRECTIONS[event.key];
    if (!next) return;
    event.preventDefault();
    setDirection(next);
    if (!running && !gameOver) start();
  };

  const unbinds = [
    bindButton(root, '[data-action="start"]', start),
    bindButton(root, '[data-action="pause"]', togglePause),
    bindButton(root, '[data-action="restart"]', () => {
      reset();
      start();
    }),
    ...[...root.querySelectorAll<HTMLButtonElement>('[data-direction]')].map((button) => {
      const next = DIRECTIONS[button.dataset.direction ?? ''];
      const handler = () => {
        if (next) setDirection(next);
        if (!running && !gameOver) start();
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
      if (running) {
        running = false;
        hiddenPaused = true;
        stateNode.textContent = '已暂停';
      }
    },
    () => {
      lastTime = 0;
      if (hiddenPaused && !gameOver) {
        running = true;
        stateNode.textContent = '运行中';
      }
      hiddenPaused = false;
    }
  );

  setScore();
  reset();
  raf = window.requestAnimationFrame(loop);

  return () => {
    unbindPage();
    unbinds.forEach((unbind) => unbind());
    window.removeEventListener('keydown', onKeyDown);
    window.cancelAnimationFrame(raf);
  };
}
