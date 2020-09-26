const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
    userId:String,
    username:String,
    picture:String,
    firstName:String,
    lastName:String,
    addressL1:String,
    addressL2:String,
    addressL3:String,
    pincode:String,
    contact:String
});

// export model user with UserSchema
module.exports = mongoose.model("user", UserSchema);