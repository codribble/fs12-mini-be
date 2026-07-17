import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes/index";

const app = express();
const PORT = process.env.PORT || 8080;

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://fs12-mini-fe.vercel.app",
  "https://codribble.dev",
];

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(router);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
