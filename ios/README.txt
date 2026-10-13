同频 iPhone 客户端工程

当前交付的是 Xcode 工程源码，不是可安装 IPA。当前 Windows 环境没有 Xcode，尚未完成 Swift 编译、iOS 模拟器运行、真机测试或签名。

实现范围
- 原生 iOS App 入口、桌面图标、启动配置、安全区域与大字体适配。
- 第一次启动自动打开同频服务，关闭页面后提供再次进入按钮。
- 使用系统 SFSafariViewController 打开现有网站，发现、地图、距离、用户聊天、代理工作台和超级管理界面仍复用网页。
- 网络不可用时提供提示，网络恢复后可以重试。
- 支持 tongpin://invite/ 后接 16 位邀请 Token；只允许跳到当前同频站点。
- 源码没有内置代理 Token、超级管理员 Token、网站绕过凭证或签名私钥。
- 当前网站仍仅供所有者账号访问，App 首次登录需要你的网站账号及入口 Token。
- 未实现独立的原生聊天/地图界面、推送或离线消息；没有接入 ASWebAuthenticationSession 身份桥。

打包条件
需要安装 Xcode 的 Mac。用模拟器检查工程不需要付费开发者账号。
连接自己的 iPhone 测试，可以在 Xcode 使用个人 Apple 账号选择 Personal Team 签名。
要通过 TestFlight 分发，需要 Apple Developer Program 账号、签名以及 App Store Connect 配置。
签名和审核未完成，不能承诺 App Store / TestFlight 已可安装。

在 Mac 上运行
1. 解压工程，在 Xcode 打开 Tongpin.xcodeproj。
2. 选择 Tongpin scheme 和一个 iPhone Simulator，运行。
   用 Product → Test 或 Command+U 执行邀请链接的验证用例；这些用例尚未在当前 Windows 环境运行。
3. 真机测试：Signing & Capabilities 中选择自己的 Team，并选择连接的 iPhone。
4. 如 Bundle Identifier 重复，改成你自己账号下的唯一标识；不要把任何 Token 作为标识写入项目。
5. 登录现有网站，依次验证用户、代理、管理员入口。

命令行
bash scripts/build-mac.sh simulator
TONGPIN_TEAM_ID=你的TeamID bash scripts/build-mac.sh archive

真机验收清单
- 首次启动、登录网站、输入 Token、退出重开、恢复登录。
- 邮箱登录及你使用的第三方登录方式。尚未验证 SFSafariViewController 中所有身份提供方的登录流程。
- 用户与代理双端收发文字和图片，未读、已读、失败重试、撤回与草稿。
- 原生文件选择器选图片，浏览器定位授权，地图显示与大致距离。
- 键盘遮挡、底部安全区域、后台回来重新同步、弱网与断网重试。
- 不同代理之间的数据隔离、停用代理和 Token 重置后的失效行为。

Apple 参考
https://developer.apple.com/documentation/safariservices/sfsafariviewcontroller
https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices
https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases
