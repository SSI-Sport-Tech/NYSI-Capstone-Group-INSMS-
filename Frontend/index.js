document.getElementById("checkBtn").addEventListener("click", async () => {
    const response = await fetch("/api/SSS/test");
    const data = await response.json();
    document.getElementById("result").textContent = data.message;
});
