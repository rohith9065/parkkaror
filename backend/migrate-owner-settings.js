const mysql = require('mysql2/promise');
require('dotenv').config();

async function addColumn(connection, table, column, definition) {
  try {
    await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`Added ${table}.${column}`);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log(`${table}.${column} already exists`);
      return;
    }
    throw err;
  }
}

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  await addColumn(connection, 'users', 'upi_id', 'VARCHAR(100)');
  await addColumn(connection, 'users', 'bank_account_number', 'VARCHAR(50)');
  await addColumn(connection, 'users', 'bank_ifsc', 'VARCHAR(20)');
  await addColumn(connection, 'users', 'bank_name', 'VARCHAR(100)');
  await addColumn(connection, 'users', 'open_time', "TIME DEFAULT '08:00:00'");
  await addColumn(connection, 'users', 'close_time', "TIME DEFAULT '22:00:00'");
  await addColumn(connection, 'users', 'always_open', 'BOOLEAN DEFAULT FALSE');
  await addColumn(connection, 'bookings', 'payment_status', "VARCHAR(50) DEFAULT 'pending'");

  await connection.end();
  console.log('Owner settings migration complete.');
}

run().catch(err => {
  console.error('Owner settings migration failed:', err);
  process.exit(1);
});
