# Typeflow

专注而轻盈的打字练习空间：深墨绿界面、荧光青点缀、实时速度与双人竞速。

## 功能

- 42 篇可选预设：31 篇中文（19 篇联网核实的公版全文／整章，另有用户原文和原创随笔）、6 篇英文、5 篇代码。
- 可搜索文章菜单与不重复的“换一篇”，默认《岳阳楼记》；页面仅显示篇名与长度，来源保留在文档。
- 英文、中文、代码练习，不限时的全文模式，以及 15 / 30 / 60 / 120 秒限时；输完所选全文也会提前结算，历史记录文章标题与实际用时。
- 所有模式显示 CPM（每分钟正确字符数）、正确率与计时。
- 实际错字红色显示、550ms 按行缓动、退格修正、输入法支持、禁用粘贴、按键音、Esc 重开。
- 最近 50 次本机成绩和最佳速度；不上传个人练习记录。
- 真实双人英文匹配，3 秒准备、60 秒竞赛；服务端随机选择同一篇文章并扩展到足够长度，统一计时和计分。
- 匹配状态、实时双方进度、胜负、断线取消、心跳、输入验证、同源检查及限速。
- 响应式布局、键盘操作、屏幕阅读器文字和减少动画偏好。

## 技术选择

React 19 + TypeScript + Vinext/Vite 静态导出，复用 Shadcn Tabs；Node.js 原生 HTTP + `ws` 提供静态资源和比赛服务。单个容器即可运行，不需要数据库、Redis 或第三方账号。

框架配置参考 [Vinext](https://github.com/cloudflare/vinext) 与 [Vite](https://vite.dev/guide/)，竞赛接口使用 [ws 官方文档](https://github.com/websockets/ws)。保留脚手架依赖和锁文件以保证可复现安装；运行时镜像仅包含 `ws`、服务端与静态资源。

## 本地开发

需要 Node.js 22.13+，建议与 CI 一致使用 Node.js 22。

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm ci --prefix web --no-audit --no-fund
APP_ORIGIN=http://127.0.0.1:5173 npm start
# 在另一终端执行
npm --prefix web run dev
```

打开 http://127.0.0.1:5173。前端代理 `/ws`、`/api` 到 3000；后端的 `APP_ORIGIN` 必须与实际浏览器来源一致。两个不同浏览器（或独立浏览器配置）点击“实时竞速 → 开始匹配”即可对赛。单个玩家会等待真实对手，不生成机器人或伪造在线数据。

```sh
npm test          # 统计和真实 WebSocket 集成测试
npm run check    # TypeScript
npm run build    # 生成 web/dist/client
APP_ORIGIN=http://localhost:3000 NODE_ENV=production npm start
```

## 镜像发布：配置 GitHub Secrets

仓库 **Settings → Secrets and variables → Actions → Secrets** 添加：

| Secret | 用途 |
| --- | --- |
| `REGISTRY_USERNAME` | `registry.huangyut1ng.com` 的推送账号 |
| `REGISTRY_PASSWORD` | 对应密码或机器人令牌 |

确保账号有 `typeflow` 镜像路径的推送权限，registry 提供有效 HTTPS 证书且 GitHub 托管 runner 可以访问。

CI 对 PR 和 main 提交执行 YAML 语法／格式检查、测试、类型检查、构建、ShellCheck、Compose 校验、Docker 构建和容器健康／首页检查。只有本仓库 main 的 push CI 成功才会自动触发 Release；PR 不发布。

Release 构建 `linux/amd64` 和 `linux/arm64` 镜像，上传 SBOM 与来源证明，以完整提交 SHA 打标签：

```text
registry.huangyut1ng.com/typeflow:sha-<完整提交 SHA>
```

发布结果中的 digest 为部署提供不可变引用；不使用易漂移的 latest 标签。Secrets 配置完成后，在 **Actions → Release → Run workflow → main** 手动运行，手动发布同样重新校验源码。缺少 Secrets 会明确失败，不降级为其他 registry。

## Docker 部署

服务器需安装 Docker Engine 和 Compose v2.20+，预先登录 registry。

```sh
docker login registry.huangyut1ng.com
cp .env.example .env
# 编辑 .env：设置 IMAGE 为发布输出的 digest，APP_ORIGIN 为实际域名
bash scripts/deploy.sh
```

`.env.example` 中的 `IMAGE` 故意留空。在 **Actions → Release → 成功的运行 → Summary** 复制 `Published image` 的完整值，填入服务器 `.env` 的 `IMAGE=` 后面。不要使用 `REPLACE_WITH_FULL_COMMIT_SHA`，也不要直接取尚未发布的最新 Git 提交。旧配置含有该占位符时，部署脚本会在拉取镜像前明确报错。

容器默认只绑定 `127.0.0.1:3000`，配合现有 HTTPS 反向代理；示例见 `scripts/nginx.conf`。本地试用可设 `APP_ORIGIN=http://localhost:3000`。公网部署必须使用实际 HTTPS 来源并转发 WebSocket Upgrade。来源不匹配会拒绝比赛连接。

部署脚本先验证配置、成功拉取镜像，再更新容器并等待健康检查（最长 90 秒）。失败直接退出并保留现场；不自动回滚、重启或绕过故障。部署切换会中止正在进行的内存比赛，请尽量选择低峰期。

本地构建：

```sh
docker build -t typeflow:local .
docker run --rm -p 3000:3000 -e APP_ORIGIN=http://localhost:3000 typeflow:local
```

手动多架构推送可使用 `scripts/publish.sh`，要求工作区已提交，并通过环境注入 `REGISTRY_USERNAME`、`REGISTRY_PASSWORD`；不要提交密码文件。

## 可选：服务器自动部署

默认仅自动发布镜像，不会猜测服务器。需要 CD 时配置以下仓库 **Variables**：

| Variable | 值 |
| --- | --- |
| `DEPLOY_ENABLED` | `true` |
| `APP_ORIGIN` | 例如 `https://typing.example.com`，不带末尾斜线 |

再添加以下 **Secrets**：

| Secret | 内容 |
| --- | --- |
| `DEPLOY_HOST` | SSH 主机名或 IPv4，默认端口 22 |
| `DEPLOY_USER` | 专用部署用户，可执行 Docker |
| `DEPLOY_SSH_KEY` | 该用户的 SSH 私钥 |
| `DEPLOY_KNOWN_HOSTS` | 事先通过可信渠道核实的主机公钥记录 |

配置 `production` GitHub Environment，可按需添加审批规则。工作流将 Compose、脚本和当前镜像 digest 部署到服务器 `~/typeflow`，等待容器健康后检查公网 `/api/health`。该目录由工作流管理，`.env` 会更新；需要自定义部署目录或 SSH 端口时显式修改工作流。部署前须配置 HTTPS 代理、DNS、Docker 和目录权限；不自动安装系统组件。

## 计分与边界

- CPM = 当前正确字符数 ÷ 已用分钟，中文、英文、代码和竞赛统一；空格和标点也计为字符。
- 正确率 = 当前正确字符数 ÷ 当前已输入字符数；未输入文字不参与，退格修正后重新计算，尚未输入时显示 100%。旧历史记录保留当时的正确率；其 CPM 直接使用已保存的字符速度。
- 胜负按同一服务端计时窗口内的正确字符数判断，相同为平局。
- 竞赛采用英文逐字输入，禁止批量粘贴；这是休闲匹配，并非防机器人竞技系统，不声称可以阻止自动化作弊。
- **单进程单副本**，500 个连接上限。房间和队列在内存，重启不保留比赛；扩展多副本前需共享比赛协调器。
- 无登录：首次访问 `/api/session`，服务端生成私有随机浏览器令牌，以 HttpOnly、SameSite=Strict Cookie 保存一年；HTTPS 部署附加 Secure。服务端从令牌派生稳定 UUID，仅公开 UUID，不公开令牌；刷新及服务重启保持身份，清除 Cookie 后重新分配。
- WS 握手使用该 Cookie，同一浏览器只允许一条对战连接，避免自己匹配自己。连接保持期间，`join` 进入队列，`leave` 取消；只有主动排队的两人配对，比赛结束后可复用连接再次匹配。断线明确提示，手动重试。
- 无账号、全球排行榜或跨设备历史；浏览器令牌只是匿名设备身份，不用于有价值资产的账户认证。
- 浏览器本机记录仅保留最近 50 次，删除浏览器数据会清空；存储读写错误会在页面明确提示。

## 运维

```sh
docker compose ps
docker compose logs --tail 100 typeflow
curl --fail http://127.0.0.1:3000/api/health
```

健康端点检查服务进程能否响应；CI 额外检查首页，比赛协议由集成测试验证。镜像无 root 权限，Compose 使用只读根文件系统、能力收敛、资源限制和日志轮转。敏感凭据只在 Secrets 或服务器凭据存储，不进入镜像。Actions 固定到提交哈希，并通过 Dependabot 定期维护。

## 全文与出处

见 [文章来源与版本说明](docs/article-sources.md)。19 篇公版全文／完整章节合计 24,564 个练习字符，包含《孔乙己》《小杂感》《劝学篇》《滕王阁序》以及范进、王朗名场面所在整回。保留正文与章末诗，去掉网页导航和校勘注释。长文采用稳定排版与按行缓动滚动，全文内容不截断；选择“全文”后不会在两分钟自动结束。

用户提供的《康神开播了》《优势在我》《下课》按根目录原文接入，仅去掉排版空白，不改写措辞。
