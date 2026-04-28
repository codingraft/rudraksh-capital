# Rudraksh Capital - System Architecture & Codebase Guide

This document provides a detailed overview of the Rudraksh Capital Management System's architecture, technologies, and codebase structure. It is designed to help developers quickly understand how the system operates and where to find specific functionality.

---

## 1. High-Level Architecture

Rudraksh Capital is a monolithic microfinance management platform split into a **Node.js/Express Backend API** and a **Next.js Frontend Client**. 

The system uses a **PostgreSQL** database managed via **Prisma ORM** for strict type safety and relational integrity.

### Technology Stack
*   **Frontend**: Next.js 16 (App Router), React 19, Ant Design (UI Framework), Zustand (State/Theme Management), Axios, Tailwind CSS (for layout utils).
*   **Backend**: Node.js, Express.js, TypeScript, Prisma ORM, PostgreSQL.
*   **Security & Validation**: Zod (Schema validation), JWT (Authentication), Helmet & CORS, Rate Limiting.

---

## 2. Backend Codebase (`/backend`)

The backend follows a **Modular Routing Architecture**. Instead of having all controllers in one folder and all routes in another, features are grouped by domain module.

### Directory Structure
```text
backend/src/
├── config/         # Database initialization, env variables, global configs
├── middleware/     # Auth checks, error handling, and Audit Logging
├── modules/        # Domain-specific feature modules
│   ├── accounts/   # Chart of accounts (Assets, Liabilities, Income, Expenses)
│   ├── advisors/   # Agent/Advisor management
│   ├── auth/       # Login, JWT issuing, user verification
│   ├── customers/  # Customer onboarding and KYC tracking
│   ├── loans/      # Loan origination, approval, disbursement, and EMI calculation
│   ├── masters/    # System settings, dropdowns, config values
│   ├── payments/   # EMI collections and general receipts
│   ├── reports/    # Dashboard KPIs, Day books, ledgers
│   └── vouchers/   # Double-entry accounting vouchers (Journal, Payment, Receipt)
├── utils/          # Shared helpers (EMI math, ID generation, paginators)
└── app.ts          # Express App entrypoint, middleware mounting
```

### Key Backend Concepts
1.  **Strict Type Safety**: The backend relies heavily on Prisma's generated types (`PrismaClient`). All API inputs are validated using `zod` schemas before hitting the database.
2.  **Transactions (`prisma.$transaction`)**: Financial operations (like disbursing a loan and creating 24 EMI schedules simultaneously, or collecting a payment and updating the EMI status) are wrapped in database transactions to prevent partial data corruption.
3.  **Audit Logging Middleware**: Any `POST`, `PUT`, `PATCH`, or `DELETE` request is intercepted by the `auditLog` middleware (in `src/middleware/auditLog.ts`) which records the action, the user, the target entity, and the IP address.
4.  **Error Handling**: The `AppError` class is used to throw operational errors (e.g., `new AppError('Loan not found', 404)`). The global `errorHandler` middleware catches these and formats them into a standardized JSON response.

---

## 3. Frontend Codebase (`/frontend`)

The frontend is built with **Next.js App Router** but operates primarily as a Single Page Application (SPA) dashboard using client-side rendering for complex interactive data tables.

### Directory Structure
```text
frontend/src/
├── app/                  # Next.js App Router definitions
│   ├── (auth)/           # Public routes (Login screen)
│   ├── (dashboard)/      # Protected routes (Main application views)
│   ├── globals.css       # Global CSS, Ant Design overrides, Tailwind
│   └── layout.tsx        # Root layout, HTML wrapper
├── components/           # Reusable UI components
│   ├── layout/           # AppLayout, Sidebar, Header (Zustand integration)
│   └── ui/               # DataTable, StatCards, Modals
├── lib/                  # Core utilities
│   ├── api.ts            # Axios instance with JWT interceptors
│   └── store.ts          # Zustand store for global state & dark mode
```

### Key Frontend Concepts
1.  **Ant Design (Client-Side)**: We use Ant Design for high-quality, dense data tables and forms. Because Ant Design is primarily a client-side library, we use `"use client"` directives heavily in our components.
2.  **Zustand for State**: Instead of React Context, we use Zustand (`src/lib/store.ts`) for lightweight, persistent state management. It controls the **Dark/Light Mode Theme** and the collapsed state of the sidebar.
3.  **DataTable Component**: The `DataTable.tsx` component is the backbone of the UI. It standardizes server-side pagination, debounced searching, loading skeletons, and row actions across all modules (Customers, Loans, Payments).
4.  **API Interceptors**: `src/lib/api.ts` configures Axios. It automatically attaches the JWT token from `localStorage` to every request and intercepts `401 Unauthorized` responses to redirect the user back to the login page.

---

## 4. Database & Domain Model

The database schema (`backend/prisma/schema.prisma`) represents a full microfinance and double-entry accounting ledger.

*   **User/Advisor**: System users who can log in. Advisors are linked to customers.
*   **Customer**: The end-borrower. Tracks KYC, address, and status.
*   **Loan**: The core entity. Tracks Principal, Interest Rate, Tenure, and Status (`APPLIED`, `APPROVED`, `DISBURSED`, `ACTIVE`, `CLOSED`).
*   **EmiSchedule**: Child of Loan. Represents individual monthly/weekly installments.
*   **Payment**: Records actual money received against a loan. Updates the `paidAmount` on specific `EmiSchedule` rows.
*   **Account & Voucher**: A flexible double-entry accounting system for tracking company expenses, bank balances, and ledger entries independently of the loan system.

---

## 5. Coding Standards
*   **Never duplicate logic**: Use `src/utils/helpers.ts` for calculations (like EMI math or ID generation).
*   **Pagination**: All list endpoints must support `page` and `limit` query parameters.
*   **Catch Blocks**: Always type catch block parameters explicitly as `catch (error: any)` to satisfy strict TypeScript rules.
