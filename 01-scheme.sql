-- Create a schema for organization
CREATE SCHEMA dictionary;

-- Table 1: Core vocabulary words
CREATE TABLE dictionary.words (
    word_id SERIAL PRIMARY KEY,
    lemma VARCHAR(255) NOT NULL, -- The canonical form of the word
    language_code CHAR(5) NOT NULL DEFAULT 'en_US',
    phonetic_spelling VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Definitions and Parts of Speech
CREATE TABLE dictionary.definitions (
    def_id SERIAL PRIMARY KEY,
    word_id INTEGER REFERENCES dictionary.words(word_id) ON DELETE CASCADE,
    part_of_speech VARCHAR(50), -- noun, verb, adj, etc.
    definition TEXT NOT NULL,
    example_sentence TEXT
);

-- Table 3: Synonyms (self-referencing lookup)
CREATE TABLE dictionary.synonyms (
    word_id INTEGER REFERENCES dictionary.words(word_id),
    synonym_word_id INTEGER REFERENCES dictionary.words(word_id),
    PRIMARY KEY (word_id, synonym_word_id)
);

-- Indexes for performance
CREATE UNIQUE INDEX idx_word_lemma ON dictionary.words(lemma);
CREATE INDEX idx_def_word_id ON dictionary.definitions(word_id);
