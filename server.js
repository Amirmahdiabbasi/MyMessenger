const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs'); // ماژول ذخیره‌سازی فایل

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DB_FILE = __dirname + '/messages.json';

// بارگذاری پیام‌های قدیمی از فایل (اگر فایل وجود داشته باشد)
let savedMessages = [];
try {
    if (fs.existsSync(DB_FILE)) {
        savedMessages = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
} catch (err) {
    console.log('هنوز فایلی برای پیام‌ها ساخته نشده است.');
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    socket.on('join', (username) => {
        socket.username = username;
        io.emit('system message', `${username} وارد چت شد`);
        
        // ارسال تمام تاریخچه پیام‌های ذخیره شده فقط به همین کاربر تازه وارد
        socket.emit('chat history', savedMessages);
    });

    socket.on('chat message', (msgText) => {
        const messageData = {
            username: socket.username || 'ناشناس',
            text: msgText,
            time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        };

        // اضافه کردن پیام جدید به آرایه و ذخیره در فایل json
        savedMessages.push(messageData);
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(savedMessages, null, 2));
        } catch (err) {
            console.error('خطا در ذخیره پیام:', err);
        }

        io.emit('chat message', messageData);
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            io.emit('system message', `${socket.username} چت را ترک کرد`);
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
