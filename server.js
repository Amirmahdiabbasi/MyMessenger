const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public')); // یا آدرس پوشه فایل‌های فرانت‌اند شما

// اتصال به دیتابیس MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
}

// اسکیما و مدل پیام‌ها
const messageSchema = new mongoose.Schema({
  text: String,
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// مدیریت ارتباطات Socket.io
io.on('connection', async (socket) => {
  console.log('⚡ کاربر جدید متصل شد');

  // ۱. بارگذاری پیام‌های قدیمی برای کاربر تازه وارد
  try {
    const history = await Message.find().sort({ createdAt: 1 }).limit(50);
    socket.emit('load history', history);
  } catch (err) {
    console.error('خطا در دریافت تاریخچه:', err.message);
  }

  // ۲. دریافت و ارسال پیام جدید
  socket.on('chat message', (msg) => {
    if (!msg) return;

    // ارسال فوری پیام به همه کاربران (بدون معطل شدن برای دیتابیس)
    io.emit('chat message', msg);

    // ذخیره در دیتابیس در پس‌زمینه
    if (mongoose.connection.readyState === 1) {
      Message.create({ text: msg }).catch(err => {
        console.error('خطا در ذخیره پیام در دیتابیس:', err.message);
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('کاربر قطع شد');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
                               
