// Frontend/SSS_Search.js

const input = document.getElementById("searchInput");
const scopeSelect = document.getElementById("scopeSelect");
const searchBtn = document.getElementById("searchBtn");
const resultsList = document.getElementById("searchResults");
const meta = document.getElementById("searchMeta");

// Main search function
async function runSearch() {
    const query = input.value.trim();
    const scope = scopeSelect.value;

    if (!query) {
        resultsList.innerHTML = "<li>Please enter a search term.</li>";
        meta.textContent = "";
        return;
    }

    resultsList.innerHTML = "<li>Searching...</li>";
    meta.textContent = "";

    try {
        const params = new URLSearchParams({ q: query, scope });
        const res = await fetch(`/api/SSS/search?${params.toString()}`);
        const data = await res.json();

        if (!data.success) {
            resultsList.innerHTML = `<li>Error: ${data.error || "Unknown error"}</li>`;
            return;
        }

        if (data.results.length === 0) {
            resultsList.innerHTML = `<li>No results found for "${query}".</li>`;
            return;
        }

        // Display total
        meta.textContent = `Found ${data.total} result(s):`;

        // Display list of supplements
        resultsList.innerHTML = "";
        data.results.forEach(item => {
            const li = document.createElement("li");
            li.innerHTML = `
                <strong>${item.name}</strong> — ${item.brand || "Unknown brand"}<br>
                <em>Ingredients:</em> ${item.ingredient}<br>
                <a href="${item.website}" target="_blank">View Website</a>
            `;
            resultsList.appendChild(li);
        });
    } catch (err) {
        console.error(err);
        resultsList.innerHTML = `<li>Search failed: ${err.message}</li>`;
    }
}

// Bind search on button click or Enter key
searchBtn.addEventListener("click", runSearch);
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch();
});
