const select = document.getElementById("imageSelect");
const preview = document.getElementById("imagePreview");
const runBtn = document.getElementById("runOCR");
const ocrText = document.getElementById("ocrText");

select.addEventListener("change", () => {
    const filename = select.value;
    if (filename) {
        preview.src = `/ocr_images/${filename}`;
        preview.style.display = "block";
    } else {
        preview.src = "";
        preview.style.display = "none";
    }
});

runBtn.addEventListener("click", async () => {
    const filename = select.value;
    if (!filename) {
        alert("Please select an image first!");
        return;
    }

    try {
        // Fetch image as a File from server
        const response = await fetch(`/ocr_images/${filename}`);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append("file", blob, filename);

        // Send to Express /api/ocr endpoint
        const ocrResponse = await fetch("/api/ocr", {
            method: "POST",
            body: formData,
        });

        const data = await ocrResponse.json();
        ocrText.textContent = data.text.join("\n");
    } catch (err) {
        console.error(err);
        ocrText.textContent = "Error running OCR.";
    }
});
