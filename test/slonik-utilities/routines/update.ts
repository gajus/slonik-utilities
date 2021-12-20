import test from 'ava';
import * as sinon from 'sinon';
import type {
  SinonStubbedInstance,
} from 'sinon';
import {
  sql,
} from 'slonik';
import {
  update,
} from '../../../src/routines/update';
import {
  normalizeQuery,
} from '../../helpers/normalizeQuery';

const createConnection = () => {
  const query = sinon.stub().returns({
    rowCount: 0,
  });

  const connection = {
    query,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as SinonStubbedInstance<any>;

  return connection;
};

test('describes the outcome (rows not updated)', async (t) => {
  const connection = createConnection();

  const result = await update(connection, 'foo', {});

  t.deepEqual(result, {
    rowCount: 0,
  });
});

test('does not execute UPDATE query if named value bindings object has no keys', async (t) => {
  const connection = createConnection();

  await update(connection, 'foo', {});

  t.is(connection.query.callCount, 0);
});

test('does not execute UPDATE query if named value bindings object entirely overlaps with WHERE condition', async (t) => {
  const connection = createConnection();

  await update(
    connection,
    'foo',
    {
      id: 1,
    },
    {
      id: 1,
    },
  );

  t.is(connection.query.callCount, 0);
});

test('executes UPDATE query without WHERE condition (single column)', async (t) => {
  const connection = createConnection();

  await update(connection, 'foo', {
    bar: 'baz',
  });

  t.is(connection.query.callCount, 1);

  t.is(
    normalizeQuery(connection.query.firstCall.args[0].sql),
    'UPDATE "foo" SET "bar" = $1',
  );
  t.deepEqual(connection.query.firstCall.args[0].values, [
    'baz',
  ]);
});

test('executes UPDATE query without WHERE condition (multiple columns)', async (t) => {
  const connection = createConnection();

  await update(connection, 'foo', {
    bar0: 'baz0',
    bar1: 'baz1',
    bar2: 'baz2',
  });

  t.is(connection.query.callCount, 1);

  t.is(
    normalizeQuery(connection.query.firstCall.args[0].sql),
    'UPDATE "foo" SET "bar_0" = $1, "bar_1" = $2, "bar_2" = $3',
  );
  t.deepEqual(connection.query.firstCall.args[0].values, [
    'baz0',
    'baz1',
    'baz2',
  ]);
});

test('executes UPDATE query without WHERE condition (SQL token)', async (t) => {
  const connection = createConnection();

  await update(connection, 'foo', {
    bar0: 'baz0',
    bar1: sql`to_timestamp(${'baz1'})`,
    bar2: 'baz2',
  });

  t.is(connection.query.callCount, 1);

  t.is(
    normalizeQuery(connection.query.firstCall.args[0].sql),
    'UPDATE "foo" SET "bar_0" = $1, "bar_1" = to_timestamp($2), "bar_2" = $3',
  );
  t.deepEqual(connection.query.firstCall.args[0].values, [
    'baz0',
    'baz1',
    'baz2',
  ]);
});

test('executes UPDATE query with WHERE condition (AND boolean expression short-hand; single comparison predicate)', async (t) => {
  const connection = createConnection();

  await update(
    connection,
    'foo',
    {
      bar: 'baz',
    },
    {
      qux: 'quux',
    },
  );

  t.is(connection.query.callCount, 1);

  t.is(
    normalizeQuery(connection.query.firstCall.args[0].sql),
    'UPDATE "foo" SET "bar" = $1 WHERE "qux" = $2',
  );
  t.deepEqual(connection.query.firstCall.args[0].values, [
    'baz',
    'quux',
  ]);
});
