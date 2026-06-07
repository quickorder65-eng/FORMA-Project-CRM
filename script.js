const LEAD_KEY = 'leadSubmitted';
const WHATSAPP_URL = 'https://wa.me/77758174290';

const calculatorData = {
  objectType: 'Квартира',
  area: '',
  serviceType: 'Ремонт под ключ',
  importantWorks: [],
  startTime: 'Через 1–3 месяца'
};

const basePricePerM2 = { basic: 90000, comfort: 140000, business: 220000 };

const servicePriceLevelMap = {
  'Ремонт под ключ': 'comfort',
  'Пакет Комфорт': 'comfort',
  'Пакет Престиж': 'business',
  'Только черновые работы': 'basic',
  'Только чистовая отделка': 'basic',
  'Нужна консультация': null
};

const objectModifiers = {
  'Квартира': 1,
  'Дом': 1.15,
  'Коммерческое помещение': 1.12,
  'Другое': 1.05
};

const startModifiers = {
  'Срочно': 1.05,
  'В течение месяца': 1.03,
  'Через 1–3 месяца': 1,
  'Просто считаю бюджет': 1
};

function normalizePhone(phone = '') {
  return String(phone).replace(/[\s()+\-]/g, '').trim();
}

function saveLeadToLocalStorage(leadData) {
  localStorage.setItem(LEAD_KEY, JSON.stringify({
    submitted: true,
    source: leadData.source,
    name: leadData.name || '',
    phone: leadData.phone || '',
    submittedAt: new Date().toISOString(),
    status: leadData.status || 'Новая заявка'
  }));
}

function getSavedLead() {
  try { return JSON.parse(localStorage.getItem(LEAD_KEY) || 'null'); }
  catch { return null; }
}

function hasSubmittedLead() {
  return Boolean(getSavedLead()?.submitted);
}

function isDuplicatePhone(phone) {
  const saved = getSavedLead();
  if (!saved?.phone) return false;
  return normalizePhone(saved.phone) === normalizePhone(phone);
}

function clearSavedLead() {
  localStorage.removeItem(LEAD_KEY);
}

function formatCurrency(value) {
  const number = Math.round(Number(value) || 0);
  if (number >= 1000000) {
    const millions = number / 1000000;
    return `${millions.toFixed(1).replace('.0', '')} млн ₸`;
  }
  if (number >= 1000) return `${Math.round(number / 1000)} тыс. ₸`;
  return `${number.toLocaleString('ru-RU')} ₸`;
}

function calculateEstimate() {
  const area = Number(calculatorData.area);
  if (!area || area <= 0) return null;
  const level = servicePriceLevelMap[calculatorData.serviceType];
  if (!level) {
    return { type: 'consultation', text: 'Для консультации стоимость зависит от формата. Оставьте заявку — специалист уточнит детали.' };
  }
  const price = basePricePerM2[level]
    * (objectModifiers[calculatorData.objectType] || 1)
    * (startModifiers[calculatorData.startTime] || 1);
  const estimated = area * price;
  const min = estimated * 0.85;
  const max = estimated * 1.25;
  return { type: 'range', min, max, text: `Ориентировочно:\nот ${formatCurrency(min)} до ${formatCurrency(max)}` };
}

function updateActiveButtons() {
  document.querySelectorAll('[data-choice]').forEach(group => {
    const key = group.dataset.choice;
    group.querySelectorAll('button').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.value === calculatorData[key])
    );
  });
  document.querySelectorAll('[data-area]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.area === String(calculatorData.area))
  );
  document.querySelectorAll('[data-multi-choice]').forEach(group => {
    group.querySelectorAll('button').forEach(btn =>
      btn.classList.toggle('active', calculatorData.importantWorks.includes(btn.dataset.value))
    );
  });
}

let currentQuizStep = 0;
const totalQuizSteps = 6;

function updateCompletion() {
  const percent = Math.round(((currentQuizStep + 1) / totalQuizSteps) * 100);
  const label = currentQuizStep < totalQuizSteps - 1
    ? `Вопрос ${currentQuizStep + 1} из ${totalQuizSteps - 1}`
    : 'Финальный шаг';
  document.getElementById('completionText').textContent = label;
  document.getElementById('completionBar').style.width = `${percent}%`;
}

function showQuizStep(index) {
  currentQuizStep = Math.max(0, Math.min(totalQuizSteps - 1, index));
  document.querySelectorAll('.quiz-step').forEach(step => {
    step.classList.toggle('active', Number(step.dataset.step) === currentQuizStep);
  });
  const back = document.getElementById('quizBack');
  const next = document.getElementById('quizNext');
  if (back) back.disabled = currentQuizStep === 0;
  if (next) {
    next.textContent = currentQuizStep === totalQuizSteps - 2 ? 'К контактам' : 'Дальше';
    next.classList.toggle('quiz-next-hidden', currentQuizStep === totalQuizSteps - 1);
  }
  updateCompletion();
}

function updateSummary() {
  const summaryList = document.getElementById('summaryList');
  const rows = [
    ['Тип объекта', calculatorData.objectType],
    ['Площадь', calculatorData.area ? `${calculatorData.area} м²` : 'не указана'],
    ['Формат', calculatorData.serviceType],
    ['Важные работы', calculatorData.importantWorks.length ? calculatorData.importantWorks.join(', ') : 'не выбрано'],
    ['Старт', calculatorData.startTime]
  ];
  summaryList.innerHTML = rows.map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`).join('');
}

function updateEstimate() {
  const result = calculateEstimate();
  const priceBox = document.getElementById('priceBox');
  if (!result) priceBox.textContent = 'укажите площадь, чтобы увидеть расчёт';
  else if (result.type === 'consultation') priceBox.textContent = result.text;
  else priceBox.innerHTML = result.text.replace('\n', '<br>');
  updateActiveButtons();
  updateCompletion();
  updateSummary();
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.message || 'Не удалось отправить заявку');
  return data;
}

function buildLeadPayload(forceNew = false) {
  const result = calculateEstimate();
  const estimatedText = result ? result.text : '';
  const comment = document.getElementById('comment').value.trim();
  return {
    source: 'estimate_calculator',
    status: 'Новая заявка',
    name: document.getElementById('name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    contactMethod: 'WhatsApp',
    objectType: calculatorData.objectType,
    area: calculatorData.area,
    serviceType: calculatorData.serviceType,
    repairLevel: calculatorData.serviceType,
    startTime: calculatorData.startTime,
    priority: calculatorData.importantWorks.join(', '),
    estimatedMin: result?.min ? Math.round(result.min) : '',
    estimatedMax: result?.max ? Math.round(result.max) : '',
    estimatedText,
    comment: forceNew ? `${comment}\nПользователь повторно отправил заявку с тем же номером.`.trim() : comment,
    pageUrl: window.location.href,
    userAgent: navigator.userAgent,
    quizAnswers: { ...calculatorData, importantWorks: calculatorData.importantWorks.join(', ') }
  };
}

async function submitLead(forceNew = false) {
  const message = document.getElementById('formMessage');
  const submitBtn = document.getElementById('submitBtn');
  const phone = document.getElementById('phone').value.trim();
  message.className = 'form-message';
  if (!phone) {
    message.textContent = 'Укажите телефон / WhatsApp, чтобы отправить заявку.';
    message.classList.add('error');
    return;
  }
  if (!forceNew && isDuplicatePhone(phone)) {
    document.getElementById('duplicateBox').classList.remove('hidden');
    return;
  }
  const payload = buildLeadPayload(forceNew);
  submitBtn.disabled = true;
  submitBtn.textContent = 'Отправляем...';
  try {
    await postJson('/api/submit-lead', payload);
    saveLeadToLocalStorage(payload);
    document.getElementById('duplicateBox').classList.add('hidden');
    message.textContent = 'Спасибо! Заявка отправлена. Специалист Riza Stroy Group свяжется с вами для расчёта.';
    message.classList.add('success');
  } catch (error) {
    message.textContent = error.message || 'Ошибка отправки. Попробуйте написать в WhatsApp.';
    message.classList.add('error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Отправить на расчёт';
  }
}

function setupCalculator() {
  const areaInput = document.getElementById('area');

  function goNext() {
    showQuizStep(currentQuizStep + 1);
  }

  document.querySelectorAll('[data-choice] button').forEach(button => {
    button.addEventListener('click', () => {
      const key = button.closest('[data-choice]').dataset.choice;
      calculatorData[key] = button.dataset.value;
      updateEstimate();
      if (currentQuizStep < totalQuizSteps - 1) {
        window.setTimeout(goNext, 160);
      }
    });
  });

  document.querySelectorAll('[data-multi-choice] button').forEach(button => {
    button.addEventListener('click', () => {
      const value = button.dataset.value;
      const idx = calculatorData.importantWorks.indexOf(value);
      if (idx === -1) {
        calculatorData.importantWorks.push(value);
      } else {
        calculatorData.importantWorks.splice(idx, 1);
      }
      updateEstimate();
    });
  });

  areaInput.addEventListener('input', () => { calculatorData.area = areaInput.value; updateEstimate(); });
  areaInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); if (areaInput.value) goNext(); }
  });

  document.querySelectorAll('[data-area]').forEach(button => {
    button.addEventListener('click', () => {
      calculatorData.area = button.dataset.area;
      areaInput.value = button.dataset.area;
      updateEstimate();
      window.setTimeout(goNext, 160);
    });
  });

  document.getElementById('quizBack').addEventListener('click', () => showQuizStep(currentQuizStep - 1));
  document.getElementById('quizNext').addEventListener('click', () => {
    if (currentQuizStep === 1 && !areaInput.value) {
      areaInput.focus();
      return;
    }
    showQuizStep(currentQuizStep + 1);
  });

  document.getElementById('resetCalculator').addEventListener('click', () => {
    Object.assign(calculatorData, {
      objectType: 'Квартира',
      area: '',
      serviceType: 'Ремонт под ключ',
      importantWorks: [],
      startTime: 'Через 1–3 месяца'
    });
    areaInput.value = '';
    updateEstimate();
    showQuizStep(0);
  });

  document.getElementById('scrollToForm').addEventListener('click', () => {
    showQuizStep(totalQuizSteps - 1);
    document.querySelector('.estimate-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  document.getElementById('estimateForm').addEventListener('submit', e => { e.preventDefault(); submitLead(false); });
  document.getElementById('forceNewLead').addEventListener('click', () => submitLead(true));
  document.getElementById('addFollowup').addEventListener('click', async () => {
    const saved = getSavedLead();
    const comment = document.getElementById('comment').value.trim() || 'Клиент просит добавить уточнение к заявке.';
    const message = document.getElementById('formMessage');
    try {
      await postJson('/api/chat-lead', {
        source: 'chatbot_followup',
        status: 'Уточнение к заявке',
        name: saved?.name || document.getElementById('name').value.trim(),
        phone: saved?.phone || document.getElementById('phone').value.trim(),
        comment
      });
      message.textContent = 'Уточнение добавлено к заявке.';
      message.className = 'form-message success';
    } catch (error) {
      message.textContent = error.message;
      message.className = 'form-message error';
    }
  });

  showQuizStep(0);
  updateEstimate();
}

function addMessage(text, type = 'bot') {
  const body = document.getElementById('chatBody');
  const div = document.createElement('div');
  div.className = `msg ${type}`;
  div.textContent = text;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function renderQuickReplies(mode = 'default') {
  const replies = mode === 'saved'
    ? ['Добавить комментарий', 'Открыть WhatsApp', 'Когда со мной свяжутся?', 'Изменить номер']
    : ['Сколько стоит ремонт?', 'Что входит в пакет Комфорт?', 'Что входит в пакет Престиж?', 'Как проходит оплата?', 'Сколько длится ремонт?', 'Хочу связаться с менеджером'];
  document.getElementById('quickReplies').innerHTML = replies.map(reply => `<button type="button">${reply}</button>`).join('');
}

function answerQuestion(text) {
  const q = text.toLowerCase();
  if (q.includes('сто') || q.includes('смет') || q.includes('рассчитать')) return 'Стоимость зависит от площади, типа объекта и выбранного пакета. Воспользуйтесь калькулятором на сайте — после этого специалист Riza Stroy Group подготовит точный расчёт.';
  if (q.includes('комфорт')) return 'Пакет Комфорт включает: электрику, сантехнику, выравнивание стен и пола, натяжной потолок, покраску, ламинат, кафель, двери, закуп и вывоз мусора. Бонус — тёплый пол на 2 зоны. Можно скачать PDF на сайте.';
  if (q.includes('престиж')) return 'Пакет Престиж — конкретные бренды: Knauf, ВВГ ГОСТ, Deniz, Marshal, Viko, ламинат 32 класса, керамогранит 60×60, трековое освещение. Бонус — тёплый пол на 1 зону. PDF доступен на сайте.';
  if (q.includes('оплат')) return 'Оплата поэтапная: 40% при подписании договора, 30% после черновых работ, 20% после чистовой отделки, 10% при финальной сдаче.';
  if (q.includes('срок') || q.includes('длится')) return 'Сроки зависят от площади и сложности работ. После консультации мы составляем реалистичный график и фиксируем его в договоре.';
  if (q.includes('договор')) return 'Да, работаем по договору. В нём фиксируются все этапы, сроки, условия оплаты и ответственность сторон.';
  if (q.includes('менедж') || q.includes('связ') || q.includes('позвон')) return `Позвоните нам: +7 775 817 42 90 или напишите в WhatsApp — ответим быстро.`;
  if (q.includes('когда со мной свяжутся')) return 'Обычно менеджер связывается в течение рабочего дня. Чтобы ускорить — напишите напрямую в WhatsApp: +7 775 817 42 90.';
  return 'Я помогу по вопросам ремонта, пакетов, сроков и стоимости. Для точного ответа лучше оставить номер — специалист Riza Stroy Group уточнит детали.';
}

function setupChat() {
  const toggle = document.getElementById('chatToggle');
  const windowEl = document.getElementById('chatWindow');
  const close = document.getElementById('chatClose');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  let awaitingFollowup = false;
  let awaitingNewPhone = false;
  let initialized = false;

  function openChat() {
    windowEl.classList.remove('hidden');
    if (!initialized) {
      const saved = getSavedLead();
      if (saved?.submitted) {
        addMessage('Вы уже отправили заявку. Мы получили ваши данные, специалист скоро свяжется с вами. Если хотите — можете добавить уточнение к заявке.');
        renderQuickReplies('saved');
      } else {
        addMessage('Здравствуйте! Я помогу сориентироваться по ремонту, пакетам и примерной стоимости. Выберите вопрос или напишите свой.');
        renderQuickReplies('default');
      }
      initialized = true;
    }
  }

  toggle.addEventListener('click', openChat);
  close.addEventListener('click', () => windowEl.classList.add('hidden'));
  document.getElementById('quickReplies').addEventListener('click', async e => {
    if (!e.target.matches('button')) return;
    const text = e.target.textContent;
    addMessage(text, 'user');
    if (text === 'Открыть WhatsApp') { window.open(WHATSAPP_URL, '_blank'); return; }
    if (text === 'Добавить комментарий') { awaitingFollowup = true; addMessage('Напишите уточнение одним сообщением — я добавлю его к заявке.'); return; }
    if (text === 'Изменить номер') { awaitingNewPhone = true; addMessage('Напишите новый номер телефона.'); return; }
    addMessage(answerQuestion(text));
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMessage(text, 'user');
    const saved = getSavedLead();
    const phoneLike = normalizePhone(text).length >= 8;
    try {
      if (awaitingFollowup && saved?.phone) {
        await postJson('/api/chat-lead', { source: 'chatbot_followup', status: 'Уточнение к заявке', name: saved.name, phone: saved.phone, comment: text });
        awaitingFollowup = false;
        addMessage('Готово. Уточнение добавлено к вашей заявке.');
        return;
      }
      if (awaitingNewPhone && phoneLike) {
        await postJson('/api/chat-lead', { source: 'chatbot_update_phone', status: 'Обновлённый номер', name: saved?.name || '', phone: text, comment: `Клиент попросил изменить номер. Старый номер: ${saved?.phone || 'не указан'}` });
        saveLeadToLocalStorage({ source: 'chatbot_update_phone', name: saved?.name || '', phone: text, status: 'Обновлённый номер' });
        awaitingNewPhone = false;
        addMessage('Номер обновлён. Мы передали его менеджеру.');
        return;
      }
      if (phoneLike) {
        await postJson('/api/chat-lead', { source: 'chatbot', status: 'Новая заявка', phone: text, comment: 'Клиент оставил телефон через чат.' });
        saveLeadToLocalStorage({ source: 'chatbot', phone: text, status: 'Новая заявка' });
        addMessage('Спасибо. Номер передан специалисту Riza Stroy Group.');
        renderQuickReplies('saved');
        return;
      }
    } catch (error) {
      addMessage('Не удалось отправить данные. Попробуйте написать в WhatsApp: +7 775 817 42 90.');
      return;
    }
    addMessage(answerQuestion(text));
  });
}

function setupMenu() {
  const burger = document.getElementById('burger');
  const nav = document.getElementById('mainNav');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', e => {
    if (e.target.matches('a')) nav.classList.remove('open');
  });
}

function setupLazyVideos() {
  const videos = document.querySelectorAll('video.lazy-video');
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    },
    { threshold: 0.35 }
  );
  videos.forEach(video => {
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    observer.observe(video);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupMenu();
  setupCalculator();
  setupChat();
  setupLazyVideos();
});
