import mongoose from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  passwordHash: string;
  refreshTokenHash?: string; // store only hash
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    refreshTokenHash: { type: String },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model<IUser>("User", userSchema);
