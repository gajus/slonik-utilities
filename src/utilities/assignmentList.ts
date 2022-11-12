import {
  sql,

  type ListSqlToken,
} from 'slonik';
import {
  type NamedAssignmentPayload,
} from '../types';
import {
  normalizeIdentifier,
} from './normalizeIdentifier';

export const assignmentList = (
  namedAssignment: NamedAssignmentPayload,
): ListSqlToken => {
  const values = Object.values(
    Object.entries(namedAssignment).map(([
      column,
      value,
    ]) => {
      return sql.fragment`${sql.identifier([
        normalizeIdentifier(column),
      ])} = ${value}`;
    }),
  );

  return sql.join(values, sql.fragment`, `);
};
