// @flow

import {
  normalizeIdentifier,
  sql,
} from 'slonik';
import type {
  DatabaseConnectionType,
} from 'slonik';
import {
  assignmentList,
} from '../utilities';
import type {
  NamedAssignmentPayloadType,
} from '../types';

export default async (
  connection: DatabaseConnectionType,
  tableName: string,
  namedAssignmentPayload: NamedAssignmentPayloadType,

  // eslint-disable-next-line flowtype/no-weak-types
  booleanExpressionValues: Object = null,
) => {
  let booleanExpression = sql.join(
    Object
      .entries(namedAssignmentPayload)
      .map(([key, value]) => {
        // $FlowFixMe
        return sql`${sql.identifier([normalizeIdentifier(key)])} IS DISTINCT FROM ${value}`;
      }),
    sql` OR `,
  );

  if (booleanExpressionValues) {
    booleanExpression = sql.join(
      [
        booleanExpression,
        sql.join(
          Object
            .entries(booleanExpressionValues)
            .map(([key, value]) => {
              // $FlowFixMe
              return sql`${sql.identifier([normalizeIdentifier(key)])} = ${value}`;
            }),
          sql` AND `,
        ),
      ],
      sql` AND `,
    );
  }

  await connection.query(sql`
    UPDATE ${sql.identifier([tableName])}
    SET ${assignmentList(namedAssignmentPayload)}
    WHERE ${booleanExpression}
  `);
};
