# Slonik Utilities

[![Travis build status](http://img.shields.io/travis/gajus/slonik-utilities/master.svg?style=flat-square)](https://travis-ci.org/gajus/slonik-utilities)
[![Coveralls](https://img.shields.io/coveralls/gajus/slonik-utilities.svg?style=flat-square)](https://coveralls.io/github/gajus/slonik-utilities)
[![NPM version](http://img.shields.io/npm/v/slonik-utilities.svg?style=flat-square)](https://www.npmjs.org/package/slonik-utilities)
[![Canonical Code Style](https://img.shields.io/badge/code%20style-canonical-blue.svg?style=flat-square)](https://github.com/gajus/canonical)
[![Twitter Follow](https://img.shields.io/twitter/follow/kuizinas.svg?style=social&label=Follow)](https://twitter.com/kuizinas)

Utilities for manipulating data in PostgreSQL database using [Slonik](https://github.com/gajus/slonik).

## Contents

{"gitdown": "contents"}

## Usage

### `update`

```js
import {
  update
} from 'slonik-utilities';

/**
 * @param connection Instance of Slonik connection.
 * @param {string} tableName Target table name.
 * @param namedValueBindings Object describing the desired column values.
 * @param [booleanExpressionValues] Object describing the boolean expression used to construct WHERE condition.
 */
update;

```

Constructs and executes `UPDATE` query.

#### Example: Update all rows

Operation:

```js
update(
  connection,
  'user',
  {
    givenName: 'foo'
  }
);

```

Is equivalent to:

```sql
UPDATE "user"
SET
  "given_name" = $1;

```

#### Example: Update rows matching a boolean WHERE condition

Operation:

```js
update(
  connection,
  'user',
  {
    givenName: 'foo'
  },
  {
    lastName: 'bar'
  }
);

```

Is equivalent to:

```sql
UPDATE "user"
SET
  "given_name" = $1
WHERE
  "last_name" = $2;

```

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
 * @param namedValueBindings Object describing the desired column values.
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
  "family_name" = EXCLUDED."family_name",
  "given_name" = EXCLUDED."given_name"
RETURNING "id"

```

### Example: SQL tags as values

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
