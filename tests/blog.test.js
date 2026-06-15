const { buildToc } = require('../assets/js/blog');

function setupBlogDOM(headings) {
    let headingsHtml = '';
    headings.forEach(h => {
        const id = h.id ? ` id="${h.id}"` : '';
        headingsHtml += `<${h.tag}${id}>${h.text}</${h.tag}>`;
    });

    document.body.innerHTML = `
        <div id="blog-toc">
            <ul class="blog-toc-list"></ul>
        </div>
        <div class="blog-content">
            ${headingsHtml}
        </div>
    `;
}

describe('buildToc', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('returns null when no .blog-toc-list element exists', () => {
        document.body.innerHTML = '<div>no toc</div>';
        const result = buildToc({ document, window });
        expect(result).toBeNull();
    });

    test('hides #blog-toc when there are no headings', () => {
        document.body.innerHTML = `
            <div id="blog-toc" style="display:block">
                <ul class="blog-toc-list"></ul>
            </div>
            <div class="blog-content"></div>
        `;
        const result = buildToc({ document, window });
        expect(document.getElementById('blog-toc').style.display).toBe('none');
        expect(result.tocLinks).toEqual([]);
    });

    test('creates TOC links for each heading', () => {
        setupBlogDOM([
            { tag: 'h1', text: 'Introduction' },
            { tag: 'h2', text: 'Methods' },
            { tag: 'h3', text: 'Sub-method' },
        ]);
        const result = buildToc({ document, window });

        expect(result.tocLinks).toHaveLength(3);
        const texts = Array.from(result.tocLinks).map(a => a.textContent);
        expect(texts).toEqual(['Introduction', 'Methods', 'Sub-method']);
    });

    test('assigns heading IDs when missing', () => {
        setupBlogDOM([
            { tag: 'h1', text: 'No ID' },
            { tag: 'h2', text: 'Also No ID' },
        ]);
        buildToc({ document, window });

        const headings = document.querySelectorAll('.blog-content h1, .blog-content h2');
        expect(headings[0].id).toBe('heading-0');
        expect(headings[1].id).toBe('heading-1');
    });

    test('preserves existing heading IDs', () => {
        setupBlogDOM([
            { tag: 'h1', id: 'my-custom-id', text: 'Custom' },
        ]);
        buildToc({ document, window });

        const heading = document.querySelector('.blog-content h1');
        expect(heading.id).toBe('my-custom-id');
    });

    test('sets correct CSS class based on heading level', () => {
        setupBlogDOM([
            { tag: 'h1', text: 'H1' },
            { tag: 'h2', text: 'H2' },
            { tag: 'h3', text: 'H3' },
        ]);
        const result = buildToc({ document, window });
        const links = Array.from(result.tocLinks);

        expect(links[0].classList.contains('toc-h1')).toBe(true);
        expect(links[1].classList.contains('toc-h2')).toBe(true);
        expect(links[2].classList.contains('toc-h3')).toBe(true);
    });

    test('TOC links have correct href pointing to heading ids', () => {
        setupBlogDOM([
            { tag: 'h1', id: 'intro', text: 'Intro' },
            { tag: 'h2', text: 'Part' },
        ]);
        const result = buildToc({ document, window });
        const links = Array.from(result.tocLinks);

        expect(links[0].getAttribute('href')).toBe('#intro');
        expect(links[1].getAttribute('href')).toBe('#heading-1');
    });

    test('sets scroll-margin-top on headings', () => {
        setupBlogDOM([
            { tag: 'h1', text: 'Title' },
        ]);
        buildToc({ document, window });

        const heading = document.querySelector('.blog-content h1');
        expect(heading.style.scrollMarginTop).toBe('90px');
    });

    test('wraps each link in a <li> element', () => {
        setupBlogDOM([
            { tag: 'h1', text: 'A' },
            { tag: 'h2', text: 'B' },
        ]);
        buildToc({ document, window });

        const listItems = document.querySelectorAll('.blog-toc-list li');
        expect(listItems).toHaveLength(2);
        listItems.forEach(li => {
            expect(li.querySelector('a')).not.toBeNull();
        });
    });
});

describe('buildToc - updateActive', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('highlights the last heading above the scroll position', () => {
        setupBlogDOM([
            { tag: 'h1', id: 'first', text: 'First' },
            { tag: 'h2', id: 'second', text: 'Second' },
        ]);

        // Mock offsetTop values
        const headings = document.querySelectorAll('.blog-content h1, .blog-content h2');
        Object.defineProperty(headings[0], 'offsetTop', { value: 0, configurable: true });
        Object.defineProperty(headings[1], 'offsetTop', { value: 500, configurable: true });

        const mockWindow = {
            scrollY: 0,
            addEventListener: jest.fn(),
            scrollTo: jest.fn(),
        };

        const result = buildToc({ document, window: mockWindow });

        // Simulate scroll to 450 (navbarHeight=90, offset=10 → scrollPos=550 > 500)
        Object.defineProperty(mockWindow, 'scrollY', { value: 450, configurable: true });
        result.updateActive();

        const links = Array.from(result.tocLinks);
        expect(links[1].classList.contains('toc-active')).toBe(true);
        expect(links[0].classList.contains('toc-active')).toBe(false);
    });

    test('registers scroll event listener', () => {
        setupBlogDOM([{ tag: 'h1', text: 'Title' }]);
        const mockWindow = {
            scrollY: 0,
            addEventListener: jest.fn(),
            scrollTo: jest.fn(),
        };
        buildToc({ document, window: mockWindow });
        expect(mockWindow.addEventListener).toHaveBeenCalledWith(
            'scroll',
            expect.any(Function),
            { passive: true }
        );
    });
});
