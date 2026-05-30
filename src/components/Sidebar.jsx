import { useState, useMemo } from 'react'
import { format, parseISO, isToday } from 'date-fns'
import { Search, BookOpen, PenLine, LogOut, X, ChevronDown, ChevronRight } from 'lucide-react'

const MOOD_EMOJI = { 1: '😢', 2: '😕', 3: '😐', 4: '😊', 5: '😄' }

function groupByMonth(dates) {
  const groups = {}
  for (const d of dates) {
    const key = d.substring(0, 7) // YYYY-MM
    if (!groups[key]) groups[key] = []
    groups[key].push(d)
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

export default function Sidebar({ entries, entryMeta, currentDate, onSelectDate, onSearch, user, onLogout, isOpen, onClose }) {
  const [collapsed, setCollapsed] = useState({})

  const grouped = useMemo(() => groupByMonth(entries), [entries])

  function toggleMonth(key) {
    setCollapsed(c => ({ ...c, [key]: !c[key] }))
  }

  return (
    <div className={`
      flex flex-col bg-amber-50 border-r border-amber-100 h-full
      w-64 flex-shrink-0
      ${isOpen ? 'flex' : 'hidden lg:flex'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-amber-100">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-600" />
          <span className="font-semibold text-gray-800">Daily Journal</span>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-amber-100">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Today button */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => { onSelectDate(format(new Date(), 'yyyy-MM-dd')); onClose() }}
          className="w-full flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
        >
          <PenLine className="w-4 h-4" />
          Today's Entry
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <button
          onClick={onSearch}
          className="w-full flex items-center gap-2 text-gray-500 bg-white border border-gray-200 hover:border-amber-300 text-sm px-3 py-2 rounded-lg transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>Search entries…</span>
        </button>
      </div>

      {/* Entry list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {entries.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-4 px-4">
            No entries yet. Start writing today!
          </p>
        ) : (
          grouped.map(([month, dates]) => {
            const label = format(parseISO(`${month}-01`), 'MMMM yyyy')
            const isCollapsed = collapsed[month]
            return (
              <div key={month} className="mb-1">
                <button
                  onClick={() => toggleMonth(month)}
                  className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-600"
                >
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {label}
                </button>
                {!isCollapsed && dates.map(date => {
                  const meta = entryMeta[date]
                  const active = date === currentDate
                  const today = isToday(parseISO(date))
                  return (
                    <button
                      key={date}
                      onClick={() => { onSelectDate(date); onClose() }}
                      className={`
                        w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-colors mb-0.5
                        ${active ? 'bg-amber-200 text-amber-900' : 'hover:bg-amber-100 text-gray-700'}
                      `}
                    >
                      <span className="flex-1 truncate">
                        {today ? 'Today' : format(parseISO(date), 'MMM d')}
                        {meta?.tags?.length > 0 && (
                          <span className="ml-1 text-xs text-gray-400">#{meta.tags[0]}</span>
                        )}
                      </span>
                      {meta?.mood && <span className="text-base">{MOOD_EMOJI[meta.mood]}</span>}
                    </button>
                  )
                })}
              </div>
            )
          })
        )}
      </div>

      {/* User footer */}
      {user && (
        <div className="border-t border-amber-100 px-3 py-3 flex items-center gap-2">
          <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full" />
          <span className="text-sm text-gray-600 flex-1 truncate">@{user.login}</span>
          <button
            onClick={onLogout}
            title="Log out"
            className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
