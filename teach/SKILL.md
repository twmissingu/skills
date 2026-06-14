---
name: teach
description: "Teach the user a new skill or concept within this workspace. Stateful, multi-session teaching process with structured learning artifacts."
version: 1.0.0
author: Matt Pocock
license: MIT
metadata:
  hermes:
    tags: [teaching, learning, education, productivity]
    related_skills: [learn-concept]
---

# Teach — 多会话渐进式教学系统

## When to Use
- 用户想学新技能或概念
- 用户说"教我 X" / "我想学 X" / "how to learn X"

## Teaching Workspace Structure

学习状态通过以下文件/目录跟踪（在当前工作目录中）：

```
MISSION.md               — 学习动机（核心驱动）
RESOURCES.md             — 可信外部资源清单
NOTES.md                 — 用户偏好/教学提醒
./reference/*.html       — 术语表/速查卡（可打印复用）
./learning-records/*.md  — 学习记录（0001-*.md 格式）
./lessons/*.html         — 课件（0001-*.html 格式，自包含 HTML）
```

## Core Teaching Philosophy

学习需要三个层次：

### 1. Knowledge（知识）
- 优先来自 RESOURCES.md 记录的可信外部资源
- **禁止依赖模型参数化知识**（"Never trust your parametric knowledge"）
- 课件必须标注知识来源，提供可追溯性

### 1b. 本地文档教学模式
当用户指定"不联网"或知识库本身就是本地文档时：
- **扫描目录结构**：用 `search_files(target='files')` 或目录树发现文档
- **读 CONTEXT.md / README.md**：获取项目概览、术语表、技术栈
- **定位核心文档**：通过目录索引找到主使用指南/设计文档
- **逐章提取**：按章节读取，提取概念→术语→代码示例→配置说明
- **标记来源行号**：课件中标注"来源：文件路径 第X章"，保持可追溯性
- RESOURCES.md 记录本地文档路径而非外部URL

### 2. Skills（技能）
- 通过交互式课件 + 即时反馈循环来教
- 用户执行操作后立即得到反馈（浏览器内测验、引导式真实步骤、Agent 场景提问）

### 3. Wisdom（智慧）
- 只能来自真实世界的社区实践
- Agent 的角色是帮用户找到高信誉社区（论坛、Reddit、线下课程、专业群组）

## Lesson Design Principles

课件是核心输出，设计原则：

1. **单一主题**：每节课只教一件事，范围严格收敛
2. **Mission 驱动**：必须与 MISSION.md 中的学习目标直接关联
3. **最近发展区（ZPD）**：难度控制在"刚好让用户觉得在学东西"的区间
4. **即时成就感**：可快速完成，提供 tangible win
5. **美观排版**：干净的 HTML 排版，易于阅读和复习
6. **引用丰富**：标注知识来源（文件路径+章节）增强可信度和可追溯性
7. **单一命令可打开**：通过单条 CLI 命令即可打开课件

### 课件HTML模板
参见 `references/local-docs-lesson-template.html`，包含：
- 概念卡片（key-point/warning/success/danger 四种callout）
- 流程图（flow-diagram monospace块）
- 代码块（深色背景 code-block）
- 对比表格
- 可折叠自检题（quiz details/summary）
- 前后课导航（nav flex布局）
- 来源标注（底部灰色小字）

## Integration with grill-me

When the user wants to learn a complex topic AND build a workflow for it, combine grill-me + teach:

1. **Phase 1 (grill-me)**: Interview the user about their current setup, pain points, and goals. This replaces the "Step 1: 确立 Mission" questions — the grill-me session produces MISSION.md content naturally.
2. **Phase 2 (synthesis)**: Compile the grill-me outputs into a concrete design (workflow, architecture, priorities). This becomes the "applied" content in lessons.
3. **Phase 3 (teach)**: Generate lessons that teach the concept AND walk through the user's specific design. Each lesson has theory + "your scenario" mapping.

**Why this works**: grill-me produces structured decisions (A/B/C choices), which map directly to lesson content. The user's answers become case studies in the course, making it immediately relevant.

**Key pattern**: Don't ask mission questions again in teach phase if grill-me already answered them. Go straight to resource gathering → lesson creation.

## Multi-Audience Teaching

When the user asks to teach the SAME source material to DIFFERENT audiences (e.g. "teach employees X and teach leaders Y"):

1. **Default: unified directory with chapter separation** — create ONE `teaching/` directory. Use chapter numbering to separate audiences (e.g. "第一章：员工工作要求", "第二章：组长质量卡点"). Each chapter contains its own lessons. The index.html presents all chapters in a single page with section headers.
2. **Differentiate by depth and focus** — employees need "what to do and how" (产出标准、注意事项), leaders need "what to check and why" (检查要点、阻断标准). Same source, different extraction.
3. **Flat lesson files, not subdirectories** — all lessons go directly in `teaching/` as `0001-*.html`, `0002-*.html`, etc. No `lessons/` subdirectory. Simpler navigation, fewer broken links.
4. **Navigation must work** — every lesson has `← 上一课` / `下一课 →` / `← 课程索引` links. Verify all links point to correct relative paths before finishing.
5. **Use the same HTML template** — visual consistency across chapters, but content diverges.

**Why unified over separate**: User explicitly corrected separate-directory approach. Single directory with chapter markers is easier to maintain, share, and navigate. Separate directories create duplicate index pages and fragmented navigation.

## Large Document Handling (>500 lines)

When the source document is large (500+ lines):

1. **Read the table of contents first** — most structured docs have a TOC or section headers. Read the first 200 lines to understand the structure.
2. **Chunk by chapter, not by line count** — read entire logical sections (e.g., one "工作项" = one chunk). Don't split mid-section.
3. **Extract structure before detail** — first pass: section names, key fields (角色、产出物、卡点类型). Second pass: detail within each section.
4. **Build the lesson plan from the structure** — map sections to lessons BEFORE reading all detail. This prevents over-reading and scope creep.

## Key Workflow

### Step 1: 确立 Mission
如果 MISSION.md 为空，Agent 的第一步是问用户：
- 为什么要学这个？
- 学了之后打算用在哪里？
- 已经知道什么、不知道什么？
- 需要教给哪些不同角色/受众？

### Step 2: 收集 Resources
- 搜索并整理高质量外部资源到 RESOURCES.md
- 优先官方文档、权威教程、社区推荐
- 课件中引用这些资源作为知识来源

### Step 3: 创建 Reference 文档
- 建立术语表（glossary），后续每节课都引用
- 创建速查卡/算法卡等可打印参考文档

### Step 4: 创建 Lessons
按编号顺序创建 HTML 课件：
- `0001-<topic>.html`
- 每个课件自包含（CSS 内联，无外部依赖）
- 控制在用户可快速完成的长度

### Step 5: 跟踪学习进度
- 在 learning-records 中记录每节课的学习情况
- 记录用户的困惑点和突破点
- 据此调整后续课程难度（ZPD 校准）

### Step 6: 引导到 Wisdom
- 当问题需要真实经验时，推荐相关社区
- 帮用户找到高信誉的专业群组/论坛

## File Naming Convention

- 学习记录：`0001-<dash-case-name>.md`
- 课件：`0001-<dash-case-name>.html`
- 参考文档：`<topic>.html`

## Organizational Process Teaching

When teaching work requirements, compliance checklists, or organizational processes:

1. **Organize by phase/workflow stage** — not by document order. Users think in "what do I do next" not "what does chapter 7 say."
2. **Separate "do" from "check"** — for multi-role teaching, the doer needs 产出标准+注意事项, the checker needs 检查要点+阻断标准. Different lesson tracks.
3. **Use checklist tables** — work items with columns for 角色/卡点/产出物 are more scannable than prose.
4. **Highlight escalation paths** — "what happens if blocked" is as important as "what to produce."

## Notes

- NOTES.md 记录用户的教学偏好，保持一致性
- 术语表必须在每节课中被引用，保持术语一致
- 如果用户偏离 Mission，温和地引导回主线