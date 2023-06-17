/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  pickBy,
} from 'lodash';
import {
  sql,

  type CommonQueryMethods,
} from 'slonik';
import {
  type NamedAssignmentPayload,
} from '../types';
import {
  assignmentList,
  normalizeIdentifier,
} from '../utilities';

type UpdateResultType = {
  readonly rowCount: number,
};

export const update = async (
  connection: CommonQueryMethods,
  tableName: string,
  namedAssignmentPayload: NamedAssignmentPayload,
  booleanExpressionValues: Record<string, boolean | number | string | null> = {},
  identifierNormalizer: (identifierName: string) => string = normalizeIdentifier,
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
        return sql.fragment`${sql.identifier([
          identifierNormalizer(key),
        ])} = ${value as any}`;
      }),
      sql.fragment` AND `,
    );

    const result = await connection.query(sql.unsafe`
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

    const result = await connection.query(sql.unsafe`
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
