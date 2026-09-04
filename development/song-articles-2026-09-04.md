# 用户提供歌曲接入

- [DONE] 从 src/cn、src/en 接入全部 19 篇歌曲（17 中文、2 英文），沿用 passages 数据结构与现有选择器，共 61 篇；歌名和歌手分离，换行合并为空格，保留词间空格和重复段落。移除游京宣传行、清理 Hey Jude 重复单引号，保留本地源文件不变（2026-09-04）。
- [DONE] 康神开播了“明天在玩”修正为“明天再玩”；新增明确断言。旧 3 篇 TXT 原文从 Git HEAD 读取并生成勘误后的指纹，新增 19 篇也生成指纹，保存在 tests/fixtures/user-articles.json；更新测试解除对已删除原 TXT 和被忽略 src 的依赖，没有恢复或修改用户文件（2026-09-04）。
- [DONE] README 和 docs/article-sources.md 更新数量、素材路径与清理规则；未修改用户的 .gitignore（2026-09-04）。
- [DONE] npm test 全部 19 项通过，包含全部用户原文指纹、公版原文校验、进步曲线及 WebSocket 集成；npm run check、npm run build、git diff --check 通过。构建仍有已有的 500 kB chunk 提示，未进行额外浏览器测试；改动尚未发布（2026-09-04）。
