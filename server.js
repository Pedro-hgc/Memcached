const app = require('./src/app')
const port = process.env.PORT || 8080


app.listen(port, () => {
    console.log(`Dictionary API rodando na porta ${port}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
})
