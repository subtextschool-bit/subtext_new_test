const API_URL = "https://script.google.com/macros/s/AKfycbwptA-FiKIHws7T1BiBKqwqFti7Rz-8l-6Bq-KGh-rP42wbD_hf6Z2uEE8bi5e7pHIs/exec";
let userId = "";
let username = "";
let currentCourse = "";
let cabinetData = null;

function setText(id, value) {
const el = document.getElementById(id);
if (el) el.textContent = value;
}
function getCurrentCourse() {
return currentCourse || cabinetData?.user?.courses?.[0] || "english";
}
function buildUrl(params) {
  const url = new URL(API_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
 
 // ================= UI =================
 function showSection(sectionId) {
   document.querySelectorAll(".section").forEach(el => el.classList.add("hidden"));
   const el = document.getElementById(sectionId);

  if (el) el.classList.remove("hidden");
 
   if (sectionId === "schedule") {
     loadSlots();
   }
   // Здесь можно добавить какую-то логику при открытии "О нас", если нужно
 }
 }
 
 function confirmBuy(index, name, price) {
   if (confirm(`Хотите купить?\n\n${name}\nЦена: ${price} монет`)) {
     buyItem(index);
   }
 }
 
function setCourse(course) {
  currentCourse = course;
  window.currentCourse = course;
  const levels = cabinetData?.user?.levels || {};
  setText("level", levels[course] || "—");
  renderCourseTabs();
  renderCourseData();
}

function renderCourseTabs() {
  const courses = cabinetData?.user?.courses || [];
  const profile = document.getElementById("profile");
  if (!profile) return;

  let tabs = document.getElementById("course-tabs");
  if (!tabs) {
    tabs = document.createElement("div");
    tabs.id = "course-tabs";
    tabs.style.cssText = "display:flex; gap:8px; margin:10px 0; flex-wrap:wrap; justify-content:center;";
    profile.prepend(tabs);
  }

  if (courses.length <= 1) {
    tabs.innerHTML = "";
    return;
  }

  tabs.innerHTML = courses.map(course => `
    <button class="buy-btn" style="opacity:${course === getCurrentCourse() ? "1" : "0.5"}" onclick="setCourse('${escapeAttr(course)}')">
      ${escapeHtml(course.charAt(0).toUpperCase() + course.slice(1))}
    </button>
  `).join("");
}

 // ================= LOAD DATA =================
 async function loadData() {
   const params = new URLSearchParams(window.location.search);

  userId = params.get("id") || params.get("userId") || "";
 
   if (!userId) {
    setText("loading", "❌ Не указан ID");
     return;
   }
 
   try {
    const checkRes = await fetch(buildUrl({ action: "check_user", userId }));
     const checkData = await checkRes.json();
 
     if (!checkData.success) {
      setText("loading", checkData.error || "❌ Вы не зарегистрированы");
       return;
     }
 
     await loadCabinet();
   } catch (e) {
     console.error(e);
    setText("loading", "❌ Ошибка соединения");
   }
 }
 
 async function loadCabinet() {
   try {
    const res = await fetch(buildUrl({ userId }));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
 
     const data = await res.json();
    if (!data.success) throw new Error(data.error || "Ошибка загрузки кабинета");

    cabinetData = data;
    const u = data.user || {};
    username = u.username || "";
    currentCourse = u.courses?.[0] || "english";
    window.currentCourse = currentCourse;

    setText("username", u.username || "—");
    setText("level", u.levels?.[currentCourse] || "—");
    setText("coins", u.coins || 0);
    setText("progress", u.progress || 0);
    setText("lesson-link", u.link || "Не указана");
    setText("lesson-schedule", u.schedule || "Не указано");

    const avatarImg = document.getElementById("avatar-img");
    if (avatarImg) {
      avatarImg.src = u.avatarUrl || "https://via.placeholder.com/120/2e7d32/FFFFFF?text=👤";
    }

    renderProgress(u.progress || 0);
    renderCourseTabs();
    renderCourseData();
 
    document.getElementById("loading")?.classList.add("hidden");
    document.getElementById("main")?.classList.remove("hidden");
  } catch (e) {
    console.error(e);
    setText("loading", `❌ ${e.message}`);
   }
 }

function renderProgress(progress) {
  const progressValue = Math.min(Number(progress) || 0, 100);
  const xpFill = document.getElementById("xp-fill");
  if (!xpFill) return;

  xpFill.style.width = `${progressValue}%`;

  if (progressValue >= 100) {
    xpFill.style.background = "linear-gradient(90deg, gold, orange)";
    xpFill.style.boxShadow = "0 0 18px rgba(255,215,0,.9)";
  } else if (progressValue >= 75) {
    xpFill.style.background = "linear-gradient(90deg, #7b1fa2, #ba68c8)";
    xpFill.style.boxShadow = "0 0 14px rgba(186,104,200,.8)";
  } else {
    xpFill.style.background = "linear-gradient(90deg, #2e7d32, #66bb6a)";
    xpFill.style.boxShadow = "0 0 10px rgba(76,175,80,.6)";
  }
 }
 
function renderCourseData() {
  if (!cabinetData) return;

  const course = getCurrentCourse();

  const achievements = document.getElementById("achievements-list");
  if (achievements) {
    const list = (cabinetData.achievements || []).filter(a => a.course === course);
    achievements.innerHTML = list.length
      ? list.map(a => `
        <div style="display:flex;flex-direction:column;align-items:center;width:100px;">
          <div style="width:80px;height:80px;border-radius:50%;overflow:hidden;box-shadow:0 6px 16px rgba(0,0,0,.15);background:#fff;display:flex;align-items:center;justify-content:center;margin-bottom:8px;">
            <img src="${escapeAttr(a.image)}" alt="${escapeAttr(a.title)}" style="width:100%;height:100%;object-fit:cover;">
          </div>
          <div style="font-size:0.8rem;text-align:center;font-weight:600;">${escapeHtml(a.title)}</div>
         </div>
      `).join("")
       : '<p style="opacity:.6">Пока нет достижений</p>';
   }

  const lessons = document.getElementById("lessons-list");
  if (lessons) {
    const list = (cabinetData.lessons || []).filter(l => l.course === course);
    lessons.innerHTML = list.length
      ? list.map(l => `
        <div class="lesson-card">
          <strong>Урок ${escapeHtml(l.num)}</strong><br>
          <a href="${escapeAttr(l.link)}" target="_blank" rel="noopener">Материалы</a>
          ${l.hwLink && l.hwLink !== "-" ? `<br><a href="${escapeAttr(l.hwLink)}" target="_blank" rel="noopener">ДЗ</a>` : ""}
        </div>
      `).join("")
      : "<p>Нет доступных уроков.</p>";
   }
 
  const materials = document.getElementById("materials-list");
  if (materials) {
    const list = (cabinetData.materials || []).filter(m => m.course === course);
    materials.innerHTML = list.length
      ? list.map(m => `
        <div class="lesson-card">
          <strong>${escapeHtml(m.title)}</strong><br>
          <a href="${escapeAttr(m.link)}" target="_blank" rel="noopener" class="lesson-btn">Открыть</a>
        </div>
      `).join("")
      : "<p>Материалы пока не добавлены.</p>";
   }
 
  const shop = document.getElementById("shop-items");
   if (shop) {
    const list = (cabinetData.shop || []).filter(s => s.course === course);
    setText("shop-coins", cabinetData.user?.coins || 0);
     shop.innerHTML = list.length
      ? list.map((item, index) => `
        <div class="shop-item">
          ${item.image ? `<div style="height:120px;display:flex;align-items:center;justify-content:center;margin-bottom:.5rem"><img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}" style="max-width:100%;max-height:100%;object-fit:contain"></div>` : ""}
          <h3>${escapeHtml(item.name)}</h3>
          <div class="price">${escapeHtml(item.price)} монет</div>
          <button class="buy-btn" onclick="confirmBuy(${index}, '${escapeAttr(item.name)}', ${Number(item.price) || 0})">Купить</button>
        </div>
      `).join("")
      : "<p>Магазин пуст.</p>";
   }
 }

 // ================= СЛОТЫ =================
 function formatDate(dateStr) {
   const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return escapeHtml(dateStr || "");
   const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
   return `${y}-${m}-${day}`;
 }
 
 function formatTime(timeStr) {
   const d = new Date(timeStr);
  if (Number.isNaN(d.getTime())) return escapeHtml(timeStr || "");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
   return `${h}:${min}`;
 }
 
 async function loadSlots() {
  const container = document.getElementById("slots-container");
  if (!container) return;
 
   container.innerHTML = "Загрузка слотов...";
 
   try {
    const res = await fetch(buildUrl({ action: "get_slots", userId, course: getCurrentCourse() }));
     const data = await res.json();
 
     if (!data.success) {
      container.textContent = data.error || "Ошибка загрузки слотов";
       return;
     }
 
    const slots = data.slots || [];
     if (!slots.length) {
       container.textContent = "Нет доступных слотов";
      loadGroupSlots();
       return;
     }
 
     container.innerHTML = slots.map(slot => {
       const isFree = slot.status === "free";
       return `
        <div style="margin-bottom:.8rem;padding:.8rem;border-radius:12px;background:${isFree ? "#e8f5e9" : "#eee"}">
          <strong>${formatDate(slot.date)}</strong> ${formatTime(slot.time)}<br>
           ${isFree
            ? `<button class="buy-btn" onclick="bookSlot('${escapeAttr(slot.id)}')">Записаться</button>`
            : '<span style="opacity:.6">Занято</span>'
           }
         </div>
       `;
     }).join("");
 
    loadGroupSlots();
   } catch (e) {
     console.error(e);
     container.textContent = "Ошибка соединения";
   }
 }
 
 async function bookSlot(slotId) {
   if (!confirm("Записаться на этот слот?")) return;
 
   try {
    const res = await fetch(buildUrl({ action: "book_slot", userId, slotId, course: getCurrentCourse() }));
     const data = await res.json();
 
     if (data.success) {
       alert("✅ Вы записались!");
       loadSlots();
     } else {
      alert("❌ " + (data.error || "Не удалось записаться"));
     }
   } catch (e) {
    console.error(e);
     alert("❌ Ошибка соединения");
   }
 }
 
 async function loadGroupSlots() {
  const container = document.getElementById("group-slots-container");
   if (!container) return;
 
   container.innerHTML = "Загрузка...";
 
   try {
    const res = await fetch(buildUrl({ action: "get_group_slots", userId, course: getCurrentCourse() }));
     const data = await res.json();
 
     if (!data.success) {
      container.textContent = data.error || "Ошибка загрузки";
       return;
     }
 
    const slots = data.slots || [];
     if (!slots.length) {
       container.textContent = "Нет групповых занятий";
       return;
     }
 
     container.innerHTML = slots.map(slot => {
      const freePlaces = Number(slot.capacity) - Number(slot.bookedCount);
       const available = freePlaces > 0;
        <div style="margin-bottom:.8rem;padding:.8rem;border-radius:12px;background:${available ? "#e3f2fd" : "#eee"}">
          <strong>${escapeHtml(slot.title)}</strong><br>
           ${formatDate(slot.date)} ${formatTime(slot.time)}<br>

            ? `<button class="buy-btn" onclick="bookGroupSlot('${escapeAttr(slot.id)}')">Записаться (${escapeHtml(slot.bookedCount)}/${escapeHtml(slot.capacity)})</button>`
            : `<span style="opacity:.6">Мест нет (${escapeHtml(slot.capacity)}/${escapeHtml(slot.capacity)})</span>`
           }
         </div>
       `;
     }).join("");
  } catch (e) {
    console.error(e);
     container.textContent = "Ошибка соединения";
   }
 }
 
 async function bookGroupSlot(slotId) {
   if (!confirm("Записаться на групповое занятие?")) return;
 
   try {
    const res = await fetch(buildUrl({ action: "book_group_slot", userId, slotId, course: getCurrentCourse() }));
     const data = await res.json();
 
     if (data.success) {
       alert("✅ Вы записались!");
       loadGroupSlots();
     } else {
      alert("❌ " + (data.error || "Не удалось записаться"));
     }
  } catch (e) {
    console.error(e);
     alert("Ошибка соединения");
   }
 }
 
 // ================= SHOP =================
 async function buyItem(index) {
   try {
    const res = await fetch(buildUrl({ action: "buy_item", userId, lessonNum: index, course: getCurrentCourse() }));
     const data = await res.json();
     if (data.success) {
       alert("✅ Куплено!");
      await loadCabinet();
     } else {
      alert("❌ " + (data.error || "Не удалось купить"));
     }
  } catch (e) {
    console.error(e);
     alert("❌ Ошибка соединения");
   }
 }
 
 // ===== SUPPORT =====
 function toggleSupport() {
  document.getElementById("support-chat")?.classList.toggle("hidden");
   loadSupport();
 }
 
 async function loadSupport() {
   const container = document.getElementById("support-messages");
  if (!container || !userId) return;
  try {
    const res = await fetch(buildUrl({ action: "get_support", userId }));
    const data = await res.json();
    const messages = data.messages || [];

    container.innerHTML = messages.length
      ? messages.map(m => `
        <div style="margin-bottom:10px;padding:8px;border-radius:8px;background:#f1f8e9">
          <strong>Вы:</strong><br>${escapeHtml(m.question)}<br>
          ${m.answer
            ? `<div style="margin-top:6px;background:#e8f5e9;padding:6px;border-radius:6px"><strong>Ответ:</strong><br>${escapeHtml(m.answer)}</div>`
            : '<div style="margin-top:6px;font-style:italic;color:gray">Ожидает ответа...</div>'
          }
        </div>
      `).join("")
      : '<div style="opacity:.6">Сообщений пока нет</div>';
  } catch (e) {
    console.error(e);
    container.textContent = "Ошибка загрузки поддержки";
  }
 }
 
 async function sendSupport() {
   const input = document.getElementById("support-input");
  const text = input?.value.trim();
   if (!text) return;
 
  try {
    const res = await fetch(buildUrl({ action: "send_support", userId, text }));
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Не удалось отправить вопрос");
 
    input.value = "";
    loadSupport();
  } catch (e) {
    console.error(e);
    alert("❌ " + e.message);
  }
 }
 
 // ================= INIT =================
 window.addEventListener("DOMContentLoaded", loadData);
 
EOF
)
