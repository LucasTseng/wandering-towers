# 巫师飞塔 · 开发说明（wandering-towers）

> 本文件面向开发与部署；项目总览、界面截图与玩法说明见仓库根目录的 [README](../README.md)。

基于 V4 开发总控文档的 TypeScript 全栈实现。主线为 Three.js 三维版，可完整对局；
服务端联机（Phase 5）仍为占位。

## 项目构成

| 包 | 名称 | 定位 | 启动命令 | 端口 |
| --- | --- | --- | --- | --- |
| `packages/client` | `@wt/client` | **主线**：React 18 + Vite + Three.js WebGL 渲染 + 羊皮纸界面 | `pnpm dev` | **8008** |
| `packages/engine` | `@wt/engine` | 规则引擎（纯逻辑，无 IO / 无 DOM） | — | — |
| `packages/shared` | `@wt/shared` | 类型 / 地图 / 牌库 / 法术定义 | — | — |
| `packages/server` | `@wt/server` | 服务端权威层（Phase 5 占位） | — | — |

主线的完整说明见 **[packages/client/README.md](packages/client/README.md)**
（场景结构、回放机制、纵向卡牌层、棋子比例与堆叠、已知边界）。

> **版本沿革**：2026-11-24 起，原 `packages/client`（CSS 3D Transforms 实现）先被归档，
> 随后整份代码从仓库移除；原 `packages/three-client` 提升为 `packages/client`，成为唯一主线。
> 第一版仍可从历史提交取回，说明见 [archive/README.md](archive/README.md)。

## 快速开始

需要 Node.js 20+（`.nvmrc` 固定为 20）与 pnpm 9.15.0（版本由 `packageManager` 固定）。

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate   # 推荐
# 或 npm i -g pnpm@9.15.0

pnpm install
pnpm dev        # http://localhost:8008
```

### 常用命令

```bash
pnpm dev           # 开发服务器（热更新）
pnpm build         # 全仓构建
pnpm typecheck     # TypeScript 检查
pnpm test          # Vitest 全量（8 文件 / 89 例）
pnpm test:engine   # 只跑规则引擎
pnpm lint          # ESLint
pnpm replay:check  # 随机对局回放一致性
```

## 双端（macOS / Windows）说明

两端使用**同一套命令与同一份锁文件**。仓库已经做了这些适配：

| 机制 | 作用 |
| --- | --- |
| `.npmrc` → `node-linker=hoisted` | 两端安装结果一致；也避免同步盘上因残留空壳目录导致的链接失败 |
| `pnpm.supportedArchitectures`（`current` + `win32` + `darwin`） | 一次安装即准备三平台的原生二进制，锁文件同时包含 esbuild / rollup 的 Windows 包 |
| `.gitattributes` → `* text=auto eol=lf` | 统一 LF，避免 Windows 编辑器批量改成 CRLF |
| `vitest` 关闭文件级并行 | Windows 上多 worker 并发写临时缓存会偶发 `EPERM` 并静默跳过用例 |

**不要跨机器同步 `node_modules`。** 里面有平台相关的原生二进制与链接结构，换机后重新 `pnpm install` 即可。
如果确实用 Synology Drive / OneDrive 共享目录，建议把 `node_modules`、`dist`、`.vite`、`coverage` 排除同步。

Windows 补充：

- 未安装 pnpm 时：`npm i -g pnpm@9.15.0`
- 路径过长会触发 Windows 260 字符限制，建议放在 `C:\dev\wandering-towers` 这类短路径下
- PowerShell 与 Windows Terminal 均可，脚本不依赖 bash 专有语法

## Docker（可选）

```bash
pnpm docker:build     # 构建镜像
pnpm docker:up        # 启动容器（端口 3000）
pnpm docker:down      # 停止
```

## 工程结构

```
wandering-towers/
  packages/
    shared/        静态定义层（枚举/类型/地图/法术/牌/配置）— 前后端共享
    engine/        规则引擎（纯逻辑，无 IO）
    server/        服务端权威层（Phase 5 联机实装）
    client/        主线前端：React + Vite + Three.js（端口 8008）
  archive/         仅一份说明：第一版实现已从仓库移除
  docs/            开发文档体系（见 docs/README.md）
```

## 界面现状

界面已是「Z 轴分层 + 四角 HUD」，右侧栏已删除：

- 手牌 3 张为前景 3D 卡面；点击后主卡抬升，下一步浮层贴在其正下方
- 进入选巫师 / 选塔后，主卡退到左下并缩小，浮层横贴右侧，把棋盘中部让给点选
- 法术 4 张收为左后方牌堆，悬停召至前景展开，手牌反向收拢
- 魔法瓶为 3D 漂浮瓶位；左上铭牌合并轮次与行动；右上为玩家状态卡；右下结束回合

设计与实施记录见 [`docs/architecture/08-UI纵深交互方案.md`](docs/architecture/08-UI纵深交互方案.md)，
可运行原型见 [`docs/prototypes/depth-ui-demo.html`](docs/prototypes/depth-ui-demo.html)。

尚未完成：键盘 / 读屏可达性、窄屏降级布局（TU.4）。

## 文档

从 [docs/README.md](docs/README.md) 进入文档地图。核心几份：

| 文档 | 内容 |
| --- | --- |
| [开发设计文档-架构与实现基线](docs/开发设计文档-架构与实现基线.md) | 单一事实来源 |
| [08-UI纵深交互方案](docs/architecture/08-UI纵深交互方案.md) | 纵深界面设计与实施记录 |
| [00-开发任务总表](docs/00-开发任务总表.md) | 任务分解与 DoD |
| [dev-log](docs/dev-log/) | 逐阶段开发日志 |
