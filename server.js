const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ارسال فایل index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// اتصال به MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ اتصال به MongoDB برقرار شد'))
    .catch(err => console.error('❌ خطای اتصال به دیتابیس:', err.message));
}

// ساختار پیام در دیتابیس (با نام کاربری و متن)
const messageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// مدیریت ارتباط سوکت
io.on('connection', async (socket) => {
  console.log('⚡ کاربر جدید متصل شد');

  // ۱. بارگذاری تاریخچه پیام‌ها از دیتابیس (ماندگاری)
  try {
    if (mongoose.connection.readyState === 1) {
      const history = await Message.find().sort({ createdAt: 1 }).limit(50);
      socket.emit('load history', history);
    }
  } catch (err) {
    console.error('خطا در دریافت تاریخچه:', err.message);
  }

  // ۲. دریافت و پخش پیام جدید
  socket.on('chat message', (data) => {
    if (!data || !data.text || !data.text.trim()) return;

    const messageData = {
      username: data.username || 'کاربر ناشناس',
      text: data.text.trim(),
      createdAt: new Date()
    };

    // ارسال به همه کاربران
    io.emit('chat message', messageData);

    // ذخیره در دیتابیس
    if (mongoose.connection.readyState === 1) {
      Message.create(messageData).catch(err => console.error('خطا در ذخیره دیتابیس:', err.message));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 سرور روی پورت ${PORT} اجرا شد`);
});
