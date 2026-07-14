/**
 * Immersive Intro – Učitelský rozcestník
 *
 * PROGRESSIVE ENHANCEMENT:
 * 1. Default CSS shows everything statically (works without JS).
 * 2. References check: adds "immersive-ready" class only if all elements exist.
 * 3. IntersectionObservers on static sentinels trigger state updates.
 * 4. Observes prefers-reduced-motion dynamically.
 * 5. Keyboard skip link and CTA handle smooth scroll + programmatic focus.
 */
(function () {
    'use strict';

    // ─── Reference checks & Initialization ───
    var scene = document.querySelector('.immersive-scene');
    var scrollSpace = document.querySelector('.immersive-scroll-space');
    var signs = document.querySelectorAll('.sign');
    var contentStart = document.getElementById('content-start');
    var contentTransition = document.querySelector('.content-transition');
    var featureItems = document.querySelectorAll('.feature-item');

    // Required elements to run the interactive intro
    if (!scene || !scrollSpace || signs.length === 0 || !contentStart) {
        // Fallback: Make sure immersive-ready is not present
        document.documentElement.classList.remove('immersive-ready');
        return;
    }

    // ─── Respect reduced motion ───
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Observers storage to enable disconnect
    var observers = {
        signs: null,
        zoom: null,
        fade: null,
        content: null,
        features: null
    };

    // ─── Setup Observers ───
    function initObservers() {
        if (prefersReducedMotion.matches) return;

        // Enable animations in CSS
        document.documentElement.classList.add('immersive-ready');

        // References to sentinel HTML elements
        var sentinelSigns = scrollSpace.querySelector('.sentinel-signs');
        var sentinelZoom = scrollSpace.querySelector('.sentinel-zoom');
        var sentinelFade = scrollSpace.querySelector('.sentinel-fade');

        // A. Observer for signs
        if (sentinelSigns) {
            observers.signs = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
                        signs.forEach(function (sign) {
                            sign.classList.add('sign-visible');
                        });
                    } else {
                        signs.forEach(function (sign) {
                            sign.classList.remove('sign-visible');
                        });
                    }
                });
            }, { root: null, threshold: 0 });
            observers.signs.observe(sentinelSigns);
        }

        // B. Observer for zoom
        if (sentinelZoom) {
            observers.zoom = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
                        scene.classList.add('scene-zoomed');
                    } else {
                        scene.classList.remove('scene-zoomed');
                    }
                });
            }, { root: null, threshold: 0 });
            observers.zoom.observe(sentinelZoom);
        }

        // C. Observer for fade
        if (sentinelFade) {
            observers.fade = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
                        scene.classList.add('scene-fading');
                    } else {
                        scene.classList.remove('scene-fading');
                    }
                });
            }, { root: null, threshold: 0 });
            observers.fade.observe(sentinelFade);
        }

        // D. Observer for content transition header
        if (contentTransition) {
            observers.content = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('content-visible');
                    }
                });
            }, { root: null, threshold: 0.15 });
            observers.content.observe(contentTransition);
        }

        // E. Observer for feature cards
        if (featureItems.length > 0) {
            observers.features = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        var index = Array.prototype.indexOf.call(featureItems, entry.target);
                        entry.target.style.transitionDelay = (index * 0.08) + 's';
                        entry.target.classList.add('feature-visible');
                        observers.features.unobserve(entry.target);
                    }
                });
            }, { root: null, threshold: 0.15 });

            featureItems.forEach(function (item) {
                observers.features.observe(item);
            });
        }
    }

    // ─── Destroy Observers ───
    function destroyObservers() {
        document.documentElement.classList.remove('immersive-ready');
        scene.classList.remove('scene-zoomed', 'scene-fading');

        signs.forEach(function (sign) {
            sign.classList.remove('sign-visible');
        });

        if (contentTransition) {
            contentTransition.classList.remove('content-visible');
        }

        featureItems.forEach(function (item) {
            item.classList.remove('feature-visible');
            item.style.transitionDelay = '';
        });

        // Disconnect all IntersectionObservers
        for (var key in observers) {
            if (observers[key]) {
                observers[key].disconnect();
                observers[key] = null;
            }
        }
    }

    // ─── Handle preferences ───
    if (!prefersReducedMotion.matches && 'IntersectionObserver' in window) {
        initObservers();
    }

    // ─── prefers-reduced-motion listener (standard + legacy compatibility) ───
    var handleChange = function (e) {
        if (e.matches) {
            destroyObservers();
        } else {
            destroyObservers();
            initObservers();
        }
    };

    if (prefersReducedMotion.addEventListener) {
        prefersReducedMotion.addEventListener('change', handleChange);
    } else if (prefersReducedMotion.addListener) {
        prefersReducedMotion.addListener(handleChange);
    }

    // ─── Initial scroll status check via requestAnimationFrame ───
    // Ensures that when page loads at scrollY === 0, no state classes are active
    requestAnimationFrame(function () {
        if (window.scrollY === 0) {
            scene.classList.remove('scene-zoomed', 'scene-fading');
            signs.forEach(function (sign) {
                sign.classList.remove('sign-visible');
            });
        }
    });

})();
