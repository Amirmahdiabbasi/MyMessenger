const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ارسال مستقیم فایل index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// اتصال به دیتابیس MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ DB Error:', err.message));
}

// ساختار پیام در دیتابیس
const messageSchema = new mongoose.Schema({
  text: String,
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// مدیریت سوکت‌ها
io.on('connection', async (socket) => {
  console.log('⚡ کاربر متصل شد');

  // دریافت تاریخچه پیام‌ها
  try {
    if (mongoose.connection.readyState === 1) {
      const history = await Message.find().sort({ createdAt: 1 }).limit(50);
      socket.emit('load history', history);
    }
  } catch (err) {
    console.error('خطا در دریافت تاریخچه:', err.message);
  }

  // دریافت و ارسال پیام جدید
  socket.on('chat message', (msg) => {
    if (!msg || !msg.trim()) return;

    // ارسال آنی به همه کاربران
    io.emit('chat message', msg);

    // ذخیره در دیتابیس در پس‌زمینه
    if (mongoose.connection.readyState === 1) {
      Message.create({ text: msg }).catch(err => {
        console.error('خطا در ذخیره:', err.message);
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
