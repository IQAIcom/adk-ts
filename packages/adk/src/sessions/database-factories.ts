import dedent from "dedent";
import { Kysely, MysqlDialect, PostgresDialect, SqliteDialect } from "kysely";
import {
	type Database,
	DatabaseSessionService,
} from "./database-session-service";

function createDependencyError(packageName: string, dbType: string): Error {
	return new Error(
		dedent`
		Missing required peer dependency: ${packageName}
		To use ${dbType} sessions, install the required package:
			npm install ${packageName}
			# or
			pnpm add ${packageName}
			# or
			yarn add ${packageName}`,
	);
}

// For PostgreSQL
export function createPostgresSessionService(
	connectionString: string,
	options?: any,
): DatabaseSessionService {
	let Pool: any;

	try {
		({ Pool } = require("pg"));
	} catch (error) {
		throw createDependencyError("pg", "PostgreSQL");
	}

	const db = new Kysely<Database>({
		dialect: new PostgresDialect({
			pool: new Pool({
				connectionString,
				...options,
			}),
		}),
	});

	return new DatabaseSessionService({ db });
}

// For MySQL
export function createMysqlSessionService(
	connectionString: string,
	options?: any,
): DatabaseSessionService {
	let createPool: any;

	try {
		({ createPool } = require("mysql2"));
	} catch (error) {
		throw createDependencyError("mysql2", "MySQL");
	}

	const db = new Kysely<Database>({
		dialect: new MysqlDialect({
			pool: createPool({
				uri: connectionString,
				...options,
			}),
		}),
	});

	return new DatabaseSessionService({ db });
}

// For SQLite
export function createSqliteSessionService(
	filename: string,
	options?: any,
): DatabaseSessionService {
	let Database: any;

	try {
		Database = require("better-sqlite3");
	} catch (error) {
		throw createDependencyError("better-sqlite3", "SQLite");
	}

	const db = new Kysely<Database>({
		dialect: new SqliteDialect({
			database: new Database(filename, options),
		}),
	});

	return new DatabaseSessionService({ db });
}

// Generic factory that auto-detects database type from URL (like SQLAlchemy)
export function createDatabaseSessionService(
	databaseUrl: string,
	options?: any,
): DatabaseSessionService {
	if (
		databaseUrl.startsWith("postgres://") ||
		databaseUrl.startsWith("postgresql://")
	) {
		return createPostgresSessionService(databaseUrl, options);
	}

	if (databaseUrl.startsWith("mysql://")) {
		return createMysqlSessionService(databaseUrl, options);
	}

	if (
		databaseUrl.startsWith("sqlite://") ||
		databaseUrl.includes(".db") ||
		databaseUrl === ":memory:"
	) {
		const filename = databaseUrl.startsWith("sqlite://")
			? databaseUrl.substring(9)
			: databaseUrl;
		return createSqliteSessionService(filename, options);
	}

	throw new Error(`Unsupported database URL: ${databaseUrl}`);
}
