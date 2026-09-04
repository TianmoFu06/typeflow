# 部署镜像占位符修复

- [DONE] .env.example 的 IMAGE 改为空值，复用 Compose 必填检查；deploy.sh 对实际解析出的旧占位符在 pull 前报错；README 说明从成功发布摘要复制镜像引用。
- [DONE] 确认 Release 33871758339 成功发布提交 39df705，摘要为 sha256:f7a57375c3799d1bf9fe394730fb4772f7db514add1a76c47b32b47dc0289ba7。
- [DONE] 新增部署脚本回归测试，验证占位符不会触发 pull/up、配置错误退出码原样传播、合法摘要允许部署；测试、bash -n 和 git diff --check 均通过（2026-09-04）。
- [DONE] 修复提交 8e64b7d 已推送 main；CI 33872891229 已启动。提供已发布镜像摘要供用户更新实际服务器 .env，本地无法代改服务器配置（2026-09-04）。
