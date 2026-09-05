# 平台匹配与 latest 部署

- [DONE] 依据服务端收到的浏览器 UA，以及前端采集的屏幕分辨率、像素比、触摸事件、触摸点、粗指针、陀螺仪能力和 WebGL 渲染器，计算连续的移动端倾向分数；等待队列优先选择分数最接近的玩家（`server/index.mjs`、`web/app/page.tsx`，2026-09-05）。
- [DONE] 增加默认关闭的“跨平台匹配”复选框与公平性提示；只有双方都选择跨平台时才放宽设备差异限制（`web/app/page.tsx`、`web/app/globals.css`，2026-09-05）。
- [DONE] 将“下课”文章中的“法律做对”改为“法律作对”，同步用户原文 SHA-256 指纹和回归断言（`web/lib/typing.mjs`、`tests/fixtures/user-articles.json`、`tests/typing.test.mjs`，2026-09-05）。
- [DONE] Compose 固定使用 `registry.huangyut1ng.com/typeflow:latest`，部署脚本始终拉取，发布流程同时推送 `latest` 与可追溯 SHA 标签，不再要求 `.env` 人工填写 digest；原“待填写 IMAGE”事项已废止（`compose.yaml`、`scripts/deploy.sh`、`scripts/publish.sh`、`.github/workflows/release.yml`、`.env.example`、`README.md`，2026-09-05）。
- [DONE] 完整测试 22 项、TypeScript 检查、生产构建、Shell 语法、格式及 `git diff --check` 均通过；生产构建仅保留既有的 500 kB chunk 警告。本机未安装 Docker，因此 Compose 以回归测试静态验证 `latest` 配置，未运行 Docker CLI 校验（2026-09-05）。
