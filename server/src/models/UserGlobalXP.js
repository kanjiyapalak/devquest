import mongoose from 'mongoose';

const UserGlobalXPSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  totalXP: { type: Number, default: 0 }
});

const UserGlobalXP = mongoose.model('UserGlobalXP', UserGlobalXPSchema);
export default UserGlobalXP;
