// ===============================
// Classic Node Packages & APIS
// ===============================
global.express = require('express');
global.app = express();
global.path = require('path');

// =======================
// Environment Variables
// =======================
var PORT = 3000;

// ===========================
// Setting up the view engine
// ===========================
app.set("view engine","ejs");
app.use(express.static(__dirname + '/public'));

// ===========
// Home Route
// ===========
app.get('/', function(req, res){
    res.sendFile(path.join(__dirname+'/index.html'));
});

// ====================================
// PORT listener, server is running :)
// ====================================
app.listen(PORT, function(){
    console.log("The server is running...");
})