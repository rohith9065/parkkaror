const mysql = require('mysql2');
const conn = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'parkaror',
  port: 3306,
});

conn.connect((err) => {
  if (err) {
    console.error('connect error', err);
    process.exit(1);
  }
  console.log('connected');

  const q = `UPDATE users SET upi_id = ?, bank_account_number = ?, bank_ifsc = ?, bank_name = ?, open_time = ?, close_time = ?, always_open = ? WHERE id = ?`;
  conn.query(
    q,
    ['test@upi', null, null, null, '08:00', '20:00', 0, 1],
    (e, r) => {
      if (e) {
        console.error('query error', e);
        process.exit(1);
      }
      console.log('result', JSON.stringify(r));
      conn.end();
    }
  );
});
