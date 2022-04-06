import {
  difference,
  uniq,
  mapKeys,
  snakeCase,
} from 'lodash';
import {
  sql,
} from 'slonik';
import type {
  DatabaseConnectionType,
  ValueExpressionType,
} from 'slonik';
import {
  Logger,
} from '../Logger';

type NamedValueBindingsType = {
  readonly [key: string]: ValueExpressionType,
};

type UpsertConfigurationType = {
  readonly identifierName?: string,
  readonly selectBeforeUpdate?: boolean,
};

const log = Logger.child({
  namespace: 'upsert',
});

const normalizeNamedValueBindingName = (name: string): string => {
  return snakeCase(name);
};

const defaultConfiguration: Required<UpsertConfigurationType> = {
  identifierName: 'id',
  selectBeforeUpdate: true,
};

export const upsert = async (
  connection: DatabaseConnectionType,
  tableName: string,
  namedValueBindings: NamedValueBindingsType,
  inputUniqueConstraintColumnNames: readonly string[] | null = null,
  inputConfiguration: UpsertConfigurationType | null = null,
) => {
  const configuration = {
    ...defaultConfiguration,
    ...inputConfiguration,
  };

  const namedValueBindingNamesWithUndefinedValues: string[] = [];
  const boundValues: Array<boolean | number | string | null> = [];

  const normalizedNamedValueBindings = mapKeys(
    namedValueBindings,
    (value, key) => {
      if (value === undefined) {
        namedValueBindingNamesWithUndefinedValues.push(key);
      }

      boundValues.push(value);

      return normalizeNamedValueBindingName(key);
    },
  );

  if (namedValueBindingNamesWithUndefinedValues.length > 0) {
    log.warn(
      {
        namedValueBindingNamesWithUndefinedValues,
      },
      'named value bindings with undefined values',
    );

    throw new Error('Named value binding values must be defined.');
  }

  const columnNames = Object.keys(normalizedNamedValueBindings);

  const uniqueConstraintColumnNames =
    inputUniqueConstraintColumnNames ?? columnNames;

  if (difference(uniqueConstraintColumnNames, columnNames).length > 0) {
    throw new Error(
      'Unique constraint column names must not contain column names not present in named value bindings.',
    );
  }

  const updateColumnNames = difference(
    columnNames,
    uniqueConstraintColumnNames,
  );

  if (columnNames.length === 0) {
    throw new Error('Named value bindings object must have properties.');
  }

  const columnIdentifiers = sql.join(
    columnNames.map((columnName) => {
      return sql.identifier([
        columnName,
      ]);
    }),
    sql`, `,
  );

  const conflictColumnIdentifiers = sql.join(
    uniqueConstraintColumnNames.map((uniqueConstraintColumnName) => {
      return sql.identifier([
        uniqueConstraintColumnName,
      ]);
    }),
    sql`, `,
  );

  let updateClause;

  if (updateColumnNames.length) {
    updateClause = sql.join(
      updateColumnNames.map((updateColumnName) => {
        return sql`${sql.identifier([
          updateColumnName,
        ])} = ${sql.identifier([
          'excluded',
          updateColumnName,
        ])}`;
      }),
      sql`, `,
    );
  }

  const targetColumnNames = uniq([
    ...uniqueConstraintColumnNames,
    ...updateColumnNames,
  ]);

  const whereClause = sql.join(
    targetColumnNames.map((targetColumnName) => {
      const value =
        normalizedNamedValueBindings[
          normalizeNamedValueBindingName(targetColumnName)
        ];

      if (value === null) {
        return sql`${sql.identifier([
          targetColumnName,
        ])} IS NULL`;
      }

      return sql`${sql.identifier([
        targetColumnName,
      ])} = ${value}`;
    }),
    sql` AND `,
  );

  const selectQuery = sql`
    SELECT ${sql.identifier([
    configuration.identifierName,
  ])}
    FROM ${sql.identifier([
    tableName,
  ])}
    WHERE
      ${whereClause}
  `;
  if (configuration.selectBeforeUpdate) {
    const maybeId1 = await connection.maybeOneFirst(selectQuery);

    if (maybeId1) {
      return maybeId1;
    }
  }

  if (updateClause) {
    return await connection.oneFirst(sql`
      INSERT INTO ${sql.identifier([
    tableName,
  ])} (${columnIdentifiers})
      VALUES (${sql.join(boundValues, sql`, `)})
      ON CONFLICT (${conflictColumnIdentifiers})
      DO UPDATE
      SET
        ${updateClause}
      RETURNING ${sql.identifier([
    configuration.identifierName,
  ])}
    `);
  }

  const maybeId2 = await connection.maybeOneFirst(sql`
    INSERT INTO ${sql.identifier([
    tableName,
  ])} (${columnIdentifiers})
    VALUES (${sql.join(boundValues, sql`, `)})
    ON CONFLICT (${conflictColumnIdentifiers})
    DO NOTHING
  `);

  if (maybeId2) {
    return maybeId2;
  }

  return await connection.oneFirst(selectQuery);
};
