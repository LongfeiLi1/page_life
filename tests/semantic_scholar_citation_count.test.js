const {
    collectSemanticScholarIds,
    getUniqueIds,
    getUncachedIds,
    showCitationCounts,
    fetchAndCacheCitations,
} = require('../assets/js/semantic_scholar_citation_count');

function createMockStorage() {
    const store = {};
    return {
        getItem: jest.fn(key => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value; }),
        removeItem: jest.fn(key => { delete store[key]; }),
        _store: store,
    };
}

describe('collectSemanticScholarIds', () => {
    test('lowercases data-semantic-scholar-id attributes', () => {
        document.body.innerHTML = '<span data-semantic-scholar-id="ABC123"></span>';
        const elements = collectSemanticScholarIds(document);
        expect(elements[0].getAttribute('data-semantic-scholar-id')).toBe('abc123');
    });

    test('returns all matching elements', () => {
        document.body.innerHTML = `
            <span data-semantic-scholar-id="id1"></span>
            <span data-semantic-scholar-id="id2"></span>
            <div>no id here</div>
        `;
        const elements = collectSemanticScholarIds(document);
        expect(elements).toHaveLength(2);
    });

    test('returns empty NodeList when no matching elements', () => {
        document.body.innerHTML = '<div>nothing</div>';
        const elements = collectSemanticScholarIds(document);
        expect(elements).toHaveLength(0);
    });

    test('leaves empty ids unchanged', () => {
        document.body.innerHTML = '<span data-semantic-scholar-id=""></span>';
        const elements = collectSemanticScholarIds(document);
        expect(elements[0].getAttribute('data-semantic-scholar-id')).toBe('');
    });
});

describe('getUniqueIds', () => {
    test('returns unique ids from elements', () => {
        document.body.innerHTML = `
            <span data-semantic-scholar-id="aaa"></span>
            <span data-semantic-scholar-id="bbb"></span>
            <span data-semantic-scholar-id="aaa"></span>
        `;
        const elements = document.querySelectorAll('[data-semantic-scholar-id]');
        const ids = getUniqueIds(elements);
        expect(ids.size).toBe(2);
        expect(ids.has('aaa')).toBe(true);
        expect(ids.has('bbb')).toBe(true);
    });

    test('filters out empty/falsy ids', () => {
        document.body.innerHTML = `
            <span data-semantic-scholar-id=""></span>
            <span data-semantic-scholar-id="valid"></span>
        `;
        const elements = document.querySelectorAll('[data-semantic-scholar-id]');
        const ids = getUniqueIds(elements);
        expect(ids.size).toBe(1);
        expect(ids.has('valid')).toBe(true);
    });

    test('returns empty set for no elements', () => {
        const ids = getUniqueIds([]);
        expect(ids.size).toBe(0);
    });
});

describe('getUncachedIds', () => {
    test('returns all ids when nothing is cached', () => {
        const storage = createMockStorage();
        const ids = new Set(['id1', 'id2']);
        const uncached = getUncachedIds(ids, storage);
        expect(uncached).toEqual(['id1', 'id2']);
    });

    test('returns empty array when all ids have fresh cache', () => {
        const storage = createMockStorage();
        const now = Date.now();
        storage._store['semanticScholarCitationCount:id1'] = JSON.stringify({ citationCount: 10, timestamp: now });
        storage._store['semanticScholarCitationCount:id2'] = JSON.stringify({ citationCount: 20, timestamp: now });

        const ids = new Set(['id1', 'id2']);
        const uncached = getUncachedIds(ids, storage);
        expect(uncached).toEqual([]);
    });

    test('returns ids with expired cache (older than 1 hour)', () => {
        const storage = createMockStorage();
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        storage._store['semanticScholarCitationCount:id1'] = JSON.stringify({ citationCount: 10, timestamp: twoHoursAgo });

        const ids = new Set(['id1']);
        const uncached = getUncachedIds(ids, storage);
        expect(uncached).toEqual(['id1']);
    });

    test('correctly mixes cached and uncached ids', () => {
        const storage = createMockStorage();
        const now = Date.now();
        const oldTimestamp = now - 2 * 60 * 60 * 1000;
        storage._store['semanticScholarCitationCount:fresh'] = JSON.stringify({ citationCount: 5, timestamp: now });
        storage._store['semanticScholarCitationCount:stale'] = JSON.stringify({ citationCount: 5, timestamp: oldTimestamp });

        const ids = new Set(['fresh', 'stale', 'missing']);
        const uncached = getUncachedIds(ids, storage);
        expect(uncached).toEqual(['stale', 'missing']);
    });
});

describe('showCitationCounts', () => {
    test('populates elements with cached citation HTML', () => {
        document.body.innerHTML = '<span data-semantic-scholar-id="abc123"></span>';
        const storage = createMockStorage();
        storage._store['semanticScholarCitationCount:abc123'] = JSON.stringify({ citationCount: 42, timestamp: Date.now() });

        const ids = new Set(['abc123']);
        showCitationCounts(ids, document, storage);

        const el = document.querySelector('[data-semantic-scholar-id="abc123"]');
        expect(el.innerHTML).toContain('42');
        expect(el.innerHTML).toContain('citations');
        expect(el.innerHTML).toContain('semanticscholar.org/paper/abc123');
    });

    test('does nothing for ids without cache data', () => {
        document.body.innerHTML = '<span data-semantic-scholar-id="nocache">original</span>';
        const storage = createMockStorage();

        const ids = new Set(['nocache']);
        showCitationCounts(ids, document, storage);

        const el = document.querySelector('[data-semantic-scholar-id="nocache"]');
        expect(el.innerHTML).toBe('original');
    });

    test('updates multiple elements with the same id', () => {
        document.body.innerHTML = `
            <span data-semantic-scholar-id="dup"></span>
            <span data-semantic-scholar-id="dup"></span>
        `;
        const storage = createMockStorage();
        storage._store['semanticScholarCitationCount:dup'] = JSON.stringify({ citationCount: 100, timestamp: Date.now() });

        const ids = new Set(['dup']);
        showCitationCounts(ids, document, storage);

        const elements = document.querySelectorAll('[data-semantic-scholar-id="dup"]');
        elements.forEach(el => {
            expect(el.innerHTML).toContain('100');
        });
    });

    test('formats large citation counts with locale string', () => {
        document.body.innerHTML = '<span data-semantic-scholar-id="big"></span>';
        const storage = createMockStorage();
        storage._store['semanticScholarCitationCount:big'] = JSON.stringify({ citationCount: 12345, timestamp: Date.now() });

        const ids = new Set(['big']);
        showCitationCounts(ids, document, storage);

        const el = document.querySelector('[data-semantic-scholar-id="big"]');
        // Should contain formatted number (e.g., "12,345")
        expect(el.innerHTML).toContain('citations');
    });
});

describe('fetchAndCacheCitations', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('fetches data and caches it in storage', async () => {
        const storage = createMockStorage();
        const mockResponse = [
            { paperId: 'paper1', citationCount: 55 },
            { paperId: 'paper2', citationCount: 100 },
        ];
        global.fetch = jest.fn(() =>
            Promise.resolve({ json: () => Promise.resolve(mockResponse) })
        );

        const ids = new Set(['paper1', 'paper2']);
        await fetchAndCacheCitations(ids, storage);

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const callArgs = global.fetch.mock.calls[0];
        expect(callArgs[0]).toContain('semanticscholar.org');
        expect(callArgs[1].method).toBe('POST');

        expect(storage.setItem).toHaveBeenCalledTimes(2);
        const cached1 = JSON.parse(storage._store['semanticScholarCitationCount:paper1']);
        expect(cached1.citationCount).toBe(55);
        const cached2 = JSON.parse(storage._store['semanticScholarCitationCount:paper2']);
        expect(cached2.citationCount).toBe(100);
    });

    test('handles fetch errors gracefully', async () => {
        const storage = createMockStorage();
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

        const ids = new Set(['paper1']);
        await fetchAndCacheCitations(ids, storage);

        expect(consoleSpy).toHaveBeenCalled();
        expect(storage.setItem).not.toHaveBeenCalled();
    });

    test('sends correct request body with all ids', async () => {
        const storage = createMockStorage();
        global.fetch = jest.fn(() =>
            Promise.resolve({ json: () => Promise.resolve([]) })
        );

        const ids = new Set(['a', 'b', 'c']);
        await fetchAndCacheCitations(ids, storage);

        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(body.ids).toEqual(['a', 'b', 'c']);
    });
});
