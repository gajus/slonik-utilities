// @flow

import {
  sql,
} from 'slonik';
import type {
  DatabaseConnectionType,
  ValueExpressionType,
} from 'slonik';
import {
  difference,
  uniq,
  mapKeys,
  snakeCase,
} from 'lodash';
import Logger from '../Logger';

type NamedValueBindingsType = {
  +[key: string]: ValueExpressionType,
  ...
};

type UpsertConfigurationType = {|
  +identifierName: string,
|};

const log = Logger.child({
  namespace: 'upsert',
});

const normalizeNamedValueBindingName = (name: string): string => {
  return snakeCase(name);
};

const defaultConfiguration = {
  identifierName: 'id',
};

export default async (
  connection: DatabaseConnectionType,
  tableName: string,
  namedValueBindings: NamedValueBindingsType,
  inputUniqueConstraintColumnNames: $ReadOnlyArray<string> | null = null,
  inputConfiguration: UpsertConfigurationType | null = null,
) => {
  const configuration = {
    ...defaultConfiguration,
    ...inputConfiguration,
  };

  const namedValueBindingNamesWithUndefinedValues = [];
  const boundValues = [];

  const normalizedNamedValueBindings = mapKeys(namedValueBindings, (value, key) => {
    if (value === undefined) {
      namedValueBindingNamesWithUndefinedValues.push(key);
    }

    boundValues.push(value);

    return normalizeNamedValueBindingName(key);
  });

  if (namedValueBindingNamesWithUndefinedValues.length > 0) {
    log.warn({
      namedValueBindingNamesWithUndefinedValues,
    }, 'named value bindings with undefined values');

    throw new Error('Named value binding values must be defined.');
  }

  const columnNames = Object.keys(normalizedNamedValueBindings);

  const uniqueConstraintColumnNames = inputUniqueConstraintColumnNames || columnNames;

  if (difference(uniqueConstraintColumnNames, columnNames).length > 0) {
    throw new Error('Unique constraint column names must not contain column names not present in named value bindings.');
  }

  const updateColumnNames = difference(columnNames, uniqueConstraintColumnNames);

  if (columnNames.length === 0) {
    throw new Error('Named value bindings object must have properties.');
  }

  const columnIdentifiers = sql.join(
    columnNames
      .map((columnName) => {
        return sql.identifier([columnName]);
      }),
    sql`, `,
  );

  const conflictColumnIdentifiers = sql.join(
    uniqueConstraintColumnNames.map((uniqueConstraintColumnName) => {
      return sql.identifier([uniqueConstraintColumnName]);
    }),
    sql`, `,
  );

  let updateClause;

  if (updateColumnNames.length) {
    updateClause = sql.join(
      updateColumnNames
        .map((updateColumnName) => {
          return sql`${sql.identifier([updateColumnName])} = ${sql.identifier(['excluded', updateColumnName])}`;
        }),
      sql`, `,
    );
  }

  const targetColumnNames = uniq([
    ...uniqueConstraintColumnNames,
    ...updateColumnNames,
  ]);

  const whereClause = sql.join(
    targetColumnNames.map((targetColumnName) => {
      const value = normalizedNamedValueBindings[normalizeNamedValueBindingName(targetColumnName)];

      if (value === null) {
        return sql`${sql.identifier([targetColumnName])} IS NULL`;
      }

      return sql`${sql.identifier([targetColumnName])} = ${value}`;
    }),
    sql` AND `,
  );

  const selectQuery = sql`
    SELECT ${sql.identifier([configuration.identifierName])}
    FROM ${sql.identifier([tableName])}
    WHERE
      ${whereClause}
  `;

  let maybeId;

  maybeId = await connection.maybeOneFirst(selectQuery);

  if (maybeId) {
    return maybeId;
  }

  if (updateClause) {
    return connection.oneFirst(sql`
      INSERT INTO ${sql.identifier([tableName])} (${columnIdentifiers})
      VALUES (${sql.join(boundValues, sql`, `)})
      ON CONFLICT (${conflictColumnIdentifiers})
      DO UPDATE
      SET
        ${updateClause}
      RETURNING ${sql.identifier([configuration.identifierName])}
    `);
  }

  maybeId = await connection.maybeOneFirst(sql`
    INSERT INTO ${sql.identifier([tableName])} (${columnIdentifiers})
    VALUES (${sql.join(boundValues, sql`, `)})
    ON CONFLICT (${conflictColumnIdentifiers})
    DO NOTHING
  `);

  if (maybeId) {
    return maybeId;
  }

  return connection.oneFirst(selectQuery);
};
