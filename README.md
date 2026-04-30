# Restaurant Food Ordering Platform

A full-stack restaurant food ordering application with intelligent recommendation system. The platform consists of a Go-based REST API backend and a Next.js frontend, providing users with a seamless food ordering experience enhanced by AI-powered recommendations.

## Features

### Core Functionality
- **User Authentication & Authorization**: Secure JWT-based authentication system
- **Product Catalog**: Browse and search through restaurant menu items
- **Shopping Cart**: Add, update, and manage items in your cart
- **Order Management**: Place orders and track order history
- **Favorites/Wishlist**: Save your favorite products for quick access
- **Reviews & Comments**: Rate and review products
- **User Profile**: Manage personal information and preferences

### Advanced Features
- **Intelligent Recommendations**: 
  - Personalized recommendations based on user behavior
  - Cart-based recommendations
  - Review-based recommendations
  - Trending products
  - Most frequently ordered items
- **Search Functionality**: Quick product search with filtering
- **Responsive Design**: Modern UI built with Tailwind CSS and Radix UI components

## Architecture

### Tech Stack

#### Backend (`restaurant-app/`)
- **Language**: Go 1.25.4
- **Web Framework**: Gorilla Mux
- **Databases**:
  - **MongoDB**: Primary database for user data, products, orders, cart, favorites, and comments
  - **Neo4j**: Graph database for recommendation engine
- **Authentication**: JWT (JSON Web Tokens)
- **Other**: Environment-based configuration with godotenv

#### Frontend (`restaurant-front/`)
- **Framework**: Next.js 16
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI
- **State Management**: React Context API
- **Form Handling**: React Hook Form with Zod validation

## 📁 Project Structure

```
frontend-db/
├── restaurant-app/          # Go backend API
│   ├── config/              # Configuration management
│   ├── handlers/            # HTTP request handlers
│   │   ├── auth.go         # Authentication endpoints
│   │   ├── cart.go         # Cart management
│   │   ├── comment.go      # Comments/reviews
│   │   ├── favorite.go     # Favorites management
│   │   ├── order.go        # Order processing
│   │   ├── product.go      # Product catalog
│   │   ├── recommendation.go # Recommendation engine
│   │   └── user.go         # User management
│   ├── middleware/          # HTTP middleware (auth, CORS)
│   ├── models/              # Data models and repositories
│   └── main.go             # Application entry point
│
├── restaurant-front/        # Next.js frontend
│   ├── app/                 # Next.js app directory
│   │   ├── page.tsx        # Auth page (login/register)
│   │   ├── home/           # Product catalog
│   │   ├── cart/           # Shopping cart
│   │   ├── profile/        # User profile
│   │   ├── favorites/      # Favorites list
│   │   ├── orders/         # Order history
│   │   ├── product/        # Product details
│   │   └── search/         # Search results
│   ├── components/          # React components
│   ├── contexts/            # React contexts (Auth)
│   ├── lib/                 # Utilities and API clients
│   │   └── api/            # API service modules
│   ├── config/              # API configuration
│   └── types/               # TypeScript type definitions
│
└── README.md
```

## 🛠️ Setup & Installation

### Prerequisites

- **Go** 1.25.4 or higher
- **Node.js** (v18 or higher recommended)
- **MongoDB** (local instance or MongoDB Atlas)
- **Neo4j** (local instance or Neo4j Aura)
- **npm** or **yarn**

### Backend Setup

1. Navigate to the backend directory:
```bash
cd restaurant-app
```

2. Install Go dependencies:
```bash
go mod download
```

3. Create a `.env` file in `restaurant-app/`:
```env
PORT=8080
MONGO_URI=mongodb://localhost:27017
MONGO_DB=restaurant_db
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
JWT_SECRET=your-secret-key-change-in-production
```

4. Make sure MongoDB and Neo4j are running

5. Run the backend server:
```bash
go run main.go
```

The API will be available at `http://localhost:8080`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd restaurant-front
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in `restaurant-front/`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

The frontend will be available at `http://localhost:3000`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Products (Public)
- `GET /api/products` - Get all products
- `GET /api/products/search` - Search products
- `GET /api/products/{id}` - Get product by ID

### User (Protected)
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/orders` - Get user order history
- `GET /api/user/favorites` - Get user favorites
- `GET /api/user/comments` - Get user comments

### Cart (Protected)
- `GET /api/cart` - Get user's cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/{productId}` - Update cart item
- `DELETE /api/cart/items/{productId}` - Remove item from cart
- `DELETE /api/cart/clear` - Clear cart

### Orders (Protected)
- `POST /api/orders` - Create new order
- `GET /api/orders/{id}` - Get order by ID

### Favorites (Protected)
- `POST /api/favorites` - Add to favorites
- `DELETE /api/favorites/{productId}` - Remove from favorites

### Comments (Protected)
- `POST /api/comments` - Add comment/review
- `PUT /api/comments/{id}` - Update comment
- `DELETE /api/comments/{id}` - Delete comment
- `GET /api/products/{productId}/comments` - Get product comments

### Recommendations (Protected)
- `GET /api/recommendations/personalized` - Get personalized recommendations
- `GET /api/recommendations/cart` - Get cart-based recommendations
- `GET /api/recommendations/mostfrequent` - Get user's most frequent items
- `GET /api/recommendations/trending` - Get trending products
- `GET /api/recommendations/reviewbased` - Get review-based recommendations

> **Note**: All protected routes require a JWT token in the `Authorization` header: `Bearer <token>`

## Authentication

The application uses JWT (JSON Web Tokens) for authentication. After successful login, the token is stored in localStorage and automatically included in subsequent API requests.

## Database Schema

### MongoDB Collections
- **users**: User accounts and profiles
- **products**: Restaurant menu items
- **orders**: Order history and details
- **carts**: Shopping cart items per user
- **favorites**: User's favorite products
- **comments**: Product reviews and ratings

### Neo4j Graph
- **Nodes**: Users, Products
- **Relationships**: 
  - `ORDERED` - User orders product
  - `REVIEWED` - User reviews product
  - `FAVORITED` - User favorites product
  - `ADDED_TO_CART` - User adds product to cart

## Development

### Backend Development
- The backend uses Go modules for dependency management
- Follow Go conventions for code organization
- Middleware handles CORS and authentication

### Frontend Development
- Uses Next.js App Router (app directory)
- TypeScript for type safety
- Tailwind CSS for styling
- Components follow React best practices

## Production Deployment

### Environment Variables

**Backend** (`.env`):
- Set secure `JWT_SECRET`
- Use production MongoDB and Neo4j connection strings
- Configure appropriate `PORT`

**Frontend** (`.env.local`):
- Set `NEXT_PUBLIC_API_URL` to production API URL

### Build Commands

**Backend**:
```bash
go build -o restaurant-app
./restaurant-app
```

**Frontend**:
```bash
npm run build
npm start
```

