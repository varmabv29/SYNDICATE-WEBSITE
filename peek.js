const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the SQlite database.');
});

db.serialize(() => {
  db.each(`SELECT * FROM User`, (err, row) => {
    if (err) {
      console.error(err.message);
    }
    console.log(row);
  });
});

db.close();
