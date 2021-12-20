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

type UpdateDistinctResultType = {
  readonly rowCount: number,
};

export const updateDistinct = async (
  connection: DatabaseConnectionType,
  tableName: string,
  namedAssignmentPayload: NamedAssignmentPayload,
  booleanExpressionValues: Record<string, boolean | number | string | null> = {},
): Promise<UpdateDistinctResultType> => {
  let booleanExpression = sql.join(
    Object.entries(namedAssignmentPayload).map(([
      key,
      value,
    ]) => {
      // $FlowFixMe
      return sql`${sql.identifier([
        normalizeIdentifier(key),
      ])} IS DISTINCT FROM ${value}`;
    }),
    sql` OR `,
  );

  if (Object.keys(booleanExpressionValues).length) {
    booleanExpression = sql.join(
      [
        booleanExpression,
        sql.join(
          Object.entries(booleanExpressionValues).map(([
            key,
            value,
          ]) => {
            // $FlowFixMe
            return sql`${sql.identifier([
              normalizeIdentifier(key),
            ])} = ${value}`;
          }),
          sql` AND `,
        ),
      ],
      sql` AND `,
    );
  }

  const result = await connection.query(sql`
    UPDATE ${sql.identifier([
    tableName,
  ])}
    SET ${assignmentList(namedAssignmentPayload)}
    WHERE ${booleanExpression}
  `);

  return {
    rowCount: result.rowCount,
  };
};
