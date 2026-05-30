import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { format, parseISO, isToday } from 'date-fns'
import { Save, CheckCircle, AlertCircle, Menu, Cloud, Loader2 } from 'lucide-react'
import { createGitHubClient } from './lib/github'
import Setup from './components/Setup'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import MoodPicker from './components/MoodPicker'
import TagInput from './components/TagInput'
import SearchModal from './components/SearchModal'

const TODAY = format(new Date(), 'yyyy-MM-dd')

function SaveStatus({ status }) {
  if (status === 'saving') return (
    <span className="flex items-center gap-1.5 text-xs text-gray-400">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
    </span>
  )
  if (status === 'saved') return (
    <span className="flex items-center gap-1.5 text-xs text-green-500">
      <CheckCircle className="w-3.5 h-3.5" /> Saved
    </span>
  )
  if (status === 'error') return (
    <span className="flex items-center gap-1.5 text-xs text-red-500">
      <AlertCircle className="w-3.5 h-3.5" /> Save failed
    </span>
  )
  return null
}

export default function App() {
  const [config, setConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('journal_config')) } catch { return null }
  })
  const [client, setClient] = useState(null)
  const [user, setUser] = useState(null)

  // Entry list
  const [entryDates, setEntryDates] = useState([])
  const [entryMeta, setEntryMeta] = useState({}) // { date: { mood, tags } }

  // Current entry
  const [currentDate, setCurrentDate] = useState(TODAY)
  const [content, setContent] = useState('')
  const [mood, setMood] = useState(null)
  const [tags, setTags] = useState([])
  const [currentSha, setCurrentSha] = useState(null)
  const [entryLoading, setEntryLoading] = useState(false)

  // Search
  const [searchOpen, setSearchOpen] = useState(false)
  const [entryCache, setEntryCache] = useState({}) // all fetched entries
  const [allLoaded, setAllLoaded] = useState(false)

  // UI
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const saveTimer = useRef(null)
  const isSavingRef = useRef(false)
  const pendingSaveRef = useRef(null)

  // On mount: init client from saved config
  useEffect(() => {
    if (!config) return
    const gh = createGitHubClient(config.token)
    setClient(gh)
    setUser({ login: config.username, avatar_url: config.avatar })
    // Load entry list
    gh.listEntries(config.username, config.repo).then(dates => {
      setEntryDates(dates)
      // Preload meta for sidebar display (mood + tags only, no heavy content fetch)
    })
  }, [])

  // Load entry whenever currentDate changes
  useEffect(() => {
    if (!client || !config) return
    setEntryLoading(true)
    setSaveStatus(null)
    client.getEntry(config.username, config.repo, currentDate).then(result => {
      if (result) {
        const { entry, sha } = result
        setContent(entry.content || '')
        setMood(entry.mood ?? null)
        setTags(entry.tags ?? [])
        setCurrentSha(sha)
        setEntryCache(c => ({ ...c, [currentDate]: entry }))
        setEntryMeta(m => ({ ...m, [currentDate]: { mood: entry.mood, tags: entry.tags } }))
      } else {
        setContent('')
        setMood(null)
        setTags([])
        setCurrentSha(null)
      }
    }).catch(console.error).finally(() => setEntryLoading(false))
  }, [currentDate, client])

  // Auto-save with 2s debounce
  const scheduleSave = useCallback((newContent, newMood, newTags) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!client || !config) return
      if (isSavingRef.current) {
        pendingSaveRef.current = { content: newContent, mood: newMood, tags: newTags }
        return
      }
      isSavingRef.current = true
      setSaveStatus('saving')
      const entryData = {
        date: currentDate,
        mood: newMood,
        tags: newTags,
        content: newContent,
        updatedAt: new Date().toISOString(),
      }
      try {
        const result = await client.saveEntry(config.username, config.repo, currentDate, entryData, currentSha)
        setCurrentSha(result.content.sha)
        // Add date to list if new
        setEntryDates(prev => prev.includes(currentDate) ? prev : [currentDate, ...prev].sort((a, b) => b.localeCompare(a)))
        setEntryMeta(m => ({ ...m, [currentDate]: { mood: newMood, tags: newTags } }))
        setEntryCache(c => ({ ...c, [currentDate]: entryData }))
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus(null), 2500)
      } catch {
        setSaveStatus('error')
      } finally {
        isSavingRef.current = false
        if (pendingSaveRef.current) {
          const p = pendingSaveRef.current
          pendingSaveRef.current = null
          scheduleSave(p.content, p.mood, p.tags)
        }
      }
    }, 2000)
  }, [client, config, currentDate, currentSha])

  function handleContentChange(html) {
    setContent(html)
    scheduleSave(html, mood, tags)
  }

  function handleMoodChange(m) {
    setMood(m)
    scheduleSave(content, m, tags)
  }

  function handleTagsChange(t) {
    setTags(t)
    scheduleSave(content, mood, t)
  }

  // Collect all tags from all cached entries
  const allTags = useMemo(() => {
    const set = new Set()
    Object.values(entryCache).forEach(e => e.tags?.forEach(t => set.add(t)))
    return [...set]
  }, [entryCache])

  // Load all entries for search
  async function loadAllEntries() {
    if (!client || !config || allLoaded) return
    try {
      const all = await client.getAllEntriesContent(config.username, config.repo, entryDates)
      const map = {}
      all.forEach(e => { map[e.date] = e })
      setEntryCache(c => ({ ...c, ...map }))
      setAllLoaded(true)
    } catch (e) {
      console.error('Failed to load all entries for search', e)
    }
  }

  function handleSetupComplete(cfg, gh, u) {
    setConfig(cfg)
    setClient(gh)
    setUser(u)
    gh.listEntries(u.login, cfg.repo).then(setEntryDates)
  }

  function handleLogout() {
    if (confirm('Log out? Your entries are safe in GitHub.')) {
      localStorage.removeItem('journal_config')
      setConfig(null)
      setClient(null)
      setUser(null)
      setEntryDates([])
      setEntryCache({})
    }
  }

  if (!config) {
    return <Setup onComplete={handleSetupComplete} />
  }

  const displayDate = parseISO(currentDate)
  const isCurrentToday = isToday(displayDate)

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/20" />
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 lg:relative lg:z-auto
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar
          entries={entryDates}
          entryMeta={entryMeta}
          currentDate={currentDate}
          onSelectDate={date => { setCurrentDate(date); setSidebarOpen(false) }}
          onSearch={() => { setSearchOpen(true); setSidebarOpen(false) }}
          user={user}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-gray-100 bg-white flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-bold text-gray-900">
                {isCurrentToday ? 'Today' : format(displayDate, 'EEEE')}
              </h1>
              <span className="text-sm text-gray-400">
                {format(displayDate, 'MMMM d, yyyy')}
              </span>
            </div>
          </div>
          <SaveStatus status={saveStatus} />
        </div>

        {/* Mood + Tags bar */}
        <div className="flex items-center flex-wrap gap-4 px-4 sm:px-6 py-2.5 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
          <MoodPicker value={mood} onChange={handleMoodChange} />
          <div className="w-px h-5 bg-gray-200" />
          <TagInput tags={tags} onChange={handleTagsChange} allTags={allTags} />
        </div>

        {/* Editor */}
        {entryLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <Editor
              key={currentDate}
              content={content}
              onChange={handleContentChange}
            />
          </div>
        )}
      </div>

      {/* Search modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectDate={date => { setCurrentDate(date); setSearchOpen(false) }}
        entries={entryDates}
        entryCache={entryCache}
        onLoadAll={loadAllEntries}
        allLoaded={allLoaded}
      />
    </div>
  )
}
