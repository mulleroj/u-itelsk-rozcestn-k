/**
 * Immersive Intro – Učitelský rozcestník
 * 
 * PROGRESSIVE ENHANCEMENT:
 * 1. Default CSS shows everything statically (works without JS).
 * 2. This script adds class "immersive-ready" to <html> to enable animations.
 * 3. Uses IntersectionObserver for all state changes (no per-pixel scroll listener).
 * 4. CSS scroll-driven animations are a separate layer handled purely in CSS.
 * 5. Respects prefers-reduced-motion – exits early if active.
 */
(function () {
    'use strict';

    // ─── Respect reduced motion ───
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
        // Everything is visible by default via CSS. Nothing to do.
        return;
    }

    // ─── Check for IntersectionObserver support ───
    if (!('IntersectionObserver' in window)) {
        // No IO support → content stays visible via default CSS. Graceful degradation.
        return;
    }

    // ─── Enable animations ───
    document.documentElement.classList.add('immersive-ready');

    // ─── References ───
    var scene = document.querySelector('.immersive-scene');
    var signs = document.querySelectorAll('.sign');
    var scrollSpace = document.querySelector('.immersive-scroll-space');
    var contentTransition = document.querySelector('.content-transition');
    var featureItems = document.querySelectorAll('.feature-item');

    if (!scene || !scrollSpace) return;

    // ─── Observer 1: Zoom trigger ───
    // When the scroll-space is partially scrolled (middle section visible),
    // add the zoom class to the scene.
    var zoomSentinel = document.createElement('div');
    zoomSentinel.className = 'immersive-zoom-sentinel';
    zoomSentinel.setAttribute('aria-hidden', 'true');
    zoomSentinel.style.cssText = 'position:absolute;top:40%;height:1px;width:1px;pointer-events:none;';
    scrollSpace.appendChild(zoomSentinel);

    var zoomObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                scene.classList.add('scene-zoomed');
            } else {
                scene.classList.remove('scene-zoomed');
            }
        });
    }, {
        root: null,
        threshold: 0
    });
    zoomObserver.observe(zoomSentinel);

    // ─── Observer 2: Signs entrance ───
    // When the signpost area is in view, reveal signs with stagger.
    var signpostLayer = document.querySelector('.scene-signpost');
    if (signpostLayer && signs.length > 0) {
        var signsObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    // Show signs
                    signs.forEach(function (sign) {
                        sign.classList.add('sign-visible');
                    });
                } else {
                    // Hide signs when scrolled back above
                    if (entry.boundingClientRect.top > 0) {
                        signs.forEach(function (sign) {
                            sign.classList.remove('sign-visible');
                        });
                    }
                }
            });
        }, {
            root: null,
            threshold: 0.1
        });
        signsObserver.observe(signpostLayer);
    }

    // ─── Observer 3: Scene fade-out ───
    // When the bottom sentinel of the scroll-space exits viewport,
    // fade the scene to prepare for content.
    var fadeSentinel = document.createElement('div');
    fadeSentinel.className = 'immersive-fade-sentinel';
    fadeSentinel.setAttribute('aria-hidden', 'true');
    fadeSentinel.style.cssText = 'position:absolute;bottom:5%;height:1px;width:1px;pointer-events:none;';
    scrollSpace.appendChild(fadeSentinel);

    var fadeObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                scene.classList.add('scene-fading');
            } else {
                scene.classList.remove('scene-fading');
            }
        });
    }, {
        root: null,
        threshold: 0
    });
    fadeObserver.observe(fadeSentinel);

    // ─── Observer 4: Content transition entrance ───
    if (contentTransition) {
        var contentObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('content-visible');
                }
            });
        }, {
            root: null,
            threshold: 0.2
        });
        contentObserver.observe(contentTransition);
    }

    // ─── Observer 5: Feature items entrance ───
    if (featureItems.length > 0) {
        var featureObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    // Stagger with CSS transition-delay
                    var index = Array.prototype.indexOf.call(featureItems, entry.target);
                    entry.target.style.transitionDelay = (index * 0.08) + 's';
                    entry.target.classList.add('feature-visible');
                    featureObserver.unobserve(entry.target); // Only animate once
                }
            });
        }, {
            root: null,
            threshold: 0.15
        });

        featureItems.forEach(function (item) {
            featureObserver.observe(item);
        });
    }

    // ─── Handle dynamic reduced-motion changes ───
    prefersReducedMotion.addEventListener('change', function (e) {
        if (e.matches) {
            // User enabled reduced motion – remove all animation classes
            document.documentElement.classList.remove('immersive-ready');
            scene.classList.remove('scene-zoomed', 'scene-fading');
            signs.forEach(function (sign) {
                sign.classList.remove('sign-visible');
                sign.style.opacity = '';
                sign.style.transform = '';
            });
            featureItems.forEach(function (item) {
                item.classList.remove('feature-visible');
                item.style.opacity = '';
                item.style.transform = '';
                item.style.transitionDelay = '';
            });
            if (contentTransition) {
                contentTransition.classList.remove('content-visible');
                contentTransition.style.opacity = '';
                contentTransition.style.transform = '';
            }
        } else {
            // User disabled reduced motion – re-enable
            document.documentElement.classList.add('immersive-ready');
        }
    });

})();
