# FORMA Project — premium renovation landing page

Готовый vanilla HTML/CSS/JS сайт для ремонтной / архитектурной компании с калькулятором сметы, формой заявки, чат-ботом, Vercel API и Google Apps Script интеграцией с Google Sheets.

## Структура проекта

```txt
forma-project-site/
├── index.html
├── styles.css
├── script.js
├── api/
│   ├── submit-lead.js
│   └── chat-lead.js
├── docs/
│   └── apps-script.js
└── README.md
```

## Как запустить локально

Откройте `index.html` в браузере или запустите локальный сервер:

```bash
python -m http.server 5173
```

После этого откройте:

```txt
http://localhost:5173
```

Важно: локально статический сайт откроется, калькулятор и чат будут работать. Отправка заявок через `/api/submit-lead` и `/api/chat-lead` полноценно заработает после деплоя на Vercel и настройки переменных окружения.

## Как задеплоить на Vercel

1. Создайте репозиторий и загрузите файлы проекта.
2. Откройте Vercel.
3. Нажмите `Add New Project`.
4. Выберите репозиторий.
5. Framework Preset можно оставить `Other`.
6. Нажмите `Deploy`.

## Как создать Google Таблицу

1. Создайте новую Google Таблицу.
2. Назовите лист `Leads`.
3. В первой строке добавьте колонки:

```txt
Дата, Источник, Имя, Телефон / WhatsApp, Способ связи, Тип объекта, Площадь, Услуга, Уровень ремонта, Когда начать, Что важно клиенту, Комментарий, Все ответы квиза, Страница, User Agent, Статус
```

## Как подключить Google Apps Script

1. В Google Таблице откройте `Extensions` → `Apps Script`.
2. Удалите стандартный код.
3. Вставьте код из файла `docs/apps-script.js`.
4. В строке `SHEET_ID` вставьте ID вашей Google Таблицы.

ID берётся из ссылки таблицы:

```txt
https://docs.google.com/spreadsheets/d/PASTE_THIS_PART_HERE/edit
```

5. В строке `SECRET_KEY` придумайте и вставьте секретный ключ, например:

```txt
const SECRET_KEY = 'my-super-secret-lead-key-2026';
```

6. Нажмите `Deploy` → `New deployment`.
7. Тип выберите `Web app`.
8. `Execute as`: `Me`.
9. `Who has access`: `Anyone`.
10. Нажмите `Deploy`.
11. Скопируйте `Web App URL`.

## Какие переменные добавить в Vercel

В Vercel откройте проект → `Settings` → `Environment Variables` и добавьте:

```txt
GOOGLE_SCRIPT_URL = ваш Web App URL из Apps Script
LEAD_SECRET_KEY = тот же SECRET_KEY, который указан в Apps Script
```

После добавления переменных сделайте `Redeploy`.

## Как работает отправка заявок

### Основная форма калькулятора

Форма отправляет POST-запрос на:

```txt
/api/submit-lead
```

Передаются данные:

```js
{
  source: 'estimate_calculator',
  status: 'Новая заявка',
  name,
  phone,
  contactMethod,
  objectType,
  area,
  serviceType,
  repairLevel,
  startTime,
  priority,
  estimatedMin,
  estimatedMax,
  estimatedText,
  comment,
  pageUrl,
  userAgent,
  quizAnswers
}
```

### Чат-бот

Чат отправляет POST-запрос на:

```txt
/api/chat-lead
```

Поддерживаемые source:

```txt
chatbot
chatbot_followup
chatbot_update_phone
```

## LocalStorage и защита от дублей

После успешной отправки заявки сайт сохраняет:

```js
localStorage.setItem('leadSubmitted', JSON.stringify({
  submitted: true,
  source: leadData.source,
  name: leadData.name || '',
  phone: leadData.phone || '',
  submittedAt: new Date().toISOString(),
  status: leadData.status || 'Новая заявка'
}));
```

Если пользователь отправляет заявку с тем же номером, сайт показывает сообщение:

```txt
Заявка с этим номером уже отправлена. Мы получили ваши данные. Можете добавить уточнение или написать в WhatsApp.
```

Доступные действия:

- Добавить уточнение
- Отправить новую заявку
- Написать в WhatsApp

## Что уже реализовано

- Адаптивный premium дизайн.
- Header с меню, CTA и мобильным burger menu.
- Hero section с trust-блоками и статистикой.
- Блок болей клиента.
- Услуги.
- Встроенный калькулятор сметы на странице.
- Live summary и диапазон стоимости.
- Форматирование стоимости в млн / тыс. ₸.
- Форма заявки внутри калькулятора.
- Защита от дублей через localStorage.
- Follow-up к заявке через чат или форму.
- Плавающий чат-бот.
- Процесс работы.
- Проекты с premium placeholders.
- До / После placeholders.
- Преимущества.
- Команда.
- Отзывы.
- FAQ accordion.
- Footer.
- SEO title, meta description, Open Graph, semantic HTML.
- Vercel API functions.
- Google Apps Script для записи в Google Sheets.
