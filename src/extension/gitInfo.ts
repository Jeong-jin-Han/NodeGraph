import * as cp from 'child_process'

function run(cmd: string, cwd: string): string {
  try {
    return cp.execSync(cmd, { cwd, timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim()
  } catch {
    return ''
  }
}

// Turns any of GitHub's remote URL forms (https, git+ssh, .git suffix or not)
// into "owner/repo". Returns null for anything that isn't a github.com remote.
function parseGitHubOwnerRepo(remoteUrl: string): string | null {
  const m = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/)
  return m ? `${m[1]}/${m[2]}` : null
}

// Resolves "https://github.com/<owner>/<repo>/blob/<commit-sha>" for the git
// repo containing `dir`, pinned to the exact commit checked out at export time
// (not a branch name) so the export always points at the code as it existed
// when the HTML was generated. Returns null if `dir` isn't inside a git repo,
// has no github.com origin, or git isn't installed — callers must degrade
// 'code' links to inert text in that case, the same way canvasImages already
// degrade for HTML export (see NODEGRAPH_SPEC.md's CanvasImage schema note).
export function resolveGitHubBase(dir: string): string | null {
  const remote = run('git remote get-url origin', dir)
  if (!remote) return null
  const ownerRepo = parseGitHubOwnerRepo(remote)
  if (!ownerRepo) return null
  const sha = run('git rev-parse HEAD', dir)
  if (!sha) return null
  return `https://github.com/${ownerRepo}/blob/${sha}`
}

// The repo root relative to `dir`, as a POSIX-style prefix ("" if dir is the
// root, "sub/dir/" otherwise) — needed because a 'code' link's target is
// relative to the graph JSON's own directory, but a GitHub blob URL path is
// relative to the repo root.
export function resolveRepoRelativePrefix(dir: string): string {
  const topLevel = run('git rev-parse --show-toplevel', dir)
  if (!topLevel) return ''
  const rel = dir.replace(/\\/g, '/').replace(topLevel.replace(/\\/g, '/'), '').replace(/^\/+/, '')
  return rel ? `${rel}/` : ''
}
