(function (global) {
    'use strict';

    var FALLBACK_HOME = 'https://rifatech07.github.io/index.html';

    function siteHome() {
        var cfg = global.RIFA_CONFIG || {};
        return cfg.siteHome || FALLBACK_HOME;
    }

    function applyHomeLinks() {
        var home = siteHome();
        document.querySelectorAll('[data-site-home]').forEach(function (el) {
            el.setAttribute('href', home);
        });
    }

    global.RifaHome = {
        url: siteHome,
        apply: applyHomeLinks
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyHomeLinks);
    } else {
        applyHomeLinks();
    }
})(window);
