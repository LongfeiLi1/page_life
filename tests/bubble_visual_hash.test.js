const { md5, createHashGroupForString, createBubbleInfo, drawBubble } = require('../assets/js/bubble_visual_hash');

describe('md5', () => {
    test('returns a 32-character hex string', () => {
        const hash = md5('hello');
        expect(hash).toHaveLength(32);
        expect(hash).toMatch(/^[0-9a-f]{32}$/);
    });

    test('produces known hash for empty string', () => {
        expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
    });

    test('produces known hash for "hello"', () => {
        expect(md5('hello')).toBe('5d41402abc4b2a76b9719d911017c592');
    });

    test('produces known hash for "The quick brown fox"', () => {
        expect(md5('The quick brown fox jumps over the lazy dog'))
            .toBe('9e107d9d372bb6826bd81d3542a419d6');
    });

    test('different inputs produce different hashes', () => {
        expect(md5('abc')).not.toBe(md5('def'));
    });

    test('same input always produces the same hash', () => {
        expect(md5('deterministic')).toBe(md5('deterministic'));
    });

    test('handles numeric string input', () => {
        const hash = md5('12345');
        expect(hash).toHaveLength(32);
        expect(hash).toMatch(/^[0-9a-f]{32}$/);
    });

    test('handles special characters', () => {
        const hash = md5('hello world!@#$%');
        expect(hash).toHaveLength(32);
        expect(hash).toMatch(/^[0-9a-f]{32}$/);
    });

    test('handles long input strings', () => {
        const longStr = 'a'.repeat(1000);
        const hash = md5(longStr);
        expect(hash).toHaveLength(32);
        expect(hash).toMatch(/^[0-9a-f]{32}$/);
    });
});

describe('createHashGroupForString', () => {
    test('returns an array of integers', () => {
        const group = createHashGroupForString('test');
        expect(Array.isArray(group)).toBe(true);
        group.forEach(v => {
            expect(Number.isInteger(v)).toBe(true);
        });
    });

    test('each value is between 0 and 15 (single hex digit)', () => {
        const group = createHashGroupForString('test');
        group.forEach(v => {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(15);
        });
    });

    test('length equals the md5 hash length (32)', () => {
        const group = createHashGroupForString('test');
        expect(group).toHaveLength(32);
    });

    test('is deterministic', () => {
        const a = createHashGroupForString('foo');
        const b = createHashGroupForString('foo');
        expect(a).toEqual(b);
    });

    test('different strings produce different groups', () => {
        const a = createHashGroupForString('alpha');
        const b = createHashGroupForString('beta');
        expect(a).not.toEqual(b);
    });
});

describe('createBubbleInfo', () => {
    const hashGroup = createHashGroupForString('test');

    test('returns an array with n bubbles', () => {
        const bubbles = createBubbleInfo(hashGroup, 5, 200, 200);
        expect(bubbles).toHaveLength(5);
    });

    test('clamps n to maxN when n exceeds available pairs', () => {
        // hashGroup has 32 entries → max 16 pairs
        const bubbles = createBubbleInfo(hashGroup, 100, 200, 200);
        expect(bubbles).toHaveLength(16);
    });

    test('each bubble has x, y, radius, and color', () => {
        const bubbles = createBubbleInfo(hashGroup, 4, 200, 100);
        bubbles.forEach(b => {
            expect(b).toHaveProperty('x');
            expect(b).toHaveProperty('y');
            expect(b).toHaveProperty('radius');
            expect(b).toHaveProperty('color');
            expect(typeof b.x).toBe('number');
            expect(typeof b.y).toBe('number');
            expect(typeof b.radius).toBe('number');
            expect(typeof b.color).toBe('string');
        });
    });

    test('x values scale with width', () => {
        const narrow = createBubbleInfo(hashGroup, 4, 100, 200);
        const wide = createBubbleInfo(hashGroup, 4, 400, 200);
        for (let i = 0; i < narrow.length; i++) {
            // x = (w/16) * v, so wide.x / narrow.x = 400/100 = 4
            if (narrow[i].x !== 0) {
                expect(wide[i].x / narrow[i].x).toBeCloseTo(4, 5);
            }
        }
    });

    test('y values scale with height', () => {
        const short = createBubbleInfo(hashGroup, 4, 200, 100);
        const tall = createBubbleInfo(hashGroup, 4, 200, 400);
        for (let i = 0; i < short.length; i++) {
            if (short[i].y !== 0) {
                expect(tall[i].y / short[i].y).toBeCloseTo(4, 5);
            }
        }
    });

    test('radius is between min (10) and max (wh/2)', () => {
        const w = 200, h = 100;
        const wh = Math.min(w, h);
        const bubbles = createBubbleInfo(hashGroup, 8, w, h);
        bubbles.forEach(b => {
            expect(b.radius).toBeGreaterThanOrEqual(10);
            expect(b.radius).toBeLessThanOrEqual(wh / 2);
        });
    });

    test('color is a valid hex color string', () => {
        const bubbles = createBubbleInfo(hashGroup, 8, 200, 200);
        bubbles.forEach(b => {
            expect(b.color).toMatch(/^#[0-9a-f]{6}$/);
        });
    });

    test('returns empty array when n is 0', () => {
        const bubbles = createBubbleInfo(hashGroup, 0, 200, 200);
        expect(bubbles).toHaveLength(0);
    });
});

describe('drawBubble', () => {
    test('appends circle elements to the SVG sorted by descending radius', () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const bubbleInfo = [
            { x: 10, y: 10, radius: 20, color: '#ff0000' },
            { x: 50, y: 50, radius: 50, color: '#00ff00' },
            { x: 30, y: 30, radius: 35, color: '#0000ff' },
        ];
        drawBubble(svg, bubbleInfo);

        const circles = svg.querySelectorAll('circle');
        expect(circles).toHaveLength(3);

        // Verify descending radius order
        const radii = Array.from(circles).map(c => parseFloat(c.getAttribute('r')));
        expect(radii).toEqual([50, 35, 20]);
    });

    test('sets correct attributes on each circle', () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const bubbleInfo = [{ x: 42, y: 99, radius: 15, color: '#abcdef' }];
        drawBubble(svg, bubbleInfo);

        const circle = svg.querySelector('circle');
        expect(circle.getAttribute('cx')).toBe('42');
        expect(circle.getAttribute('cy')).toBe('99');
        expect(circle.getAttribute('r')).toBe('15');
        expect(circle.getAttribute('fill')).toBe('#abcdef');
        expect(circle.getAttribute('fill-opacity')).toBe('0.75');
    });

    test('handles empty bubbleInfo array', () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        drawBubble(svg, []);
        expect(svg.querySelectorAll('circle')).toHaveLength(0);
    });
});
