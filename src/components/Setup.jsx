import { useState } from 'react'
import { BookOpen, Key, GitBranch, AlertCircle, Loader2 } from 'lucide-react'
import { createGitHubClient } from '../lib/github'

export default function Setup({ onComplete }) {
  const [token, setToken] = useState('')
  const [repo, setRepo] = useState('my-journal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const client = createGitHubClient(token.trim())
      const user = await client.getUser()
      await client.ensureRepo(user.login, repo.trim())
      const config = { token: token.trim(), repo: repo.trim(), username: user.login, avatar: user.avatar_url }
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
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
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
              Repository name
            </label>
            <input
              type="text"
              value={repo}
              onChange={e => setRepo(e.target.value)}
              placeholder="my-journal"
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
            <p className="mt-1.5 text-xs text-gray-500">A private repo will be created in your GitHub account if it doesn't exist.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token || !repo}
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
