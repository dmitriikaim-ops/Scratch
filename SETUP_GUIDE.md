# Скрэтч — Гайд по установке на новый компьютер

Этот документ описывает все шаги которые нужно пройти чтобы запустить проект
на любом новом компьютере с Windows.

---

## Что нужно установить

| Программа | Где скачать | Зачем |
|-----------|-------------|-------|
| Git | git-scm.com | Работа с кодом и GitHub |
| Node.js (LTS) | nodejs.org | Запуск JavaScript на компьютере |
| Docker Desktop | docker.com/products/docker-desktop | Запуск базы данных |

---

## Шаг 1 — Установка программ

### Git
Скачай с git-scm.com, устанавливай с настройками по умолчанию.

### Node.js
Скачай LTS версию с nodejs.org, устанавливай с настройками по умолчанию.
Галочка "Add to PATH" должна быть включена.

### Docker Desktop
Скачай с docker.com/products/docker-desktop.
После установки перезагрузи компьютер.

**Важно для некоторых компьютеров:** если Docker показывает ошибку
"Virtualization support not detected" — нужно включить виртуализацию в BIOS.

Для компьютеров Dell:
1. Перезагрузи компьютер и сразу жми F2
2. Найди раздел Advanced → CPU Configuration
3. Найди "Intel Virtualization Technology" и включи (Enabled)
4. Нажми F10 → Yes (сохранить и выйти)

Для других производителей клавиша входа в BIOS может быть Del, F2 или F10.

---

## Шаг 2 — Скачать проект с GitHub

Открывай Git CMD и вводи:

```
cd D:\            # или любой диск где хочешь хранить проект
mkdir Проекты
cd Проекты
git clone https://github.com/dmitriikaim-ops/Scratch.git
cd Scratch
```

Проект скачается со всеми файлами.

---

## Шаг 3 — Запустить базу данных

Убедись что Docker Desktop запущен (значок кита в трее).

Открывай Git CMD и вводи:

```
docker run --name scratch-db -e POSTGRES_USER=scratch -e POSTGRES_PASSWORD=scratch123 -e POSTGRES_DB=scratch -p 5432:5432 -d postgres:16
```

Проверь что запустилось:

```
docker ps
```

Должна появиться строка с именем scratch-db и статусом Up.

**Если контейнер уже создан** (повторный запуск после выключения компьютера):

```
docker start scratch-db
```

---

## Шаг 4 — Настроить Backend

```
cd Scratch\Backend
npm install
```

Создай файл .env — скопируй вручную или через команду:

```
copy env.example .env
```

Открой .env в блокноте и заполни:

```
DATABASE_URL=postgresql://scratch:scratch123@localhost:5432/scratch
JWT_SECRET=scratch-secret-key-minimum-32-characters
BOT_TOKEN=твой_токен_от_BotFather
PORT=3000
```

Создай таблицы в базе данных:

```
npx drizzle-kit push
```

Должно появиться: Changes applied

---

## Шаг 5 — Запустить сервер

```
npm run dev
```

Должно появиться:
{"msg":"Server listening at http://0.0.0.0:3000"}

Проверь в браузере: http://localhost:3000/tournaments
Должен увидеть: []

---

## Шаг 6 — Настроить Frontend (TODO)

```
cd ..\Frontend
npm install
npm run dev
```

---

## Ежедневная работа

### Утром — перед началом работы

```
# 1. Запустить Docker (если не запущен автоматически)
#    Открыть Docker Desktop из меню Пуск

# 2. Запустить базу данных
docker start scratch-db

# 3. Скачать последние изменения с GitHub
cd I:\Проекты\Scratch
git pull

# 4. Запустить сервер
cd Backend
npm run dev
```

### Вечером — после работы

```
# Сохранить изменения на GitHub
cd I:\Проекты\Scratch
git add .
git commit -m "описание что сделал"
git push
```

### На другом компьютере

```
# Скачать последние изменения
git pull

# Запустить как обычно
docker start scratch-db
cd Backend
npm run dev
```

---

## Как работать на двух компьютерах

GitHub — это общее хранилище между компьютерами.

```
Рабочий компьютер          GitHub             Домашний компьютер
       |                      |                       |
  git push  ──────────────►   |                       |
       |                      |   ◄──────────  git pull
       |                      |                       |
  git pull  ◄────────────── (изменения с домашнего)   |
       |                      |        git push ──────►
```

Правило одно: всегда начинай работу с `git pull` и заканчивай `git push`.

База данных у каждого компьютера своя локальная — это нормально.
Данные между компьютерами не синхронизируются, только код.

---

## Полезные команды Docker

```
docker ps                    # список запущенных контейнеров
docker start scratch-db      # запустить базу
docker stop scratch-db       # остановить базу
docker logs scratch-db       # логи базы (если что-то не так)
```

## Полезные команды Git

```
git status                   # что изменилось
git pull                     # скачать изменения с GitHub
git add .                    # подготовить все файлы
git commit -m "описание"     # сохранить снимок
git push                     # отправить на GitHub
git log --oneline            # история изменений
```

## Если что-то пошло не так

**Ошибка: npm не найден**
→ Node.js не установлен или нужно перезапустить терминал

**Ошибка: docker не найден**
→ Docker Desktop не запущен, открой его из меню Пуск

**Ошибка: password authentication failed**
→ Проверь файл .env, строка DATABASE_URL должна быть:
   postgresql://scratch:scratch123@localhost:5432/scratch

**Ошибка: ECONNREFUSED**
→ База данных не запущена, выполни: docker start scratch-db

**Сервер не запускается**
→ Проверь что все файлы на месте командой dir в папке Backend
→ Убедись что есть файлы: package.json, drizzle.config.js, .env
