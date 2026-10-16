function buildToc(options) {
    var doc = (options && options.document) || document;
    var win = (options && options.window) || window;

    var tocList = doc.querySelector('.blog-toc-list');
    if (!tocList) return null;

    var content = doc.querySelector('.blog-content');
    var headings = content.querySelectorAll('h1, h2, h3');
    var navbarHeight = 90;

    if (headings.length === 0) {
        var tocEl = doc.getElementById('blog-toc');
        if (tocEl) tocEl.style.display = 'none';
        return { tocList: tocList, headings: headings, tocLinks: [] };
    }

    // Add scroll-margin to all headings so anchor links clear the navbar
    headings.forEach(function (heading, i) {
        if (!heading.id) {
            heading.id = 'heading-' + i;
        }
        heading.style.scrollMarginTop = navbarHeight + 'px';

        var li = doc.createElement('li');
        var a = doc.createElement('a');
        a.href = '#' + heading.id;
        a.textContent = heading.textContent;
        a.className = 'toc-' + heading.tagName.toLowerCase();
        a.addEventListener('click', function (e) {
            e.preventDefault();
            var target = doc.getElementById(heading.id);
            if (target) {
                win.scrollTo({
                    top: target.offsetTop - navbarHeight,
                    behavior: 'smooth'
                });
                history.pushState(null, null, '#' + heading.id);
            }
        });
        li.appendChild(a);
        tocList.appendChild(li);
    });

    // Highlight active heading on scroll
    var tocLinks = tocList.querySelectorAll('a');
    function updateActive() {
        var scrollPos = win.scrollY + navbarHeight + 10;
        var current = null;
        headings.forEach(function (heading) {
            if (heading.offsetTop <= scrollPos) {
                current = heading.id;
            }
        });
        tocLinks.forEach(function (link) {
            link.classList.toggle('toc-active', link.getAttribute('href') === '#' + current);
        });
    }
    win.addEventListener('scroll', updateActive, { passive: true });
    updateActive();

    return { tocList: tocList, headings: headings, tocLinks: tocLinks, updateActive: updateActive };
}

(function () {
    buildToc();
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildToc: buildToc };
}
