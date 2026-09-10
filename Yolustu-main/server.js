const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 2e6,
});

// 1. MONGODB BAZASINA QOŞULMA
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/my_app_db';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB verilənlər bazasına uğurla qoşuldu!'))
  .catch((err) => console.error('❌ Baza qoşulma xətası:', err));

// 2. İSTİFADƏÇİ SXEMİ VƏ MODELİ (Baza üçün)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  age: { type: Number, default: 18 },
  avatar: { type: String, default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80' },
  isOnline: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// 3. MESAJ SXEMİ VƏ MODELİ (Mesajların bazada qalması üçün)
const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  recipientId: { type: String, required: true },
  text: String,
  audioUrl: String,
  fileUrl: String,
  fileType: String,
  location: Object,
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// 4. REST API ROUTES (Qeydiyyat, Axtarış, Siyahı)

// Yeni İstifadəçi Qeydiyyatı
app.post('/api/users/register', async (req, res) => {
  try {
    const { name, username, age } = req.body;
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Bu istifadəçi adı artıq götürülüb.' });
    }

    const newUser = new User({ name, username, age });
    await newUser.save();

    res.json({ success: true, user: newUser });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Qeydiyyatdan Keçən Bütun İstifadəçiləri Gətir
app.get('/api/users/all', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Axtarış Sistemi (Ad və ya Username üzrə dayıoğlunu və s. tapmaq üçün)
app.get('/api/users/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json({ success: true, users: [] });

    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } }
      ]
    });

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. REAL-TIME SOCKET.IO — Alliance Hub (mərkəzi beyin otağı)
const allianceHubUsers = new Map(); // socketId -> { userId, userName }
const onlineUsers = new Map(); // socketId -> userId

io.on('connection', (socket) => {
  console.log('🔌 Yeni istifadəçi qoşuldu:', socket.id);

  socket.on('join_alliance_hub', ({ userId, userName }) => {
    if (!userId) return;
    socket.join('alliance_hub');
    allianceHubUsers.set(socket.id, { userId, userName });
    io.to('alliance_hub').emit('hub_online_count', { count: allianceHubUsers.size });
    io.to('alliance_hub').emit('hub_stats_updated', { type: 'player_joined', userId, userName });
  });

  socket.on('leave_alliance_hub', ({ userId }) => {
    allianceHubUsers.delete(socket.id);
    io.to('alliance_hub').emit('hub_online_count', { count: allianceHubUsers.size });
    io.to('alliance_hub').emit('hub_stats_updated', { type: 'player_left', userId });
  });

  socket.on('alliance_hub_event', (data) => {
    io.to('alliance_hub').emit('hub_stats_updated', data);
  });

  // İstifadəçi onlayn olduqda — profil ID (1, 2, 3...) ilə otaq
  socket.on('user_connected', async (userId) => {
    const uid = String(userId || '').trim();
    if (!uid) return;

    const prevUid = onlineUsers.get(socket.id);
    if (prevUid && prevUid !== uid) {
      socket.leave(String(prevUid));
    }

    onlineUsers.set(socket.id, uid);
    socket.join(uid);

    const roomSize = io.sockets.adapter.rooms.get(uid)?.size || 0;
    console.log(`📞 Zəng otağı: ${uid} (${roomSize} socket)`);

    try {
      await User.findByIdAndUpdate(userId, { isOnline: true });
    } catch {
      /* profil ID Mongo ObjectId deyil — normal */
    }
    io.emit('user_status_change', { userId: uid, isOnline: true });
  });

  // Mesaj Göndərilməsi — real-time relay (+ köhnə MongoDB ehtiyat)
  socket.on('send_message', async (data) => {
    const recipientId = data.recipientId || data.recipient?.id;

    // Yeni format: tam mesaj obyekti (media, səs, konum daxil)
    if (data.message && recipientId) {
      io.to(String(recipientId)).emit('chat:message', data.message);
      return;
    }

    const { sender, recipient, text, audioUrl, fileUrl, fileType, location } = data;

    // 13-18 Yaş məhdudiyyət kontrolu
    if (recipient.age >= 13 && recipient.age <= 18) {
      if (!sender.isFollowingRecipient) {
        return socket.emit('error_message', { 
          message: "Bu istifadəçi 13-18 yaş aralığındadır. Yalnız izlədiyi şəxslər mesaj yaza bilər." 
        });
      }
    }

    // Mesajı Bazada Yadda Saxla
    try {
      const newMsg = new Message({
        senderId: sender.id,
        recipientId: recipient.id,
        text,
        audioUrl,
        fileUrl,
        fileType,
        location
      });
      await newMsg.save();

      // Qarşı tərəfə mesajı çatdır
      io.to(recipient.id.toString()).emit('receive_message', newMsg);
    } catch (err) {
      console.error('Mesaj saxlanma xətası:', err);
    }
  });

  // Real-time mesaj çatdırılması (Firebase artıq client tərəfindən yazılıb)
  socket.on('chat:message', (data) => {
    const recipientId = data.recipientId || data.to;
    const message = data.message;
    if (!recipientId || !message) {
      socket.emit('error_message', { message: 'Mesaj alıcısı tapılmadı.' });
      return;
    }
    io.to(String(recipientId)).emit('chat:message', message);
  });

  socket.on('chat:delete', (data) => {
    const recipientId = data.recipientId || data.to;
    if (!recipientId || !data.chatId || !data.messageId) return;
    io.to(String(recipientId)).emit('chat:delete', {
      chatId: data.chatId,
      messageId: data.messageId,
    });
  });

  socket.on('chat:clear', (data) => {
    const recipientId = data.recipientId || data.to;
    if (!recipientId || !data.chatId) return;
    io.to(String(recipientId)).emit('chat:clear', { chatId: data.chatId });
  });

  socket.on('chat:edit', (data) => {
    const recipientId = data.recipientId || data.to;
    if (!recipientId || !data.chatId || !data.messageId) return;
    io.to(String(recipientId)).emit('chat:edit', {
      chatId: data.chatId,
      messageId: data.messageId,
      text: data.text,
      editedAt: data.editedAt,
    });
  });

  // Zəng Sistemi Signalizasiyası (Səsli / Görüntülü Zəng)
  const emitToUser = (userId, event, payload) => {
    if (!userId) return;
    io.to(String(userId)).emit(event, payload);
  };

  // WhatsApp tipli zəng: invite → ring → accept → WebRTC signal
  const handleCallInvite = (data) => {
    const target = data.userToCall || data.to;
    if (!target || !data.from) {
      socket.emit('call:error', { message: 'Zəng alıcısı tapılmadı.' });
      return;
    }

    const payload = {
      callId: data.callId,
      from: data.from,
      fromName: data.fromName || data.from,
      fromAvatar: data.fromAvatar || '',
      chatId: data.chatId || '',
      callType: data.callType || (data.isVideo ? 'video' : 'voice'),
      isVideo: Boolean(data.isVideo || data.callType === 'video'),
    };

    const room = io.sockets.adapter.rooms.get(String(target));
    if (room && room.size > 0) {
      console.log(`📞 ZƏNG ${data.from} → ${target} callId=${data.callId}`);
      emitToUser(target, 'incoming_call', payload);
    } else {
      socket.emit('call:offline', {
        callId: data.callId,
        to: target,
        message: 'İstifadəçi hazırda onlayn deyil.',
      });
    }
  };

  socket.on('call:invite', handleCallInvite);
  socket.on('call:user', handleCallInvite);
  socket.on('call_user', handleCallInvite);

  socket.on('call:accept', (data) => {
    const target = data.to || data.userToCall;
    if (!target) return;
    console.log(`📞 QƏBUL ${data.from} → ${target} callId=${data.callId}`);
    emitToUser(target, 'call:accepted', {
      callId: data.callId,
      from: data.from,
    });
  });

  socket.on('call:signal', (data) => {
    const target = data.to;
    if (!target || !data.signal) return;
    emitToUser(target, 'call:signal', {
      callId: data.callId,
      from: data.from,
      to: target,
      signal: data.signal,
    });
  });

  socket.on('call:reject', (data) => {
    emitToUser(data.to, 'call:rejected', { callId: data.callId, from: data.from });
  });

  socket.on('call:end', (data) => {
    emitToUser(data.to, 'call:ended', { callId: data.callId, from: data.from });
  });

  socket.on('call:busy', (data) => {
    emitToUser(data.to, 'call:busy', { callId: data.callId, from: data.from });
  });

  // Şəbəkədən Ayrıldıqda (Disconnect)
  socket.on('disconnect', async () => {
    allianceHubUsers.delete(socket.id);
    io.to('alliance_hub').emit('hub_online_count', { count: allianceHubUsers.size });

    const userId = onlineUsers.get(socket.id);
    if (userId) {
      socket.leave(String(userId));
      io.emit('user_status_change', { userId, isOnline: false });
      onlineUsers.delete(socket.id);
    }
    console.log('❌ İstifadəçi ayrıldı:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Birləşdirilmiş Vahid Server ${PORT} portunda aktivdir...`);
});