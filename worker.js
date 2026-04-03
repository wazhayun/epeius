// ============================================
// 👇👇👇 在这里修改你的默认信息 👇👇👇
// ============================================
const DEFAULT_DATA = [
  { id: "1", type: "text", label: "邮箱", value: "km6mb1vwfedfzembh11@icloud.com", pinned: true },
  { id: "2", type: "text", label: "密码", value: "Bb260327", pinned: true },
  { id: "3", type: "text", label: "钉钉 Webhook", value: "https://oapi.dingtalk.com/robot/send?access_token=fd74418fff807c20b7028adb27b7b704bb58e68202209b21b2e7df3c5cd64e0f", pinned: false },
  { id: "4", type: "text", label: "Secret", value: "SEC44ea9051e751b16db4544949161e685bbcc7f94fcddad6b99908f54b594f013e", pinned: false },
];

// 图床地址
const IMG_HOST = "https://tu1.xiao78.dpdns.org";
// ============================================
// 👆👆👆 在这里修改你的默认信息 👆👆👆
// ============================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/items" && request.method === "GET")
      return await handleGet(env);
    if (url.pathname === "/api/items" && request.method === "POST")
      return await handleSave(request, env);
    if (url.pathname === "/api/items" && request.method === "DELETE")
      return await handleDelete(request, env);

    // 代理上传到图床
    if (url.pathname === "/api/upload" && request.method === "POST") {
      return await handleUpload(request);
    }

    return new Response(HTML(), {
      headers: { "Content-Type": "text/html;charset=UTF-8" },
    });
  },
};

async function handleGet(env) {
  let items = DEFAULT_DATA;
  if (env.INFO_KV) {
    try {
      const s = await env.INFO_KV.get("items", "json");
      if (s) items = s;
    } catch {}
  }
  return Response.json({ ok: true, items, hasKV: !!env.INFO_KV });
}

async function handleSave(request, env) {
  const body = await request.json();
  if (!env.INFO_KV)
    return Response.json({ ok: false, msg: "KV 未绑定" });
  let items = [];
  try {
    const s = await env.INFO_KV.get("items", "json");
    if (s) items = s;
  } catch {}
  if (body.item) {
    const idx = items.findIndex((i) => i.id === body.item.id);
    if (idx >= 0) items[idx] = body.item;
    else items.push(body.item);
  } else if (body.items) {
    items = body.items;
  }
  await env.INFO_KV.put("items", JSON.stringify(items));
  return Response.json({ ok: true, items });
}

async function handleDelete(request, env) {
  const body = await request.json();
  if (!env.INFO_KV)
    return Response.json({ ok: false, msg: "KV 未绑定" });
  let items = [];
  try {
    const s = await env.INFO_KV.get("items", "json");
    if (s) items = s;
  } catch {}
  items = items.filter((i) => i.id !== body.id);
  await env.INFO_KV.put("items", JSON.stringify(items));
  return Response.json({ ok: true, items });
}

async function handleUpload(request) {
  try {
    const formData = await request.formData();
    const resp = await fetch(IMG_HOST + "/upload", {
      method: "POST",
      body: formData,
    });
    const result = await resp.json();
    return Response.json({ ok: true, result });
  } catch (e) {
    return Response.json({ ok: false, msg: e.message });
  }
}

function HTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>InfoBox</title>
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#f0f0f3;--card:#fff;--border:rgba(0,0,0,.06);--text:#111;--sub:#8e8e93;
  --accent:#0a84ff;--green:#30d158;--red:#ff453a;--orange:#ff9f0a;
  --r:16px;--shadow:0 1px 4px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.04);
}
body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif;
  background:var(--bg);color:var(--text);line-height:1.5;-webkit-font-smoothing:antialiased;
  padding-bottom:env(safe-area-inset-bottom,20px)}

.wrap{max-width:520px;margin:0 auto;padding:16px 16px 100px}

/* header */
.hdr{display:flex;align-items:center;justify-content:space-between;padding:8px 0 16px}
.hdr h1{font-size:26px;font-weight:800;letter-spacing:-.8px}
.badge{font-size:10px;padding:3px 10px;border-radius:20px;font-weight:700;letter-spacing:.3px}
.badge-on{background:#e8f8ee;color:#1a8d42}
.badge-off{background:#fef4e6;color:#c47600}

/* 工具栏 */
.bar{display:flex;gap:8px;margin-bottom:16px}
.bar button{flex:1;padding:11px 0;border:none;border-radius:12px;font-size:13px;font-weight:700;
  cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:5px}
.bar button:active{transform:scale(.97)}
.b-add{background:var(--accent);color:#fff}
.b-img{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.b-tog{background:var(--card);color:var(--sub);border:1px solid var(--border) !important}
.b-kv{background:var(--card);color:var(--sub);border:1px solid var(--border) !important}

/* 分组标题 */
.section-title{font-size:12px;font-weight:700;color:var(--sub);text-transform:uppercase;
  letter-spacing:1px;padding:12px 4px 6px;display:flex;align-items:center;gap:6px}

/* 卡片 */
.card{background:var(--card);border-radius:var(--r);box-shadow:var(--shadow);
  margin-bottom:8px;overflow:hidden;transition:all .2s;border:1px solid var(--border)}
.card-h{display:flex;align-items:center;padding:13px 14px;cursor:pointer;user-select:none;gap:10px}
.card-ico{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;
  font-size:16px;flex-shrink:0}
.ico-text{background:#eef2ff;color:#6366f1}
.ico-image{background:#fef9c3;color:#ca8a04}
.ico-video{background:#fce4ec;color:#e91e63}
.ico-link{background:#e0f2fe;color:#0284c7}
.card-info{flex:1;min-width:0}
.card-info h3{font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card-info p{font-size:11px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
.pin-dot{width:6px;height:6px;border-radius:50%;background:var(--orange);flex-shrink:0}
.chev{color:#c7c7cc;font-size:10px;transition:transform .2s;flex-shrink:0}
.card.open .chev{transform:rotate(90deg)}

.card-b{max-height:0;overflow:hidden;transition:max-height .35s ease}
.card.open .card-b{max-height:1200px}
.card-inner{padding:0 14px 14px}

/* 媒体 */
.media{border-radius:12px;overflow:hidden;margin-bottom:10px;background:#f5f5f7;position:relative}
.media img,.media video{width:100%;display:block;max-height:360px;object-fit:contain}
.media-err{padding:30px;text-align:center;color:var(--sub);font-size:13px}

/* 值 */
.val{background:#f9fafb;border:1px solid rgba(0,0,0,.05);border-radius:10px;padding:10px 12px;
  font-size:13px;word-break:break-all;color:#374151;line-height:1.65;font-family:"SF Mono",Monaco,Consolas,monospace}
.val.is-link{color:var(--accent);cursor:pointer}

/* 操作 */
.acts{display:flex;gap:6px;margin-top:10px}
.acts button{flex:1;padding:9px 0;border:none;border-radius:10px;font-size:12px;font-weight:700;
  cursor:pointer;transition:all .12s;display:flex;align-items:center;justify-content:center;gap:4px}
.acts button:active{transform:scale(.95)}
.a-copy{background:#f0f5ff;color:var(--accent)}
.a-edit{background:#f0fdf4;color:#16a34a}
.a-pin{background:#fffbeb;color:#d97706}
.a-del{background:#fef2f2;color:var(--red)}

/* Toast */
.toast{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(.8);
  background:rgba(0,0,0,.8);color:#fff;padding:12px 26px;border-radius:14px;
  font-size:14px;font-weight:700;z-index:9999;opacity:0;pointer-events:none;
  transition:all .25s;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
.toast.show{opacity:1;transform:translate(-50%,-50%) scale(1)}

/* 模态框 */
.mask{position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:1000;display:none;
  align-items:flex-end;justify-content:center;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
.mask.show{display:flex}
.modal{background:var(--card);border-radius:20px 20px 0 0;width:100%;max-width:520px;
  max-height:88vh;overflow-y:auto;padding:24px 20px calc(20px + env(safe-area-inset-bottom,0px));
  animation:up .3s}
@keyframes up{from{transform:translateY(100%)}to{transform:translateY(0)}}
.modal-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.modal-h h2{font-size:18px;font-weight:800}
.modal-h button{width:30px;height:30px;border-radius:50%;background:#f5f5f7;border:none;
  font-size:18px;color:var(--sub);cursor:pointer;display:flex;align-items:center;justify-content:center}

.fg{margin-bottom:14px}
.fg label{display:block;font-size:12px;font-weight:700;color:var(--sub);margin-bottom:5px;
  text-transform:uppercase;letter-spacing:.5px}
.fg input,.fg textarea,.fg select{width:100%;padding:12px 14px;border:1.5px solid rgba(0,0,0,.08);
  border-radius:12px;font-size:14px;font-family:inherit;background:#f9fafb;transition:border .2s;outline:none}
.fg input:focus,.fg textarea:focus{border-color:var(--accent);background:#fff}
.fg textarea{resize:vertical;min-height:72px}
.fg select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2386868b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 14px center}
.fcheck{display:flex;align-items:center;gap:8px;margin-bottom:16px}
.fcheck input[type=checkbox]{width:20px;height:20px;accent-color:var(--accent);border-radius:6px}
.fcheck label{font-size:13px;font-weight:600}
.btn-sub{width:100%;padding:14px;border:none;border-radius:14px;background:var(--accent);
  color:#fff;font-size:15px;font-weight:800;cursor:pointer;transition:all .15s}
.btn-sub:active{transform:scale(.98);background:#0070e0}

/* 上传区 */
.upload-zone{border:2px dashed rgba(0,0,0,.1);border-radius:14px;padding:24px;text-align:center;
  cursor:pointer;transition:all .2s;background:#fafbfc;margin-bottom:10px;position:relative}
.upload-zone:hover,.upload-zone.drag{border-color:var(--accent);background:#f0f5ff}
.upload-zone input{position:absolute;inset:0;opacity:0;cursor:pointer}
.upload-zone .uz-icon{font-size:28px;margin-bottom:6px}
.upload-zone p{font-size:13px;color:var(--sub);font-weight:600}
.upload-zone .uz-hint{font-size:11px;color:#bbb;margin-top:4px}
.upload-progress{display:none;margin-bottom:10px}
.upload-progress .bar-bg{height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden}
.upload-progress .bar-fill{height:100%;background:linear-gradient(90deg,#667eea,#764ba2);
  border-radius:3px;transition:width .3s;width:0}
.upload-progress p{font-size:11px;color:var(--sub);margin-top:4px;text-align:center;font-weight:600}

/* 上传预览 */
.upload-preview{border-radius:12px;overflow:hidden;margin-bottom:10px;background:#f5f5f7;position:relative;display:none}
.upload-preview img{width:100%;max-height:200px;object-fit:contain;display:block}
.upload-preview .up-del{position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:50%;
  background:rgba(0,0,0,.6);color:#fff;border:none;font-size:14px;cursor:pointer;
  display:flex;align-items:center;justify-content:center}

/* Gallery 模态 */
.gallery-mask{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:2000;display:none;
  align-items:center;justify-content:center;cursor:zoom-out;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
.gallery-mask.show{display:flex}
.gallery-mask img,.gallery-mask video{max-width:96%;max-height:90vh;object-fit:contain;border-radius:8px}
.gallery-close{position:fixed;top:16px;right:16px;z-index:2001;width:36px;height:36px;
  border-radius:50%;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:20px;
  cursor:pointer;display:none;align-items:center;justify-content:center}
.gallery-mask.show ~ .gallery-close{display:flex}

/* KV 教程 */
.guide h3{font-size:14px;font-weight:800;margin:14px 0 6px;color:var(--text)}
.guide h3:first-child{margin-top:0}
.guide p{font-size:13px;color:#555;line-height:1.7;margin-bottom:4px}
.guide code{background:#f1f5f9;padding:2px 7px;border-radius:5px;font-size:11px;color:#6366f1;
  font-family:"SF Mono",Monaco,monospace}
.guide pre{background:#1a1a2e;color:#e2e8f0;padding:14px;border-radius:12px;overflow-x:auto;
  font-size:11px;line-height:1.6;margin:8px 0 12px;font-family:"SF Mono",Monaco,monospace}
.guide ol{padding-left:20px;font-size:13px;color:#555;line-height:2.2}

.empty{text-align:center;padding:50px 20px;color:var(--sub)}
.empty-ico{font-size:42px;margin-bottom:10px;opacity:.6}
.empty p{font-size:14px}

/* 图床上传弹窗 */
.img-result{background:#f9fafb;border:1px solid rgba(0,0,0,.06);border-radius:12px;padding:12px;margin-top:10px}
.img-result img{width:100%;max-height:200px;object-fit:contain;border-radius:8px;margin-bottom:8px}
.img-result .ir-url{font-size:12px;word-break:break-all;color:#6366f1;font-family:"SF Mono",Monaco,monospace;
  background:#eef2ff;padding:8px 10px;border-radius:8px;margin-bottom:8px}
.img-result .ir-acts{display:flex;gap:6px}
.img-result .ir-acts button{flex:1;padding:8px 0;border:none;border-radius:8px;font-size:12px;
  font-weight:700;cursor:pointer}

/* 图片上传历史 */
.hist-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.hist-item{position:relative;border-radius:10px;overflow:hidden;background:#f5f5f7;aspect-ratio:1;cursor:pointer}
.hist-item img{width:100%;height:100%;object-fit:cover}
.hist-item .hi-copy{position:absolute;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;
  justify-content:center;opacity:0;transition:opacity .2s;color:#fff;font-size:12px;font-weight:700}
.hist-item:active .hi-copy{opacity:1}
</style>
</head>
<body>

<div class="wrap" id="app">
  <div class="hdr">
    <h1>InfoBox</h1>
    <span class="badge" id="kvB">检测中…</span>
  </div>
  <div class="bar">
    <button class="b-add" onclick="openAdd()">＋ 添加</button>
    <button class="b-img" onclick="openUpload()">📷 图床</button>
    <button class="b-tog" onclick="togAll()">📂</button>
    <button class="b-kv" onclick="openKV()">?</button>
  </div>
  <div id="list"></div>
</div>

<div class="toast" id="toast"></div>

<!-- 添加/编辑 -->
<div class="mask" id="formM">
  <div class="modal">
    <div class="modal-h"><h2 id="fTitle">添加信息</h2><button onclick="closeM('formM')">✕</button></div>
    <div class="fg">
      <label>类型</label>
      <select id="fType" onchange="onTypeChg()">
        <option value="text">📝 文本</option>
        <option value="link">🔗 链接</option>
        <option value="image">🖼️ 图片</option>
        <option value="video">🎬 视频</option>
      </select>
    </div>
    <div class="fg"><label>标签名称</label><input id="fLabel" placeholder="如：邮箱、API Key…"></div>

    <!-- 图片/视频上传区 -->
    <div id="uploadArea" style="display:none">
      <div class="upload-zone" id="dropZone">
        <input type="file" id="fileInput" accept="image/*,video/*" onchange="handleFile(this)">
        <div class="uz-icon">📤</div>
        <p>点击选择或拖拽文件</p>
        <div class="uz-hint">支持 jpg/png/gif/mp4 · 最大 5MB</div>
      </div>
      <div class="upload-progress" id="upProgress">
        <div class="bar-bg"><div class="bar-fill" id="upBar"></div></div>
        <p id="upText">上传中…</p>
      </div>
      <div class="upload-preview" id="upPreview">
        <img id="upImg">
        <button class="up-del" onclick="clearUpload()">✕</button>
      </div>
    </div>

    <div class="fg" id="fValueWrap">
      <label id="fValL">内容</label>
      <textarea id="fValue" placeholder="输入内容…"></textarea>
    </div>
    <div class="fcheck"><input type="checkbox" id="fPin"><label for="fPin">📌 置顶显示</label></div>
    <input type="hidden" id="fId">
    <button class="btn-sub" onclick="submitForm()">保存</button>
  </div>
</div>

<!-- 图床上传 -->
<div class="mask" id="imgM">
  <div class="modal">
    <div class="modal-h"><h2>📷 图床上传</h2><button onclick="closeM('imgM')">✕</button></div>
    <div class="upload-zone" id="dropZone2">
      <input type="file" id="fileInput2" accept="image/*,video/*" multiple onchange="handleImgUpload(this)">
      <div class="uz-icon">🖼️</div>
      <p>选择图片或视频上传到图床</p>
      <div class="uz-hint">支持 jpg/png/gif/mp4 · 最大 5MB · 可多选</div>
    </div>
    <div class="upload-progress" id="upProgress2">
      <div class="bar-bg"><div class="bar-fill" id="upBar2"></div></div>
      <p id="upText2">上传中…</p>
    </div>
    <div id="imgResults"></div>
  </div>
</div>

<!-- KV教程 -->
<div class="mask" id="kvM">
  <div class="modal">
    <div class="modal-h"><h2>📖 KV 教程</h2><button onclick="closeM('kvM')">✕</button></div>
    <div class="guide">
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
      <h3>JSON 格式参考</h3>
<pre>[
  { "id":"1", "type":"text", "label":"邮箱", "value":"xx@xx.com", "pinned":true },
  { "id":"2", "type":"image", "label":"截图", "value":"https://xx/file/xx.jpg", "pinned":false }
]</pre>
      <p>type 可选：<code>text</code> <code>link</code> <code>image</code> <code>video</code></p>
    </div>
  </div>
</div>

<!-- 全屏预览 -->
<div class="gallery-mask" id="gallery" onclick="closeGallery()"></div>
<button class="gallery-close" id="galleryClose" onclick="closeGallery()">✕</button>

<script>
const IMG_HOST="${IMG_HOST}";
let items=[],allOpen=false,hasKV=false;

async function load(){
  try{
    const r=await fetch('/api/items');
    const d=await r.json();
    items=d.items||[];hasKV=d.hasKV;
    const b=document.getElementById('kvB');
    b.textContent=hasKV?'● KV 已连接':'○ 本地模式';
    b.className='badge '+(hasKV?'badge-on':'badge-off');
    render();
  }catch{document.getElementById('list').innerHTML='<div class="empty"><div class="empty-ico">⚠️</div><p>加载失败</p></div>'}
}

function render(){
  const el=document.getElementById('list');
  if(!items.length){el.innerHTML='<div class="empty"><div class="empty-ico">📭</div><p>暂无信息，点击「添加」开始</p></div>';return}
  const pinned=items.filter(i=>i.pinned);
  const normal=items.filter(i=>!i.pinned);
  let html='';
  if(pinned.length) html+='<div class="section-title"><span>📌</span> 置顶</div>'+pinned.map(renderCard).join('');
  if(normal.length) html+=(pinned.length?'<div class="section-title"><span>📋</span> 全部</div>':'')+normal.map(renderCard).join('');
  el.innerHTML=html;
}

function renderCard(item){
  const ic={text:'ico-text',link:'ico-link',image:'ico-image',video:'ico-video'}[item.type]||'ico-text';
  const em={text:'📝',link:'🔗',image:'🖼️',video:'🎬'}[item.type]||'📝';
  const pv=(item.value||'').length>36?item.value.substring(0,36)+'…':item.value;
  let body='';
  if(item.type==='image')
    body+='<div class="media" onclick="event.stopPropagation();openGallery(\\''+esc(item.value)+'\\',\\'img\\')"><img src="'+esc(item.value)+'" loading="lazy" onerror="this.parentElement.innerHTML=\\'<div class=media-err>图片加载失败</div>\\'"></div>';
  if(item.type==='video')
    body+='<div class="media" onclick="event.stopPropagation()"><video controls playsinline preload="metadata" src="'+esc(item.value)+'"></video></div>';
  body+='<div class="val'+(item.type==='link'?' is-link':'')+'"'+(item.type==='link'?' onclick="event.stopPropagation();window.open(\\''+esc(item.value)+'\\',\\'_blank\\')"':'')+'>'+escH(item.value)+'</div>';
  body+='<div class="acts">'+
    '<button class="a-copy" onclick="event.stopPropagation();cp(\\''+esc(item.value)+'\\')">📋 复制</button>'+
    '<button class="a-edit" onclick="event.stopPropagation();editItem(\\''+esc(item.id)+'\\')">✏️ 编辑</button>'+
    '<button class="a-pin" onclick="event.stopPropagation();togglePin(\\''+esc(item.id)+'\\')">📌</button>'+
    '<button class="a-del" onclick="event.stopPropagation();delItem(\\''+esc(item.id)+'\\')">🗑️</button>'+
  '</div>';
  return '<div class="card" id="c-'+item.id+'">'+
    '<div class="card-h" onclick="togCard(\\''+item.id+'\\')">'+
      '<div class="card-ico '+ic+'">'+em+'</div>'+
      '<div class="card-info"><h3>'+escH(item.label)+'</h3><p>'+escH(pv)+'</p></div>'+
      (item.pinned?'<span class="pin-dot"></span>':'')+
      '<span class="chev">▶</span>'+
    '</div>'+
    '<div class="card-b"><div class="card-inner">'+body+'</div></div>'+
  '</div>';
}

function escH(s){return s?s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}
function esc(s){return s?s.replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\\\'").replace(/"/g,'\\\\"'):''}

function togCard(id){document.getElementById('c-'+id)?.classList.toggle('open')}
function togAll(){allOpen=!allOpen;document.querySelectorAll('.card').forEach(c=>{allOpen?c.classList.add('open'):c.classList.remove('open')})}

async function cp(text){
  try{await navigator.clipboard.writeText(text);toast('✅ 已复制')}
  catch{const t=document.createElement('textarea');t.value=text;t.style.cssText='position:fixed;left:-9999px';
    document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);toast('✅ 已复制')}
}

function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),1400)}

function openAdd(){
  document.getElementById('fTitle').textContent='添加信息';
  document.getElementById('fType').value='text';
  document.getElementById('fLabel').value='';
  document.getElementById('fValue').value='';
  document.getElementById('fPin').checked=false;
  document.getElementById('fId').value='';
  clearUpload();onTypeChg();openM('formM');
}

function editItem(id){
  const it=items.find(i=>i.id===id);if(!it)return;
  document.getElementById('fTitle').textContent='编辑信息';
  document.getElementById('fType').value=it.type||'text';
  document.getElementById('fLabel').value=it.label;
  document.getElementById('fValue').value=it.value;
  document.getElementById('fPin').checked=!!it.pinned;
  document.getElementById('fId').value=it.id;
  clearUpload();onTypeChg();openM('formM');
}

function onTypeChg(){
  const t=document.getElementById('fType').value;
  const isMedia=t==='image'||t==='video';
  document.getElementById('uploadArea').style.display=isMedia?'block':'none';
  document.getElementById('fValueWrap').style.display='block';
  const labels={text:'内容',link:'链接地址',image:'图片 URL（可上传自动填入）',video:'视频 URL（可上传自动填入）'};
  document.getElementById('fValL').textContent=labels[t]||'内容';
  document.getElementById('fValue').placeholder=t==='image'?'https://example.com/photo.jpg':t==='video'?'https://example.com/video.mp4':t==='link'?'https://...':'输入内容…';
  document.getElementById('fileInput').accept=t==='video'?'video/*':'image/*';
}

// 表单内文件上传
async function handleFile(input){
  const file=input.files[0];if(!file)return;
  if(file.size>5*1024*1024){toast('⚠️ 文件不能超过 5MB');return}
  const prog=document.getElementById('upProgress');
  const bar=document.getElementById('upBar');
  const txt=document.getElementById('upText');
  prog.style.display='block';bar.style.width='20%';txt.textContent='上传中…';

  const fd=new FormData();fd.append('file',file);
  try{
    bar.style.width='60%';
    const r=await fetch('/api/upload',{method:'POST',body:fd});
    const d=await r.json();
    bar.style.width='100%';txt.textContent='上传完成';
    if(d.ok&&d.result&&d.result[0]){
      const url=IMG_HOST+d.result[0].src;
      document.getElementById('fValue').value=url;
      // 显示预览
      const pv=document.getElementById('upPreview');
      const pvImg=document.getElementById('upImg');
      if(file.type.startsWith('image')){pvImg.src=url;pv.style.display='block'}
      toast('✅ 上传成功');
    }else{toast('❌ 上传失败：'+(d.msg||'未知错误'))}
    setTimeout(()=>{prog.style.display='none'},1500);
  }catch(e){toast('❌ 上传失败');prog.style.display='none'}
  input.value='';
}

function clearUpload(){
  document.getElementById('upPreview').style.display='none';
  document.getElementById('upImg').src='';
  document.getElementById('upProgress').style.display='none';
}

async function submitForm(){
  const label=document.getElementById('fLabel').value.trim();
  const value=document.getElementById('fValue').value.trim();
  if(!label||!value){toast('⚠️ 请填写完整');return}
  const item={id:document.getElementById('fId').value||Date.now().toString(),
    type:document.getElementById('fType').value,label,value,
    pinned:document.getElementById('fPin').checked};
  if(hasKV){
    try{const r=await fetch('/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item})});
      const d=await r.json();if(d.ok){items=d.items;render();toast('✅ 已保存')}else toast('❌ '+(d.msg||'失败'))}
    catch{toast('❌ 网络错误')}
  }else{const idx=items.findIndex(i=>i.id===item.id);if(idx>=0)items[idx]=item;else items.push(item);render();toast('✅ 已保存（本地）')}
  closeM('formM');
}

async function togglePin(id){
  const it=items.find(i=>i.id===id);if(!it)return;
  it.pinned=!it.pinned;
  if(hasKV){
    try{await fetch('/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item:it})});
      const r=await fetch('/api/items');const d=await r.json();items=d.items;render();toast(it.pinned?'📌 已置顶':'📌 取消置顶')}
    catch{render();toast('❌ 操作失败')}
  }else{render();toast(it.pinned?'📌 已置顶':'📌 取消置顶')}
}

async function delItem(id){
  if(!confirm('确定删除？'))return;
  if(hasKV){
    try{const r=await fetch('/api/items',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
      const d=await r.json();if(d.ok){items=d.items;render();toast('🗑️ 已删除')}}
    catch{toast('❌ 删除失败')}
  }else{items=items.filter(i=>i.id!==id);render();toast('🗑️ 已删除')}
}

// 图床独立上传
async function handleImgUpload(input){
  const files=input.files;if(!files.length)return;
  const prog=document.getElementById('upProgress2');
  const bar=document.getElementById('upBar2');
  const txt=document.getElementById('upText2');
  const results=document.getElementById('imgResults');
  prog.style.display='block';

  for(let i=0;i<files.length;i++){
    const file=files[i];
    if(file.size>5*1024*1024){toast('⚠️ '+file.name+' 超过 5MB，跳过');continue}
    const pct=Math.round(((i)/files.length)*100);
    bar.style.width=pct+'%';txt.textContent='上传 '+(i+1)+'/'+files.length+'…';

    const fd=new FormData();fd.append('file',file);
    try{
      const r=await fetch('/api/upload',{method:'POST',body:fd});
      const d=await r.json();
      if(d.ok&&d.result&&d.result[0]){
        const url=IMG_HOST+d.result[0].src;
        const isVideo=file.type.startsWith('video');
        const div=document.createElement('div');div.className='img-result';
        div.innerHTML=(isVideo?'<video src="'+url+'" controls playsinline style="width:100%;max-height:200px;border-radius:8px;margin-bottom:8px"></video>':'<img src="'+url+'">')+
          '<div class="ir-url">'+url+'</div>'+
          '<div class="ir-acts">'+
            '<button style="background:#f0f5ff;color:#0a84ff" onclick="cp(\\''+url.replace(/'/g,"\\\\'")+'\\')">📋 复制链接</button>'+
            '<button style="background:#eef2ff;color:#6366f1" onclick="cp(\\'![img]('+url.replace(/'/g,"\\\\'")+')\\')">[MD] 复制</button>'+
            '<button style="background:#f0fdf4;color:#16a34a" onclick="addAsItem(\\''+url.replace(/'/g,"\\\\'")+'\\',\\''+(isVideo?'video':'image')+'\\')">＋ 添加到面板</button>'+
          '</div>';
        results.prepend(div);
      }else{toast('❌ 上传失败')}
    }catch{toast('❌ '+file.name+' 上传失败')}
  }
  bar.style.width='100%';txt.textContent='全部完成';
  setTimeout(()=>{prog.style.display='none'},2000);
  input.value='';
}

function addAsItem(url,type){
  document.getElementById('fType').value=type;
  document.getElementById('fLabel').value=type==='video'?'视频':'图片';
  document.getElementById('fValue').value=url;
  document.getElementById('fPin').checked=false;
  document.getElementById('fId').value='';
  document.getElementById('fTitle').textContent='添加信息';
  clearUpload();onTypeChg();closeM('imgM');openM('formM');
}

// 全屏预览
function openGallery(url,type){
  const g=document.getElementById('gallery');
  g.innerHTML=type==='img'?'<img src="'+url+'">':'<video src="'+url+'" controls playsinline autoplay></video>';
  g.classList.add('show');
}
function closeGallery(){document.getElementById('gallery').classList.remove('show')}

function openM(id){document.getElementById(id).classList.add('show')}
function closeM(id){document.getElementById(id).classList.remove('show')}
function openKV(){openM('kvM')}
function openUpload(){document.getElementById('imgResults').innerHTML='';document.getElementById('upProgress2').style.display='none';openM('imgM')}

document.querySelectorAll('.mask').forEach(m=>{m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('show')})});

// 拖拽上传
['dropZone','dropZone2'].forEach(id=>{
  const z=document.getElementById(id);if(!z)return;
  z.addEventListener('dragover',e=>{e.preventDefault();z.classList.add('drag')});
  z.addEventListener('dragleave',()=>z.classList.remove('drag'));
  z.addEventListener('drop',e=>{e.preventDefault();z.classList.remove('drag');
    const input=z.querySelector('input[type=file]');
    const dt=new DataTransfer();
    for(const f of e.dataTransfer.files)dt.items.add(f);
    input.files=dt.files;input.dispatchEvent(new Event('change'));
  });
});

load();
</script>
</body>
</html>`;
}
