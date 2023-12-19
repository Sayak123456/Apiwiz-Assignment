require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { ExpressPeerServer } = require('peer');

const authRoute = require('./routes/auth');
const commentRoute = require('./routes/comment');
const postRoute = require('./routes/post');
const userRoute = require('./routes/user');
const messageRoute = require('./routes/message');

const app = express();
app.use(express.json());
app.use(cors());
app.use(cookieParser());

// Socket
const http = require('http').createServer(app);
const io = require('socket.io')(http);

io.on('connection', socket => {
    SocketServer(socket)
});


app.use('/api', authRoute);
app.use('/api', userRoute);
app.use('/api', commentRoute);
app.use('/api', postRoute);
app.use('/api', messageRoute);

const URI = process.env.MONGODB_URI
try{
    mongoose.connect(URI);
    console.log('Connected to MongoDB!')
} catch (err) {
    console.error(err);
}

const port = process.env.PORT || 5000
app.listen(port, () => {
    console.log('Server is running on port', port)
})
