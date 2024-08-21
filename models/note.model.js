const mongose = require('mongoose');
const Schema = mongose.Schema;
const noteSchema = new Schema({
    title: {
        type: String,
        required : true
        
    },
    content: {
        type: String,
        required : true
        
    },
    tags: {
        type: [String],
        default: []
        
    },
    isPinned : {
        type: Boolean,
        default: false
    },
    userId : {
        type: String,
        required: true
    },

    createdOn : {
        type: Date,
        default: Date.now
    }
});

module.exports = mongose.model('Note', noteSchema);