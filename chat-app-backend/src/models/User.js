import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, required: true, trim: true, maxlength: 50 },
    password: { type: String, required: true, select: false },
    profilePic: { type: String, default: "" },
    status: { type: String, default: "", trim: true, maxlength: 140 },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastSeenAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret.password;
        return ret;
      },
    },
  },
);

userSchema.index({ fullName: 1 });

userSchema.methods.hasBlocked = function hasBlocked(userId) {
  return this.blockedUsers.some((id) => id.equals(userId));
};

/** What other people may see about a user. */
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    _id: this._id,
    fullName: this.fullName,
    profilePic: this.profilePic,
    status: this.status,
    lastSeenAt: this.lastSeenAt ?? null,
  };
};

export const PUBLIC_USER_FIELDS = "fullName profilePic status lastSeenAt";

export const User = mongoose.models.User ?? mongoose.model("User", userSchema);
