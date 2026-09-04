# WebSocket 403 排查

- [DONE] 核对 server/index.mjs:135：路径不是 /ws、Origin 不等于 APP_ORIGIN 或连接数达到 500 都返回 403；缺失会话返回 401。用户请求 Origin 是 http://typeflow.huangyut1ng.com，尚未提供服务器 APP_ORIGIN，不能确定线上根因。
- [DONE] 核对 web/app/page.tsx:454：HTTPS 页面自动使用 wss；scripts/nginx.conf 已包含 HTTP/1.1、Upgrade 和 Connection 转发，需放在实际处理域名的 server 中。
- [DONE] 验证现有 cross-origin websocket requests are denied 测试通过（2026-09-04）；首次沙箱运行报告失败且未退出，允许本地端口权限后定向测试通过。
- [DONE] 整理部署检查建议：公开 HTTPS 来源与 APP_ORIGIN 一致、更新环境后重建容器、检查 Nginx Upgrade 和可能存在的 EdgeOne WebSocket 开关及拦截日志。未修改业务代码或线上配置；精确定位仍需要实际 Nginx 配置、容器 APP_ORIGIN 和相关日志。
