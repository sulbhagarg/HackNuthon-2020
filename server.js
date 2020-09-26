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

// ===================
// Exporting Models
// ===================
global.User = require('./models/user');
global.Requests = require('./models/request');

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
    res.render('profile');
});

// ==================
// Payment gateway
// ==================
app.get("/paynow", (req, res)=> {
    res.render('payment');
});

app.post("/paynow", (req, res) => {  
    var paymentDetails = {
        amount: req.body.amount,
        customerId: req.body.name,
        customerEmail: req.body.email,
        customerPhone: req.body.phone
    }
    if(!paymentDetails.amount || !paymentDetails.customerId || !paymentDetails.customerEmail || !paymentDetails.customerPhone) {
        res.status(400).send('Payment failed')
    } else {
        var params = {};
        params['MID'] = config.PaytmConfig.mid;
        params['WEBSITE'] = config.PaytmConfig.website;
        params['CHANNEL_ID'] = 'WEB';
        params['INDUSTRY_TYPE_ID'] = 'Retail';
        params['ORDER_ID'] = 'TEST_'  + new Date().getTime();
        params['CUST_ID'] = paymentDetails.customerId;
        params['TXN_AMOUNT'] = paymentDetails.amount;
        params['CALLBACK_URL'] = 'http://localhost:5000/callback';
        params['EMAIL'] = paymentDetails.customerEmail;
        params['MOBILE_NO'] = paymentDetails.customerPhone;
    
    
        checksum_lib.genchecksum(params, config.PaytmConfig.key, function (err, checksum) {
            var txn_url = "https://securegw-stage.paytm.in/theia/processTransaction"; // for staging
            // var txn_url = "https://securegw.paytm.in/theia/processTransaction"; // for production
    
            var form_fields = "";
            for (var x in params) {
                form_fields += "<input type='hidden' name='" + x + "' value='" + params[x] + "' >";
            }
            form_fields += "<input type='hidden' name='CHECKSUMHASH' value='" + checksum + "' >";
    
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write('<html><head><title>Merchant Checkout Page</title></head><body><center><h1>Please do not refresh this page...</h1></center><form method="post" action="' + txn_url + '" name="f1">' + form_fields + '</form><script type="text/javascript">document.f1.submit();</script></body></html>');
            res.end();
        });
    }
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
// Start Helping
// ================
app.get('/start_helping', function(req, res){

});

app.post('/start_helping', function(req, res){

});

// ==============
// Post Request
// ==============
app.get('/need_help', function(req, res){

});

app.post('/need_help', function(req, res){
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var addressL1 = req.body.addressL1;
    var addressL2 = req.body.addressL2;
    var addressL3 = req.body.addressL3;
    var pincode = req.body.pincode;
    var contact = req.body.contact;
    var category = req.body.category;
    var list = req.body.list;
    var date = Date.now();

    var newRequest = {
                        firstName: firstName,
                        lastName: lastName,
                        addressL1: addressL1,
                        addressL2: addressL2,
                        addressL3: addressL3,
                        pincode: pincode,
                        contact: contact,
                        category: category,
                        list: list,
                        date: date
                    };
            
    Requests.create(newRequest, function(err, newlyCreated){
        if(err) {
            console.log(err);
        } else {
            res.redirect('/');
        }
    });
});

// ====================================
// PORT listener, server is running :)
// ====================================
app.listen(PORT, function(){
    console.log("The server is running...");
})