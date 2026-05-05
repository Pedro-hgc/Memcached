const fs = require ('fs')
const { Pool } = require('pg')
const express = require('express')
const app = express()
const port = process.env.PORT || 8080

const memcached = process.env.MEMCACHED_URL || 'cache:11211'
const database  = process.env.DB_HOST || 'db'

function getDatabasePassword() {
    try {
        return fs.readFileSync('/run/secrets/db_password', 'utf8').trim()
    } catch(err) {
        return process.env.DB_PASSWORD || 'dev_password'
    }
}

const pool = new Pool({
    host: process.env.DB_HOST || 'db',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'dic_db',
    user: process.env.DB_USER || 'dev_admin',
    password: getDatabasePassword(),
})

app.get('/api', (req, res) => {
    res.send(`Hi from Docker swarm! Here looking at MY DICK! YOU BITCHES`)

    // Test the connection
    pool.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.error('Database connection failed:', err.stack);
      } else {
        console.log('Successfully connected to the database at:', res.rows[0].now);
      }
    });


})

app.listen(port, ()=> {
    console.log(`Dictionary API running at port ${port}`)
})
