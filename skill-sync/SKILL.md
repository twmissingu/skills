---
name: skill-sync
description: "Use after creating or updating a Hermes skill. Publish to GitHub repo and sync to all agents (OpenCode, Claude Code, Cursor, etc.) via skills CLI."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [skill-management, publishing, multi-agent, github]
    related_skills: [blast-off-my-skill, complex-task-prompt]
---

# Skill Sync — 一键发布与多 Agent 同步

## Overview

将本地创建/修改的 skill 完成三件事：放入项目仓库、推送到 GitHub、同步到所有 agent。一条流水线搞定，不遗漏。

## When to Use

- 新 skill 创建完毕，需要发布
- 已有 skill 修改完毕，需要更新
- 用户说"同步这个 skill" / "发布 skill" / "让其他 agent 也能用"

**不触发：**
- skill 内容还在草稿/讨论阶段
- 只是本地使用，不需要共享

## 前置条件

- 项目仓库已 clone：`~/Documents/dev/skills`（或用户指定路径）
- GitHub SSH 已配置（`git remote -v` 能看到 origin）
- `skills` CLI 已安装（`which skills` 有输出）

## Workflow

### Step 1: 复制到项目仓库

```bash
# 确保目标目录存在
mkdir -p ~/Documents/dev/skills/<skill-name>

# 复制 SKILL.md（从 hermes skills 目录或用户指定路径）
cp ~/.hermes/skills/<category>/<skill-name>/SKILL.md ~/Documents/dev/skills/<skill-name>/SKILL.md
```

注意：项目仓库是扁平结构（`<skill-name>/SKILL.md`），不带 category 子目录。

### Step 2: 更新 README.md

在 `~/Documents/dev/skills/README.md` 的 Skills 表格中新增一行：

```markdown
| [skill-name](./skill-name/) | 一句话描述 |
```

### Step 3: Git 提交推送

```bash
cd ~/Documents/dev/skills
git add <skill-name>/ README.md
git commit -m "feat: add <skill-name> - <一句话描述>"
git push origin main
```

### Step 4: 同步到所有 Agent

```bash
skills add twmissingu/skills -s <skill-name> -a '*' -y
```

参数说明：
- `twmissingu/skills` — GitHub 仓库（格式：`owner/repo`）
- `-s <skill-name>` — 指定安装哪个 skill（仓库中有多个时必须指定）
- `-a '*'` — 安装到所有 agent（OpenCode、Claude Code、Cursor 等）
- `-y` — 跳过确认提示

### Step 5: 验证

```bash
# 确认 agent 目录中有 symlink
ls -la ~/.claude/skills/<skill-name>

# 确认 skills 列表中出现
skills list 2>&1 | grep <skill-name>
```

## 完整命令速查

```bash
# 一键同步（假设 skill 已在本地创建好）
SKILL_NAME="my-skill"
cp ~/.hermes/skills/*/$SKILL_NAME/SKILL.md ~/Documents/dev/skills/$SKILL_NAME/
cd ~/Documents/dev/skills && git add $SKILL_NAME/ README.md && git commit -m "feat: add $SKILL_NAME" && git push origin main
skills add twmissingu/skills -s $SKILL_NAME -a '*' -y
```

## 更新已有 Skill

流程相同，区别仅在于：
- Step 1: 用 `patch` 或直接覆盖 SKILL.md
- Step 3: commit message 用 `update:` 而非 `feat:`
- Step 4: 如果 skill 已安装过，`skills add` 会自动更新 symlink

## Common Pitfalls

1. **忘记更新 README** — 仓库中 skill 存在但表格没列，别人找不到
2. **没指定 `-s` 参数** — 仓库有多个 skill 时 `skills add` 会报错或安装全部
3. **项目仓库和 hermes skills 目录混用** — 项目仓库是扁平结构，hermes 是 category 嵌套，不要搞混
4. **symlink 断裂** — 如果移动了 dev/skills 仓库路径，所有 symlink 都会断，需要重新 `skills add`
5. **skills CLI 未安装** — 先确认 `which skills`，没有则需要安装

## Verification Checklist

- [ ] SKILL.md 已复制到项目仓库正确路径
- [ ] README.md 表格已更新
- [ ] Git commit message 格式正确（feat:/update:）
- [ ] 已 push 到 GitHub
- [ ] `skills add` 执行成功，无报错
- [ ] `~/.claude/skills/<skill-name>` symlink 存在且指向正确
- [ ] `skills list` 中能看到该 skill 及其关联的 agent 列表
