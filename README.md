# 校园拼车 · campus-carpool

面向澳门科技大学学生的拼车小程序网页 Demo：寻找同路伙伴、确认同行、聊天集合及车费分摊记录。

**在线体验：[校园拼车 Demo](https://campus-carpool-ten.vercel.app)**

## 产品文档

- [产品需求文档（PRD）](docs/PRD.md)：功能需求、用户旅程、角色权限、业务规则、17 条核心验收用例和正式版待办。

## 网页 Demo

网站代码位于 `web/`，包含当前中文界面和新版 Logo。人物、位置、消息与转账均为模拟，数据保存在各浏览器本地；两个用户打开同一网址不会共享同一趟行程。不读取真实位置，不调用真实支付。

底部入口为 **拼车 / 我的行程 / 同行消息 / 我的**。默认有可加入路线、集合案例和费用待办；可通过“我的 → 重新体验 Demo”恢复示例。

## 本地运行

需要 Node.js 22 或更新版本，无第三方运行依赖。

```sh
npm run build
python3 -m http.server 8765 --directory dist
```

访问 `http://127.0.0.1:8765`。页面内四个 Tab 使用客户端交互。

## Vercel 部署

仓库根目录提供 `vercel.json`，框架选择 Other，构建命令 `npm run build`，输出目录 `dist`。静态网页不需要环境变量或数据库。

Vercel 项目已连接本 GitHub 仓库，`main` 分支的新提交会自动触发部署。正式访问地址：

https://campus-carpool-ten.vercel.app

## 目录

- `web/`：网页、样式、交互模拟器和图标。
- `scripts/build.mjs`：复制静态资源到部署目录。
- `docs/PRD.md`：依据当前小程序结果反推的 PRD。
- `vercel.json`：Vercel 构建配置。

本仓库当前提供网页 Demo 和 PRD；原生微信小程序仍需独立完成 AppID、云环境和真机联调才能正式上线。
