window.__ModuleLoader__.load({
  id: '@local/dsh-toolkit',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useState } = React

    const NS = 'dsh-toolkit'
    const LIST = '/plugins/toolkit/archived-sessions/list'
    const DELETE = '/plugins/toolkit/archived-sessions/delete'
    const ENDPOINT = '/plugins/toolkit/agent-notify/pending'
    const ENDPOINT_TEST = '/plugins/toolkit/agent-notify/test'
    const STE_STATE = '/plugins/toolkit/asd-ste100/state'
    const STE_SET = '/plugins/toolkit/asd-ste100/set'
    const POLL_MS = 2500
    const PREFS_KEY = 'dsh.agent-notify.prefs'
    const VISIBLE_LIMIT = 3
    const DISMISS_MS = 15000

    const EN = {
      sectionTitle: 'Toolkit',
      sectionIntro: 'Manage archived sessions, notifications, and the writing style rule in one place.',
      tabSessions: 'Archived sessions',
      tabNotify: 'Notifications',
      tabStyle: 'Writing style',
      steTitle: 'ASD-STE100 writing rule',
      steNote: 'Applies the Simplified Technical English rule to every agent prompt on this host.',
      steOn: 'The rule applies to every agent.',
      steOff: 'The rule is off. Agents answer in their normal style.',
      steToggle: 'Enable the writing rule',
      steBusy: 'Saving',
      steFailed: 'The change failed',
      notifyTitle: 'Notifications',
      notifyNote: 'Tell me when a task finishes, or when a task waits for your answer.',
      bannerLabel: 'In-window notice',
      desktopLabel: 'Desktop notice',
      desktopAllow: 'Allow desktop notices',
      desktopBlocked: 'The browser refuses desktop notices for this page.',
      soundLabel: 'Sound',
      volumeLabel: 'Volume',
      testLabel: 'Test',
      done: 'Task done',
      input: 'Your input is needed',
      doneBody: 'The task in {title} finished.',
      inputBody: 'The task in {title} waits for your answer.',
      untitled: 'Untitled session',
      open: 'Open',
      close: 'Dismiss',
      tgTitle: 'Telegram',
      tgNote: 'Send one test message to your Telegram chat.',
      tgSend: 'Send test',
      tgSending: 'Sending',
      tgSent: 'Message sent',
      tgFailed: 'Send failed',
      title: 'Archived sessions',
      intro: 'Archived sessions stay on disk until you delete them. A delete is permanent.',
      empty: 'No archived sessions.',
      loading: 'Loading…',
      sizesUnavailable: 'Size unavailable',
      selectAll: 'Select all',
      clearSelection: 'Clear selection',
      selectedCount: '{n} selected',
      deleteOne: 'Delete',
      deleteSelected: 'Delete selected',
      confirmTitle: 'Delete {n} sessions?',
      confirmChildren: 'This also deletes {n} child sessions.',
      confirmRunning: 'Running work stops first: {names}.',
      confirmMore: '+{n} more',
      confirmPermanent: 'This permanently deletes the session data from disk. You cannot undo it.',
      confirmAction: 'Delete permanently',
      cancel: 'Cancel',
      running: 'Running — stops on delete',
      resultDeleted: 'Deleted {n} sessions and freed {size}.',
      resultDeletedChildren: 'Deleted {n} sessions ({children} children) and freed {size}.',
      resultSkipped: 'Not deleted: {lines}',
      resultNotCleared: 'Files removed, but the archive flag did not clear for: {lines}',
      resultCascadeUnknown: 'Child sessions could not be checked. Look at the sidebar before you delete again.',
      reloadSoon: 'The page reloads in 2 seconds so the sidebar matches.',
      reload: 'Reload the page',
      errorList: 'Cannot read the archived sessions.',
      errorDelete: 'The delete failed.',
      retry: 'Try again',
      noWorkspace: 'No workspace',
      childCount: '{n} child sessions',
      sessionFallback: 'Untitled session',
    }

    const ZH = {
      sectionTitle: '工具箱',
      sectionIntro: '在一个页面管理已归档会话、通知和写作风格规则。',
      tabSessions: '已归档会话',
      tabNotify: '通知',
      tabStyle: '写作风格',
      steTitle: 'ASD-STE100 写作规则',
      steNote: '在本主机的所有代理提示词中加入简化技术英语规则。',
      steOn: '规则对所有代理生效。',
      steOff: '规则已关闭。代理按常规风格回答。',
      steToggle: '启用写作规则',
      steBusy: '保存中',
      steFailed: '修改失败',
      notifyTitle: '通知',
      notifyNote: '任务完成或任务等待你回答时通知你。',
      bannerLabel: '窗口内通知',
      desktopLabel: '桌面通知',
      desktopAllow: '允许桌面通知',
      desktopBlocked: '浏览器拒绝为本页面显示桌面通知。',
      soundLabel: '声音',
      volumeLabel: '音量',
      testLabel: '试听',
      done: '任务完成',
      input: '需要你回答',
      doneBody: '{title} 的任务已完成。',
      inputBody: '{title} 的任务正在等待你的回答。',
      untitled: '未命名会话',
      open: '打开',
      close: '关闭',
      tgTitle: 'Telegram',
      tgNote: '向你的 Telegram 聊天发送一条测试消息。',
      tgSend: '发送测试',
      tgSending: '发送中',
      tgSent: '消息已发送',
      tgFailed: '发送失败',
      title: '已归档会话',
      intro: '已归档会话会一直保留在磁盘上，直到你删除它。删除后无法恢复。',
      empty: '没有已归档会话。',
      loading: '正在加载…',
      sizesUnavailable: '大小不可用',
      selectAll: '全选',
      clearSelection: '清除选择',
      selectedCount: '已选择 {n} 个',
      deleteOne: '删除',
      deleteSelected: '删除所选',
      confirmTitle: '删除 {n} 个会话？',
      confirmChildren: '这也会删除 {n} 个子会话。',
      confirmRunning: '会先停止这些会话中正在运行的工作：{names}。',
      confirmMore: '另有 {n} 个',
      confirmPermanent: '这会从磁盘永久删除会话数据，无法撤销。',
      confirmAction: '永久删除',
      cancel: '取消',
      running: '运行中 — 删除时会停止',
      resultDeleted: '已删除 {n} 个会话，释放 {size}。',
      resultDeletedChildren: '已删除 {n} 个会话（含 {children} 个子会话），释放 {size}。',
      resultSkipped: '未删除：{lines}',
      resultNotCleared: '文件已删除，但以下会话的归档标记未清除：{lines}',
      resultCascadeUnknown: '无法检查子会话。请在再次删除前查看侧边栏。',
      reloadSoon: '页面将在 2 秒后重新加载，使侧边栏保持一致。',
      reload: '重新加载页面',
      errorList: '无法读取已归档会话。',
      errorDelete: '删除失败。',
      retry: '重试',
      noWorkspace: '无工作区',
      childCount: '{n} 个子会话',
      sessionFallback: '未命名会话',
    }

    const CSS = `
    .tk-page { display: flex; flex-direction: column; gap: 12px; padding: 4px 0; color: var(--dsw-alias-label-primary); }
    .tk-intro { margin: 0; font-size: 13px; color: var(--dsw-alias-label-secondary); }
    .tk-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
    .tk-tab { font: inherit; font-size: 13px; padding: 6px 12px; border: none; border-bottom: 2px solid transparent; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
    .tk-tab:hover { color: var(--dsw-alias-label-primary); }
    .tk-tab-on { color: var(--dsw-alias-brand-primary); border-bottom-color: var(--dsw-alias-brand-primary); }
    .tk-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .tk-count { font-size: 13px; color: var(--dsw-alias-label-secondary); }
    .tk-list { display: flex; flex-direction: column; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; overflow: hidden; }
    .tk-row { display: grid; grid-template-columns: 24px 1fr auto; align-items: center; gap: 12px; padding: 10px 12px; background: var(--dsw-alias-bg-layer-1); border-bottom: 1px solid var(--dsw-alias-border-l1); }
    .tk-row:last-child { border-bottom: none; }
    .tk-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .tk-title { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tk-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 12px; color: var(--dsw-alias-label-secondary); }
    .tk-badge { font-size: 11px; padding: 1px 6px; border-radius: 999px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-state-warn-primary); }
    .tk-actions { display: flex; gap: 8px; }
    .tk-button { font: inherit; font-size: 12px; padding: 5px 10px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); cursor: pointer; }
    .tk-button:hover { background: var(--dsw-alias-bg-layer-2); }
    .tk-button:disabled { opacity: 0.55; cursor: default; }
    .tk-button-danger { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
    .tk-button-primary { background: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); color: #fff; }
    .tk-note { font-size: 12px; color: var(--dsw-alias-label-secondary); }
    .tk-error { font-size: 13px; color: var(--dsw-alias-state-error-primary); }
    .tk-ok { font-size: 13px; color: var(--dsw-alias-state-success-primary); }
    .tk-overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.35); z-index: 60; }
    .tk-dialog { width: min(460px, 92vw); display: flex; flex-direction: column; gap: 12px; padding: 18px; border-radius: 12px; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l2); }
    .tk-dialog h3 { margin: 0; font-size: 15px; }
    .tk-dialog p { margin: 0; font-size: 13px; color: var(--dsw-alias-label-secondary); }
    .tk-titles { margin: 0; padding-left: 18px; font-size: 13px; color: var(--dsw-alias-label-primary); }
    .tk-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }
    .an-stack { position: fixed; right: 20px; bottom: 24px; display: flex; flex-direction: column; gap: 8px; z-index: 45; pointer-events: none; max-width: min(380px, 92vw); }
    .an-card { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 10px; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l2); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18); pointer-events: auto; }
    .an-dot { width: 8px; height: 8px; margin-top: 5px; border-radius: 50%; background: var(--dsw-alias-state-success-primary); flex: none; }
    .an-card-waiting .an-dot { background: var(--dsw-alias-state-warn-primary); }
    .an-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .an-title { font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary); }
    .an-text { font-size: 12px; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; }
    .an-actions { display: flex; align-items: center; gap: 6px; margin-left: auto; }
    .an-button { font: inherit; font-size: 12px; padding: 3px 9px; border-radius: 7px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); cursor: pointer; }
    .an-button:hover:enabled { background: var(--dsw-alias-bg-layer-2); }
    .an-button:disabled { opacity: 0.55; cursor: default; }
    .an-close { font: inherit; font-size: 14px; line-height: 1; padding: 2px 6px; border: none; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
    .an-close:hover { color: var(--dsw-alias-label-primary); }
    .an-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 4px 0; flex-wrap: wrap; }
    .an-row-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .an-row-title { font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary); }
    .an-row-note { font-size: 12px; color: var(--dsw-alias-label-secondary); }
    .an-row-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .an-switch { display: inline-flex; align-items: center; gap: 7px; padding: 0; border: none; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; cursor: pointer; }
    .an-switch-track { display: inline-flex; align-items: center; width: 30px; height: 18px; padding: 1px; box-sizing: border-box; border-radius: 999px; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l2); }
    .an-switch-thumb { width: 12px; height: 12px; border-radius: 50%; background: var(--dsw-alias-label-secondary); transition: transform 120ms ease; }
    .an-switch-on { color: var(--dsw-alias-label-primary); }
    .an-switch-on .an-switch-track { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); }
    .an-switch-on .an-switch-thumb { background: #fff; transform: translateX(12px); }
    .an-volume { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
    .an-range { width: 96px; accent-color: var(--dsw-alias-brand-primary); cursor: pointer; }
    .an-range:disabled { opacity: 0.5; cursor: default; }
    .an-value { min-width: 36px; font-variant-numeric: tabular-nums; }
    .an-status-ok { font-size: 12px; color: var(--dsw-alias-state-success-primary); }
    .an-status-error { font-size: 12px; color: var(--dsw-alias-state-error-primary); overflow-wrap: anywhere; }
    `

    const DEFAULT_PREFS = { banner: true, desktop: true, sound: true, volume: 80 }

    function fill(template, values) {
      return String(template).replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match))
    }

    function createStore(initial) {
      let value = initial
      const listeners = new Set()
      return {
        get() {
          return value
        },
        set(next) {
          value = next
          for (const listener of [...listeners]) {
            try {
              listener()
            } catch {
              /* A broken subscriber must not stop the others. */
            }
          }
        },
        subscribe(listener) {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
      }
    }

    const prefsStore = createStore({ ...DEFAULT_PREFS })
    const noticesStore = createStore([])
    let nextNoticeId = 1

    function useStoreValue(store) {
      const [value, setValue] = useState(store.get)
      useEffect(() => {
        setValue(store.get)
        return store.subscribe(() => setValue(store.get()))
      }, [store])
      return value
    }

    function readPrefs() {
      try {
        const raw = window.localStorage.getItem(PREFS_KEY)
        if (raw === null || raw === '') return { ...DEFAULT_PREFS }
        const parsed = JSON.parse(raw)
        if (parsed === null || typeof parsed !== 'object') return { ...DEFAULT_PREFS }
        const level = Number(parsed.volume)
        return {
          banner: parsed.banner !== false,
          desktop: parsed.desktop !== false,
          sound: parsed.sound !== false,
          volume: Number.isFinite(level) ? Math.min(100, Math.max(0, Math.round(level))) : DEFAULT_PREFS.volume,
        }
      } catch {
        return { ...DEFAULT_PREFS }
      }
    }

    function savePrefs(next) {
      prefsStore.set(next)
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(next))
      } catch {
        /* Private mode can refuse storage; the value still applies to this view. */
      }
    }

    function desktopPermission() {
      try {
        if (typeof window.Notification !== 'function') return 'unsupported'
        return window.Notification.permission
      } catch {
        return 'unsupported'
      }
    }

    const ACUTE_CHIME = { done: [[659, 0, 0.16], [988, 0.14, 0.22]], input: [[880, 0, 0.14], [1174, 0.16, 0.16], [1174, 0.34, 0.2]] }
    let audioContext = null

    function audioFor() {
      try {
        if (audioContext === null) {
          const Ctor = window.AudioContext || window.webkitAudioContext
          if (typeof Ctor !== 'function') return null
          audioContext = new Ctor()
        }
        if (audioContext.state === 'suspended') void audioContext.resume()
        return audioContext
      } catch {
        return null
      }
    }

    function closeAudio() {
      try {
        if (audioContext !== null) void audioContext.close()
      } catch {
        /* A closed device needs no second attempt. */
      }
      audioContext = null
    }

    const MAX_TONE_GAIN = 0.6

    function tone(context, frequency, offset, duration, peak) {
      const start = context.currentTime + offset
      const loudest = Math.min(0.95, Math.max(0.0002, peak))
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(loudest, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + duration + 0.03)
    }

    function playChime(kind) {
      const volume = Number(prefsStore.get().volume)
      if (!Number.isFinite(volume) || volume <= 0) return
      const context = audioFor()
      if (context === null) return
      const peak = (MAX_TONE_GAIN * Math.min(100, volume)) / 100
      for (const step of ACUTE_CHIME[kind] ?? ACUTE_CHIME.done) tone(context, step[0], step[1], step[2], peak)
    }

    function dismissNotice(id) {
      noticesStore.set(noticesStore.get().filter((notice) => notice.id !== id))
    }

    function addNotice(notice) {
      const id = nextNoticeId
      nextNoticeId += 1
      noticesStore.set([{ ...notice, id }, ...noticesStore.get()].slice(0, VISIBLE_LIMIT))
      window.setTimeout(() => dismissNotice(id), DISMISS_MS)
    }

    function showDesktop(title, body) {
      try {
        if (desktopPermission() !== 'granted') return
        const notice = new window.Notification(title, { body, tag: 'dsh-agent-notify', silent: true })
        notice.onclick = () => {
          try {
            window.focus()
          } catch {
            /* A refused focus leaves the window as it is. */
          }
          notice.close()
        }
      } catch {
        /* A refused notice must not break the page. */
      }
    }

    function NoticeCard({ notice, t, onOpen }) {
      const waiting = notice.kind === 'input'
      const name = typeof notice.title === 'string' && notice.title !== '' ? notice.title : t('untitled')
      return h(
        'div',
        { className: waiting ? 'an-card an-card-waiting' : 'an-card' },
        h('span', { className: 'an-dot', 'aria-hidden': true }),
        h(
          'div',
          { className: 'an-body' },
          h('span', { className: 'an-title' }, waiting ? t('input') : t('done')),
          h('span', { className: 'an-text' }, fill(waiting ? t('inputBody') : t('doneBody'), { title: name })),
        ),
        h(
          'div',
          { className: 'an-actions' },
          h('button', { type: 'button', className: 'an-button', onClick: () => onOpen(notice.sessionId) }, t('open')),
          h(
            'button',
            { type: 'button', className: 'an-close', 'aria-label': t('close'), onClick: () => dismissNotice(notice.id) },
            '\u00d7',
          ),
        ),
      )
    }

    function NoticeStack({ t, onOpen }) {
      const notices = useStoreValue(noticesStore)
      const prefs = useStoreValue(prefsStore)
      if (!prefs.banner || notices.length === 0) return null
      return h(
        'div',
        { className: 'an-stack' },
        h('style', null, CSS),
        notices.map((notice) => h(NoticeCard, { key: notice.id, notice, t, onOpen })),
      )
    }

    function formatBytes(bytes, t) {
      if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return t('sizesUnavailable')
      if (bytes <= 0) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB']
      let value = bytes
      let unit = 0
      while (value >= 1024 && unit < units.length - 1) {
        value /= 1024
        unit += 1
      }
      const rounded = unit === 0 ? String(bytes) : value.toFixed(1)
      return `${rounded} ${units[unit]}`
    }

    function formatDate(iso) {
      if (typeof iso !== 'string' || iso === '') return null
      const when = new Date(iso)
      if (Number.isNaN(when.getTime())) return null
      return when.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    }

    function useArchivedSessions() {
      const [state, setState] = useState({ phase: 'loading', sessions: [], error: null })
      const load = useCallback(async () => {
        setState((previous) => ({ ...previous, phase: previous.sessions.length === 0 ? 'loading' : previous.phase, error: null }))
        try {
          const response = await fetch(LIST, { headers: { accept: 'application/json' }, credentials: 'same-origin' })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const body = await response.json()
          const sessions = Array.isArray(body?.sessions) ? body.sessions : []
          setState({ phase: 'ready', sessions, error: null })
        } catch (error) {
          setState({ phase: 'error', sessions: [], error: error instanceof Error ? error.message : String(error) })
        }
      }, [])
      useEffect(() => {
        void load()
      }, [load])
      return { ...state, reload: load }
    }

    function SessionRow({ session, checked, onToggle, onDelete, t }) {
      const title = session.title ?? t('sessionFallback')
      const date = formatDate(session.createdAt)
      return h(
        'div',
        { className: 'tk-row' },
        h('input', {
          type: 'checkbox',
          checked,
          'aria-label': title,
          onChange: () => onToggle(session.id),
        }),
        h(
          'div',
          { className: 'tk-main' },
          h('span', { className: 'tk-title', title }, title),
          h(
            'div',
            { className: 'tk-meta' },
            h('span', null, session.workspace ?? t('noWorkspace')),
            date === null ? null : h('span', null, date),
            h('span', null, formatBytes(session.bytes, t)),
            session.children > 0 ? h('span', null, fill(t('childCount'), { n: session.children })) : null,
            session.live ? h('span', { className: 'tk-badge' }, t('running')) : null,
          ),
        ),
        h(
          'div',
          { className: 'tk-actions' },
          h('button', { type: 'button', className: 'tk-button', onClick: () => onDelete([session.id]) }, t('deleteOne')),
        ),
      )
    }

    function ConfirmDialog({ count, children, sessions, runningNames, busy, onCancel, onConfirm, t }) {
      const shown = sessions.slice(0, 5)
      const extra = Math.max(0, sessions.length - shown.length)
      return h(
        'div',
        { className: 'tk-overlay', role: 'presentation' },
        h(
          'div',
          { className: 'tk-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': fill(t('confirmTitle'), { n: count }) },
          h('h3', null, fill(t('confirmTitle'), { n: count })),
          h(
            'ul',
            { className: 'tk-titles' },
            shown.map((session) => h('li', { key: session.id }, session.title ?? t('sessionFallback'))),
          ),
          extra > 0 ? h('p', null, fill(t('confirmMore'), { n: extra })) : null,
          children > 0 ? h('p', null, fill(t('confirmChildren'), { n: children })) : null,
          runningNames.length > 0 ? h('p', null, fill(t('confirmRunning'), { names: runningNames.join(', ') })) : null,
          h('p', null, t('confirmPermanent')),
          h(
            'div',
            { className: 'tk-dialog-actions' },
            h('button', { type: 'button', className: 'tk-button', onClick: onCancel, disabled: busy }, t('cancel')),
            h('button', { type: 'button', className: 'tk-button tk-button-primary', onClick: onConfirm, disabled: busy }, t('confirmAction')),
          ),
        ),
      )
    }

    function ArchivedSessionsTab({ t }) {
      const list = useArchivedSessions()
      const [selected, setSelected] = useState(() => new Set())
      const [confirming, setConfirming] = useState(false)
      const [busy, setBusy] = useState(false)
      const [report, setReport] = useState(null)

      const sessions = list.sessions
      const chosen = useMemo(() => sessions.filter((session) => selected.has(session.id)), [sessions, selected])
      const chosenBytes = useMemo(
        () => chosen.reduce((total, session) => total + (typeof session.bytes === 'number' ? session.bytes : 0), 0),
        [chosen],
      )
      const chosenChildren = useMemo(
        () => chosen.reduce((total, session) => total + (typeof session.children === 'number' ? session.children : 0), 0),
        [chosen],
      )
      const allChecked = sessions.length > 0 && chosen.length === sessions.length

      const toggle = useCallback((id) => {
        setSelected((previous) => {
          const next = new Set(previous)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
      }, [])

      const toggleAll = useCallback(() => {
        setSelected((previous) => (previous.size === sessions.length ? new Set() : new Set(sessions.map((s) => s.id))))
      }, [sessions])

      const remove = useCallback(
        async (ids) => {
          if (ids.length === 0) return
          setBusy(true)
          setReport(null)
          try {
            const response = await fetch(DELETE, {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'content-type': 'application/json', 'x-archived-sessions': '1' },
              body: JSON.stringify({ ids }),
            })
            const body = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`)
            setReport({
              deleted: Array.isArray(body.deleted) ? body.deleted : [],
              skipped: Array.isArray(body.skipped) ? body.skipped : [],
              notCleared: Array.isArray(body.notCleared) ? body.notCleared : [],
              freedBytes: typeof body.freedBytes === 'number' ? body.freedBytes : 0,
              childrenDeleted: typeof body.childrenDeleted === 'number' ? body.childrenDeleted : 0,
              cascadeUnknown: body.cascadeUnknown === true,
              error: null,
            })
            setSelected(new Set())
            setConfirming(false)
            await list.reload()
            if (Array.isArray(body.deleted) && body.deleted.length > 0) {
              setTimeout(() => window.location.reload(), 2000)
            }
          } catch (error) {
            setReport({
              deleted: [],
              skipped: [],
              notCleared: [],
              freedBytes: 0,
              childrenDeleted: 0,
              cascadeUnknown: false,
              error: error instanceof Error ? error.message : String(error),
            })
            setConfirming(false)
          } finally {
            setBusy(false)
          }
        },
        [list],
      )

      const body =
        list.phase === 'loading'
          ? h('p', { className: 'tk-note' }, t('loading'))
          : list.phase === 'error'
            ? h(
                'div',
                null,
                h('p', { className: 'tk-error' }, `${t('errorList')} ${list.error ?? ''}`),
                h('button', { type: 'button', className: 'tk-button', onClick: () => void list.reload() }, t('retry')),
              )
            : sessions.length === 0
              ? h('p', { className: 'tk-note' }, t('empty'))
              : h(
                  'div',
                  { className: 'tk-list' },
                  sessions.map((session) =>
                    h(SessionRow, {
                      key: session.id,
                      session,
                      checked: selected.has(session.id),
                      onToggle: toggle,
                      onDelete: (ids) => {
                        setSelected(new Set(ids))
                        setConfirming(true)
                      },
                      t,
                    }),
                  ),
                )

      return h(
        'div',
        { className: 'tk-page' },
        h('style', null, CSS),
        h('p', { className: 'tk-intro' }, t('intro')),
        h(
          'div',
          { className: 'tk-bar' },
          h(
            'button',
            { type: 'button', className: 'tk-button', onClick: toggleAll, disabled: sessions.length === 0 || busy },
            allChecked ? t('clearSelection') : t('selectAll'),
          ),
          chosen.length > 0 ? h('span', { className: 'tk-count' }, fill(t('selectedCount'), { n: chosen.length })) : null,
          chosen.length > 0 ? h('span', { className: 'tk-count' }, formatBytes(chosenBytes, t)) : null,
          chosen.length > 0
            ? h(
                'button',
                { type: 'button', className: 'tk-button tk-button-danger', onClick: () => setConfirming(true), disabled: busy },
                t('deleteSelected'),
              )
            : null,
        ),
        report === null
          ? null
          : h(
              'div',
              null,
              report.error === null
                ? h(
                    'p',
                    { className: 'tk-ok' },
                    fill(
                      report.childrenDeleted > 0 ? t('resultDeletedChildren') : t('resultDeleted'),
                      {
                        n: report.deleted.length,
                        children: report.childrenDeleted,
                        size: formatBytes(report.freedBytes, t),
                      },
                    ),
                  )
                : h('p', { className: 'tk-error' }, `${t('errorDelete')} ${report.error}`),
              report.skipped.length === 0
                ? null
                : h(
                    'p',
                    { className: 'tk-note' },
                    fill(t('resultSkipped'), { lines: report.skipped.map((entry) => `${entry.id}: ${entry.reason}`).join('; ') }),
                  ),
              (report.notCleared ?? []).length === 0
                ? null
                : h(
                    'p',
                    { className: 'tk-error' },
                    fill(t('resultNotCleared'), {
                      lines: report.notCleared.map((entry) => `${entry.id}: ${entry.reason}`).join('; '),
                    }),
                  ),
              report.cascadeUnknown
                ? h('p', { className: 'tk-note' }, t('resultCascadeUnknown'))
                : null,
              report.error === null && report.deleted.length > 0
                ? h('p', { className: 'tk-note' }, t('reloadSoon'))
                : null,
              h(
                'button',
                { type: 'button', className: 'tk-button', onClick: () => window.location.reload() },
                t('reload'),
              ),
            ),
        body,
        confirming
          ? h(ConfirmDialog, {
              count: chosen.length,
              children: chosenChildren,
              sessions: chosen,
              runningNames: chosen.filter((session) => session.live).map((session) => session.title ?? t('sessionFallback')),
              busy,
              onCancel: () => setConfirming(false),
              onConfirm: () => void remove(chosen.map((session) => session.id)),
              t,
            })
          : null,
      )
    }

    function NotifySettingsRow({ t }) {
      const prefs = useStoreValue(prefsStore)
      const [permission, setPermission] = useState(desktopPermission)

      const ask = useCallback(async () => {
        try {
          if (typeof window.Notification !== 'function') return
          const answer = await window.Notification.requestPermission()
          setPermission(answer)
        } catch {
          /* A refused prompt leaves the current permission in place. */
        }
      }, [])

      const switches = [
        { key: 'banner', label: t('bannerLabel'), on: prefs.banner },
        { key: 'desktop', label: t('desktopLabel'), on: prefs.desktop },
        { key: 'sound', label: t('soundLabel'), on: prefs.sound },
      ]

      return h(
        'div',
        { className: 'an-row' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'an-row-text' },
          h('span', { className: 'an-row-title' }, t('notifyTitle')),
          h('span', { className: 'an-row-note' }, t('notifyNote')),
        ),
        h(
          'div',
          { className: 'an-row-controls' },
          switches.map((entry) =>
            h(
              'button',
              {
                key: entry.key,
                type: 'button',
                role: 'switch',
                'aria-checked': entry.on ? 'true' : 'false',
                className: entry.on ? 'an-switch an-switch-on' : 'an-switch',
                onClick: () => savePrefs({ ...prefsStore.get(), [entry.key]: !entry.on }),
              },
              h('span', { className: 'an-switch-track', 'aria-hidden': true }, h('span', { className: 'an-switch-thumb' })),
              h('span', null, entry.label),
            ),
          ),
          permission === 'default' || permission === 'denied'
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'an-button',
                  onClick: () => void ask(),
                  disabled: permission === 'denied',
                  title: permission === 'denied' ? t('desktopBlocked') : undefined,
                },
                t('desktopAllow'),
              )
            : null,
          h(
            'button',
            {
              type: 'button',
              className: 'an-button',
              onClick: () => playChime('input'),
              disabled: !prefs.sound,
            },
            t('testLabel'),
          ),
          h(
            'label',
            { className: 'an-volume' },
            h('span', null, t('volumeLabel')),
            h('input', {
              className: 'an-range',
              type: 'range',
              min: 0,
              max: 100,
              step: 5,
              value: prefs.volume,
              disabled: !prefs.sound,
              'aria-label': t('volumeLabel'),
              onChange: (event) => savePrefs({ ...prefsStore.get(), volume: Number(event.target.value) }),
              onPointerUp: () => playChime('input'),
            }),
            h('span', { className: 'an-value' }, `${prefs.volume}%`),
          ),
        ),
      )
    }

    function TelegramRow({ t }) {
      const [state, setState] = useState('idle')
      const [detail, setDetail] = useState('')

      const send = useCallback(async () => {
        setState('sending')
        setDetail('')
        try {
          const response = await fetch(ENDPOINT_TEST, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { accept: 'application/json' },
          })
          let body
          try {
            body = await response.json()
          } catch {
            body = undefined
          }
          if (response.ok && body?.ok === true) {
            setState('ok')
            return
          }
          const reason = typeof body?.error === 'string' && body.error !== '' ? body.error : `HTTP ${response.status}`
          setState('error')
          setDetail(String(reason).slice(0, 160))
        } catch {
          setState('error')
          setDetail('network error')
        }
      }, [])

      return h(
        'div',
        { className: 'an-row' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'an-row-text' },
          h('span', { className: 'an-row-title' }, t('tgTitle')),
          h('span', { className: 'an-row-note' }, t('tgNote')),
        ),
        h(
          'div',
          { className: 'an-row-controls' },
          state === 'ok' ? h('span', { className: 'an-status-ok' }, t('tgSent')) : null,
          state === 'error'
            ? h('span', { className: 'an-status-error' }, detail === '' ? t('tgFailed') : `${t('tgFailed')}: ${detail}`)
            : null,
          h(
            'button',
            {
              type: 'button',
              className: 'an-button',
              disabled: state === 'sending',
              onClick: () => void send(),
            },
            state === 'sending' ? t('tgSending') : t('tgSend'),
          ),
        ),
      )
    }

    function NotifyTab({ t }) {
      return h(
        'div',
        { className: 'tk-page' },
        h('style', null, CSS),
        h(NotifySettingsRow, { t }),
        h(TelegramRow, { t }),
      )
    }

    function StyleTab({ t }) {
      const [state, setState] = useState('loading')
      const [enabled, setEnabled] = useState(true)

      useEffect(() => {
        let disposed = false
        const read = async () => {
          try {
            const response = await fetch(STE_STATE, { credentials: 'same-origin', headers: { accept: 'application/json' } })
            if (disposed || !response.ok) return
            const body = await response.json()
            setEnabled(body?.enabled !== false)
            setState('ready')
          } catch {
            if (!disposed) setState('error')
          }
        }
        void read()
        return () => {
          disposed = true
        }
      }, [])

      const toggle = useCallback(async () => {
        const next = !enabled
        setState('saving')
        try {
          const response = await fetch(STE_SET, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ enabled: next }),
          })
          const body = await response.json().catch(() => ({}))
          if (!response.ok || body?.saved !== true) throw new Error(body?.error ?? `HTTP ${response.status}`)
          setEnabled(next)
          setState('ready')
        } catch {
          setState('error')
        }
      }, [enabled])

      return h(
        'div',
        { className: 'an-row' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'an-row-text' },
          h('span', { className: 'an-row-title' }, t('steTitle')),
          h('span', { className: 'an-row-note' }, t('steNote')),
          state === 'loading'
            ? h('span', { className: 'an-row-note' }, t('loading'))
            : state === 'error'
              ? h('span', { className: 'an-status-error' }, t('steFailed'))
              : h('span', { className: 'an-row-note' }, enabled ? t('steOn') : t('steOff')),
        ),
        h(
          'div',
          { className: 'an-row-controls' },
          h(
            'button',
            {
              type: 'button',
              role: 'switch',
              'aria-checked': enabled ? 'true' : 'false',
              'aria-label': t('steToggle'),
              className: enabled ? 'an-switch an-switch-on' : 'an-switch',
              disabled: state === 'loading' || state === 'saving',
              onClick: () => void toggle(),
            },
            h('span', { className: 'an-switch-track', 'aria-hidden': true }, h('span', { className: 'an-switch-thumb' })),
            h('span', null, state === 'saving' ? t('steBusy') : enabled ? t('steOn') === '' ? '' : t('steToggle') : t('steToggle')),
          ),
        ),
      )
    }

    function ToolkitSection({ t }) {
      const [tab, setTab] = useState('sessions')
      return h(
        'div',
        { className: 'tk-page' },
        h('style', null, CSS),
        h('p', { className: 'tk-intro' }, t('sectionIntro')),
        h(
          'div',
          { className: 'tk-tabs', role: 'tablist' },
          h(
            'button',
            {
              type: 'button',
              role: 'tab',
              'aria-selected': tab === 'sessions' ? 'true' : 'false',
              className: tab === 'sessions' ? 'tk-tab tk-tab-on' : 'tk-tab',
              onClick: () => setTab('sessions'),
            },
            t('tabSessions'),
          ),
          h(
            'button',
            {
              type: 'button',
              role: 'tab',
              'aria-selected': tab === 'notify' ? 'true' : 'false',
              className: tab === 'notify' ? 'tk-tab tk-tab-on' : 'tk-tab',
              onClick: () => setTab('notify'),
            },
            t('tabNotify'),
          ),
          h(
            'button',
            {
              type: 'button',
              role: 'tab',
              'aria-selected': tab === 'style' ? 'true' : 'false',
              className: tab === 'style' ? 'tk-tab tk-tab-on' : 'tk-tab',
              onClick: () => setTab('style'),
            },
            t('tabStyle'),
          ),
        ),
        tab === 'sessions' ? h(ArchivedSessionsTab, { t }) : tab === 'notify' ? h(NotifyTab, { t }) : h(StyleTab, { t }),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const asDisposer = (value) => (typeof value === 'function' ? value : () => {})
        const plain = (key, params) => fill(EN[key] ?? key, params ?? {})
        let t = plain
        try {
          ctx.effect(() => asDisposer(ctx.locale.register(NS, 'en', EN)))
          ctx.effect(() => asDisposer(ctx.locale.register(NS, 'zh', ZH)))
          const bound = ctx.locale.bind(NS)
          t = (key, params) => {
            let text
            try {
              text = bound(key)
            } catch {
              text = undefined
            }
            return fill(typeof text === 'string' && text !== key ? text : (EN[key] ?? key), params ?? {})
          }
        } catch {
          t = plain
        }

        ctx.effect(() => {
          prefsStore.set(readPrefs())
        })

        ctx.effect(() => () => {
          closeAudio()
        })

        /* Ask the Host for new notices on a short interval. */
        ctx.effect(() => {
          let cursor = null
          let disposed = false

          const deliver = (notice) => {
            const waiting = notice.kind === 'input'
            const name = typeof notice.title === 'string' && notice.title !== '' ? notice.title : t('untitled')
            const body = fill(waiting ? t('inputBody') : t('doneBody'), { title: name })
            const prefs = prefsStore.get()
            addNotice({ kind: notice.kind, sessionId: notice.sessionId, title: notice.title })
            if (prefs.desktop) showDesktop(waiting ? t('input') : t('done'), body)
            if (prefs.sound) playChime(waiting ? 'input' : 'done')
          }

          const tick = async () => {
            if (disposed) return
            try {
              const query = cursor === null ? '' : `?since=${cursor}`
              const response = await fetch(`${ENDPOINT}${query}`, {
                credentials: 'same-origin',
                headers: { accept: 'application/json' },
              })
              if (disposed || !response.ok) return
              const body = await response.json()
              const next = Number(body?.cursor)
              if (Number.isFinite(next) && next >= 0) cursor = next
              for (const notice of Array.isArray(body?.notices) ? body.notices : []) {
                if (notice?.kind !== 'done' && notice?.kind !== 'input') continue
                deliver(notice)
              }
            } catch {
              /* The Host is not ready, or the page is offline. */
            }
          }

          const timer = window.setInterval(() => void tick(), POLL_MS)
          void tick()
          return () => {
            disposed = true
            window.clearInterval(timer)
          }
        })

        const openSession = (sessionId) => {
          try {
            const service = ctx.get('uiWorkspace')
            if (service && typeof service.openSession === 'function') service.openSession(sessionId)
          } catch {
            /* A refused navigation leaves the frame as it is. */
          }
        }

        const StackWithLocale = (props) => h(NoticeStack, { ...props, t, onOpen: openSession })
        const SectionWithLocale = (props) => h(ToolkitSection, { ...props, t })

        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register({ name: 'shell.overlay', id: NS, order: 40 }, StackWithLocale),
        )
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            { name: 'settings.section', id: NS, order: 30, label: () => t('sectionTitle') },
            SectionWithLocale,
          ),
        )
        ctx.slots.inject('settings.general.item', () =>
          ctx.slots.register({ name: 'settings.general.item', id: `${NS}-notify`, order: 40 }, (props) => h(NotifySettingsRow, { ...props, t })),
        )
        ctx.slots.inject('settings.general.item', () =>
          ctx.slots.register({ name: 'settings.general.item', id: `${NS}-telegram`, order: 41 }, (props) => h(TelegramRow, { ...props, t })),
        )
      },
    }
  },
})
