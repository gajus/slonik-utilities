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

type UpdateResultType = {|
  +rowCount: number,
|};

export default async (
  connection: DatabaseConnectionType,
  tableName: string,
  namedAssignmentPayload: NamedAssignmentPayloadType,

  // eslint-disable-next-line flowtype/no-weak-types
  booleanExpressionValues: Object = null,
): Promise<UpdateResultType> => {
  if (booleanExpressionValues) {
    const nonOverlappingNamedAssignmentBindings = pickBy(namedAssignmentPayload, (value, key) => {
      return value !== booleanExpressionValues[key];
    });

    if (Object.keys(nonOverlappingNamedAssignmentBindings).length === 0) {
      return {
        rowCount: 0,
      };
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

    const result = await connection.query(sql`
      UPDATE ${sql.identifier([tableName])}
      SET ${assignmentList(nonOverlappingNamedAssignmentBindings)}
      WHERE ${booleanExpression}
    `);

    return {
      rowCount: result.rowCount,
    };
  } else {
    if (Object.keys(namedAssignmentPayload).length === 0) {
      return {
        rowCount: 0,
      };
    }

    const result = await connection.query(sql`
      UPDATE ${sql.identifier([tableName])}
      SET ${assignmentList(namedAssignmentPayload)}
    `);

    return {
      rowCount: result.rowCount,
    };
  }
};
