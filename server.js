const fs = require ('fs')
const { Pool } = require('pg')
const express = require('express')
const app = express()
const port = process.env.PORT || 8080

const memcached = process.env.MEMCACHED_URL || 'cache:11211'

const {Word, Meaning} = require ('./models/dictionary')

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

app.use(express.json( {limit: '50mb'} ))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

app.route('/words')
    .get (async (req, res) => {
        const client = await pool.connect()
        try {
            await client.query('BEGIN')

            const words_query = 'SELECT * FROM words'
            const words_response = await client.query(words_query)

            var api_response = {
                words: words_response.rows,
                meanings: []
            }

            for (const word of api_response.words) {
                const meaning_response = (await client.query('SELECT * FROM meanings WHERE word_id = $1', [word.id])).rows[0]
                api_response.meanings.push(meaning_response)
                
            }
            await client.query ('COMMIT')
            res.status(200).send(api_response)
        } catch(err) {
            await client.query ('ROLLBACK')
            console.log("Database Error: ", err)
            res.status(404).send('Internal Server Error during Database Operation.\n')
        } finally {
            client.release()
        }
    })
    .post(async (req, res) => {
        // 1. Validação básica de presença
        if (!req.body.word || !req.body.meaning) {
            return res.status(400).send("Your Body Request needs defined word and meaning params.\n");
        }

        // 2. Validação Zod
        const parse_word = Word.safeParse(req.body.word);
        const parse_meaning = Meaning.safeParse(req.body.meaning);

        if (!parse_word.success) return res.status(400).send(parse_word.error.message);
        if (!parse_meaning.success) return res.status(400).send(parse_meaning.error.message);

        const client = await pool.connect(); 

        try {
            await client.query('BEGIN');

            const word_query = `
                INSERT INTO words (term, synonyms, antonyms)
                VALUES ($1, $2, $3)
                ON CONFLICT (term) DO UPDATE SET term = EXCLUDED.term 
                RETURNING id
            `;
            
            const word_res = await client.query(word_query, [
                parse_word.data.term.toUpperCase(),
                parse_word.data.synonyms, 
                parse_word.data.antonyms
            ]);
            
            const wordId = word_res.rows[0].id;

            const meaning_query = `
                INSERT INTO meanings (word_id, part_of_speech, definition, categories, examples)
                VALUES ($1, $2, $3, $4, $5)
            `;
            const m = parse_meaning.data;
            await client.query(meaning_query, [
                wordId, 
                m.part_of_speech, 
                m.definition, 
                m.categories, 
                m.examples
            ]);

            await client.query('COMMIT'); 
            res.status(201).send("Word and Meaning saved successfully!\n");

        } catch (err) {
            await client.query('ROLLBACK'); 
            console.error("Database Error:", err);
            res.status(500).send("Internal Server Error during database operation.");
        } finally {
            client.release(); 
        }
    });

app.route('/words/:word')
    .get(async (req, res) => {
        const client = await pool.connect()

        try {
            await client.query('BEGIN')
            const word_query = {
                text: 'SELECT * FROM words WHERE term = $1',
                values: [req.params.word.toUpperCase()]
            }
            
            const word_response = (await client.query(word_query)).rows[0]
            const word_id  = word_response.id

            const meaning_query = {
                text: 'SELECT * FROM meanings WHERE word_id = $1',
                values: [word_id]
            }
            const meaning_response = (await client.query(meaning_query)).rows[0]

            const api_response = {word_response, meaning_response}

            await client.query('COMMIT')
            res.status(200).send(api_response)

        } catch(err) {
            await client.query('ROLLBACK')
            console.error("Database Error: ", err)
            res.status(500).send("Internal Server Error during database operation.")

        } finally {
            client.release()
        }
    })


app.listen(port, ()=> {
    console.log(`Dictionary API running at port ${port}`)
})
