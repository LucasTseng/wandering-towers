# 多阶段构建：构建 client 静态产物 + server（Phase 5 联机时启用）
# 本地开发无需 Docker；此文件用于统一部署/CI（架构文档 §5）
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/engine/package.json ./packages/engine/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm -r typecheck && pnpm -r run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3000
# Phase 5 联机版启动命令；当前仅占位
CMD ["node", "-e", "console.log('wandering-towers server placeholder (Phase 5)')"]
