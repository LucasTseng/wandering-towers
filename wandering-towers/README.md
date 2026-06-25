# 巫师飞塔 / The Wandering Towers（标准版数字化）

> 基于 V4 开发总控文档的 TS 全栈实现。当前阶段：**Phase 0 工程骨架已完成**。

## 快速开始（Mac / Windows 通用）

需要 Node.js 20+。

```bash
# 启用 pnpm（任选其一）
corepack enable && corepack prepare pnpm@9.15.0 --activate   # 推荐
# 或 npm i -g pnpm

pnpm install          # 安装依赖
pnpm dev              # 启动前端 (http://localhost:5173)
pnpm test             # 运行测试
pnpm typecheck        # 类型检查
pnpm lint             # 代码检查
```

### 平台安装提示
- **Mac**：`brew install node@20` 或 `nvm install 20`
- **Windows**：安装 Node 20 官方包 → `npm i -g pnpm`（WSL2 可选非必须）

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
    shared/   静态定义层（枚举/类型/地图/法术/牌/配置）— 前后端共享
    engine/   规则引擎（纯逻辑，无 IO）
    server/   服务端权威层（Phase 5 联机实装）
    client/   React + Vite 前端（Phase 3 实装）
  docs/       开发文档体系（见 docs/README.md）
```

详见 [docs/README.md](docs/README.md)。
