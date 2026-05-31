const API_URL = "https://script.google.com/macros/s/AKfycby4xLAp7oIp53YGooG3WH7Hi73y--C-nIrNhbX-35BKzl7__kRf9nr5FAdYWKnfBiT5/exec";


let userId;
let username = "";

// ================= UI =================
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
  const el = document.getElementById(sectionId);
  if (el) el.classList.remove('hidden');

  if (sectionId === "schedule") {
    loadSlots();
  }
  if (sectionId === "about") {
    // Здесь можно добавить какую-то логику при открытии "О нас", если нужно
  }
}

function confirmBuy(index, name, price) {
  if (confirm(`Хотите купить?\n\n${name}\nЦена: ${price} монет`)) {
    buyItem(index);
  }
}

// ================= LOAD DATA =================
async function loadData() {
  const params = new URLSearchParams(window.location.search);
  userId = params.get('id');

  if (!userId) {
    document.getElementById('loading').textContent = '❌ Не указан ID';
    return;
  }

  try {
    const checkRes = await fetch(`${API_URL}?action=check_user&userId=${encodeURIComponent(userId)}`);
    const checkData = await checkRes.json();

    if (!checkData.success) {
      document.getElementById('loading').textContent = '❌ Вы не зарегистрированы';
      return;
    }

    await loadCabinet();

  } catch (e) {
    console.error(e);
    document.getElementById('loading').textContent = '❌ Ошибка соединения';
  }
}

async function loadCabinet() {
  try {
    const res = await fetch(`${API_URL}?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error();

    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const u = data.user;
    username = u.username || "";
// 👇 Вставь сюда
window.currentCourse = (data.user.subject || 'english').split(',')[0].trim();
    
    document.getElementById('username').textContent = u.username || '—';
    document.getElementById('level').textContent = u.level || '—';
    document.getElementById('coins').textContent = u.coins || 0;
    document.getElementById('progress').textContent = u.progress || 0;
    const progressValue = Math.min(u.progress || 0, 100);
const xpFill = document.getElementById('xp-fill');

xpFill.style.width = progressValue + "%";

// 🎨 Цвета по уровню
if (progressValue >= 100) {
  // 🟡 ЗОЛОТО
  xpFill.style.background = "linear-gradient(90deg, gold, orange)";
  xpFill.style.boxShadow = "0 0 18px rgba(255,215,0,.9)";
}
else if (progressValue >= 75) {
  // 🟣 Почти уровень ап
  xpFill.style.background = "linear-gradient(90deg, #7b1fa2, #ba68c8)";
  xpFill.style.boxShadow = "0 0 14px rgba(186,104,200,.8)";
}
else {
  // 🟢 Обычный прогресс
  xpFill.style.background = "linear-gradient(90deg, #2e7d32, #66bb6a)";
  xpFill.style.boxShadow = "0 0 10px rgba(76,175,80,.6)";
}

    document.getElementById('lesson-link').textContent =
      u.link ? u.link : "Не указана";

    document.getElementById('lesson-schedule').textContent =
      u.schedule ? u.schedule : "Не указано";

    const avatarImg = document.getElementById('avatar-img');
    avatarImg.src = u.avatarUrl || "https://via.placeholder.com/120/2e7d32/FFFFFF?text=👤";
   
// ===== АЧИВКИ =====
const achievementsList = document.getElementById('achievements-list');

if (achievementsList) {
  achievementsList.innerHTML = data.achievements && data.achievements.length
    ? data.achievements.map(a => `
      <div style="
        display:flex;
        flex-direction:column;
        align-items:center;
        width:100px;
      ">
        <div style="
          width:80px;
          height:80px;
          border-radius:50%;
          overflow:hidden;
          box-shadow:0 6px 16px rgba(0,0,0,.15);
          background:#fff;
          display:flex;
          align-items:center;
          justify-content:center;
          margin-bottom:8px;
        ">
          <img src="${a.image}" 
               style="width:100%;height:100%;object-fit:cover;">
        </div>
        <div style="
          font-size:0.8rem;
          text-align:center;
          font-weight:600;
        ">
          ${a.title}
        </div>
      </div>
    `).join('')
    : '<p style="opacity:.6">Пока нет достижений</p>';
}
    
    // ===== Уроки =====
    const lessonsList = document.getElementById('lessons-list');
    lessonsList.innerHTML = data.lessons.length
      ? data.lessons.map(l => `
        <div class="lesson-card">
          <strong>Урок ${l.num}</strong><br>
          <a href="${l.link}" target="_blank">Материалы</a>
          ${l.hwLink && l.hwLink !== '-' ? `<br><a href="${l.hwLink}" target="_blank">ДЗ</a>` : ''}
        </div>
      `).join('')
      : '<p>Нет доступных уроков.</p>';

    // ===== Материалы =====
const materialsList = document.getElementById('materials-list');

materialsList.innerHTML = data.materials && data.materials.length
  ? data.materials.map(m => `
    <div class="lesson-card">
      <strong>${m.title}</strong><br>
      <a href="${m.link}" target="_blank" class="lesson-btn">Открыть</a>
    </div>
  `).join('')
  : '<p>Материалы пока не добавлены.</p>';


    // ===== Магазин =====
    const shopItems = document.getElementById('shop-items');
    document.getElementById('shop-coins').textContent = u.coins;
    shopItems.innerHTML = data.shop.length
      ? data.shop.map((item, idx) => `
        <div class="shop-item">
          ${item.image ? `<div style="height:120px;display:flex;align-items:center;justify-content:center;margin-bottom:.5rem">
            <img src="${item.image}" style="max-width:100%;max-height:100%;object-fit:contain">
          </div>` : ''}
          <h3>${item.name}</h3>
          <div class="price">${item.price} монет</div>
          <button class="buy-btn" onclick="confirmBuy(${idx}, \`${item.name}\`, ${item.price})">Купить</button>
        </div>
      `).join('')
      : '<p>Магазин пуст.</p>';

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main').classList.remove('hidden');
    showSection('profile');

  } catch (e) {
    console.error(e);
    document.getElementById('loading').textContent = '❌ Ошибка загрузки кабинета';
  }
}

// ================= СЛОТЫ =================
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(timeStr) {
  const d = new Date(timeStr);
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

async function loadSlots() {
  const container = document.getElementById('slots-container');

  container.innerHTML = "Загрузка слотов...";

  try {
  const res = await fetch(`${API_URL}?action=get_slots&userId=${encodeURIComponent(userId)}&course=${window.currentCourse}`);
    const data = await res.json();

    if (!data.success) {
      container.textContent = "Ошибка загрузки слотов";
      return;
    }

    const slots = data.slots;

    if (!slots.length) {
      container.textContent = "Нет доступных слотов";
      loadGroupSlots();   // ← ВАЖНО: чтобы группы всё равно загрузились
      return;
    }

    container.innerHTML = slots.map(slot => {
      const isFree = slot.status === "free";

      return `
        <div style="margin-bottom:.8rem;padding:.8rem;border-radius:12px;
          background:${isFree ? '#e8f5e9' : '#eee'}">
         <strong>${formatDate(slot.date)}</strong> ${formatTime(slot.time)}<br>

          ${isFree
            ? `<button class="buy-btn" onclick="bookSlot(${slot.id})">Записаться</button>`
            : `<span style="opacity:.6">Занято</span>`
          }
        </div>
      `;
    }).join("");

    loadGroupSlots();   // ← ВОТ СЮДА НУЖНО ВСТАВИТЬ

  } catch (e) {
    console.error(e);
    container.textContent = "Ошибка соединения";
  }
}

async function bookSlot(slotId) {
  if (!confirm("Записаться на этот слот?")) return;

  try {
    const res = await fetch(
  `${API_URL}?action=book_slot&userId=${encodeURIComponent(userId)}&slotId=${encodeURIComponent(slotId)}&course=${window.currentCourse}`
);
      `${API_URL}?action=book_slot&userId=${encodeURIComponent(userId)}&slotId=${encodeURIComponent(slotId)}`
    );

    const data = await res.json();

    if (data.success) {
      alert("✅ Вы записались!");
      loadSlots();
    } else {
      alert("❌ " + data.error);
    }

  } catch (e) {
    alert("❌ Ошибка соединения");
  }
}

async function loadGroupSlots() {

  const container = document.getElementById('group-slots-container');
  if (!container) return;

  container.innerHTML = "Загрузка...";

  try {

   const res = await fetch(`${API_URL}?action=get_group_slots&userId=${encodeURIComponent(userId)}&course=${window.currentCourse}`);
    const data = await res.json();

    if (!data.success) {
      container.textContent = "Ошибка загрузки";
      return;
    }

    const slots = data.slots;

    if (!slots.length) {
      container.textContent = "Нет групповых занятий";
      return;
    }

    container.innerHTML = slots.map(slot => {

      const freePlaces = slot.capacity - slot.bookedCount;
      const available = freePlaces > 0;

      return `
        <div style="margin-bottom:.8rem;padding:.8rem;border-radius:12px;
          background:${available ? '#e3f2fd' : '#eee'}">

          <strong>${slot.title}</strong><br>
          ${formatDate(slot.date)} ${formatTime(slot.time)}<br>

          ${available
            ? `<button class="buy-btn"
                 onclick="bookGroupSlot(${slot.id})">
                 Записаться (${slot.bookedCount}/${slot.capacity})
               </button>`
            : `<span style="opacity:.6">
                 Мест нет (${slot.capacity}/${slot.capacity})
               </span>`
          }
        </div>
      `;
    }).join("");

  } catch {
    container.textContent = "Ошибка соединения";
  }
}

async function bookGroupSlot(slotId) {

  if (!confirm("Записаться на групповое занятие?")) return;

  try {

    const res = await fetch(
  `${API_URL}?action=book_group_slot&userId=${encodeURIComponent(userId)}&slotId=${slotId}&course=${window.currentCourse}`
);
      `${API_URL}?action=book_group_slot&userId=${encodeURIComponent(userId)}&slotId=${slotId}`
    );

    const data = await res.json();

    if (data.success) {
      alert("✅ Вы записались!");
      loadGroupSlots();
    } else {
      alert("❌ " + data.error);
    }

  } catch {
    alert("Ошибка соединения");
  }
}

// ================= HOMEWORK =================


// ================= SHOP =================
async function buyItem(index) {
  try {
    const res = await fetch(`${API_URL}?action=buy_item&userId=${userId}&lessonNum=${index}&course=${window.currentCourse}`);
    const data = await res.json();
    if (data.success) {
      alert("✅ Куплено!");
      location.reload();
    } else {
      alert("❌ " + data.error);
    }
  } catch {
    alert("❌ Ошибка соединения");
  }
}

// ===== SUPPORT =====
function toggleSupport() {
  document.getElementById("support-chat").classList.toggle("hidden");
  loadSupport();
}

async function loadSupport() {
  const res = await fetch(`${API_URL}?action=get_support&userId=${userId}`);
  const data = await res.json();

  const container = document.getElementById("support-messages");

  container.innerHTML = data.messages.map(m => `
    <div style="margin-bottom:10px;padding:8px;border-radius:8px;background:#f1f8e9">
      <strong>Вы:</strong><br>${m.question}<br>
      ${m.answer 
        ? `<div style="margin-top:6px;background:#e8f5e9;padding:6px;border-radius:6px">
            <strong>Ответ:</strong><br>${m.answer}
           </div>`
        : `<div style="margin-top:6px;font-style:italic;color:gray">Ожидает ответа...</div>`
      }
    </div>
  `).join('');
}

async function sendSupport() {
  const input = document.getElementById("support-input");
  const text = input.value.trim();
  if (!text) return;

  await fetch(`${API_URL}?action=send_support&userId=${userId}&text=${encodeURIComponent(text)}`);

  input.value = "";
  loadSupport();
}

// ================= INIT =================
window.addEventListener("DOMContentLoaded", loadData);
