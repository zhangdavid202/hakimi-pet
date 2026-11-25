# 哈基米桌宠 (Hakimi Pet) 🐾✨

> 一只住在桌面上的 **2.5D 星辰猫娘** 桌宠 —— 保留原版精致 Q 版二次元立绘形象，自带鼠标全局视差追随、Q 弹物理抛掷、参考 `dsh-pet`（大肥鱼）的动作链与右键点播菜单，同时支持自定义 `.webm` 透明动画、外部高精度 `.glb` 3D 模型与 `dsh-pet` 物种包导出。

## ✨ 核心特性

- **精致 Q 版星辰猫娘形象（2.5D 立体视差）**：
  - 内置 6 套高清透明 Q 版立绘（待机 / 开心 / 害羞 / 傲娇 / 睡眠 / 干饭），搭配 **全局鼠标 2.5D 透视跟随** 与 `Shift+左键拖拽` 视角微调。
  - **支持自定义高精度 3D 模型（`.glb`）**：如果你通过 VRoid / Blender / Tripo3D 导出了精细 3D 猫娘模型，放入 `assets/models/hakimi.glb` 即可在右键菜单切换为真 3D 模式。
- **物理拖拽与甩抛（与 `dsh-pet` 同手感）**：
  - 过阻尼弹簧跟手拖拽（不抖不飘）
  - 松手按末速度抛物线飞行、碰壁/碰顶反弹、落地按冲击速度 **Q 弹挤压**
  - 接住高速飞行的哈基米（速度 $\ge 400\text{ px/s}$）触发**空中拦截积分** `+N ★`
- **永不停止的随机动作链**：待机呼吸、左右转向、屏幕漫游、点击 Q 弹回应，以及「小动作 / 玩耍 / 吃什么 / 时节 / 文字」五大动作分类（参考大肥鱼动作库）。
- **自由调节大小（滚轮 + 菜单 + 自动记住）**：鼠标悬停在哈基米身上滚动滚轮即可实时缩放（`100px ~ 520px`），也可以通过右键菜单「📏 调整大小」选择预设档位，调整后自动保存。
- **右键级联菜单 & 托盘控制**：随时点播任意动作、调整大小、催一句碎碎念、固定宠物位置、回到初始角落。
- **透明 `.webm` 无缝覆盖 & 兼容 `dsh-pet`**：放入 `assets/webm/<动作名>.webm` 自动优先播放；运行 `npm run export:dsh-pack` 一键导出物种包。

## 🚀 快速开始

Windows 用户可直接双击项目根目录的 **`启动哈基米.bat`**，或在命令行跨盘符启动：

```cmd
git clone https://github.com/zhangdavid202/hakimi-pet.git
cd /d hakimi-pet
npm install
npm start
```

> 若在部分网络环境下 Electron 二进制下载较慢，可设置镜像后安装：
> `ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/" npm install`

## 🧪 构建与测试

```bash
npm run build          # 编译主进程/共享模块并打包渲染层
npm test               # 运行 Vitest 单元测试
npm run test:coverage  # 查看核心纯逻辑覆盖率
```

## 📁 目录结构

```text
hakimi-pet/
├── 启动哈基米.bat          # Windows 一键双击启动脚本
├── assets/
│   ├── config.jsonc       # 哈基米配置（物理参数、动作池、碎碎念、表情包）
│   ├── models/            # 可选外部高精度 hakimi.glb 3D 模型目录
│   ├── sprites/           # Q 版透明立绘 (idle / happy / shy / angry / sleep / eat)
│   ├── memes/             # 气泡表情包贴纸
│   └── webm/              # 可选透明 .webm 动作覆盖目录
├── scripts/
│   ├── chroma-key.py      # 绿幕抠图与脚底对齐处理脚本
│   ├── export-dsh-pack.mjs# 导出 dsh-pet 物种包脚本
│   └── launch.mjs         # 智能启动器（支持回落本地已缓存 Electron）
├── src/
│   ├── shared/            # 纯逻辑核心（物理引擎、调度器、视差角度、JSONC 解析）
│   ├── main/              # Electron 主进程（透明置顶窗、全局光标广播、托盘与级联菜单）
│   └── renderer/          # 渲染层（立绘 2.5D 透视、可选 GLB 渲染、粒子画布）
└── tests/                 # Vitest 单元测试
```

## 📄 开源协议

[MIT](./LICENSE)
