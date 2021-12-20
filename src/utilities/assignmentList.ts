import {
  sql,
} from 'slonik';
import type {
  ListSqlTokenType,
} from 'slonik';
import type {
  NamedAssignmentPayload,
} from '../types';
import {
  normalizeIdentifier,
} from './normalizeIdentifier';

export const assignmentList = (
  namedAssignment: NamedAssignmentPayload,
): ListSqlTokenType => {
  const values = Object.values(
    Object.entries(namedAssignment).map(([
      column,
      value,
    ]) => {
      // $FlowFixMe
      return sql`${sql.identifier([
        normalizeIdentifier(column),
      ])} = ${value}`;
    }),
  );

  // $FlowFixMe
  return sql.join(values, sql`, `);
};
