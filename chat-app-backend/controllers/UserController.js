import { generateToken } from "../config/utils.js";
import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import cloudinary from "../config/cloudinary.js";
import { io } from "../config/socket.js";

export const register = async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Unesite sve podatke" });
    }

    // Hashovanje lozinke
    if (password.length < 6) {
      return res.status(400).json({ message: "Šifra mora biti bar 6 karaktera" });
    }
    const user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName: fullName,
      email: email,
      password: hashedPassword,
    });

    if (newUser) {
      generateToken(newUser._id, res);
      await newUser.save();
      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      blockedUsers: user.blockedUsers,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic, status, fullName, email } = req.body;
    const userId = req.user._id;

    // Ako nijedan podatak nije prosleđen, vrati grešku
    if (!profilePic && !status && !fullName && !email) {
      return res.status(400).json({ message: "No data provided for update" });
    }

    let updateObj = {};

    // Ako se šalje slika, uploaduj je i postavi secure_url
    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic);
      updateObj.profilePic = uploadResponse.secure_url;
    }
    if (status) {
      updateObj.status = status;
    }
    if (fullName) {
      updateObj.fullName = fullName;
    }
    if (email) {
      updateObj.email = email;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateObj, { new: true });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { userIdToBlock } = req.body;
    const currentUserId = req.user._id;

    if (currentUserId.toString() === userIdToBlock) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      currentUserId,
      { $addToSet: { blockedUsers: userIdToBlock } },
      { new: true }
    );

    // Emitujemo događaj da je korisnik blokirao nekoga
    io.emit("userBlocked", { blocker: currentUserId, blocked: userIdToBlock });

    res.status(200).json({ message: "User blocked successfully", user: updatedUser });
  } catch (error) {
    console.log("Error in blockUser:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { userIdToUnblock } = req.body;
    const currentUserId = req.user._id;

    const updatedUser = await User.findByIdAndUpdate(
      currentUserId,
      { $pull: { blockedUsers: userIdToUnblock } },
      { new: true }
    );

    // Emitujemo događaj da je korisnik odblokirao nekoga
    io.emit("userUnblocked", { blocker: currentUserId, unblocked: userIdToUnblock });

    res.status(200).json({ message: "User unblocked successfully", user: updatedUser });
  } catch (error) {
    console.log("Error in unblockUser:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

//test
export const getBlockStatus = async (req, res) => {
  try {
    const targetUserId = req.params.id; // ID korisnika čiji blok status proveravamo (npr. Marko)
    const currentUserId = req.user._id; // Trenutno ulogovani korisnik (npr. Luka)

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }
    // Proveravamo da li targetUser (npr. Marko) ima u svom blockedUsers polju ID currentUser-a (Luka)
    const isBlocked = targetUser.blockedUsers.some(
      (blockedId) => blockedId.toString() === currentUserId.toString()
    );
    return res.status(200).json({ isBlocked });
  } catch (error) {
    console.error("Error in getBlockStatus:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
