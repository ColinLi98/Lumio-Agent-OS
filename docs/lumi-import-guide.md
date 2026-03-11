# Lumi 任务清单导入说明（Jira / Linear）

## 文件位置
1. Jira 导入文件：`docs/lumi-jira-import-v1.csv`
2. Linear 导入文件：`docs/lumi-linear-import-v1.csv`

## Jira 导入建议
1. 在 Jira CSV Import 中上传 `lumi-jira-import-v1.csv`。
2. 字段映射建议：
3. `Issue Type -> Issue Type`
4. `Summary -> Summary`
5. `Description -> Description`
6. `Epic Name -> Epic Name`
7. `Epic Link -> Epic Link`
8. `Labels -> Labels`
9. `Priority -> Priority`
10. `Story Points -> Story Points`（如你们项目开启该字段）
11. `Components -> Component/s`
12. 导入后按 `Epic Link` 验证 Story 是否正确归属到 Epic。

## Linear 导入建议
1. 在 Linear CSV Import 中上传 `lumi-linear-import-v1.csv`。
2. 字段映射建议：
3. `Title -> Title`
4. `Description -> Description`
5. `Priority -> Priority`
6. `Labels -> Labels`
7. `Project -> Project`
8. `Epic -> Parent / Initiative`（按你们工作区字段名映射）
9. `Estimate -> Estimate`
10. 导入后先筛选 `Project = Lumi Android v1` 做一次批量校验。

## 导入后建议动作
1. 将里程碑拆成 4 个周期：`M1/M2/M3/M4`。
2. 每个 Epic 指定 DRI（产品、Android、Core-Agent、QA 各 1 人）。
3. 将 `Highest/1` 优先级任务先排满当前迭代。
