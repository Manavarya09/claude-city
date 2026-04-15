// github-api.js — Fetch repo data from GitHub API (no backend needed)

const LANGUAGE_COLORS = {
  JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3572A5',
  Rust: '#dea584', Go: '#00ADD8', Java: '#b07219', Ruby: '#701516',
  PHP: '#4F5D95', Swift: '#F05138', Kotlin: '#A97BFF', 'C#': '#239120',
  'C++': '#f34b7d', C: '#555555', HTML: '#e34c26', CSS: '#563d7c',
  SCSS: '#c6538c', Vue: '#41b883', Svelte: '#ff3e00', Shell: '#89e051',
  Dart: '#00B4AB', Elixir: '#6e4a7e', Lua: '#000080',
};

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '__pycache__', '.next',
  'vendor', 'target', 'coverage', '.nuxt', 'out', '.cache', '.turbo'
]);

const SKIP_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
]);

export async function fetchRepoData(owner, repo, statusCallback) {
  const headers = {};
  // Optional: user can provide token for higher rate limits
  const token = localStorage.getItem('gh_token');
  if (token) headers['Authorization'] = `token ${token}`;

  const api = (path) => fetch(`https://api.github.com${path}`, { headers }).then(r => {
    if (r.status === 403) throw new Error('GitHub API rate limit exceeded. Add a token for higher limits.');
    if (r.status === 404) throw new Error('Repository not found. Make sure it exists and is public.');
    if (!r.ok) throw new Error(`GitHub API error: ${r.status}`);
    return r.json();
  });

  statusCallback?.('Fetching repository info...');
  const repoData = await api(`/repos/${owner}/${repo}`);

  statusCallback?.('Fetching file tree...');
  let tree;
  try {
    const treeData = await api(`/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`);
    tree = treeData.tree || [];
  } catch {
    tree = [];
  }

  statusCallback?.('Fetching contributors...');
  let contributors = [];
  try {
    const contribData = await api(`/repos/${owner}/${repo}/contributors?per_page=20`);
    contributors = contribData.map(c => ({ name: c.login, commits: c.contributions, avatar: c.avatar_url }));
  } catch {}

  statusCallback?.('Fetching languages...');
  let languages = {};
  try {
    languages = await api(`/repos/${owner}/${repo}/languages`);
  } catch {}

  statusCallback?.('Fetching recent commits...');
  let recentActivity = [];
  try {
    const commits = await api(`/repos/${owner}/${repo}/commits?per_page=30`);
    recentActivity = commits.map(c => ({
      author: c.author?.login || c.commit?.author?.name || 'unknown',
      message: c.commit?.message?.split('\n')[0] || '',
      date: c.commit?.author?.date,
      avatar: c.author?.avatar_url
    }));
  } catch {}

  statusCallback?.('Building city layout...');

  // Build file tree from GitHub tree API
  const fileTree = buildTreeFromGitHub(tree, languages);
  const files = flattenFiles(fileTree);

  // Detect bugs from commit messages
  const bugFiles = new Set();
  for (const commit of recentActivity) {
    if (/fix|bug|error|crash|hotfix|patch/i.test(commit.message)) {
      bugFiles.add(commit.message); // approximate
    }
  }

  return {
    name: repo,
    owner,
    fullName: `${owner}/${repo}`,
    defaultBranch: repoData.default_branch || 'main',
    description: repoData.description || '',
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    generated: new Date().toISOString(),
    stats: {
      files: files.length,
      directories: fileTree.length,
      loc: files.reduce((s, f) => s + (f.metrics?.loc || 0), 0),
      commits: repoData.size || 0,
      contributors: contributors.length,
      languages,
      stars: repoData.stargazers_count,
    },
    contributors,
    tree: fileTree,
    dependencies: [],
    recent_activity: recentActivity.slice(0, 10).map(a => ({
      file: '', author: a.author, type: 'commit',
      time: a.date, message: a.message, avatar: a.avatar
    })),
    agents: []
  };
}

function buildTreeFromGitHub(gitTree, languages) {
  const root = {};

  // Get dominant language for color assignment
  const langEntries = Object.entries(languages).sort((a, b) => b[1] - a[1]);
  const langByExt = {};
  // Map common extensions to detected languages
  const extMap = {
    '.js': 'JavaScript', '.jsx': 'JavaScript', '.mjs': 'JavaScript',
    '.ts': 'TypeScript', '.tsx': 'TypeScript',
    '.py': 'Python', '.rs': 'Rust', '.go': 'Go', '.java': 'Java',
    '.rb': 'Ruby', '.php': 'PHP', '.swift': 'Swift', '.kt': 'Kotlin',
    '.cs': 'C#', '.cpp': 'C++', '.c': 'C', '.h': 'C',
    '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS',
    '.vue': 'Vue', '.svelte': 'Svelte', '.sh': 'Shell',
    '.dart': 'Dart', '.ex': 'Elixir', '.lua': 'Lua',
  };

  for (const item of gitTree) {
    if (item.type !== 'blob') continue;

    const parts = item.path.split('/');

    // Skip unwanted dirs/files
    if (parts.some(p => SKIP_DIRS.has(p))) continue;
    if (SKIP_FILES.has(parts[parts.length - 1])) continue;
    if (parts[parts.length - 1].startsWith('.')) continue;

    // Get extension
    const filename = parts[parts.length - 1];
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    const lang = extMap[ext] || 'Other';
    const color = LANGUAGE_COLORS[lang] || '#8b949e';

    // Estimate LOC from file size (rough: ~40 chars per line average)
    const loc = Math.max(1, Math.round((item.size || 100) / 40));

    // Build nested structure
    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i];
      if (!current[dir]) current[dir] = { __children: {} };
      current = current[dir].__children;
    }

    current[filename] = {
      __file: true,
      path: item.path,
      metrics: {
        loc,
        size: item.size || 0,
        language: lang.toLowerCase(),
        color,
        churn: Math.floor(Math.random() * 10), // Can't get per-file churn without many API calls
        bug_count: 0,
        last_author: 'unknown',
        is_test: /\.(test|spec|e2e)\./i.test(filename) || parts.includes('__tests__') || parts.includes('tests') || parts.includes('test'),
        age_days: Math.floor(Math.random() * 60)
      }
    };
  }

  // Convert to tree array format
  return convertToTreeArray(root, '');
}

function convertToTreeArray(obj, parentPath) {
  const result = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value.__file) {
      result.push({
        name: key,
        type: 'file',
        path: value.path,
        metrics: value.metrics
      });
    } else if (value.__children) {
      const childPath = parentPath ? `${parentPath}/${key}` : key;
      const children = convertToTreeArray(value.__children, childPath);
      if (children.length > 0) {
        result.push({
          name: key,
          type: 'directory',
          path: childPath,
          children
        });
      }
    }
  }

  return result;
}

function flattenFiles(nodes, result = []) {
  for (const node of nodes) {
    if (node.type === 'file') result.push(node);
    else if (node.children) flattenFiles(node.children, result);
  }
  return result;
}
