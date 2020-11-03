require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const knex = require('knex')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt-nodejs')

process.env.NODE_TLS_REJECT_UNAUTHORIZED='0'

const app = express()



const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';
  

app.use(morgan(morganOption))
app.use(helmet())

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use(cors())

const db = knex({
    client:'pg',
    connection: "postgres://vxmydvjbiuzihh:c8e74b6811b5ea111927bb70d55df5aab67041ac3639b64ec15ee088ab120244@ec2-54-224-124-241.compute-1.amazonaws.com:5432/demrqf2a5nv6iu?ssl=true&sslfactory=org.postgresql.ssl.NonValidatingFactory"
})

app.get('/', (req, res) => {
	res.send("it is working!!")
})

app.get('/todo/:id', (req,res) => {
    const {id} =  req.params
    db('todo').where({
        id: id
    }).select('todo','noteid', 'id',"done")

    .then(item => {
        res.json(item)
    })
})

app.delete('/todo/:id', (req, res) => {
    const {id} = req.params
    db('todo').where('noteid', id)
        .del()
        .then( () => {
            db.select()
                .from ('todo')
                .then( (todo) =>{
                    res.send(todo)
                })
        })
})

app.post('/signin', (req,res) => {
    db.select('email','hash').from('login')
        .where('email', '=', req.body.email)
        .then(data => {
            const isValid = bcrypt.compareSync(req.body.password, data[0].hash)
            console.log(isValid)
            if (isValid){
            
                return   db.select('*').from('users')
                    .where('email', '=',req.body.email)
                    .then(user => {
                        res.json(user[0])
                    })
                    .catch(err => res.status(400).json('User not Found'))
                
            }else{
                res.status(400).json('Wrong Credential')
            }
            
        })
    .catch(err => res.status(400).json('Wrong Credential'))
})

app.post('/register',(req,res) => {
    const {email, name, password} = req.body
    const hash = bcrypt.hashSync(password)
    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx('users')
            .returning('*')
            .insert({
                email:loginEmail[0],
                name:name
            }).then(user => {
                res.json(user[0])
            })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('unable to register'))
   
})

app.put('/todo/:id', (req,res) => {
    const {todo} = req.body
    const {id} = req.params
    db('todo').where ('noteid', id)
              .returning('*')
              .update({
                  todo:todo
              })
              .then(response => {
                db.select().from('todo').where('noteid',id).then( function(todo){
                    res.send(todo)
                })
                })
})

app.put('/toggle/:id', (req,res) => {
    const {done} =  req.body
    const {id} = req.params

    db('todo').where ('noteid', id)
                    .returning('*')
                    .update({
                        done: done
                    })
                    .then (response => {
                        db.select().from('todo').where('noteid',id).then( function(todo){
                            res.send(todo)
                        })
                    })
})

app.post('/add/:id',  (req,res) => {
    
    const {todo} = req.body
    const {id} = req.params

    db('todo')
        .returning('*')
        .insert({
            todo:todo,
            id:id
        })
        .then(response => {
            const json = JSON.parse(JSON.stringify(response))
            res.json({"noteid": json[0].noteid});
        })




    /* db('todo').insert({
        todo: todo,
        id: id
    })
    .then(() => {
        db.select().from('todo')
            .then (todo => {
                res.send(todo)
            }) 
    }) 
    .returning('noteid')
    .then(
        function (id){
            console.log(id[0]);  //id here
        }
    ) */
    
})

app.get('/profile/:id',(req,res) =>{
    const {id} = req.params
    db.select('*').from('users')
    .where({
        id: id
    })
    .then(user => {
        if (user.length){
            res.json(user[0])
        }else{
            res.status(400).json('Not Found')
        }
    })
    .catch(err => res.status(400).json('Error getting user'))
    
})


app.use(function errorHandler(error, req, res, next) {
    let response
    if (NODE_ENV === 'production') {
        response = {error: {message: 'server error'}}
    } else {
        console.error(error)
        response = {message: error.message, error}
    }
    res.status(500).json(response)
})

module.exports = app

// https://buildpack-registry.s3.amazonaws.com/buildpacks/mars/create-react-app.tgz