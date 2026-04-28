# Rudraksh Capital - Developer Setup Guide

Welcome to the Rudraksh Capital development team! This guide will walk you through setting up the project on your local machine.

## 1. Prerequisites

Before you begin, ensure you have the following installed on your machine:
*   **Node.js**: v18 or v20+ (LTS recommended)
*   **PostgreSQL**: v14 or higher (Running locally or via Docker)
*   **TypeScript**: Familiarity with strict mode TS.
*   **Git**: For version control.

---

## 2. Initial Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd rudraksh-capital
   ```

2. **Database Preparation:**
   Ensure your local PostgreSQL server is running. Create a database for the project (e.g., `rudraksh_capital`).

---

## 3. Backend Setup

The backend is built with Node.js, Express, and Prisma ORM.

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Copy the example environment file and configure your database connection string.
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and set your `DATABASE_URL` (e.g., `postgresql://postgres:password@localhost:5432/rudraksh_capital?schema=public`).*

4. **Initialize the Database:**
   Generate the Prisma Client and push the schema to your local database.
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Seed the Database (Optional but recommended):**
   This will create the default admin user and essential master data.
   ```bash
   npm run db:seed
   ```

6. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   *The backend should now be running on `http://localhost:5000`.*

---

## 4. Frontend Setup

The frontend is a Next.js 16 App Router application.

1. **Navigate to the frontend directory:**
   *(Open a new terminal tab)*
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   *The frontend should now be running on `http://localhost:3000`.*

---

## 5. First Login & Usage

Once both servers are running, open your browser and navigate to `http://localhost:3000`.

**Default Admin Credentials:**
*   **Username:** `admin`
*   **Password:** `admin123`

*(If the credentials do not work, ensure you ran the `npm run db:seed` command in the backend step).*

### Troubleshooting
*   **Prisma Type Errors in IDE**: If your IDE complains about `PrismaClient` not having exported members, restart your IDE's TypeScript server or run `npx prisma generate` again.
*   **Frontend Hydration Errors**: We use Ant Design with Next.js App Router. Most Ant Design components require the `"use client"` directive at the top of the file to prevent server-side rendering crashes.
*   **CORS Issues**: Ensure the backend `.env` file allows the correct frontend port (usually `http://localhost:3000`).
