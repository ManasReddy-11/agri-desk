# AgriDesk

AgriDesk is a full-stack farmer-to-consumer marketplace with role-based experiences for consumers, farmers, and admins. This repository contains a React frontend and an Express/MongoDB backend with authentication, cart, orders, payments, reviews, and admin APIs.

## Repository Layout

```text
Agri Desk/
|-- src/                # React frontend
|-- backend/            # Express API and MongoDB models
|-- index.html
|-- package.json        # Frontend scripts
`-- README.md
```

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Router
- Axios

### Backend
- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- Express Validator
- Jest and Supertest

## Main Features

- Role-based login and registration for consumer, farmer, and admin users
- Protected frontend routes for each role
- Product browsing, favorites, cart, and checkout flows for consumers
- Product and order management flows for farmers
- Admin dashboard and admin APIs for platform operations
- Backend APIs for auth, products, users, cart, orders, payments, and admin tools

## Frontend Routes

- `/` and `/login` - login screen
- `/register` - user registration
- `/consumer` - consumer dashboard
- `/consumer/cart` - consumer cart
- `/consumer/checkout` - checkout flow
- `/farmer` - farmer dashboard
- `/admin` - admin dashboard

## Backend API Surface

- `/api/auth` - authentication and current-user endpoints
- `/api/products` - product catalog and favorites
- `/api/users` - user profile operations
- `/api/cart` - cart and checkout preparation
- `/api/orders` - consumer and farmer order flows
- `/api/payment` - payment endpoints
- `/api/admin` - admin operations
- `/api/health` - server health check

## Prerequisites

- Node.js 16+
- npm 8+
- MongoDB connection string

## Environment Variables

### Frontend

Create a root `.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

### Backend

Copy `backend/.env.example` to `backend/.env` and fill in the required values.

Minimum values to run locally:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

## Installation

Install frontend dependencies from the project root:

```bash
npm install
```

Install backend dependencies:

```bash
cd backend
npm install
```

## Running Locally

Start the backend in one terminal:

```bash
cd backend
npm run dev
```

Start the frontend in a second terminal:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

## Available Scripts

### Frontend

- `npm run dev` - start Vite dev server
- `npm run build` - create production build
- `npm run preview` - preview production build locally

### Backend

- `npm start` - run the backend server
- `npm run dev` - run the backend with nodemon
- `npm test` - run backend tests
- `npm run test:api` - run API test script
- `npm run lint` - lint backend files
- `npm run seed` - seed the database

## Project Structure

```text
src/
|-- components/
|-- constants/
|-- context/
|-- pages/
|-- services/
|-- App.jsx
|-- index.css
`-- main.jsx

backend/
|-- config/
|-- controllers/
|-- middleware/
|-- models/
|-- routes/
|-- scripts/
|-- services/
|-- utils/
|-- __tests__/
`-- server.js
```

## Notes

- The frontend expects the backend API base URL from `VITE_API_URL` and falls back to `http://localhost:5000/api`.
- The backend enables CORS for `CLIENT_URL`, which should match the frontend origin.
- Additional backend module guides are available in the `backend/` folder for auth, cart, orders, payments, products, reviews, and admin operations.

## GitHub

Repository: <https://github.com/ManasReddy-11/agri-desk>

## License

MIT

