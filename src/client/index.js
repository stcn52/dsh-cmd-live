window.__ModuleLoader__.load({
  id: 'dsh-cmd-live',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var React = require('react')
    var h = React.createElement

    var TAB_ID = 'dsh-cmd-live'
    var KIND = 'cmd-live'
    var STYLE_ID = 'dsh-cmd-live-style'
    var ROUTE = '/cmd-live'
    var MAX_LINES = 600
    var MAX_COMMANDS = 120

    var CSS = [
      '.dcl-root { display: flex; flex-direction: column; height: 100%; min-height: 0; color: var(--fg, #e6e9ef); font-size: 13px; }',
      '.dcl-head { display: flex; align-items: center; gap: 8px; padding: 9px 10px 7px; flex: 0 0 auto; }',
      '.dcl-title { font-weight: 600; font-size: 13px; letter-spacing: 0.02em; }',
      '.dcl-count { font-size: 11px; color: var(--fg-muted, #98a2b3); }',
      '.dcl-count b { color: #ffc46b; font-weight: 600; }',
      '.dcl-grow { flex: 1 1 auto; }',
      '.dcl-live { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--fg-muted, #98a2b3); white-space: nowrap; }',
      '.dcl-live::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--border-strong, #3a4150); }',
      '.dcl-live[data-on="true"]::before { background: #7ee0a1; box-shadow: 0 0 0 3px rgba(126, 224, 161, 0.14); }',
      '.dcl-bar { display: flex; align-items: center; gap: 6px; padding: 0 10px 8px; flex: 0 0 auto; flex-wrap: wrap; }',
      '.dcl-chip { font: inherit; font-size: 11px; color: var(--fg-muted, #98a2b3); background: transparent; border: 1px solid var(--border, #2a2f3a); border-radius: 999px; padding: 3px 10px; cursor: pointer; }',
      '.dcl-chip:hover { color: var(--fg, #e6e9ef); border-color: var(--border-strong, #3a4150); }',
      '.dcl-chip.is-on { color: var(--fg, #e6e9ef); background: var(--accent-soft, rgba(110, 168, 254, 0.16)); border-color: var(--accent, #6ea8fe); }',
      '.dcl-check { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--fg-muted, #98a2b3); cursor: pointer; white-space: nowrap; }',
      '.dcl-icon-btn { font: inherit; font-size: 11px; color: var(--fg-muted, #98a2b3); background: transparent; border: 1px solid var(--border, #2a2f3a); border-radius: 7px; padding: 3px 9px; cursor: pointer; margin-left: auto; }',
      '.dcl-icon-btn:hover { color: var(--fg, #e6e9ef); border-color: var(--border-strong, #3a4150); }',
      '.dcl-list { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 0 8px 10px; display: flex; flex-direction: column; gap: 6px; }',
      '.dcl-card { border: 1px solid var(--border, #2a2f3a); border-radius: 9px; background: var(--surface-2, #1b202a); overflow: hidden; flex: 0 0 auto; }',
      '.dcl-card[data-status="running"] { border-color: #6b553a; background: linear-gradient(180deg, rgba(255, 196, 107, 0.07), transparent 46%), var(--surface-2, #1b202a); }',
      '.dcl-card[data-status="failed"] { border-color: #6d3a3a; }',
      '.dcl-card[data-status="timeout"] { border-color: #6d3a3a; }',
      '.dcl-row { display: flex; align-items: flex-start; gap: 7px; padding: 7px 9px 5px; cursor: pointer; }',
      '.dcl-row:hover { background: rgba(255, 255, 255, 0.03); }',
      '.dcl-glyph { flex: 0 0 auto; width: 14px; text-align: center; font-size: 11px; line-height: 18px; color: var(--fg-muted, #98a2b3); }',
      '.dcl-card[data-status="running"] .dcl-glyph { color: #ffc46b; animation: dcl-pulse 1.4s ease-in-out infinite; }',
      '.dcl-card[data-status="done"] .dcl-glyph { color: #7ee0a1; }',
      '.dcl-card[data-status="failed"] .dcl-glyph, .dcl-card[data-status="timeout"] .dcl-glyph { color: #ff8a80; }',
      '@keyframes dcl-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }',
      '.dcl-main { flex: 1 1 auto; min-width: 0; display: grid; gap: 2px; }',
      '.dcl-cmd { font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace); font-size: 11.5px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }',
      '.dcl-dur { flex: 0 0 auto; font-size: 10.5px; color: var(--fg-muted, #98a2b3); font-variant-numeric: tabular-nums; line-height: 18px; white-space: nowrap; }',
      '.dcl-card[data-status="running"] .dcl-dur { color: #ffc46b; }',
      '.dcl-sub { display: flex; align-items: center; gap: 6px; padding: 0 9px 7px 30px; font-size: 10.5px; color: var(--fg-muted, #98a2b3); flex-wrap: wrap; }',
      '.dcl-sub code { font-family: var(--mono, ui-monospace, monospace); font-size: 10.5px; color: inherit; }',
      '.dcl-dot { width: 2px; height: 2px; border-radius: 50%; background: currentColor; opacity: 0.7; }',
      '.dcl-badge { padding: 0 6px; border-radius: 999px; border: 1px solid var(--border, #2a2f3a); font-size: 10px; line-height: 15px; }',
      '.dcl-out { border-top: 1px solid var(--border, #2a2f3a); background: rgba(0, 0, 0, 0.22); max-height: 260px; overflow: auto; padding: 6px 9px 8px; font-family: var(--mono, ui-monospace, monospace); font-size: 11px; line-height: 1.5; }',
      '.dcl-line { display: flex; gap: 7px; white-space: pre-wrap; overflow-wrap: anywhere; }',
      '.dcl-seq { flex: 0 0 auto; width: 2.2em; text-align: right; color: var(--border-strong, #3a4150); user-select: none; }',
      '.dcl-line[data-kind="err"] { color: #ff9d95; }',
      '.dcl-more { padding: 4px 0 0 2.4em; font-size: 10.5px; color: var(--fg-muted, #98a2b3); }',
      '.dcl-more a { color: var(--accent, #6ea8fe); text-decoration: none; cursor: pointer; }',
      '.dcl-empty { padding: 22px 16px; color: var(--fg-muted, #98a2b3); display: grid; gap: 8px; line-height: 1.65; }',
      '.dcl-empty code { font-family: var(--mono, ui-monospace, monospace); color: var(--fg, #e6e9ef); }',
      '.dcl-error { margin: 0 10px 8px; padding: 6px 9px; border: 1px solid #6d3a3a; background: #2a1c1e; color: #ff8a80; border-radius: 7px; font-size: 11.5px; }',
      '.dcl-foot { flex: 0 0 auto; display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-top: 1px solid var(--border, #2a2f3a); font-size: 10.5px; color: var(--fg-muted, #98a2b3); }',
      '.dcl-foot b { color: var(--fg, #e6e9ef); font-weight: 600; }',
    ].join('\n')

    /** Inject the tab stylesheet once. */
    function ensureStyles() {
      if (document.getElementById(STYLE_ID)) return
      var style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = CSS
      document.head.appendChild(style)
    }

    /** GET JSON, surfacing the server's error message. */
    function requestJson(url) {
      return fetch(url).then(function (response) {
        return response.json().then(function (body) {
          if (!response.ok) throw new Error(body && body.error ? body.error : 'HTTP ' + response.status)
          return body
        })
      })
    }

    /** Read one preference, falling back to a default. */
    function readPref(key, fallback) {
      try {
        var raw = window.localStorage.getItem(key)
        return raw === null ? fallback : JSON.parse(raw)
      } catch (error) {
        return fallback
      }
    }

    /** Persist one preference; a private-mode browser may refuse. */
    function writePref(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        // Preferences are a convenience; ignore the refusal.
      }
    }

    /** Status label. */
    function statusLabel(status) {
      if (status === 'running') return '运行中'
      if (status === 'done') return '完成'
      if (status === 'failed') return '失败'
      if (status === 'timeout') return '超时'
      if (status === 'canceled') return '已取消'
      return status || '未知'
    }

    /** Status glyph. */
    function statusGlyph(status) {
      if (status === 'running') return '●'
      if (status === 'done') return '✓'
      if (status === 'failed') return '✕'
      if (status === 'timeout') return '⏱'
      if (status === 'canceled') return '⊘'
      return '·'
    }

    /** Compact duration. */
    function durationText(ms) {
      if (typeof ms !== 'number' || !isFinite(ms) || ms < 0) return ''
      if (ms < 1000) return Math.round(ms) + 'ms'
      if (ms < 60000) return (ms / 1000).toFixed(1) + 's'
      var minutes = Math.floor(ms / 60000)
      var seconds = Math.round((ms - minutes * 60000) / 1000)
      return minutes + 'm' + (seconds < 10 ? '0' : '') + seconds + 's'
    }

    /** Elapsed time of a command at render time. */
    function elapsedText(command, now) {
      if (command.status === 'running') return durationText(now - command.startedAt)
      if (typeof command.durationMs === 'number') return durationText(command.durationMs)
      if (command.endedAt) return durationText(command.endedAt - command.startedAt)
      return ''
    }

    /** Shorten a working directory for a narrow panel. */
    function shortPath(path) {
      var text = String(path || '')
      text = text.replace(/^\/home\/[^/]+/, '~')
      if (text.length <= 34) return text
      var parts = text.split('/')
      var tail = parts.slice(-2).join('/')
      return '…/' + tail
    }

    /** Exit/status detail shown under the command. */
    function codeText(command) {
      if (command.status === 'running') {
        return command.timeoutMs ? '限时 ' + durationText(command.timeoutMs) : '运行中'
      }
      if (command.timedOut) return '超时'
      if (command.aborted) return '已取消'
      if (typeof command.exitCode === 'number') return 'exit ' + command.exitCode
      if (command.signal) return '被 ' + command.signal + ' 终止'
      if (command.error) return '启动失败'
      return statusLabel(command.status)
    }

    /** Merge fetched lines into the currently cached ones, keeping seq order. */
    function mergeLines(existing, incoming) {
      var seen = {}
      var merged = []
      var all = (existing || []).concat(incoming || [])
      for (var i = 0; i < all.length; i++) {
        var line = all[i]
        if (!line || typeof line.seq !== 'number') continue
        if (seen[line.seq] === true) continue
        seen[line.seq] = true
        merged.push(line)
      }
      merged.sort(function (left, right) { return left.seq - right.seq })
      if (merged.length > MAX_LINES) merged = merged.slice(merged.length - MAX_LINES)
      return merged
    }

    /** One command card. */
    function CommandCard(props) {
      var command = props.command
      var output = props.output
      var expanded = props.expanded
      var now = props.now
      var running = command.status === 'running'
      return h('div', {
        className: 'dcl-card',
        'data-status': command.status,
      },
      h('div', {
        className: 'dcl-row',
        onClick: props.onToggle,
        title: expanded ? '点击收起输出' : '点击展开输出',
      },
      h('span', { className: 'dcl-glyph' }, statusGlyph(command.status)),
      h('div', { className: 'dcl-main' },
        h('div', { className: 'dcl-cmd', title: command.command }, command.command || '(空命令)'),
        h('div', { className: 'dcl-sub' },
          h('code', { title: command.workdir }, shortPath(command.workdir) || '—'),
          h('span', { className: 'dcl-dot' }),
          h('span', null, codeText(command)),
          command.lineCount > 0 ? h('span', { className: 'dcl-dot' }) : null,
          command.lineCount > 0 ? h('span', null, command.lineCount + ' 行') : null,
          command.truncated ? h('span', { className: 'dcl-badge', title: '只保留最近的输出' }, '截断') : null,
        ),
      ),
      h('span', { className: 'dcl-dur' }, elapsedText(command, now))),
      expanded
        ? h('div', { className: 'dcl-out', ref: props.outputRef, onScroll: props.onScroll },
          output && output.lines.length > 0
            ? output.lines.map(function (line) {
              return h('div', { key: line.seq, className: 'dcl-line', 'data-kind': line.kind },
                h('span', { className: 'dcl-seq' }, String(line.seq)),
                h('span', null, line.text === '' ? '\u00a0' : line.text))
            })
            : h('div', { className: 'dcl-more' }, running ? '等待输出…' : '没有输出'),
          h('div', { className: 'dcl-more' },
            h('a', {
              onClick: function (event) {
                event.stopPropagation()
                window.open(ROUTE + '/text?id=' + encodeURIComponent(command.id), '_blank')
              },
            }, '在新标签页打开完整输出'),
          ),
        )
        : null,
      )
    }

    /** The sidebar panel. */
    function CmdLiveBody() {
      var commandsState = React.useState([])
      var commands = commandsState[0]
      var setCommands = commandsState[1]
      var outputsState = React.useState({})
      var outputs = outputsState[0]
      var setOutputs = outputsState[1]
      var expandedState = React.useState({})
      var expanded = expandedState[0]
      var setExpanded = expandedState[1]
      var filterState = React.useState(readPref('dsh-cmd-live:filter', 'all'))
      var filter = filterState[0]
      var setFilter = filterState[1]
      var autoState = React.useState(readPref('dsh-cmd-live:autoExpand', true))
      var autoExpand = autoState[0]
      var setAutoExpand = autoState[1]
      var connectedState = React.useState(false)
      var connected = connectedState[0]
      var setConnected = connectedState[1]
      var errorState = React.useState(null)
      var error = errorState[0]
      var setError = errorState[1]
      var busyState = React.useState(false)
      var busy = busyState[0]
      var setBusy = busyState[1]
      var nowState = React.useState(Date.now())
      var now = nowState[0]
      var setNow = nowState[1]

      var sourceRef = React.useRef(null)
      var expandedRef = React.useRef({})
      var autoRef = React.useRef(autoExpand)
      var outRefs = React.useRef({})
      var scrollPinRef = React.useRef({})

      React.useEffect(function () { expandedRef.current = expanded }, [expanded])
      React.useEffect(function () { autoRef.current = autoExpand }, [autoExpand])

      var hasRunning = false
      for (var i = 0; i < commands.length; i++) {
        if (commands[i].status === 'running') { hasRunning = true; break }
      }

      // Tick only while something runs: the panel is a live clock, not a
      // perpetual render loop.
      React.useEffect(function () {
        if (!hasRunning) return undefined
        var timer = setInterval(function () { setNow(Date.now()) }, 500)
        return function () { clearInterval(timer) }
      }, [hasRunning])

      /** Replace or prepend one command's metadata. */
      var upsert = React.useCallback(function (meta) {
        setCommands(function (previous) {
          var next = []
          var replaced = false
          for (var index = 0; index < previous.length; index++) {
            if (previous[index].id === meta.id) {
              next.push(meta)
              replaced = true
            } else {
              next.push(previous[index])
            }
          }
          if (!replaced) next.unshift(meta)
          if (next.length > MAX_COMMANDS) next = next.slice(0, MAX_COMMANDS)
          return next
        })
      }, [])

      /** Fetch one command's retained output and merge it into the cache. */
      var loadOutput = React.useCallback(function (id) {
        return requestJson(ROUTE + '/output?id=' + encodeURIComponent(id) + '&since=0')
          .then(function (body) {
            setOutputs(function (previous) {
              var current = previous[id]
              var next = Object.assign({}, previous)
              next[id] = {
                lines: mergeLines(current ? current.lines : [], body.lines || []),
                floorSeq: body.floorSeq,
                nextSeq: body.nextSeq,
              }
              return next
            })
          })
          .catch(function (loadError) {
            setError(loadError.message)
          })
      }, [])

      /** Expand one command (and load what it printed so far). */
      var expand = React.useCallback(function (id) {
        var next = Object.assign({}, expandedRef.current)
        next[id] = true
        expandedRef.current = next
        setExpanded(next)
        loadOutput(id)
      }, [loadOutput])

      /** Collapse one command. */
      var collapse = React.useCallback(function (id) {
        var next = Object.assign({}, expandedRef.current)
        delete next[id]
        expandedRef.current = next
        setExpanded(next)
      }, [])

      /** Toggle one command's output. */
      var toggle = React.useCallback(function (id) {
        if (expandedRef.current[id] === true) collapse(id)
        else expand(id)
      }, [collapse, expand])

      // Initial snapshot + live events. One EventSource for the tab's lifetime.
      React.useEffect(function () {
        requestJson(ROUTE + '/commands')
          .then(function (body) {
            setCommands(body.commands || [])
            setError(null)
          })
          .catch(function (loadError) { setError(loadError.message) })

        if (typeof EventSource === 'undefined') return undefined
        var source = new EventSource(ROUTE + '/stream')
        sourceRef.current = source
        source.onopen = function () { setConnected(true) }
        source.onerror = function () { setConnected(false) }
        source.addEventListener('init', function (event) {
          try {
            var payload = JSON.parse(event.data)
            setCommands(payload.commands || [])
            setConnected(true)
          } catch (parseError) {
            // A truncated frame must not break the panel.
          }
        })
        source.addEventListener('start', function (event) {
          try {
            var meta = JSON.parse(event.data)
            upsert(meta)
            if (autoRef.current === true && meta.status === 'running') {
              var next = Object.assign({}, expandedRef.current)
              next[meta.id] = true
              expandedRef.current = next
              setExpanded(next)
              loadOutput(meta.id)
            }
          } catch (parseError) {
            // Same rationale.
          }
        })
        source.addEventListener('end', function (event) {
          try {
            upsert(JSON.parse(event.data))
          } catch (parseError) {
            // Same rationale.
          }
        })
        source.addEventListener('output', function (event) {
          try {
            var payload = JSON.parse(event.data)
            if (expandedRef.current[payload.id] !== true) return
            setOutputs(function (previous) {
              var current = previous[payload.id]
              if (payload.reset === true) {
                var replaced = Object.assign({}, previous)
                replaced[payload.id] = {
                  lines: payload.lines || [],
                  floorSeq: payload.floorSeq,
                  nextSeq: payload.nextSeq,
                }
                return replaced
              }
              if (!current) return previous
              var lastSeq = current.lines.length > 0 ? current.lines[current.lines.length - 1].seq : -1
              var incoming = []
              for (var index = 0; index < (payload.lines || []).length; index++) {
                if (payload.lines[index].seq > lastSeq) incoming.push(payload.lines[index])
              }
              if (incoming.length === 0) return previous
              var next = Object.assign({}, previous)
              next[payload.id] = {
                lines: mergeLines(current.lines, incoming),
                floorSeq: current.floorSeq,
                nextSeq: payload.nextSeq || current.nextSeq,
              }
              return next
            })
          } catch (parseError) {
            // Same rationale.
          }
        })
        return function () {
          if (sourceRef.current === source) sourceRef.current = null
          source.close()
        }
      }, [upsert, loadOutput])

      // Keep every expanded log pinned to the tail unless the user scrolled up.
      React.useEffect(function () {
        for (var id in expanded) {
          if (!Object.prototype.hasOwnProperty.call(expanded, id)) continue
          var node = outRefs.current[id]
          if (!node) continue
          if (scrollPinRef.current[id] === false) continue
          node.scrollTop = node.scrollHeight
        }
      }, [outputs, expanded])

      /** Re-fetch the snapshots on demand. */
      function refresh() {
        setBusy(true)
        requestJson(ROUTE + '/commands')
          .then(function (body) {
            setCommands(body.commands || [])
            setError(null)
            var ids = Object.keys(expandedRef.current)
            for (var index = 0; index < ids.length; index++) loadOutput(ids[index])
          })
          .catch(function (loadError) { setError(loadError.message) })
          .then(function () { setBusy(false) })
      }

      /** Mark a log as detached when the user scrolls away from the tail. */
      function onOutputScroll(id, event) {
        var node = event.currentTarget
        var nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 28
        scrollPinRef.current[id] = nearBottom
      }

      var visible = commands
      if (filter === 'running') visible = commands.filter(function (command) { return command.status === 'running' })
      if (filter === 'failed') {
        visible = commands.filter(function (command) {
          return command.status === 'failed' || command.status === 'timeout' || command.status === 'canceled' || command.error
        })
      }

      var runningCount = 0
      var failedCount = 0
      var doneCount = 0
      for (var index = 0; index < commands.length; index++) {
        var status = commands[index].status
        if (status === 'running') runningCount += 1
        else if (status === 'failed' || status === 'timeout') failedCount += 1
        else if (status === 'done') doneCount += 1
      }

      return h('div', { className: 'dcl-root' },
        h('div', { className: 'dcl-head' },
          h('span', { className: 'dcl-title' }, '命令'),
          runningCount > 0
            ? h('span', { className: 'dcl-count' }, h('b', null, String(runningCount)), ' 个在跑')
            : h('span', { className: 'dcl-count' }, '共 ' + commands.length + ' 条'),
          h('span', { className: 'dcl-grow' }),
          h('span', { className: 'dcl-live', 'data-on': connected ? 'true' : 'false' }, connected ? '实时' : '离线'),
        ),
        h('div', { className: 'dcl-bar' },
          h('button', {
            className: 'dcl-chip' + (filter === 'all' ? ' is-on' : ''),
            onClick: function () { setFilter('all'); writePref('dsh-cmd-live:filter', 'all') },
          }, '全部'),
          h('button', {
            className: 'dcl-chip' + (filter === 'running' ? ' is-on' : ''),
            onClick: function () { setFilter('running'); writePref('dsh-cmd-live:filter', 'running') },
          }, '运行中'),
          h('button', {
            className: 'dcl-chip' + (filter === 'failed' ? ' is-on' : ''),
            onClick: function () { setFilter('failed'); writePref('dsh-cmd-live:filter', 'failed') },
          }, '失败' + (failedCount > 0 ? ' ' + failedCount : '')),
          h('label', { className: 'dcl-check', title: '新命令开始时自动展开它的输出' },
            h('input', {
              type: 'checkbox',
              checked: autoExpand,
              onChange: function (event) {
                setAutoExpand(event.target.checked)
                writePref('dsh-cmd-live:autoExpand', event.target.checked)
              },
            }), '自动展开'),
          h('button', { className: 'dcl-icon-btn', disabled: busy, onClick: refresh, title: '重新拉取快照' }, busy ? '刷新中' : '刷新'),
        ),
        error ? h('div', { className: 'dcl-error' }, error) : null,
        visible.length === 0
          ? h('div', { className: 'dcl-empty' },
            h('div', null, commands.length === 0 ? '还没有命令。' : '没有符合筛选条件的命令。'),
            commands.length === 0
              ? h('div', null, 'DSH 每跑一条 bash 命令（前台或后台），这里会立刻出现一行，并实时跟着输出。')
              : null,
            commands.length === 0
              ? h('div', null, '试试让我执行 ', h('code', null, 'sleep 3; echo done'), '。')
              : null,
          )
          : h('div', { className: 'dcl-list' }, visible.map(function (command) {
            return h(CommandCard, {
              key: command.id,
              command: command,
              output: outputs[command.id],
              expanded: expanded[command.id] === true,
              now: now,
              onToggle: function () { toggle(command.id) },
              onScroll: function (event) { onOutputScroll(command.id, event) },
              outputRef: function (node) {
                if (node) outRefs.current[command.id] = node
                else delete outRefs.current[command.id]
              },
            })
          })),
        h('div', { className: 'dcl-foot' },
          h('span', null, '运行中 ', h('b', null, String(runningCount))),
          h('span', null, '完成 ', h('b', null, String(doneCount))),
          h('span', null, '失败 ', h('b', null, String(failedCount))),
          h('span', { style: { marginLeft: 'auto' } }, '宿主内 ' + commands.length + ' 条快照'),
        ),
      )
    }

    exports.name = 'dsh-cmd-live-client'
    exports.inject = ['sidebarRightTabs', 'slots']

    /** Mount the sidebar tab. */
    exports.apply = function apply(ctx) {
      try {
        ensureStyles()
        ctx.sidebarRightTabs.register({
          id: TAB_ID,
          kind: KIND,
          priority: 'extension',
          title: function () { return '命令' },
          guide: [{
            id: 'cmd-live',
            order: 46,
            title: function () { return '命令' },
            description: function () { return '实时查看 DSH 正在跑和刚跑完的命令与输出'; },
          }],
        })
        ctx.slots.inject('sidebar.right.pane.tab', function () {
          return ctx.slots.register(
            { name: 'sidebar.right.pane.tab', key: TAB_ID },
            CmdLiveBody,
          )
        })
        // Do NOT also call betterSidebar.registerTab(): dsh-better-sidebar mirrors
        // every native sidebarRightTabs registration into its own surface, so a
        // second registration would show the same tab twice.
      } catch (error) {
        // A client half must never take the application boot down with it.
        var message = error && error.message ? error.message : String(error)
        document.documentElement.setAttribute('data-cmd-live-error', message)
        if (window.console && window.console.warn) {
          window.console.warn('dsh-cmd-live client: ' + message)
        }
      }
    }

    return module.exports
  },
})
