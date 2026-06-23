# Movie Ticket System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Dockerized React + Express + MySQL movie recommendation and ticketing coursework project.

**Architecture:** A single Express TypeScript service exposes REST APIs, serves the built React app, and connects to MySQL. The frontend is a Vite React single-page app with public, user-center, ticketing, and admin dashboard sections. Core order and recommendation behavior is covered by pure Node tests.

**Tech Stack:** React, TypeScript, Vite, Express, mysql2, Docker Compose, MySQL 8, Node test runner.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `.dockerignore`
- Create: `Dockerfile`
- Create: `docker-compose.yml`

- [ ] Create package scripts for dev, build, start, and test.
- [ ] Add TypeScript config for shared frontend and backend compilation.
- [ ] Add Docker Compose with only `app` and `mysql` services.

### Task 2: Backend Domain And Tests

**Files:**
- Create: `server/domain/ticketing.ts`
- Create: `server/domain/recommendations.ts`
- Create: `server/domain/ticketing.test.mjs`
- Create: `server/domain/recommendations.test.mjs`

- [ ] Write failing tests for total price calculation, ticket code shape, seat locking, and recommendation sorting.
- [ ] Implement pure functions until tests pass.

### Task 3: Backend API

**Files:**
- Create: `server/db.ts`
- Create: `server/types.ts`
- Create: `server/routes.ts`
- Create: `server/index.ts`

- [ ] Add MySQL pool setup with environment variables.
- [ ] Add endpoints for users, movies, cinemas, showtimes, seats, orders, payment, and admin stats.
- [ ] Serve the frontend build from Express in production.

### Task 4: Database Seed

**Files:**
- Create: `db/init.sql`

- [ ] Create all required tables.
- [ ] Insert demo users, movies, cinemas, halls, showtimes, seats, reviews, favorites, orders, and admin logs.

### Task 5: Frontend App

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/api.ts`
- Create: `src/types.ts`
- Create: `src/styles.css`

- [ ] Build movie recommendation, movie detail, cinema showtime, seat picker, checkout, user center, and admin dashboard views.
- [ ] Use SVG for seat selection and visual status.
- [ ] Keep the UI imaginative but not over-engineered.

### Task 6: Verification

- [ ] Run backend domain tests.
- [ ] Run the frontend/backend TypeScript build if dependencies are installed.
- [ ] Report Docker run instructions and any local verification limits.
