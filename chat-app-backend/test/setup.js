import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, inject } from "vitest";
import { Conversation } from "../src/models/Conversation.js";
import { Message } from "../src/models/Message.js";
import { User } from "../src/models/User.js";

beforeAll(async () => {
  const uri = new URL(inject("mongoUri"));
  if (uri.pathname === "/" || uri.pathname === "") uri.pathname = "/voxella_test";
  await mongoose.connect(uri.toString());
  await Promise.all([User.init(), Conversation.init(), Message.init()]);
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
});
