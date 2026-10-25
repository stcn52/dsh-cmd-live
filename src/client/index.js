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
    // Test seam: point the terminal half at a standalone PTY harness.
    var TERM_BASE = (typeof window !== 'undefined' && window.__DCL_TERM_BASE__) || ROUTE
    var MAX_LINES = 600
    var MAX_COMMANDS = 120

    var CSS = [
      '.dcl-root { display: flex; flex-direction: column; height: 100%; min-height: 0; color: var(--fg, #e6e9ef); font-size: 13px; }',
      '.dcl-head { display: flex; align-items: center; gap: 8px; padding: 9px 10px 6px; flex: 0 0 auto; }',
      '.dcl-title { font-weight: 600; font-size: 13px; letter-spacing: 0.02em; }',
      '.dcl-count { font-size: 11px; color: var(--fg-muted, #98a2b3); }',
      '.dcl-count b { color: #ffc46b; font-weight: 600; }',
      '.dcl-grow { flex: 1 1 auto; }',
      '.dcl-live { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--fg-muted, #98a2b3); white-space: nowrap; }',
      '.dcl-live::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--border-strong, #3a4150); }',
      '.dcl-live[data-on="true"]::before { background: #7ee0a1; box-shadow: 0 0 0 3px rgba(126, 224, 161, 0.14); }',
      '.dcl-bar { display: flex; align-items: center; gap: 6px; padding: 0 10px 6px; flex: 0 0 auto; flex-wrap: wrap; }',
      '.dcl-chip { font: inherit; font-size: 11px; color: var(--fg-muted, #98a2b3); background: transparent; border: 1px solid var(--border, #2a2f3a); border-radius: 999px; padding: 2px 9px; cursor: pointer; }',
      '.dcl-chip:hover { color: var(--fg, #e6e9ef); border-color: var(--border-strong, #3a4150); }',
      '.dcl-chip.is-on { color: var(--fg, #e6e9ef); background: var(--accent-soft, rgba(110, 168, 254, 0.16)); border-color: var(--accent, #6ea8fe); }',
      '.dcl-check { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--fg-muted, #98a2b3); cursor: pointer; white-space: nowrap; }',
      '.dcl-search { display: flex; gap: 6px; padding: 0 10px 7px; flex: 0 0 auto; }',
      '.dcl-search input { flex: 1 1 auto; min-width: 0; height: 24px; font: inherit; font-size: 11.5px; font-family: var(--mono, ui-monospace, monospace); color: inherit; background: var(--surface-2, #1b202a); border: 1px solid var(--border, #2a2f3a); border-radius: 6px; padding: 0 8px; }',
      '.dcl-search input:focus { outline: none; border-color: var(--accent, #6ea8fe); }',
      '.dcl-body { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }',
      '.dcl-list { flex: 0 0 auto; min-height: 64px; overflow: auto; padding: 2px 6px 4px; outline: none; }',
      '.dcl-item { display: flex; align-items: center; gap: 7px; height: 25px; padding: 0 6px; border-radius: 5px; cursor: pointer; font-size: 11.5px; color: var(--fg-muted, #98a2b3); user-select: none; outline: none; }',
      '.dcl-item:hover { background: rgba(255, 255, 255, 0.04); color: var(--fg, #e6e9ef); }',
      '.dcl-item[data-selected="true"] { background: var(--accent-soft, rgba(110, 168, 254, 0.16)); color: var(--fg, #e6e9ef); box-shadow: inset 2px 0 0 var(--accent, #6ea8fe); }',
      '.dcl-item[data-status="running"] .dcl-glyph { color: #ffc46b; }',
      '.dcl-item[data-status="failed"] .dcl-glyph, .dcl-item[data-status="timeout"] .dcl-glyph { color: #ff8a80; }',
      '.dcl-item[data-status="done"] .dcl-glyph { color: #7ee0a1; }',
      '.dcl-glyph { flex: 0 0 auto; width: 12px; text-align: center; font-size: 10px; }',
      '.dcl-text { flex: 1 1 auto; min-width: 0; font-family: var(--mono, ui-monospace, monospace); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
      '.dcl-time { flex: 0 0 auto; font-size: 10.5px; font-variant-numeric: tabular-nums; }',
      '.dcl-rowstop { flex: 0 0 auto; width: 18px; height: 18px; padding: 0; border: 0; border-radius: 4px; background: transparent; color: #ff8a80; cursor: pointer; opacity: 0; font-size: 10px; line-height: 18px; }',
      '.dcl-item:hover .dcl-rowstop, .dcl-rowstop:focus { opacity: 1; }',
      '.dcl-rowstop:hover { background: rgba(255, 138, 128, 0.16); }',
      '.dcl-split { flex: 0 0 auto; height: 6px; cursor: row-resize; background: transparent; position: relative; }',
      '.dcl-split::after { content: ""; position: absolute; left: 10px; right: 10px; top: 2px; height: 1px; background: var(--border, #2a2f3a); }',
      '.dcl-split:hover::after, .dcl-split[data-dragging="true"]::after { background: var(--accent, #6ea8fe); height: 2px; }',
      '.dcl-detail { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }',
      '.dcl-dhead { padding: 6px 10px 4px; display: grid; gap: 3px; flex: 0 0 auto; }',
      '.dcl-dcmd { font-family: var(--mono, ui-monospace, monospace); font-size: 11px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 4.4em; overflow: hidden; }',
      '.dcl-dmeta { display: flex; align-items: center; gap: 7px; font-size: 10.5px; color: var(--fg-muted, #98a2b3); flex-wrap: wrap; }',
      '.dcl-dmeta code { font-family: var(--mono, ui-monospace, monospace); font-size: 10.5px; }',
      '.dcl-dot { width: 2px; height: 2px; border-radius: 50%; background: currentColor; opacity: 0.7; }',
      '.dcl-badge { padding: 0 6px; border-radius: 999px; border: 1px solid var(--border, #2a2f3a); font-size: 10px; line-height: 15px; }',
      '.dcl-badge[data-status="running"] { color: #ffc46b; border-color: #6b553a; background: #2a2418; }',
      '.dcl-badge[data-status="done"] { color: #7ee0a1; border-color: #34604a; background: #182a20; }',
      '.dcl-badge[data-status="failed"], .dcl-badge[data-status="timeout"] { color: #ff8a80; border-color: #6d3a3a; background: #2a1c1e; }',
      '.dcl-badge[data-status="canceled"] { color: var(--fg-muted, #98a2b3); }',
      '.dcl-tools { display: flex; align-items: center; gap: 5px; padding: 0 10px 6px; flex: 0 0 auto; flex-wrap: wrap; }',
      '.dcl-btn { font: inherit; font-size: 11px; height: 22px; padding: 0 8px; border: 1px solid var(--border, #2a2f3a); border-radius: 6px; background: transparent; color: var(--fg-muted, #98a2b3); cursor: pointer; white-space: nowrap; }',
      '.dcl-btn:hover:not(:disabled) { color: var(--fg, #e6e9ef); border-color: var(--border-strong, #3a4150); }',
      '.dcl-btn:disabled { opacity: 0.4; cursor: default; }',
      '.dcl-btn.is-on { color: var(--fg, #e6e9ef); background: var(--accent-soft, rgba(110, 168, 254, 0.16)); border-color: var(--accent, #6ea8fe); }',
      '.dcl-btn.danger { color: #ff8a80; border-color: #6d3a3a; }',
      '.dcl-btn.danger:hover:not(:disabled) { background: rgba(255, 138, 128, 0.12); color: #ffb4ad; }',
      '.dcl-outwrap { flex: 1 1 auto; min-height: 0; position: relative; display: flex; }',
      '.dcl-out { flex: 1 1 auto; overflow: auto; padding: 5px 10px 10px; font-family: var(--mono, ui-monospace, monospace); font-size: 11px; line-height: 1.5; background: rgba(0, 0, 0, 0.18); }',
      '.dcl-line { display: flex; gap: 7px; white-space: pre-wrap; overflow-wrap: anywhere; }',
      '.dcl-line:hover { background: rgba(255, 255, 255, 0.03); }',
      '.dcl-seq { flex: 0 0 auto; width: 2.4em; text-align: right; color: var(--border-strong, #3a4150); user-select: none; }',
      '.dcl-line[data-kind="err"] { color: #ff9d95; }',
      '.dcl-follow { position: absolute; right: 14px; bottom: 12px; font: inherit; font-size: 10.5px; padding: 3px 9px; border-radius: 999px; border: 1px solid var(--accent, #6ea8fe); background: var(--surface-2, #1b202a); color: var(--accent, #6ea8fe); cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35); }',
      '.dcl-empty { padding: 18px 14px; color: var(--fg-muted, #98a2b3); display: grid; gap: 8px; line-height: 1.65; font-size: 12px; }',
      '.dcl-empty code { font-family: var(--mono, ui-monospace, monospace); color: var(--fg, #e6e9ef); }',
      '.dcl-warn { margin: 0 10px 8px; padding: 5px 9px; border: 1px solid #6b553a; background: #2a2418; color: #ffc46b; border-radius: 7px; font-size: 11px; line-height: 1.45; }',
      '.dcl-error { margin: 0 10px 8px; padding: 6px 9px; border: 1px solid #6d3a3a; background: #2a1c1e; color: #ff8a80; border-radius: 7px; font-size: 11.5px; }',
      '.dcl-foot { flex: 0 0 auto; display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-top: 1px solid var(--border, #2a2f3a); font-size: 10.5px; color: var(--fg-muted, #98a2b3); }',
      '.dcl-foot b { color: var(--fg, #e6e9ef); font-weight: 600; }',
      '.dcl-toast { color: #7ee0a1; font-size: 10.5px; }',
      '.dcl-shell { display: flex; flex-direction: column; height: 100%; min-height: 0; }',
      '.dcl-tabs { display: flex; align-items: center; gap: 4px; padding: 6px 8px 5px; border-bottom: 1px solid var(--border, #2a2f3a); overflow-x: auto; overflow-y: hidden; flex: 0 0 auto; }',
      '.dcl-tab { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 9px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--fg-muted, #98a2b3); font: inherit; font-size: 11px; cursor: pointer; white-space: nowrap; }',
      '.dcl-tab:hover { color: var(--fg, #e6e9ef); background: rgba(255, 255, 255, 0.04); }',
      '.dcl-tab.is-on { color: var(--fg, #e6e9ef); background: var(--surface-2, #1b202a); border-color: var(--border, #2a2f3a); }',
      '.dcl-tab-x { font-size: 11px; opacity: 0.55; border-radius: 3px; padding: 0 2px; }',
      '.dcl-tab-x:hover { opacity: 1; color: #ff8a80; }',
      '.dcl-tab-add { flex: 0 0 auto; width: 24px; height: 24px; padding: 0; border: 1px solid var(--border, #2a2f3a); border-radius: 6px; background: transparent; color: var(--fg-muted, #98a2b3); font: inherit; font-size: 13px; line-height: 22px; cursor: pointer; }',
      '.dcl-tab-add:hover { color: var(--fg, #e6e9ef); border-color: var(--border-strong, #3a4150); }',
      '.dcl-panes { flex: 1 1 auto; min-height: 0; display: flex; }',
      '.dcl-pane { flex: 1 1 auto; min-width: 0; min-height: 0; flex-direction: column; }',
      '.dcl-term { flex: 1 1 auto; min-height: 0; padding: 5px 8px 3px; background: var(--surface-1, #0f1218); }',
      '.dcl-term > div { height: 100%; }',
      '.dcl-term .xterm { height: 100%; padding: 0; }',
      '.dcl-term .xterm-viewport { background: transparent !important; }',
      '.dcl-term-msg { padding: 18px 16px; color: var(--fg-muted, #98a2b3); font-size: 12px; line-height: 1.65; display: grid; gap: 10px; }',
      '.dcl-term-msg code { font-family: var(--mono, ui-monospace, monospace); color: var(--fg, #e6e9ef); }',
      '.dcl-term-exit { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; padding: 5px 10px; border-top: 1px solid var(--border, #2a2f3a); font-size: 11px; color: var(--fg-muted, #98a2b3); background: var(--surface-2, #1b202a); }',
      '.dcl-term-exit b { color: #ff8a80; font-weight: 600; }',
    ].join('\n')

    /** Inject the tab stylesheet once. */
    function ensureStyles() {
      if (document.getElementById(STYLE_ID)) return
      var style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = CSS
      document.head.appendChild(style)
    }

    /** GET (or POST) JSON, surfacing the server's error message. */
    function requestJson(url, options) {
      return fetch(url, options).then(function (response) {
        return response.json().then(function (body) {
          if (!response.ok) {
            var error = new Error(body && body.error ? body.error : 'HTTP ' + response.status)
            error.status = response.status
            error.body = body
            throw error
          }
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
      var text = String(path || '').replace(/^\/home\/[^/]+/, '~')
      if (text.length <= 40) return text
      var parts = text.split('/')
      return '…/' + parts.slice(-2).join('/')
    }

    /** Command text collapsed onto one line for the list. */
    function oneLine(text) {
      return String(text || '').replace(/\s+/g, ' ').trim()
    }

    /** Exit/status detail for the header. */
    function codeText(command) {
      if (command.status === 'running') {
        return command.timeoutMs ? '限时 ' + durationText(command.timeoutMs) : '运行中'
      }
      if (command.timedOut) return '超时'
      if (command.killed) return '已停止'
      if (command.aborted) return '已取消'
      if (typeof command.exitCode === 'number') return 'exit ' + command.exitCode
      if (command.signal) return '被 ' + command.signal + ' 终止'
      if (command.error) return '启动失败'
      return statusLabel(command.status)
    }

    /** Merge fetched lines into the cached ones, keeping sequence order. */
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

    /** Copy text through the async clipboard, falling back to a textarea. */
    function copyText(text) {
      var fallback = function () {
        var area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', 'readonly')
        area.style.position = 'fixed'
        area.style.left = '-9999px'
        document.body.appendChild(area)
        area.select()
        var copied = false
        try { copied = document.execCommand('copy') } catch (error) { copied = false }
        document.body.removeChild(area)
        return copied
      }
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(text).then(function () { return true }, function () { return fallback() })
      }
      return Promise.resolve(fallback())
    }

    /** One row in the command list. */
    function CommandRow(props) {
      var command = props.command
      var running = command.status === 'running'
      return h('div', {
        className: 'dcl-item',
        'data-status': command.status,
        'data-selected': props.selected ? 'true' : 'false',
        role: 'option',
        tabIndex: 0,
        'aria-selected': props.selected ? 'true' : 'false',
        title: command.command,
        onClick: props.onSelect,
        onKeyDown: function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            props.onSelect()
          }
        },
      },
      h('span', { className: 'dcl-glyph' }, statusGlyph(command.status)),
      h('span', { className: 'dcl-text' }, oneLine(command.command) || '(空命令)'),
      h('span', { className: 'dcl-time' }, elapsedText(command, props.now)),
      running
        ? h('button', {
          className: 'dcl-rowstop',
          title: props.stale ? '宿主需要重启才能停止命令' : '停止这条命令',
          disabled: props.busy || props.stale,
          onClick: function (event) { event.stopPropagation(); props.onKill() },
        }, '■')
        : null,
      )
    }

    /** Detail pane for the selected command. */
    function DetailPane(props) {
      var command = props.command
      var output = props.output
      var running = command.status === 'running'
      var lines = output ? output.lines : []
      return h('div', { className: 'dcl-detail' },
        h('div', { className: 'dcl-dhead' },
          h('div', { className: 'dcl-dcmd', title: command.command }, command.command || '(空命令)'),
          h('div', { className: 'dcl-dmeta' },
            h('span', { className: 'dcl-badge', 'data-status': command.status }, statusLabel(command.status)),
            h('code', { title: command.workdir }, shortPath(command.workdir) || '—'),
            h('span', { className: 'dcl-dot' }),
            h('span', null, codeText(command)),
            h('span', { className: 'dcl-dot' }),
            h('span', null, elapsedText(command, props.now)),
            command.lineCount > 0 ? h('span', { className: 'dcl-dot' }) : null,
            command.lineCount > 0 ? h('span', null, command.lineCount + ' 行') : null,
            command.truncated ? h('span', { className: 'dcl-badge', title: '只保留最近的输出' }, '截断') : null,
            command.error ? h('span', { className: 'dcl-badge', title: command.error }, '启动失败') : null,
          ),
        ),
        h('div', { className: 'dcl-tools' },
          running
            ? h('button', {
              className: 'dcl-btn danger',
              disabled: props.busy || props.stale,
              onClick: props.onKill,
              title: props.stale ? '宿主需要重启才能停止命令' : '向进程组发 SIGTERM',
            }, props.busy ? '停止中…' : '停止')
            : null,
          h('button', { className: 'dcl-btn', onClick: props.onCopy, title: '复制当前保留的输出' }, props.copied ? '已复制' : '复制输出'),
          h('button', { className: 'dcl-btn', onClick: props.onOpenText, title: '在新标签页打开纯文本' }, '全文'),
          h('button', {
            className: 'dcl-btn' + (props.follow ? ' is-on' : ''),
            onClick: props.onToggleFollow,
            title: '新输出到达时自动滚到底部',
          }, props.follow ? '跟随中' : '跟随'),
          h('span', { className: 'dcl-grow' }),
          props.copied ? h('span', { className: 'dcl-toast' }, '已复制') : null,
        ),
        h('div', { className: 'dcl-outwrap' },
          h('div', { className: 'dcl-out', ref: props.outRef, onScroll: props.onScroll },
            lines.length > 0
              ? lines.map(function (line) {
                return h('div', { key: line.seq, className: 'dcl-line', 'data-kind': line.kind },
                  h('span', { className: 'dcl-seq' }, String(line.seq)),
                  h('span', null, line.text === '' ? '\u00a0' : line.text))
              })
              : h('div', { className: 'dcl-empty' }, running ? '等待输出…' : '没有输出'),
          ),
          !props.follow && running
            ? h('button', { className: 'dcl-follow', onClick: props.onToggleFollow }, '↓ 回到最新')
            : null,
        ),
      )
    }

    /** The command monitor pane (one tab of the panel). */
    function CommandsPane() {
      var commandsState = React.useState([])
      var commands = commandsState[0]
      var setCommands = commandsState[1]
      var outputsState = React.useState({})
      var outputs = outputsState[0]
      var setOutputs = outputsState[1]
      var selectedState = React.useState(null)
      var selectedId = selectedState[0]
      var setSelectedId = selectedState[1]
      var filterState = React.useState(readPref('dsh-cmd-live:filter', 'all'))
      var filter = filterState[0]
      var setFilter = filterState[1]
      var searchState = React.useState('')
      var search = searchState[0]
      var setSearch = searchState[1]
      var autoState = React.useState(readPref('dsh-cmd-live:autoSelect', true))
      var autoSelect = autoState[0]
      var setAutoSelect = autoState[1]
      var followState = React.useState(readPref('dsh-cmd-live:follow', true))
      var follow = followState[0]
      var setFollow = followState[1]
      var listHeightState = React.useState(null)
      var listHeight = listHeightState[0]
      var setListHeight = listHeightState[1]
      var connectedState = React.useState(false)
      var connected = connectedState[0]
      var setConnected = connectedState[1]
      var errorState = React.useState(null)
      var error = errorState[0]
      var setError = errorState[1]
      var hostState = React.useState(undefined)
      var hostVersion = hostState[0]
      var setHostVersion = hostState[1]
      var busyState = React.useState(null)
      var busyId = busyState[0]
      var setBusyId = busyState[1]
      var copiedState = React.useState(false)
      var copied = copiedState[0]
      var setCopied = copiedState[1]
      var draggingState = React.useState(false)
      var dragging = draggingState[0]
      var setDragging = draggingState[1]
      var nowState = React.useState(Date.now())
      var now = nowState[0]
      var setNow = nowState[1]

      var sourceRef = React.useRef(null)
      var selectedRef = React.useRef(null)
      var pinnedRef = React.useRef(false)
      var followRef = React.useRef(follow)
      var autoRef = React.useRef(autoSelect)
      var outRef = React.useRef(null)
      var listRef = React.useRef(null)
      var copyTimerRef = React.useRef(null)
      var bodyRef = React.useRef(null)
      var commandsRef = React.useRef([])

      React.useEffect(function () { followRef.current = follow }, [follow])
      React.useEffect(function () { autoRef.current = autoSelect }, [autoSelect])
      React.useEffect(function () { commandsRef.current = commands }, [commands])

      var hasRunning = false
      for (var index = 0; index < commands.length; index++) {
        if (commands[index].status === 'running') { hasRunning = true; break }
      }

      // Live clock only while something runs.
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

      /** Select one command, following its output from the tail. */
      var select = React.useCallback(function (id, options) {
        var fromUser = options && options.fromUser === true
        selectedRef.current = id
        setSelectedId(id)
        if (fromUser) pinnedRef.current = true
        setCopied(false)
        setFollow(true)
        followRef.current = true
        loadOutput(id)
      }, [loadOutput])

      /** Newest running command, else the newest one. */
      var autoTarget = React.useCallback(function (list) {
        var source = list || commandsRef.current
        for (var index = 0; index < source.length; index++) {
          if (source[index].status === 'running') return source[index].id
        }
        return source.length > 0 ? source[0].id : null
      }, [])

      /** Jump to the newest running command and resume auto-selection. */
      var followNewest = React.useCallback(function (list) {
        pinnedRef.current = false
        var id = autoTarget(list)
        if (id !== null) select(id)
      }, [autoTarget, select])

      // Initial snapshot + live events. One EventSource for the tab's lifetime.
      React.useEffect(function () {
        requestJson(ROUTE + '/commands')
          .then(function (body) {
            var list = body.commands || []
            setCommands(list)
            setError(null)
            setHostVersion(typeof body.version === 'string' ? body.version : null)
            if (selectedRef.current === null && list.length > 0) select(list[0].id)
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
            var list = payload.commands || []
            setCommands(list)
            setConnected(true)
            var stillThere = false
            for (var index = 0; index < list.length; index++) {
              if (list[index].id === selectedRef.current) stillThere = true
            }
            if (!stillThere) {
              if (autoRef.current === true && pinnedRef.current === false) followNewest(list)
              else if (list.length > 0) select(list[0].id)
            } else {
              loadOutput(selectedRef.current)
            }
          } catch (parseError) {
            // A truncated frame must not break the panel.
          }
        })
        source.addEventListener('start', function (event) {
          try {
            var meta = JSON.parse(event.data)
            upsert(meta)
            if (autoRef.current === true && pinnedRef.current === false) select(meta.id)
          } catch (parseError) {
            // Same rationale.
          }
        })
        source.addEventListener('end', function (event) {
          try {
            var meta = JSON.parse(event.data)
            upsert(meta)
            if (meta.id === selectedRef.current) loadOutput(meta.id)
          } catch (parseError) {
            // Same rationale.
          }
        })
        source.addEventListener('output', function (event) {
          try {
            var payload = JSON.parse(event.data)
            if (payload.id !== selectedRef.current) return
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
      }, [upsert, loadOutput, select, followNewest])

      // Keep the log pinned to the tail while following.
      React.useEffect(function () {
        if (!followRef.current) return
        var node = outRef.current
        if (node) node.scrollTop = node.scrollHeight
      }, [outputs, selectedId, follow])

      /** Re-fetch the snapshot and the selected log. */
      function refresh() {
        setError(null)
        requestJson(ROUTE + '/commands')
          .then(function (body) {
            setCommands(body.commands || [])
            setHostVersion(typeof body.version === 'string' ? body.version : null)
            if (selectedRef.current !== null) loadOutput(selectedRef.current)
            else if ((body.commands || []).length > 0) select(body.commands[0].id)
          })
          .catch(function (loadError) { setError(loadError.message) })
      }

      /** Ask the host to stop one running command. */
      function stopCommand(id) {
        var command = null
        for (var index = 0; index < commands.length; index++) {
          if (commands[index].id === id) command = commands[index]
        }
        if (!command || command.status !== 'running') return
        if (hostVersion === null) {
          setError('当前宿主还没有停止接口；重启 DSH 后这个按钮才会生效。')
          return
        }
        if (typeof window.confirm === 'function') {
          var ok = window.confirm('停止这条命令？\n\n' + oneLine(command.command).slice(0, 200))
          if (!ok) return
        }
        setBusyId(id)
        setError(null)
        requestJson(ROUTE + '/kill', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: id }),
        }).then(function (body) {
          if (body && body.command) upsert(body.command)
        }).catch(function (killError) {
          if (killError && killError.body && killError.body.killed === false) return
          var extra = killError.status === 404 || killError.status === 405
            ? '（宿主还是旧版本，重启 DSH 后可用）'
            : ''
          setError(killError.message + extra)
        }).then(function () { setBusyId(null) })
      }

      /** Copy the selected command's retained output. */
      function copyOutput() {
        var output = outputs[selectedRef.current]
        var text = output && output.lines ? output.lines.map(function (line) { return line.text }).join('\n') : ''
        if (text === '') return
        copyText(text).then(function (ok) {
          if (!ok) { setError('浏览器拒绝了剪贴板写入，请手动选中输出复制'); return }
          setCopied(true)
          setError(null)
          if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
          copyTimerRef.current = setTimeout(function () { setCopied(false) }, 1500)
        })
      }

      /** Mark follow on/off from the toolbar or a scroll near the bottom. */
      function toggleFollow() {
        var next = !followRef.current
        setFollow(next)
        followRef.current = next
        writePref('dsh-cmd-live:follow', next)
        if (next) {
          var node = outRef.current
          if (node) node.scrollTop = node.scrollHeight
        }
      }

      /** Follow the tail when the user scrolls back to the bottom. */
      function onOutputScroll(event) {
        var node = event.currentTarget
        var nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 28
        if (nearBottom !== followRef.current) {
          setFollow(nearBottom)
          followRef.current = nearBottom
        }
      }

      /** Move the list selection with the keyboard. */
      function moveSelection(delta) {
        var list = visible
        if (list.length === 0) return
        var current = -1
        for (var index = 0; index < list.length; index++) {
          if (list[index].id === selectedRef.current) current = index
        }
        var next = current === -1 ? 0 : Math.min(list.length - 1, Math.max(0, current + delta))
        select(list[next].id, { fromUser: true })
      }

      /** Start dragging the splitter. */
      function startDrag(event) {
        event.preventDefault()
        var body = bodyRef.current
        var list = listRef.current
        if (!body || !list) return
        var rect = body.getBoundingClientRect()
        var startY = event.clientY
        var startHeight = list.offsetHeight
        setDragging(true)
        var move = function (moveEvent) {
          var next = startHeight + (moveEvent.clientY - startY)
          setListHeight(Math.min(rect.height - 180, Math.max(64, next)))
        }
        var up = function () {
          setDragging(false)
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
      }

      var visible = commands
      if (filter === 'running') visible = commands.filter(function (command) { return command.status === 'running' })
      if (filter === 'failed') {
        visible = commands.filter(function (command) {
          return command.status === 'failed' || command.status === 'timeout' || command.status === 'canceled' || command.error
        })
      }
      if (search.trim() !== '') {
        var needle = search.trim().toLowerCase()
        visible = visible.filter(function (command) {
          return command.command.toLowerCase().indexOf(needle) !== -1 || command.workdir.toLowerCase().indexOf(needle) !== -1
        })
      }

      var selected = null
      for (var selectedIndex = 0; selectedIndex < commands.length; selectedIndex++) {
        if (commands[selectedIndex].id === selectedId) selected = commands[selectedIndex]
      }

      var runningCount = 0
      var failedCount = 0
      var doneCount = 0
      for (var count = 0; count < commands.length; count++) {
        var status = commands[count].status
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
          h('label', { className: 'dcl-check', title: '新命令开始时自动选中它' },
            h('input', {
              type: 'checkbox',
              checked: autoSelect,
              onChange: function (event) {
                setAutoSelect(event.target.checked)
                autoRef.current = event.target.checked
                writePref('dsh-cmd-live:autoSelect', event.target.checked)
                if (event.target.checked) followNewest()
              },
            }), '自动选中'),
        ),
        h('div', { className: 'dcl-search' },
          h('input', {
            type: 'text',
            value: search,
            placeholder: '搜索命令 / 目录',
            spellCheck: false,
            onChange: function (event) { setSearch(event.target.value) },
            onKeyDown: function (event) {
              if (event.key === 'Escape') setSearch('')
            },
          }),
          h('button', { className: 'dcl-chip', onClick: function () { followNewest() }, title: '跳到最新一条运行中的命令' }, '最新'),
          h('button', { className: 'dcl-chip', onClick: refresh, title: '重新拉取快照' }, '刷新'),
        ),
        hostVersion === null
          ? h('div', { className: 'dcl-warn' }, '当前宿主启动时加载的还是旧版插件：停止功能与分栏细节要重启 DSH 后才生效。')
          : null,
        error ? h('div', { className: 'dcl-error' }, error) : null,
        h('div', { className: 'dcl-body', ref: bodyRef },
          h('div', {
            className: 'dcl-list',
            ref: listRef,
            role: 'listbox',
            'aria-label': '命令列表',
            style: listHeight === null
              ? { flex: '0 0 auto', maxHeight: '46%' }
              : { flex: '0 0 ' + listHeight + 'px', height: listHeight + 'px' },
            tabIndex: 0,
            onKeyDown: function (event) {
              if (event.key === 'ArrowDown') { event.preventDefault(); moveSelection(1) }
              else if (event.key === 'ArrowUp') { event.preventDefault(); moveSelection(-1) }
              else if (event.key === 'Home') { event.preventDefault(); if (visible.length > 0) select(visible[0].id, { fromUser: true }) }
              else if (event.key === 'End') { event.preventDefault(); if (visible.length > 0) select(visible[visible.length - 1].id, { fromUser: true }) }
            },
          },
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
            : visible.map(function (command) {
              return h(CommandRow, {
                key: command.id,
                command: command,
                now: now,
                selected: command.id === selectedId,
                busy: busyId === command.id,
                stale: hostVersion === null,
                onSelect: function () { select(command.id, { fromUser: true }) },
                onKill: function () { stopCommand(command.id) },
              })
            }),
          ),
          h('div', {
            className: 'dcl-split',
            role: 'separator',
            'aria-orientation': 'horizontal',
            'aria-valuenow': listHeight === null ? undefined : Math.round(listHeight),
            tabIndex: 0,
            'data-dragging': dragging ? 'true' : 'false',
            onPointerDown: startDrag,
            onKeyDown: function (event) {
              if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
              event.preventDefault()
              var list = listRef.current
              var body = bodyRef.current
              if (!list || !body) return
              var ceiling = body.getBoundingClientRect().height - 180
              var step = event.key === 'ArrowDown' ? 24 : -24
              var next = Math.min(ceiling, Math.max(64, list.offsetHeight + step))
              setListHeight(next)
            },
          }),
          selected !== null
            ? h(DetailPane, {
              command: selected,
              output: outputs[selectedId],
              now: now,
              follow: follow,
              stale: hostVersion === null,
              busy: busyId === selectedId,
              copied: copied,
              outRef: outRef,
              onScroll: onOutputScroll,
              onKill: function () { stopCommand(selectedId) },
              onCopy: copyOutput,
              onOpenText: function () { window.open(ROUTE + '/text?id=' + encodeURIComponent(selectedId), '_blank') },
              onToggleFollow: toggleFollow,
            })
            : h('div', { className: 'dcl-empty' },
              h('div', null, '选一条命令查看它的输出。'),
              h('div', null, '↑↓ 切换，Enter 选中；运行中的命令可以停止。'),
            ),
        ),
        h('div', { className: 'dcl-foot' },
          h('span', null, '运行中 ', h('b', null, String(runningCount))),
          h('span', null, '完成 ', h('b', null, String(doneCount))),
          h('span', null, '失败 ', h('b', null, String(failedCount))),
          h('span', { style: { marginLeft: 'auto' } }, '宿主内 ' + commands.length + ' 条'),
        ),
      )
    }

    /** Load one same-origin script once. */
    function loadScriptOnce(src) {
      return new Promise(function (resolve, reject) {
        var existing = document.querySelector('script[data-dcl-src="' + src + '"]')
        if (existing) {
          if (existing.getAttribute('data-dcl-loaded') === 'true') resolve()
          else {
            existing.addEventListener('load', function () { resolve() })
            existing.addEventListener('error', function () { reject(new Error('无法加载 ' + src)) })
          }
          return
        }
        var script = document.createElement('script')
        script.src = src
        script.async = true
        script.setAttribute('data-dcl-src', src)
        script.addEventListener('load', function () {
          script.setAttribute('data-dcl-loaded', 'true')
          resolve()
        })
        script.addEventListener('error', function () { reject(new Error('无法加载 ' + src)) })
        document.head.appendChild(script)
      })
    }

    /** Inject the vendored xterm stylesheet once. */
    function ensureXtermCss() {
      if (document.getElementById('dsh-cmd-live-xterm-css')) return
      var link = document.createElement('link')
      link.id = 'dsh-cmd-live-xterm-css'
      link.rel = 'stylesheet'
      link.href = TERM_BASE + '/vendor/xterm.css'
      document.head.appendChild(link)
    }

    /** Load xterm and the fit addon from this plugin's own vendor route. */
    function loadXterm() {
      if (window.Terminal && window.FitAddon) return Promise.resolve()
      ensureXtermCss()
      var chain = window.Terminal ? Promise.resolve() : loadScriptOnce(TERM_BASE + '/vendor/xterm.js')
      return chain.then(function () {
        if (window.FitAddon) return undefined
        return loadScriptOnce(TERM_BASE + '/vendor/addon-fit.js')
      })
    }

    /** Read a CSS custom property with a fallback. */
    function cssVar(name, fallback) {
      try {
        var value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
        return value === '' ? fallback : value
      } catch (error) {
        return fallback
      }
    }

    /** One real PTY rendered with xterm. */
    function TerminalPane(props) {
      var hostRef = React.useRef(null)
      var termRef = React.useRef(null)
      var fitRef = React.useRef(null)
      var sourceRef = React.useRef(null)
      var reconnectRef = React.useRef(null)
      var inputTimerRef = React.useRef(null)
      var resizeTimerRef = React.useRef(null)
      var pendingRef = React.useRef('')
      var seqRef = React.useRef(0)
      var disposedRef = React.useRef(false)
      var statusState = React.useState('正在连接…')
      var status = statusState[0]
      var setStatus = statusState[1]
      var errorState = React.useState(null)
      var error = errorState[0]
      var setError = errorState[1]
      var exitState = React.useState(null)
      var exitInfo = exitState[0]
      var setExitInfo = exitState[1]
      var inputErrorRef = React.useRef(null)

      React.useEffect(function () {
        disposedRef.current = false
        var term = null
        var fit = null
        var source = null
        var observer = null
        var reconnects = 0
        var seenInit = false

        function sendResize() {
          if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
          resizeTimerRef.current = setTimeout(function () {
            var current = termRef.current
            if (!current || disposedRef.current) return
            var cols = current.cols
            var rows = current.rows
            if (!cols || !rows) return
            fetch(TERM_BASE + '/term/resize', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ id: props.sessionId, cols: cols, rows: rows }),
            }).catch(function () {})
          }, 120)
        }

        function flushInput() {
          inputTimerRef.current = null
          var data = pendingRef.current
          pendingRef.current = ''
          if (data === '') return
          fetch(TERM_BASE + '/term/input', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id: props.sessionId, data: data }),
          }).then(function (response) {
            if (response.status === 409 || response.status === 404) setStatus('已退出')
          }).catch(function () {})
        }

        function queueInput(data) {
          pendingRef.current += data
          if (inputTimerRef.current) return
          inputTimerRef.current = setTimeout(flushInput, 8)
        }

        function connect() {
          if (disposedRef.current || term === null) return
          seenInit = false
          var url = TERM_BASE + '/term/stream?id=' + encodeURIComponent(props.sessionId) + '&since=' + seqRef.current
          var es = new EventSource(url)
          source = es
          sourceRef.current = es
          es.addEventListener('init', function (event) {
            try {
              var payload = JSON.parse(event.data)
              seenInit = true
              reconnects = 0
              if (payload.reset === true) {
                term.reset()
                seqRef.current = 0
              }
              for (var index = 0; index < (payload.chunks || []).length; index++) {
                var chunk = payload.chunks[index]
                term.write(chunk.text)
                if (chunk.seq >= seqRef.current) seqRef.current = chunk.seq + 1
              }
              var running = payload.terminal && payload.terminal.status === 'running'
              setStatus(running ? '运行中' : '已退出')
              if (!running) setExitInfo(payload.terminal)
              try { fit.fit() } catch (fitError) {}
              sendResize()
              term.focus()
            } catch (parseError) {
              // A truncated init frame: reconnect below.
            }
          })
          es.addEventListener('data', function (event) {
            try {
              var payload = JSON.parse(event.data)
              term.write(payload.text)
              if (typeof payload.seq === 'number' && payload.seq >= seqRef.current) seqRef.current = payload.seq + 1
            } catch (parseError) {}
          })
          es.addEventListener('exit', function (event) {
            try {
              var payload = JSON.parse(event.data)
              setExitInfo(payload)
              setStatus('已退出')
              var code = typeof payload.exitCode === 'number' ? ' · exit ' + payload.exitCode : ''
              term.write('\r\n\u001b[90m[进程已退出' + code + ']\u001b[0m\r\n')
            } catch (parseError) {}
            es.close()
            if (source === es) source = null
          })
          es.onerror = function () {
            es.close()
            if (source === es) source = null
            if (disposedRef.current) return
            reconnects += 1
            if (!seenInit && reconnects >= 2) {
              setError('终端连接失败；如果宿主刚升级，请重启 DSH。')
              setStatus('不可用')
              return
            }
            if (reconnects > 8) {
              setStatus('连接中断')
              return
            }
            reconnectRef.current = setTimeout(connect, 600)
          }
        }

        loadXterm().then(function () {
          if (disposedRef.current || !hostRef.current) return
          term = new window.Terminal({
            cursorBlink: true,
            cursorStyle: 'bar',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: 12,
            lineHeight: 1.25,
            scrollback: 6000,
            allowProposedApi: true,
            theme: {
              background: cssVar('--surface-1', '#0f1218'),
              foreground: cssVar('--fg', '#e6e9ef'),
              cursor: cssVar('--accent', '#6ea8fe'),
              selectionBackground: 'rgba(110, 168, 254, 0.30)',
            },
          })
          fit = new window.FitAddon.FitAddon()
          term.loadAddon(fit)
          term.open(hostRef.current)
          // Read-only test seam: the browser console / e2e can inspect the
          // rendered buffer without a global that outlives the tab.
          hostRef.current.__dshTerminal = term
          termRef.current = term
          fitRef.current = fit
          try { fit.fit() } catch (fitError) {}
          sendResize()
          term.onData(queueInput)
          term.onResize(function () { sendResize() })
          observer = new window.ResizeObserver(function () {
            try { fit.fit() } catch (fitError) {}
          })
          observer.observe(hostRef.current)
          connect()
        }).catch(function (loadError) {
          setError(loadError.message)
          setStatus('不可用')
        })

        return function () {
          disposedRef.current = true
          if (sourceRef.current) sourceRef.current.close()
          sourceRef.current = null
          if (reconnectRef.current) clearTimeout(reconnectRef.current)
          if (inputTimerRef.current) clearTimeout(inputTimerRef.current)
          if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
          if (observer) observer.disconnect()
          if (term) {
            try { term.dispose() } catch (disposeError) {}
          }
          termRef.current = null
          fitRef.current = null
        }
      }, [props.sessionId])

      // A hidden pane cannot measure its grid; refit and focus when it becomes active.
      React.useEffect(function () {
        if (props.active !== true) return undefined
        var timer = setTimeout(function () {
          try { if (fitRef.current) fitRef.current.fit() } catch (error) {}
          if (termRef.current) termRef.current.focus()
        }, 40)
        return function () { clearTimeout(timer) }
      }, [props.active])

      if (error) {
        return h('div', { className: 'dcl-term-msg' },
          h('div', null, '终端不可用：', error),
          h('div', null, '这个面板的 PTY 由宿主提供；如果是刚升级插件，重启 DSH 后生效。'),
        )
      }

      return h('div', { className: 'dcl-term-wrap', style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 } },
        h('div', { className: 'dcl-term', onClick: function () { if (termRef.current) termRef.current.focus() } },
          h('div', { ref: hostRef, style: { height: '100%', minHeight: 0 } }),
        ),
        exitInfo !== null
          ? h('div', { className: 'dcl-term-exit' },
            h('span', null, '进程已退出', typeof exitInfo.exitCode === 'number' ? h('b', null, ' · exit ' + exitInfo.exitCode) : null),
            h('span', { className: 'dcl-grow' }),
            h('button', { className: 'dcl-btn', onClick: props.onNew, title: '新开一个终端' }, '新建终端'),
          )
          : h('div', { className: 'dcl-term-exit' },
            h('span', null, status),
            h('span', { className: 'dcl-dot' }),
            h('span', null, 'PTY · 可直接输入，Ctrl+C 中断'),
            h('span', { className: 'dcl-grow' }),
            h('button', { className: 'dcl-btn', onClick: function () { if (termRef.current) termRef.current.clear() }, title: '清屏（不影响进程）' }, '清屏'),
          ),
      )
    }

    /** The sidebar panel: command monitor + interactive terminals. */
    function CmdLiveBody() {
      var tabsState = React.useState([{ key: 'commands', kind: 'commands' }])
      var tabs = tabsState[0]
      var setTabs = tabsState[1]
      var activeState = React.useState('commands')
      var active = activeState[0]
      var setActive = activeState[1]
      var noteState = React.useState(null)
      var note = noteState[0]
      var setNote = noteState[1]
      var busyState = React.useState(false)
      var busy = busyState[0]
      var setBusy = busyState[1]

      /** Add a terminal tab for a host session. */
      var addTab = React.useCallback(function (terminal, activate) {
        var key = 'term:' + terminal.id
        setTabs(function (previous) {
          if (previous.some(function (tab) { return tab.key === key })) return previous
          return previous.concat([{ key: key, kind: 'term', id: terminal.id, title: terminal.title }])
        })
        if (activate !== false) setActive(key)
      }, [])

      /** Allocate a fresh PTY and select it. */
      var createTerminal = React.useCallback(function () {
        if (busy) return
        setBusy(true)
        setNote(null)
        requestJson(TERM_BASE + '/term/create', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cols: 100, rows: 28 }),
        }).then(function (body) {
          addTab(body.terminal)
        }).catch(function (createError) {
          if (createError.status === 503 || createError.status === 404) {
            setNote('终端需要重启 DSH 宿主后可用（当前宿主还是升级前的插件）。')
          } else {
            setNote('无法新建终端：' + createError.message)
          }
        }).then(function () { setBusy(false) })
      }, [addTab, busy])

      /** Stop one terminal and drop its tab. */
      var closeTerminal = React.useCallback(function (id) {
        fetch(TERM_BASE + '/term/close', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: id }),
        }).catch(function () {})
        var key = 'term:' + id
        setTabs(function (previous) { return previous.filter(function (tab) { return tab.key !== key }) })
        setActive(function (current) { return current === key ? 'commands' : current })
      }, [])

      // Restore host terminals after a page refresh; create the first one when
      // the panel is opened for the first time in this host.
      React.useEffect(function () {
        requestJson(TERM_BASE + '/term/list').then(function (body) {
          if (body.available !== true) {
            setNote('终端需要重启 DSH 宿主后可用（当前宿主还是升级前的插件）。')
            return
          }
          var list = body.terminals || []
          if (list.length === 0) {
            createTerminal()
            return
          }
          setTabs(function (previous) {
            var next = previous.slice()
            for (var index = 0; index < list.length; index++) {
              var key = 'term:' + list[index].id
              if (!next.some(function (tab) { return tab.key === key })) {
                next.push({ key: key, kind: 'term', id: list[index].id, title: list[index].title })
              }
            }
            return next
          })
        }).catch(function (loadError) {
          if (loadError.status === 404) {
            setNote('命令面板的宿主端还是旧版本：终端与停止功能要重启 DSH 后生效。')
          } else {
            setNote('无法读取终端列表：' + loadError.message)
          }
        })
      }, [])

      var terms = tabs.filter(function (tab) { return tab.kind === 'term' })

      return h('div', { className: 'dcl-shell' },
        h('div', { className: 'dcl-tabs' },
          h('button', {
            className: 'dcl-tab' + (active === 'commands' ? ' is-on' : ''),
            onClick: function () { setActive('commands') },
          }, '命令'),
          terms.map(function (tab) {
            return h('div', {
              key: tab.key,
              className: 'dcl-tab' + (active === tab.key ? ' is-on' : ''),
              role: 'button',
              tabIndex: 0,
              onClick: function () { setActive(tab.key) },
              onKeyDown: function (event) {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActive(tab.key) }
              },
            },
            h('span', null, tab.title),
            h('span', {
              className: 'dcl-tab-x',
              title: '关闭终端（结束进程）',
              onClick: function (event) { event.stopPropagation(); closeTerminal(tab.id) },
            }, '×'))
          }),
          h('button', {
            className: 'dcl-tab-add',
            disabled: busy,
            title: '新建终端',
            onClick: createTerminal,
          }, '+'),
        ),
        note ? h('div', { className: 'dcl-warn', style: { margin: '6px 10px' } }, note) : null,
        h('div', { className: 'dcl-panes' },
          h('div', { className: 'dcl-pane', style: { display: active === 'commands' ? 'flex' : 'none' } },
            h(CommandsPane)),
          terms.map(function (tab) {
            return h('div', { key: tab.key, className: 'dcl-pane', style: { display: active === tab.key ? 'flex' : 'none' } },
              h(TerminalPane, {
                sessionId: tab.id,
                active: active === tab.key,
                onNew: createTerminal,
              }))
          }),
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
            description: function () { return '实时查看、选择并停止 DSH 正在跑的命令'; },
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
