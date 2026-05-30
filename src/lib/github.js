const BASE = 'https://api.github.com'

function b64encode(str) {
  return btoa(unescape(encodeURIComponent(str)))
}

function b64decode(str) {
  return decodeURIComponent(escape(atob(str.replace(/\n/g, ''))))
}

export function createGitHubClient(token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }

  async function request(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw Object.assign(new Error(err.message || `GitHub API error: ${res.status}`), { status: res.status })
    }
    if (res.status === 204) return null
    return res.json()
  }

  async function getUser() {
    return request('/user')
  }

  async function ensureRepo(owner, repoName) {
    try {
      return await request(`/repos/${owner}/${repoName}`)
    } catch (e) {
      if (e.status !== 404) throw e
      return request('/user/repos', {
        method: 'POST',
        body: JSON.stringify({
          name: repoName,
          private: true,
          description: 'My personal journal — created by Daily Journal app',
          auto_init: true,
        }),
      })
    }
  }

  async function getEntry(owner, repo, date) {
    const path = `entries/${date}.json`
    try {
      const data = await request(`/repos/${owner}/${repo}/contents/${path}`)
      const decoded = b64decode(data.content)
      return { entry: JSON.parse(decoded), sha: data.sha }
    } catch (e) {
      if (e.status === 404) return null
      throw e
    }
  }

  async function saveEntry(owner, repo, date, entryData, sha) {
    const path = `entries/${date}.json`
    const body = {
      message: sha ? `Update journal entry ${date}` : `Add journal entry ${date}`,
      content: b64encode(JSON.stringify(entryData, null, 2)),
    }
    if (sha) body.sha = sha
    return request(`/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  async function listEntries(owner, repo) {
    try {
      const tree = await request(`/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`)
      return tree.tree
        .filter(f => f.path.startsWith('entries/') && f.path.endsWith('.json'))
        .map(f => f.path.replace('entries/', '').replace('.json', ''))
        .sort((a, b) => b.localeCompare(a))
    } catch {
      return []
    }
  }

  async function getAllEntriesContent(owner, repo, dates) {
    const results = await Promise.allSettled(
      dates.map(date => getEntry(owner, repo, date).then(r => r ? { date, ...r.entry } : null))
    )
    return results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value)
  }

  return { getUser, ensureRepo, getEntry, saveEntry, listEntries, getAllEntriesContent }
}
