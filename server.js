// ===============================
// Classic Node Packages & APIS
// ===============================
global.express = require('express');
global.app = express();
global.path = require('path');
global.mongoose = require('mongoose');

// =======================
// Environment Variables
// =======================
var PORT = 3000;
var URL = "mongodb+srv://sulbha:databasePassword@maindatabase.ykfyn.mongodb.net/Database?retryWrites=true&w=majority"

// ===========================
// Setting up the view engine
// ===========================
app.set("view engine","ejs");
app.use(express.static(__dirname + '/public'));

// ==============================
// Connection setup to database
// ==============================
mongoose.connect(URL, { useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
    console.log("mongodb is connected");
}).catch((error)=>{
    console.log("mongodb not connected");
    console.log(error);
});

// ===========
// Home Route
// ===========
app.get('/', function(req, res){
    res.sendFile(path.join(__dirname+'/index.html'));
});

// =============
// Signin Route
// =============
app.get('/signin', function(req, res){
    res.send("This will be signin in page!");
});

// =============
// Signup Route
// =============
app.get('/signup', function(req, res){
    res.send("This will be signup in page!");
});

// ====================================
// PORT listener, server is running :)
// ====================================
app.listen(PORT, function(){
    console.log("The server is running...");
})