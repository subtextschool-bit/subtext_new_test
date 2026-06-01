// Copy this file to Apps Script and deploy it as a Web App.

const USERS_SHEET_ID = '10_fVJ9HHIjbMGoC2CULBj8Ak91sTh_6zh-bk7NAL5Bg';

const COURSE_TABLES = {
  english: '1qe3P8lpnpfRgrYpBdNreTsv7wdO3lsCgUfsOK3lwPog',
  physics: '1yWDAwuiIC44l_CFNMoW_SvoolD5EAAC2EajwoPr-v6M',
};

function doGet(e) {
  try {
    const p = e.parameter || {};
    const userId = p.userId;
    if (!userId) return error('userId не указан');

    const user = getUser(userId);
    if (!user) return error('Пользователь не найден');
    if (!user.courses.length) return error('У пользователя не указаны курсы');

    const action = p.action || '';
    const course = p.course || user.courses[0];
    if (!COURSE_TABLES[course]) return error(`Курс "${course}" не найден`);

    if (action === 'check_user') return json({ success: true });
    if (action === 'get_support') return json({ success: true, messages: getSupport(userId) });
    if (action === 'send_support') return sendSupport(userId, p.text || '');
    if (action === 'get_slots') return json({ success: true, slots: getSlots(course) });
    if (action === "get_notifications") {
  return jsonResponse(getNotifications(e.parameter.userId));
  }
  if (action === "mark_notifications_read") {
  return jsonResponse(markNotificationsRead(e.parameter.userId));
}
    if (action === 'get_group_slots') return json({ success: true, slots: getGroupSlots(course) });
    if (action === 'book_slot') return bookSlot(userId, p.slotId, course);
    if (action === 'book_group_slot') return bookGroupSlot(userId, p.slotId, course);
    if (action === 'buy_item') return handleBuy(userId, Number(p.lessonNum), course);

    const agg = { lessons: [], materials: [], shop: [], achievements: [] };
    for (const c of user.courses) {
      if (!COURSE_TABLES[c]) continue;
      agg.lessons.push(...getLessonsByUser(userId, c));
      agg.materials.push(...getMaterialsByUser(userId, c));
      agg.shop.push(...getShopItems(c));
      agg.achievements.push(...getAchievements(user.levels[c] || '', c));
    }

    return json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        progress: user.progress,
        coins: user.coins,
        link: user.link,
        schedule: user.schedule,
        levels: user.levels,
        avatarUrl: user.avatarUrl,
        courses: user.courses,
      },
      lessons: agg.lessons,
      materials: agg.materials,
      shop: agg.shop,
      achievements: agg.achievements,
    });
  } catch (err) {
    return error('GET ошибка: ' + err.message);
  }
}

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) return error('Пустой POST');
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'submit_homework') {
      const user = getUser(data.userId);
      const course = data.course || (user && user.courses[0]) || 'english';
      return handleHomework(data, course);
    }
    return error('Неизвестное POST-действие');
  } catch (err) {
    return error('POST ошибка: ' + err.message);
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function error(message) {
  return json({ success: false, error: message });
}

function getUser(userId) {
  const sheet = SpreadsheetApp.openById(USERS_SHEET_ID).getSheetByName('Лист1');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(userId).trim()) {
      const coursesStr = String(rows[i][9] || '').toLowerCase();
      return {
        id: rows[i][0],
        username: rows[i][1],
        progress: rows[i][2] || 0,
        coins: rows[i][3] || 0,
        link: rows[i][5] || '',
        schedule: rows[i][6] || '',
        levels: { english: rows[i][7] || '', physics: rows[i][8] || '' },
        avatarUrl: rows[i][10] || null,
        courses: coursesStr.split(',').map(c => c.trim()).filter(Boolean),
      };
    }
  }
  return null;
}

function openCourseSheet(course, sheetName) {
  const sheet = SpreadsheetApp.openById(COURSE_TABLES[course]).getSheetByName(sheetName);
  if (!sheet) throw new Error(`Лист "${sheetName}" не найден в курсе "${course}"`);
  return sheet;
}

function getLessonsByUser(userId, course) {
  const rows = openCourseSheet(course, 'Уроки').getDataRange().getValues();
  const res = [];
  for (let i = 1; i < rows.length; i++) {
    const ids = String(rows[i][3] || '').split(',').map(x => x.trim()).filter(Boolean);
    if (ids.length === 0 || ids.includes(String(userId))) {
      res.push({ num: rows[i][0], link: rows[i][1], hwLink: rows[i][2], course });
    }
  }
  return res;
}

function getMaterialsByUser(userId, course) {
  const rows = openCourseSheet(course, 'Материалы').getDataRange().getValues();
  const res = [];
  for (let i = 1; i < rows.length; i++) {
    const ids = String(rows[i][2] || '').split(',').map(x => x.trim()).filter(Boolean);
    if (ids.length === 0 || ids.includes(String(userId))) {
      res.push({ title: rows[i][0] || 'Без названия', link: rows[i][1] || '', course });
    }
  }
  return res;
}

function getShopItems(course) {
  const rows = openCourseSheet(course, 'Магазин').getDataRange().getValues();
  return rows.slice(1).map(r => ({
    image: r[0] || '',
    name: r[1] || 'Товар',
    price: Number(r[2]) || 0,
    course,
  }));
}

function getAchievements(level, course) {
  const rows = openCourseSheet(course, 'Ачивки').getDataRange().getValues();
  return rows.slice(1)
    .filter(r => String(r[0]).trim() === String(level).trim())
    .map(r => ({ title: r[1] || 'Ачивка', image: r[2] || '', course }));
}

function getSlots(course) {
  const rows = openCourseSheet(course, 'Слоты').getDataRange().getValues();
  return rows.slice(1).map(r => ({
    id: r[0], date: r[1], time: r[2], status: r[3], userId: r[4],
    username: r[5], contact: r[6], bookingDate: r[7],
  }));
}

function getGroupSlots(course) {
  const rows = openCourseSheet(course, 'Группы').getDataRange().getValues();
  return rows.slice(1).map(r => ({
    id: r[0], date: r[1], time: r[2], title: r[3], capacity: Number(r[4]) || 1,
    bookedCount: Number(r[5]) || 0, userIds: r[6] || '', usernames: r[7] || '',
  }));
}

function handleHomework(data, course) {
  openCourseSheet(course, 'ДЗ').appendRow([data.userId, data.username, data.text, new Date(), data.lessonNum, 'На проверке']);
  return json({ success: true });
}

function handleBuy(userId, itemIndex, course) {
  const user = getUser(userId);
  if (!user) return error('Пользователь не найден');
  const item = getShopItems(course)[itemIndex];
  if (!item) return error('Товар не найден');
  if (Number(user.coins) < item.price) return error('Недостаточно монет');

  updateUserCoins(userId, Number(user.coins) - item.price);
  openCourseSheet(course, 'Заказы').appendRow([new Date(), userId, user.username || '', item.name, item.price, 'Новый']);
  return json({ success: true });
}

function bookSlot(userId, slotId, course) {
  if (!slotId) return error('slotId не указан');
  const user = getUser(userId);
  if (!user) return error('Пользователь не найден');
  const sheet = openCourseSheet(course, 'Слоты');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(slotId)) {
      if (rows[i][3] !== 'free') return error('Слот уже занят');
      sheet.getRange(i + 1, 4).setValue('booked');
      sheet.getRange(i + 1, 5).setValue(userId);
      sheet.getRange(i + 1, 6).setValue(user.username);
      sheet.getRange(i + 1, 8).setValue(new Date());
      addSchedule(userId, rows[i][1], rows[i][2]);
      return json({ success: true });
    }
  }
  return error('Слот не найден');
}

function bookGroupSlot(userId, slotId, course) {
  if (!slotId) return error('slotId не указан');
  const user = getUser(userId);
  if (!user) return error('Пользователь не найден');
  const sheet = openCourseSheet(course, 'Группы');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(slotId)) {
      const cap = Number(rows[i][4]) || 1;
      const booked = Number(rows[i][5]) || 0;
      if (booked >= cap) return error('Мест больше нет');
      const ids = String(rows[i][6] || '').split(',').map(x => x.trim()).filter(Boolean);
      if (ids.includes(String(userId))) return error('Вы уже записаны');

      sheet.getRange(i + 1, 6).setValue(booked + 1);
      sheet.getRange(i + 1, 7).setValue(rows[i][6] ? rows[i][6] + ',' + userId : userId);
      sheet.getRange(i + 1, 8).setValue(rows[i][7] ? rows[i][7] + ', ' + user.username : user.username);
      addSchedule(userId, rows[i][1], rows[i][2]);
      return json({ success: true });
    }
  }
  return error('Слот не найден');
}

function getSupport(userId) {
  const sheet = SpreadsheetApp.openById(USERS_SHEET_ID).getSheetByName('Поддержка');
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  return rows.slice(1)
    .filter(r => String(r[1]) === String(userId))
    .map(r => ({ question: r[2], answer: r[3] || '' }));
}

function sendSupport(userId, text) {
  if (!String(text).trim()) return error('Пустой вопрос');
  const sheet = SpreadsheetApp.openById(USERS_SHEET_ID).getSheetByName('Поддержка');
  if (!sheet) return error('Лист "Поддержка" не найден');
  sheet.appendRow([new Date(), userId, text, '']);
  return json({ success: true });
}

function updateUserCoins(userId, newCoins) {
  const sheet = SpreadsheetApp.openById(USERS_SHEET_ID).getSheetByName('Лист1');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(userId).trim()) {
      sheet.getRange(i + 1, 4).setValue(newCoins);
      return;
    }
  
  }
}

function addSchedule(userId, date, time) {
  const fmt = Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'dd.MM.yyyy') + ' в ' +
    Utilities.formatDate(new Date(time), Session.getScriptTimeZone(), 'HH:mm');
  const sheet = SpreadsheetApp.openById(USERS_SHEET_ID).getSheetByName('Лист1');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(userId).trim()) {
      const cur = rows[i][6] || '';
      sheet.getRange(i + 1, 7).setValue(cur ? cur + ', ' + fmt : fmt);
      break;
    
    }
  }
  function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getNotifications(userId) {
  if (!userId) {
    return {
      success: false,
      error: "Не указан userId",
      notifications: []
    };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Уведомления");

  if (!sheet) {
    return {
      success: true,
      notifications: []
    };
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return {
      success: true,
      notifications: []
    };
  }

  const headers = values[0].map(String);
  const rows = values.slice(1);

  const idCol = headers.indexOf("id");
  const dateCol = headers.indexOf("Дата");
  const userIdCol = headers.indexOf("userId");
  const titleCol = headers.indexOf("Заголовок");
  const textCol = headers.indexOf("Текст");
  const statusCol = headers.indexOf("Статус");
  const soundCol = headers.indexOf("sound");
  const readByCol = headers.indexOf("readBy");

  const notifications = rows
    .map((row, index) => {
      const targetUserId = String(row[userIdCol] || "").trim();
      const readBy = readByCol >= 0
        ? String(row[readByCol] || "")
            .split(",")
            .map(item => item.trim())
            .filter(Boolean)
        : [];

      const status = statusCol >= 0
        ? String(row[statusCol] || "").trim().toLowerCase()
        : "";

      const isForCurrentUser =
        targetUserId === "all" ||
        targetUserId === "*" ||
        targetUserId === String(userId);

      if (!isForCurrentUser) return null;

      const id = String(row[idCol] || `notification-${index + 2}`).trim();

      const isRead =
        readBy.includes(String(userId)) ||
        status === "read" ||
        status === "прочитано";

      return {
        id,
        date: dateCol >= 0 ? formatSheetDate(row[dateCol]) : "",
        title: titleCol >= 0 ? String(row[titleCol] || "Уведомление") : "Уведомление",
        text: textCol >= 0 ? String(row[textCol] || "") : "",
        read: isRead,
        sound: soundCol >= 0 ? parseSheetBoolean(row[soundCol]) : true
      };
    })
    .filter(Boolean)
    .filter(item => item.text || item.title)
    .reverse();

  return {
    success: true,
    notifications
  };
}

function markNotificationsRead(userId) {
  if (!userId) {
    return {
      success: false,
      error: "Не указан userId"
    };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Уведомления");

  if (!sheet) {
    return {
      success: true
    };
  }

  const range = sheet.getDataRange();
  const values = range.getValues();

  if (values.length < 2) {
    return {
      success: true
    };
  }

  const headers = values[0].map(String);

  const userIdCol = headers.indexOf("userId");
  const statusCol = headers.indexOf("Статус");
  let readByCol = headers.indexOf("readBy");

  if (readByCol === -1) {
    readByCol = headers.length;
    sheet.getRange(1, readByCol + 1).setValue("readBy");
  }

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const targetUserId = String(row[userIdCol] || "").trim();

    const isForCurrentUser =
      targetUserId === "all" ||
      targetUserId === "*" ||
      targetUserId === String(userId);

    if (!isForCurrentUser) continue;

    if (targetUserId === "all" || targetUserId === "*") {
      const currentReadBy = String(row[readByCol] || "")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);

      if (!currentReadBy.includes(String(userId))) {
        currentReadBy.push(String(userId));
      }

      sheet.getRange(i + 1, readByCol + 1).setValue(currentReadBy.join(","));
    } else if (statusCol >= 0) {
      sheet.getRange(i + 1, statusCol + 1).setValue("read");
    }
  }

  return {
    success: true
  };
}

function parseSheetBoolean(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) return true;

  return ![
    "false",
    "0",
    "no",
    "нет",
    "выкл",
    "off"
  ].includes(normalized);
}

function formatSheetDate(value) {
  if (!value) return "";

  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd HH:mm"
    );
  }

  return String(value);
}


}