# 哈基米桌宠 (Hakimi Pet) 🐾✨

> 一只住在桌面上的 **3D 异色瞳星辰猫娘** 桌宠 —— 独立 Electron + Three.js 透明置顶应用，支持全局鼠标眼神追踪、骨骼动作、Shift+左键 360° 视角旋转、2D/3D 一键切换，参考 `dsh-pet`（大肥鱼）的动作链与物理手感设计，并兼容 `.webm` 与 `dsh-pet` 物种包导出。

## ✨ 核心特性

- **实时 3D 星辰猫娘（默认开启）**：
  - Three.js / WebGL 渲染 Q 版 3D 紫蓝长发异色瞳猫娘（右眼粉晶、左眼星金、双丸子头星辰发卡、五节蓬松摆动猫尾）。
  - **全局鼠标眼神追踪**：无论鼠标在屏幕哪个窗口，哈基米的双眸与头部都会自然追随你的光标，还会自动眨眼与抖耳朵。
  - **Shift + 左键拖拽 360° 旋转**：按住 `Shift` 拖动即可全方位旋转欣赏 3D 视角，右键菜单支持一键重置视角或秒切 **2D Q版立绘模式**。
  - **支持自定义 `.glb` 模型**：把 `hakimi.glb` 放入 `assets/models/` 即可替换内置 3D 模型。
- **物理拖拽与甩抛（与 `dsh-pet` 同手感）**：
  - 过阻尼弹簧跟手拖拽（不抖不飘）
  - 松手按末速度抛物线飞行、碰壁/碰顶反弹、落地按冲击速度 **Q 弹挤压**
  - 接住高速飞行的哈基米（速度 $\ge 400\text{ px/s}$）触发**空中拦截积分** `+N ★`
- **永不停止的随机动作链**：待机呼吸、左右转向、屏幕漫游、点击 Q 弹回应，以及「小动作 / 玩耍 / 吃什么 / 时节 / 文字」五大动作分类（参考大肥鱼动作库）。
- **右键级联菜单 & 托盘控制**：随时切换 3D/2D 模式、点播任意动作、催一句碎碎念、固定宠物位置、回到初始角落。
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
npm run build          # 编译主进程/共享模块并打包 3D 渲染层
npm test               # 运行 Vitest 单元测试
npm run test:coverage  # 查看核心纯逻辑覆盖率
```

## 📁 目录结构

```text
hakimi-pet/
├── 启动哈基米.bat          # Windows 一键双击启动脚本
├── assets/
│   ├── config.jsonc       # 哈基米配置（默认 3D 模式、物理参数、动作池、碎碎念）
│   ├── models/            # 可选自定义 hakimi.glb 3D 模型目录
│   ├── sprites/           # 2D Q 版透明立绘 (idle / happy / shy / angry / sleep / eat)
│   ├── memes/             # 气泡表情包贴纸
│   └── webm/              # 可选透明 .webm 动作覆盖目录
├── scripts/
│   ├── chroma-key.py      # 绿幕抠图与脚底对齐处理脚本
│   ├── export-dsh-pack.mjs# 导出 dsh-pet 物种包脚本
│   └── launch.mjs         # 智能启动器（支持回落本地已缓存 Electron）
├── src/
│   ├── shared/            # 纯逻辑核心（物理引擎、调度器、3D 视线追踪、JSONC 解析）
│   ├── main/              # Electron 主进程（透明置顶窗、全局光标广播、托盘与级联菜单）
│   └── renderer/          # 渲染层（Three.js 3D 骨骼与场景、2D/Video 切换、粒子画布）
└── tests/                 # Vitest 单元测试
```

## 📄 开源协议

[MIT](./LICENSE)
