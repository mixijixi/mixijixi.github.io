import { bindButton, bindPageCleanup, highScoreKey, readHighScore, required, saveHighScore, type Cleanup } from './shared';

type Bullet = { x: number; y: number; vx: number };
type Enemy = { x: number; y: number; vx: number; alive: boolean };

const KEY = highScoreKey('contra');
const WIDTH = 640;
const HEIGHT = 360;
const GROUND = 300;
const PLATFORMS = [
  { x: 80, y: 220, width: 130 },
  { x: 290, y: 170, width: 130 },
  { x: 500, y: 220, width: 100 }
];

export function startContraGame(root: HTMLElement): Cleanup {
  const canvas = required<HTMLCanvasElement>(root, 'canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable.');
  const scoreNode = required<HTMLElement>(root, '[data-score]');
  const highNode = required<HTMLElement>(root, '[data-high]');
  const livesNode = required<HTMLElement>(root, '[data-lives]');
  const stateNode = required<HTMLElement>(root, '[data-state]');
  let player = { x: 60, y: GROUND - 38, vx: 0, vy: 0, width: 24, height: 38, grounded: true };
  let bullets: Bullet[] = [];
  let enemies: Enemy[] = [];
  let score = 0;
  let lives = 3;
  let killed = 0;
  let running = false;
  let paused = false;
  let finished = false;
  let lastTime = 0;
  let raf = 0;
  let spawnTimer = 0;
  let shootCooldown = 0;
  let highScore = readHighScore(KEY);
  const keys = new Set<string>();

  const updateHud = () => {
    scoreNode.textContent = String(score);
    highNode.textContent = String(Math.max(highScore, score));
    livesNode.textContent = String(lives);
  };

  const setStatus = (message: string) => {
    stateNode.textContent = message;
  };

  const spawnEnemy = () => {
    const platform = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
    enemies.push({ x: platform.x + Math.random() * platform.width, y: platform.y - 28, vx: Math.random() > .5 ? 42 : -42, alive: true });
  };

  const rectsOverlap = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) => {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  };

  const reset = () => {
    player = { x: 60, y: GROUND - 38, vx: 0, vy: 0, width: 24, height: 38, grounded: true };
    bullets = [];
    enemies = [];
    score = 0;
    lives = 3;
    killed = 0;
    running = false;
    paused = false;
    finished = false;
    spawnTimer = 0;
    shootCooldown = 0;
    setStatus('按开始进入关卡');
    updateHud();
  };

  const start = () => {
    if (finished) reset();
    running = true;
    paused = false;
    setStatus('关卡进行中');
  };

  const togglePause = () => {
    if (finished) return;
    paused = !paused;
    if (paused) keys.clear();
    setStatus(paused ? '已暂停' : '关卡进行中');
  };

  const jump = () => {
    if (player.grounded) {
      player.vy = -410;
      player.grounded = false;
    }
  };

  const shoot = () => {
    if (shootCooldown > 0 || !running || paused) return;
    bullets.push({ x: player.x + player.width, y: player.y + 14, vx: 360 });
    shootCooldown = .22;
  };

  const damage = () => {
    lives -= 1;
    updateHud();
    if (lives <= 0) {
      running = false;
      finished = true;
      setStatus('任务失败 · 按重新开始再来一局');
      highScore = Math.max(highScore, score);
      saveHighScore(KEY, score);
    } else {
      player.x = 60;
      player.y = GROUND - 38;
      player.vy = 0;
      setStatus('受到伤害 · 继续前进');
    }
  };

  const update = (delta: number) => {
    if (!running || paused || finished) return;
    spawnTimer -= delta;
    shootCooldown -= delta;
    if (spawnTimer <= 0) {
      spawnEnemy();
      spawnTimer = 1.2;
    }
    const direction = (keys.has('ArrowRight') || keys.has('d') || keys.has('D') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') || keys.has('A') ? 1 : 0);
    player.vx = direction * 190;
    player.vy += 900 * delta;
    player.x = Math.max(0, Math.min(WIDTH - player.width, player.x + player.vx * delta));
    const previousBottom = player.y + player.height;
    player.y += player.vy * delta;
    player.grounded = false;
    if (player.y + player.height >= GROUND) {
      player.y = GROUND - player.height;
      player.vy = 0;
      player.grounded = true;
    }
    for (const platform of PLATFORMS) {
      if (player.vy >= 0 && previousBottom <= platform.y && player.y + player.height >= platform.y &&
          player.x + player.width > platform.x && player.x < platform.x + platform.width) {
        player.y = platform.y - player.height;
        player.vy = 0;
        player.grounded = true;
      }
    }
    bullets = bullets.map((bullet) => ({ ...bullet, x: bullet.x + bullet.vx * delta })).filter((bullet) => bullet.x < WIDTH + 20);
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      enemy.x += enemy.vx * delta;
      const platform = PLATFORMS.find((item) => enemy.y + 28 === item.y && enemy.x > item.x - 10 && enemy.x < item.x + item.width + 10);
      if (platform && (enemy.x < platform.x || enemy.x > platform.x + platform.width)) enemy.vx *= -1;
      if (rectsOverlap(player, { x: enemy.x, y: enemy.y, width: 24, height: 28 })) {
        enemy.alive = false;
        damage();
      }
    }
    for (const bullet of bullets) {
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (rectsOverlap({ x: bullet.x, y: bullet.y, width: 8, height: 4 }, { x: enemy.x, y: enemy.y, width: 24, height: 28 })) {
          enemy.alive = false;
          bullet.x = WIDTH + 100;
          killed += 1;
          score += 100;
          highScore = Math.max(highScore, score);
          updateHud();
          if (killed >= 12) {
            running = false;
            finished = true;
            setStatus('关卡完成 · 你守住了像素防线！');
            saveHighScore(KEY, score);
          }
        }
      }
    }
    enemies = enemies.filter((enemy) => enemy.alive && enemy.x > -40 && enemy.x < WIDTH + 40);
  };

  const draw = () => {
    context.clearRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = '#080d19';
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = 'rgba(103, 232, 249, .08)';
    for (let x = 0; x < WIDTH; x += 32) context.fillRect(x, 0, 1, HEIGHT);
    context.fillStyle = '#334155';
    context.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
    context.fillStyle = '#67e8f9';
    PLATFORMS.forEach((platform) => context.fillRect(platform.x, platform.y, platform.width, 8));
    context.fillStyle = '#f8fafc';
    context.fillRect(player.x, player.y, player.width, player.height);
    context.fillStyle = '#facc15';
    bullets.forEach((bullet) => context.fillRect(bullet.x, bullet.y, 8, 4));
    context.fillStyle = '#fb7185';
    enemies.forEach((enemy) => {
      if (enemy.alive) context.fillRect(enemy.x, enemy.y, 24, 28);
    });
  };

  const loop = (time: number) => {
    const delta = lastTime ? Math.min((time - lastTime) / 1000, .05) : 0;
    lastTime = time;
    update(delta);
    draw();
    raf = window.requestAnimationFrame(loop);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'a', 'd', 'w', 'A', 'D', 'W'].includes(event.key)) {
      event.preventDefault();
      // 游戏结束不响应按键；暂停中按键不解除暂停
      if (finished) return;
      if (!running) start();
      if (paused) return;
      keys.add(event.key);
      if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') jump();
      if (event.key === ' ') shoot();
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    keys.delete(event.key);
  };

  const touchStart = (action: string) => {
    if (action === 'jump') jump();
    if (action === 'shoot') shoot();
    keys.add(action === 'left' ? 'ArrowLeft' : action === 'right' ? 'ArrowRight' : action);
  };

  const touchEnd = (action: string) => {
    keys.delete(action === 'left' ? 'ArrowLeft' : action === 'right' ? 'ArrowRight' : action);
  };

  const unbinds = [
    bindButton(root, '[data-action="start"]', start),
    bindButton(root, '[data-action="pause"]', togglePause),
    bindButton(root, '[data-action="restart"]', () => {
      reset();
      start();
    }),
    ...[...root.querySelectorAll<HTMLButtonElement>('[data-touch]')].map((button) => {
      const action = button.dataset.touch ?? '';
      const down = (event: Event) => {
        event.preventDefault();
        touchStart(action);
      };
      const up = (event: Event) => {
        event.preventDefault();
        touchEnd(action);
      };
      button.addEventListener('pointerdown', down);
      button.addEventListener('pointerup', up);
      button.addEventListener('pointerleave', up);
      return () => {
        button.removeEventListener('pointerdown', down);
        button.removeEventListener('pointerup', up);
        button.removeEventListener('pointerleave', up);
      };
    })
  ];
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  // 窗口失焦时清空按键，避免恢复后角色持续移动
  const onBlur = () => keys.clear();
  window.addEventListener('blur', onBlur);
  // 切走标签页时暂停并清键、切回时恢复；离开页面才彻底清理
  let hiddenPaused = false;
  const unbindPage = bindPageCleanup(
    () => {
      running = false;
      window.cancelAnimationFrame(raf);
    },
    () => {
      keys.clear();
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
        setStatus(running ? '关卡进行中' : '按开始进入关卡');
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
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    window.cancelAnimationFrame(raf);
  };
}
