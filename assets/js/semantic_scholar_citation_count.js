const citationCountElements = document.querySelectorAll('[data-semantic-scholar-id]');
citationCountElements.forEach(element => {
    const id = element.getAttribute('data-semantic-scholar-id');
    if (id) {
        element.setAttribute('data-semantic-scholar-id', id.toLowerCase());
    }
});

const semanticScholarIds = new Set(Array.from(citationCountElements).map(element => element.getAttribute('data-semantic-scholar-id')).filter(id => id));

function safeGetCache(key) {
    try {
        var raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        localStorage.removeItem(key);
    }
    return null;
}

function safeSetCache(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        // Storage full — silently skip caching
    }
}

let uncachedSemanticScholarIds = [];
semanticScholarIds.forEach(id => {
    const cacheKey = `semanticScholarCitationCount:${id}`;
    const cachedData = safeGetCache(cacheKey);
    if (cachedData) {
        // If cached data is older than 1 hour, consider it uncached
        if (Date.now() - cachedData.timestamp > 1 * 60 * 60 * 1000) {
            uncachedSemanticScholarIds.push(id);
        }
    } else {
        uncachedSemanticScholarIds.push(id);
    }
});

let showSemanticScholarCitationCount = () => {
    // Update the DOM with the cached citation counts
    semanticScholarIds.forEach(id => {
        const cacheKey = `semanticScholarCitationCount:${id}`;
        const cachedData = safeGetCache(cacheKey);
        if (cachedData && cachedData.citationCount != null) {
            const count = parseInt(cachedData.citationCount);
            if (isNaN(count)) return;
            const elements = document.querySelectorAll(`[data-semantic-scholar-id="${id}"]`);
            elements.forEach(element => {
                element.innerHTML = `<a class="badge badge-pill badge-publication badge-info" href="https://www.semanticscholar.org/paper/${id}" target="_blank"><i class="ai ai-semantic-scholar"></i> ${count.toLocaleString()} citations</a>`;
            });
        }
    });
};

if (uncachedSemanticScholarIds.length > 0) {
    fetch('https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ids: Array.from(semanticScholarIds)
        })
    }).then(response => {
        if (!response.ok) {
            throw new Error('Semantic Scholar API responded with ' + response.status);
        }
        return response.json();
    }).then(data => {
        if (!Array.isArray(data)) return;
        data.forEach(paper => {
            if (!paper || !paper.paperId) return;
            const cacheKey = `semanticScholarCitationCount:${paper.paperId}`;
            const cacheData = {
                citationCount: paper.citationCount,
                timestamp: Date.now()
            };
            safeSetCache(cacheKey, cacheData);
        });
    }).catch(error => {
        console.error('Error fetching Semantic Scholar data:', error);
    }).finally(showSemanticScholarCitationCount);
} else {
    showSemanticScholarCitationCount();
}
