# Скрэтч — Telegram Mini App для бильярдных турниров

## Структура проекта

```
scratch/
├── backend/          # Сервер (Node.js + Fastify + PostgreSQL)
│   └── src/
│       ├── index.js          # Точка входа — запускает сервер
│       ├── db/
│       │   ├── schema.js     # Описание таблиц базы данных
│       │   └── client.js     # Подключение к PostgreSQL
│       ├── routes/
│       │   ├── auth.js       # /auth/telegram — вход через Telegram
│       │   ├── tournaments.js # /tournaments — список, создание, запись
│       │   └── users.js      # /users/me — профиль
│       └── middleware/
│           └── auth.js       # Проверка JWT токена
└── frontend/         # Интерфейс (React + Vite)
    └── src/
        ├── App.jsx           # Корневой компонент
        ├── api/auth.js       # Запросы к серверу
        ├── pages/
        │   └── TournamentList.jsx  # Лента турниров
        └── styles.css        # Темная тема
```

## Запуск

### Backend
```bash
cd backend
cp .env.example .env   # заполни переменные
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
