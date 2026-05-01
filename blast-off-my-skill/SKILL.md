---
name: blast-off-my-skill
description: 将指定的 skill 发布到 GitHub 供他人使用。当你想要将本地创建的 Hermes skill 转换为 Claude Code/OpenCode 可用的格式，并同步到 ~/Documents/dev/skills 项目推送到 GitHub 时使用此 skill。传入要发布的 skill 名称作为参数。
tags: [github, skill, release, open-source]
compatibility: [git, terminal, file]
---

# Blast Off My Skill

将指定的 skill 发布到 GitHub，方便供其他人下载使用。

## 何时使用

- 想要将本地创建的 skill 分享给其他人
- 需要将 Hermes skill 转换为 Claude Code/OpenCode 兼容格式
- 想要更新已发布的 skill
- 项目管理 ~/Documents/dev/skills 目录

## 执行流程

### 第一步：确认 skill 名称

接收用户输入的 skill 名称，格式：`blast-off-my-skill <skill-name>`

例如：`blast-off-my-skill blast-off-my-project`

**验证 skill 存在**：
```bash
# 检查 skill 是否存在于 Hermes skills 目录
ls -la ~/.hermes/skills/<skill-name>/SKILL.md
```

如果 skill 不存在，提示用户并列出可用的 skills：
```bash
ls ~/.hermes/skills/
```

### 第二步：读取源 skill

读取源 skill 的 SKILL.md，分析其内容：

1. **提取 skill 元信息**：
   - name
   - description
   - tags
   - compatibility

2. **检查是否有额外资源**：
   ```bash
   ls ~/.hermes/skills/<skill-name>/
   ```
   常见子目录/文件：
   - `scripts/` - 可执行脚本
   - `docs/` - 文档
   - `references/` - 参考资料
   - `templates/` - 模板
   - `assets/` - 资源文件

### 第三步：转换 skill 格式

将 Hermes 格式转换为多平台兼容格式。

**Hermes Skill 格式要求**：
```yaml
---
name: skill-name
description: 简短描述
tags: [tag1, tag2]
---
```

**Claude Code / OpenCode Skill 格式**：
```yaml
---
name: skill-name
description: 简短描述
metadata:
  version: "1.0"
---
```

**转换规则**：
1. 复制 YAML frontmatter
2. 添加 `metadata.version` 字段（如不存在，默认 "1.0"）
3. 保留原 tags（Claude Code 不使用但可保留）
4. 保持 SKILL.md 内容不变

### 第四步：更新 skills 项目目录

**目标目录**：`/Users/twzhan/Documents/dev/skills`

**检查目标项目是否存在**：
```bash
ls -la ~/Documents/dev/skills/ 2>/dev/null || echo "PROJECT_NOT_EXISTS"
```

**如果项目不存在**，初始化 git 项目：
```bash
mkdir -p ~/Documents/dev/skills
cd ~/Documents/dev/skills
git init
git remote add origin https://github.com/twmissingu/skills.git
# 注意：需要用户确认 GitHub 仓库地址
```

**检查重名 skill**：
```bash
# 如果 skill 目录已存在，需要更新
if [ -d ~/Documents/dev/skills/<skill-name>/ ]; then
  echo "SKILL_EXISTS"
  # 更新而非创建
fi
```

**创建/更新 skill 目录**：
```bash
# 创建 skill 目录
mkdir -p ~/Documents/dev/skills/<skill-name>

# 复制 SKILL.md（核心文件）
cp ~/.hermes/skills/<skill-name>/SKILL.md ~/Documents/dev/skills/<skill-name>/SKILL.md

# 复制 README.md（如存在）
if [ -f ~/.hermes/skills/<skill-name>/README.md ]; then
  cp ~/.hermes/skills/<skill-name>/README.md ~/Documents/dev/skills/<skill-name>/README.md
fi

# 复制子目录（如 scripts/, docs/, references/）
for dir in scripts docs references templates assets; do
  if [ -d ~/.hermes/skills/<skill-name>/$dir ]; then
    mkdir -p ~/Documents/dev/skills/<skill-name>/$dir
    cp -r ~/.hermes/skills/<skill-name>/$dir/* ~/Documents/dev/skills/<skill-name>/$dir/
  fi
done
```

### 第五步：生成/更新项目 README

**如果 skill 是新增的**，更新项目 README.md：

```bash
cd ~/Documents/dev/skills
```

读取现有 README.md，追加新 skill 信息。

**更新 README.md**：
```markdown
## 📚 Skills

| Skill | 描述 |
|-------|------|
| [blast-off-my-project](./blast-off-my-project/) | 项目发布前的最后一步 |
| [新增-skill-name](./新增-skill-name/) | 简短描述 |
```

### 第六步：Git 操作

```bash
cd ~/Documents/dev/skills

# 添加所有变更
git add -A

# 检查变更状态
git status

# 提交
git commit -m "feat: add/update <skill-name> skill

- Convert to multi-platform format (Hermes/Claude Code/OpenCode)
- Add skill description and metadata"

# 推送
git push origin main
```

**注意**：如果是首次推送，可能需要：
```bash
# 创建 main 分支
git checkout -b main
git push -u origin main
```

### 第七步：验证

确认 skill 已正确发布：

1. **本地验证**：
   ```bash
   # 检查文件存在
   ls -la ~/Documents/dev/skills/<skill-name>/
   
   # 检查内容正确
   cat ~/Documents/dev/skills/<skill-name>/SKILL.md | head -20
   ```

2. **GitHub 验证**（可选）：
   - 访问 GitHub 仓库确认文件已推送

---

## 输出总结

完成后输出以下信息：

```markdown
## ✅ Skill 发布成功

### 📦 已发布 Skill

- **名称**: `<skill-name>`
- **位置**: `~/Documents/dev/skills/<skill-name>/`
- **GitHub**: https://github.com/twmissingu/skills

### 📋 包含文件

- `SKILL.md` - Skill 核心文件
- `README.md` - 展示页面（如果存在）
- `scripts/` - 脚本目录（如果存在）
- 其他资源目录

### 🚀 他人安装方式

```bash
# 克隆仓库
git clone https://github.com/twmissingu/skills.git ~/Documents/dev/skills

# 链接到 Claude Code
ln -s ~/Documents/dev/skills/<skill-name> ~/.claude/skills/<skill-name>

# 链接到 OpenCode
ln -s ~/Documents/dev/skills/<skill-name> ~/.opencode/skills/<skill-name>

# 链接到 Hermes
ln -s ~/Documents/dev/skills/<skill-name> ~/.hermes/skills/<skill-name>
```
```

---

## 注意事项

1. **GitHub 仓库**：需要用户确认 GitHub 仓库地址，默认使用 `https://github.com/twmissingu/skills`
2. **首次使用**：如果 ~/Documents/dev/skills 不是 git 项目，需要初始化
3. **重名处理**：如果 skill 已存在，默认更新而非报错
4. **文件权限**：复制脚本时保持可执行权限
