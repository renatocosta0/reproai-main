# Existing PostgreSQL databases

The original migration in this repository was generated for SQLite, while the
current Prisma schema and this new notification migration use PostgreSQL. Do
not execute the legacy SQLite migration against the existing PostgreSQL
database.

For an existing PostgreSQL database, first inspect its migration state with
`npx prisma migrate status` and confirm that its current tables match the
pre-notification Prisma schema. If the legacy migration is pending only because
the database was created outside Prisma Migrate (for example with `db push`),
baseline that legacy migration without executing its SQL:

```sh
npx prisma migrate resolve --applied 20261104071840_replace_enums_with_strings
npx prisma migrate deploy
```

If the legacy migration is already recorded as applied, run only
`npx prisma migrate deploy`. The new migration adds the `CareNotification`
table and indexes; it does not drop, rename, or rewrite existing tables or
records. Do not run `prisma migrate reset` against an existing database.
