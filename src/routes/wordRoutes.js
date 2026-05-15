const express = require('express')
const router  = express.Router()
const wordController = require('../controllers/wordController')
const validate = require('../middleware/validate')
const {CreateWordRequest, PatchWordRequest} = require('../models/dictionary')

router.route('/')
    .get(wordController.getWords)
    .post(validate(CreateWordRequest), wordController.postWord)

router.route('/word-of-the-day')
    .get(wordController.wordOfTheDay)

router.route('/:word')
    .get(wordController.getSpecificWord)
    .patch(validate(PatchWordRequest), wordController.patchWord)
    .delete(wordController.deleteWord)


module.exports = router


