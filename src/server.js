const knex = require('knex')
const app = require('./app')
const {PORT, DATABASE_URL} = require('./config')

const db = knex({
    client: 'pg',
    connectionString: DATABASE_URL,
})

app.set('db', db)

app.listen(PORT, () => {
    console.log(`Server listening at ${PORT}`)
})