WITH json_file AS (
    -- 1. Read the file and unpack the root JSON object.
    -- json_each() separates dynamic keys (like "A") from their nested values.
    SELECT 
        key AS word_term, 
        value AS word_data 
    FROM json_each(pg_read_file('/docker-entrypoint-initdb.d/data.json')::json)
),
inserted_words AS (
    -- 2. Insert into the main 'words' table and capture the new IDs.
    INSERT INTO words (term, synonyms, antonyms)
    SELECT 
        word_term,
        ARRAY(SELECT json_array_elements_text(word_data->'SYNONYMS')),
        ARRAY(SELECT json_array_elements_text(word_data->'ANTONYMS'))
    FROM json_file
    RETURNING id, term
)
-- 3. Insert into the 'meanings' table using the IDs we just created.
INSERT INTO meanings (word_id, part_of_speech, definition, categories, examples)
SELECT 
    iw.id,
    meaning_array.item->>0, -- Index 0 is the part of speech ("Noun")
    meaning_array.item->>1, -- Index 1 is the definition ("the 1st letter...")
    ARRAY(SELECT json_array_elements_text(meaning_array.item->2)), -- Index 2 is the nested categories array
    ARRAY(SELECT json_array_elements_text(meaning_array.item->3))  -- Index 3 is the nested examples array
FROM json_file jf
-- Link the JSON data to the newly generated database ID
JOIN inserted_words iw ON iw.term = jf.word_term
-- Unpack the MEANINGS array so each meaning gets its own row in the table
CROSS JOIN json_array_elements(jf.word_data->'MEANINGS') AS meaning_array(item);
