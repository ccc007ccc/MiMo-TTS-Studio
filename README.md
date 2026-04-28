# MiMo TTS Studio

基于小米 MiMo V2.5 TTS API 的一站式语音合成工具。

## 功能

- **语音合成** — 9 种预置音色，支持风格标签、音频标签、自然语言控制
- **声音设计** — 用自然语言描述音色，MiMo 生成全新声音
- **声音克隆** — 上传音频或直接录音，复刻任意音色
- **批量合成** — 多行文本批量处理
- **音频播放** — 波形可视化 + 播放控制

## 技术栈

- Vue 3 + TypeScript + Vite
- Pinia 状态管理
- Tailwind CSS v4 暗色主题
- Web Audio API 波形分析

## 快速开始

```bash
npm install
npm run dev
```

启动后在设置中配置 API Key 即可使用。

## API Key

前往 [MiMo 平台](https://platform.xiaomimimo.com) 获取 API Key。

## 许可证

[MIT](LICENSE)
