---
name: vibe-iterator
version: "1.6.0"
description: "自治迭代开发编排器。自动检测项目类型，循环执行：评估→选维度→开发→测试→审核→改进。多角色审核（代码审核员/产品经理/终端用户），自适应终止，全程无需人工介入。适用于 vibe coding 项目的持续打磨。"
tags: [iteration, automation, workflow, quality, multi-agent]
---

# Vibe Iterator — 自治迭代开发编排器

让 AI agent 自主完成项目的持续迭代打磨，从"一次性生成代码"升级为"持续改进到可交付状态"。

## 何时使用

### Must Use

- 用户要求"帮我做一个完整的 XXX 项目"且期望可直接交付
- 用户说"迭代优化"、"持续改进"、"打磨到可交付"
- 用户要求"全自动开发，不需要我介入"
- 从零开始构建一个新项目并期望高质量产出

### Skip

- 用户只需要一个简单的代码片段或函数
- 用户明确只需要"初版"或"原型"
- 纯文档编写任务
- 已有完善的 CI/CD 和测试体系，只需小修小补

## 执行入口

当此 skill 被触发时，使用 Workflow 工具执行迭代循环。

### 基础调用

```js
Workflow({
  scriptPath: '~/.claude/skills/vibe-iterator/workflows/iterate.js'
})
```

### 带参数调用

```js
// 基础参数
Workflow({
  scriptPath: '~/.claude/skills/vibe-iterator/workflows/iterate.js',
  args: {
    maxIterations: 5,           // 最大迭代轮次（默认 10）
    focusDimension: '可靠性',    // 强制聚焦某个维度
    skipDimensions: ['可访问性'], // 跳过的维度
    dimensions: [               // 自定义评估维度（覆盖默认维度）
      { name: '功能覆盖', desc: '核心功能是否完整' },
      { name: '代码质量', desc: '模块化、可读性' }
    ]
  }
})

// dry-run 模式：只输出执行计划，不实际执行
Workflow({
  scriptPath: '~/.claude/skills/vibe-iterator/workflows/iterate.js',
  args: { dryRun: true }
})
```

> **Checkpoint/Resume：** 每轮迭代结束时自动保存 checkpoint 到 `docs/.iterator-checkpoint.json`。Workflow 使用 `resumeFromRunId` 可从上次中断处继续。

### args 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `maxIterations` | number | 10 | 最大迭代轮次 |
| `focusDimension` | string | null | 强制聚焦某个维度（跳过自动选择） |
| `skipDimensions` | string[] | [] | 跳过的维度列表 |
| `dimensions` | Array<{name, desc}> | null | 自定义评估维度（覆盖项目类型默认维度） |
| `dryRun` | boolean | false | dry-run 模式：只输出执行计划，不实际执行 |

### Token 预算建议

| 项目规模 | 建议预算 | 预期轮次 |
|----------|----------|----------|
| 小型（单文件/脚本） | 100k-200k | 2-3 轮 |
| 中型（多模块） | 300k-500k | 4-6 轮 |
| 大型（完整应用） | 500k-1000k | 6-10 轮 |

每轮迭代消耗约 50k-100k tokens（含多 agent 调用）。建议根据项目规模设置 `budget.total`。

---

## 一、项目检测

### 检测逻辑（多语言适配）

检查当前目录是否存在以下文件/目录：

| 信号 | 文件 | 适用技术栈 |
|------|------|-----------|
| 包管理 | `package.json` | Node.js / TypeScript |
| 包管理 | `pyproject.toml` / `setup.py` / `requirements.txt` | Python |
| 包管理 | `Cargo.toml` | Rust |
| 包管理 | `go.mod` | Go |
| 包管理 | `pom.xml` / `build.gradle` | Java / Kotlin |
| 包管理 | `*.uproject` | Unreal Engine |
| 包管理 | `CMakeLists.txt` / `Makefile` / `*.sln` | C/C++ |
| 包管理 | `Package.swift` | Swift |
| 包管理 | `Gemfile` | Ruby |
| 源码目录 | `src/` / `app/` / `lib/` / `Source/` | 通用 |
| 源码文件 | 至少 3 个代码文件（任意语言扩展名） | 通用 |
| 项目标识 | `README.md` / `LICENSE` / `.git/` | 通用 |

**判定规则：**
- 包管理 + 源码目录 + 源码文件全部存在 → **已有项目**
- 仅有包管理或源码目录 → **已有项目**（结构不完整）
- 全部不存在 → **全新项目**

> **重要：** 不要假设项目一定是 Web 项目。UE5、C++、Rust、Swift 等项目的包管理文件和源码目录命名不同于 Web 生态，但同样是"已有项目"。

### 全新项目初始化流程

```
1. 研究阶段：搜索现有方案和技术选型
2. 架构设计：确定技术栈、目录结构、核心模块
3. 功能规划：生成功能清单和优先级
4. 初版实现：构建第一个可运行版本（MVP）
5. 初始化文档体系（进入迭代循环）
```

### 已有项目初始化流程

```
1. 代码探索：理解项目结构、技术栈、核心功能
2. 现状评估：评估各维度当前状态
3. 初始化文档体系（进入迭代循环）
```

---

## 二、文档体系

### 文档清单

所有文档统一放在 `docs/` 目录下，不要在项目根目录创建。

| 文档 | 路径 | 用途 | 生命周期 |
|------|------|------|----------|
| `VISION.md` | `docs/VISION.md` | 项目核心愿景、目标用户、核心价值主张 | 第一轮写定后**不再修改** |
| `ROADMAP.md` | `docs/ROADMAP.md` | 功能清单 + 优先级 + 状态（待做/进行中/已完成） | **每轮更新** |
| `ITERATION_LOG.md` | `docs/ITERATION_LOG.md` | 每轮迭代记录：做了什么、为什么、结果 | **只追加** |
| `ARCHITECTURE.md` | `docs/ARCHITECTURE.md` | 技术架构、关键决策、目录结构 | 架构变更时更新 |
| `DELIVERY_REPORT.md` | `docs/DELIVERY_REPORT.md` | 最终交付报告 | 交付时生成 |

### VISION.md 格式

```markdown
# [项目名称]

## 愿景
[一句话描述项目要解决什么问题]

## 目标用户
[用户画像]

## 核心价值主张
[为什么用户会选择这个产品而不是竞品]

## 成功标准
[怎样算做成了]
```

### ROADMAP.md 格式

```markdown
# Roadmap

## 优先级说明
- P0：必须有，没有就不能用
- P1：应该有，显著提升体验
- P2：可以有，锦上添花

## 功能清单

| ID | 功能 | 优先级 | 状态 | 轮次 | 备注 |
|----|------|--------|------|------|------|
| F001 | ... | P0 | ✅ 已完成 | R1 | |
| F002 | ... | P1 | 🔄 进行中 | R2 | |
| F003 | ... | P0 | ⏳ 待做 | - | |
```

### ITERATION_LOG.md 格式

```markdown
# 迭代记录

## Round 0 — 基线评估
[初始化轮记录]

## 第 1 轮 — YYYY-MM-DD

### 聚焦维度
[本轮选择改进的维度及理由]

### 改进目标
[具体要达成什么]

### 执行过程
[做了什么，关键决策是什么]

### 审核结果
[代码审核员/产品经理/终端用户的反馈]

### 成果
[量化指标变化（如有）+ 定性改进描述]

### 下一轮方向
[遗留问题 + 建议方向]
```

---

## 三、角色定义

> ⚠️ **Schema 权威源：** 以下 JSON 输出格式仅为阅读参考。实际运行时的结构化验证 schema 定义在 `workflows/iterate.js` 中，修改 schema 请以 iterate.js 为准，此处同步更新。

### 角色 1：代码审核员（关卡模式）

**职责：** 审核代码质量、安全性、架构合理性

**调用方式：** 显式调用 `code-reviewer` agent，prompt 中注入 karpathy-guidelines 知识：

```
prompt 中包含：
"读取 ~/.claude/skills/karpathy-guidelines/SKILL.md，将其中的 4 条准则
（Think Before Coding / Simplicity First / Surgical Changes / Goal-Driven Execution）
纳入本次审核 checklist。"
```

**输出格式：**
```json
{
  "issues": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "file": "path/to/file.ts",
      "line": 42,
      "description": "问题描述",
      "suggestion": "修复建议"
    }
  ],
  "hasBlocking": true,
  "summary": "总体评价"
}
```

**关卡规则：**
- 有 CRITICAL 问题 → **阻断**，必须修复后重审
- 有 HIGH 问题 → **阻断**，必须修复后重审
- 仅 MEDIUM/LOW → **通过**，记录到迭代日志

**重要：** 审核时只关注本轮 `git diff` 中的变更。不要报告已有代码中的问题，除非它们被本轮改动直接影响。

### 角色 2：产品经理（建议模式）

**职责：** 评估产品维度，选择改进方向

**评估维度（按项目类型自动适配）：**

| 项目类型 | 维度 |
|----------|------|
| **游戏** (Unity/Unreal/Godot) | 玩法完整性、视觉与音效、性能、可靠性、代码质量、测试覆盖 |
| **桌面** (Electron/Tauri/Qt/WPF) | 用户体验、UI 精细度、功能完整性、性能、可靠性、测试覆盖 |
| **Web** | 用户体验、UI 精细度、功能完整性、性能、可靠性、可访问性 |
| **移动端** (iOS/Android/Flutter/RN) | 用户体验、UI 精细度、功能完整性、性能、可靠性、测试覆盖 |
| **纯后端** (API/微服务) | 功能完整性、可靠性、性能、安全性、代码质量、测试覆盖 |
| **通用** (C++/Rust/Go 等) | 功能完整性、可靠性、性能、代码质量、测试覆盖、构建与部署 |

> 维度自动匹配优先级：game → desktop → mobile → web → backend → 通用
> **自定义维度：** 通过 `args.dimensions` 传入自定义维度列表，覆盖上述默认值。

**输出格式：**
```json
{
  "dimensions": [
    {
      "name": "用户体验",
      "score": 6,
      "evidence": "表单没有 loading 状态，错误时无重试按钮"
    }
  ],
  "focus": {
    "dimension": "用户体验",
    "improvement": "为所有表单添加 loading 状态和错误重试",
    "expectedImpact": "用户体验从 6 提升到 8",
    "newRoadmapItems": ["F005", "F008"]
  }
}
```

**选择策略：**
1. 评估所有维度，找出得分最低的 2-3 个
2. 优先选择尚未被迭代过的维度
3. 在最弱维度中，选"改进后对用户感知影响最大"的那个
4. 每轮新增功能条目不超过 2 个（防膨胀）

### 角色 3：终端用户（建议模式）

**职责：** 以"第一次使用"视角体验产品，记录真实感受

**执行方式：** 读取 `~/.claude/skills/ui-ux-pro-max/SKILL.md` 中的 UX Quick Reference §1-§9，逐项检查。

**体验流程：**
```
1. 首次打开 → 第一印象如何？知道该做什么吗？
2. 核心流程 → 完成主要任务顺畅吗？哪里卡住了？
3. 错误场景 → 故意输入错误，反馈清晰吗？能恢复吗？
4. 边界情况 → 空数据、大数据、极端输入的表现
5. 离开再回来 → 状态保留了吗？需要重新操作吗？
```

**非 Web 项目的调整：**
- 对于 UE5、C++、Rust 等无法被 agent 直接运行的项目，UX 测试改为**代码走读模式**
- 不假装能打开应用，而是通过阅读 UI 代码、状态管理代码来推断用户体验
- 重点关注：错误反馈是否用户可见、空状态处理、边界值处理、状态持久化

**输出格式：**
```json
{
  "overallImpression": "一句话总结",
  "journey": [
    {
      "step": "打开首页",
      "experience": "页面加载慢，不知道从哪开始",
      "issue": "缺少引导和 loading 状态",
      "severity": "HIGH"
    }
  ],
  "topPainPoints": ["最痛的 1-3 个点"]
}
```

---

## 四、迭代循环流程

### 每轮迭代的完整流程

```
1. 读取文档 → 理解当前状态（ROADMAP.md + ITERATION_LOG.md）
2. [并行] 产品经理评估 + 终端用户体验测试 → 同时获取维度评分和体验问题
3. 更新 ROADMAP.md → 确定本轮改进目标（≤2 个新功能条目）
4. 功能开发 → 测试编写（串行，先开发后测试）
5. 代码审核（关卡模式）→ 不通过则重试（最多 3 次）
6. [条件] 安全审查 → 仅当涉及安全敏感代码时执行
7. 更新 ITERATION_LOG.md → 记录本轮成果
8. 收敛检测 → 决定继续/终止（跨维度轮转，含维度评分历史追踪）
```

> **优化说明：** 产品经理评估和终端用户体验测试是独立操作，并行执行可减少约 30% 的单轮耗时。收敛检测会追踪各维度的评分历史变化，更准确地判断改进趋势。

### 收敛检测规则（跨维度轮转）

**关键原则：** 收敛检测应评估**整体项目**的改进空间，而非仅评估当前聚焦维度。

**继续迭代条件（满足任一即继续）：**
1. 存在评分 < 7/10 的维度尚未被迭代过
2. 本轮有显著改进（10%+ 的维度提升）且仍有改进空间
3. 有 P0/P1 功能尚未完成

**提前终止条件（连续 2 轮满足全部）：**
1. 代码审核员零 CRITICAL/HIGH 问题
2. 所有维度评分均 ≥ 7/10，或剩余维度改进方向不明确
3. 量化指标（如已启用）无显著改善空间

**维度轮转逻辑：**
- 每轮结束时，如果当前维度已达到目标（评分提升 2+），下一轮切换到下一个最弱维度
- 不要在同一维度上反复迭代（除非有 CRITICAL 问题未解决）
- 维度排序：按评分从低到高，同分按"用户感知影响"从高到低

**硬上限：** 默认 10 轮（通过 `args.maxIterations` 可调整）

---

## 五、错误恢复

### Schema 调用失败处理

当使用 `schema` 参数调用 agent 失败时（常见于复杂 prompt 导致 agent 未调用 StructuredOutput），使用 `agentWithFallback` 函数：

```javascript
async function agentWithFallback(prompt, opts) {
  try {
    return await agent(prompt, opts)
  } catch (e) {
    log(`⚠️ Schema 调用失败 (${opts.label})，降级为普通调用...`)
    const textResult = await agent(
      prompt + '\n\n重要：请以 JSON 格式返回结果，不要添加其他文本。',
      { ...opts, schema: undefined }
    )
    try {
      // 括号平衡提取完整 JSON 对象
      let depth = 0, start = -1, end = -1
      for (let i = 0; i < textResult.length; i++) {
        if (textResult[i] === '{') { if (depth === 0) start = i; depth++ }
        else if (textResult[i] === '}') { depth--; if (depth === 0 && start >= 0) { end = i; break } }
      }
      if (start >= 0 && end > start) return JSON.parse(textResult.slice(start, end + 1))
    } catch (parseErr) {}
    return null
  }
}
```

**适用场景：**
- 产品经理评估（DIMENSION_ASSESSMENT_SCHEMA）
- 终端用户体验测试（USER_EXPERIENCE_SCHEMA）
- 代码审核（CODE_REVIEW_SCHEMA）
- 收敛检测（CONVERGENCE_SCHEMA）
- 交付报告（DELIVERY_REPORT_SCHEMA）

### 逐级升级策略

```
失败 → 原地重试（最多 3 次）
     → 仍失败 → 回滚本轮，换个方向重做（最多 1 次）
     → 仍失败 → 跳过标记，记录到 ITERATION_LOG
     → 连续 2 轮跳过 → 紧急刹车，交付当前状态
```

### Agent 超时处理

当子 agent 卡住（无进度超过 5 分钟）时：
- Workflow 框架会自动重试（最多 5 次）
- 如果连续 3 次重试仍失败，跳过该步骤并在 ITERATION_LOG 中记录
- 不要因为单个 agent 卡住而终止整个迭代

### 构建失败处理

构建失败时自动重试（最多 3 次），通过 `BUILD_RESULT_SCHEMA` 返回错误列表，agent 分析并修复。

### 安全问题处理

当代码涉及安全敏感逻辑时，使用 schema 化的安全检查（`SECURITY_CHECK_SCHEMA`），避免脆弱的文本匹配。

检查区域包括：认证/授权、用户输入处理、数据库查询、API 端点、密码/token 处理、文件系统操作、加密操作。

确认涉及安全代码后，显式调用 `security-reviewer` agent 进行 OWASP Top 10 审查。**如果发现 CRITICAL 安全问题，会自动尝试修复。**

---

## 六、最终交付

### 交付物清单

| 交付物 | 路径 | 说明 |
|--------|------|------|
| 完整代码库 | - | 经过 N 轮迭代打磨后的可运行项目 |
| `VISION.md` | `docs/VISION.md` | 项目愿景 |
| `ROADMAP.md` | `docs/ROADMAP.md` | 最终功能清单（含完成度标记） |
| `ITERATION_LOG.md` | `docs/ITERATION_LOG.md` | 完整迭代记录 |
| `DELIVERY_REPORT.md` | `docs/DELIVERY_REPORT.md` | 交付报告 |
| `README.md` | `README.md` | 项目说明 |

### 轮次计数规则

- **初始化轮（Round 0）**：基线评估、文档创建，不计入迭代轮次
- **迭代轮（Round 1-N）**：实际开发迭代，计入迭代轮次
- 交付报告中的"总迭代轮次"只计迭代轮，不计初始化轮

### DELIVERY_REPORT.md 格式

```markdown
# 交付报告

## 项目概况
[一句话总结]

## 当前状态
- 总迭代轮次：N（不含初始化轮）
- 功能完成率：X%
- 测试覆盖率：Y%
- 最后一轮聚焦：[维度]

## 已稳定可用的功能
- [功能 1]
- [功能 2]

## 已知问题与限制
- [问题 1：描述 + 影响 + 规避方式]

## 后续建议
[如果继续迭代，建议下一步做什么]

## 各维度最终评估

| 维度 | 评分 | 说明 |
|------|------|------|
| [维度1] | X/10 | ... |
| [维度2] | X/10 | ... |
| ... | ... | ... |

> 维度由项目类型自动确定（见"评估维度"章节），此处列出实际评估的维度。
```

### 最终文档整理

交付前调用 `blast-off-my-project` skill 的流程完成最终文档整理。

---

## 七、集成架构

### 显式 agentType 调用

| Agent | 调用时机 |
|-------|----------|
| `code-reviewer` | 每轮代码审核（prompt 注入 karpathy-guidelines） |
| `security-reviewer` | 涉及安全代码时 |

### Prompt 注入 skill 知识

| 场景 | 注入内容 |
|------|----------|
| 功能开发（涉及 UI） | 指示执行 `python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py '<产品类型>' --design-system` |
| 代码审核 | 指示读取 `~/.claude/skills/karpathy-guidelines/SKILL.md` |
| 用户体验测试 | 指示读取 `~/.claude/skills/ui-ux-pro-max/SKILL.md` 的 UX Quick Reference |
| 最终交付 | 指示读取 `~/.claude/skills/blast-off-my-project/SKILL.md` |

### Prompt 注入（非 agent 调用）

| 场景 | 注入方式 |
|------|----------|
| 测试编写 | 读取 karpathy-guidelines，注入 Goal-Driven Execution 原则 |
| 功能开发 | 涉及 UI 时执行 ui-ux-pro-max 的 search.py 获取设计规范 |

---

## 八、已知限制与应对策略

| 限制 | 影响 | 应对策略 |
|------|------|----------|
| 单会话执行 | 长时间运行可能受 context window 限制 | 使用 `budget.total` 设置 token 上限；checkpoint 自动保存，支持 `resumeFromRunId` 恢复 |
| Token 消耗高 | 多 agent 调用消耗大量 token | 参考 Token 预算建议表；使用 `dryRun: true` 预估消耗；减少 `maxIterations` |
| 非确定性输出 | 同一输入可能产生不同结果 | 代码审核关卡模式 + 回滚 + 维度轮转保证质量底线 |
| Schema 调用偶发失败 | 复杂 prompt 导致 agent 未调用 StructuredOutput | `agentWithFallback` 自动降级为普通调用 + JSON 解析 |
| budget 集成 | Workflow 框架层能力，skill 无法直接读取 budget 状态 | 用户在外层设置 `budget.total`，框架自动限制 token 消耗 |

---

## 九、版本历史

### v1.6.0 (2026-06-05)

**改进：**
- **桌面/游戏维度**：新增 Electron/Tauri/Qt/WPF 桌面维度和 Unity/Unreal/Godot 游戏维度（共 6 种项目类型）
- **代码探索增强**：explore-code prompt 细化为 4 步（包管理→目录→核心文件→测试），避免遗漏
- **nextDimension 强化**：收敛 prompt 明确"nextDimension 必填，不可省略"
- **budget 说明**：已知限制中补充 budget 为框架层能力

### v1.5.0 (2026-06-05)

**修复：**
- **SKILL.md 代码示例同步**：`agentWithFallback` 示例更新为括号平衡 JSON 提取，与 iterate.js 一致
- **Checkpoint 兼容性**：去掉 `require('fs')`，改用 agent 读写文件，兼容所有 Workflow 环境
- **Dry-run 跳过初始化**：Detect 阶段仅执行项目检测，跳过研究/架构/规划/MVP 等初始化步骤
- **文档代码一致性**：移除未使用的 `build-error-resolver` 和 `tdd-guide` 引用，对齐实际实现

### v1.4.0 (2026-06-05)

**架构改进：**
- **全新项目初始化并行化**：vision + init-log 并行执行，减少初始化耗时
- **Checkpoint/Resume**：每轮迭代自动保存 checkpoint 到 `docs/.iterator-checkpoint.json`，支持中断后恢复
- **Dry-run 模式**：`args.dryRun: true` 输出执行计划预览，不实际执行
- **移动端/纯后端维度**：新增 iOS/Android/Flutter/RN 移动端维度和 API/微服务纯后端维度
- **回滚后维度轮转**：回滚的维度标记为已迭代，下轮自动切换到其他弱维度
- **tdd-guide 集成**：测试编写步骤注入 karpathy-guidelines 的 Goal-Driven Execution

**Prompt 优化：**
- research prompt 增加评估维度（社区活跃度、技术匹配度、可扩展性）
- 收敛检测 prompt 去除口语化约束，改为条件式精确表述
- 迭代日志 prompt 增加完整格式模板约束

**Bug 修复：**
- `agentWithFallback` JSON 提取括号平衡修复（`indexOf` → 遍历匹配）

### v1.3.0 (2026-06-05)

**提示词精简优化：**
- 全部 29 个 agent prompt 精简，消除冗余描述、重复约束、不必要的前缀
- 代码审核 prompt 强化"仅审核 git diff"约束
- 辅助函数（`karpathyReviewPrompt`、`uxReviewPrompt`、`blastOffPrompt`）精简约 50%
- 文件从 970 行降至 722 行（-25.6%），减少约 30% 的 prompt token 消耗

### v1.2.0 (2026-06-05)

**改进：**
- **参数化支持**：通过 `args` 传入 `maxIterations`、`focusDimension`、`skipDimensions`、`dimensions`，支持用户自定义迭代行为
- **项目类型自适应维度**：Web 项目使用 UX/UI 维度，非 Web 项目（UE5/C++/Rust/Go）自动切换为代码质量/测试覆盖/构建部署维度
- **安全审查阻断机制**：发现 CRITICAL 安全问题后自动修复，不再静默跳过
- **跨轮次进度汇总**：交付时输出各维度评分变化趋势（📈/📉/➡️）
- **JSON 提取健壮性**：`agentWithFallback` 使用括号平衡匹配替代贪婪正则

**Bug 修复：**
- 修复 ITERATION_LOG 中引用已不存在的 `hasSecuritySensitive` 变量（应为 `securityCheck`）

### v1.1.0 (2026-06-05)

**改进：**
- 安全检查 schema 化（`SECURITY_CHECK_SCHEMA`）
- 并行执行：产品经理评估 + 终端用户体验测试
- 维度评分历史追踪
- 构建验证增强（MVP + 最终交付）
- 回滚逻辑明确化（指定 git 命令序列）
- Token 预算指南

**Schema 新增：**
- `SECURITY_CHECK_SCHEMA`、`BUILD_RESULT_SCHEMA`

### v1.0.0 (初始版本)

- 基础迭代循环：评估→选维度→开发→测试→审核→收敛检测
- 多角色审核：代码审核员/产品经理/终端用户
- Schema fallback 机制
- 文档体系：VISION / ROADMAP / ITERATION_LOG / ARCHITECTURE / DELIVERY_REPORT
- 跨维度轮转 + 自适应终止
