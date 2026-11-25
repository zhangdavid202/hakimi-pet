import { app, BrowserWindow, ipcMain, Menu, MenuItemConstructorOptions, nativeImage, screen, shell, Tray } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { DEFAULT_CONFIG, parseConfig } from '../shared/config';
import { AppConfig, Bounds, RenderMode } from '../shared/types';
import { InitPayload, MenuCommand, WindowLayoutMetrics } from './preload';

const PAD_X = 140;
const PAD_TOP = 190;
const PAD_BOTTOM = 40;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let cursorTimer: NodeJS.Timeout | null = null;
let currentConfig: AppConfig = DEFAULT_CONFIG;
let isQuitting = false;

function getProjectRoot(): string {
  return path.resolve(__dirname, '..', '..');
}

function loadAppConfig(rootDir: string): AppConfig {
  const userCfgPath = path.join(app.getPath('userData'), 'config.jsonc');
  const defaultCfgPath = path.join(rootDir, 'assets', 'config.jsonc');
  for (const candidate of [userCfgPath, defaultCfgPath]) {
    if (fs.existsSync(candidate)) {
      try {
        return parseConfig(fs.readFileSync(candidate, 'utf8'));
      } catch (err) {
        console.error(`[hakimi-pet] Failed to parse ${candidate}:`, err);
      }
    }
  }
  return DEFAULT_CONFIG;
}

function scanWebmFiles(rootDir: string): string[] {
  const webmDir = path.join(rootDir, 'assets', 'webm');
  if (!fs.existsSync(webmDir)) return [];
  return fs
    .readdirSync(webmDir)
    .filter((f) => f.toLowerCase().endsWith('.webm'));
}

function findCustomModelUrl(rootDir: string): string | undefined {
  const glbPath = path.join(rootDir, 'assets', 'models', 'hakimi.glb');
  return fs.existsSync(glbPath) ? pathToFileURL(glbPath).toString() : undefined;
}

function getLayoutMetrics(petSize: number): WindowLayoutMetrics {
  return {
    padX: PAD_X,
    padTop: PAD_TOP,
    padBottom: PAD_BOTTOM,
    width: petSize + PAD_X * 2,
    height: petSize + PAD_TOP + PAD_BOTTOM,
  };
}

function getScreenWorkBounds(): Bounds {
  const wa = screen.getPrimaryDisplay().workArea;
  return {
    left: wa.x,
    top: wa.y,
    right: wa.x + wa.width,
    bottom: wa.y + wa.height,
  };
}

function computeInitialWindowPos(config: AppConfig, layout: WindowLayoutMetrics, bounds: Bounds): { x: number; y: number } {
  const { corner, marginX, marginY } = config.pet.position;
  const petSize = config.pet.size;

  const petX =
    corner.endsWith('right')
      ? bounds.right - petSize - marginX
      : bounds.left + marginX;
  const petY =
    corner.startsWith('bottom')
      ? bounds.bottom - petSize - marginY
      : bounds.top + marginY;

  return {
    x: Math.round(petX - layout.padX),
    y: Math.round(petY - layout.padTop),
  };
}

function sendMenuCommand(cmd: MenuCommand): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('menu-command', cmd);
  }
}

function buildActionSubmenu(config: AppConfig, facingRight: boolean): MenuItemConstructorOptions[] {
  const makeItems = (names: readonly string[]): MenuItemConstructorOptions[] =>
    names.map((name) => ({
      label: name,
      click: () => sendMenuCommand({ type: 'play-action', name }),
    }));

  const items: MenuItemConstructorOptions[] = [
    { label: '待机', submenu: makeItems(config.animations.idle) },
    { label: '转向', submenu: makeItems(config.animations.turn) },
    { label: '点击回应', submenu: makeItems(config.animations.clicks) },
    { label: '移动', submenu: makeItems(config.animations.moves.actions.map((a) => a.name)) },
    { type: 'separator' },
  ];

  for (const cat of config.animations.categories) {
    items.push({
      label: cat.noMirror && facingRight ? `${cat.id} (自动朝左)` : cat.id,
      submenu: makeItems(cat.actions),
    });
  }

  return items;
}

function showPetContextMenu(state: {
  fixedEnabled: boolean;
  whisperEnabled: boolean;
  facingRight: boolean;
  renderMode: RenderMode;
}): void {
  if (!mainWindow) return;
  const menu = Menu.buildFromTemplate([
    { label: '💬 碎碎念一下', click: () => sendMenuCommand({ type: 'whisper-now' }) },
    { label: '🏠 回到初始位置', click: () => sendMenuCommand({ type: 'reset-position' }) },
    { type: 'separator' },
    {
      label: '🧊 渲染模式',
      submenu: [
        {
          label: '3D 实时模型（眼神跟随 / Shift+拖拽旋转）',
          type: 'radio',
          checked: state.renderMode === '3d',
          click: () => sendMenuCommand({ type: 'set-render-mode', renderMode: '3d' }),
        },
        {
          label: '2D Q版立绘',
          type: 'radio',
          checked: state.renderMode === '2d',
          click: () => sendMenuCommand({ type: 'set-render-mode', renderMode: '2d' }),
        },
        { type: 'separator' },
        {
          label: '🔄 重置 3D 视角',
          enabled: state.renderMode === '3d',
          click: () => sendMenuCommand({ type: 'reset-orbit' }),
        },
      ],
    },
    {
      label: '📌 固定宠物（不乱走）',
      type: 'checkbox',
      checked: state.fixedEnabled,
      click: (item) => sendMenuCommand({ type: 'toggle-fixed', fixedEnabled: item.checked }),
    },
    {
      label: '💭 自动碎碎念',
      type: 'checkbox',
      checked: state.whisperEnabled,
      click: (item) => sendMenuCommand({ type: 'toggle-whisper', whisperEnabled: item.checked }),
    },
    { type: 'separator' },
    { label: '✨ 动作点播', submenu: buildActionSubmenu(currentConfig, state.facingRight) },
    { type: 'separator' },
    {
      label: '📂 打开素材目录',
      click: () => {
        void shell.openPath(path.join(getProjectRoot(), 'assets'));
      },
    },
    {
      label: '🚪 退出哈基米',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  menu.popup({ window: mainWindow });
}

function createTray(rootDir: string): void {
  const iconPath = path.join(rootDir, 'assets', 'sprites', 'idle.png');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 20, height: 20 })
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('哈基米桌宠 (Hakimi Pet)');
  const contextMenu = Menu.buildFromTemplate([
    { label: '💬 碎碎念一下', click: () => sendMenuCommand({ type: 'whisper-now' }) },
    { label: '🏠 回到初始位置', click: () => sendMenuCommand({ type: 'reset-position' }) },
    { type: 'separator' },
    {
      label: '🚪 退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
}

function createWindow(): void {
  const rootDir = getProjectRoot();
  currentConfig = loadAppConfig(rootDir);
  const layout = getLayoutMetrics(currentConfig.pet.size);
  const bounds = getScreenWorkBounds();
  const initialPos = computeInitialWindowPos(currentConfig, layout, bounds);

  mainWindow = new BrowserWindow({
    x: initialPos.x,
    y: initialPos.y,
    width: layout.width,
    height: layout.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  const htmlPath = path.join(rootDir, 'src', 'renderer', 'index.html');
  void mainWindow.loadFile(htmlPath);

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
    }
  });
}

app.whenReady().then(() => {
  const rootDir = getProjectRoot();

  ipcMain.handle('get-init-data', (): InitPayload => {
    const layout = getLayoutMetrics(currentConfig.pet.size);
    const bounds = getScreenWorkBounds();
    return {
      config: currentConfig,
      availableWebms: scanWebmFiles(rootDir),
      customModelUrl: findCustomModelUrl(rootDir),
      screenBounds: bounds,
      initialWindowPos: computeInitialWindowPos(currentConfig, layout, bounds),
      layout,
      assetBaseUrl: pathToFileURL(path.join(rootDir, 'assets')).toString(),
    };
  });

  ipcMain.handle('get-screen-bounds', (): Bounds => getScreenWorkBounds());

  ipcMain.on('set-ignore-mouse', (_event, ignore: boolean) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
    }
  });

  ipcMain.on('move-window', (_event, x: number, y: number) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const layout = getLayoutMetrics(currentConfig.pet.size);
      mainWindow.setBounds({
        x: Math.round(x),
        y: Math.round(y),
        width: layout.width,
        height: layout.height,
      });
    }
  });

  ipcMain.on(
    'open-context-menu',
    (
      _event,
      state: {
        fixedEnabled: boolean;
        whisperEnabled: boolean;
        facingRight: boolean;
        renderMode: RenderMode;
      },
    ) => {
      showPetContextMenu(state);
    },
  );

  createWindow();
  createTray(rootDir);

  let lastCursor = { x: -1, y: -1 };
  cursorTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const pt = screen.getCursorScreenPoint();
    if (pt.x !== lastCursor.x || pt.y !== lastCursor.y) {
      lastCursor = pt;
      mainWindow.webContents.send('cursor-pos', pt);
    }
  }, 50);

  const isSmokeTest =
    process.argv.includes('--smoke-test') || process.env.HAKIMI_SMOKE_TEST === '1';
  if (isSmokeTest && mainWindow) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        isQuitting = true;
        app.quit();
      }, 1200);
    });
  }
});

app.on('before-quit', () => {
  if (cursorTimer) {
    clearInterval(cursorTimer);
    cursorTimer = null;
  }
});

app.on('window-all-closed', () => {
  if (isQuitting) {
    app.quit();
  }
});
