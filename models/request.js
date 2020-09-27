const mongoose = require("mongoose");

const RequestSchema = mongoose.Schema({
    firstName:String,
    lastName:String,
    email:String,
    addressL1:String,
    addressL2:String,
    addressL3:String,
    pincode:String,
    contact:String,
    category:String,
    list:String,
    date:Date,
    accepted:String
});

// export model user with RequestSchema
module.exports = mongoose.model("request", RequestSchema);