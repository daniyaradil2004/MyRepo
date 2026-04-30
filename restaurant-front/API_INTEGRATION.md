# Инструкция по интеграции API

## Обзор

Этот документ описывает структуру проекта и процесс интеграции фронтенда с бэкенд API согласно документации, представленной в `New Collection.postman_collection.txt`.

## Структура проекта

```
restaurant-front/
├── app/                    # Next.js страницы
│   ├── page.tsx           # Страница авторизации
│   ├── home/              # Главная страница с продуктами
│   ├── cart/              # Корзина (защищенный маршрут)
│   ├── profile/           # Профиль пользователя (защищенный маршрут)
│   ├── favorites/         # Избранное (защищенный маршрут)
│   ├── search/            # Поиск продуктов
│   └── product/[id]/      # Детальная страница продукта
├── components/            # React компоненты
│   ├── navigation.tsx     # Навигация
│   ├── product-card.tsx   # Карточка продукта
│   └── ProtectedRoute.tsx # Компонент защиты маршрутов
├── contexts/              # React контексты
│   └── AuthContext.tsx    # Контекст аутентификации
├── lib/                   # Утилиты и API клиенты
│   └── api/               # API клиенты для каждого модуля
│       ├── auth.ts        # Аутентификация
│       ├── products.ts    # Продукты
│       ├── cart.ts        # Корзина
│       ├── favorites.ts   # Избранное
│       ├── orders.ts      # Заказы
│       ├── comments.ts    # Комментарии/отзывы
│       ├── user.ts        # Профиль пользователя
│       └── recommendations.ts # Рекомендации
├── types/                 # TypeScript типы
│   └── index.ts           # Все типы данных
└── config/                # Конфигурация
    └── api.ts             # Конфигурация API
```

## Конфигурация API

### Базовая настройка

Все настройки API находятся в `config/api.ts`. По умолчанию используется:
- **Base URL**: `http://localhost:8080`
- **Auth**: JWT Bearer token в заголовке `Authorization: Bearer <token>`
- **CORS Mode**: `cors` (явно указан)
- **Credentials**: `omit` (не отправлять cookies по умолчанию)

### Переменные окружения

Создайте файл `.env.local` в корне проекта:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Настройка CORS

Если вы получаете ошибки CORS, проверьте следующее:

1. **Убедитесь, что бэкенд запущен** и доступен по указанному адресу
2. **Настройте CORS на бэкенде** - это основное решение проблемы CORS:
   - Разрешите origin вашего фронтенда (например, `http://localhost:3000`)
   - Разрешите необходимые методы (GET, POST, PUT, DELETE, OPTIONS)
   - Разрешите необходимые заголовки (Content-Type, Authorization)
   - Если используете cookies, установите `credentials: true`

3. **Если бэкенд требует cookies**, измените в `config/api.ts`:
   ```typescript
   CREDENTIALS: "include" as RequestCredentials,
   ```

4. **Пример настройки CORS для Go (Gin)**:
   ```go
   router.Use(cors.New(cors.Config{
       AllowOrigins:     []string{"http://localhost:3000"},
       AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
       AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
       ExposeHeaders:    []string{"Content-Length"},
       AllowCredentials: true,
       MaxAge:           12 * time.Hour,
   }))
   ```

### Обработка ошибок CORS

Все API запросы используют универсальную функцию `apiRequest`, которая:
- Автоматически обрабатывает CORS ошибки
- Предоставляет понятные сообщения об ошибках
- Обрабатывает таймауты (30 секунд)
- Правильно обрабатывает сетевые ошибки

## Типы данных

Все типы данных определены в `types/index.ts` и соответствуют структуре ответов API:

- `User` - пользователь
- `Product` - продукт
- `Cart`, `CartItem` - корзина
- `Order`, `OrderItem` - заказ
- `Comment` - комментарий/отзыв
- `Address` - адрес доставки

## API Клиенты

Каждый модуль имеет свой файл API в `lib/api/`:

### Аутентификация (`lib/api/auth.ts`)
- `register(data)` - регистрация
- `login(data)` - вход
- `logout()` - выход

### Продукты (`lib/api/products.ts`)
- `getProducts()` - получить все продукты
- `searchProducts(query)` - поиск продуктов
- `getProductById(id)` - получить продукт по ID
- `getProductComments(productId)` - получить комментарии продукта

### Корзина (`lib/api/cart.ts`)
- `getCart()` - получить корзину
- `addToCart(data)` - добавить в корзину
- `updateCartItem(productId, data)` - обновить количество
- `removeCartItem(productId)` - удалить из корзины
- `clearCart()` - очистить корзину
- `createOrder()` - создать заказ из корзины

### Избранное (`lib/api/favorites.ts`)
- `getUserFavorites()` - получить избранное
- `addToFavorites(data)` - добавить в избранное
- `removeFromFavorites(productId)` - удалить из избранного

### Заказы (`lib/api/orders.ts`)
- `createOrder(data?)` - создать заказ
- `getOrderById(id)` - получить заказ по ID
- `getUserOrders()` - получить заказы пользователя

### Комментарии (`lib/api/comments.ts`)
- `createComment(data)` - создать комментарий
- `updateComment(id, data)` - обновить комментарий
- `deleteComment(id)` - удалить комментарий
- `getUserComments()` - получить комментарии пользователя

### Профиль (`lib/api/user.ts`)
- `getUserProfile()` - получить профиль
- `updateUserProfile(data)` - обновить профиль

### Рекомендации (`lib/api/recommendations.ts`)
- `getPersonalizedRecommendations()` - персонализированные рекомендации
- `getCartBasedRecommendations()` - рекомендации на основе корзины

## Аутентификация

### Контекст аутентификации

`AuthContext` предоставляет глобальное состояние аутентификации:

```typescript
const { user, token, isAuthenticated, login, register, logout } = useAuth()
```

### Защита маршрутов

Используйте компонент `ProtectedRoute` для защиты страниц:

```tsx
import ProtectedRoute from "@/components/ProtectedRoute"

export default function CartPage() {
  return (
    <ProtectedRoute>
      {/* Содержимое страницы */}
    </ProtectedRoute>
  )
}
```

Защищенные маршруты:
- `/cart` - корзина
- `/profile` - профиль
- `/favorites` - избранное

## Управление токенами

Токены автоматически сохраняются в `localStorage`:
- `auth_token` - JWT токен
- `auth_user` - данные пользователя

Функции управления токенами в `config/api.ts`:
- `getStoredToken()` - получить токен
- `storeToken(token)` - сохранить токен
- `removeToken()` - удалить токен
- `getStoredUser()` - получить пользователя
- `storeUser(user)` - сохранить пользователя
- `removeUser()` - удалить пользователя

## Обработка ошибок

Все API функции выбрасывают ошибки, которые нужно обрабатывать:

```typescript
try {
  const products = await getProducts()
} catch (error) {
  // Обработка ошибки
  setError(error.message)
}
```

## Примеры использования

### Получение продуктов

```typescript
import { getProducts } from "@/lib/api/products"

const products = await getProducts()
```

### Добавление в корзину

```typescript
import { addToCart } from "@/lib/api/cart"

await addToCart({ product_id: "123", quantity: 1 })
```

### Создание комментария

```typescript
import { createComment } from "@/lib/api/comments"

await createComment({
  product_id: "123",
  text: "Great product!",
  rating: 5
})
```

## Запуск проекта

1. Установите зависимости:
```bash
npm install
```

2. Создайте `.env.local` с настройками API:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

3. Запустите dev сервер:
```bash
npm run dev
```

4. Убедитесь, что бэкенд API запущен на `http://localhost:8080`

## Важные замечания

1. **Все защищенные маршруты требуют аутентификации** - неавторизованные пользователи будут перенаправлены на страницу входа

2. **Токены автоматически добавляются** в заголовки запросов для защищенных эндпоинтов

3. **Ошибки аутентификации (401)** обрабатываются автоматически - пользователь перенаправляется на страницу входа

4. **Все данные загружаются с сервера** - моковые данные удалены

5. **Типы данных соответствуют API** - используйте типы из `types/index.ts` для типобезопасности

## Документация API

Полная документация API находится в файле `New Collection.postman_collection.txt` в корне проекта. Все эндпоинты соответствуют этой документации.

