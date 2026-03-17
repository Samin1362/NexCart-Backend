# NexCart Backend API

A full-featured e-commerce REST API built with Express 5, TypeScript, and Mongoose 9. Features JWT authentication, role-based access control, AI-powered features via Google Gemini, and comprehensive admin dashboard analytics.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express 5
- **Language**: TypeScript
- **Database**: MongoDB Atlas (Mongoose 9 ODM)
- **Authentication**: JWT (Access + Refresh Token)
- **Password Hashing**: bcrypt (12 rounds)
- **AI Integration**: Google Gemini 2.0 Flash
- **Architecture**: MVC (Model-View-Controller)

## Project Structure

```
Server/
├── src/
│   ├── config/
│   │   └── index.ts           # Environment config loader
│   ├── controllers/
│   │   ├── auth.controller.ts  # Register, login, refresh, logout
│   │   ├── user.controller.ts  # Profile & admin user management
│   │   ├── category.controller.ts
│   │   ├── product.controller.ts
│   │   ├── review.controller.ts
│   │   ├── cart.controller.ts
│   │   ├── order.controller.ts
│   │   ├── dashboard.controller.ts
│   │   └── ai.controller.ts    # Gemini AI features
│   ├── middlewares/
│   │   ├── auth.middleware.ts   # JWT verification
│   │   ├── role.middleware.ts   # Role-based authorization
│   │   └── validate.middleware.ts
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── category.model.ts
│   │   ├── product.model.ts
│   │   ├── review.model.ts
│   │   ├── cart.model.ts
│   │   └── order.model.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── category.routes.ts
│   │   ├── product.routes.ts
│   │   ├── review.routes.ts
│   │   ├── cart.routes.ts
│   │   ├── order.routes.ts
│   │   ├── dashboard.routes.ts
│   │   └── ai.routes.ts
│   ├── types/
│   │   └── index.ts            # All TypeScript interfaces
│   ├── utils/
│   │   ├── errors.ts           # Custom error classes
│   │   ├── helpers.ts          # Slug generator
│   │   └── response.ts         # Standardized API responses
│   ├── app.ts                  # Express app configuration
│   ├── server.ts               # MongoDB connection & server start
│   └── seed.ts                 # Database seeder with demo data
├── .env
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Google Gemini API key (optional, for AI features)

### Installation

```bash
cd Server
npm install
```

### Environment Variables

Create a `.env` file in the `Server` directory:

```env
PORT=5001
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/nexcart
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
GEMINI_API_KEY=your_gemini_api_key
```

### Run Development Server

```bash
npm run dev
```

### Seed Database

Populates the database with demo users, categories, products, reviews, and orders:

```bash
npm run seed
```

### Build & Start Production

```bash
npm run build
npm start
```

### Demo Credentials (after seeding)

| Role  | Email                | Password |
|-------|----------------------|----------|
| Admin | admin@nexcart.com    | 123456   |
| Admin | manager@nexcart.com  | 123456   |
| User  | john@nexcart.com     | 123456   |
| User  | jane@nexcart.com     | 123456   |
| User  | bob@nexcart.com      | 123456   |

## API Response Format

All endpoints return a standardized response:

```json
{
  "success": true,
  "message": "Description of the result",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errorDetails": "Technical details (dev only)"
}
```

## Authentication

The API uses JWT-based authentication with access and refresh tokens.

- **Access Token**: Short-lived (15 minutes), sent in `Authorization: Bearer <token>` header
- **Refresh Token**: Long-lived (7 days), stored as bcrypt hash in database
- Passwords are hashed with bcrypt (12 salt rounds)
- Refresh tokens are single-use (rotated on each refresh)

## API Endpoints

### Health Check

| Method | Endpoint       | Auth | Description        |
|--------|---------------|------|--------------------|
| GET    | `/api/health` | No   | API health status  |

---

### Auth (`/api/auth`)

| Method | Endpoint          | Auth | Description                           |
|--------|-------------------|------|---------------------------------------|
| POST   | `/register`       | No   | Register new user                     |
| POST   | `/login`          | No   | Login and get access + refresh tokens |
| POST   | `/refresh-token`  | No   | Get new access token using refresh    |
| POST   | `/logout`         | Yes  | Logout and invalidate refresh token   |

**POST /register**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "123456"
}
```

**POST /login**
```json
{
  "email": "john@example.com",
  "password": "123456"
}
```
Returns: `{ accessToken, refreshToken, user }`

**POST /refresh-token**
```json
{
  "refreshToken": "your_refresh_token"
}
```
Returns: `{ accessToken, refreshToken }`

---

### Users (`/api/users`)

| Method | Endpoint   | Auth  | Role  | Description                       |
|--------|-----------|-------|-------|-----------------------------------|
| GET    | `/me`     | Yes   | Any   | Get current user profile          |
| PATCH  | `/me`     | Yes   | Any   | Update own profile                |
| GET    | `/`       | Yes   | Admin | List all users (paginated)        |
| GET    | `/:id`    | Yes   | Admin | Get user by ID                    |
| PATCH  | `/:id`    | Yes   | Admin | Update user (role, block status)  |
| DELETE | `/:id`    | Yes   | Admin | Delete user (cannot self-delete)  |

**PATCH /me** (allowed fields: name, phone, avatar, address)
```json
{
  "name": "Updated Name",
  "phone": "+8801711000000",
  "address": {
    "street": "123 Main St",
    "city": "Dhaka",
    "state": "Dhaka",
    "zipCode": "1200",
    "country": "Bangladesh"
  }
}
```

**GET /** (query params: `page`, `limit`, `search`)

---

### Categories (`/api/categories`)

| Method | Endpoint   | Auth  | Role  | Description                          |
|--------|-----------|-------|-------|--------------------------------------|
| GET    | `/`       | No    | -     | List all categories                  |
| GET    | `/:slug`  | No    | -     | Get category by slug                 |
| POST   | `/`       | Yes   | Admin | Create category                      |
| PATCH  | `/:id`    | Yes   | Admin | Update category                      |
| DELETE | `/:id`    | Yes   | Admin | Delete category (blocked if has products) |

**POST /**
```json
{
  "name": "Electronics",
  "description": "Electronic devices and gadgets",
  "image": "https://example.com/image.jpg"
}
```

---

### Products (`/api/products`)

| Method | Endpoint     | Auth  | Role  | Description                    |
|--------|-------------|-------|-------|--------------------------------|
| GET    | `/`         | No    | -     | List products (filtered, paginated) |
| GET    | `/featured` | No    | -     | Get featured products          |
| GET    | `/:slug`    | No    | -     | Get product by slug            |
| POST   | `/`         | Yes   | Admin | Create product                 |
| PATCH  | `/:id`      | Yes   | Admin | Update product                 |
| DELETE | `/:id`      | Yes   | Admin | Soft delete product            |

**GET /** (query params)
| Param      | Type   | Description                        |
|------------|--------|------------------------------------|
| `search`   | string | Full-text search (title, desc, tags) |
| `category` | string | Filter by category slug            |
| `minPrice` | number | Minimum price filter               |
| `maxPrice` | number | Maximum price filter               |
| `rating`   | number | Minimum rating filter              |
| `brand`    | string | Filter by brand name               |
| `sort`     | string | `price_asc`, `price_desc`, `rating`, `newest` |
| `page`     | number | Page number (default: 1)           |
| `limit`    | number | Items per page (default: 10)       |

**POST /**
```json
{
  "title": "iPhone 15 Pro",
  "description": "Latest Apple smartphone with A17 Pro chip",
  "price": 1199,
  "discountPrice": 1099,
  "images": ["https://example.com/img1.jpg"],
  "category": "category_object_id",
  "brand": "Apple",
  "stock": 50,
  "tags": ["iphone", "apple"],
  "specifications": [
    { "key": "Storage", "value": "256GB" }
  ],
  "isFeatured": true
}
```

---

### Reviews (`/api/reviews`)

| Method | Endpoint              | Auth | Role | Description                       |
|--------|----------------------|------|------|-----------------------------------|
| GET    | `/product/:productId` | No   | -    | Get reviews for a product         |
| POST   | `/`                  | Yes  | Any  | Create review (one per user per product) |
| DELETE | `/:id`               | Yes  | Any  | Delete review (own or admin)      |

**POST /**
```json
{
  "productId": "product_object_id",
  "rating": 5,
  "comment": "Excellent product, highly recommended!"
}
```

Product rating and review count are automatically recalculated on create/delete.

---

### Cart (`/api/cart`)

| Method | Endpoint              | Auth | Description                    |
|--------|-----------------------|------|--------------------------------|
| GET    | `/`                   | Yes  | Get current user's cart        |
| POST   | `/add`                | Yes  | Add item to cart               |
| PATCH  | `/update`             | Yes  | Update item quantity           |
| DELETE | `/remove/:productId`  | Yes  | Remove item from cart          |
| DELETE | `/clear`              | Yes  | Clear entire cart              |

**POST /add**
```json
{
  "productId": "product_object_id",
  "quantity": 2
}
```

**PATCH /update** (quantity=0 removes the item)
```json
{
  "productId": "product_object_id",
  "quantity": 3
}
```

Features:
- Duplicate product IDs are merged (quantity incremented)
- Stock validation on add/update
- Price snapshot from product's discountPrice (or price if no discount)
- Cart total automatically recalculated

---

### Orders (`/api/orders`)

| Method | Endpoint        | Auth  | Role  | Description                          |
|--------|----------------|-------|-------|--------------------------------------|
| POST   | `/`            | Yes   | Any   | Place order from cart                |
| GET    | `/`            | Yes   | Any   | Get own orders (paginated)           |
| GET    | `/:id`         | Yes   | Any   | Get order by ID (own or admin)       |
| PATCH  | `/:id/cancel`  | Yes   | Any   | Cancel own order (PENDING only)      |
| GET    | `/all`         | Yes   | Admin | Get all orders (filtered, paginated) |
| PATCH  | `/:id/status`  | Yes   | Admin | Update order status                  |

**POST /** (places order from current cart)
```json
{
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Dhaka",
    "state": "Dhaka",
    "zipCode": "1200",
    "country": "Bangladesh"
  },
  "paymentMethod": "CARD",
  "notes": "Please deliver before 5 PM"
}
```

**Order Number Format**: `NC-YYYYMMDD-XXXXX` (auto-generated, sequential)

**Pricing**:
- Shipping: Free for orders over $100, otherwise $10
- Tax: 5% of subtotal

**Status Transitions** (enforced):
```
PENDING → PROCESSING → SHIPPED → DELIVERED
PENDING → CANCELLED (user cancel)
```

**Payment Status on Cancel**:
- PENDING payment → stays PENDING
- PAID payment → changes to REFUNDED

Features:
- Stock decremented on order placement
- Stock restored on cancellation
- Cart cleared after order placement
- Delivered orders get `deliveredAt` timestamp

---

### Dashboard (`/api/dashboard`) — Admin Only

| Method | Endpoint          | Auth  | Role  | Description                |
|--------|------------------|-------|-------|----------------------------|
| GET    | `/stats`         | Yes   | Admin | Overall dashboard stats    |
| GET    | `/chart-data`    | Yes   | Admin | Chart data for analytics   |
| GET    | `/recent-orders` | Yes   | Admin | Last 10 orders             |

**GET /stats** returns:
```json
{
  "totalUsers": 5,
  "totalProducts": 25,
  "totalOrders": 5,
  "totalRevenue": 1677.87,
  "pendingOrders": 1,
  "deliveredOrders": 1
}
```

**GET /chart-data** returns:
- `revenueByMonth` — Monthly revenue for last 12 months (PAID orders)
- `ordersByStatus` — Order count grouped by status
- `topCategories` — Top 10 categories by items sold

---

### AI (`/api/ai`) — Requires Gemini API Key

| Method | Endpoint                | Auth  | Role  | Description                        |
|--------|------------------------|-------|-------|------------------------------------|
| POST   | `/chat`                | Yes   | Any   | AI shopping assistant chatbot      |
| POST   | `/generate-description`| Yes   | Admin | Generate product description       |
| POST   | `/review-summary`      | No    | -     | Summarize product reviews with AI  |

**POST /chat**
```json
{
  "message": "Can you recommend a good laptop under $1100?"
}
```
The chatbot has access to the product catalog and provides recommendations based on available inventory.

**POST /generate-description**
```json
{
  "title": "Wireless Bluetooth Speaker",
  "category": "Electronics"
}
```
Generates a 2-3 paragraph product description.

**POST /review-summary**
```json
{
  "productId": "product_object_id"
}
```
Returns: `{ summary, sentiment, reviewCount }`
- Sentiment: `positive`, `negative`, `mixed`, or `neutral`
- If no reviews exist, returns a default message without calling the AI API

---

## Database Models

### User
| Field        | Type     | Notes                        |
|-------------|----------|------------------------------|
| name        | String   | Required, min 2 chars        |
| email       | String   | Required, unique             |
| password    | String   | Required, bcrypt hashed, select: false |
| role        | String   | `USER` or `ADMIN`            |
| avatar      | String   | Profile image URL            |
| phone       | String   |                              |
| address     | Object   | street, city, state, zipCode, country |
| isBlocked   | Boolean  | Default: false               |
| refreshToken| String   | Hashed, select: false        |

### Category
| Field        | Type   | Notes              |
|-------------|--------|--------------------|
| name        | String | Required, unique   |
| slug        | String | Auto-generated     |
| description | String |                    |
| image       | String |                    |
| productCount| Number | Auto-maintained    |

### Product
| Field          | Type       | Notes                         |
|---------------|------------|-------------------------------|
| title         | String     | Required, min 3 chars         |
| slug          | String     | Auto-generated, unique        |
| description   | String     | Required, min 10 chars        |
| price         | Number     | Required, min 0               |
| discountPrice | Number     | 0 = no discount               |
| images        | [String]   | Min 1 required                |
| category      | ObjectId   | Ref: Category                 |
| brand         | String     |                               |
| stock         | Number     | Required, min 0               |
| sold          | Number     | Auto-incremented on order     |
| rating        | Number     | Auto-calculated from reviews  |
| reviewCount   | Number     | Auto-calculated               |
| tags          | [String]   | For search                    |
| specifications| [{key, value}] | Key-value pairs           |
| isFeatured   | Boolean    | Default: false                |
| isActive     | Boolean    | Default: true (soft delete)   |
| createdBy    | ObjectId   | Ref: User                     |

**Indexes**: category, price, rating (desc), createdAt (desc), featured+active, text (title+description+tags)

### Review
| Field     | Type     | Notes                           |
|----------|----------|---------------------------------|
| userId   | ObjectId | Ref: User                       |
| productId| ObjectId | Ref: Product                    |
| rating   | Number   | 1-5, required                   |
| comment  | String   | Required, min 5 chars           |

**Indexes**: Compound unique on (productId, userId) — one review per user per product

### Cart
| Field      | Type     | Notes                  |
|-----------|----------|------------------------|
| userId    | ObjectId | Ref: User, unique      |
| items     | Array    | productId, quantity, price |
| totalAmount| Number  | Auto-calculated        |

### Order
| Field           | Type     | Notes                                      |
|----------------|----------|--------------------------------------------|
| orderNumber    | String   | Unique, format: `NC-YYYYMMDD-XXXXX`       |
| userId         | ObjectId | Ref: User                                  |
| items          | Array    | Snapshot: productId, title, price, quantity, image |
| shippingAddress| Object   | street, city, state, zipCode, country      |
| paymentMethod  | String   | `COD`, `CARD`, `BKASH`, `NAGAD`           |
| paymentStatus  | String   | `PENDING`, `PAID`, `FAILED`, `REFUNDED`   |
| orderStatus    | String   | `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED` |
| subtotal       | Number   |                                            |
| shippingCost   | Number   | Free over $100, else $10                   |
| tax            | Number   | 5% of subtotal                             |
| totalAmount    | Number   | subtotal + shipping + tax                  |
| notes          | String   |                                            |
| cancelReason   | String   |                                            |
| deliveredAt    | Date     | Set when status changes to DELIVERED       |

**Indexes**: (userId, createdAt desc), orderStatus, createdAt desc

---

## Error Handling

Custom error classes with HTTP status codes:

| Error Class      | Status Code | Usage                           |
|-----------------|-------------|----------------------------------|
| AppError        | Any         | Base error class                 |
| BadRequestError | 400         | Invalid input / validation       |
| UnauthorizedError| 401        | Missing or invalid token         |
| ForbiddenError  | 403         | Insufficient permissions         |
| NotFoundError   | 404         | Resource not found               |
| ConflictError   | 409         | Duplicate resource               |

The global error handler catches all errors and returns a consistent response format. Unhandled errors return 500 with a generic message.

---

## Security Features

- JWT tokens with short expiry (15min access, 7d refresh)
- Refresh token rotation (old token invalidated on use)
- Passwords never returned in API responses (`select: false`)
- Refresh tokens stored as bcrypt hashes in database
- Role-based middleware guards on all admin endpoints
- Blocked users cannot authenticate
- Users cannot delete their own admin account
- Request body size limited to 10MB
- Input validation on all mutation endpoints

---

## Seed Data Summary

Running `npm run seed` populates:

| Collection  | Count | Details                                          |
|------------|-------|--------------------------------------------------|
| Users      | 5     | 2 admins + 3 regular users                       |
| Categories | 8     | Electronics, Clothing, Home & Kitchen, Books, Sports & Outdoors, Beauty & Health, Toys & Games, Automotive |
| Products   | 25    | 8 featured, realistic prices, specs, and tags    |
| Reviews    | 15    | Ratings 4-5, spread across 9 products            |
| Orders     | 5     | DELIVERED, SHIPPED, PROCESSING, PENDING, CANCELLED |

---

## Scripts

| Command         | Description                        |
|----------------|-------------------------------------|
| `npm run dev`  | Start dev server with hot reload    |
| `npm run build`| Compile TypeScript to JavaScript    |
| `npm start`    | Run compiled production build       |
| `npm run seed` | Seed database with demo data        |
