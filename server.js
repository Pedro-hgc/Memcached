const fs = require ('fs');
const { Pool } = require('pg');
const express = require('express');
const Memcached = require('memcached');
const app = express();

const port = process.env.PORT || 8080;
const memcached = process.env.MEMCACHED_URL || 'cache:11211';

const database  = process.env.DB_HOST || 'db';
const memcachedClient = new Memcached(memcached);

const getCache = (key) => {
    return new Promise((resolve) => {
        memcachedClient.get(key, (err, data) => resolve(data));
    });
};

const setCache = (key, value) => {
    memcachedClient.set(key, value, 3600, (err) => {
        if (err) console.error('Erro ao salvar no Memcached:', err);
    });
};
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
app.get('/api/status', (req, res) => {
    res.json({ 
        message: "Dictionary API ativa no Docker Swarm",
        database: "Conectado" 
    });
});

// NOVA ROTA: Buscar palavra (Aqui é onde você testa o Memcached)
app.get('/api/word/:lemma', async (req, res) => {
    const { lemma } = req.params;
    const cacheKey = `word:${lemma}`;

    try {
        // 1. Tenta buscar no Memcached primeiro
        const cachedData = await getCache(cacheKey);
        
        if (cachedData) {
            console.log(`Cache HIT para: ${lemma}`);
            return res.json({ 
                source: 'memcached', 
                data: JSON.parse(cachedData) 
            });
        }

        // 2. Se não estiver no cache (Cache Miss), busca no Postgres
        console.log(`Cache MISS para: ${lemma}. Buscando no Postgres...`);
        const query = `
            SELECT w.lemma, w.phonetic_spelling, d.part_of_speech, d.definition
            FROM dictionary.words w
            LEFT JOIN dictionary.definitions d ON w.word_id = d.word_id
            WHERE w.lemma = $1
        `;
        const result = await pool.query(query, [lemma]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Palavra não encontrada' });
        }

        // 3. Salva no Memcached para as próximas consultas (expira em 1 hora)
        setCache(cacheKey, JSON.stringify(result.rows));

        res.json({ 
            source: 'database', 
            data: result.rows 
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/word', express.json(), async (req, res) => {
    const { lemma, language_code, phonetic, definitions } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Inserir na tabela dictionary.words
        const wordRes = await client.query(
            'INSERT INTO dictionary.words (lemma, language_code, phonetic_spelling) VALUES ($1, $2, $3) RETURNING word_id',
            [lemma, language_code || 'en_US', phonetic]
        );

        const wordId = wordRes.rows[0].word_id;

        // Inserir as definições em massa
        for (const def of definitions) {
            await client.query(
                'INSERT INTO dictionary.definitions (word_id, part_of_speech, definition, example_sentence) VALUES ($1, $2, $3, $4)',
                [wordId, def.pos, def.definition, def.example]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Palavra criada com sucesso', wordId });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.listen(port, ()=> {
    console.log(`Dictionary API running at port ${port}`)
})
