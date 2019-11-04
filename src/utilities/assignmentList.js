// @flow

import {
  sql,
} from 'slonik';
import type {
  ListSqlTokenType,
} from 'slonik';
import type {
  NamedAssignmentPayloadType,
} from '../types';
import normalizeIdentifier from './normalizeIdentifier';

export default (namedAssignment: NamedAssignmentPayloadType): ListSqlTokenType => {
  const values = Object.values(Object
    .entries(namedAssignment)
    .map(([column, value]) => {
      // $FlowFixMe
      return sql`${sql.identifier([normalizeIdentifier(column)])} = ${value}`;
    }));

  // $FlowFixMe
  return sql.join(values, sql`, `);
};
