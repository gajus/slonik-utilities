// @flow

import {
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
  if (Object.keys(namedValueBindings).length === 0) {
    return;
  }

  const assignmentList = sql.assignmentList(namedValueBindings);

  if (booleanExpressionValues) {
    const booleanExpression = sql.booleanExpression(
      Object
        .entries(booleanExpressionValues)
        .map(([key, value]) => {
          // $FlowFixMe
          return sql.comparisonPredicate(sql.identifier([key]), '=', value);
        }),
      'AND'
    );

    await connection.query(sql`
      UPDATE ${sql.identifier([tableName])}
      SET ${assignmentList}
      WHERE ${booleanExpression}
    `);
  } else {
    await connection.query(sql`
      UPDATE ${sql.identifier([tableName])}
      SET ${assignmentList}
    `);
  }
};
