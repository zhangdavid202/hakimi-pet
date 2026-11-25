# 哈基米桌宠 (Hakimi Pet) 🐾✨

> 一只住在桌面上的异色瞳星辰猫娘桌宠 —— 独立 Electron 透明置顶应用，参考 `dsh-pet`（大肥鱼）的动作链与物理手感设计，开箱即用、支持自定义 `.webm` 透明动画，并可一键导出为 `dsh-pet` 宠物包。

## ✨ 核心特性

- **专属星辰猫娘形象**：内置 6 套 Q 版透明立绘（待机 / 开心 / 害羞 / 傲娇 / 睡眠 / 干饭），搭配 CSS 程序化动效与粒子特效，开箱即活。
- **物理拖拽与甩抛（与 `dsh-pet` 同手感）**：
  - 过阻尼弹簧跟手拖拽（不抖不飘）
  - 松手按末速度抛物线飞行、碰壁/碰顶反弹、落地按冲击速度 **Q 弹挤压**
  - 接住高速飞行的哈基米（速度 $\ge 400\text{ px/s}$）触发**空中拦截积分** `+N ★`
- **永不停止的随机动作链**：待机呼吸、左右转向、屏幕漫游、点击 Q 弹回应，以及「小动作 / 玩耍 / 吃什么 / 时节 / 文字」五大动作分类（参考大肥鱼动作库）。
- **右键级联菜单 & 托盘控制**：随时点播任意动作、催一句碎碎念、固定宠物位置、回到初始角落。
- **碎碎念与表情包气泡**：定时或手动弹出可爱气泡与配套 Q 版表情包贴纸。
- **透明 `.webm` 无缝覆盖**：只要在 `assets/webm/` 放入与动作同名的 VP9-Alpha `.webm`（如 `待机呼吸休闲.webm`），即可自动切换为视频动画。
- **兼容 `dsh-pet`**：支持 JSONC 配置与 `npm run export:dsh-pack` 一键导出物种包。

## 🚀 快速开始

```bash
git clone https://github.com/zhangdavid202/hakimi-pet.git
cd hakimi-pet
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

## 🎬 自定义 `.webm` 动作 & `dsh-pet` 兼容

1. **添加 `.webm` 透明动作**：将 VP9-Alpha 透明背景 `.webm` 文件放入 `assets/webm/`，文件名与动作名一致（例如 `写代码.webm`、`吃白饭.webm`），重启即可优先播放。
2. **导出给 DeepSeek Harness (`dsh-pet`) 使用**：
   ```bash
   npm run build
   npm run export:dsh-pack
   ```
   生成的 `dsh-pet-pack/` 目录包含 `hakimi-config.json`、`hakimi-memes/` 和 `hakimi-animation/webm/`，复制到 `$DSH_HOME/dsh-pet/pet/` 下即可在 DSH 中加载。

## 📁 目录结构

```text
hakimi-pet/
├── assets/
│   ├── config.jsonc       # 哈基米配置（物理参数、动作池、碎碎念、表情包）
│   ├── sprites/           # Q 版透明立绘 (idle / happy / shy / angry / sleep / eat)
│   ├── memes/             # 气泡表情包贴纸
│   └── webm/              # 可选透明 .webm 动作覆盖目录
├── scripts/
│   ├── chroma-key.py      # 绿幕抠图与脚底对齐处理脚本
│   ├── export-dsh-pack.mjs# 导出 dsh-pet 物种包脚本
│   └── launch.mjs         # 智能启动器（支持回落本地已缓存 Electron）
├── src/
│   ├── shared/            # 纯逻辑核心（物理引擎、调度器、JSONC 解析、兼容层）
│   ├── main/              # Electron 主进程（透明置顶窗、穿透控制、托盘与级联菜单）
│   └── renderer/          # 渲染层（双模播放器、粒子画布、气泡、交互循环）
└── tests/                 # Vitest 单元测试
```

## 📄 开源协议

[MIT](./LICENSE)
