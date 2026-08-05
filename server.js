const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);

// افزایش حجم مجاز برای دریافت عکس و ویس (تا ۱۰ مگابایت)
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 1e7
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// اتصال به دیتابیس MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log('✅ اتصال به MongoDB با موفقیت برقرار شد'))
    .catch(err => console.error('❌ خطای اتصال به دیتابیس:', err.message));
}

// اسکیما و مدل جامع پیام‌ها (شامل عکس، ویس، متن و ریپلی)
const messageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'voice'], default: 'text' },
  text: { type: String, default: '' },
  mediaData: { type: String, default: '' }, // ذخیره بیس۶۴ عکس یا صدا
  replyTo: {
    username: String,
    text: String,
    type: { type: String, default: 'text' }
  },
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

io.on('connection', async (socket) => {
  // ۱. ارسال ۵۰ پیام اخیر هنگام ورود
  try {
    if (mongoose.connection.readyState === 1) {
      const history = await Message.find().sort({ createdAt: 1 }).limit(50);
      socket.emit('load history', history);
    }
  } catch (err) {
    console.error('خطا در بارگذاری تاریخچه:', err.message);
  }

  // ۲. دریافت و پخش پیام (متن، عکس یا ویس)
  socket.on('chat message', async (data) => {
    if (!data) return;

    const messageData = {
      username: data.username || 'کاربر ناشناس',
      type: data.type || 'text',
      text: data.text || '',
      mediaData: data.mediaData || '',
      replyTo: data.replyTo || null,
      createdAt: new Date()
    };

    // ارسال فوری به تمام کاربران
    io.emit('chat message', messageData);

    // ذخیره در دیتابیس
    if (mongoose.connection.readyState === 1) {
      try {
        await Message.create(messageData);
      } catch (err) {
        console.error('خطا در ذخیره پیام:', err.message);
      }
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 سرور روی پورت ${PORT} اجرا شد`);
});
  
