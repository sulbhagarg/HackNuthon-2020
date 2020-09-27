// ===============================
// Classic Node Packages & APIS
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
global.paytm = require('paytm-pg-node-sdk');
global.checksum_lib = require('./Paytm/checksum');
global.config = require('./Paytm/config');
global.flash = require("connect-flash");
global.nodemailer = require('nodemailer');
global.report = require('./models/report');

// ===================
// Exporting Models
// ===================
global.User = require('./models/user');
global.Requests = require('./models/request');

// ==========
// NodeMailer
// ==========
global.nodemailer = require('nodemailer');
global.transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'qurantinbud@gmail.com',
        pass: 'nirma123'
    }
});

// =======================
// Environment Variables
// =======================
var PORT = 5000;
var URL = "mongodb+srv://sulbha:databasePassword@maindatabase.ykfyn.mongodb.net/Database?retryWrites=true&w=majority"

// ===========================
// Setting up the view engine
// ===========================
app.use(require("express-session")({
    secret: "hack.",
    resave: false,
    saveUninitialized: false
}));
app.set("view engine","ejs");
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use( bodyParser.urlencoded({
	extended: true
}));
app.use( passport.initialize());
app.use( passport.session());
passport.serializeUser(function(user, done){
    done(null, user);
});
passport.deserializeUser(function(obj, done){
    done(null, obj);
});

// =============================
// Setting up the user globally
// =============================
app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    next();
});

// ==============================
// Connection setup to database
// ==============================
mongoose.connect(URL, { useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
    console.log("mongodb is connected");
}).catch((error)=>{
    console.log("mongodb not connected");
    console.log(error);
});

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
        // console.log(profile);
        User.findOne({userId:profile.id}).then((foundUser)=>{
            if(foundUser) {
                done(null,foundUser)
                // console.log(foundUser);
                // res.render('profile');
            } else {
                new User({
                    userId:profile.id,
                    username:profile.displayName,
                    email:profile.email,
                    picture:profile._json.picture
                }).save().then((user)=>{
                    done(null,user)
                    // console.log(user);
                    // res.render('profile');
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

// ===============
// Profile Route
// ===============
app.get('/profile', function(req, res){
    if(req.isAuthenticated()) {
        res.render('profile');
    } else {
        res.redirect('/auth/google');
    }
    // res.render('profile');
})

// =============
// Oauth Route
// =============
app.get('/auth/google', passport.authenticate('google', {
    scope:['profile', 'email']
}));

app.get( '/auth/google/callback', passport.authenticate( 'google', { 
    successRedirect: '/auth/google/success',
    failureRedirect: '/auth/google/failure'
}));

app.get('/auth/google/success', function(req, res){
    res.redirect('/profile');
});

app.get('/auth/google/failure', function(req, res){
    res.redirect('/');
})

// ==================
// Payment gateway
// ==================
app.get("/paynow", (req, res)=> {
    res.render('payment');
});

app.post("/paynow", (req, res) => {
    var email = req.body.email;
    var mailOptions = {
        from: 'qurantinbud@gmail.com',
        to: email,
        subject: 'You are a Hero',
        text: 'Hey ' + req.body.name +' We have successfully recieved your payment.'
    };
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.log(error);
        }
        else{        
            console.log('Email sent: ' + info.response);
            console.log(req.params);
            res.redirect("/");
        }
    });
});

app.post("/callback", (req, res) => {
    // Route for verifiying payment
  
    var body = '';
  
    req.on('data', function (data) {
       body += data;
    });
  
    req.on('end', function () {
        var html = "";
        var post_data = qs.parse(body);
  
        // received params in callback
        console.log('Callback Response: ', post_data, "\n");
  
  
        // verify the checksum
        var checksumhash = post_data.CHECKSUMHASH;
        // delete post_data.CHECKSUMHASH;
        var result = checksum_lib.verifychecksum(post_data, config.PaytmConfig.key, checksumhash);
        console.log("Checksum Result => ", result, "\n");
    
    
        // Send Server-to-Server request to verify Order Status
        var params = {"MID": config.PaytmConfig.mid, "ORDERID": post_data.ORDERID};
    
        checksum_lib.genchecksum(params, config.PaytmConfig.key, function (err, checksum) {
  
            params.CHECKSUMHASH = checksum;
            post_data = 'JsonData='+JSON.stringify(params);
    
            var options = {
                hostname: 'securegw-stage.paytm.in', // for staging
                // hostname: 'securegw.paytm.in', // for production
                port: 443,
                path: '/merchant-status/getTxnStatus',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': post_data.length
                }
            };
    
    
            // Set up the request
            var response = "";
            var post_req = https.request(options, function(post_res) {
                post_res.on('data', function (chunk) {
                    response += chunk;
                });
        
                post_res.on('end', function(){
                    console.log('S2S Response: ', response, "\n");
        
                    var _result = JSON.parse(response);
                    if(_result.STATUS == 'TXN_SUCCESS') {
                        res.send('payment sucess')
                    }else {
                        res.send('payment failed')
                    }
                });
            });
    
            // post the data
            post_req.write(post_data);
            post_req.end();
        });
    });
});

// ================
// Update Details
// ================
app.post('/:id/updateDetails', function(req, res){
    if(!req.isAuthenticated()) {
        res.redirect('/auth/google');
    } else {
        var userId = req.params.id;
        User.find({userId: userId}, function(err, foundUser){
            if(err) {
                throw err;
            } else {
                if(foundUser.length>0) {
                    User.updateOne({userId: userId}, {
                        email:req.body.email,
                        firstName:req.body.firstName,
                        lastName:req.body.lastName,
                        addressL1:req.body.addressL1,
                        addressL2:req.body.addressL2,
                        addressL3:req.body.addressL3,
                        pincode:req.body.pincode,
                        contact:req.body.contact
                    }, function(err, done){
                        if(err) {
                            console.log(err);
                        } else {
                            res.redirect('/profile');
                        }
                    });
                } else {
                    console.log("kuch gadbad hai!");
                }
            }
        });
    }
});

// ================
// Start Helping
// ================
app.get('/start_help', function(req, res){
    if(!req.isAuthenticated()) {
        res.redirect('/auth/google');
    } else {
        Requests.find({accepted: false}, function(err, foundRequests){
            if(err) {
                console.log(err);
            } else {
                res.render('requests', {requests: foundRequests});
            }
        })
    }
});

app.post('/:from/:to/start_help', function(req, res){
    if(!req.isAuthenticated()) {
        res.redirect('/auth/google');
    } else {
        var requestId = mongoose.Types.ObjectId(req.params.to);
        Requests.findOneAndUpdate({_id: requestId}, {accepted: true}, function(err, foundRequest){
            if(err){
                console.log(err);
            } else {
                var email = foundRequest.email;
                var mailOptions = {
                    from: 'qurantinbud@gmail.com',
                    to: email,
                    subject: 'Congratulations',
                    text: 'Hey, your request is accepted!! The person will contact you soon.'
                };
                transporter.sendMail(mailOptions, function(error, info){
                    if(error){
                        console.log(error);
                    }
                    else{        
                        console.log('Email sent: ' + info.response);
                        res.redirect('/paynow');
                    }
                });
            }
        }) 
    }
});

app.post('/:from/:to/report', function(req, res){
    if(!req.isAuthenticated()) {
        res.redirect('/auth/google');
    } else {
        var fromId = req.params.from;
        var toId = mongoose.Types.ObjectId(req.params.to);
        Requests.findOne({_id: toId}, function(err, foundRequest){
            var email = foundRequest.email;
            var mailOptions = {
                from: 'qurantinbud@gmail.com',
                to: email,
                subject: 'Blocked',
                text: 'Hey, As we find your need_help request suspicious, it had been taken down!'
            };
            transporter.sendMail(mailOptions, function(error, info){
                if(error){
                    console.log(error);
                }
                else{        
                    console.log('Email sent: ' + info.response);
                    Requests.findByIdAndRemove(toId, function(err){
                        if(err){
                            console.log(err);
                        } else {
                            User.findOne({userId: fromId}, function(err, foundUser){
                                if(err) {
                                    console.log(err);
                                } else {
                                    var fromEmail = foundUser.email;
                                    var mailOptions = {
                                        from: 'qurantinbud@gmail.com',
                                        to: fromEmail,
                                        subject: 'Report noted',
                                        text: 'Hey, thank you for helping us. Your Report is successfully noted'
                                    };
                                    transporter.sendMail(mailOptions, function(error, info){
                                        if(error){
                                            console.log(error);
                                        }
                                        else{        
                                            console.log('Email sent: ' + info.response);
                                            res.redirect('/');
                                        }
                                    });
                                }
                            });
                        }
                    })
                }
            });
        });
    }
})

// ==============
// Post Request
// ==============
app.get('/need_help', function(req, res){
    if(!req.isAuthenticated()) {
        res.redirect('/auth/google');
    } else {
        res.render('request');
    }
});

app.post('/need_help', function(req, res){
    if(!req.isAuthenticated()) {
        res.redirect('/auth/google');
    } else {
        var firstName = req.body.firstName;
        var lastName = req.body.lastName;
        var email = req.body.email;
        var addressL1 = req.body.addressL1;
        var addressL2 = req.body.addressL2;
        var addressL3 = req.body.addressL3;
        var pincode = req.body.pincode;
        var contact = req.body.contact;
        var category = req.body.category;
        var list = req.body.list;
        var date = Date.now();
        var accepted = false;
    
        var newRequest = {
                            firstName: firstName,
                            lastName: lastName,
                            email: email,
                            addressL1: addressL1,
                            addressL2: addressL2,
                            addressL3: addressL3,
                            pincode: pincode,
                            contact: contact,
                            category: category,
                            list: list,
                            date: date,
                            accepted: accepted
                        };

        Requests.create(newRequest, function(err, newlyCreated){
            if(err) {
                console.log(err);
            } else {
                res.redirect('/paynow');
            }
        });
    }
});

// ================
// Logout Route
// ================
app.get('/logout', function(req, res){
    req.logout();
    res.redirect("/");
});

// ====================================
// PORT listener, server is running :)
// ====================================
app.listen(PORT, function(){
    console.log("The server is running...");
})