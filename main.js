const express = require('express');
const mongod = require('mongodb')
const session = require('express-session');
const nodemailer = require('nodemailer');
const events = require('events')
const sgMail = require('@sendgrid/mail');
const path = require('path');

const config = require('./config')

const app = express();
const mongoc = mongod.MongoClient;
let dbi;
const ee = new events.EventEmitter();

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


function emailIsValid (email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

app.post('/signup', (req, res) => {
    body = [];
    req.on('data', (data) => {
        body.push(data);
    });
    req.on('end', () => {
        body = JSON.parse(Buffer.concat(body).toString());
        if (emailIsValid(body.email) && body.password.length >= 8) {
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
        } else {
            res.json({
                loggedIn: false,
                error: 'invalid email or password shorter than 8 characters.'
            });
        }
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
    let myquery = { deleted: true };
    dbi.collection(req.session.email).deleteMany(myquery, function(err, result) {
        if (err) throw err;
    });
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

app.post('/create', (req, res) => {
    if(!req.session.loogedIn) {
        res.json({
            inserted: "Not Logged in"
        })
    } else {
        body = [];
        req.on('data', (data) => {
            body.push(data);
        });
        req.on('end', () => {
            body = JSON.parse(Buffer.concat(body).toString());
            console.log(body);
            if (body.title === undefined || body.title === '') {
                res.json({
                    inserted: 'no title'
                });
            } else if (body.desc === undefined  || body.desc === '') {
                res.json({
                    inserted: 'no note'
                });
            } else {
                dbi.createCollection(req.session.email, (err) => {
                    dbi.collection(req.session.email).insertOne(body, (err) => {
                        if (err) {
                            throw err;
                            res.json({
                                inserted: false
                            });
                        } else {
                            res.json({
                                inserted: true
                            });
                        }
                    })
                });
            }
        });
    }
})

app.get('/notes', (req, res) => {
    if(!req.session.loogedIn) {
        res.json({
            success: "Not Logged in"
        })
    } else {
        dbi.collection(req.session.email).find({}, (err, result) => {
            if (err) {
                throw err;
                res.json({
                    success: false
                });
            } else {
                result.toArray((err, data)=> {
                    res.json({
                        success: true,
                        notes: data
                    })
                })
            }
        })
    }
})

app.post('/reset', (req, res) => {
    body = [];
    req.on('data', (data) => {
        body.push(data);
    });
    req.on('end', () => {
        body = JSON.parse(Buffer.concat(body).toString());
        console.log(body);
        if (emailIsValid(body.email)) {
            req.session.email = body.email;
            const otp = Math.floor(Math.random() * (9999 - 1000) + 1000);
            req.session.otp = ''+otp;
            expire = function() {
                req.session.otp = null;
            }
            ee.on('expire-'+req.session.email, expire)
            console.log(req.session.otp, "before")
            setTimeout(() => {
                ee.emit('expire-'+req.session.email);
                ee.removeListener('expire-'+req.session.email,expire)
            }, 900000);
            res.json({
                status: 'check mail for otp'
            });
            sgMail.setApiKey(config.sgapi);
            const msg = {
                to: body.email,
                from: config.email,
                subject: 'TakeNotes - Reset Password',
                text: 'Use this otp in 15 minutes to reset your password in the app.',
                html: '<br>OTP:<strong>'+otp+'</strong><br><small>Use this otp in 15 minutes to reset your password in the app.</small>',
            };
            sgMail.send(msg);
        }
    });
})

app.post('/newpass', (req, res) => {
    body = [];
    req.on('data', (data) => {
        body.push(data);
    });
    req.on('end', () => {
        body = JSON.parse(Buffer.concat(body).toString());
        console.log(body);
        if (body.otp !== undefined && body.otp !== '' && req.session.otp === body.otp) {
            if (body.password.length >= 8) {
                let myquery = { email: req.session.email };
                let newvalues = { $set: {password: body.password } };
                dbi.collection("users").updateOne(myquery, newvalues, function(err, result) {
                    if (err) throw err;
                    req.session.otp = null;
                    res.json({
                        status: 'Password Changed'
                    });
                });
            } else {
                res.json({
                    status: 'Password should have atleast 8 characters'
                });
            }
        } else {
            res.json({
                status: 'Wrong or expired otp'
            });
        }
    })
})

app.get('/pin/:id', (req, res) => {
    if(!req.session.loogedIn) {
        res.json({
            success: "Not Logged in"
        })
    } else {
        let myquery = { _id: mongod.ObjectID(req.params.id) };
        let newvalues = { $set: {pin: true } };
        dbi.collection(req.session.email).updateOne(myquery, newvalues, function(err, result) {
            if (err) throw err;
            req.session.otp = null;
            res.json({
                status: 'Pinned'
            });
        });
    }
})

app.get('/unpin/:id', (req, res) => {
    if(!req.session.loogedIn) {
        res.json({
            success: "Not Logged in"
        })
    } else {
        let myquery = { _id: mongod.ObjectID(req.params.id) };
        let newvalues = { $set: {pin: false } };
        dbi.collection(req.session.email).updateOne(myquery, newvalues, function(err, result) {
            if (err) throw err;
            req.session.otp = null;
            res.json({
                status: 'Unpinned'
            });
        });
    }
})

app.get('/delete/:id', (req, res) => {
    if(!req.session.loogedIn) {
        res.json({
            success: "Not Logged in"
        })
    } else {
        let myquery = { _id: mongod.ObjectID(req.params.id) };
        let newvalues = { $set: {deleted: true } };
        dbi.collection(req.session.email).updateOne(myquery, newvalues, function(err, result) {
            if (err) throw err;
            res.json({
                status: 'Deleted'
            });
        });
    }
})

app.get('/restore/:id', (req, res) => {
    if(!req.session.loogedIn) {
        res.json({
            success: "Not Logged in"
        })
    } else {
        let myquery = { _id: mongod.ObjectID(req.params.id) };
        let newvalues = { $set: {deleted: false } };
        dbi.collection(req.session.email).updateOne(myquery, newvalues, function(err, result) {
            if (err) throw err;
            res.json({
                status: 'Restored'
            });
        });
    }
})

app.use(express.static('./takenotes'));

app.use((req, res) => {
    res.sendFile(path.join(__dirname, './takenotes/index.html'));
})


mongoc.connect("mongodb://localhost:27017/", (err, db) => {
    if (!err) {
        dbi = db.db("hack");
        dbi.createCollection('users', (err) => {
            if(!err) {
                dbi.collection('users').createIndex( { "email": 1 }, { unique: true } );
                dbi.createCollection('notes', (err) => {
                    if(!err) {
                        app.listen(3000);
                        console.log("ready to listen");
                    }
                    else throw err;
                })
            }
        })
    } else {
        process.exit();
    }
})
