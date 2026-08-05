const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// ۱. اتصال به دیتابیس MongoDB Atlas
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('❌ خطا: MONGODB_URI در تنظیمات Render تعریف نشده است!');
} else {
  mongoose.connect(mongoURI)
    .then(() => console.log('✅ اتصال به دیتابیس MongoDB با موفقیت برقرار شد'))
    .catch((err) => console.error('❌ خطا در اتصال به دیتابیس MongoDB:', err));
}

// ۲. ساختار و مدل ذخیره‌سازی پیام‌ها
const messageSchema = new mongoose.Schema({
  username: { type: String, default: 'کاربر ناشناس' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// ۳. مسیردهی فایل‌های فرانت‌اند (پوشه public)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ۴. مدیریت ارتباطات Socket.io
io.on('connection', async (socket) => {
  console.log('⚡ کاربر جدید متصل شد:', socket.id);

  // ارسال تاریخچه پیام‌های ذخیره‌شده به کاربر به محض ورود
  try {
    const history = await Message.find().sort({ createdAt: 1 }).limit(100);
    socket.emit('load history', history);
  } catch (err) {
    console.error('خطا در دریافت تاریخچه پیام‌ها:', err);
  }

  // اطلاع‌رسانی ورود کاربر جدید
  socket.on('user joined', (username) => {
    socket.broadcast.emit('user joined', username);
  });

  // دریافت، ذخیره در MongoDB و پخش پیام جدید برای همه
  socket.on('chat message', async (data) => {
    try {
      let messageText = '';
      let messageSender = 'کاربر ناشناس';

      if (typeof data === 'object' && data !== null) {
        messageText = data.text || '';
        messageSender = data.username || data.sender || 'کاربر ناشناس';
      } else {
        messageText = String(data);
      }

      if (!messageText.trim()) return;

      const newMessage = new Message({
        username: messageSender,
        text: messageText
      });

      const savedMessage = await newMessage.save();
      io.emit('chat message', savedMessage);
    } catch (err) {
      console.error('خطا در ذخیره‌سازی پیام:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ کاربر قطع شد:', socket.id);
  });
});

// ۵. تنظیم پورت و آدرس IP برای حل مشکل Render
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 سرور با موفقیت روی پورت ${PORT} اجرا شد`);
});

