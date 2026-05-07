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

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.route('/words/:word')
    .get(async (req, res) => {
        const searched_word = req.params.word.toUpperCase()
        const search_query = 'SELECT * FROM words WHERE term = $1'
        const query_params = [searched_word]

        const word_table_response = (await pool.query(search_query, query_params)).rows[0]
        
        if (word_table_response == null)
            res.sendStatus(404)

        const word_id = word_table_response.id
        const meanings_query = 'SELECT * FROM meanings WHERE id = $1'
        const meanings_response = (await pool.query(meanings_query, [word_id])).rows[0]

        const response_final = [word_table_response, meanings_response] 

        res.status(200).send(response_final)

    })
    .post(async (req, res) => {
        const word_to_create = req.params.word.toUpperCase()
        const query = 'SELECT * FROM words WHERE term = $1'
        const response = (await pool.query(query, [word_to_create])).rows[0]

        if (response != null) {
            res.status(444).send("Word already exists in the database!\n")
            return
        }

        const insert_query = 'INSERT INTO words VALUES ($1, $2, $3)'


    })

app.listen(port, ()=> {
    console.log(`Dictionary API running at port ${port}`)
})
