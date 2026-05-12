CREATE TABLE words (
    id SERIAL PRIMARY KEY,
    term VARCHAR(255) UNIQUE NOT NULL,
    synonyms TEXT[], -- Stores the array: ["Ampere", "Type a", ...]
    antonyms TEXT[]  -- Stores the array: []
);

CREATE TABLE meanings (
    id SERIAL PRIMARY KEY,
    word_id INTEGER REFERENCES words(id) ON DELETE CASCADE,
    part_of_speech VARCHAR(100), -- E.g., "Noun"
    definition TEXT NOT NULL,    -- E.g., "the 1st letter of the Roman alphabet"
    categories TEXT[],           -- Stores the 3rd item array: ["Letter", "Letter of the alphabet"...]
    examples TEXT[]              -- Stores the 4th item array: []
);

-- 3. Indexes to make searches blazing fast
CREATE INDEX idx_words_term ON words(term);
CREATE INDEX idx_meanings_word_id ON meanings(word_id);
