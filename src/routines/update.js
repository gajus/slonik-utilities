// @flow

import {
  pickBy,
} from 'lodash';
import {
  sql,
} from 'slonik';
import type {
  DatabaseConnectionType,
} from 'slonik';
import {
  assignmentList,
  normalizeIdentifier,
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
  if (booleanExpressionValues) {
    const nonOverlappingNamedAssignmentBindings = pickBy(namedAssignmentPayload, (value, key) => {
      return value !== booleanExpressionValues[key];
    });

    if (Object.keys(nonOverlappingNamedAssignmentBindings).length === 0) {
      return;
    }

    const booleanExpression = sql.join(
      Object
        .entries(booleanExpressionValues)
        .map(([key, value]) => {
          // $FlowFixMe
          return sql`${sql.identifier([normalizeIdentifier(key)])} = ${value}`;
        }),
      sql` AND `,
    );

    await connection.query(sql`
      UPDATE ${sql.identifier([tableName])}
      SET ${assignmentList(nonOverlappingNamedAssignmentBindings)}
      WHERE ${booleanExpression}
    `);
  } else {
    if (Object.keys(namedAssignmentPayload).length === 0) {
      return;
    }

    await connection.query(sql`
      UPDATE ${sql.identifier([tableName])}
      SET ${assignmentList(namedAssignmentPayload)}
    `);
  }
};
