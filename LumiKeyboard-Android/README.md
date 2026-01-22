# Lumi Keyboard Android - 部署指南

## 📱 项目简介

Lumi 智能键盘 Android 原生版本。支持:
- QWERTY 键盘布局
- Agent Mode (长按空格激活)
- Gemini AI 写作助手
- 中英文切换

---

## 🚀 快速开始

### 1. 环境要求

```bash
# 需要安装
- Android Studio Hedgehog (2023.1.1) 或更高版本
- JDK 17
- Android SDK 34
```

### 2. 打开项目

```bash
# 用 Android Studio 打开
cd /Users/apple/Lumi\ Agent\ Simulator/LumiKeyboard-Android
# File → Open → 选择此目录
```

### 3. 连接三星设备

**在三星手机上:**
1. 设置 → 关于手机 → 连续点击"软件版本" 7 次
2. 返回设置 → 开发者选项 → 开启 "USB 调试"
3. 用 USB 连接电脑，在手机上授权调试

**验证连接:**
```bash
adb devices
# 应显示你的设备
```

### 4. 构建并安装

在 Android Studio 中:
1. 选择你的三星设备
2. 点击 ▶️ Run 按钮
3. 等待安装完成

或使用命令行:
```bash
./gradlew installDebug
```

---

## ⚙️ 启用键盘

安装后需要手动启用:

1. **打开 Lumi 设置 App**（首次安装会自动打开）

2. **启用键盘**
   - 点击 "启用 Lumi 键盘"
   - 在输入法列表中打开 "Lumi 智能键盘" 开关
   - 点击 "确定" 确认安全警告

3. **选择键盘**
   - 点击 "选择 Lumi 作为输入法"
   - 在弹出列表中选择 "Lumi 智能键盘"

4. **配置 API Key**（可选）
   - 输入 Gemini API Key 启用 AI 功能
   - 没有 API Key 也可使用离线模板

---

## 🎮 使用方法

### 普通输入模式
- 正常打字即可

### Agent Mode (AI 助手)
1. **长按空格键** 1 秒进入
2. 键盘变成紫色，显示 "Lumi >"
3. 输入你的需求，如 "帮我写一封感谢信"
4. 点击 Go 提交
5. 从生成的草稿中选择一个
6. **长按空格退出** Agent Mode

### 快捷功能
- `⇧` - 切换大小写
- `123` - 切换数字/符号键盘
- `EN/ZH` - 切换语言

---

## 📁 项目结构

```
LumiKeyboard-Android/
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/lumi/keyboard/
│       │   ├── LumiIME.kt          # 主 IME 服务
│       │   ├── LumiKeyboardView.kt # 键盘视图
│       │   ├── LumiAgent.kt        # AI 处理
│       │   └── SettingsActivity.kt # 设置页面
│       └── res/
│           ├── values/
│           │   ├── strings.xml
│           │   ├── colors.xml
│           │   └── themes.xml
│           └── xml/
│               └── method.xml      # IME 配置
├── build.gradle.kts
└── settings.gradle.kts
```

---

## 🔧 常见问题

### Q: 键盘不显示?
检查是否已在设置中启用并选择 Lumi 键盘。

### Q: AI 功能不工作?
确保已配置正确的 Gemini API Key，并且设备已联网。

### Q: 如何卸载?
设置 → 应用 → Lumi Keyboard → 卸载

---

## 📝 版本

- **v1.0.0** - 初始版本
  - QWERTY 键盘
  - Agent Mode
  - Gemini AI 集成
  - 离线 fallback
