const MOODS = [
  { value: 1, emoji: '😢', label: 'Rough' },
  { value: 2, emoji: '😕', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
]

export default function MoodPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-400 mr-1 font-medium">Mood</span>
      {MOODS.map(m => (
        <button
          key={m.value}
          title={m.label}
          onClick={() => onChange(value === m.value ? null : m.value)}
          className={`
            flex flex-col items-center px-2 py-1 rounded-lg text-lg transition-all
            ${value === m.value
              ? 'bg-amber-100 ring-2 ring-amber-400 scale-110'
              : 'hover:bg-gray-100 opacity-60 hover:opacity-100'
            }
          `}
        >
          <span>{m.emoji}</span>
          {value === m.value && (
            <span className="text-[10px] text-amber-700 font-medium leading-none mt-0.5">{m.label}</span>
          )}
        </button>
      ))}
    </div>
  )
}
