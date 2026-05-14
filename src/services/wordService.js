const pool = require('../config/db')
const {getCacheClient} = require('../config/mc')
const {cacheGet, cacheSet} = require ('../helpers/cache')

async function getAllWords() {
    const cache = await getCacheClient() 
    const data = await cacheGet(cache, 'words:all')

    if (data) {
        console.log("\n\nSuccesfully got it all words from the cache!\n\n")
        return JSON.parse(data)
    }

    const client = await pool.connect()
    try {
        console.log("\n\nGOT IT WORDS FROM DATABASE")
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
        await cacheSet(cache, 'words:all', api_response)
        return api_response
    } finally {
        client.release()
    }
}

async function createWordWithMeaning(wordData, meaningData) {
    const client = await pool.connect();
    const cache = await getCacheClient()

    try {
        await client.query('BEGIN')

        const word_query = `
            INSERT INTO words (term, synonyms, antonyms)
            VALUES ($1, $2, $3)
            ON CONFLICT (term) DO UPDATE SET term = EXCLUDED.term 
            RETURNING *
        `
        
        const word_res = await client.query(word_query, [
            wordData.term.toUpperCase(),
            wordData.synonyms, 
            wordData.antonyms
        ])
        
        const wordId = word_res.rows[0].id

        const meaning_query = `
            INSERT INTO meanings (word_id, part_of_speech, definition, categories, examples)
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `
        const meaning_res =  await client.query(meaning_query, [
            wordId, 
            meaningData.part_of_speech, 
            meaningData.definition, 
            meaningData.categories, 
            meaningData.examples
        ])


        const word = word_res.rows[0]

        const meanings = meaning_res.rows

        await cacheSet(cache, `words:${wordData.term}`, word)
        await cacheSet(cache, `meanings:${wordData.term}`, meanings)

        await client.query('COMMIT');

    } catch (err) {
        await client.query('ROLLBACK')
        throw err
    } finally {
        client.release()
    }
}

async function getSpecificWord(word_param) {
    const cache = await getCacheClient()

    const word_data = await cacheGet(cache,`words:${word_param.toUpperCase()}`)
    const meaning_data = await cacheGet(cache,`meanings:${word_param.toUpperCase()}`)

    if (word_data && meaning_data) {
        console.log("Oh yeah got it from the cache baby!!!")
        const word = JSON.parse(word_data)
        const meanings = JSON.parse(meaning_data)
        return {word, meanings} 
    }
             

    const client = await pool.connect()
    try {
        console.log("Oh no got it from the database baby")
        const word_query = {
            text: 'SELECT * FROM words WHERE term = $1',
            values: [word_param.toUpperCase()]
        }
        const word = (await client.query(word_query)).rows[0]

        const meanings_query = {
            text: 'SELECT * FROM meanings WHERE word_id = $1',
            values: [word.id]
        }

        const meanings = (await client.query(meanings_query)).rows

        await cacheSet(cache, `words:${word.term}`, word)
        await cacheSet(cache, `meanings:${word.term}`, meanings)

        return {word, meanings}
    } catch(err) {
        throw err;
    } finally {
        client.release()
    }
}

async function patchWord(word, meaning) {
    const cache = await getCacheClient()
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

        await cacheSet(cache, `words:${word.term.toUpperCase()}`, {word, meaning})
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
    const cache = await getCacheClient()

    try {
        await client.query('BEGIN')
        console.log (`The word that will be deleted is ${word.toUpperCase()}`)

        const delete_query= {text: 'DELETE FROM words WHERE term = $1', values: [word.toUpperCase()]}
        const response = await client.query(delete_query)

        if (response.rowCount == 0)
            throw new Error ("Nothing was deleted because the word doesnt exist in the databse!\n")


        await cacheDel(cache, word.toUpperCase())
        await client.query('COMMIT')

    } catch(err) {
        await client.query('ROLLBACK')
        throw err

    } finally {
        client.release()
    }
}

async function wordOfTheDay() {
    const cache = await getCacheClient()
    const data = await cacheGet(cache, 'words:word-of-the-day')

    if (data) 
        return JSON.parse(data)

    const client = await pool.connect()
    const today = new Date()
    const day = today.getDate()
    const month = today.getMonth()
    const year = today.getFullYear()

    const date_num = day * month * year;
    console.log(`Number of the day is ${date_num}\n`)

    try {
        console.log("Oh no WORD OF THE DAY GOT IT from the database!!!")
        const all_words_query = 'SELECT * FROM words'
        const all_words_response = await client.query(all_words_query)

        const day_word_id = date_num % all_words_response.rowCount
        const word = all_words_response.rows[day_word_id]

        const meaning_query = {
            text: 'SELECT * FROM meanings WHERE word_id = $1',
            values: [word.id]
        }
        const meaning = (await client.query(meaning_query)).rows[0]
        
        await cacheSet(cache, 'words:word-of-the-day', {word, meaning})
        return {word, meaning}

    } catch (err) {
        throw err

    } finally {
        client.release()
    }
}

module.exports = {getAllWords, createWordWithMeaning, getSpecificWord, patchWord, deleteWord, wordOfTheDay}



