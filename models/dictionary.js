const z = require('zod')

const Word = z.object({
    term: z.string(),
    synonyms: z.array(z.string()),
    antonyms: z.array(z.string())
}).strict()

const Meaning = z.object({
    part_of_speech: z.string(),
    definition: z.string(),
    categories: z.array(z.string()),
    examples: z.array(z.string())
}).strict()

module.exports = {Word, Meaning}




