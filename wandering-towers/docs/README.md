# 《巫师飞塔》标准版 — 文档总入口

> 本目录是项目的开发文档体系。

## ⭐ 单一事实来源
- [开发设计文档-架构与实现基线.md](开发设计文档-架构与实现基线.md) — **架构与现状裁定书**：把 V4/V2/V3 设计意图与真实代码逐一对齐，含实现现状勘误、技术债清单、后续路标。文档/代码冲突时以此为准。

## 文档导航

### 执行手册（开发用）
- [00-开发任务总表.md](00-开发任务总表.md) — Phase 0–4 任务分解 + 完成标准（⚠️ 顶部含「现状勘误」指针，以基线文档为准）
- [architecture/01-技术架构与跨平台方案.md](architecture/01-技术架构与跨平台方案.md) — 技术选型 / Mac/Windows / Docker
- [architecture/02-开发规范与提交约定.md](architecture/02-开发规范与提交约定.md) — 规范 / 规则口径红线 / 跨平台检查清单
- [architecture/03-UI美化与3D塔体方案.md](architecture/03-UI美化与3D塔体方案.md) — 3D 塔/巫师 + 独立可缩放舞台区（Phase U，方案设计阶段）
- [dev-log/](dev-log/) — 逐任务开发日志（⚠️ Phase 2/3/4 历史日志存在高报进度，真实状态以基线文档 §13 为准）

### 规则与需求基线（只读引用）
- [V4_master_dev_doc.md](V4_master_dev_doc.md) — 开发总控文档（最高优先级）
- [V2_rules.md](V2_rules.md) — 完整规则与说明
- [V2_dev_requirements.md](V2_dev_requirements.md) — 完整开发需求
- [V3_test_cases.md](V3_test_cases.md) — 规则测试用例全集
- [V3_data_schema.md](V3_data_schema.md) — 数据字典与 JSON Schema
- [V3_api_protocol.md](V3_api_protocol.md) — 后端接口协议草案

## 文档优先级
1. **实现基线文档**（架构与现状） → 2. V4 总控 → 3. V2 规则 → 4. V2 开发需求 → 5. V3 测试/数据/接口

## 快速开始
见 [architecture/01-技术架构与跨平台方案.md §7](architecture/01-技术架构与跨平台方案.md)
```
pnpm install
pnpm dev          # Mac / Windows 通用
pnpm test
```
