const wordService = require('../services/wordService')

exports.getWords = async (req, res) => {
    try {
        const data = await wordService.getAllWords()
        res.status(200).json(data)
    } catch (err) {
        res.status(500).send("Database Error")
    }
}

exports.postWord = async (req, res) => {
    try {
        const {word, meaning} = req.body
        await wordService.createWordWithMeaning(word, meaning)
        res.status(201).send("Word created with Success!")
    } catch (err) {
        console.error(err)
        res.status(500).send("Internal Database Error.\n")
    }
}

exports.getSpecificWord = async (req, res) => {
    try {
        const data = await wordService.getSpecificWord(req.params.word)
        res.status(200).json(data)

    } catch(err) {
        res.status(500).send(`Database Error: ${err}`)
    }
}

exports.patchWord = async (req, res) => {
    try {
        const word = {
            term: req.params.word,
            synonyms: req.body.synonyms,
            antonyms: req.body.antonyms,
        }
        const meaning = req.body.meaning

        await wordService.patchWord(word, meaning)
        res.status(200).send(`Word ${word.term} patched with success!\n`)
    } catch(err) {
        res.status(204).send(`Error: ${err}`)
    }
}
