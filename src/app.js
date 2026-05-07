const express = require('express')
const wordRoutes = require('./routes/wordRoutes')

const app = express()

app.use(express.json( {limit: '50mb'} ))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

app.use('/words', wordRoutes)

module.exports = app
