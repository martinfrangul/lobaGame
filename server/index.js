import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerHandlers } from "./socketHandlers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const allowedOrigin = process.env.CLIENT_ORIGIN || "*";
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

const clientDist = path.join(__dirname, "..", "dist");
app.use(express.static(clientDist));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: allowedOrigin, methods: ["GET", "POST"] },
});

registerHandlers(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Loba server listening on port ${PORT}`);
});