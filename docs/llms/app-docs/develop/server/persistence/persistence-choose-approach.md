---
path: app-docs/develop/server/persistence/persistence-choose-approach.md
audience: app
category: guide
summary: Root supports two ways to store persistent data in your server: a **key-value store** and a **SQLite database**.
---

> **Worked sample**: `api-samples/server-key-value-store/` — Key-Value Store

# Choose your approach: persistence

Root supports two ways to store persistent data in your server: a **key-value store** and a **SQLite database**. The key-value store is fully ready to use while SQLite requires some setup. This article explains what they are and when to use each.

## Key-value store

A **key-value store** saves data as simple key-value pairs. Think of it like a dictionary or map data structure. You store a value under a key, and you retrieve it later using that key.

Your key-value pairs are stored in SQLite behind the scenes. Root automatically backs up and restores the SQLite file, so you won't lose data if your server restarts.

A key-value store works well for:

- **Prototyping**: It's ready immediately. No tables to define. No database setup.
- **Simple data**: One-to-one relationships where you don't need complicated queries.

## SQLite

**SQLite** is a self-contained database engine that runs inside your server. You interact with it using SQL statements to store, retrieve, and manage your data. It has stores data in structured tables and supports full SQL queries, indexing, transactions, and relational integrity.

SQLite stores its data in a file. Root provisions the SQLite file for you and backs up and restores the file automatically.

A SQLite database is a good choice for:

- **Production storage**: When you need reliable data handling, transactions, and SQL queries.  
- **Structured data**: When your data must be organized clearly across multiple tables.

## Key differences

| Feature             | Key-Value Store                      | SQLite Database                |
|---------------------|--------------------------------------|--------------------------------|
| **Data structure**  | Simple key-value pairs               | Relational tables with SQL     |
| **Querying**        | By key only                          | Full SQL querying              |
| **Transactions**    | Minimal or none                      | Full ACID compliance           |

## Conclusion

Use the **key-value store** for quick setup and small amounts of simple data. Use **SQLite** when you need structured storage, complex queries, or transactions.