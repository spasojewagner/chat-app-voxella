import express from "express";
import { protectRoute } from "../midleware/auth.js";
import {
  register,
  login,
  logout,
  updateProfile,
  checkAuth,
  blockUser,
  unblockUser,
  getBlockStatus
} from "../controllers/UserController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, checkAuth);
router.put("/block", protectRoute, blockUser);
router.put("/unblock", protectRoute, unblockUser);
router.get("/:id/block-status", protectRoute, getBlockStatus);

export default router;
