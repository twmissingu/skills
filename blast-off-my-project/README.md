# blast-off-my-project

> 项目发布前的最后一步——让文档发光，让项目对人类和 AI agent 都充满吸引力。

## ✨ 功能

一键完成开源项目发布前的所有准备工作：

- 🔒 安全审查 — 检查 secrets、API keys 泄露风险
- ⚖️ 法律检查 — LICENSE、依赖许可证兼容性
- 🧹 代码质量 — 测试、构建、linter 检查
- 🏷️ 版本管理 — semver、CHANGELOG、Git tag
- 📝 文档生成 — 中英文 README、CLAUDE.md
- 🚀 发布总结 — GitHub Release 信息、项目亮点

## 🚀 快速开始

将 skill 安装到 Hermes Agent：

```bash
# 复制到 Hermes skills 目录
cp -r blast-off-my-project ~/.hermes/skills/

# 或链接（推荐，方便更新）
ln -s "$(pwd)/blast-off-my-project" ~/.hermes/skills/blast-off-my-project
```

安装后，在项目目录中触发：

```
blast-off-my-project
```

## 📋 执行流程

| 步骤 | 内容 |
|------|------|
| 1 | 安全审查 — 防止 secrets 泄露 |
| 2 | 法律与许可证 — LICENSE + 依赖兼容 |
| 3 | 代码质量 — 测试 + 构建 |
| 4 | 版本与发布 — semver + CHANGELOG |
| 5 | /init + 分析项目 — 生成 CLAUDE.md |
| 6 | 生成 README — 中英文两份 |
| 7 | 文档完整性检查 |
| 8 | 最终总结反馈 |

## 📖 详细文档

查看 [SKILL.md](./SKILL.md) 获取完整的 skill 使用说明。

## 🤝 贡献

欢迎提交新的 skills！请确保：

- 每个 skill 独立一个目录
- 包含完整的 `SKILL.md`
- 提供清晰的触发条件和执行步骤

## 📄 许可证

MIT
