# Database Backup and Restore

This project uses MongoDB. To share a copy of your database:

1) Create a backup (dump)

- Preferred: set MONGODB_URI to your DB connection string, or set DB_NAME for a local DB name.
- From the `server` folder:

PowerShell:

    $env:MONGODB_URI="mongodb://127.0.0.1:27017/mydb"; npm run backup

or without URI (defaults to DB_NAME or `mydb`):

    $env:DB_NAME="mydb"; npm run backup

The script runs `mongodump` and creates a folder `db-backup/` at the server root containing your database dump.

Note: You must have MongoDB Database Tools installed, and `mongodump` available in PATH.
Download: https://www.mongodb.com/try/download/database-tools

2) Include backup in your zip

- Add the generated `db-backup/` folder to your project zip.

3) Restore on another machine

- From the server folder that contains `db-backup/`:

PowerShell:

    mongorestore --db mydb ./db-backup/mydb

If using a connection string:

    mongorestore --uri "mongodb://127.0.0.1:27017/mydb" ./db-backup/mydb

If the database already exists and you want to overwrite, add `--drop`:

    mongorestore --db mydb --drop ./db-backup/mydb

Troubleshooting:
- If `mongodump`/`mongorestore` is not recognized, install MongoDB Database Tools and add to PATH.
- Make sure your MongoDB service is running and the connection string is correct.
