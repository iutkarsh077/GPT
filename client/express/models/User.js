import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  githubId: {
    required: true,
    unique: true,
    type: String,
  },
  username: {
    type: String,
  },
  email: {
    type: String,
  },
  displayName: {
    type: String,
  },
  avatar: {
    type: String,
  },
  profileUrl: {
    type: String,
  },
  githubAccessToken: {
    type: String,
    select: false,
  },
});

UserSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.githubAccessToken;
    return ret;
  },
});

const User = mongoose.model("User", UserSchema);

export default User;
