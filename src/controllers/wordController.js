const wordService = require('../services/wordService')

exports.getWords = async (req, res) => {
    try {
        const data = await wordService.getAllWords()
        res.status(200).json(data)
    } catch (err) {
        res.status(500).send(`Database error: \n ${err}`)
    }
}

exports.postWord = async (req, res) => {
    try {
        const {word, meaning} = req.body
        await wordService.createWordWithMeaning(word, meaning)
        res.status(201).send("Word created with Success!")
    } catch (err) {
        res.status(500).send(`Database error: \n ${err}`)
    }
}

exports.getSpecificWord = async (req, res) => {
    try {
        const data = await wordService.getSpecificWord(req.params.word)
        res.status(200).json(data)

    } catch(err) {
        res.status(500).send(`Database error: \n ${err}`)
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
        res.status(500).send(`Database error: \n ${err}`)
    }
}

exports.deleteWord = async (req, res) => {
    try {
        await wordService.deleteWord(req.params.word)
        res.status(200).send("The word was successfully deleted!\n")

    } catch(err) {
        res.status(500).send(`Database error: \n ${err}`)
    }
}
