import express from "express";
import cors from "cors";
import router from "./routes/index";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use(router);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
