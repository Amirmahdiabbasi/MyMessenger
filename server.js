const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// ۱. سرو فایل اصلی index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ۲. اتصال به MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  })
    .then(() => console.log('✅ اتصال به MongoDB با موفقیت برقرار شد'))
    .catch(err => console.error('❌ خطای اتصال به دیتابیس:', err.message));
} else {
  console.error('❌ متغیر MONGODB_URI در Render تنظیم نشده است!');
}

// ۳. ساختار پیام در دیتابیس
const messageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// ۴. مدیریت سوکت‌ها (Socket.io)
io.on('connection', async (socket) => {
  console.log('⚡ کاربر جدید متصل شد:', socket.id);

  // ارسال تاریخچه ۵۰ پیام اخیر به کاربر جدید
  try {
    if (mongoose.connection.readyState === 1) {
      const history = await Message.find().sort({ createdAt: 1 }).limit(50);
      socket.emit('load history', history);
    }
  } catch (err) {
    console.error('خطا در بارگذاری تاریخچه:', err.message);
  }

  // دریافت پیام از کاربر، ارسال همزمان به همه و ذخیره در دیتابیس
  socket.on('chat message', async (data) => {
    if (!data || !data.text || !data.text.trim()) return;

    const messageData = {
      username: data.username || 'کاربر ناشناس',
      text: data.text.trim(),
      createdAt: new Date()
    };

    // ۱. پخش آنی پیام برای تمام کاربران متصل
    io.emit('chat message', messageData);

    // ۲. ذخیره پیام در دیتابیس
    if (mongoose.connection.readyState === 1) {
      try {
        await Message.create(messageData);
      } catch (err) {
        console.error('خطا در ذخیره پیام:', err.message);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ کاربر قطع شد:', socket.id);
  });
});

// ۵. تنظیم پورت برای اجرای بدون مشکل روی Render
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 سرور با موفقیت روی پورت ${PORT} اجرا شد`);
});
      
