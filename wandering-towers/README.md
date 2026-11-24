# 巫师飞塔 / The Wandering Towers（标准版数字化）

> 基于 V4 开发总控文档的 TS 全栈实现。主线为 Three.js 三维版，可完整对局；服务端联机（Phase 5）仍为占位。

## 项目构成

仓库只有**一个可玩前端**（Three.js 三维版）；第一版 CSS 3D 前端已归档封存。

| 包 | 名称 | 定位 | 启动命令 | 端口 |
| --- | --- | --- | --- | --- |
| `packages/client` | **`@wt/client`** | **主线**：Three.js WebGL 渲染 + 羊皮纸界面 | `pnpm dev` | **8008** |
| `packages/engine` | `@wt/engine` | 规则引擎（前端与测试共用） | — | — |
| `packages/shared` | `@wt/shared` | 类型 / 地图 / 牌库 / 法术定义 | — | — |
| `packages/server` | `@wt/server` | 服务端权威层（Phase 5 占位） | — | — |
| `archive/v1-css3d-client` | `@wt/v1-css3d-client` | **已封存**：第一版 CSS 3D 舞台，仅作参考 | 不启用 | — |

> **版本沿革**：2026-11-24 起，原 `packages/client`（CSS 3D Transforms 实现）整体移入
> `archive/v1-css3d-client` 封存，不再参与构建；原 `packages/three-client` 提升为 `packages/client`，
> 成为唯一主线。归档说明见 [archive/README.md](archive/README.md)。

主线的完整说明见 **[packages/client/README.md](packages/client/README.md)**
（场景结构、回放机制、棋子比例与堆叠、已知边界）。

## 快速开始（Mac / Windows 通用）

需要 Node.js 20+ 与 pnpm 9.15.0（版本由 `packageManager` 固定）。

```bash
# 启用 pnpm（任选其一）
corepack enable && corepack prepare pnpm@9.15.0 --activate   # 推荐
# 或 npm i -g pnpm

pnpm install          # 安装依赖（会同时补齐 Windows / macOS 两端的原生二进制）
pnpm dev              # 启动前端 (http://localhost:8008)
pnpm test             # 运行测试
pnpm typecheck        # 类型检查
pnpm lint             # 代码检查
pnpm build            # 全仓构建
pnpm replay:check     # 100 局随机对局不变量校验
```

### 平台安装提示
- **Mac**：`brew install node@20` 或 `nvm install 20`（`.nvmrc` 已固定为 20）
- **Windows**：安装 Node 20 官方包 → `npm i -g pnpm`（WSL2 可选非必须）

## 两台机器共用同一个文件夹（Synology Drive 等同步盘）

**源码、文档、`pnpm-lock.yaml` 可以放心同步；`node_modules` 和构建产物不要跨机器同步。**

原因：Vite / Vitest 依赖 `esbuild`、`rollup` 的平台原生二进制，并且 pnpm 在 Windows 上用 junction、在 macOS 上用 symlink 组织 `node_modules`。把一台机器装好的 `node_modules` 同步到另一台，容易出现「找不到 darwin / win32 原生模块」或链接失效。

推荐做法：

1. 在 Synology Drive 客户端的同步任务里，把 `node_modules`、`dist`、`.vite`、`coverage`、`*.tsbuildinfo` 加入排除同步（项目已提供 `.gitignore`，供 git 忽略这些目录）。
2. 每台机器各自执行一次 `pnpm install`。`pnpm-lock.yaml` 是全平台完整的锁文件，两端安装结果一致、互相不干扰。
3. 作为兜底，根 `package.json` 的 `pnpm.supportedArchitectures` 会让 pnpm 在一次安装中同时准备 `win32` / `darwin` 的 x64 / arm64 原生二进制，并保留 `current`（当前平台）。即使偶尔同步了 `node_modules`，也不至于缺二进制；但链接方式仍不保证跨系统可用，换机器后建议重新执行一次 `pnpm install`（必要时 `pnpm install --force`）。
4. `.gitattributes` 统一 LF 换行，避免 Windows 端编辑器把整仓文件改成 CRLF 造成两端文件反复抖动。
5. `vitest.config.ts` 关闭了测试文件并行（`fileParallelism: false`）：Windows 上多个 worker 并发写同一个 vite-node 临时缓存文件会偶发 `EPERM`，并静默跳过部分测试文件；顺序执行更稳，Mac 上同样适用（仅略慢）。

> 本机 Windows 实测：Node 22.22.2 / pnpm 9.15.0 下 `install`、`dev`、`test`、`typecheck`、`lint`、`build`、`replay:check` 全部可用；macOS 端使用同一套命令与同一份锁文件即可。

## 可选：Docker 部署

本地开发无需 Docker；如需统一部署/CI：

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
  archive/
    v1-css3d-client/  已封存的第一版（React + CSS 3D Transforms），不参与构建
  docs/            开发文档体系（见 docs/README.md）
```

详见 [docs/README.md](docs/README.md)。
