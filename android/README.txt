同频 Android 1.0.0

这是现有同频网站的可安装安卓客户端，采用 Android Custom Tabs 浏览器组件。
网站地址：https://tongpin-hk.jovial-knoll-4654.chatgpt.site/

使用
1. Android 8.0 或以上手机下载 tongpin-1.0.0.apk 并安装。
2. 点击桌面“同频”图标，直接打开同频网站。
3. 当前网站只允许所有者的 ChatGPT 账号访问。登录网站账号后，使用原有 16 位 Token。
4. 推荐人物、地图距离、用户与代理的聊天都使用现有服务端。
5. App 需要联网及手机浏览器。定位和图片选择沿用浏览器的权限与文件选择器。
6. 从页面返回后可以点击“进入同频”再次打开。

版本范围
此版本保留浏览器顶部控件。它没有独立的原生聊天界面、离线聊天或后台消息推送。
不会把管理 Token、用户 Token 或网站身份绕过凭证写进 APK。
已完成 release 编译和 APK 签名校验。当前模拟器系统镜像缺少 system.img，尚未进行真机/模拟器安装运行测试。

构建
需要 JDK 17、Android SDK 36、Build Tools 35.0.0，Gradle wrapper 使用 8.13。
设置 JAVA_HOME 和 ANDROID_HOME 后执行 python build_android.py。
首次构建会在 .private 生成签名密钥；后续更新必须保留并使用同一密钥。
不要把 .private/signing.json 或 .private/tongpin-release.jks 上传到网站或提交到版本库。
源码 ZIP 不包含签名密钥，原始密钥保存在当前电脑的项目 .private 目录。

组件参考
https://developer.chrome.com/docs/android/custom-tabs/guide-get-started
https://developer.android.com/develop/ui/views/layout/webapps/overview-of-android-custom-tabs
