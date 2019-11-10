### `upsert`

```js
import {
  upsert
} from 'slonik-utilities';

/**
 * @typedef Configuration~Upsert
 * @property identifierName column name. Default: "id".
 */

/**
 * @param connection Instance of Slonik connection.
 * @param {string} tableName Target table name.
 * @param {Object.<string, ValueExpression>} namedValueBindings Object describing the desired column values.
 * @param {string[]} [uniqueConstraintColumnNames] Names of columns that describe a unique constraint on the table. Defaults to property names of `namedValueBindings`.
 * @param {Configuration~Upsert} [configuration]
 */
upsert;

```

Inserts a new record to the database. If there is a conflicting unique constraint, updates the existing row.

#### Example: Named value bindings equal to the unique constraint column names

Table schema:

```sql
CREATE TABLE user (
  id SERIAL PRIMARY KEY,
  email_address text NOT NULL
);

CREATE UNIQUE INDEX user_email_idx ON user(email_address text_ops);

```

Operation:

```js
upsert(
  connection,
  'user',
  {
    emailAddress: 'gajus@gajus.com'
  }
);

```

Behaviour:

If `user` table already contains a record describing the input email, then the following query will be evaluted:

```sql
SELECT "id"
FROM "user"
WHERE (
  "email_address" = $1
);

```

If `user` table does not contain a record describing the input email, then the following queries will be evaluated:

```sql
SELECT "id"
FROM "user"
WHERE (
  "email_address" = $1
);

INSERT INTO "user" ("email_address")
VALUES ($1)
ON CONFLICT ("email_address")
DO NOTHING
RETURNING "id";

-- This query will not be evaluted if the preceeding query returns result.
SELECT "id"
FROM "user"
WHERE (
  "email_address" = $1
);

```


#### Example: Named value bindings different than the unique constraint column names

Table schema:

```sql
CREATE TABLE user (
  id SERIAL PRIMARY KEY,
  email_address text NOT NULL,
  password text NOT NULL,
  given_name text NOT NULL,
  family_name text NOT NULL
);

CREATE UNIQUE INDEX user_email_idx ON user(email_address text_ops);

```

Operation:

```js
upsert(
  connection,
  'user',
  {
    emailAddress: 'gajus@gajus.com',
    familyName: 'Kuizinas',
    givenName: 'Gajus'
  },
  [
    'email_address'
  ]
);

```

Behaviour:

If `user` table already contains a record describing the input email, then the following query will be evaluted:

```sql
SELECT "id"
FROM "user"
WHERE (
  "email_address" = $1 AND
  "family_name" = $2 AND
  "given_name" = $3
);

```

If `user` table does not contain a record describing the input email, then the following queries will be evaluated:

```sql
SELECT "id"
FROM "user"
WHERE (
  "email_address" = $1 AND
  "family_name" = $2 AND
  "given_name" = $3
);

INSERT INTO "user" ("email_address", "family_name", "given_name")
VALUES ($1, $2, $3)
ON CONFLICT ("email_address")
DO UPDATE SET
  "family_name" = "excluded"."family_name",
  "given_name" = "excluded"."given_name"
RETURNING "id"

```

#### Example: SQL tags as values

Named value binding values can be SQL tokens, e.g.

```js
upsert(
  connection,
  'user',
  {
    emailAddress: 'gajus@gajus.com',
    createdAt: sql.raw('to_timestamp($1)', [1555595070])
  }
);

```

Given the above example, queries equivalent to the following will be evaluated:

```sql
SELECT "id"
FROM "user"
WHERE (
  "email_address" = $1 AND
  "created_at" = to_timestamp($2)
);

-- ...

```
