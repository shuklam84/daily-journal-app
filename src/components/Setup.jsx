import { useState, useEffect, useRef } from 'react'
import { BookOpen, Key, GitBranch, AlertCircle, Loader2, ChevronDown, Plus } from 'lucide-react'
import { createGitHubClient } from '../lib/github'

const NEW_REPO_VALUE = '__new__'

export default function Setup({ onComplete }) {
  const [token, setToken] = useState('')
  const [repos, setRepos] = useState([])       // fetched from GitHub
  const [repoValue, setRepoValue] = useState('daily-journal-app') // selected or typed
  const [newRepoName, setNewRepoName] = useState('daily-journal-app')
  const [fetchingRepos, setFetchingRepos] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fetchTimer = useRef(null)

  // Auto-fetch repos when token looks valid (starts with ghp_ or github_pat_)
  useEffect(() => {
    if (fetchTimer.current) clearTimeout(fetchTimer.current)
    const trimmed = token.trim()
    if (trimmed.length < 20) { setRepos([]); return }
    fetchTimer.current = setTimeout(async () => {
      setFetchingRepos(true)
      try {
        const client = createGitHubClient(trimmed)
        const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
          headers: { Authorization: `Bearer ${trimmed}`, Accept: 'application/vnd.github+json' }
        })
        if (!res.ok) { setRepos([]); return }
        const data = await res.json()
        const names = data.map(r => r.name)
        setRepos(names)
        // Default to my-journal if it exists, otherwise prompt to create it
        if (names.includes('daily-journal-app')) {
          setRepoValue('daily-journal-app')
        } else if (names.includes('my-journal')) {
          setRepoValue('my-journal')
        } else {
          setRepoValue(NEW_REPO_VALUE)
          setNewRepoName('daily-journal-app')
        }
      } catch {
        setRepos([])
      } finally {
        setFetchingRepos(false)
      }
    }, 600)
  }, [token])

  const selectedRepo = repoValue === NEW_REPO_VALUE ? newRepoName : repoValue

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const client = createGitHubClient(token.trim())
      const user = await client.getUser()
      await client.ensureRepo(user.login, selectedRepo.trim())
      const config = { token: token.trim(), repo: selectedRepo.trim(), username: user.login, avatar: user.avatar_url }
      localStorage.setItem('journal_config', JSON.stringify(config))
      onComplete(config, client, user)
    } catch (e) {
      setError(e.message.includes('Bad credentials') ? 'Invalid token — check it and try again.' : e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-2xl mb-4">
            <BookOpen className="w-8 h-8 text-amber-700" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Daily Journal</h1>
          <p className="text-gray-500 mt-2">Your private, GitHub-backed journal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              GitHub Personal Access Token
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                required
                className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
              {fetchingRepos && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 animate-spin" />
              )}
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=Daily+Journal"
                target="_blank"
                rel="noreferrer"
                className="text-amber-600 hover:underline inline-flex items-center gap-1"
              >
                <GitBranch className="w-3 h-3" />
                Create a token
              </a>
              {' '}with <code className="bg-gray-100 px-1 rounded text-xs">repo</code> scope (or{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">Contents: read/write</code> for fine-grained tokens)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Journal repository
            </label>
            {repos.length > 0 ? (
              <>
                <div className="relative">
                  <select
                    value={repoValue}
                    onChange={e => setRepoValue(e.target.value)}
                    className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white pr-9"
                  >
                    {repos.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                    <option value={NEW_REPO_VALUE}>+ Create new repo…</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {repoValue === NEW_REPO_VALUE && (
                  <input
                    type="text"
                    value={newRepoName}
                    onChange={e => setNewRepoName(e.target.value)}
                    placeholder="daily-journal-app"
                    required
                    autoFocus
                    className="mt-2 w-full px-3 py-2.5 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  />
                )}
              </>
            ) : (
              <input
                type="text"
                value={repoValue === NEW_REPO_VALUE ? newRepoName : repoValue}
                onChange={e => setRepoValue(e.target.value)}
                placeholder="daily-journal-app"
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            )}
            <p className="mt-1.5 text-xs text-gray-500">
              {repos.length > 0
                ? 'Pick an existing repo or create a new private one.'
                : 'A private repo will be created if it doesn\'t exist.'}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token || !selectedRepo.trim()}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
            {loading ? 'Connecting…' : 'Connect & Start Writing'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Your token is stored only in your browser. Entries are saved as private files in your GitHub repo.
        </p>
      </div>
    </div>
  )
}
