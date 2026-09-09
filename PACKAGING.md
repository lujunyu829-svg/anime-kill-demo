# 桌面版与安卓版构建

封装层位于 `packaging/`，不会改变浏览器版游戏规则。Windows 与 Android 共用构建生成的 `www/` 离线资源。

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

推送 `v0.2.0` 标签后，GitHub Actions 会构建两个 EXE 与测试 APK，并将它们连同 SHA-256 校验文件发布到公开 Release。
