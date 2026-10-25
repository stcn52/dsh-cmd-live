# dsh-cmd-live

DSH 的命令监视器：宿主每跑一条 shell 命令，右侧边栏「命令」面板就会立刻出现一行，并**实时**跟着它的 stdout/stderr、耗时和退出状态——不用去对话里逐条翻工具调用。

它不做任何执行，只观察。面板里没有输入框，HTTP 接口全是只读的 GET，所以它不会变成第二条能跑命令的通道。

![命令面板](docs/screenshot.png)

## 它看到的是哪些命令

所有经过 `ctx.shell` 的命令：

- 模型调用的 `bash` 工具（前台、`run_in_background` 的后台任务都算）；
- 子代理、workflow 里的命令；
- hooks 桥接器执行的命令；
- 任何插件通过 `ctx.shell.execute()` 发起的命令。

不经过 shell 的能力不会出现在这里：`browser_*`、文件读写、`test_live_run`（它自己 spawn 子进程）等。终端面板里的交互式 PTY 也算另一套通道。

## 安装

```sh
dsh plugin --profile web add github:stcn52/dsh-cmd-live
```

装完刷新页面，右侧边栏会多一个「命令」页签（也可以从右侧栏的引导页打开）。

## 面板里有什么

- **运行中 / 共 N 条**：标题栏实时计数；
- **筛选**：全部 / 运行中 / 失败；
- **自动展开**：新命令一开始就把输出展开（可关，偏好存在 localStorage）；
- 每条命令：命令文本、工作目录、限时、已耗时（运行中每 0.5s 跳一次）、退出码 / 超时 / 取消、输出行数；
- 点一行展开输出尾部，stderr 用红色区分，用户往上滚后不再强制拉回底部；
- 「在新标签页打开完整输出」直接看 `/cmd-live/text?id=…` 纯文本。

## 配置

在 profile 的 `cordis.patch.yml` 里按 id 覆盖：

```yaml
- id: cmd-live
  config:
    maxCommands: 60      # 保留多少条已结束命令（运行中的不会被挤掉）
    maxLines: 400        # 每条命令保留多少行输出
    maxBytes: 262144     # 每条命令保留多少字节输出
    pollIntervalMs: 350  # 宿主轮询执行句柄的间隔
```

## HTTP 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/cmd-live/commands` | 当前保留的命令列表，运行中在前 |
| GET | `/cmd-live/output?id=&since=` | 某条命令从 `since` 序号开始的输出行 |
| GET | `/cmd-live/text?id=` | 某条命令的纯文本输出（stderr 行带 `[stderr]` 前缀） |
| GET | `/cmd-live/stream` | SSE：先 `event: init` 快照，再推 `start` / `output` / `end` |

SSE 事件格式：

```text
event: init
data: {"commands":[…],"serverTime":1780000000000}

event: output
data: {"id":"cmd_1_ab12","lines":[{"seq":0,"kind":"out","text":"hello"}]}
```

输出被截断时，服务端会发 `{"reset":true,"lines":[…],"floorSeq":N}`，客户端整段替换而不是追加。

## 实现方式

- 插件用 `ctx.inject(['shell'], …)` 拿到执行器，在**原始实例**（`Symbol.for('cordis.original')`，绕过 cordis 的 traceable 代理）上包一层 `execute`；
- 原样调用原方法，把返回的执行句柄交给注册表；
- 注册表按 `pollIntervalMs` 轮询 `execution.observed.stdout/stderr` 的偏移读取器（非消费式，不会抢走工具自己的输出游标）；
- 进程关闭时 `result()` 给出 `timedOut` / `aborted` 分类，据此标记状态；
- 卸载插件时恢复原方法并清空记录。

## 已知限制

- **只在内存里**：宿主重启即清空，不落盘。
- **stdout / stderr 分开读**：同一毫秒内两个流的先后顺序无法还原，面板里先列 stdout 再列 stderr。
- **只保留尾部**：超过 `maxLines` / `maxBytes` 的旧行会被丢掉，面板会标记「截断」。
- **文本不是终端**：没有 ANSI 颜色；`bash-local` 默认带 `NO_COLOR=1 TERM=dumb`，所以绝大多数命令本来就是纯文本。
- **多实例宿主**：监视的是当前宿主进程；不同端口上的另一个宿主不会出现在这个面板里。

## 开发

```sh
node --test tests/*.test.js
```

改完要 `commit + push`，然后 `dsh plugin --profile web remove dsh-cmd-live && dsh plugin --profile web add github:stcn52/dsh-cmd-live` 才会切到新 commit（pnpm 按 commit 拉 tarball）。

MIT License.
