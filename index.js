require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoDBSessionStore = require('connect-mongodb-session')(session);
const bodyparser = require('body-parser');
var path = require('path');
const dbConnect = require('./database/dbConnect');
const flash = require('express-flash');
const User = require('./models/user')
const startServer = require('./database/UserCreated');

const app = express();
const conn = dbConnect();
const deleteExpiredSessions = require('./cronJob');
const store = new MongoDBSessionStore({
    uri: process.env.MONGODB_CONNECT_URI_KENLEY,
    collection: 'sessions'
});
app.use(session({
    secret: 'Reymond_Godoy_Secret7777', 
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
      },
    resave: false,
    saveUninitialized: true,
    store: store,
}));
app.use(bodyparser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use('/public', express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, '/views'));
app.use(flash());
app.use(function (req, res, next) {
    req.db = conn;
    next();
});

require('./routes/web')(app);
app.use(async(req, res, next) => {
    const user = await User.findById(req.session.login);
    if (!user) {
        return res.redirect('/login');
    }
    if (user.role === 'member') {
        return res.redirect('/');
    } else if (user.role === 'admin') {
        return res.redirect('/admin');
    } else if (user.role === 'creator') {
        return res.redirect('/vehicles');
    } else {
        console.log('Unknown role logged in');
    }
    next();
});

// app.use((req, res, next) => {
//     res.status(404).render('404');
// });
const PORT = process.env.PORT
app.listen(PORT, async () => {
    console.log("Server is running at port", PORT);
    await startServer(); // Call startServer here
});

deleteExpiredSessions();