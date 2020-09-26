const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
    userId:String,
    username:String,
    picture:String
});

// export model user with UserSchema
module.exports = mongoose.model("user", UserSchema);