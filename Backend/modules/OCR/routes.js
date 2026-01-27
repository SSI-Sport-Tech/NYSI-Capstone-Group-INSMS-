import express from "express";
import { runOCR } from "./controller.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("file"), runOCR);

export default router;
