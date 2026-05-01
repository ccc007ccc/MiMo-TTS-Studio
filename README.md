# MiMo TTS Studio

基于小米 MiMo V2.5 TTS API 的一站式语音合成工具，纯前端静态网页。

## 功能

- **语音合成** — 11 种预置音色，风格标签 `<style>` 自动叠加，导演剧本结构化输入
- **声音设计** — 自然语言描述生成全新音色（mimo-v2.5-tts-voicedesign）
- **声音克隆** — 上传音频或录音克隆音色，可命名持久化保存（IndexedDB）
- **批量合成** — 多行文本，可调并发（1-5），失败重试，ZIP 打包下载（UTF-8 文件名）
- **历史记录** — IndexedDB 持久化，最多 100 条，刷新页面不丢失
- **国际化** — 中英文切换，按浏览器语言自动选择
- **音频播放** — 波形可视化、进度跳转、下载

## 技术栈

- Vue 3 + TypeScript + Vite + Pinia + Tailwind CSS v4
- vue-i18n（中英文）
- vitest + @vue/test-utils + fake-indexeddb（46 单元测试 + 4 集成测试）
- 零额外运行时依赖：IndexedDB / ZIP / 录音 全部纯原生实现

## 快速开始

```bash
npm install
npm run dev
```

启动后在设置中配置 API Key 即可使用。

## API Key

前往 [MiMo 平台](https://platform.xiaomimimo.com) 获取 API Key。

API 协议要点（MiMo V2.5）：
- 风格标签格式：`<style>开心,东北话</style>正文`
- 音频标签格式：`(吸气)正文 (叹气)`
- 模型：`mimo-v2.5-tts` / `mimo-v2.5-tts-voicedesign` / `mimo-v2.5-tts-voiceclone`

## 测试

```bash
npm test                  # 单元测试
npm run test:watch        # 监听模式
npm run test:ui           # Web UI

# 集成测试（调用真实 endpoint）
VITE_TEST_BASE_URL=https://your-endpoint/v1 \
VITE_TEST_API_KEY=sk-xxx \
npm run test:integration
```

## 构建

```bash
npm run build             # 输出到 dist/，可部署到任何静态托管
npm run preview
```

## 许可证

[MIT](LICENSE)
