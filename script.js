const LEAD_KEY = 'leadSubmitted';
const WHATSAPP_URL = 'https://wa.me/77000000000';

const calculatorData = {
  objectType: 'новостройка',
  area: '',
  serviceType: 'дизайн + ремонт под ключ',
  repairLevel: 'comfort',
  startTime: 'через 1–3 месяца',
  priority: 'прозрачная смета'
};

const levelLabels = {
  basic: 'базовый аккуратный',
  comfort: 'комфорт',
  business: 'бизнес',
  premium: 'премиум'
};

const basePricePerM2 = { basic: 90000, comfort: 140000, business: 220000, premium: 320000 };
const designPricePerM2 = { basic: 12000, comfort: 18000, business: 25000, premium: 35000 };
const objectModifiers = {
  'новостройка': 1,
  'вторичное жильё': 1.1,
  'частный дом': 1.15,
  'коммерческое помещение': 1.12,
  'офис': 1.08,
  'другое': 1.05
};
const serviceModifiers = {
  'только ремонт': 1,
  'дизайн-проект': 1,
  'дизайн + ремонт под ключ': 1.15,
  'ремонт + комплектация': 1.2,
  'коммерческий ремонт': 1.12,
  'консультация / аудит': 1
};
const startModifiers = {
  'как можно скорее': 1.05,
  'в течение месяца': 1.03,
  'через 1–3 месяца': 1,
  'пока изучаю варианты': 1
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
    return `${millions.toFixed(millions >= 10 ? 1 : 1).replace('.0', '')} млн ₸`;
  }
  if (number >= 1000) return `${Math.round(number / 1000)} тыс. ₸`;
  return `${number.toLocaleString('ru-RU')} ₸`;
}

function calculateEstimate() {
  const area = Number(calculatorData.area);
  if (!area || area <= 0) return null;
  if (calculatorData.serviceType === 'консультация / аудит') {
    return { type: 'consultation', text: 'Для консультации стоимость зависит от формата: онлайн-разбор, выезд на объект или аудит сметы. Оставьте заявку — менеджер уточнит задачу.' };
  }
  const price = calculatorData.serviceType === 'дизайн-проект'
    ? designPricePerM2[calculatorData.repairLevel]
    : basePricePerM2[calculatorData.repairLevel] * (objectModifiers[calculatorData.objectType] || 1) * (serviceModifiers[calculatorData.serviceType] || 1) * (startModifiers[calculatorData.startTime] || 1);
  const estimated = area * price;
  const min = estimated * 0.85;
  const max = estimated * 1.25;
  return { type: 'range', min, max, text: `Ориентировочно:\nот ${formatCurrency(min)} до ${formatCurrency(max)}` };
}

function updateActiveButtons() {
  document.querySelectorAll('[data-choice]').forEach(group => {
    const key = group.dataset.choice;
    group.querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.value === calculatorData[key]));
  });
  document.querySelectorAll('[data-area]').forEach(button => button.classList.toggle('active', button.dataset.area === String(calculatorData.area)));
}

let currentQuizStep = 0;
const totalQuizSteps = 7;

function updateCompletion() {
  const percent = Math.round(((currentQuizStep + 1) / totalQuizSteps) * 100);
  const label = currentQuizStep < totalQuizSteps - 1
    ? `Вопрос ${currentQuizStep + 1} из ${totalQuizSteps}`
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
    ['Услуга', calculatorData.serviceType],
    ['Уровень', levelLabels[calculatorData.repairLevel]],
    ['Старт', calculatorData.startTime],
    ['Важно', calculatorData.priority]
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
    contactMethod: document.getElementById('contactMethod').value,
    objectType: calculatorData.objectType,
    area: calculatorData.area,
    serviceType: calculatorData.serviceType,
    repairLevel: levelLabels[calculatorData.repairLevel],
    startTime: calculatorData.startTime,
    priority: calculatorData.priority,
    estimatedMin: result?.min ? Math.round(result.min) : '',
    estimatedMax: result?.max ? Math.round(result.max) : '',
    estimatedText,
    comment: forceNew ? `${comment}\nПользователь повторно отправил заявку с тем же номером.`.trim() : comment,
    pageUrl: window.location.href,
    userAgent: navigator.userAgent,
    quizAnswers: { ...calculatorData }
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
    message.textContent = 'Заявка отправлена. Менеджер свяжется с вами после обработки данных.';
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
    Object.assign(calculatorData, { objectType: 'новостройка', area: '', serviceType: 'дизайн + ремонт под ключ', repairLevel: 'comfort', startTime: 'через 1–3 месяца', priority: 'прозрачная смета' });
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
      await postJson('/api/chat-lead', { source: 'chatbot_followup', status: 'Уточнение к заявке', name: saved?.name || document.getElementById('name').value.trim(), phone: saved?.phone || document.getElementById('phone').value.trim(), comment });
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
    : ['Сколько стоит ремонт?', 'Как проходит работа?', 'Можно рассчитать смету?', 'Сколько длится ремонт?', 'Вы делаете дизайн?', 'Хочу связаться с менеджером'];
  document.getElementById('quickReplies').innerHTML = replies.map(reply => `<button type="button">${reply}</button>`).join('');
}

function answerQuestion(text) {
  const q = text.toLowerCase();
  if (q.includes('сто') || q.includes('смет') || q.includes('рассчитать')) return 'Стоимость зависит от площади, состояния объекта, уровня ремонта и материалов. Самый быстрый способ — воспользоваться расчётом сметы на сайте, после него менеджер сможет подготовить предварительный расчёт.';
  if (q.includes('срок') || q.includes('длится')) return 'Сроки зависят от площади и сложности работ. Небольшой объект может занять от 2–3 месяцев, крупный проект — дольше. После консультации можно составить реалистичный график.';
  if (q.includes('дизайн')) return 'Да, можно заказать дизайн-проект отдельно или вместе с ремонтом под ключ. Дизайн помогает заранее продумать планировку, материалы, мебель, свет и избежать дорогих переделок.';
  if (q.includes('договор')) return 'Да, работа строится по договору. В нём фиксируются этапы, условия и ответственность сторон.';
  if (q.includes('менедж') || q.includes('связ')) return 'Оставьте номер телефона или перейдите в WhatsApp — менеджер сможет ответить подробнее и рассчитать ваш объект.';
  if (q.includes('когда со мной свяжутся')) return 'Обычно менеджер связывается после обработки заявки. Чтобы ускорить ответ, можно написать напрямую в WhatsApp.';
  return 'Я могу подсказать по ремонту, дизайну, срокам, смете и этапам работы. Для точного ответа лучше оставить номер — менеджер уточнит детали.';
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
        addMessage('Вы уже отправили заявку. Мы получили ваши данные, менеджер скоро свяжется с вами. Если хотите, можете дописать уточнение — мы добавим его к вашей заявке.');
        renderQuickReplies('saved');
      } else {
        addMessage('Здравствуйте! Я помогу сориентироваться по ремонту, дизайну и примерной смете. Можете выбрать вопрос ниже или написать свой.');
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
    if (text === 'Добавить комментарий') { awaitingFollowup = true; addMessage('Напишите уточнение одним сообщением. Я добавлю его к заявке.'); return; }
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
        await postJson('/api/chat-lead', { source: 'chatbot', status: 'Новая заявка', phone: text, comment: 'Клиент оставил телефон через чат-бот.' });
        saveLeadToLocalStorage({ source: 'chatbot', phone: text, status: 'Новая заявка' });
        addMessage('Спасибо. Номер передан менеджеру.');
        renderQuickReplies('saved');
        return;
      }
    } catch (error) {
      addMessage('Не удалось отправить данные. Попробуйте написать в WhatsApp.');
      return;
    }
    // TODO: здесь можно подключить AI API или backend для реального чат-бота
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

document.addEventListener('DOMContentLoaded', () => {
  setupMenu();
  setupCalculator();
  setupChat();
});
