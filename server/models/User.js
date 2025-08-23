  import mongoose from 'mongoose';

  const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    password: String,
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
  });

  const User = mongoose.model('User', UserSchema);
  export default User;
