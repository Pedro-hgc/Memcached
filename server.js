const express = require('express')
const app = express()
const port = process.env.PORT || 8080

const memcached = process.env.MEMCACHED_URL || 'cache:11211'
const database  = process.env.DB_HOST || 'db'

app.get('/api', (req, res) => {
    res.send(`Hi from Docker swarm! Here looking at MY DICK!`)
})

app.listen(port, ()=> {
    console.log(`Dictionary API running at port ${port}`)
})
