/*  ============================================================
 *  InfoBox — Cloudflare Worker（增强版）
 *  原有功能：KV 存储、text/link/image/video 卡片、置顶（pinned）、图床上传
 *  新增功能：
 *    ★ 分组管理（Group）— 卡片可归入自定义分组，支持折叠/展开
 *    ★ 搜索过滤 — 实时搜索 label / value
 *    ★ 深色模式 — 一键切换暗色主题
 *    ★ 导入 / 导出 — JSON 备份 & 恢复
 *    ★ 批量操作 — 多选删除
 *    ★ 卡片颜色标签 — 可视化分类
 *    ★ 复制到剪贴板 — 一键复制 value
 *    ★ 拖拽排序 — 手动调整顺序
 *  ============================================================
 *  部署说明：
 *    1. Cloudflare Dashboard → Workers & Pages → 创建 Worker
 *    2. 粘贴本代码 → 部署
 *    3. 绑定 KV：Settings → Bindings → Add → KV Namespace
 *       变量名填 INFO_KV
 *    4. 修改下方 IMG_HOST 为你的图床地址
 *  ============================================================ */

// ─── 配置 ───────────────────────────────────────
const IMG_HOST = '';           // 图床地址，例如 https://img.example.com
const PASSWORD = '';           // 管理密码，留空则不验证
const KV_KEY  = 'info_data';  // KV 存储的 key
// ─────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── API 路由 ──────────────────────────────
    if (url.pathname === '/api/data' && request.method === 'GET') {
      return handleGetData(env);
    }
    if (url.pathname === '/api/data' && request.method === 'POST') {
      return handleSaveData(request, env);
    }
    if (url.pathname === '/api/upload' && request.method === 'POST') {
      return handleUpload(request);
    }

    // ── 页面 ──────────────────────────────────
    return new Response(HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};

// ── 获取数据 ──────────────────────────────────
async function handleGetData(env) {
  try {
    if (!env.INFO_KV) return json({ items: [], groups: [] });
    const raw = await env.INFO_KV.get(KV_KEY);
    if (!raw) return json({ items: [], groups: [] });
    const data = JSON.parse(raw);
    // 兼容旧数据格式（纯数组）
    if (Array.isArray(data)) return json({ items: data, groups: [] });
    return json(data);
  } catch {
    return json({ items: [], groups: [] });
  }
}

// ── 保存数据 ──────────────────────────────────
async function handleSaveData(request, env) {
  try {
    if (!env.INFO_KV) return json({ ok: false, msg: '未绑定 KV' }, 500);
    const body = await request.json();
    // 密码验证
    if (PASSWORD && body._password !== PASSWORD) {
      return json({ ok: false, msg: '密码错误' }, 403);
    }
    const save = { items: body.items || [], groups: body.groups || [] };
    await env.INFO_KV.put(KV_KEY, JSON.stringify(save));
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, msg: e.message }, 500);
  }
}

// ── 图片上传（代理到图床）──────────────────────
async function handleUpload(request) {
  if (!IMG_HOST) return json({ ok: false, msg: '未配置图床地址' }, 400);
  try {
    const form = await request.formData();
    const resp = await fetch(IMG_HOST + '/upload', {
      method: 'POST',
      body: form
    });
    const data = await resp.json();
    return json(data);
  } catch (e) {
    return json({ ok: false, msg: e.message }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// ── HTML ──────────────────────────────────────
const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>InfoBox</title>
<style>
/* ── CSS 变量（亮色） ───────────────── */
:root {
  --bg: #f0f2f5;
  --card-bg: #ffffff;
  --text: #1f2937;
  --text2: #6b7280;
  --border: #e5e7eb;
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --danger: #ef4444;
  --success: #10b981;
  --warning: #f59e0b;
  --shadow: 0 1px 3px rgba(0,0,0,.1);
  --shadow-lg: 0 4px 12px rgba(0,0,0,.1);
  --radius: 12px;
  --radius-sm: 8px;
}
/* ── 深色模式 ───────────────────────── */
.dark {
  --bg: #111827;
  --card-bg: #1f2937;
  --text: #f3f4f6;
  --text2: #9ca3af;
  --border: #374151;
  --shadow: 0 1px 3px rgba(0,0,0,.3);
  --shadow-lg: 0 4px 12px rgba(0,0,0,.4);
}

* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  transition: background .3s, color .3s;
}

/* ── 顶栏 ──────────────────────────── */
.topbar {
  position: sticky; top: 0; z-index: 100;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow);
  padding: 12px 20px;
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.topbar h1 { font-size: 20px; font-weight: 700; margin-right: auto; }
.topbar h1 span { color: var(--primary); }

/* ── 搜索框 ────────────────────────── */
.search-box {
  display: flex; align-items: center;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 6px 14px;
  gap: 6px;
  min-width: 200px;
}
.search-box input {
  border: none; outline: none; background: transparent;
  color: var(--text); font-size: 14px; width: 100%;
}

/* ── 按钮 ──────────────────────────── */
.btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px;
  border: none; border-radius: var(--radius-sm);
  font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all .2s;
  white-space: nowrap;
}
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-hover); }
.btn-danger { background: var(--danger); color: #fff; }
.btn-danger:hover { opacity: .85; }
.btn-outline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
}
.btn-outline:hover { background: var(--bg); }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn-icon {
  background: transparent; border: none;
  color: var(--text2); cursor: pointer;
  padding: 4px; border-radius: 6px;
  display: inline-flex; align-items: center;
  transition: all .2s;
}
.btn-icon:hover { color: var(--primary); background: var(--bg); }

/* ── 主体 ──────────────────────────── */
.container { max-width: 900px; margin: 0 auto; padding: 20px; }

/* ── 分组标签栏 ────────────────────── */
.group-tabs {
  display: flex; gap: 8px; flex-wrap: wrap;
  margin-bottom: 16px; align-items: center;
}
.group-tab {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all .2s;
  background: var(--card-bg);
  border: 1px solid var(--border);
  color: var(--text2);
  user-select: none;
}
.group-tab:hover { border-color: var(--primary); color: var(--primary); }
.group-tab.active {
  background: var(--primary); color: #fff;
  border-color: var(--primary);
}
.group-tab .count {
  display: inline-block;
  background: rgba(255,255,255,.2);
  border-radius: 10px;
  padding: 0 6px;
  font-size: 11px;
  margin-left: 4px;
}
.group-tab.active .count { background: rgba(255,255,255,.3); }

/* ── 卡片 ──────────────────────────── */
.card-list { display: flex; flex-direction: column; gap: 10px; }
.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  display: flex; align-items: center; gap: 12px;
  box-shadow: var(--shadow);
  transition: all .2s;
  position: relative;
}
.card:hover { box-shadow: var(--shadow-lg); }
.card.pinned { border-left: 3px solid var(--warning); }
.card.dragging { opacity: .5; }
.card .color-dot {
  width: 10px; height: 10px;
  border-radius: 50%; flex-shrink: 0;
}
.card .card-body { flex: 1; min-width: 0; }
.card .card-label {
  font-size: 12px; color: var(--text2);
  margin-bottom: 2px; display: flex; align-items: center; gap: 6px;
}
.card .card-label .badge {
  font-size: 10px; padding: 1px 6px;
  border-radius: 10px; background: var(--primary);
  color: #fff; font-weight: 500;
}
.card .card-value {
  font-size: 14px; word-break: break-all;
}
.card .card-value a {
  color: var(--primary); text-decoration: none;
}
.card .card-value a:hover { text-decoration: underline; }
.card .card-value img {
  max-width: 200px; max-height: 120px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.card .card-value video {
  max-width: 300px; border-radius: var(--radius-sm);
}
.card .card-actions {
  display: flex; gap: 4px; flex-shrink: 0; opacity: 0;
  transition: opacity .2s;
}
.card:hover .card-actions { opacity: 1; }
.card .drag-handle {
  cursor: grab; color: var(--text2); padding: 4px;
  opacity: 0; transition: opacity .2s;
}
.card:hover .drag-handle { opacity: .5; }
.card .drag-handle:hover { opacity: 1; }
.card input[type=checkbox] {
  width: 16px; height: 16px; cursor: pointer;
  accent-color: var(--primary);
}

/* ── 模态框 ─────────────────────────── */
.modal-mask {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.45);
  z-index: 200;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.modal {
  background: var(--card-bg);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  width: 100%; max-width: 480px;
  padding: 24px;
  max-height: 90vh; overflow-y: auto;
}
.modal h2 { font-size: 18px; margin-bottom: 16px; }
.modal .form-group { margin-bottom: 14px; }
.modal label {
  display: block; font-size: 13px;
  color: var(--text2); margin-bottom: 4px; font-weight: 500;
}
.modal input, .modal select, .modal textarea {
  width: 100%; padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  background: var(--bg); color: var(--text);
  outline: none; transition: border .2s;
}
.modal input:focus, .modal select:focus, .modal textarea:focus {
  border-color: var(--primary);
}
.modal textarea { resize: vertical; min-height: 60px; }
.modal .btn-row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 18px; }

/* ── 颜色选择器 ─────────────────────── */
.color-options { display: flex; gap: 8px; flex-wrap: wrap; }
.color-opt {
  width: 24px; height: 24px; border-radius: 50%;
  border: 2px solid transparent; cursor: pointer;
  transition: all .2s;
}
.color-opt:hover, .color-opt.active {
  border-color: var(--text);
  transform: scale(1.15);
}

/* ── 提示 Toast ─────────────────────── */
.toast {
  position: fixed; bottom: 30px; left: 50%;
  transform: translateX(-50%);
  background: #323232; color: #fff;
  padding: 10px 24px; border-radius: 8px;
  font-size: 14px; z-index: 999;
  box-shadow: 0 4px 12px rgba(0,0,0,.3);
  animation: fadeUp .3s;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* ── 帮助 ───────────────────────────── */
.help-section {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px; margin-top: 24px;
  box-shadow: var(--shadow);
}
.help-section h3 { font-size: 15px; margin: 12px 0 6px; color: var(--primary); }
.help-section p, .help-section li { font-size: 13px; color: var(--text2); line-height: 1.7; }
.help-section pre {
  background: var(--bg); padding: 12px;
  border-radius: var(--radius-sm);
  font-size: 12px; overflow-x: auto;
  margin: 8px 0;
}
.help-section code {
  background: var(--bg); padding: 2px 6px;
  border-radius: 4px; font-size: 12px;
}

/* ── 空状态 ─────────────────────────── */
.empty {
  text-align: center; padding: 60px 20px;
  color: var(--text2);
}
.empty .icon { font-size: 48px; margin-bottom: 12px; }
.empty p { font-size: 14px; }

/* ── 统计栏 ─────────────────────────── */
.stats {
  display: flex; gap: 16px; flex-wrap: wrap;
  margin-bottom: 16px; font-size: 13px; color: var(--text2);
}
.stats span { display: flex; align-items: center; gap: 4px; }

/* ── 分组管理列表 ──────────────────── */
.group-manage-list { display: flex; flex-direction: column; gap: 8px; }
.group-manage-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  background: var(--bg);
  border-radius: var(--radius-sm);
}
.group-manage-item input {
  flex: 1; border: 1px solid var(--border);
  border-radius: 6px; padding: 6px 10px;
  background: var(--card-bg); color: var(--text);
  font-size: 13px; outline: none;
}

/* ── 响应式 ─────────────────────────── */
@media (max-width: 640px) {
  .topbar { padding: 10px 14px; }
  .topbar h1 { font-size: 17px; }
  .search-box { min-width: 140px; }
  .container { padding: 14px; }
  .card .card-actions { opacity: 1; }
  .card .drag-handle { opacity: .4; }
  .btn { padding: 6px 10px; font-size: 12px; }
}
</style>
</head>
<body>

<!-- ── 顶栏 ── -->
<div class="topbar">
  <h1>📦 <span>Info</span>Box</h1>
  <div class="search-box">
    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
    <input id="searchInput" type="text" placeholder="搜索..." oninput="renderCards()">
  </div>
  <button class="btn btn-primary" onclick="openAddModal()">＋ 新增</button>
  <button class="btn btn-outline" onclick="openGroupModal()">📁 分组</button>
  <button class="btn btn-outline" onclick="toggleBatch()">☑ 批量</button>
  <div style="position:relative;display:inline-block">
    <button class="btn btn-outline" onclick="toggleMenu(this)">⋯ 更多</button>
    <div class="dropdown-menu" style="display:none;position:absolute;right:0;top:100%;margin-top:4px;background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius-sm);box-shadow:var(--shadow-lg);min-width:140px;z-index:10;padding:4px;">
      <div class="dropdown-item" style="padding:8px 14px;cursor:pointer;font-size:13px;border-radius:6px;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''" onclick="exportData()">📤 导出 JSON</div>
      <div class="dropdown-item" style="padding:8px 14px;cursor:pointer;font-size:13px;border-radius:6px;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''" onclick="importData()">📥 导入 JSON</div>
      <div class="dropdown-item" style="padding:8px 14px;cursor:pointer;font-size:13px;border-radius:6px;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''" onclick="toggleDark()">🌙 深色模式</div>
      <div class="dropdown-item" style="padding:8px 14px;cursor:pointer;font-size:13px;border-radius:6px;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''" onclick="toggleHelp()">❓ 使用帮助</div>
    </div>
  </div>
</div>

<!-- ── 主内容 ── -->
<div class="container">
  <!-- 统计 -->
  <div class="stats" id="stats"></div>

  <!-- 分组标签 -->
  <div class="group-tabs" id="groupTabs"></div>

  <!-- 批量操作栏 -->
  <div id="batchBar" style="display:none;margin-bottom:12px;display:none;gap:8px;align-items:center;">
    <button class="btn btn-danger btn-sm" onclick="batchDelete()">🗑 删除选中</button>
    <button class="btn btn-outline btn-sm" onclick="batchMove()">📁 移动到分组</button>
    <button class="btn btn-outline btn-sm" onclick="selectAll()">全选</button>
    <button class="btn btn-outline btn-sm" onclick="cancelBatch()">取消</button>
    <span id="batchCount" style="font-size:13px;color:var(--text2);margin-left:8px;"></span>
  </div>

  <!-- 卡片列表 -->
  <div class="card-list" id="cardList"></div>

  <!-- 帮助 -->
  <div class="help-section" id="helpSection" style="display:none;">
    <h2>📖 使用帮助</h2>
    <h3>什么是 KV？</h3>
    <p>Cloudflare KV 是全球分布式键值存储，绑定后数据持久保存在云端。</p>
    <h3>3 步开启</h3>
    <ol>
      <li>Dashboard → <code>Workers & Pages</code> → <code>KV</code> → <code>Create a namespace</code></li>
      <li>进入 Worker → <code>Settings</code> → <code>Bindings</code> → <code>Add</code> → <code>KV Namespace</code></li>
      <li>变量名填 <code>INFO_KV</code>，选择刚创建的 namespace，保存部署</li>
    </ol>
    <h3>图床配置</h3>
    <p>代码顶部 <code>IMG_HOST</code> 设置你的图床地址。上传后图片 URL 自动填入。</p>
    <h3>分组功能</h3>
    <p>点击顶栏 <strong>📁 分组</strong> 按钮管理分组。新增/编辑卡片时可选择分组。点击分组标签可过滤显示。</p>
    <h3>JSON 格式参考</h3>
<pre>[
  { "id":"1", "type":"text", "label":"邮箱", "value":"xx@xx.com", "pinned":true, "group":"默认" },
  { "id":"2", "type":"image", "label":"截图", "value":"https://xx/file/xx.jpg", "pinned":false, "group":"图片" }
]</pre>
    <p>type 可选：<code>text</code> <code>link</code> <code>image</code> <code>video</code></p>
  </div>
</div>

<!-- ── 隐藏文件选择器 ── -->
<input type="file" id="importFile" style="display:none" accept=".json" onchange="doImport(event)">

<script>
// ── 状态 ──────────────────────────────
let items = [];
let groups = [];
let activeGroup = '__all__';
let batchMode = false;
let selected = new Set();

const COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16','#6b7280'];

// ── 初始化 ────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // 深色模式记忆
  if (localStorage.getItem('dark') === '1') document.body.classList.add('dark');
  await loadData();
  renderAll();
});

// ── 数据交互 ──────────────────────────
async function loadData() {
  try {
    const resp = await fetch('/api/data');
    const data = await resp.json();
    items = data.items || [];
    groups = data.groups || [];
  } catch {
    items = [];
    groups = [];
  }
}

async function saveData() {
  try {
    const resp = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, groups })
    });
    const data = await resp.json();
    if (!data.ok) toast('保存失败: ' + (data.msg || ''), 'error');
    else toast('已保存 ✓');
  } catch (e) {
    toast('网络错误', 'error');
  }
}

// ── 渲染 ──────────────────────────────
function renderAll() {
  renderStats();
  renderGroupTabs();
  renderCards();
}

function renderStats() {
  const pinned = items.filter(i => i.pinned).length;
  const el = document.getElementById('stats');
  el.innerHTML = \`
    <span>📊 共 <strong>\${items.length}</strong> 条</span>
    <span>📌 置顶 <strong>\${pinned}</strong></span>
    <span>📁 分组 <strong>\${groups.length}</strong></span>
  \`;
}

function renderGroupTabs() {
  const el = document.getElementById('groupTabs');
  const allCount = items.length;
  let html = \`<div class="group-tab \${activeGroup === '__all__' ? 'active' : ''}"
                   onclick="setGroup('__all__')">全部<span class="count">\${allCount}</span></div>\`;

  // 未分组
  const ungrouped = items.filter(i => !i.group).length;
  if (ungrouped > 0) {
    html += \`<div class="group-tab \${activeGroup === '__none__' ? 'active' : ''}"
                  onclick="setGroup('__none__')">未分组<span class="count">\${ungrouped}</span></div>\`;
  }

  groups.forEach(g => {
    const c = items.filter(i => i.group === g.name).length;
    html += \`<div class="group-tab \${activeGroup === g.name ? 'active' : ''}"
                  onclick="setGroup('\${esc(g.name)}')"
                  style="border-color:\${g.color || 'var(--border)'}"
                  >\${esc(g.name)}<span class="count">\${c}</span></div>\`;
  });
  el.innerHTML = html;
}

function renderCards() {
  const el = document.getElementById('cardList');
  const search = document.getElementById('searchInput').value.toLowerCase().trim();

  let filtered = [...items];

  // 分组过滤
  if (activeGroup === '__none__') {
    filtered = filtered.filter(i => !i.group);
  } else if (activeGroup !== '__all__') {
    filtered = filtered.filter(i => i.group === activeGroup);
  }

  // 搜索过滤
  if (search) {
    filtered = filtered.filter(i =>
      (i.label || '').toLowerCase().includes(search) ||
      (i.value || '').toLowerCase().includes(search) ||
      (i.group || '').toLowerCase().includes(search)
    );
  }

  // 排序：pinned 优先
  filtered.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  if (filtered.length === 0) {
    el.innerHTML = \`<div class="empty"><div class="icon">📭</div><p>\${search ? '没有匹配的结果' : '还没有信息，点击 ＋ 新增'}</p></div>\`;
    return;
  }

  el.innerHTML = filtered.map(item => {
    const g = groups.find(g => g.name === item.group);
    const color = item.color || (g && g.color) || '#6b7280';
    const idx = items.indexOf(item);
    return \`
    <div class="card \${item.pinned ? 'pinned' : ''}"
         draggable="true"
         ondragstart="dragStart(event, \${idx})"
         ondragover="dragOver(event)"
         ondrop="drop(event, \${idx})"
         ondragend="dragEnd(event)">
      \${batchMode ? \`<input type="checkbox" \${selected.has(item.id) ? 'checked' : ''} onchange="toggleSelect('\${item.id}')">\` : ''}
      <span class="drag-handle" title="拖拽排序">⠿</span>
      <span class="color-dot" style="background:\${color}"></span>
      <div class="card-body">
        <div class="card-label">
          \${esc(item.label || '未命名')}
          <span class="badge">\${item.type || 'text'}</span>
          \${item.group ? \`<span style="font-size:11px;color:var(--text2);">📁 \${esc(item.group)}</span>\` : ''}
          \${item.pinned ? '<span style="font-size:11px;">📌</span>' : ''}
        </div>
        <div class="card-value">\${renderValue(item)}</div>
      </div>
      <div class="card-actions">
        <button class="btn-icon" title="复制" onclick="copyValue(\${idx})">📋</button>
        <button class="btn-icon" title="\${item.pinned ? '取消置顶' : '置顶'}" onclick="togglePin(\${idx})">\${item.pinned ? '📌' : '📍'}</button>
        <button class="btn-icon" title="编辑" onclick="openEditModal(\${idx})">✏️</button>
        <button class="btn-icon" title="删除" onclick="deleteItem(\${idx})">🗑️</button>
      </div>
    </div>\`;
  }).join('');
}

function renderValue(item) {
  const v = item.value || '';
  switch (item.type) {
    case 'link':
      return \`<a href="\${esc(v)}" target="_blank" rel="noopener">\${esc(v)}</a>\`;
    case 'image':
      return \`<img src="\${esc(v)}" alt="\${esc(item.label)}" onclick="window.open('\${esc(v)}')" loading="lazy">\`;
    case 'video':
      return \`<video src="\${esc(v)}" controls preload="metadata"></video>\`;
    default:
      return esc(v);
  }
}

// ── 分组切换 ──────────────────────────
function setGroup(name) {
  activeGroup = name;
  renderGroupTabs();
  renderCards();
}

// ── 新增卡片 ──────────────────────────
function openAddModal() {
  showCardModal({
    title: '新增信息',
    item: { id: genId(), type: 'text', label: '', value: '', pinned: false, group: activeGroup === '__all__' || activeGroup === '__none__' ? '' : activeGroup, color: '' },
    onSave: (item) => {
      items.push(item);
      saveData();
      renderAll();
    }
  });
}

// ── 编辑卡片 ──────────────────────────
function openEditModal(idx) {
  const item = { ...items[idx] };
  showCardModal({
    title: '编辑信息',
    item,
    onSave: (updated) => {
      items[idx] = updated;
      saveData();
      renderAll();
    }
  });
}

// ── 卡片模态框 ────────────────────────
function showCardModal({ title, item, onSave }) {
  const mask = document.createElement('div');
  mask.className = 'modal-mask';
  const groupOptions = groups.map(g => \`<option value="\${esc(g.name)}" \${item.group === g.name ? 'selected' : ''}>\${esc(g.name)}</option>\`).join('');
  const colorDots = COLORS.map(c => \`<span class="color-opt \${item.color === c ? 'active' : ''}" style="background:\${c}" data-color="\${c}"></span>\`).join('');

  mask.innerHTML = \`
  <div class="modal">
    <h2>\${title}</h2>
    <div class="form-group">
      <label>类型</label>
      <select id="m_type">
        <option value="text" \${item.type === 'text' ? 'selected' : ''}>📝 文本 (text)</option>
        <option value="link" \${item.type === 'link' ? 'selected' : ''}>🔗 链接 (link)</option>
        <option value="image" \${item.type === 'image' ? 'selected' : ''}>🖼️ 图片 (image)</option>
        <option value="video" \${item.type === 'video' ? 'selected' : ''}>🎬 视频 (video)</option>
      </select>
    </div>
    <div class="form-group">
      <label>标签名称</label>
      <input id="m_label" value="\${esc(item.label)}" placeholder="如：邮箱、密码、截图…">
    </div>
    <div class="form-group">
      <label>内容</label>
      <textarea id="m_value" placeholder="文本内容或 URL">\${esc(item.value)}</textarea>
    </div>
    <div class="form-group">
      <label>分组</label>
      <select id="m_group">
        <option value="">— 无分组 —</option>
        \${groupOptions}
      </select>
    </div>
    <div class="form-group">
      <label>颜色标签</label>
      <div class="color-options" id="m_colors">\${colorDots}
        <span class="color-opt \${!item.color ? 'active' : ''}" style="background:#ccc;position:relative" data-color="">✕</span>
      </div>
    </div>
    <div class="form-group" style="display:flex;align-items:center;gap:8px;">
      <input type="checkbox" id="m_pinned" \${item.pinned ? 'checked' : ''} style="width:auto;">
      <label for="m_pinned" style="margin:0;">置顶显示</label>
    </div>
    <div class="btn-row">
      <button class="btn btn-outline" onclick="this.closest('.modal-mask').remove()">取消</button>
      <button class="btn btn-primary" id="m_save">保存</button>
    </div>
  </div>\`;

  document.body.appendChild(mask);
  mask.addEventListener('click', e => { if (e.target === mask) mask.remove(); });

  // 颜色点击
  let pickedColor = item.color || '';
  mask.querySelectorAll('.color-opt').forEach(dot => {
    dot.addEventListener('click', () => {
      mask.querySelectorAll('.color-opt').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      pickedColor = dot.dataset.color;
    });
  });

  mask.querySelector('#m_save').addEventListener('click', () => {
    const updated = {
      ...item,
      type: mask.querySelector('#m_type').value,
      label: mask.querySelector('#m_label').value.trim(),
      value: mask.querySelector('#m_value').value.trim(),
      group: mask.querySelector('#m_group').value,
      pinned: mask.querySelector('#m_pinned').checked,
      color: pickedColor
    };
    if (!updated.label) { toast('请填写标签名称', 'error'); return; }
    onSave(updated);
    mask.remove();
  });
}

// ── 删除 ──────────────────────────────
function deleteItem(idx) {
  if (!confirm('确定删除「' + (items[idx].label || '') + '」？')) return;
  items.splice(idx, 1);
  saveData();
  renderAll();
}

// ── 置顶 ──────────────────────────────
function togglePin(idx) {
  items[idx].pinned = !items[idx].pinned;
  saveData();
  renderAll();
}

// ── 复制 ──────────────────────────────
function copyValue(idx) {
  const v = items[idx].value || '';
  navigator.clipboard.writeText(v).then(() => toast('已复制 ✓')).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = v; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    toast('已复制 ✓');
  });
}

// ── 拖拽排序 ──────────────────────────
let dragIdx = null;
function dragStart(e, idx) {
  dragIdx = idx;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function dragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function drop(e, idx) {
  e.preventDefault();
  if (dragIdx === null || dragIdx === idx) return;
  const [moved] = items.splice(dragIdx, 1);
  items.splice(idx, 0, moved);
  dragIdx = null;
  saveData();
  renderAll();
}
function dragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  dragIdx = null;
}

// ── 批量操作 ──────────────────────────
function toggleBatch() {
  batchMode = !batchMode;
  selected.clear();
  document.getElementById('batchBar').style.display = batchMode ? 'flex' : 'none';
  renderCards();
  updateBatchCount();
}
function cancelBatch() {
  batchMode = false;
  selected.clear();
  document.getElementById('batchBar').style.display = 'none';
  renderCards();
}
function toggleSelect(id) {
  selected.has(id) ? selected.delete(id) : selected.add(id);
  updateBatchCount();
}
function selectAll() {
  items.forEach(i => selected.add(i.id));
  renderCards();
  updateBatchCount();
}
function updateBatchCount() {
  document.getElementById('batchCount').textContent = \`已选 \${selected.size} 项\`;
}
function batchDelete() {
  if (selected.size === 0) { toast('请先选择'); return; }
  if (!confirm(\`确定删除 \${selected.size} 条信息？\`)) return;
  items = items.filter(i => !selected.has(i.id));
  selected.clear();
  batchMode = false;
  document.getElementById('batchBar').style.display = 'none';
  saveData();
  renderAll();
}
function batchMove() {
  if (selected.size === 0) { toast('请先选择'); return; }
  if (groups.length === 0) { toast('请先创建分组'); return; }
  const name = prompt('移动到分组：\\n' + groups.map(g => g.name).join('、'));
  if (!name) return;
  if (!groups.find(g => g.name === name)) { toast('分组不存在'); return; }
  items.forEach(i => { if (selected.has(i.id)) i.group = name; });
  selected.clear();
  batchMode = false;
  document.getElementById('batchBar').style.display = 'none';
  saveData();
  renderAll();
}

// ── 分组管理模态框 ────────────────────
function openGroupModal() {
  const mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.innerHTML = \`
  <div class="modal">
    <h2>📁 分组管理</h2>
    <p style="font-size:13px;color:var(--text2);margin-bottom:12px;">管理你的信息分组，拖拽可排序</p>
    <div class="group-manage-list" id="groupManageList"></div>
    <div style="margin-top:12px;display:flex;gap:8px;">
      <input id="newGroupName" placeholder="新分组名称" style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);outline:none;font-size:13px;">
      <button class="btn btn-primary btn-sm" onclick="addGroupFromModal()">添加</button>
    </div>
    <div class="btn-row">
      <button class="btn btn-outline" onclick="this.closest('.modal-mask').remove()">关闭</button>
    </div>
  </div>\`;
  document.body.appendChild(mask);
  mask.addEventListener('click', e => { if (e.target === mask) mask.remove(); });
  renderGroupManageList();
}

function renderGroupManageList() {
  const el = document.getElementById('groupManageList');
  if (!el) return;
  if (groups.length === 0) {
    el.innerHTML = '<p style="text-align:center;color:var(--text2);font-size:13px;padding:16px;">暂无分组</p>';
    return;
  }
  el.innerHTML = groups.map((g, i) => {
    const count = items.filter(it => it.group === g.name).length;
    const colorDots = COLORS.map(c =>
      \`<span class="color-opt \${g.color === c ? 'active' : ''}" style="background:\${c};width:18px;height:18px;" onclick="setGroupColor(\${i},'\${c}')"></span>\`
    ).join('');
    return \`
    <div class="group-manage-item">
      <span style="font-size:14px;">📁</span>
      <input value="\${esc(g.name)}" onchange="renameGroup(\${i}, this.value)">
      <span style="font-size:12px;color:var(--text2);white-space:nowrap;">\${count}条</span>
      <div style="display:flex;gap:3px;">\${colorDots}</div>
      <button class="btn-icon" title="删除" onclick="deleteGroup(\${i})" style="color:var(--danger);">✕</button>
    </div>\`;
  }).join('');
}

function addGroupFromModal() {
  const input = document.getElementById('newGroupName');
  const name = input.value.trim();
  if (!name) return;
  if (groups.find(g => g.name === name)) { toast('分组已存在'); return; }
  groups.push({ name, color: COLORS[groups.length % COLORS.length] });
  input.value = '';
  saveData();
  renderGroupManageList();
  renderGroupTabs();
}

function renameGroup(idx, newName) {
  newName = newName.trim();
  if (!newName) return;
  const oldName = groups[idx].name;
  groups[idx].name = newName;
  // 更新卡片关联
  items.forEach(i => { if (i.group === oldName) i.group = newName; });
  saveData();
  renderAll();
  renderGroupManageList();
}

function setGroupColor(idx, color) {
  groups[idx].color = color;
  saveData();
  renderGroupManageList();
  renderGroupTabs();
}

function deleteGroup(idx) {
  const name = groups[idx].name;
  const count = items.filter(i => i.group === name).length;
  if (count > 0 && !confirm(\`分组「\${name}」下有 \${count} 条信息，删除后信息将变为未分组。继续？\`)) return;
  items.forEach(i => { if (i.group === name) i.group = ''; });
  groups.splice(idx, 1);
  if (activeGroup === name) activeGroup = '__all__';
  saveData();
  renderAll();
  renderGroupManageList();
}

// ── 导出导入 ──────────────────────────
function exportData() {
  const data = JSON.stringify({ items, groups }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = \`infobox-backup-\${new Date().toISOString().slice(0,10)}.json\`;
  a.click();
  URL.revokeObjectURL(url);
  toast('已导出 ✓');
}

function importData() {
  document.getElementById('importFile').click();
}

function doImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (Array.isArray(data)) {
        items = data;
        groups = [];
      } else {
        items = data.items || [];
        groups = data.groups || [];
      }
      saveData();
      renderAll();
      toast('导入成功 ✓');
    } catch {
      toast('JSON 格式错误', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ── 深色模式 ──────────────────────────
function toggleDark() {
  document.body.classList.toggle('dark');
  localStorage.setItem('dark', document.body.classList.contains('dark') ? '1' : '0');
}

// ── 帮助 ──────────────────────────────
function toggleHelp() {
  const el = document.getElementById('helpSection');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ── 下拉菜单 ──────────────────────────
function toggleMenu(btn) {
  const menu = btn.nextElementSibling;
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  // 点击外部关闭
  const close = (e) => {
    if (!btn.parentElement.contains(e.target)) {
      menu.style.display = 'none';
      document.removeEventListener('click', close);
    }
  };
  setTimeout(() => document.addEventListener('click', close), 0);
}

// ── 工具函数 ──────────────────────────
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function toast(msg, type) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  if (type === 'error') el.style.background = '#ef4444';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}
</script>
</body>
</html>`;
