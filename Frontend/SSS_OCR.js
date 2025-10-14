const select = document.getElementById("imageSelect");
const preview = document.getElementById("imagePreview");

select.addEventListener("change", () => {
    const filename = select.value;
    if (filename) {
        preview.src = `/ocr_images/${filename}`; // path relative to server root
        preview.style.display = "block";
    } else {
        preview.src = "";
        preview.style.display = "none";
    }
});
