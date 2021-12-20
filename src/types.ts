import type {
  ValueExpressionType,
} from 'slonik';

export type NamedAssignmentPayload = {
  [key: string]: ValueExpressionType,
};
