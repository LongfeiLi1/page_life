function collectSemanticScholarIds(doc) {
    var d = doc || document;
    var elements = d.querySelectorAll('[data-semantic-scholar-id]');
    elements.forEach(function (element) {
        var id = element.getAttribute('data-semantic-scholar-id');
        if (id) {
            element.setAttribute('data-semantic-scholar-id', id.toLowerCase());
        }
    });
    return elements;
}

function getUniqueIds(elements) {
    return new Set(
        Array.from(elements)
            .map(function (el) { return el.getAttribute('data-semantic-scholar-id'); })
            .filter(function (id) { return id; })
    );
}

function getUncachedIds(ids, storage) {
    var s = storage || localStorage;
    var uncached = [];
    ids.forEach(function (id) {
        var cacheKey = 'semanticScholarCitationCount:' + id;
        var cachedData = s.getItem(cacheKey);
        if (cachedData) {
            var parsed = JSON.parse(cachedData);
            if (Date.now() - parsed.timestamp > 1 * 60 * 60 * 1000) {
                uncached.push(id);
            }
        } else {
            uncached.push(id);
        }
    });
    return uncached;
}

function showCitationCounts(ids, doc, storage) {
    var d = doc || document;
    var s = storage || localStorage;
    ids.forEach(function (id) {
        var cacheKey = 'semanticScholarCitationCount:' + id;
        var cachedData = s.getItem(cacheKey);
        if (cachedData) {
            var parsed = JSON.parse(cachedData);
            var citationCount = parsed.citationCount;
            var elements = d.querySelectorAll('[data-semantic-scholar-id="' + id + '"]');
            elements.forEach(function (element) {
                element.innerHTML = '<a class="badge badge-pill badge-publication badge-info" href="https://www.semanticscholar.org/paper/' + id + '" target="_blank"><i class="ai ai-semantic-scholar"></i> ' + parseInt(citationCount).toLocaleString() + ' citations</a>';
            });
        }
    });
}

function fetchAndCacheCitations(ids, storage) {
    var s = storage || localStorage;
    return fetch('https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(ids) })
    }).then(function (response) {
        return response.json();
    }).then(function (data) {
        data.forEach(function (paper) {
            var cacheKey = 'semanticScholarCitationCount:' + paper.paperId;
            var cacheData = {
                citationCount: paper.citationCount,
                timestamp: Date.now()
            };
            s.setItem(cacheKey, JSON.stringify(cacheData));
        });
    }).catch(function (error) {
        console.error('Error fetching Semantic Scholar data:', error);
    });
}

function initSemanticScholar(doc, storage) {
    var d = doc || document;
    var s = storage || localStorage;
    var elements = collectSemanticScholarIds(d);
    var ids = getUniqueIds(elements);
    var uncached = getUncachedIds(ids, s);

    var doShow = function () { showCitationCounts(ids, d, s); };

    if (uncached.length > 0) {
        fetchAndCacheCitations(ids, s).finally(doShow);
    } else {
        doShow();
    }
}

initSemanticScholar();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        collectSemanticScholarIds: collectSemanticScholarIds,
        getUniqueIds: getUniqueIds,
        getUncachedIds: getUncachedIds,
        showCitationCounts: showCitationCounts,
        fetchAndCacheCitations: fetchAndCacheCitations,
        initSemanticScholar: initSemanticScholar
    };
}
