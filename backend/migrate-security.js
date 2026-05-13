const mysql = require('mysql2/promise');
require('dotenv').config();

async function addColumn(connection, table, column, typeDef) {
  try {
    await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeDef}`);
    console.log(`Added ${column} to ${table}.`);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log(`${column} already exists in ${table}.`);
    } else {
      console.error(`Failed to add ${column} to ${table}:`, err);
    }
  }
}

async function runMigration() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('Connected to DB. Running migrations...');

    await addColumn(connection, 'bookings', 'entry_scanned', 'BOOLEAN DEFAULT false');
    await addColumn(connection, 'bookings', 'exit_scanned', 'BOOLEAN DEFAULT false');
    await addColumn(connection, 'users', 'password', 'VARCHAR(255)');

    await connection.end();
    console.log('Migrations complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

runMigration();
