import { bindButton, bindPageCleanup, highScoreKey, readHighScore, required, saveHighScore, type Cleanup } from './shared';

type Brick = { x: number; y: number; width: number; height: number; alive: boolean; color: string };

const KEY = highScoreKey('breakout');
const WIDTH = 480;
const HEIGHT = 360;
const PADDLE_WIDTH = 82;
const PADDLE_HEIGHT = 12;
const BALL_RADIUS = 7;
const COLORS = ['#67e8f9', '#a3e635', '#facc15', '#fb7185'];

function createBricks(): Brick[] {
  const bricks: Brick[] = [];
  const rows = 5;
  const columns = 9;
  const gap = 7;
  const width = (WIDTH - 32 - gap * (columns - 1)) / columns;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      bricks.push({
        x: 16 + column * (width + gap),
        y: 38 + row * 24,
        width,
        height: 16,
        alive: true,
        color: COLORS[row % COLORS.length]
      });
    }
  }
  return bricks;
}

export function startBreakoutGame(root: HTMLElement): Cleanup {
  const canvas = required<HTMLCanvasElement>(root, 'canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable.');
  const scoreNode = required<HTMLElement>(root, '[data-score]');
  const highNode = required<HTMLElement>(root, '[data-high]');
  const livesNode = required<HTMLElement>(root, '[data-lives]');
  const stateNode = required<HTMLElement>(root, '[data-state]');
  let paddleX = WIDTH / 2 - PADDLE_WIDTH / 2;
  let ball = { x: WIDTH / 2, y: HEIGHT - 60, vx: 180, vy: -220 };
  let bricks = createBricks();
  let score = 0;
  let lives = 3;
  let running = false;
  let paused = false;
  let finished = false;
  let raf = 0;
  let lastTime = 0;
  let highScore = readHighScore(KEY);

  const updateHud = () => {
    scoreNode.textContent = String(score);
    highNode.textContent = String(Math.max(highScore, score));
    livesNode.textContent = String(lives);
  };

  const setStatus = (message: string) => {
    stateNode.textContent = message;
  };

  const resetBall = () => {
    ball = { x: WIDTH / 2, y: HEIGHT - 60, vx: Math.random() > .5 ? 180 : -180, vy: -220 };
    paddleX = WIDTH / 2 - PADDLE_WIDTH / 2;
  };

  const draw = () => {
    context.clearRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = '#080d19';
    context.fillRect(0, 0, WIDTH, HEIGHT);
    bricks.forEach((brick) => {
      if (!brick.alive) return;
      context.fillStyle = brick.color;
      context.fillRect(brick.x, brick.y, brick.width, brick.height);
    });
    context.fillStyle = '#f8fafc';
    context.fillRect(paddleX, HEIGHT - 30, PADDLE_WIDTH, PADDLE_HEIGHT);
    context.fillStyle = '#facc15';
    context.beginPath();
    context.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    context.fill();
  };

  const finish = (message: string) => {
    running = false;
    finished = true;
    setStatus(message);
    highScore = Math.max(highScore, score);
    saveHighScore(KEY, score);
    updateHud();
  };

  const hitBrick = () => {
    for (const brick of bricks) {
      if (!brick.alive) continue;
      if (ball.x + BALL_RADIUS > brick.x && ball.x - BALL_RADIUS < brick.x + brick.width &&
          ball.y + BALL_RADIUS > brick.y && ball.y - BALL_RADIUS < brick.y + brick.height) {
        brick.alive = false;
        ball.vy *= -1;
        score += 10;
        highScore = Math.max(highScore, score);
        updateHud();
        if (bricks.every((item) => !item.alive)) {
          finish('全部砖块清除 · 通关！');
        }
        return;
      }
    }
  };

  const step = (delta: number) => {
    if (!running || paused || finished) return;
    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;
    if (ball.x < BALL_RADIUS || ball.x > WIDTH - BALL_RADIUS) {
      ball.vx *= -1;
      ball.x = Math.max(BALL_RADIUS, Math.min(WIDTH - BALL_RADIUS, ball.x));
    }
    if (ball.y < BALL_RADIUS) {
      ball.vy *= -1;
      ball.y = BALL_RADIUS;
    }
    const paddleY = HEIGHT - 30;
    if (ball.y + BALL_RADIUS >= paddleY && ball.y - BALL_RADIUS <= paddleY + PADDLE_HEIGHT &&
        ball.x >= paddleX && ball.x <= paddleX + PADDLE_WIDTH && ball.vy > 0) {
      const offset = (ball.x - (paddleX + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
      ball.vx = offset * 260;
      // 每次挡板反弹最多 +2% 并设上限，长时间对局球速不会失控
      ball.vy = -Math.min(Math.abs(ball.vy) * 1.02, 420);
    }
    hitBrick();
    if (ball.y > HEIGHT + 20) {
      lives -= 1;
      updateHud();
      if (lives <= 0) {
        finish('生命用完了 · 按重新开始再来一局');
      } else {
        resetBall();
        setStatus('小球掉落 · 还有生命');
      }
    }
  };

  const loop = (time: number) => {
    const delta = lastTime ? Math.min((time - lastTime) / 1000, .05) : 0;
    lastTime = time;
    step(delta);
    draw();
    raf = window.requestAnimationFrame(loop);
  };

  const reset = () => {
    paddleX = WIDTH / 2 - PADDLE_WIDTH / 2;
    bricks = createBricks();
    score = 0;
    lives = 3;
    running = false;
    paused = false;
    finished = false;
    resetBall();
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

  const movePaddle = (delta: number) => {
    paddleX = Math.max(0, Math.min(WIDTH - PADDLE_WIDTH, paddleX + delta));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(event.key)) {
      event.preventDefault();
      // 游戏结束不响应按键；暂停中按键不解除暂停
      if (finished) return;
      if (!running) start();
      if (paused) return;
      movePaddle(event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A' ? -28 : 28);
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    paddleX = Math.max(0, Math.min(WIDTH - PADDLE_WIDTH, ((event.clientX - rect.left) / rect.width) * WIDTH - PADDLE_WIDTH / 2));
  };

  const unbinds = [
    bindButton(root, '[data-action="start"]', start),
    bindButton(root, '[data-action="pause"]', togglePause),
    bindButton(root, '[data-action="restart"]', () => {
      reset();
      start();
    })
  ];
  window.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('pointermove', onPointerMove);
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
    canvas.removeEventListener('pointermove', onPointerMove);
    window.cancelAnimationFrame(raf);
  };
}
