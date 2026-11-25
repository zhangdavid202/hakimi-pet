import { contextBridge, ipcRenderer } from 'electron';
import { AppConfig, Bounds, RenderMode, Vec2 } from '../shared/types';

export interface WindowLayoutMetrics {
  readonly padX: number;
  readonly padTop: number;
  readonly padBottom: number;
  readonly width: number;
  readonly height: number;
}

export interface InitPayload {
  readonly config: AppConfig;
  readonly availableWebms: readonly string[];
  readonly customModelUrl?: string;
  readonly screenBounds: Bounds;
  readonly initialWindowPos: { readonly x: number; readonly y: number };
  readonly layout: WindowLayoutMetrics;
  readonly assetBaseUrl: string;
}

export type MenuCommand =
  | { readonly type: 'play-action'; readonly name: string }
  | { readonly type: 'whisper-now' }
  | { readonly type: 'reset-position' }
  | { readonly type: 'reset-orbit' }
  | { readonly type: 'set-size'; readonly size: number }
  | { readonly type: 'set-render-mode'; readonly renderMode: RenderMode }
  | { readonly type: 'toggle-fixed'; readonly fixedEnabled: boolean }
  | { readonly type: 'toggle-whisper'; readonly whisperEnabled: boolean };

contextBridge.exposeInMainWorld('petAPI', {
  getInitData: (): Promise<InitPayload> => ipcRenderer.invoke('get-init-data'),
  getScreenBounds: (): Promise<Bounds> => ipcRenderer.invoke('get-screen-bounds'),
  setIgnoreMouse: (ignore: boolean): void => ipcRenderer.send('set-ignore-mouse', ignore),
  moveWindow: (x: number, y: number): void => ipcRenderer.send('move-window', x, y),
  setSize: (size: number): void => ipcRenderer.send('set-pet-size', size),
  openContextMenu: (state: {
    fixedEnabled: boolean;
    whisperEnabled: boolean;
    facingRight: boolean;
    renderMode: RenderMode;
    size: number;
  }): void => ipcRenderer.send('open-context-menu', state),
  onMenuCommand: (handler: (cmd: MenuCommand) => void): void => {
    ipcRenderer.removeAllListeners('menu-command');
    ipcRenderer.on('menu-command', (_event, cmd: MenuCommand) => handler(cmd));
  },
  onCursorPos: (handler: (pos: Vec2) => void): void => {
    ipcRenderer.removeAllListeners('cursor-pos');
    ipcRenderer.on('cursor-pos', (_event, pos: Vec2) => handler(pos));
  },
});
