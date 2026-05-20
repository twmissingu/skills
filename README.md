# My Skills

> 自定义 Hermes Agent Skills 集合

## 📚 Skills

| Skill | 描述 |
|-------|------|
| [blast-off-my-project](./blast-off-my-project/) | 项目发布前的最后一步 |
| [blast-off-my-skill](./blast-off-my-skill/) | 将本地 skill 发布到 GitHub |
| [complex-task-prompt](./complex-task-prompt/) | 复杂任务提示词框架 — 7模块结构化分析后生成优化prompt |

## 🚀 安装

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/skills.git ~/Documents/dev/skills

# 安装单个 skill
cp -r <skill-name> ~/.hermes/skills/

# 或创建软链接（推荐，方便更新）
ln -s "$(pwd)/<skill-name>" ~/.hermes/skills/<skill-name>
```

## 📝 创建新 Skill

1. 创建目录结构：
   ```
   skills/
   └── your-skill-name/
       └── SKILL.md
   ```

2. SKILL.md 格式：
   ```yaml
   ---
   name: your-skill-name
   description: 简短描述，触发条件
   tags: [tag1, tag2]
   compatibility: [git, terminal, file]
   ---
   
   # 标题
   
   ## 何时使用
   ## 执行步骤
   ## 示例
   ```

3. 提交并推送到 GitHub

## 📄 许可证

MIT
