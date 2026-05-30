import { useState, useRef } from 'react'
import { X, Tag } from 'lucide-react'

export default function TagInput({ tags, onChange, allTags = [] }) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)

  const suggestions = allTags.filter(
    t => t.toLowerCase().includes(input.toLowerCase()) && !tags.includes(t)
  )

  function addTag(tag) {
    const cleaned = tag.trim().toLowerCase().replace(/\s+/g, '-')
    if (cleaned && !tags.includes(cleaned)) {
      onChange([...tags, cleaned])
    }
    setInput('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  function removeTag(tag) {
    onChange(tags.filter(t => t !== tag))
  }

  function handleKeyDown(e) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap relative">
      <Tag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      {tags.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium"
        >
          #{tag}
          <button
            onClick={() => removeTag(tag)}
            className="text-amber-600 hover:text-amber-900"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <div className="relative">
        <input
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={tags.length ? '' : 'Add tags…'}
          className="text-xs text-gray-600 bg-transparent outline-none placeholder-gray-400 min-w-[80px]"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-5 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
            {suggestions.slice(0, 6).map(s => (
              <button
                key={s}
                onMouseDown={() => addTag(s)}
                className="block w-full text-left px-3 py-1.5 text-xs hover:bg-amber-50 text-gray-700"
              >
                #{s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
