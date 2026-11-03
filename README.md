# wellnest — Hospital Management System

A full-stack clinic workspace built with React, Express, and MongoDB. It includes a clinic dashboard, patient records, appointment scheduling, status tracking, and account sign-in.

## Requirements

- Node.js 20.19+ (or 22.12+)
- MongoDB running locally, or a MongoDB connection string

## Run locally

1. Install dependencies:

   ```powershell
   npm install
   npm install --prefix client
   ```

2. Copy `.env.example` to `.env` and set `MONGODB_URI` and a long random `JWT_SECRET`.

3. Start the API and frontend:

   ```powershell
   npm run dev
   ```

4. Open the Vite URL shown in the terminal (usually `http://localhost:5173`) and create an account.

The frontend proxies `/api` requests to the Express server on port 4000. The API waits for MongoDB before it starts listening.

## Available commands

- `npm run dev` — run API and frontend together
- `npm run dev:api` — run the API with Node watch mode
- `npm run dev:web` — run the Vite frontend
- `npm run build` — build the frontend for production
- `npm run lint` — lint the frontend source
- `npm start` — start the API

## Features

- Password-hashed accounts with an HTTP-only, signed session cookie
- User-scoped patient and appointment records
- Searchable patient list, optional patient contact/care details, and safe deletion checks
- Appointment creation, filtering, and status updates
- Responsive dashboard with patient totals, daily appointments, and weekly activity
- Request validation, API rate limiting for authentication, Helmet security headers, and database indexes

This starter is intended for local development and demonstration. Before handling real patient information, add the organization’s required privacy controls, audit logging, backups, access policies, and compliance review.
