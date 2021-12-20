import {
  snakeCase,
} from 'lodash';

export const normalizeIdentifier = (propertyName: string): string => {
  return snakeCase(propertyName);
};
