# 同频 Tongpin

香港成年人交友网站与手机客户端工程。网页版采用 Vinext、Cloudflare D1 和 R2，人物为虚构演示资料，聊天由团队代回复。

## 目录

- 根目录：网页版、服务端 API、数据库迁移和测试。
- `public/`：页面、人物插画、地图、聊天、iPhone 主屏幕入口和安卓下载页。
- `server/`：Token 验证、角色与代理隔离、会话、消息、图片权限及测试数据。
- `android/`：Android 客户端工程；通过 Custom Tabs 打开现有网站。
- `ios/`：iPhone Xcode 工程；通过 SFSafariViewController 打开现有网站，尚未完成编译和签名。

## 已实现

- 16 位 Token 登录，用户、代理商与超级管理员界面。
- 代理发布、编辑、草稿和下架人物；用户只看到所属代理已发布的资料。
- 超级管理员新增、改名、停用代理与重置 Token。
- 地图与近似直线距离；自愿一次定位并粗化，人物点位为示范地区中心。
- 服务端文字、图片聊天，已发送／送达／已读、未读、搜索、引用回复、两分钟内撤回和失败重试。
- 草稿、置顶、免打扰、封存、封锁；页面打开时每 4 秒同步。
- 同一浏览器多标签页登录状态同步及 Token 粘贴格式清理。
- 管理员可建立 allen 用户、leo 代理及三位成年虚构人物的测试数据。

## 首次运行网页版

需要 Node.js 22.13 或以上。使用 npm 时：

```sh
npm ci
npm run tokens:init
npm test
npm run build
```

`tokens:init` 为本地副本生成一组全新的管理员和代理入口，不会使用线上生产凭证。原文保存在 `.private/admin-token.txt` 与 `.private/entry-tokens.json`，服务端摘要保存在 `server/token-registry.local.js`；三者均不提交 Git。已初始化时不会覆盖或轮换凭证。

应用需要 D1 数据库与 R2 图片存储，绑定名分别为 `DB`、`BUCKET`。构建后，向本地预览数据库应用迁移一次：

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_misty_maria_hill.sql
npm run dev -- --port 4173 --hostname 127.0.0.1
```

本地开发可先打开 `/signin-with-chatgpt?return_to=/` 使用开发环境的模拟网站身份，再输入本地生成的 Token。不要将模拟身份配置用于生产环境。

## 部署与身份边界

当前源代码依赖 Sites 网关注入的可信 `oai-authenticated-user-id`。部署到其他平台时，需要先提供等效的身份验证边界，不能信任公网客户端自行设置该请求头。

`.openai/hosting.json` 保留 D1/R2 绑定声明，不包含原网站的项目 ID。创建自己的部署后再配置对应项目 ID。迁移文件不可重复应用到已经初始化的数据库。

仓库不含线上数据库记录、现有登录 Token、生产 Token 摘要、SSH 私钥、Android 签名密钥或 Apple 签名材料。原线上站点和凭证不会因本仓库初始化而改变。

## 手机工程

Android 需要 JDK 17、SDK 36 和 Build Tools 35.0.0；在 `android/` 执行 `python build_android.py`。首次构建产生的新签名密钥与线上已有 APK 的签名不同；维护已有安装包更新时，应使用原电脑保存的签名材料。

iPhone 工程在 `ios/Tongpin.xcodeproj`。模拟器、真机及分发步骤见 `ios/README.txt`。当前没有可安装的 IPA 或 TestFlight 发布。

## 当前范围

人物仍是虚构测试数据。心动与部分个人偏好保存在浏览器，消息和代理资料保存在服务端。尚未提供后台消息推送、语音／视频通话、真人审核或身份／年龄核验。

Leaflet 授权保留在 `public/vendor/LEAFLET-LICENSE`；Sites 构建插件的授权保留在 `build/sites-vite-plugin.LICENSE`。
