const pool = require('../config/db')

async function getAllWords() {
    const client = await pool.connect()
    try {
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
        return api_response
    } finally {
        client.release()
    }
}

async function createWordWithMeaning(wordData, meaningData) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN')

        const word_query = `
            INSERT INTO words (term, synonyms, antonyms)
            VALUES ($1, $2, $3)
            ON CONFLICT (term) DO UPDATE SET term = EXCLUDED.term 
            RETURNING id
        `
        
        const word_res = await client.query(word_query, [
            wordData.term.toUpperCase(),
            wordData.synonyms, 
            wordData.antonyms
        ])
        
        const wordId = word_res.rows[0].id

        const meaning_query = `
            INSERT INTO meanings (word_id, part_of_speech, definition, categories, examples)
            VALUES ($1, $2, $3, $4, $5)
        `
        await client.query(meaning_query, [
            wordId, 
            meaningData.part_of_speech, 
            meaningData.definition, 
            meaningData.categories, 
            meaningData.examples
        ])

        await client.query('COMMIT');

    } catch (err) {
        await client.query('ROLLBACK')
        throw err
    } finally {
        client.release()
    }
}

async function getSpecificWord(word) {
    const client = await pool.connect()

    try {
        const word_query = {
            text: 'SELECT * FROM words WHERE term = $1',
            values: [word.toUpperCase()]
        }
        const word_res = (await client.query(word_query)).rows[0]

        const meanings_query = {
            text: 'SELECT * FROM meanings WHERE word_id = $1',
            values: [word_res.id]
        }

        const meanings_res = (await client.query(meanings_query)).rows

        return [word_res, meanings_res]
    } catch(err) {
        throw err;
    } finally {
        client.release()
    }
}

async function patchWord(word, meaning) {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')
        const update_word_query = {
            text: 'UPDATE words SET synonyms = $1, antonyms = $2 WHERE term = $3 RETURNING id',
            values: [word.synonyms, word.antonyms, word.term.toUpperCase()]
        }
        const response = (await client.query(update_word_query)).rows[0]

        const update_meaning_query = `
        INSERT INTO meanings (word_id, part_of_speech, definition, categories, examples)
        VALUES ($1, $2, $3, $4, $5)
    `
        await client.query(update_meaning_query, [response.id, meaning.part_of_speech,
        meaning.definition, meaning.categories, meaning.examples])

        await client.query('COMMIT')
    } catch (err) {
        await client.query('ROLLBACK')
        throw err;
    } finally {
        client.release()
    }
}

async function deleteWord(word) {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')
        console.log (`The word that will be deleted is ${word.toUpperCase()}`)

        const delete_query= {text: 'DELETE FROM words WHERE term = $1', values: [word.toUpperCase()]}
        const response = await client.query(delete_query)

        if (response.rowCount == 0)
            throw new Error ("Nothing was deleted because the word doesnt exist in the databse!\n")
        await client.query('COMMIT')

    } catch(err) {
        await client.query('ROLLBACK')
        throw err

    } finally {
        client.release()
    }
}

module.exports = {getAllWords, createWordWithMeaning, getSpecificWord, patchWord, deleteWord}


