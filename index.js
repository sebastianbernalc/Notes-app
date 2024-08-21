require('dotenv').config();

const config = require('./config');
const mongoose = require('mongoose');

mongoose.connect(config.connectionString);
//Models
const User = require('./models/user.model');
const Note = require('./models/note.model');

const express = require('express');
const cors = require('cors');
const app = express();

const jwt = require('jsonwebtoken');
const { autenticateToken, authenticateToken } = require('./utilities');
const e = require('express');

app.use(express.json());

app.use(cors({
    origin: '*', // allow to server to accept request from different origin
})
);

app.get('/', (req, res) => {
    res.json({ data: 'Hello World!' });
});

//Create Account
app.post("/create-account", async (req, res) => {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
        return res.status(400).json({ error: true, message: 'All fields are required' });
    }
    const isUser = await User.findOne({ email: email });
    if (isUser) {
        return res.status(400).json({ message: 'Email already exists' });
    }

    const user = new User({
        fullName,
        email,
        password,
    });
    await user.save();
    const secretKey = process.env.ACCESS_TOKEN_SECRET;

    if (!secretKey) {
        return res.status(500).json({ error: true, message: 'Server configuration error. Please try again later.' });
    }
    console.log('Access Token Secret:', process.env.ACCESS_TOKEN_SECRET);
    const accessToken = jwt.sign({ user }, secretKey, { expiresIn: '1h' });
    return res.json({
        error: false,
        user,
        accessToken,
        message: 'Account created successfully'
    });
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email) {
        return res.status(400).json({ error: true, message: 'Email is required' });
    }
    if (!password) {
        return res.status(400).json({ error: true, message: 'Password is required' });
    }
    const userInfo = await User.findOne({ email: email });
    if (!userInfo) {
        return res.status(400).json({ error: true, message: 'User not found' });
    }
    if (userInfo.password === password && userInfo.email === email) {
        const user = { user: userInfo };
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        return res.json({
            error: false,
            accessToken,
            message: 'Login successful'
        });
    }
    else {
        return res.status(400).json({ error: true, message: 'Invalid credentials' });
    }
});

app.post("/add-note", authenticateToken, async (req, res) => {
    const { title, content, tags, isPinned } = req.body;
    const { user } = req.user;

    if (!title) {
        return res.status(400).json({ error: true, message: 'Title is required' });
    }
    if (!content) {
        return res.status(400).json({ error: true, message: 'Content is required' });
    }

    try {
        const note = new Note({
            title,
            content,
            tags: tags || [],
            userId: user._id,
        });
        await note.save();
        return res.json({ error: false, message: 'Note added successfully', note });
    } catch (error) {
        return res.status(500).json({ error: true, message: 'Server error. Please try again later' });
    }

});

app.put("/edit-note/:noteId", authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { title, content, tags, isPinned } = req.body;
    const { user } = req.user;

    if (!title && !content && !tags) {
        return res.status(400).json({ error: true, message: 'At least one field is required' });
    }

    try {
        const note = await Note.findOne({ _id: noteId, userId: user._id });
        console.log('Note:', note);
        console.log('ID_USER:', user._id);
        console.log('ID_NOTE:', noteId);
        if (!note) {
            return res.status(404).json({ error: true, message: 'Note not found' });
        }
        if (title) {
            note.title = title;
        }
        if (content) {
            note.content = content;
        }
        if (tags) {
            note.tags = tags;
        }
        if (isPinned) {
            note.isPinned = isPinned;
        }
        await note.save();
        return res.json({ error: false, message: 'Note updated successfully', note });
    } catch (error) {
        return res.status(500).json({ error: true, message: 'Server error. Please try again later' });
    }


});

app.get("/get-all-notes", authenticateToken, async (req, res) => {
    const { user } = req.user;
    try {
        const notes = await Note.find({ userId: user._id }).sort({ isPinned: -1 });
        return res.json({ error: false, notes, message: 'Notes retrieved successfully' });
    } catch (error) {
        return res.status(500).json({ error: true, message: 'Server error. Please try again later' });
    }
});

app.delete("/delete-note/:noteId", authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { user } = req.user;

    try {
        const note = await Note.findOne({ _id: noteId, userId: user._id });
        if (!note) {
            return res.status(404).json({ error: true, message: 'Note not found' });
        }
        await note.deleteOne({ _id: noteId, userId: user._id });
        return res.json({ error: false, message: 'Note deleted successfully' });
    } catch (error) {
        return res.status(500).json({ error: true, message: 'Server error. Please try again later' });
    }
});

app.get("/search-notes/", authenticateToken, async (req, res) => {
    const { user } = req.user;
    const {query} = req.query;
    
    if (!query) {
        return res.status(400).json({ 
            error: true, 
            message: 'Search Query is required' });
    }

    try{
        const matchingNotes = await Note.find({ 
            userId: user._id, 
            $or: [
                { title: { $regex: new RegExp(query, "i") } },
                { content: { $regex: new RegExp(query, "i") } },
            ],
        });
        return res.json({ error: false, notes: matchingNotes, message: 'Notes retrieved successfully' });
    }catch(error){
        return res.status(500).json({ error: true, message: 'Server error. Please try again later' });
    }
});

app.get("/get-user" , authenticateToken,async (req, res) => {
    const { user } = req.user;
    const isUser = await User.findOne({ _id: user._id });
    if (!isUser) {
        return res.status(404).json({ error: true, message: 'User not found' });
    }

    return res.json({ error: false, user: {
        fullName: isUser.fullName,
        email: isUser.email,
        _id: isUser._id,
        createdOn: isUser.createdOn
    }, message: 'User retrieved successfully' });
});

//Update isPinned value
app.put("/update-pin-note/:noteId", authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { isPinned } = req.body;
    const { user } = req.user;

    try {
        const note = await Note.findOne({ _id: noteId, userId: user._id });
        if (!note) {
            return res.status(404).json({ error: true, message: 'Note not found' });
        }
        note.isPinned = isPinned;
        
        await note.save();
        return res.json({ error: false, message: 'Note pinned successfully', note });
    } catch (error) {
        return res.status(500).json({ error: true, message: 'Server error. Please try again later' });
    }
});
app.listen(8000);
module.exports = app;