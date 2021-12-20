/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  pickBy,
} from 'lodash';
import {
  sql,
} from 'slonik';
import type {
  DatabaseConnectionType,
} from 'slonik';
import type {
  NamedAssignmentPayload,
} from '../types';
import {
  assignmentList,
  normalizeIdentifier,
} from '../utilities';

type UpdateResultType = {
  readonly rowCount: number,
};

export const update = async (
  connection: DatabaseConnectionType,
  tableName: string,
  namedAssignmentPayload: NamedAssignmentPayload,
  booleanExpressionValues: Record<string, boolean | number | string | null> = {},
): Promise<UpdateResultType> => {
  if (Object.keys(booleanExpressionValues).length) {
    const nonOverlappingNamedAssignmentBindings = pickBy(
      namedAssignmentPayload,
      (value, key) => {
        return value !== booleanExpressionValues[key];
      },
    );

    if (Object.keys(nonOverlappingNamedAssignmentBindings).length === 0) {
      return {
        rowCount: 0,
      };
    }

    const booleanExpression = sql.join(
      Object.entries(booleanExpressionValues).map(([
        key,
        value,
      ]) => {
        return sql`${sql.identifier([
          normalizeIdentifier(key),
        ])} = ${value as any}`;
      }),
      sql` AND `,
    );

    const result = await connection.query(sql`
      UPDATE ${sql.identifier([
    tableName,
  ])}
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
      UPDATE ${sql.identifier([
    tableName,
  ])}
      SET ${assignmentList(namedAssignmentPayload)}
    `);

    return {
      rowCount: result.rowCount,
    };
  }
};
