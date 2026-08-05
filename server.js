const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ۱. اتصال به دیتابیس MongoDB Atlas
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('❌ MONGODB_URI در Render تنظیم نشده است!');
} else {
  mongoose.connect(mongoURI)
    .then(() => console.log('✅ اتصال به MongoDB برقرار شد'))
    .catch((err) => console.error('❌ خطا در اتصال به دیتابیس:', err));
}

// ۲. ساختار (Schema) ذخیره پیام‌ها
const messageSchema = new mongoose.Schema({
  username: { type: String, default: 'کاربر ناشناس' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// ۳. مسیر فایل‌های فرانت‌اند
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ۴. مدیریت Socket.io
io.on('connection', async (socket) => {

  // بارگذاری تاریخچه پیام‌ها موقع ورود کاربر
  try {
    const history = await Message.find().sort({ createdAt: 1 }).limit(100);
    socket.emit('load history', history);
  } catch (err) {
    console.error('خطا در دریافت تاریخچه پیام‌ها:', err);
  }

  socket.on('user joined', (username) => {
    socket.broadcast.emit('user joined', username);
  });

  // دریافت، ذخیره در دیتابیس و ارسال پیام به همه
  socket.on('chat message', async (data) => {
    try {
      const messageText = typeof data === 'object' ? data.text : data;
      const messageSender = typeof data === 'object' ? (data.username || data.sender) : 'کاربر ناشناس';

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
});

// ۵. تنظیم پورت پویا برای Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 سرور روی پورت ${PORT} اجرا شد`);
});
