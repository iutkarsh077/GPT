import mongoose, { Schema } from "mongoose";


const UserSchema = new Schema({
    googleId: {
        required: true,
        unique: true,
        type: String
    },
    email: {
        type: String
    },
    displayName: {
        type: String
    },
    avatar: {
        type: String
    },
})

const User = mongoose.model("User", UserSchema);

export default User;
