# 桌面版与安卓版构建

封装层位于 `packaging/`，不会改变浏览器版游戏规则。Windows 与 Android 共用构建生成的 `www/` 离线资源。

封装版会识别本机未完成的 v0.2.0 存档，并用随包附带的旧版规则继续该对局；旧局结束或明确放弃后会重新载入 v0.2.1，新开的对局均使用新版规则。未知版本或损坏的存档不会自动删除，可在大厅手动放弃。普通网页版不使用此跨版本存档入口。

## 安装依赖与测试

```powershell
npm install --prefix packaging
npm test --prefix packaging
```

## Windows x64

开发运行：

```powershell
npm run desktop:dev --prefix packaging
```

生成安装版和便携版：

```powershell
npm run desktop:dist --prefix packaging
```

产物位于 `packaging/release/windows/`。演示版未进行商业代码签名，Windows 可能显示 SmartScreen 提示。

## Android APK

需要 Node.js 22+、JDK 21 和 Android SDK 36：

```powershell
npm run android:prepare --prefix packaging
cd packaging/android
./gradlew assembleDebug
```

APK 位于 `packaging/android/app/build/outputs/apk/debug/app-debug.apk`。应用锁定横屏、最低支持 Android 7/API 24，使用测试签名且不申请网络权限。

推送 `v0.2.1` 标签后，GitHub Actions 会构建两个 EXE 与测试 APK，并将它们连同 SHA-256 校验文件发布到公开 Release。
