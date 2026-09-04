# 进步曲线与 EdgeOne 缓存

- [DONE] 根据源站代码和 EdgeOne 官方默认缓存规则确认：旧首页的 no-cache 阻止边缘缓存；哈希资源已有一年缓存。静态非哈希文件改为 public, max-age=0, s-maxage=60, must-revalidate，响应默认 no-store，覆盖健康接口和错误响应；身份接口仍禁止缓存。新增 tests/cache.test.mjs 验证 GET/HEAD、带查询参数资源、Cookie 隔离及错误响应（2026-09-04）。
- [DONE] “我的进步”复用 Recharts 和现有 ChartContainer，显示按旧到新排序的最近 50 次 CPM 折线，横轴练习序号，保留历史表。单条记录显示点与提示，无记录保留空状态；容器自适应宽度，高度 260px，关闭动画并启用图表键盘访问。progressSeries 测试覆盖空、单条、50 条、速度下降与输入不变；未执行浏览器视觉测试（2026-09-04）。
- [DONE] README 补充 EdgeOne 缓存规则、同 URL 普通 GET 验证、发布后刷新首页缓存建议。沿用原有 Docker/EdgeOne 部署，没有创建其他托管站点；未提供生产域名或控制台配置，无法确认线上实际 MISS 原因（2026-09-04）。
- [DONE] npm run check、生产静态构建、git diff --check 通过；缓存集成测试通过，曲线数据测试单独通过。全量测试当时 17/18 通过，唯一失败是本次任务开始前已删除原文文件导致 ENOENT。构建有大于 500 kB 的 chunk 提示；没有新增依赖。开发预览首页返回 200；未执行浏览器交互／移动端视觉测试。构建与端口测试在获准本机端口访问后完成（2026-09-04）。
- [DONE] 定向 lint 发现新增 tooltip 的模板插值类型提示，已显式 String 转换；其余诊断位于原有 effect、ref、导航、状态标签、控件标签和 Promise 代码，未扩展修改。首次从仓库根目录调用 lint 遇到嵌套配置限制，随后改用 web 工作目录（2026-09-04）。
