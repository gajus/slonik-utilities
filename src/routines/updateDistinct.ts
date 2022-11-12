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

type UpdateDistinctResultType = {
  readonly rowCount: number,
};

export const updateDistinct = async (
  connection: CommonQueryMethods,
  tableName: string,
  namedAssignmentPayload: NamedAssignmentPayload,
  booleanExpressionValues: Record<string, boolean | number | string | null> = {},
): Promise<UpdateDistinctResultType> => {
  let booleanExpression = sql.join(
    Object.entries(namedAssignmentPayload).map(([
      key,
      value,
    ]) => {
      return sql.fragment`${sql.identifier([
        normalizeIdentifier(key),
      ])} IS DISTINCT FROM ${value}`;
    }),
    sql.fragment` OR `,
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
            return sql.fragment`${sql.identifier([
              normalizeIdentifier(key),
            ])} = ${value}`;
          }),
          sql.fragment` AND `,
        ),
      ],
      sql.fragment` AND `,
    );
  }

  const result = await connection.query(sql.unsafe`
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
