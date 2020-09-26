// ===============================
// Classic Node Packages & APIS

const keys = require('./config/keys');

// ===============================
global.express = require('express');
global.app = express();
global.path = require('path');
global.mongoose = require('mongoose');
global.bodyParser = require('body-parser');
global.passport = require('passport');
global.googleStrategy = require('passport-google-oauth2').Strategy;
global.cookieParser = require('cookie-parser')
global.session = require('express-session')
global.keys = require('./config/keys');

// =======================
// Environment Variables
// =======================
var PORT = 5000;
var URL = "mongodb+srv://sulbha:databasePassword@maindatabase.ykfyn.mongodb.net/Database?retryWrites=true&w=majority"

// ===========================
// Setting up the view engine
// ===========================
app.set("view engine","ejs");
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use( bodyParser.urlencoded({
	extended: true
}));
app.use( passport.initialize());
app.use( passport.session());

// ==============================
// Connection setup to database
// ==============================
mongoose.connect(URL, { useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
    console.log("mongodb is connected");
}).catch((error)=>{
    console.log("mongodb not connected");
    console.log(error);
});

// ===================
// Exporting Models
// ===================
global.User = require('./models/user');

// =========================
// Passport session setup.
// =========================
passport.serializeUser((user,done)=>{
    done(null,user.id)
})

passport.deserializeUser((id,done)=>{
    User.findById(id).then((user)=>{
        done(null,user)
    })
})

passport.use(new googleStrategy({
        clientID: keys.googleClientId,
        clientSecret: keys.googleClientSecret,
        callbackURL: "/auth/google/callback",
        passReqToCallback: true,
        proxy: true
    },
    function(request, accessToken, refreshToken, profile, done) {
        User.findOne({googleId:profile.id}).then((foundUser)=>{
            if(foundUser) {
                done(null,foundUser)
            } else {
                new User({
                    userId:profile.id,
                    username:profile.displayName,
                    picture:profile._json.picture
                }).save().then((user)=>{
                    done(null,user)
                });
            }
        });
    }
));

// ===========
// Home Route
// ===========
app.get('/', function(req, res){
    res.sendFile(path.join(__dirname+'/index.html'));
});

// =============
// Oauth Route
// =============
app.get('/auth/google', passport.authenticate('google', {
    scope:['profile', 'email']
}));

app.get( '/auth/google/callback', passport.authenticate( 'google'), function(req, res){
    res.send("Successfully signed up in!")
});

// ====================================
// PORT listener, server is running :)
// ====================================
app.listen(PORT, function(){
    console.log("The server is running...");
})