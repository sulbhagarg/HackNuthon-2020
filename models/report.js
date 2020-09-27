const mongoose = require("mongoose");

const ReportSchema = mongoose.Schema({
    email:String
});

// export model user with RequestSchema
module.exports = mongoose.model("report", ReportSchema);