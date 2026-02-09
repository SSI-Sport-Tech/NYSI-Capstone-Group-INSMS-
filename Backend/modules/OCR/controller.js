import fs from "fs";
import FormData from "form-data";
import axios from "axios";

export async function runOCR(req, res) {
    try {
        const form = new FormData();
        form.append("file", fs.createReadStream(req.file.path), req.file.originalname);

        const ocrResponse = await axios.post("http://127.0.0.1:8001/ocr", form, {
            headers: form.getHeaders(),
            timeout: 120000, // 2 minutes timeout for OCR processing
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });

        fs.unlinkSync(req.file.path); // cleanup
        res.json(ocrResponse.data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "OCR failed" });
    }
}
