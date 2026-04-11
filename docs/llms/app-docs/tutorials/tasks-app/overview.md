---
path: app-docs/tutorials/tasks-app/overview.md
audience: app
category: tutorial
summary: **Tasks** is a simple Root App with a React UI and backend service for managing a list of shared tasks.
---

# Tutorial: Tasks App

**Tasks** is a simple Root App with a React UI and backend service for managing a list of shared tasks. Members can add new tasks and delete completed tasks. Changes are immediately visible to all members.

[Image: Screenshot of the Tasks App showing two tasks with delete buttons and UI to create new tasks.]

The App demonstrates how to persist data using Root's built-in SQLite database. We'll start with in-memory storage (no persistence), then add persistence using the Knex query builder, and finally swap out Knex for the full ORM Prisma. Most of the code will be supplied. Your job will be to do the setup and configuration.

## Root concepts covered

- **SQLite-based persistence**: Use SQLite with multiple data-access layer implementations.

## Prerequisites

- Intermediate TypeScript knowledge, including `async/await`, interfaces, and classes.
- Beginner React knowledge, including `useState`, `useEffect`, and event handling.
- Familiarity with SQL, Knex, or Prisma is helpful but not required.

## Solution code

A fully implemented version of this tutorial is available in the Root [samples repository](https://github.com/RootPlatform/RootSdk.Samples/tree/main/Apps/DataStorage).