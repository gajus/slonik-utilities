// @flow

import {
  sql
} from 'slonik';
import type {
  DatabaseConnectionType,
  ValueExpressionType
} from 'slonik';
import {
  difference,
  uniq,
  mapKeys,
  snakeCase
} from 'lodash';
import {
  escapeIdentifier
} from '../utilities';

type NamedValueBindingsType = {
  +[key: string]: ValueExpressionType
};

type UpsertConfigurationType = {|
  +identifierName: string
|};

const normalizeNamedValueBindingName = (name: string): string => {
  return snakeCase(name);
};

const defaultConfiguration = {
  identifierName: 'id'
};

export default async (
  connection: DatabaseConnectionType,
  tableName: string,
  namedValueBindings: NamedValueBindingsType,
  inputUniqueConstraintColumnNames: $ReadOnlyArray<string> | null = null,
  inputConfiguration: UpsertConfigurationType | null = null
) => {
  const configuration = {
    ...defaultConfiguration,
    ...inputConfiguration
  };

  const boundValues = [];

  const normalizedNamedValueBindings = mapKeys(namedValueBindings, (value, key) => {
    boundValues.push(value);

    return normalizeNamedValueBindingName(key);
  });

  const columnNames = Object.keys(normalizedNamedValueBindings);

  const uniqueConstraintColumnNames = inputUniqueConstraintColumnNames || columnNames;

  if (difference(uniqueConstraintColumnNames, columnNames).length > 0) {
    throw new Error('Unique constraint column names must not contain column names not present in named value bindings.');
  }

  const updateColumnNames = difference(columnNames, uniqueConstraintColumnNames);

  if (columnNames.length === 0) {
    throw new Error('Named value bindings object must have properties.');
  }

  const columnIdentifiers = sql.identifierList(
    columnNames
      .map((columnName) => {
        return [
          columnName
        ];
      })
  );

  const values = sql.valueList(boundValues);

  const conflictColumnIdentifiers = sql.identifierList(
    uniqueConstraintColumnNames.map((uniqueConstraintColumnName) => {
      return [
        uniqueConstraintColumnName
      ];
    })
  );

  let updateClause;

  if (updateColumnNames.length) {
    updateClause = sql.raw(
      updateColumnNames
        .map((updateColumnName) => {
          return escapeIdentifier(updateColumnName) + ' = EXCLUDED.' + escapeIdentifier(updateColumnName);
        })
        .join(', ')
    );
  }

  const targetColumnNames = uniq([
    ...uniqueConstraintColumnNames,
    ...updateColumnNames
  ]);

  const whereClause = sql.booleanExpression(targetColumnNames.map((targetColumnName) => {
    return sql.comparisonPredicate(
      sql.identifier([targetColumnName]),
      '=',
      normalizedNamedValueBindings[normalizeNamedValueBindingName(targetColumnName)]
    );
  }), 'AND');

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
      VALUES (${values})
      ON CONFLICT (${conflictColumnIdentifiers})
      DO UPDATE
      SET
        ${updateClause}
      RETURNING ${sql.identifier([configuration.identifierName])}
    `);
  }

  maybeId = await connection.maybeOneFirst(sql`
    INSERT INTO ${sql.identifier([tableName])} (${columnIdentifiers})
    VALUES (${values})
    ON CONFLICT (${conflictColumnIdentifiers})
    DO NOTHING
  `);

  if (maybeId) {
    return maybeId;
  }

  return connection.oneFirst(selectQuery);
};
