# Movie Ticket System Design

## Goal

Build a minimal passing full-stack movie recommendation and ticketing system for coursework.

## Stack

- Frontend: React, TypeScript, Vite
- Backend: Express, TypeScript
- Database: MySQL 8
- Deployment: Docker Compose with two services: `app` and `mysql`

## Scope

The app supports a demo user flow from browsing recommended movies to selecting seats, creating an order, paying it, and viewing the ticket code. It also includes a lightweight admin dashboard for movies, showtimes, orders, users, and operational metrics.

No extra middleware such as Redis, message queues, search engines, or Nginx will be added without user confirmation.

## Architecture

The Express backend exposes REST APIs under `/api`, serves the built React frontend, and talks directly to MySQL through a small repository layer. Business behavior that benefits from tests lives in pure domain modules, including seat status rules, order pricing, ticket code creation, and recommendation sorting.

The React frontend is a single-page app with route-like state tabs for the public cinema flow, user center, and admin dashboard. It uses the backend APIs for all data and falls back to clear empty/error states if requests fail.

## Core Features

- User login demo, profile, membership level, points, preference tags
- Movie recommendations for hot, local, and top-rated movies
- Movie list, detail, comments, wish/watched markers
- Cinema, hall, showtime, and price display
- SVG seat map with available, sold, locked, broken, and selected states
- Order creation, 15-minute payment countdown, simulated payment, ticket code
- Admin dashboard with revenue, attendance, user growth, popular movies
- Admin content views for movies, showtimes, orders, and users

## Data Model

The MySQL schema contains users, movies, cinemas, halls, showtimes, seats, orders, order seats, reviews, favorites, and admin logs. Seed data provides enough content to demonstrate all required screens after `docker compose up`.

## Testing

Backend domain tests use Node's built-in test runner so they do not require additional test middleware. Integration and frontend behavior are verified by building the TypeScript project and running the Docker Compose configuration when Docker is available.
