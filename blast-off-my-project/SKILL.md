---
name: blast-off-my-project
description: 项目发布前的最后一步 - 更新文档让项目闪闪发光。当你想发布开源项目到 GitHub、需要更新 CLAUDE.md/AGENTS.md、生成或更新 README（中英文）、或确保项目对人类和 AI agent 都具备友好上手体验时，使用此 skill。这会让你的项目在发布前变得专业且吸引人。
tags: [github, release, documentation, README, project-launch]
compatibility: [git, terminal, file]
---

# Blast Off My Project

项目发布前的最后一步——让文档发光，让项目对人类和 AI agent 都充满吸引力。

## 何时使用

- 项目准备发布到 GitHub 前
- 需要更新 CLAUDE.md 或 AGENTS.md
- 需要生成或刷新 README 文档
- 想让项目对其他开发者更有吸引力

## 执行流程

### 第一步：安全审查

在发布前必须检查隐私数据，防止 secrets、API keys、tokens 等敏感信息泄露到 GitHub。

**必须检查的敏感文件类型**：
- `.env`、`.env.local`、`.env.production`、`.env.*.local`
- `secrets.json`、`credentials.json`、`keys.json`
- `*.pem`、`*.key`、`*.p12`、`*.pfx`
- `config.local.*`、`settings.local.*`
- `openapi.json`（可能含 API key）
- 任何包含 `api_key`、`apikey`、`api-key`、`token`、`secret`、`password` 的文件

**检查命令**（在项目根目录执行）：

```bash
# 1. 检查 .gitignore 是否正确配置
cat .gitignore

# 2. 检查是否有 .env 文件被追踪
git ls-files | grep -E '\.env'

# 3. 搜索常见 secrets 模式
grep -rE '(api[_-]?key|apikey|api-key|token|secret|password|private[_-]?key)' \
  --include='*.json' --include='*.yaml' --include='*.yml' --include='*.toml' \
  --include='*.env*' --include='*.config*' --include='*.ini' \
  --exclude-dir=node_modules --exclude-dir=.git .

# 4. 可选：使用 gitleaks 深度扫描
gitleaks detect --source . 2>/dev/null || echo "gitleaks not installed, skipping"
```

**常见风险场景**：
| 场景 | 风险 | 修复方式 |
|------|------|----------|
| `.env` 已提交 | API keys 暴露 | `git filter-branch` 或 BFG 清除历史 |
| 示例文件含真实 key | 误导或泄露 | 替换为 `YOUR_API_KEY_HERE` |
| 硬编码 secrets | 永久泄露 | 迁移到环境变量 |

**如果发现敏感数据**：
1. 立即停止发布流程
2. 清理敏感数据，替换为 placeholder
3. 使用 `git filter-repo` 或 BFG Repo-Cleaner 清除历史
4. 重新生成 .gitignore（如果不够严格）
5. 确认清理完毕后再继续

---

### 第二步：法律与许可证检查

确保项目符合开源法律要求。

**必须检查**：
- [ ] `LICENSE` 文件存在（MIT、Apache 2.0、GPL 等 OSI 认证许可证）
- [ ] 许可证与项目依赖兼容
- [ ] 非代码资源版权清理（图片、字体等 assets 是否有分发权限）

**常见许可证兼容性**：
| 项目许可证 | 允许的依赖 | 需注意 |
|-----------|-----------|--------|
| MIT | 几乎所有 | 无 |
| Apache 2.0 | 几乎所有 | 需注意专利条款 |
| GPL | GPL/AGPL/LGPL | 不能用 MIT-only 依赖 |
| BSD | 几乎所有 | 无 |

**检查命令**：
```bash
# 检查 LICENSE 文件
ls -la LICENSE* LICENCE* 2>/dev/null
cat LICENSE 2>/dev/null | head -20
```

---

### 第三步：代码质量检查

确保代码达到发布标准。

**检查清单**：
- [ ] 所有测试通过：`npm test` / `pytest` / `cargo test`
- [ ] 编译/构建无错误：`npm run build` / `cargo build`
- [ ] 无调试代码（console.log、print、debugger 等）
- [ ] 代码风格统一（ESLint、Prettier、Black、rustfmt 等）

**检查命令**：
```bash
# 测试
npm test 2>/dev/null || pytest 2>/dev/null || cargo test 2>/dev/null

# 构建
npm run build 2>/dev/null || cargo build 2>/dev/null

# 查找调试代码
grep -rn 'console\.\|print\|debugger' --include='*.js' --include='*.ts' --include='*.py' --exclude-dir=node_modules --exclude-dir=dist .
```

---

### 第四步：版本与发布准备

管理版本号和变更日志。

**版本号规范**（semver）：
- `MAJOR.MINOR.PATCH`（如 `1.0.0`）
- MAJOR：不兼容的 API 变更
- MINOR：向后兼容的新功能
- PATCH：向后兼容的 bug 修复

**检查清单**：
- [ ] `package.json` / `pyproject.toml` / `Cargo.toml` 中的版本号已更新
- [ ] `CHANGELOG.md` 已更新本次发布的变更
- [ ] Git tag 已创建

**CHANGELOG 格式**（参考 [keepachangelog.com](https://keepachangelog.com/)）：
```markdown
## [1.0.0] - YYYY-MM-DD

### Added
- 新功能

### Fixed
- 修复的 bug
```

**发布命令**：
```bash
# 更新版本号
npm version patch  # 或 minor / major

# 提交并创建 tag
git add -A
git commit -m "Release v1.0.0"
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main
git push origin v1.0.0
```

---

### 第五步：运行 /init + 分析项目

执行 `/init` 生成 CLAUDE.md 或 AGENTS.md，然后阅读项目关键文件：

1. **package.json / pyproject.toml / Cargo.toml** - 了解项目依赖、命令、入口
2. **现有文档** - 快速浏览现有 README、docs/ 目录
3. **核心源码** - 1-2 个核心文件，理解项目做什么
4. **CLAUDE.md** - 查看刚刚更新的项目说明

---

### 第六步：生成中英文 README

基于分析结果，生成让人类心动、让 AI agent 能自动操作的 README。

#### README.md（英文，主版本）

英文版是事实标准，必须优先完成：

```markdown
# Project Name

[一句吸引人的话] — 让读者在 5 秒内知道为什么这个项目值得关注。

## Why This Project?

[2-3 段，说明项目解决的问题、为什么比现有方案好]

## Features

- ✨ Feature 1
- 🚀 Feature 2
- 🔒 Feature 3

## Quick Start

### Prerequisites
[运行项目的前置条件]

### Installation
[安装命令]

### Usage
[基本使用示例]

## For AI Agents

This project is designed for seamless AI agent interaction:

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd <project-name>
   # npm install / pip install / cargo build
   ```

2. **Configure**
   ```bash
   # copy .env.example, set API keys
   ```

3. **Run**
   ```bash
   # start command
   ```

## Contributing
[简短贡献指南]

## License
MIT / Apache 2.0 / [Your License]
```

#### README_zh.md（中文版）

内容必须与英文版完全一致，只是语言不同。使用相同结构和顺序。

#### README 写作指南

**吸引人类的技巧**：
- 第一行 tagline 必须在 5 秒内传达价值
- 用结果说话，不说"我们用了 X 技术"
- 给出能跑的真实代码，不是 placeholder
- 适度 emoji（5-8 个）

**AI Agent 指南的写法**：
- 零猜测：agent 能完整执行每一步
- 完整链路：克隆 → 安装 → 配置 → 运行
- 具体命令替代描述性文字
- 版本明确：最低 Node/Python/Rust 版本
- 展示 .env.example 或 config.example

---

### 第七步：文档完整性最终检查

确保所有必要文档齐全且完整。

**必须存在的文档**：
| 文件 | 说明 | 状态 |
|------|------|------|
| `README.md` | 英文版（主） | 必须生成 |
| `README_zh.md` | 中文版 | 必须生成 |
| `LICENSE` | 许可证 | 必须存在 |
| `CLAUDE.md` 或 `AGENTS.md` | AI agent 指令 | 必须生成 |
| `CONTRIBUTING.md` | 贡献指南 | 推荐存在 |
| `CHANGELOG.md` | 变更历史 | 推荐存在 |

**检查 README 质量**：
- [ ] 第一行 tagline 有吸引力
- [ ] AI Agent 指南完整（克隆→安装→配置→运行）
- [ ] 没有 placeholder 或 TODO
- [ ] 中英文结构完全一致
- [ ] README 含 badge（如适用）

---

### 第八步：最终总结反馈

完成所有步骤后，输出项目发布准备情况的总结：

```markdown
## 项目发布准备总结

### ✅ 已完成

- [安全] .gitignore 配置完整，无 secrets 泄露风险
- [法律] LICENSE 文件存在（MIT/Apache 2.0/...）
- [代码] 测试通过，构建成功
- [版本] v1.0.0 tag 已创建
- [文档] README.md / README_zh.md / CLAUDE.md 已生成

### 📋 GitHub Release 信息

- **Tag**: v1.0.0
- **标题**: [项目名称] v1.0.0
- **内容**: 参见 CHANGELOG.md

### 🚀 下一步

1. 点击 "Create a new release" 创建 GitHub Release
2. 选择 v1.0.0 tag
3. 点击 "Generate release notes"
4. 检查 CHANGELOG 内容
5. 点击 "Publish release"

### 📊 项目亮点

[3-5 行项目核心价值描述，用于社交媒体/推广]
```

---

## 验证清单（快速核对）

| 类别 | 检查项 | 状态 |
|------|--------|------|
| 安全 | .gitignore 完整 | ☐ |
| 安全 | 无 secrets 泄露 | ☐ |
| 法律 | LICENSE 存在 | ☐ |
| 代码 | 测试通过 | ☐ |
| 代码 | 构建成功 | ☐ |
| 版本 | CHANGELOG 更新 | ☐ |
| 版本 | Git tag 创建 | ☐ |
| 文档 | README.md | ☐ |
| 文档 | README_zh.md | ☐ |
| 文档 | CLAUDE.md/AGENTS.md | ☐ |
| 质量 | tagline 有吸引力 | ☐ |
| 质量 | AI Agent 指南完整 | ☐ |
| 质量 | 中英文一致 | ☐ |

---

## 示例 tagline

| 项目类型 | tagline 示例 |
|---------|------------|
| CLI 工具 | "Ship production-grade CLI tools in hours, not days" |
| Web 框架 | "The framework that gets out of your way" |
| AI 库 | "LLM-powered [X] without the boilerplate" |
| 数据库 | "SQLite for production. Finally." |
| 开发者工具 | "Write less boilerplate. Ship more features." |
