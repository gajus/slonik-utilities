// @flow

import {
  normalizeIdentifier,
  sql,
} from 'slonik';
import type {
  DatabaseConnectionType,
  ValueExpressionType,
} from 'slonik';

type NamedValueBindingsType = {
  +[key: string]: ValueExpressionType,
};

export default async (
  connection: DatabaseConnectionType,
  tableName: string,
  namedValueBindings: NamedValueBindingsType,

  // eslint-disable-next-line flowtype/no-weak-types
  booleanExpressionValues: Object = null
) => {
  const assignmentList = sql.assignmentList(namedValueBindings);

  let booleanExpression = sql.booleanExpression(
    Object
      .entries(namedValueBindings)
      .map(([key, value]) => {
        // $FlowFixMe
        return sql.raw('$1 IS DISTINCT FROM $2', [sql.identifier([normalizeIdentifier(key)]), value]);
      }),
    'OR'
  );

  if (booleanExpressionValues) {
    booleanExpression = sql.booleanExpression(
      [
        booleanExpression,
        sql.booleanExpression(
          Object
            .entries(booleanExpressionValues)
            .map(([key, value]) => {
              // $FlowFixMe
              return sql.comparisonPredicate(sql.identifier([key]), '=', value);
            }),
          'AND'
        ),
      ],
      'AND'
    );
  }

  await connection.query(sql`
    UPDATE ${sql.identifier([tableName])}
    SET ${assignmentList}
    WHERE ${booleanExpression}
  `);
};
