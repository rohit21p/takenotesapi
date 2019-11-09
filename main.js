const express = require('express');
const mongod = require('mongodb')
const session = require('express-session');

const app = express();
const mongoc = mongod.MongoClient;
let dbi;

app.use(session({
    secret: 'Rohit',
    resave: true,
    saveUninitialized: false
}));

app.use((req, res, next) => {
    if(req.headers.origin != undefined)
        res.setHeader('Access-Control-Allow-origin', req.headers.origin);
    else 
        res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

app.post('/signup', (req, res) => {
    body = [];
    req.on('data', (data) => {
        body.push(data);
    });
    req.on('end', () => {
        body = JSON.parse(Buffer.concat(body).toString());
        console.log(body);
        dbi.collection('users').insertOne(body, (err) => {
            if (err) {
                res.json({
                    loggedIn: false
                });
            } else {
                req.session.email = body.email;
                req.session.loogedIn = true;
                res.json({
                    loggedIn: true
                });
            }
        })
    });
} )

app.post('/login', (req, res) => {
    body = [];
    req.on('data', (data) => {
        body.push(data);
    });
    req.on('end', () => {
        body = JSON.parse(Buffer.concat(body).toString());
        dbi.collection('users').findOne(body, (err, result) => {
            if (result) {
                console.log(result);
                req.session.email = body.email;
                req.session.loogedIn = true;
                res.json({
                    loggedIn: true
                });
            } else {
                res.json({
                    loggedIn: false
                });
            }
        })
    });
} )

app.get('/logout', (req, res) => {
    req.session.loogedIn = false;
    res.json({
        LoggedIn: false
    });
});

app.get('/isLoggedIn', (req, res) => {
    res.json({
        LoggedIn: req.session.loogedIn
    });
})

mongoc.connect("mongodb://localhost:27017/", (err, db) => {
    if (!err) {
        dbi = db.db("hack");
        dbi.createCollection('users', (err) => {
            if(!err) {
                dbi.collection('users').createIndex( { "email": 1 }, { unique: true } );
                app.listen(3000);
                console.log("ready to listen");
            }
        })
    } else {
        process.exit();
    }
})