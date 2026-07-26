import mongoose, { Schema } from "mongoose";

const GithubRepoSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  owner: {
    type: String,
    required: true,
  },
  private: {
    type: Boolean,
    required: true,
  },
  defaultBranch: {
    type: String,
    required: true,
  },
  enableCodeReview: {
    type: Boolean,
    default: false,
    required: false,
  },
  webhookId: {
    type: String,
    required: false,
    default: null,
  },
}, {
  timestamps: true,
})

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
  githubRepos: {
    type: [GithubRepoSchema],
    default: [],
    required: false,
  }
});

UserSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.githubAccessToken;
    return ret;
  },
});

const User = mongoose.model("User", UserSchema);

export default User;
