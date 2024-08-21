const mongose = require('mongoose');
const Schema = mongose.Schema;
const userSchema = new Schema({
    fullName: {
        type: String,
        
    },
    email: {
        type: String,
        
    },
    password: {
        type: String,
        
    },
    createdOn : {
        type: Date,
        default: Date.now
    }
});

module.exports = mongose.model('User', userSchema);