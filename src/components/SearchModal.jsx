import { useState, useEffect, useRef } from 'react'
import { Search, X, Calendar, Tag, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import Fuse from 'fuse.js'

const MOOD_EMOJI = { 1: '😢', 2: '😕', 3: '😐', 4: '😊', 5: '😄' }

export default function SearchModal({ isOpen, onClose, onSelectDate, entries, entryCache, onLoadAll, allLoaded }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
      if (!allLoaded) onLoadAll()
    }
  }, [isOpen])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const docs = Object.values(entryCache)
    const fuse = new Fuse(docs, {
      keys: [
        { name: 'content', weight: 0.5 },
        { name: 'tags', weight: 0.3 },
        { name: 'date', weight: 0.2 },
      ],
      threshold: 0.4,
      includeMatches: false,
      minMatchCharLength: 2,
    })
    setResults(fuse.search(query).slice(0, 20))
  }, [query, entryCache])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search your journal…"
            className="flex-1 text-base outline-none text-gray-800 placeholder-gray-400"
          />
          {!allLoaded && <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" title="Loading all entries…" />}
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query && (
            <p className="text-sm text-gray-400 text-center py-10">
              Type to search across all your entries
            </p>
          )}
          {query && results.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">No entries found</p>
          )}
          {results.map(({ item }) => {
            const plainText = item.content?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
            const snippet = plainText?.length > 120 ? plainText.slice(0, 120) + '…' : plainText
            return (
              <button
                key={item.date}
                onClick={() => { onSelectDate(item.date); onClose() }}
                className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {format(parseISO(item.date), 'EEEE, MMMM d, yyyy')}
                  </span>
                  {item.mood && <span className="text-base">{MOOD_EMOJI[item.mood]}</span>}
                </div>
                {item.tags?.length > 0 && (
                  <div className="flex items-center gap-1 mb-1">
                    <Tag className="w-3 h-3 text-gray-300" />
                    {item.tags.map(t => (
                      <span key={t} className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">#{t}</span>
                    ))}
                  </div>
                )}
                {snippet && <p className="text-xs text-gray-500 leading-relaxed">{snippet}</p>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
