export const meta = {
  name: 'vibe-iterator',
  description: '自治迭代开发循环：检测→初始化→迭代(评估→开发→测试→审核)→交付',
  phases: [
    { title: 'Detect', detail: '检测项目类型，初始化文档体系' },
    { title: 'Iterate', detail: '迭代循环：评估→选维度→开发→测试→审核→记录' },
    { title: 'Deliver', detail: '生成交付报告，整理文档' }
  ]
}

// ============================================================
// 用户参数（通过 Workflow args 传入）
// ============================================================

const userArgs = typeof args !== 'undefined' ? args : {}
const MAX_ITERATIONS = userArgs.maxIterations ?? 10
const FOCUS_DIMENSION = userArgs.focusDimension ?? null
const SKIP_DIMENSIONS = userArgs.skipDimensions ?? []
const CUSTOM_DIMENSIONS = userArgs.dimensions ?? null
const DRY_RUN = userArgs.dryRun ?? false                    // dry-run：只输出计划，不执行

// ============================================================
// Schema 定义
// ============================================================

const PROJECT_TYPE_SCHEMA = {
  type: 'object',
  properties: {
    isNew: { type: 'boolean', description: '是否为全新项目' },
    techStack: { type: 'string', description: '检测到的技术栈' },
    hasSource: { type: 'boolean', description: '是否有源码目录' },
    sourceFiles: { type: 'number', description: '源码文件数量' },
    reason: { type: 'string', description: '判定理由' }
  },
  required: ['isNew', 'techStack', 'reason']
}

const DIMENSION_ASSESSMENT_SCHEMA = {
  type: 'object',
  properties: {
    dimensions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          score: { type: 'number', minimum: 1, maximum: 10 },
          evidence: { type: 'string' }
        },
        required: ['name', 'score', 'evidence']
      }
    },
    focus: {
      type: 'object',
      properties: {
        dimension: { type: 'string' },
        improvement: { type: 'string' },
        expectedImpact: { type: 'string' },
        newRoadmapItems: {
          type: 'array',
          items: { type: 'string' },
          description: '本轮新增的 ROADMAP 功能条目（≤2 个）'
        }
      },
      required: ['dimension', 'improvement', 'expectedImpact']
    }
  },
  required: ['dimensions', 'focus']
}

const USER_EXPERIENCE_SCHEMA = {
  type: 'object',
  properties: {
    overallImpression: { type: 'string' },
    journey: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step: { type: 'string' },
          experience: { type: 'string' },
          issue: { type: 'string' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] }
        },
        required: ['step', 'experience', 'issue', 'severity']
      }
    },
    topPainPoints: {
      type: 'array',
      items: { type: 'string' },
      description: '最痛的 1-3 个点'
    }
  },
  required: ['overallImpression', 'journey', 'topPainPoints']
}

const CODE_REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          file: { type: 'string' },
          line: { type: 'number' },
          description: { type: 'string' },
          suggestion: { type: 'string' }
        },
        required: ['severity', 'description']
      }
    },
    hasBlocking: { type: 'boolean', description: '是否有 CRITICAL 或 HIGH 问题需要阻断' },
    summary: { type: 'string' }
  },
  required: ['issues', 'hasBlocking', 'summary']
}

const CONVERGENCE_SCHEMA = {
  type: 'object',
  properties: {
    shouldContinue: { type: 'boolean', description: '是否应该继续下一轮迭代' },
    reason: { type: 'string', description: '判定理由' },
    hasSignificantImprovement: { type: 'boolean', description: '本轮是否有显著改进（10%+）' },
    nextDimension: { type: 'string', description: '如果继续，下一轮应该聚焦的维度' }
  },
  required: ['shouldContinue', 'reason', 'hasSignificantImprovement']
}

const DELIVERY_REPORT_SCHEMA = {
  type: 'object',
  properties: {
    projectSummary: { type: 'string' },
    totalIterations: { type: 'number' },
    stableFeatures: { type: 'array', items: { type: 'string' } },
    knownIssues: { type: 'array', items: { type: 'string' } },
    nextSteps: { type: 'array', items: { type: 'string' } },
    finalScores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dimension: { type: 'string' },
          score: { type: 'number' },
          note: { type: 'string' }
        },
        required: ['dimension', 'score', 'note']
      }
    }
  },
  required: ['projectSummary', 'totalIterations', 'stableFeatures', 'knownIssues', 'nextSteps', 'finalScores']
}

const SECURITY_CHECK_SCHEMA = {
  type: 'object',
  properties: {
    hasSecuritySensitive: { type: 'boolean', description: '是否涉及安全敏感代码' },
    areas: {
      type: 'array',
      items: { type: 'string' },
      description: '涉及的安全敏感区域列表'
    }
  },
  required: ['hasSecuritySensitive']
}

const BUILD_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', description: '构建是否成功' },
    errors: {
      type: 'array',
      items: { type: 'string' },
      description: '构建错误列表'
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
      description: '构建警告列表'
    }
  },
  required: ['success']
}

// ============================================================
// 辅助函数
// ============================================================

const SKILL_BASE = '~/.claude/skills'
const DOCS_DIR = 'docs'  // 所有文档统一放在 docs/ 目录

// 默认评估维度（Web 项目）
const DEFAULT_DIMENSIONS = [
  { name: '用户体验', desc: '交互流程、加载状态、错误处理、空状态' },
  { name: 'UI精细度', desc: '动画、间距、字体、颜色一致性' },
  { name: '功能完整性', desc: '功能实现率、边界场景覆盖' },
  { name: '性能', desc: '加载速度、渲染性能、资源占用' },
  { name: '可靠性', desc: '错误处理、边界情况、容错能力' },
  { name: '可访问性', desc: '键盘导航、屏幕阅读器、对比度' }
]

// 非 Web 项目维度（去掉不适用的 UI/可访问性，加入更通用的维度）
const NON_WEB_DIMENSIONS = [
  { name: '功能完整性', desc: '功能实现率、边界场景覆盖' },
  { name: '可靠性', desc: '错误处理、边界情况、容错能力、崩溃恢复' },
  { name: '性能', desc: '运行效率、内存占用、启动时间' },
  { name: '代码质量', desc: '模块化、可读性、命名规范、文档覆盖' },
  { name: '测试覆盖', desc: '单元测试、集成测试、边界用例覆盖' },
  { name: '构建与部署', desc: '构建稳定性、跨平台兼容、依赖管理' }
]

// 移动端项目维度
const MOBILE_DIMENSIONS = [
  { name: '用户体验', desc: '交互流畅度、手势操作、加载状态、错误反馈' },
  { name: 'UI精细度', desc: '动画、适配、字体、颜色一致性、刘海/折叠屏适配' },
  { name: '功能完整性', desc: '功能实现率、边界场景覆盖' },
  { name: '性能', desc: '启动时间、内存占用、电池消耗、帧率' },
  { name: '可靠性', desc: '崩溃恢复、离线处理、弱网容错' },
  { name: '测试覆盖', desc: '单元测试、UI 测试、设备兼容性测试' }
]

// 纯后端/API 项目维度（无 UI）
const BACKEND_DIMENSIONS = [
  { name: '功能完整性', desc: 'API 端点覆盖率、业务逻辑完整性、边界场景' },
  { name: '可靠性', desc: '错误处理、重试机制、幂等性、数据一致性' },
  { name: '性能', desc: '响应时间、吞吐量、数据库查询效率、缓存命中率' },
  { name: '安全性', desc: '认证授权、输入校验、SQL 注入防护、敏感数据保护' },
  { name: '代码质量', desc: '模块化、可读性、命名规范、API 文档覆盖' },
  { name: '测试覆盖', desc: '单元测试、集成测试、API 契约测试、负载测试' }
]

// 桌面应用维度
const DESKTOP_DIMENSIONS = [
  { name: '用户体验', desc: '交互流畅度、启动速度、系统集成、通知/托盘' },
  { name: 'UI精细度', desc: '原生感、动画、字体、高 DPI 适配、主题一致性' },
  { name: '功能完整性', desc: '功能实现率、边界场景覆盖' },
  { name: '性能', desc: '启动时间、内存占用、CPU 使用、打包体积' },
  { name: '可靠性', desc: '崩溃恢复、自动更新、数据持久化' },
  { name: '测试覆盖', desc: '单元测试、UI 测试、跨平台兼容性测试' }
]

// 游戏项目维度
const GAME_DIMENSIONS = [
  { name: '玩法完整性', desc: '核心玩法循环、关卡设计、难度曲线' },
  { name: '视觉与音效', desc: '画面质量、动画流畅度、音效匹配' },
  { name: '性能', desc: '帧率稳定性、加载时间、内存占用、发热控制' },
  { name: '可靠性', desc: '崩溃率、存档完整性、网络同步稳定性' },
  { name: '代码质量', desc: '模块化、可维护性、资源管理' },
  { name: '测试覆盖', desc: '逻辑测试、性能测试、兼容性测试' }
]

const WEB_KEYWORDS = ['web', 'react', 'vue', 'angular', 'next.js', 'nextjs', 'nuxt', 'svelte', 'gatsby', 'remix', 'html', 'css', 'frontend']
const MOBILE_KEYWORDS = ['ios', 'android', 'react-native', 'flutter', 'swift', 'kotlin', 'xamarin', 'ionic', 'capacitor', 'mobile']
const BACKEND_KEYWORDS = ['api', 'server', 'backend', 'microservice', 'grpc', 'graphql', 'rest', 'express', 'fastapi', 'gin', 'spring', 'actix', 'rocket']
const DESKTOP_KEYWORDS = ['electron', 'tauri', 'qt', 'gtk', 'wxwidgets', 'javafx', 'wpf', 'winforms', 'desktop', 'maui']
const GAME_KEYWORDS = ['unity', 'unreal', 'godot', 'cryengine', 'lumberyard', 'game', 'opengl', 'vulkan', 'directx']

function getDimensionsForProject(projectTechStack) {
  if (CUSTOM_DIMENSIONS && Array.isArray(CUSTOM_DIMENSIONS) && CUSTOM_DIMENSIONS.length > 0) {
    return CUSTOM_DIMENSIONS.map(d => typeof d === 'string' ? { name: d, desc: d } : d)
  }
  if (!projectTechStack || projectTechStack === 'unknown') return DEFAULT_DIMENSIONS
  const lower = projectTechStack.toLowerCase()
  if (GAME_KEYWORDS.some(kw => lower.includes(kw))) return GAME_DIMENSIONS
  if (DESKTOP_KEYWORDS.some(kw => lower.includes(kw))) return DESKTOP_DIMENSIONS
  if (MOBILE_KEYWORDS.some(kw => lower.includes(kw))) return MOBILE_DIMENSIONS
  if (WEB_KEYWORDS.some(kw => lower.includes(kw))) return DEFAULT_DIMENSIONS
  if (BACKEND_KEYWORDS.some(kw => lower.includes(kw))) return BACKEND_DIMENSIONS
  return NON_WEB_DIMENSIONS
}

function readFilePrompt(path) {
  return `读取并遵循 ${path}。`
}

function karpathyReviewPrompt() {
  return `${readFilePrompt(`${SKILL_BASE}/karpathy-guidelines/SKILL.md`)}
Checklist：假设明确、不过度设计、改动范围合理、有可验证标准。`
}

function uxReviewPrompt(projectType) {
  const base = `${readFilePrompt(`${SKILL_BASE}/ui-ux-pro-max/SKILL.md`)}
重点检查：Accessibility（CRITICAL）、Touch & Interaction（CRITICAL）、Performance（HIGH）、Layout（HIGH）、Forms & Feedback（MEDIUM）。`

  if (projectType && !WEB_KEYWORDS.some(t => projectType.toLowerCase().includes(t))) {
    return `${base}\n非 Web 项目，代码走读：推断交互流程，检查错误反馈可见性、空状态、边界值、状态持久化。`
  }
  return base
}

function blastOffPrompt() {
  return `${readFilePrompt(`${SKILL_BASE}/blast-off-my-project/SKILL.md`)}
重点：secrets 检查、测试通过、README 中英文。`
}

/**
 * 带 fallback 的 schema agent 调用
 * 如果 schema 调用失败，降级为无 schema 调用并手动解析
 */
async function agentWithFallback(prompt, opts) {
  try {
    return await agent(prompt, opts)
  } catch (e) {
    log(`⚠️ Schema 调用失败 (${opts.label})，降级为普通调用...`)
    // 降级：不使用 schema，让 agent 返回文本，然后手动构造结构
    const textResult = await agent(
      prompt + '\n\n重要：请以 JSON 格式返回结果，不要添加其他文本。',
      { ...opts, schema: undefined }
    )
    // 尝试从文本中提取 JSON（括号平衡提取完整 JSON 对象）
    try {
      let depth = 0, start = -1, end = -1
      for (let i = 0; i < textResult.length; i++) {
        if (textResult[i] === '{') { if (depth === 0) start = i; depth++ }
        else if (textResult[i] === '}') { depth--; if (depth === 0 && start >= 0) { end = i; break } }
      }
      if (start >= 0 && end > start) {
        return JSON.parse(textResult.slice(start, end + 1))
      }
    } catch (parseErr) {
      log(`⚠️ JSON 解析失败`)
    }
    return null
  }
}

// ============================================================
// 追踪状态
// ============================================================

// 维度评分历史：{ dimensionName: [score_round1, score_round2, ...] }
const dimensionHistory = {}

function recordDimensionScores(dimensions) {
  for (const d of dimensions) {
    if (!dimensionHistory[d.name]) dimensionHistory[d.name] = []
    dimensionHistory[d.name].push(d.score)
  }
}

function getDimensionImprovement(dimName) {
  const scores = dimensionHistory[dimName]
  if (!scores || scores.length < 2) return 0
  return scores[scores.length - 1] - scores[0]
}

function getUnteratedDimensions(allDimensionNames, previousDimensions) {
  return allDimensionNames.filter(name => !previousDimensions.includes(name))
}

// checkpoint：保存迭代状态，支持 resume（通过 agent 读写文件，兼容所有 Workflow 环境）
async function saveCheckpoint(state) {
  try {
    if (state === null) {
      await agent(`如果文件 ${DOCS_DIR}/.iterator-checkpoint.json 存在则删除它。`, { label: 'checkpoint-clear', phase: 'Iterate' })
    } else {
      const json = JSON.stringify(state, null, 2)
      await agent(`将以下内容写入 ${DOCS_DIR}/.iterator-checkpoint.json（如目录不存在则创建）：\n\n${json}`, { label: 'checkpoint-save', phase: 'Iterate' })
    }
  } catch (e) { /* 非致命 */ }
}

async function loadCheckpoint() {
  try {
    const result = await agent(`如果文件 ${DOCS_DIR}/.iterator-checkpoint.json 存在，读取并返回其完整内容。如果不存在，返回空字符串。`, { label: 'checkpoint-load', phase: 'Detect' })
    if (result && result.trim()) return JSON.parse(result)
  } catch (e) {}
  return null
}

// ============================================================
// Workflow 主体
// ============================================================

// ---- Phase 0: 检测 + 初始化 ----
phase('Detect')
log('检测项目类型...')

const projectType = await agentWithFallback(
  `检测当前目录项目类型。任一存在即为已有项目，全部不存在为全新项目：
- 包管理：package.json / pyproject.toml / Cargo.toml / go.mod / pom.xml / *.uproject / CMakeLists.txt / Package.swift / Gemfile
- 源码目录：src/ / app/ / lib/ / Source/
- 源码文件：≥3 个代码文件
- 标识：README.md / .git/
不要假设项目类型，UE5/C++/Rust 同样是已有项目。`,
  { label: 'detect-project', phase: 'Detect', schema: PROJECT_TYPE_SCHEMA }
)

// 如果检测失败，使用默认值
if (!projectType) {
  log('⚠️ 项目检测失败，假设为已有项目继续...')
}

const isNewProject = projectType?.isNew ?? false
const techStack = projectType?.techStack ?? 'unknown'
log(`项目类型：${isNewProject ? '全新项目' : '已有项目'} — ${projectType?.reason || '检测降级'}`)

// dry-run：检测完成后立即输出计划并退出，跳过初始化和迭代
if (DRY_RUN) {
  const planDimensions = getDimensionsForProject(techStack)
  log('🔍 DRY-RUN 模式 — 执行计划预览：')
  log(`  项目类型：${isNewProject ? '全新项目' : '已有项目'} — ${techStack}`)
  log(`  最大迭代轮次：${MAX_ITERATIONS}`)
  log(`  评估维度：${planDimensions.map(d => d.name).join(', ')}`)
  log(`  聚焦维度：${FOCUS_DIMENSION || '自动选择'}`)
  log(`  跳过维度：${SKIP_DIMENSIONS.join(', ') || '无'}`)
  log(`  每轮流程：评估(并行) → ROADMAP → 开发 → 测试 → 审核(≤3次) → 安全检查 → 日志 → 收敛检测`)
  log(`  预估 token 消耗：${MAX_ITERATIONS * 75}k`)
  log('结束 dry-run。')
}

if (isNewProject && !DRY_RUN) {
  log('全新项目：开始研究和规划...')

  await agent(
    `基于用户需求研究技术方案：
1. 搜索 GitHub 类似项目（至少 3 个），评估维度：社区活跃度（stars/最近提交时间）、技术匹配度、可扩展性
2. 确定技术栈及选择理由
3. 列出核心功能清单（MVP 范围，P0 功能不超过 5 个）
4. 识别技术风险点及应对方案`,
    { label: 'research', phase: 'Detect' }
  )

  await agent(
    `基于研究结果设计项目架构：目录结构、核心模块关系、数据模型、关键技术决策。创建 ${DOCS_DIR}/ARCHITECTURE.md。`,
    { label: 'architecture', phase: 'Detect' }
  )

  await agent(
    `基于架构设计创建功能规划：列出所有功能并标注优先级（P0/P1/P2），P0 = MVP 必须实现，确定实现顺序。创建 ${DOCS_DIR}/ROADMAP.md。`,
    { label: 'planning', phase: 'Detect' }
  )

  // vision 和 init-log 无依赖关系，并行执行
  await parallel([
    () => agent(
      `创建 ${DOCS_DIR}/VISION.md：项目愿景（一句话）、目标用户、核心价值主张、成功标准。此文件后续不再修改。`,
      { label: 'create-vision', phase: 'Detect' }
    ),
    () => agent(
      `创建 ${DOCS_DIR}/ITERATION_LOG.md，记录 Round 0 — 初始化：技术栈选择及理由、架构决策、MVP 功能范围、已知风险。`,
      { label: 'init-log', phase: 'Detect' }
    )
  ])

  // 实现 MVP
  log('实现 MVP...')
  const mvpResult = await agentWithFallback(
    `实现 MVP：只实现 ${DOCS_DIR}/ROADMAP.md 中 P0 功能，确保可构建运行，编写基本测试。构建失败则修复重试（最多 3 次）。`,
    { label: 'build-mvp', phase: 'Detect', schema: BUILD_RESULT_SCHEMA }
  )

  if (mvpResult && !mvpResult.success) {
    log(`⚠️ MVP 构建失败：${(mvpResult.errors || []).join(', ')}`)
    log('尝试修复构建错误...')
    await agentWithFallback(
      `修复以下 MVP 构建错误，重新构建确认成功：
${(mvpResult.errors || []).map(e => `- ${e}`).join('\n')}`,
      { label: 'fix-mvp-build', phase: 'Detect', schema: BUILD_RESULT_SCHEMA }
    )
  }

  log('MVP 构建完成')

} else if (!DRY_RUN) {
  // 已有项目：理解 + 评估
  log('已有项目：理解项目结构...')

  await agent(
    `探索项目代码结构：
1. 读取包管理文件：技术栈、依赖、构建/测试脚本
2. 理解目录结构：模块划分、入口文件、配置文件
3. 读取 1-2 个核心文件：代码风格、命名规范、错误处理模式
4. 检查测试：是否有测试、覆盖率配置、测试框架
返回：技术栈、目录结构概述、核心功能列表、代码风格。`,
    { label: 'explore-code', phase: 'Detect' }
  )

  await agent(
    `在 ${DOCS_DIR}/ 下创建文档体系（如已有类似文档则参考但不复制）：
- VISION.md — 从 README/代码推断愿景，无法推断标记"待确认"
- ROADMAP.md — 已实现功能 + 明显缺失
- ITERATION_LOG.md — Round 0 基线评估
- ARCHITECTURE.md — 当前架构`,
    { label: 'init-docs', phase: 'Detect' }
  )

  log('文档体系初始化完成')
}

// ---- Phase 1-N: 迭代循环 ----
phase('Iterate')

// 尝试从 checkpoint 恢复
const checkpoint = await loadCheckpoint()
let iteration = checkpoint?.iteration ?? 0
let consecutiveSkips = checkpoint?.consecutiveSkips ?? 0
let shouldContinue = true
let previousDimensions = checkpoint?.previousDimensions ?? []
if (checkpoint) {
  log(`从 checkpoint 恢复：已完成 ${iteration} 轮，已迭代维度：${previousDimensions.join(', ')}`)
  // 恢复维度历史
  if (checkpoint.dimensionHistory) {
    Object.assign(dimensionHistory, checkpoint.dimensionHistory)
  }
}

while (iteration < MAX_ITERATIONS && shouldContinue && !DRY_RUN) {
  iteration++
  log(`\n${'='.repeat(60)}`)
  log(`第 ${iteration} 轮迭代开始`)
  log(`${'='.repeat(60)}`)

  // ---- Step 1+2: 并行执行产品经理评估 + 终端用户体验测试 ----
  log('Step 1+2: 并行执行产品经理评估 + 终端用户体验测试...')

  const projectDimensions = getDimensionsForProject(techStack)
  const dimensionList = projectDimensions.map(d => `- ${d.name}：${d.desc}`).join('\n')
  const focusHint = FOCUS_DIMENSION ? `\n用户指定本轮聚焦维度：${FOCUS_DIMENSION}（优先选择此维度）` : ''
  const skipHint = SKIP_DIMENSIONS.length > 0 ? `\n跳过以下维度：${SKIP_DIMENSIONS.join(', ')}` : ''

  const [assessment, userTest] = await parallel([
    () => agentWithFallback(
      `读取 ${DOCS_DIR}/ROADMAP.md、${DOCS_DIR}/ITERATION_LOG.md 和项目源码，评估以下维度（1-10 分，每个给出具体证据）：
${dimensionList}

选择本轮聚焦维度：
1. 得分最低的 2-3 个，优先未迭代过的（已迭代：${previousDimensions.join(', ') || '无'}）
2. 选"改进后用户感知最大"的${focusHint}${skipHint}
3. 提出改进方案，新增功能 ≤2 个`,
      { label: `R${iteration}-assess`, phase: 'Iterate', schema: DIMENSION_ASSESSMENT_SCHEMA }
    ),
    () => agentWithFallback(
      `以首次使用者视角体验产品。${uxReviewPrompt(techStack)}

逐项检查：
1. 首次打开 — 引导清晰？知道做什么？
2. 核心流程 — 顺畅？哪里卡住？
3. 错误场景 — 反馈清晰？能恢复？
4. 边界情况 — 空数据/大数据/极端输入
5. 离开再回来 — 状态保留？

记录所有卡点。`,
      { label: `R${iteration}-ux-test`, phase: 'Iterate', schema: USER_EXPERIENCE_SCHEMA }
    )
  ])

  if (!assessment) {
    log('⚠️ 维度评估失败，跳过本轮...')
    consecutiveSkips++
    continue
  }

  // 记录维度评分历史
  if (assessment.dimensions) {
    recordDimensionScores(assessment.dimensions)
  }

  log(`聚焦维度：${assessment.focus.dimension}`)
  log(`改进目标：${assessment.focus.improvement}`)

  const painPoints = userTest?.topPainPoints || []
  if (painPoints.length > 0) {
    log(`主要痛点：${painPoints.join(', ')}`)
  }

  // ---- Step 3: 更新 ROADMAP ----
  log('Step 3: 更新 ROADMAP...')

  await agent(
    `更新 ${DOCS_DIR}/ROADMAP.md：本轮改进条目→"🔄 进行中"，新增条目≤2 个。
聚焦：${assessment.focus.dimension} — ${assessment.focus.improvement}`,
    { label: `R${iteration}-roadmap`, phase: 'Iterate' }
  )

  // ---- Step 4: 功能开发 ----
  log('Step 4: 功能开发...')

  const devResult = await agent(
    `只实现以下改进，不做额外改动：
维度：${assessment.focus.dimension} — ${assessment.focus.improvement}
方案：${JSON.stringify(assessment.focus, null, 2)}

遵循现有风格，改动最小化。涉及 UI 先执行 python3 ${SKILL_BASE}/ui-ux-pro-max/scripts/search.py '${assessment.focus.dimension}' --design-system。完成后构建确认无错误。`,
    { label: `R${iteration}-dev`, phase: 'Iterate' }
  )

  log('Step 4b: 测试编写...')

  const testResult = await agent(
    `为以下改进编写测试。${readFilePrompt(`${SKILL_BASE}/karpathy-guidelines/SKILL.md`)}

改进：${assessment.focus.improvement}
覆盖核心功能+边界（正向+反向），覆盖率 80%+，每个测试有明确成功标准，运行确认全部通过。`,
    { label: `R${iteration}-test`, phase: 'Iterate' }
  )

  log('开发和测试完成')

  // ---- Step 5: 代码审核（关卡模式）----
  log('Step 5: 代码审核...')

  let reviewPassed = false
  let retryCount = 0
  const MAX_RETRIES = 3

  while (!reviewPassed && retryCount < MAX_RETRIES) {
    const review = await agentWithFallback(
      `${karpathyReviewPrompt()}

仅审核 git diff HEAD 的变更（已有代码问题不在范围）。
检查：质量、安全、架构、过度设计、改动范围、测试覆盖。无 CRITICAL/HIGH 则 hasBlocking = false。`,
      { label: `R${iteration}-review-${retryCount}`, phase: 'Iterate', schema: CODE_REVIEW_SCHEMA, agentType: 'code-reviewer' }
    )

    if (!review || !review.hasBlocking) {
      reviewPassed = true
      log(`代码审核通过 — ${review?.summary || '无阻断问题'}`)
    } else {
      retryCount++
      log(`代码审核未通过（第 ${retryCount} 次）：${review.summary}`)

      if (retryCount < MAX_RETRIES) {
        log('修复审核问题...')
        await agent(
          `修复以下审核问题（只修这些，不做额外改动）：
${review.issues.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH')
  .map(i => `- [${i.severity}] ${i.file || ''}:${i.line || ''} — ${i.description} → ${i.suggestion}`)
  .join('\n')}`,
          { label: `R${iteration}-fix-${retryCount}`, phase: 'Iterate' }
        )
      }
    }
  }

  if (!reviewPassed) {
    log('代码审核 3 次未通过，执行回滚...')
    await agent(
      `回滚本轮代码改动：
1. git diff --name-only → 非 ${DOCS_DIR}/ 文件 git checkout HEAD -- <file>
2. 新增未追踪文件 rm 删除
3. ${DOCS_DIR}/ 文档保留
4. git status 确认干净
在 ${DOCS_DIR}/ITERATION_LOG.md 追加"## 第 ${iteration} 轮（已回滚）"，原因：${review?.summary || '审核未通过'}。`,
      { label: `R${iteration}-rollback`, phase: 'Iterate' }
    )
    // 记录本轮维度为已迭代（即使回滚），避免在同一个死循环维度上重试
    previousDimensions.push(assessment.focus.dimension)
    consecutiveSkips++
    log(`回滚完成。维度"${assessment.focus.dimension}"标记为已迭代，下轮将切换维度。连续跳过：${consecutiveSkips}`)
    continue
  }

  // ---- Step 6: 涉及安全代码时额外安全审查 ----
  const securityCheck = await agentWithFallback(
    `判断本轮改动是否涉及安全敏感代码（认证/授权、用户输入、数据库查询、API 端点、密码/token、文件系统、加密）。`,
    { label: `R${iteration}-security-check`, phase: 'Iterate', schema: SECURITY_CHECK_SCHEMA }
  )

  let securityPassed = true
  if (securityCheck?.hasSecuritySensitive) {
    log(`检测到安全敏感代码：${(securityCheck.areas || []).join(', ')}，执行安全审查...`)
    const securityReview = await agentWithFallback(
      `安全审查。涉及区域：${(securityCheck.areas || []).join(', ')}
检查 OWASP Top 10（注入、认证失效、敏感数据暴露、访问控制、安全配置、XSS 等）。CRITICAL 问题 hasBlocking = true。`,
      { label: `R${iteration}-security-review`, phase: 'Iterate', schema: CODE_REVIEW_SCHEMA, agentType: 'security-reviewer' }
    )
    if (securityReview?.hasBlocking) {
      log(`⚠️ 安全审查发现 CRITICAL 问题，尝试修复...`)
      await agent(
        `修复以下安全问题（只修这些，不做额外改动）：
${(securityReview.issues || []).filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH')
  .map(i => `- [${i.severity}] ${i.file || ''}:${i.line || ''} — ${i.description} → ${i.suggestion}`)
  .join('\n')}`,
        { label: `R${iteration}-security-fix`, phase: 'Iterate' }
      )
      securityPassed = true // 修复后视为通过
    }
  }

  // ---- Step 7: 更新 ITERATION_LOG ----
  log('Step 7: 更新迭代记录...')

  await agent(
    `在 ${DOCS_DIR}/ITERATION_LOG.md 末尾追加（只追加不改已有），严格用此格式：

## 第 ${iteration} 轮 — [YYYY-MM-DD]
### 聚焦维度
${assessment.focus.dimension} — ${assessment.focus.improvement}
### 改进目标
${assessment.focus.expectedImpact}
### 执行过程
[改动了什么，涉及哪些文件，关键决策]
### 审核结果
代码：${reviewPassed ? '通过' : '未通过'} | 安全：${securityCheck?.hasSecuritySensitive ? (securityPassed ? '通过' : '需修复') : '未涉及'}
### 用户痛点
${painPoints.join(', ') || '无'}
### 成果
[实际改进了什么，量化变化如有]
### 下一轮方向
[遗留问题 + 建议]`,
    { label: `R${iteration}-log`, phase: 'Iterate' }
  )

  // ---- Step 8: 收敛检测（跨维度轮转） ----
  log('Step 8: 收敛检测...')

  // 记录本轮迭代的维度
  previousDimensions.push(assessment.focus.dimension)

  // 构建维度历史摘要
  const dimensionHistorySummary = Object.entries(dimensionHistory)
    .map(([name, scores]) => {
      const improvement = getDimensionImprovement(name)
      return `  ${name}: ${scores.join(' → ')} (变化: ${improvement > 0 ? '+' : ''}${improvement})`
    })
    .join('\n')

  const unterated = getUnteratedDimensions(
    assessment.dimensions.map(d => d.name),
    previousDimensions
  )

  const convergence = await agentWithFallback(
    `判断是否继续迭代。
本轮：${assessment.focus.dimension}，审核${reviewPassed ? '通过' : '未通过'}，连续跳过${consecutiveSkips}
已迭代：${previousDimensions.join(', ')} | 未迭代：${unterated.join(', ') || '无'}
评分：${assessment.dimensions.map(d => `${d.name}=${d.score}`).join(', ')} | 历史：${dimensionHistorySummary || '无'}

继续（任一）：有<7分未迭代维度；本轮显著改进且有空间；P0/P1未完成。
终止（同时）：所有≥7分或无方向；且连续2轮无改进或连续跳过≥2。
轮转：当前维度完成→切最弱未迭代维度。
继续时 nextDimension 必填（最弱未迭代维度名称），不可省略。`,
    { label: `R${iteration}-converge`, phase: 'Iterate', schema: CONVERGENCE_SCHEMA }
  )

  if (!convergence || !convergence.shouldContinue || consecutiveSkips >= 2) {
    log(`迭代终止：${convergence?.reason || '收敛检测失败或已满足终止条件'}`)
    shouldContinue = false
  } else {
    if (convergence.hasSignificantImprovement) {
      consecutiveSkips = 0
    }
    log(`第 ${iteration} 轮完成。${convergence.reason}`)
    if (convergence.nextDimension) {
      log(`下一轮建议聚焦：${convergence.nextDimension}`)
    }
  }

  // 保存 checkpoint（每轮结束时）
  await saveCheckpoint({
    iteration,
    consecutiveSkips,
    previousDimensions,
    dimensionHistory,
    lastFocus: assessment.focus.dimension,
    timestamp: new Date().toISOString()
  })
}

// 记录实际迭代轮次（不含初始化轮）
const actualIterations = iteration

// ---- Phase Final: 交付 ----
phase('Deliver')
log('开始最终交付流程...')

// 最终构建验证
log('最终构建验证...')
const buildResult = await agentWithFallback(
  `验证项目构建。技术栈：${techStack}。读取包管理确定构建/测试命令并执行，失败则修复重试（最多 3 次）。`,
  { label: 'final-build-verify', phase: 'Deliver', schema: BUILD_RESULT_SCHEMA }
)

if (buildResult && !buildResult.success) {
  log(`⚠️ 最终构建验证失败：${(buildResult.errors || []).join(', ')}`)
  log('尝试修复构建错误...')
  await agentWithFallback(
    `修复以下构建错误，重新构建确认成功：
${(buildResult.errors || []).map(e => `- ${e}`).join('\n')}`,
    { label: 'final-build-fix', phase: 'Deliver', schema: BUILD_RESULT_SCHEMA }
  )
} else {
  log('✅ 最终构建验证通过')
}

// 更新 ROADMAP 中剩余条目的状态
await agent(
  `更新 ${DOCS_DIR}/ROADMAP.md 最终状态："🔄 进行中"→"✅ 已完成"，"⏳ 待做"→"📋 后续迭代"，添加"当前状态"总结。`,
  { label: 'final-roadmap', phase: 'Deliver' }
)

// 生成 DELIVERY_REPORT.md
const deliveryReport = await agentWithFallback(
  `生成交付报告。读取 ${DOCS_DIR}/ITERATION_LOG.md、${DOCS_DIR}/ROADMAP.md、${DOCS_DIR}/VISION.md，评估当前状态。
包含：项目概况、总迭代轮次（${actualIterations}，不含 Round 0）、稳定功能列表、已知问题、后续建议、各维度最终评分（1-10）。`,
  { label: 'delivery-report', phase: 'Deliver', schema: DELIVERY_REPORT_SCHEMA }
)

// 写入 DELIVERY_REPORT.md
await agent(
  `写入 ${DOCS_DIR}/DELIVERY_REPORT.md（标准 markdown）：
项目概况：${deliveryReport?.projectSummary || '项目已完成迭代优化'}
迭代轮次：${deliveryReport?.totalIterations || actualIterations}（不含 Round 0）
稳定功能：${(deliveryReport?.stableFeatures || []).map(f => `- ${f}`).join('\n') || '待补充'}
已知问题：${(deliveryReport?.knownIssues || []).map(i => `- ${i}`).join('\n') || '待补充'}
后续建议：${(deliveryReport?.nextSteps || []).map(s => `- ${s}`).join('\n') || '待补充'}
维度评分：${(deliveryReport?.finalScores || []).map(s => `| ${s.dimension} | ${s.score}/10 | ${s.note} |`).join('\n') || '| 维度 | 评分 | 说明 |'}`,
  { label: 'write-report', phase: 'Deliver' }
)

// 最终文档整理
log('最终文档整理...')
await agent(
  `最终文档整理。${blastOffPrompt()}
项目已完成 ${actualIterations} 轮迭代。确保：README.md 完整、无 secrets 泄露、可构建运行。`,
  { label: 'final-docs', phase: 'Deliver' }
)

// 跨轮次进度汇总
log(`\n${'='.repeat(60)}`)
log('维度评分变化趋势：')
for (const [name, scores] of Object.entries(dimensionHistory)) {
  const improvement = getDimensionImprovement(name)
  const trend = improvement > 0 ? `📈 +${improvement}` : improvement < 0 ? `📉 ${improvement}` : '➡️ 持平'
  log(`  ${name}: ${scores.join(' → ')} ${trend}`)
}
log(`\n交付完成！共 ${actualIterations} 轮迭代（不含初始化轮）`)
log(`${'='.repeat(60)}`)

// 清理 checkpoint 文件
await saveCheckpoint(null)
