import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/qr_order'

type DbType = PostgresJsDatabase<typeof schema>

let db: DbType

function initDb() {
  const maybeTestDb = (globalThis as unknown as { __TEST_DB__?: DbType }).__TEST_DB__
  if (process.env.NODE_ENV === 'test' && maybeTestDb) {
    db = maybeTestDb
    return
  }
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10
  })
  db = drizzle(client, { schema })
}

initDb()

export function setTestDb(mock: DbType) {
  if (process.env.NODE_ENV === 'test') {
    ;(globalThis as unknown as { __TEST_DB__?: DbType }).__TEST_DB__ = mock
    db = mock
  }
}

export { db }

export * from './schema'
