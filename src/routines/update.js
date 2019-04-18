// @flow

import {
  sql
} from 'slonik';
import type {
  DatabaseConnectionType,
  ValueExpressionType
} from 'slonik';
import {
  mapKeys,
  snakeCase
} from 'lodash';

type NamedValueBindingsType = {
  +[key: string]: ValueExpressionType
};

const normalizeNamedValueBindingName = (name: string): string => {
  return snakeCase(name);
};

export default async (
  connection: DatabaseConnectionType,
  tableName: string,
  namedValueBindings: NamedValueBindingsType,
  booleanExpressionValues: Object = null
) => {
  const normalizedNamedValueBindings = mapKeys(namedValueBindings, (value, key) => {
    return normalizeNamedValueBindingName(key);
  });

  const columnNames = Object.keys(normalizedNamedValueBindings);

  const identifierList = sql.identifierList(columnNames.map((columnName) => {
    return [columnName];
  }));

  const valueList = sql.valueList(Object.values(normalizedNamedValueBindings));

  if (booleanExpressionValues) {
    const booleanExpression = sql.booleanExpression(
      Object
        .entries(booleanExpressionValues)
        .map(([key, value]) => {
          return sql.comparisonPredicate(sql.identifier([key]), '=', value);
        }),
      'AND'
    );

    await connection.query(sql`
      UPDATE ${sql.identifier([tableName])}
      SET (${identifierList}) = (${valueList})
      WHERE ${booleanExpression}
    `);
  } else {
    await connection.query(sql`
      UPDATE ${sql.identifier([tableName])}
      SET (${identifierList}) = (${valueList})
    `);
  }
};
