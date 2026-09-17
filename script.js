// ============================================================
// Conexión a Supabase — reemplaza estos dos valores por los de
// tu proyecto (Project Settings > API en supabase.com)
// ============================================================
const SUPABASE_URL = "https://ujappwvovxvkyxkholsf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9If1WWMxRiHEzftiABMsgA_0yfTfPj4";
const SUPABASE_CONFIGURED = !SUPABASE_URL.includes("TU-PROYECTO");

const supabaseClient = SUPABASE_CONFIGURED
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!SUPABASE_CONFIGURED) {
  const banner = document.createElement('div');
  banner.style.cssText = "background:#F1EDE0;color:#8A6D1F;font-size:12.5px;text-align:left;padding:8px 12px;border-radius:8px;margin-bottom:18px;";
  banner.textContent = "Modo demo: agrega SUPABASE_URL y SUPABASE_ANON_KEY en el código para conectar con tu base de datos real.";
  document.querySelector('.login-card').insertBefore(banner, document.querySelector('.login-switch'));
}

const HEART = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none"><path d="M12 20s-7-4.4-9.5-9C.8 7.6 2.6 4.5 6 4.2c2-.2 3.7 1 4.7 2.6.9.9 1.3.9 1.3.9s.4 0 1.3-.9C14.3 5.2 16 4 18 4.2c3.4.3 5.2 3.4 3.5 6.8-2.5 4.6-9.5 9-9.5 9z"/></svg>';
const COMMENT = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none"><path d="M4 5h16v11H8l-4 4z"/></svg>';
const SHARE = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none"><path d="M4 12v7h16v-7M12 3v13M7 8l5-5 5 5"/></svg>';

const PALETTE = ["#00AEEF", "#FF5C4D", "#1F7A54", "#8C74FF", "#E0A400"];
function colorFor(id) {
  let hash = 0;
  for (const ch of String(id)) hash = (hash * 31 + ch.charCodeAt(0)) % PALETTE.length;
  return PALETTE[hash];
}
function initialsFor(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}
function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  return `hace ${Math.floor(hr / 24)} d`;

}

function showToast(text) {
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

function avatarSpan(name, avatarUrl, color) {
  if (avatarUrl) return `<img src="${avatarUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
  return initialsFor(name);
}

function setAvatarEl(el, name, avatarUrl, color) {
  if (avatarUrl) {
    el.style.background = 'transparent';
    el.innerHTML = `<img src="${avatarUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
  } else {
    el.style.background = color || 'var(--violet)';
    el.textContent = initialsFor(name);
  }
}

// ---------- Estado de sesión ----------
let currentUser = null;   // objeto de auth
let currentProfile = null; // fila de la tabla profiles

// ---------- Datos (arrancan vacíos / demo, se llenan al cargar) ----------
const posts = [];
const groups = [];
const events = [];
let careersList = [];
let myGroupIds = new Set();

const DEMO_POSTS = [
  { id: null, author: "Renzo Castañeda", initials: "RC", color: "#00AEEF", career: "Ingeniería de Software",
    time: "hace 12 min",
    body: "Terminamos el sprint del proyecto de Base de Datos II 🎉 subimos el diagrama entidad-relación al grupo del curso, cualquier duda antes de la sustentación me avisan.",
    media: true, likes: 14, comments: 3, liked: false },
  { id: null, author: "Valentina Ríos", initials: "VR", color: "#FF5C4D", career: "Diseño Gráfico",
    time: "hace 40 min",
    body: "Compartiendo el afiche que hicimos para la Semana de la Creatividad ISIL. Feedback bienvenido antes de mandarlo a imprenta 👀",
    media: true, likes: 27, comments: 8, liked: true },
  { id: null, author: "Grupo · Emprende ISIL", initials: "EI", color: "#1F7A54", career: "Grupo",
    time: "hace 2 h",
    body: "Recordatorio: mañana cerramos inscripciones para el taller \"Cómo armar tu primer pitch\". Cupos limitados, el link está fijado arriba del grupo.",
    media: false, likes: 9, comments: 1, liked: false },
];
const DEMO_GROUPS = [
  { id: null, name: "Emprende ISIL", meta: "1,204 miembros · Club", joined: true },
  { id: null, name: "Diseño Gráfico — Ciclo 5", meta: "88 miembros · Carrera", joined: true },
  { id: null, name: "Fotografía y Cine", meta: "340 miembros · Club", joined: false },
];
const DEMO_EVENTS = [
  { id: null, day: "24", mon: "Sep", title: "Semana de la Creatividad ISIL", loc: "Auditorio San Isidro · 5:00 p.m." },
  { id: null, day: "27", mon: "Sep", title: "Taller: primer pitch", loc: "Sala 302 · 3:00 p.m." },
];

// ============================================================
// FEED
// ============================================================
function renderFeed() {
  const feed = document.getElementById('feed');
  if (posts.length === 0) {
    feed.innerHTML = `<div class="notice-card" style="text-align:center; color:var(--ink-soft);">Todavía no hay publicaciones. ¡Sé el primero en compartir algo!</div>`;
    return;
  }
  feed.innerHTML = posts.map((p, i) => `
    <article class="post">
      <div class="post-head">
        <div class="avatar" style="background:${p.avatarUrl ? 'transparent' : p.color}">${avatarSpan(p.author, p.avatarUrl, p.color)}</div>
        <div>
          <div class="post-author">${p.author}${p.career ? `<span class="post-tag">${p.career}</span>` : ``}</div>
          <div class="post-meta">${p.time}</div>
        </div>
      </div>
      <div class="post-body">${p.body}</div>
      ${p.media ? `<div class="post-media">Imagen adjunta</div>` : ``}
      <div class="post-actions">
        <button class="action-btn ${p.liked ? 'liked' : ''}" onclick="toggleLike(${i})">${HEART}<span id="likeCount-${i}">${p.likes}</span></button>
        <button class="action-btn" onclick="toggleComments(${i})">${COMMENT}<span id="commentCount-${i}">${p.comments}</span></button>
        <button class="action-btn" onclick="sharePost(${i})">${SHARE}<span>Compartir</span></button>
      </div>
      <div class="comments-box" id="comments-${i}" style="display:none; margin-top:10px; padding-top:10px; border-top:1px solid var(--line);">
        <div id="commentsList-${i}"></div>
        <div class="notice-row" style="margin-top:8px;">
          <input type="text" class="notice-type" id="commentInput-${i}" placeholder="Escribe un comentario..." style="flex:1;">
          <button class="btn-primary" onclick="sendComment(${i})">Enviar</button>
        </div>
      </div>
    </article>
  `).join('');
}

function sharePost(i) {
  const text = posts[i].body;
  navigator.clipboard?.writeText(text)
    .then(() => showToast("Texto de la publicación copiado ✅"))
    .catch(() => showToast("No se pudo copiar, intenta seleccionar el texto manualmente"));
}

// ---------- Comentarios ----------
const commentsCache = {};

async function toggleComments(i) {
  const box = document.getElementById('comments-' + i);
  const willShow = box.style.display === 'none';
  box.style.display = willShow ? 'block' : 'none';
  if (willShow) await loadComments(i);
}

async function loadComments(i) {
  const postId = posts[i].id;
  const list = document.getElementById('commentsList-' + i);
  if (!SUPABASE_CONFIGURED || !postId) {
    list.innerHTML = `<div class="comment-line" style="color:var(--ink-soft);">Los comentarios necesitan la base de datos conectada.</div>`;
    return;
  }
  const { data } = await supabaseClient
    .from('comments')
    .select('content, created_at, profiles(full_name)')
    .eq('post_id', postId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  commentsCache[postId] = data || [];
  renderComments(i);
}

function renderComments(i) {
  const postId = posts[i].id;
  const list = commentsCache[postId] || [];
  const el = document.getElementById('commentsList-' + i);
  el.innerHTML = list.length
    ? list.map(c => `<div class="comment-line"><b>${c.profiles?.full_name || 'Estudiante ISIL'}:</b> ${c.content}</div>`).join('')
    : `<div class="comment-line" style="color:var(--ink-soft);">Sé el primero en comentar.</div>`;
}

async function sendComment(i) {
  const input = document.getElementById('commentInput-' + i);
  const text = input.value.trim();
  if (!text) return;
  const postId = posts[i].id;
  input.value = "";
  if (!SUPABASE_CONFIGURED || !postId || !currentUser?.id) { showToast("Conecta tu base de datos para comentar"); return; }
  const { error } = await supabaseClient.from('comments').insert({ post_id: postId, author_id: currentUser.id, content: text });
  if (!error) {
    posts[i].comments += 1;
    document.getElementById('commentCount-' + i).textContent = posts[i].comments;
    await loadComments(i);
  }
}

async function toggleLike(i) {
  const p = posts[i];
  p.liked = !p.liked;
  p.likes += p.liked ? 1 : -1;
  const countEl = document.getElementById('likeCount-' + i);
  countEl.textContent = p.likes;
  countEl.closest('button').classList.toggle('liked', p.liked);

  if (!SUPABASE_CONFIGURED || !p.id || !currentUser) return;
  if (p.liked) {
    await supabaseClient.from('reactions').insert({ user_id: currentUser.id, post_id: p.id, type: 'like' });
  } else {
    await supabaseClient.from('reactions')
      .delete()
      .match({ user_id: currentUser.id, post_id: p.id, type: 'like' });
  }
}

async function loadFeed() {
  if (!SUPABASE_CONFIGURED) {
    posts.length = 0;
    posts.push(...DEMO_POSTS.map(p => ({ ...p })));
    renderFeed();
    return;
  }
  const { data: postsData, error } = await supabaseClient
    .from('posts')
    .select('id, content, created_at, author_id, profiles(full_name, username, avatar_url, careers(name))')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error || !postsData) { posts.length = 0; renderFeed(); return; }

  const { data: reactionsData } = await supabaseClient
    .from('reactions')
    .select('post_id, user_id')
    .eq('type', 'like');

  const { data: commentsData } = await supabaseClient
    .from('comments')
    .select('post_id')
    .is('deleted_at', null);

  posts.length = 0;
  postsData.forEach(p => {
    const likesForPost = (reactionsData || []).filter(r => r.post_id === p.id);
    const commentsForPost = (commentsData || []).filter(c => c.post_id === p.id);
    const authorName = p.profiles?.full_name || "Estudiante ISIL";
    posts.push({
      id: p.id,
      author: authorName,
      initials: initialsFor(authorName),
      color: colorFor(p.author_id),
      avatarUrl: p.profiles?.avatar_url || null,
      career: p.profiles?.careers?.name || "",
      time: timeAgo(p.created_at),
      body: p.content,
      media: false,
      likes: likesForPost.length,
      comments: commentsForPost.length,
      liked: currentUser ? likesForPost.some(r => r.user_id === currentUser.id) : false
    });
  });
  renderFeed();
}

// ============================================================
// GRUPOS
// ============================================================
function groupCardHTML(g, compact) {
  return `
    <div class="group-card">
      ${compact ? '' : '<div class="group-cover"></div>'}
      <div class="group-name">${g.name}</div>
      <div class="group-meta">${g.meta}</div>
      <button class="btn-outline ${g.joined ? 'joined' : ''}" ${g.id ? `onclick="joinGroup('${g.id}', this)"` : ''} ${g.joined ? 'disabled' : ''}>${g.joined ? 'Ya eres miembro' : 'Unirme'}</button>
    </div>
  `;
}
function renderGroups() {
  document.getElementById('groupsSidebar').innerHTML = groups.slice(0, 3).map(g => groupCardHTML(g, true)).join('');
  document.getElementById('groupsGrid').innerHTML = groups.map(g => groupCardHTML(g, false)).join('');
}

async function joinGroup(groupId, btn) {
  if (!SUPABASE_CONFIGURED || !currentUser) return;
  btn.disabled = true;
  const { error } = await supabaseClient.from('group_members').insert({ group_id: groupId, user_id: currentUser.id });
  if (!error) { myGroupIds.add(groupId); await loadGroups(); }
}

async function loadGroups() {
  if (!SUPABASE_CONFIGURED) {
    groups.length = 0;
    groups.push(...DEMO_GROUPS.map(g => ({ ...g })));
    renderGroups();
    return;
  }
  const { data: groupsData } = await supabaseClient
    .from('groups')
    .select('id, name, description, type')
    .order('created_at', { ascending: false })
    .limit(20);

  if (currentUser) {
    const { data: memberships } = await supabaseClient
      .from('group_members')
      .select('group_id')
      .eq('user_id', currentUser.id);
    myGroupIds = new Set((memberships || []).map(m => m.group_id));
  }

  groups.length = 0;
  (groupsData || []).forEach(g => {
    groups.push({
      id: g.id, name: g.name,
      meta: g.type ? g.type[0].toUpperCase() + g.type.slice(1) : "Grupo",
      joined: myGroupIds.has(g.id)
    });
  });
  renderGroups();
}

// ============================================================
// EVENTOS
// ============================================================
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
function eventCardHTML(e) {
  return `
    <div class="event-card">
      <div class="event-date"><div class="day">${e.day}</div><div class="mon">${e.mon}</div></div>
      <div>
        <div class="event-title">${e.title}</div>
        <div class="event-loc">${e.loc}</div>
      </div>
    </div>
  `;
}
function renderEvents() {
  document.getElementById('eventsSidebar').innerHTML = events.slice(0, 3).map(eventCardHTML).join('');
  document.getElementById('eventsList').innerHTML = events.map(eventCardHTML).join('');
}

async function loadEvents() {
  if (!SUPABASE_CONFIGURED) {
    events.length = 0;
    events.push(...DEMO_EVENTS.map(e => ({ ...e })));
    renderEvents();
    return;
  }
  const { data } = await supabaseClient
    .from('events')
    .select('id, title, location, starts_at')
    .order('starts_at', { ascending: true })
    .limit(10);
  events.length = 0;
  (data || []).forEach(e => {
    const d = new Date(e.starts_at);
    events.push({
      id: e.id,
      day: String(d.getDate()).padStart(2, '0'),
      mon: MESES[d.getMonth()],
      title: e.title,
      loc: (e.location || "") + " · " + d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' })
    });
  });
  renderEvents();
}

// ============================================================
// PERFIL / SESIÓN
// ============================================================
async function loadCareersIntoSelect() {
  if (!SUPABASE_CONFIGURED) return;
  const { data } = await supabaseClient.from('careers').select('id, name, school').order('name');
  careersList = data || [];
  populateCareerOptions('signupCareer', 'isil');
  populateCareerOptions('profileCareer', 'isil');
}

function populateCareerOptions(selectId, schoolType) {
  const select = document.getElementById(selectId);
  const currentValue = select.value;
  select.innerHTML = '<option value="">Selecciona tu carrera...</option>';
  careersList
    .filter(c => (c.school || 'isil') === schoolType)
    .forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
  if ([...select.options].some(o => o.value === currentValue)) select.value = currentValue;
}

function wireSchoolSwitch(switchId, selectId) {
  const el = document.getElementById(switchId);
  el.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      populateCareerOptions(selectId, btn.dataset.value);
    });
  });
}
wireSchoolSwitch('signupSchoolSwitch', 'signupCareer');
wireSchoolSwitch('profileSchoolSwitch', 'profileCareer');

async function initUserSession() {
  if (!SUPABASE_CONFIGURED) {
    currentUser = { id: null };
    currentProfile = { full_name: "María Fernanda", username: "demo", bio: "", avatar_url: null, careers: { name: "Diseño Gráfico" } };
  } else {
    const { data: { user } } = await supabaseClient.auth.getUser();
    currentUser = user;
    if (user) {
      const { data } = await supabaseClient
        .from('profiles')
        .select('full_name, username, bio, avatar_url, carrera_id, careers(name, school)')
        .eq('id', user.id)
        .single();
      currentProfile = data;
    }
  }

  const name = currentProfile?.full_name || "Estudiante ISIL";
  const avatarUrl = currentProfile?.avatar_url || null;
  setAvatarEl(document.getElementById('composerAvatar'), name, avatarUrl, '#00AEEF');
  setAvatarEl(document.querySelector('.side-profile .avatar'), name, avatarUrl, '#00AEEF');
  setAvatarEl(document.getElementById('profileAvatarPreview'), name, avatarUrl, 'var(--violet)');
  document.querySelector('.side-profile-name').textContent = name;
  document.querySelector('.side-profile-role').textContent = currentUser?.email || (currentProfile?.username ? currentProfile.username + "@mail.isil.pe" : "");
  document.getElementById('composerCareerChip').textContent = "🎓 " + (currentProfile?.careers?.name || "Sin carrera asignada");

  // Precargar formulario de Perfil
  document.getElementById('profileName').value = name === "Estudiante ISIL" ? "" : name;
  document.getElementById('profileBio').value = currentProfile?.bio || "";
  const currentSchool = currentProfile?.careers?.school || 'isil';
  const switchEl = document.getElementById('profileSchoolSwitch');
  switchEl.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.value === currentSchool));
  populateCareerOptions('profileCareer', currentSchool);
  if (currentProfile?.carrera_id) document.getElementById('profileCareer').value = currentProfile.carrera_id;
}

// ============================================================
// MENSAJES
// ============================================================
let currentConversationId = null;
let chatPollTimer = null;

function convItemHTML(c) {
  return `<div class="conv-item" onclick="openConversation('${c.id}', '${c.otherName.replace(/'/g, "\\'")}')">
    <div class="avatar" style="background:${colorFor(c.otherId)}; width:38px; height:38px; font-size:13px;">${initialsFor(c.otherName)}</div>
    <div>
      <div class="conv-name">${c.otherName}</div>
      <div class="conv-preview">Toca para ver la conversación</div>
    </div>
  </div>`;
}

async function loadConversations() {
  const listEl = document.getElementById('conversationsList');
  if (!SUPABASE_CONFIGURED || !currentUser?.id) {
    listEl.innerHTML = `<div class="notice-card" style="color:var(--ink-soft); font-size:13.5px;">Conecta tu base de datos para usar mensajes reales.</div>`;
    return;
  }
  const { data, error } = await supabaseClient
    .from('conversations')
    .select('id, user_one, user_two, one:profiles!conversations_user_one_fkey(full_name), two:profiles!conversations_user_two_fkey(full_name)')
    .or(`user_one.eq.${currentUser.id},user_two.eq.${currentUser.id}`);

  if (error || !data || data.length === 0) {
    listEl.innerHTML = `<div class="notice-card" style="color:var(--ink-soft); font-size:13.5px;">Todavía no tienes conversaciones. Escribe un nombre de usuario arriba para empezar una.</div>`;
    return;
  }
  const items = data.map(c => {
    const otherId = c.user_one === currentUser.id ? c.user_two : c.user_one;
    const otherName = (c.user_one === currentUser.id ? c.two?.full_name : c.one?.full_name) || "Estudiante ISIL";
    return { id: c.id, otherId, otherName };
  });
  listEl.innerHTML = items.map(convItemHTML).join('');
}

async function findOrCreateConversation(otherId) {
  const { data: existing } = await supabaseClient
    .from('conversations')
    .select('id')
    .or(`and(user_one.eq.${currentUser.id},user_two.eq.${otherId}),and(user_one.eq.${otherId},user_two.eq.${currentUser.id})`)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabaseClient
    .from('conversations')
    .insert({ user_one: currentUser.id, user_two: otherId })
    .select('id')
    .single();
  if (error) return null;
  return created.id;
}

async function openConversation(id, otherName) {
  currentConversationId = id;
  document.getElementById('chatThread').style.display = 'block';
  document.getElementById('chatWithName').textContent = "Chat con " + otherName;
  await loadMessages();
  clearInterval(chatPollTimer);
  chatPollTimer = setInterval(loadMessages, 4000);
}

async function loadMessages() {
  if (!currentConversationId) return;
  const { data } = await supabaseClient
    .from('messages')
    .select('sender_id, content, created_at')
    .eq('conversation_id', currentConversationId)
    .order('created_at', { ascending: true });
  const box = document.getElementById('chatMessages');
  box.innerHTML = (data || []).map(m =>
    `<div class="bubble ${m.sender_id === currentUser.id ? 'mine' : 'theirs'}">${m.content}</div>`
  ).join('');
  box.scrollTop = box.scrollHeight;
}

// ============================================================
// NOTICIAS ISIL
// ============================================================
const officialNotices = [];
const myNotices = [];

function noticeTypeMeta(type) {
  if (type === 'reclamo') return { label: 'Reclamo', badge: 'badge-reclamo' };
  if (type === 'sugerencia') return { label: 'Sugerencia', badge: 'badge-sugerencia' };
  if (type === 'consulta') return { label: 'Consulta', badge: 'badge-info' };
  return { label: 'Información importante', badge: 'badge-info' };
}
function statusMeta(status) {
  if (status === 'respondido') return { label: 'Respondido', badge: 'badge-sugerencia' };
  if (status === 'cerrado') return { label: 'Cerrado', badge: 'badge-info' };
  return { label: 'En revisión', badge: 'badge-revision' };
}

function renderOfficialNotices() {
  const el = document.getElementById('officialNotices');
  if (officialNotices.length === 0) {
    el.innerHTML = `<div class="notice-card" style="color:var(--ink-soft); font-size:13.5px;">No hay comunicados por ahora.</div>`;
    return;
  }
  el.innerHTML = officialNotices.map(n => `
    <div class="notice-card">
      <span class="notice-badge badge-info">Información importante</span>
      <div class="notice-title">${n.title}</div>
      <div class="notice-meta">${n.date}</div>
      <div class="notice-body">${n.body}</div>
    </div>
  `).join('');
}

async function loadOfficialNotices() {
  if (!SUPABASE_CONFIGURED) { renderOfficialNotices(); return; }
  const { data, error } = await supabaseClient
    .from('announcements')
    .select('title, body, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) { renderOfficialNotices(); return; }
  officialNotices.length = 0;
  (data || []).forEach(a => officialNotices.push({
    title: a.title, body: a.body,
    date: new Date(a.created_at).toLocaleString('es-PE')
  }));
  renderOfficialNotices();
}

function renderMyNotices() {
  const el = document.getElementById('myNotices');
  if (myNotices.length === 0) {
    el.innerHTML = `<div class="notice-card" style="color:var(--ink-soft); font-size:13.5px;">Todavía no has enviado ningún reclamo o consulta.</div>`;
    return;
  }
  el.innerHTML = myNotices.map(n => {
    const meta = noticeTypeMeta(n.type);
    const st = statusMeta(n.status);
    return `
      <div class="notice-card">
        <span class="notice-badge ${meta.badge}">${meta.label}</span>
        <span class="notice-badge ${st.badge}">${st.label}</span>
        <div class="notice-meta">${n.date}</div>
        <div class="notice-body">${n.body}</div>
        ${n.response ? `<div class="notice-body" style="margin-top:8px; padding-top:8px; border-top:1px solid var(--line); color:var(--ink-soft);"><b style="color:var(--ink);">Respuesta:</b> ${n.response}</div>` : ``}
      </div>
    `;
  }).join('');
}

async function loadMyNotices() {
  if (!SUPABASE_CONFIGURED || !currentUser?.id) return;
  const { data, error } = await supabaseClient
    .from('notices')
    .select('type, body, status, response, created_at')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });
  if (error) return;
  myNotices.length = 0;
  data.forEach(n => myNotices.push({
    type: n.type, body: n.body, status: n.status, response: n.response,
    date: new Date(n.created_at).toLocaleString('es-PE')
  }));
  renderMyNotices();
}

// ============================================================
// NAVEGACIÓN
// ============================================================
function setView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tabview === view));
  document.querySelectorAll('.side-link').forEach(l => l.classList.toggle('active', l.dataset.view === view));
  if (view !== 'mensajes' && chatPollTimer) { clearInterval(chatPollTimer); }
}
document.querySelectorAll('.tab, .side-link').forEach(el => {
  el.addEventListener('click', () => setView(el.dataset.tabview || el.dataset.view));
});

// ============================================================
// COMPOSER (publicar)
// ============================================================
const composerInput = document.getElementById('composerInput');
const publishBtn = document.getElementById('publishBtn');
composerInput.addEventListener('input', () => { publishBtn.disabled = composerInput.value.trim().length === 0; });
publishBtn.addEventListener('click', async () => {
  const text = composerInput.value.trim();
  if (!text) return;

  if (!SUPABASE_CONFIGURED) {
    posts.unshift({ id: null, author: currentProfile?.full_name || "Tú", initials: initialsFor(currentProfile?.full_name || "Tú"), color: "#00AEEF", career: currentProfile?.careers?.name || "", time: "ahora", body: text, media: false, likes: 0, comments: 0, liked: false });
    composerInput.value = "";
    publishBtn.disabled = true;
    renderFeed();
    return;
  }

  const { error } = await supabaseClient.from('posts').insert({ author_id: currentUser.id, content: text });
  if (!error) {
    composerInput.value = "";
    publishBtn.disabled = true;
    loadFeed();
  }
});

// ============================================================
// ACCESO (iniciar sesión / crear cuenta)
// ============================================================
const ISIL_DOMAIN = "mail.isil.pe";
const loginScreen = document.getElementById('loginScreen');
const appRoot = document.getElementById('appRoot');

function isInstitutionalEmail(value) {
  const match = value.trim().match(/^([^@\s]+)@([^@\s]+)$/);
  if (!match) return false;
  return match[2].toLowerCase() === ISIL_DOMAIN;
}

async function enterApp() {
  loginScreen.style.display = "none";
  appRoot.style.display = "block";
  await initUserSession();
  await Promise.all([loadFeed(), loadGroups(), loadEvents(), loadOfficialNotices(), loadMyNotices()]);
  await loadConversations();
}

// Cambiar entre "Iniciar sesión" y "Crear cuenta"
const switchToLogin = document.getElementById('switchToLogin');
const switchToSignup = document.getElementById('switchToSignup');
const loginFormPanel = document.getElementById('loginForm');
const signupFormPanel = document.getElementById('signupForm');
const loginTitle = document.getElementById('loginTitle');
const loginSub = document.getElementById('loginSub');

function showPanel(panel) {
  const isLogin = panel === 'login';
  switchToLogin.classList.toggle('active', isLogin);
  switchToSignup.classList.toggle('active', !isLogin);
  loginFormPanel.classList.toggle('active', isLogin);
  signupFormPanel.classList.toggle('active', !isLogin);
  loginTitle.textContent = isLogin ? "Ingresa a ISIL Connect" : "Crea tu cuenta";
  loginSub.textContent = isLogin
    ? "Usa tu correo institucional para entrar a la red de tu comunidad ISIL."
    : "Regístrate con tu correo institucional para unirte a tu comunidad ISIL.";
}
switchToLogin.addEventListener('click', () => showPanel('login'));
switchToSignup.addEventListener('click', () => showPanel('signup'));

// Iniciar sesión
const loginEmail = document.getElementById('loginEmail');
const loginError = document.getElementById('loginError');
loginFormPanel.addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = loginEmail.value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!value) { loginError.textContent = "Ingresa tu correo institucional para continuar."; return; }
  if (!isInstitutionalEmail(value)) {
    loginError.textContent = "Debe ser un correo @" + ISIL_DOMAIN + ", como 74003435@" + ISIL_DOMAIN;
    return;
  }
  loginError.textContent = "";

  if (!SUPABASE_CONFIGURED) { enterApp(); return; }

  const { error } = await supabaseClient.auth.signInWithPassword({ email: value, password });
  if (error) { loginError.textContent = "No pudimos iniciar sesión: " + error.message; return; }
  enterApp();
});

// Crear cuenta
const signupName = document.getElementById('signupName');
const signupEmail = document.getElementById('signupEmail');
const signupCareer = document.getElementById('signupCareer');
const signupPassword = document.getElementById('signupPassword');
const signupError = document.getElementById('signupError');
signupFormPanel.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!signupName.value.trim()) { signupError.textContent = "Ingresa tu nombre completo."; return; }
  const value = signupEmail.value.trim();
  if (!value) { signupError.textContent = "Ingresa tu correo institucional."; return; }
  if (!isInstitutionalEmail(value)) {
    signupError.textContent = "Debe ser un correo @" + ISIL_DOMAIN + ", como 74003435@" + ISIL_DOMAIN;
    return;
  }
  if (signupPassword.value.length < 8) { signupError.textContent = "La contraseña debe tener al menos 8 caracteres."; return; }
  signupError.textContent = "";

  if (!SUPABASE_CONFIGURED) { enterApp(); return; }

  const { data, error } = await supabaseClient.auth.signUp({
    email: value,
    password: signupPassword.value,
    options: { data: { full_name: signupName.value.trim() } }
  });
  if (error) { signupError.textContent = "No pudimos crear tu cuenta: " + error.message; return; }

  // Si ya hay sesión activa (confirmación de correo desactivada), guarda la carrera elegida
  if (data.session && signupCareer.value) {
    await supabaseClient.from('profiles').update({ carrera_id: signupCareer.value }).eq('id', data.user.id);
  }
  enterApp();
});

// ============================================================
// MENSAJES — iniciar chat nuevo
// ============================================================
document.getElementById('dmStartBtn').addEventListener('click', async () => {
  const dmError = document.getElementById('dmError');
  dmError.textContent = "";
  const username = document.getElementById('dmUsername').value.trim();
  if (!username) return;
  if (!SUPABASE_CONFIGURED) { dmError.textContent = "Conecta tu base de datos para usar mensajes reales."; return; }

  const { data: target } = await supabaseClient.from('profiles').select('id, full_name').eq('username', username).maybeSingle();
  if (!target) { dmError.textContent = "No encontramos a nadie con ese usuario."; return; }
  if (target.id === currentUser.id) { dmError.textContent = "Ese eres tú 🙂"; return; }

  const convId = await findOrCreateConversation(target.id);
  if (!convId) { dmError.textContent = "No pudimos iniciar el chat, intenta de nuevo."; return; }
  document.getElementById('dmUsername').value = "";
  await loadConversations();
  openConversation(convId, target.full_name);
});

document.getElementById('chatSendBtn').addEventListener('click', async () => {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || !currentConversationId) return;
  input.value = "";
  await supabaseClient.from('messages').insert({ conversation_id: currentConversationId, sender_id: currentUser.id, content: text });
  loadMessages();
});

// ============================================================
// NOTICIAS ISIL — enviar reclamo
// ============================================================
const noticeInput = document.getElementById('noticeInput');
const noticeType = document.getElementById('noticeType');
const noticeBtn = document.getElementById('noticeBtn');
noticeInput.addEventListener('input', () => { noticeBtn.disabled = noticeInput.value.trim().length === 0; });
noticeBtn.addEventListener('click', async () => {
  if (!noticeInput.value.trim()) return;
  const body = noticeInput.value.trim();
  const type = noticeType.value;

  if (!SUPABASE_CONFIGURED) {
    myNotices.unshift({ type, date: "ahora", body, status: "en_revision" });
    noticeInput.value = "";
    noticeBtn.disabled = true;
    renderMyNotices();
    return;
  }

  const { error } = await supabaseClient.from('notices').insert({ user_id: currentUser.id, type, body });
  if (!error) {
    noticeInput.value = "";
    noticeBtn.disabled = true;
    loadMyNotices();
  }
});

// ============================================================
// PERFIL — guardar cambios (nombre, carrera, bio, foto)
// ============================================================
document.getElementById('sideProfileBtn').addEventListener('click', () => setView('perfil'));

const profileAvatarFile = document.getElementById('profileAvatarFile');
profileAvatarFile.addEventListener('change', () => {
  const file = profileAvatarFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const preview = document.getElementById('profileAvatarPreview');
    preview.style.background = 'transparent';
    preview.innerHTML = `<img src="${reader.result}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
  };
  reader.readAsDataURL(file);
});

document.getElementById('saveProfileBtn').addEventListener('click', async () => {
  const profileError = document.getElementById('profileError');
  const profileSuccess = document.getElementById('profileSuccess');
  profileError.textContent = "";
  profileSuccess.textContent = "";

  const name = document.getElementById('profileName').value.trim();
  const bio = document.getElementById('profileBio').value.trim();
  const carreraId = document.getElementById('profileCareer').value;
  if (!name) { profileError.textContent = "Tu nombre no puede quedar vacío."; return; }

  if (!SUPABASE_CONFIGURED) { showToast("Conecta tu base de datos para guardar cambios"); return; }

  let avatarUrl = currentProfile?.avatar_url || null;
  const file = profileAvatarFile.files[0];
  if (file) {
    const ext = file.name.split('.').pop();
    const path = `${currentUser.id}/avatar.${ext}`;
    const { error: uploadError } = await supabaseClient.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '3600' });
    if (uploadError) {
      profileError.textContent = "No pudimos subir tu foto: " + uploadError.message;
      return;
    }
    const { data: publicUrlData } = supabaseClient.storage.from('avatars').getPublicUrl(path);
    avatarUrl = publicUrlData.publicUrl + "?t=" + Date.now();
  }

  const { error } = await supabaseClient
    .from('profiles')
    .update({ full_name: name, bio, carrera_id: carreraId || null, avatar_url: avatarUrl })
    .eq('id', currentUser.id);

  if (error) { profileError.textContent = "No pudimos guardar: " + error.message; return; }

  profileSuccess.textContent = "¡Perfil actualizado!";
  profileAvatarFile.value = "";
  await initUserSession();
  await loadFeed();
});

// ============================================================
// GRUPOS — crear uno nuevo
// ============================================================
const createGroupForm = document.getElementById('createGroupForm');
document.getElementById('showCreateGroupBtn').addEventListener('click', () => {
  createGroupForm.style.display = createGroupForm.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('createGroupBtn').addEventListener('click', async () => {
  const errEl = document.getElementById('createGroupError');
  errEl.textContent = "";
  const name = document.getElementById('newGroupName').value.trim();
  const description = document.getElementById('newGroupDesc').value.trim();
  const type = document.getElementById('newGroupType').value;
  if (!name) { errEl.textContent = "Ponle un nombre al grupo."; return; }
  if (!SUPABASE_CONFIGURED) { showToast("Conecta tu base de datos para crear grupos"); return; }

  const { error } = await supabaseClient.from('groups').insert({ name, description, type, created_by: currentUser.id });
  if (error) { errEl.textContent = "No pudimos crear el grupo: " + error.message; return; }

  document.getElementById('newGroupName').value = "";
  document.getElementById('newGroupDesc').value = "";
  createGroupForm.style.display = 'none';
  showToast("Grupo creado 🎉");
  loadGroups();
});

// ============================================================
// EVENTOS — crear uno nuevo
// ============================================================
const createEventForm = document.getElementById('createEventForm');
document.getElementById('showCreateEventBtn').addEventListener('click', () => {
  createEventForm.style.display = createEventForm.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('createEventBtn').addEventListener('click', async () => {
  const errEl = document.getElementById('createEventError');
  errEl.textContent = "";
  const title = document.getElementById('newEventTitle').value.trim();
  const description = document.getElementById('newEventDesc').value.trim();
  const location = document.getElementById('newEventLocation').value.trim();
  const startsAtRaw = document.getElementById('newEventStart').value;
  if (!title) { errEl.textContent = "Ponle un título al evento."; return; }
  if (!startsAtRaw) { errEl.textContent = "Elige fecha y hora de inicio."; return; }
  if (!SUPABASE_CONFIGURED) { showToast("Conecta tu base de datos para crear eventos"); return; }

  const { error } = await supabaseClient.from('events').insert({
    title, description, location,
    starts_at: new Date(startsAtRaw).toISOString(),
    created_by: currentUser.id
  });
  if (error) { errEl.textContent = "No pudimos crear el evento: " + error.message; return; }

  document.getElementById('newEventTitle').value = "";
  document.getElementById('newEventDesc').value = "";
  document.getElementById('newEventLocation').value = "";
  document.getElementById('newEventStart').value = "";
  createEventForm.style.display = 'none';
  showToast("Evento creado 🎉");
  loadEvents();
});

// ============================================================
// Arranque
// ============================================================
loadCareersIntoSelect();
