const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    socket.on('user joined', (username) => {
        socket.broadcast.emit('user joined', username);
    });

    socket.on('chat message', (data) => {
        io.emit('chat message', data);
    });
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});
