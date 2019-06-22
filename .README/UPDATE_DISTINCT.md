### `updateDistinct`

```js
import {
  updateDistinct
} from 'slonik-utilities';

/**
 * @param connection Instance of Slonik connection.
 * @param {string} tableName Target table name.
 * @param {Object.<string, ValueExpression>} namedValueBindings Object describing the desired column values.
 * @param {Object.<string, EqualPredicate>} [booleanExpressionValues] Object describing the boolean expression used to construct WHERE condition.
 */
updateDistinct;

```

Constructs and executes `UPDATE` query matching only rows with distinct values.

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
  "given_name" = $1
WHERE
  "given_name" IS DISTINCT FROM $1;

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
  "last_name" = $2 AND
  "given_name" IS DISTINCT FROM $1;

```
