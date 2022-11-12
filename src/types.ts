import {
  type ValueExpression,
} from 'slonik';

export type NamedAssignmentPayload = {
  [key: string]: ValueExpression,
};
