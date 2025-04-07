import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";


import connectDB from "./config/dataBase.js";
import authRoutes from "./routes/userRoute.js";
import messageRoutes from "./routes/messageRoute.js";
import { app, server } from "./config/socket.js";

dotenv.config();
const PORT = process.env.PORT ;
const __dirname = path.resolve();

// Middlewares
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Serve frontend (ako si deployovao)
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../chat-app-frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../chat-app-frontend", "dist", "index.html"));
  });
}

// Pokretanje servera
server.listen(PORT, async () => {
  await connectDB();
  console.log(`✅ Server radi na portu ${PORT}`);
});
