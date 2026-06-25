# 《巫师飞塔》标准版 — 文档总入口

> 本目录是项目的开发文档体系。开发从 [00-开发任务总表.md](00-开发任务总表.md) 开始。

## 文档导航

### 执行手册（开发用）
- [00-开发任务总表.md](00-开发任务总表.md) — **开发起点**：Phase 0–4 任务分解 + 完成标准
- [architecture/01-技术架构与跨平台方案.md](architecture/01-技术架构与跨平台方案.md) — 技术选型 / Mac/Windows / Docker
- [architecture/02-开发规范与提交约定.md](architecture/02-开发规范与提交约定.md) — 规范 / 规则口径红线 / 跨平台检查清单
- [dev-log/](dev-log/) — 逐任务开发日志（按 Phase 分文件）

### 规则与需求基线（只读引用）
- [V4_master_dev_doc.md](V4_master_dev_doc.md) — 开发总控文档（最高优先级）
- [V2_rules.md](V2_rules.md) — 完整规则与说明
- [V2_dev_requirements.md](V2_dev_requirements.md) — 完整开发需求
- [V3_test_cases.md](V3_test_cases.md) — 规则测试用例全集
- [V3_data_schema.md](V3_data_schema.md) — 数据字典与 JSON Schema
- [V3_api_protocol.md](V3_api_protocol.md) — 后端接口协议草案

## 文档优先级（V4 §0.3）
1. V4 总控 → 2. V2 规则 → 3. V2 开发需求 → 4. V3 测试/数据/接口

## 快速开始
见 [architecture/01-技术架构与跨平台方案.md §7](architecture/01-技术架构与跨平台方案.md)
```
pnpm install
pnpm dev          # Mac / Windows 通用
pnpm test
```
