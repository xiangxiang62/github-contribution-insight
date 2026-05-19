# 📊 GitHub Contribution Insight

一个优雅的 GitHub 贡献数据可视化看板，从用户注册第一天开始，展示完整的贡献热力图和多维度统计分析。

![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-2da44e?logo=github)
![License](https://img.shields.io/badge/license-MIT-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-f7df1e?logo=javascript)
![Chart.js](https://img.shields.io/badge/Chart.js-4.4.0-ff6384?logo=chartdotjs)

---

## 🤖 关于本项目

> **此项目 100% 由 AI Vibe Coding 实现。**

整个项目的代码、设计、调试和部署，均由自然语言对话驱动完成。从热力图绘制、图表集成、配色主题、导出功能到 GitHub Pages 部署，全程无需手写一行原始代码，仅通过与 AI 协作完成。

这不仅是 GitHub 贡献数据的可视化工具，更是 **AI 辅助编程** 能力的一次完整展示。

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 📊 **完整贡献追踪** | 从注册 GitHub 到今天的所有贡献数据，自动分段请求（每段≤365天） |
| 🎨 **多配色主题** | 内置 GitHub 绿、极光蓝、日落橙、森林绿四种配色，一键切换 |
| 📈 **多维度图表** | 年度对比、月度趋势、周活跃雷达、季度分布、累计曲线、贡献等级 |
| 🖱️ **流畅交互** | 热力图支持鼠标拖拽横向滚动，无需按钮，直觉操作 |
| 📸 **导出分享** | 一键导出 PNG 图片或 PDF 报告，适合存档或分享 |
| 🤖 **智能总结** | 基于历史数据生成个性化数据总结和鼓励寄语 |
| 🔐 **Token 支持** | 支持填入 GitHub Personal Access Token，有效避免 API 限流 |

---

## 🖼️ 预览截图

![](https://i.imgs.ovh/2026/05/19/ac0d74107eab2851c649ba0f61ecaa14.png)

---

## 🚀 在线访问

项目已部署在 GitHub Pages，直接访问：[🌐 在线预览](https://github-contribution-insight.vercel.app/)

---

## 🔑 GitHub Token 配置（可选）

为了避免 GitHub API 限流，建议配置 Personal Access Token：

1. 访问 https://github.com/settings/tokens
2. 点击 **Generate new token (classic)**
3. **不需要勾选任何权限**（只需访问公开数据）
4. 生成并复制 token
5. 在页面中的 Token 输入框粘贴并保存

> ⚠️ 未配置 Token 时，GitHub API 有每小时 60 次的限制，可能影响使用体验。

---

## 📸 导出功能说明

- **PNG 导出**：将整个报告页面保存为高清图片
- **PDF 导出**：将整个报告保存为多页 PDF 文档（自动分页）

导出内容包含：用户信息卡片、KPI 指标、热力图、所有统计图表、智能总结和鼓励寄语。

---

## ❓ 常见问题

### Q: 为什么热力图只显示最近一年？
A: 默认显示的是完整时间范围（从注册到今天）。如果需要单独查看某一年，可以通过热力图下方的"上一年/下一年"按钮切换年份视图。

### Q: 为什么请求失败？
A: 可能原因：
- 未配置 Token 且请求次数过多（被限流）
- 用户名不存在或输入错误
- 网络问题（尝试刷新页面）

### Q: 数据多久更新一次？
A: 数据实时从 GitHub API 获取，每次生成报告都是最新数据。

### Q: 私有仓库的贡献会显示吗？
A: 如果用户将私有贡献设置为公开可见，则会显示；否则不会。GitHub API 默认只返回公开贡献数据。

---

## 🙏 致谢

- [GitHub GraphQL API](https://docs.github.com/en/graphql)
- [Chart.js](https://www.chartjs.org/)
- [html2canvas](https://html2canvas.hertzen.com/)
- [jsPDF](https://github.com/parallax/jsPDF)

---

## 📞 联系与反馈

如有问题或建议，欢迎提交 [Issue](https://github.com/xiangxiang62/github-contribution-insight/issues) 或 Pull Request。

---

**如果觉得这个项目对你有帮助，欢迎给个 ⭐️ Star！**
