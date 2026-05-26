# 📊 Contribution Insight

一个支持 **GitHub / Gitee** 的代码贡献数据可视化看板。输入用户名后，即可生成贡献热力图、多维度统计图表、智能总结，并支持导出 PNG 或 PDF 报告。

![License](https://img.shields.io/badge/license-MIT-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-f7df1e?logo=javascript)
![Chart.js](https://img.shields.io/badge/Chart.js-4.4.0-ff6384?logo=chartdotjs)
![GitHub](https://img.shields.io/badge/GitHub-supported-181717?logo=github)
![Gitee](https://img.shields.io/badge/Gitee-supported-c71d23)

---

## 🤖 关于本项目

> **此项目 100% 由 AI Vibe Coding 实现。**

整个项目的代码、设计、调试和部署，均由自然语言对话驱动完成。从热力图绘制、图表集成、配色主题、导出功能，到 GitHub / Gitee 双数据源集成，全程通过与 AI 协作完成。

这不仅是代码贡献数据的可视化工具，更是 **AI 辅助编程** 能力的一次完整展示。

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 🔀 **双平台数据源** | 支持在页面中切换 GitHub 或 Gitee 数据源 |
| 📊 **贡献热力图** | 按日期展示贡献活跃度，支持横向拖拽滚动和悬浮提示 |
| 📈 **多维度图表** | 年度对比、月度趋势、周活跃雷达、季度分布、累计曲线、贡献等级 |
| 🎨 **多配色主题** | 内置 GitHub 绿、日落橙、清新绿松、热情红、深海蓝等配色 |
| 📸 **导出分享** | 一键导出 PNG 图片或 PDF 报告，适合存档或分享 |
| 🤖 **智能总结** | 基于统计数据生成个性化数据总结和鼓励寄语 |
| 🔐 **Token 支持** | GitHub / Gitee Token 独立保存，可提升 API 访问稳定性 |

---

## 🖼️ 预览截图

![](https://i.imgs.ovh/2026/05/19/ac0d74107eab2851c649ba0f61ecaa14.png)

---

## 🚀 在线访问

在线预览：[https://github-contribution-insight.vercel.app/](https://github-contribution-insight.vercel.app/)

---

## 🧭 使用方法

1. 打开页面。
2. 在数据源下拉框中选择 **GitHub** 或 **Gitee**。
3. 输入对应平台的用户名。
4. 可选：填写对应平台的 Access Token 并保存。
5. 点击 **生成完整报告**。
6. 需要分享或存档时，点击 **导出 PNG** 或 **导出 PDF**。

---

## 🔑 Token 配置（可选）

### GitHub Token

为了避免 GitHub API 限流，建议配置 Personal Access Token：

1. 访问 https://github.com/settings/tokens
2. 点击 **Generate new token (classic)**
3. **不需要勾选任何权限**（只需访问公开数据）
4. 生成并复制 token
5. 在页面选择 GitHub 数据源后，将 token 粘贴到 Token 输入框并保存

> 未配置 Token 时，GitHub API 对未认证请求有限流，可能影响完整历史数据拉取。

### Gitee Token

Gitee Token 为可选项：

1. 登录 Gitee 后进入个人设置中的私人令牌页面
2. 创建 Access Token
3. 在页面选择 Gitee 数据源后，将 token 粘贴到 Token 输入框并保存

> Gitee 数据基于公开接口拉取。Token 可提升访问稳定性，但页面仍只统计可公开访问的数据。

---

## 📌 数据口径说明

### GitHub

GitHub 使用 GraphQL API 的 `contributionsCollection.contributionCalendar` 获取贡献日历数据。它更接近 GitHub 官方贡献热力图口径，并支持按年度分段拉取完整历史数据。

### Gitee

Gitee 当前没有与 GitHub GraphQL 贡献日历完全等价的公开 API。本项目使用 Gitee 公开动态接口：

```text
https://gitee.com/api/v5/users/{username}/events/public
```

并按事件日期聚合为热力图数据。因此，Gitee 看板展示的是 **公开动态活跃度统计**，不保证与 Gitee 个人主页内部贡献日历完全一致。

---

## 📸 导出功能说明

- **PNG 导出**：将整个报告页面保存为高清图片
- **PDF 导出**：将整个报告保存为多页 PDF 文档（自动分页）

导出内容包含：用户信息卡片、KPI 指标、热力图、所有统计图表、智能总结和鼓励寄语。

---

## ❓ 常见问题

### Q: GitHub 和 Gitee 的统计为什么可能不一样？

A: 两个平台的公开 API 能力和贡献统计口径不同。GitHub 使用官方贡献日历数据；Gitee 使用公开动态事件聚合，所以 Gitee 数据更适合观察公开活跃趋势。

### Q: 为什么请求失败？

A: 可能原因：

- 未配置 Token 且请求次数过多（被限流）
- 用户名不存在或输入错误
- 当前网络无法访问 GitHub 或 Gitee API
- Gitee 用户没有可公开访问的动态数据

### Q: 数据多久更新一次？

A: 数据实时从对应平台 API 获取，每次生成报告都会重新请求最新公开数据。

### Q: 私有仓库的贡献会显示吗？

A: 通常不会。页面只统计对应平台公开 API 能访问到的数据。GitHub 私有贡献只有在用户设置为公开可见且 API 返回时才可能显示。

---

## 🙏 致谢

- [GitHub GraphQL API](https://docs.github.com/en/graphql)
- [Gitee Open API](https://gitee.com/api/v5/swagger)
- [Chart.js](https://www.chartjs.org/)
- [html2canvas](https://html2canvas.hertzen.com/)
- [jsPDF](https://github.com/parallax/jsPDF)

---

## 📞 联系与反馈

如有问题或建议，欢迎提交 [Issue](https://github.com/xiangxiang62/github-contribution-insight/issues) 或 Pull Request。

---

**如果觉得这个项目对你有帮助，欢迎给个 ⭐️ Star！**
