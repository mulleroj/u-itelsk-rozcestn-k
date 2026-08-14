/**
 * Učitelský rozcestník — V7 Scroll Journey
 * Vanilla JS, no external libraries.
 *
 * Scroll position is the only source of truth for the scene.
 *
 *  - The page scrolls natively. Nothing here ever calls
 *    preventDefault on wheel/touch/keys, so the mouse wheel,
 *    trackpad, touch, Page Down, Home/End, the scrollbar and
 *    keyboard scrolling all behave exactly as the browser intends.
 *  - A scroll listener only marks the frame dirty;
 *    requestAnimationFrame does the work, at most once per frame.
 *  - Each frame reads one number (window.scrollY) and writes a
 *    handful of CSS custom properties. All layout-dependent
 *    geometry is measured once, and again on resize.
 *  - The skip rail and the deep links do not drive a second camera:
 *    they move the document, and the camera follows the scroll like
 *    everything else.
 *  - Below 900px and under prefers-reduced-motion the flight is not
 *    used at all (see the matching CSS media query): the page is a
 *    still world plus a plain accordion, scrolling normally.
 */

(function () {
    'use strict';

    /* Aspect of assets/immersive-home/09-master-world-map.png */
    var ASPECT = 2752 / 1536;

    /* ── DOM ── */
    var track     = document.querySelector('.journey-track');
    var scene     = document.querySelector('.journey-scene');
    var intro     = document.querySelector('.journey-intro');
    var rail      = document.querySelector('.journey-rail');
    var foreLayer = document.querySelector('.jl-fore');
    var stopEls   = Array.prototype.slice.call(document.querySelectorAll('.journey-stop'));
    var places    = Array.prototype.slice.call(document.querySelectorAll('.place'));
    var dioramas  = places.map(function (el) { return el.querySelector('.diorama'); });
    var railItems = Array.prototype.slice.call(document.querySelectorAll('[data-goto]'));
    var details   = Array.prototype.slice.call(document.querySelectorAll('.mobile-area-item'));

    if (!track || !scene) return;

    /* ── The flight path ──
       Waypoints in map coordinates: x/y are percentages of the world
       image, k is the zoom as a multiple of the scale that fills the
       viewport. `ease` is how we travel INTO this waypoint, which is
       what gives the journey its accelerate–cruise–decelerate rhythm:
       'in' leaving a place, 'out' arriving at one, 'linear' for the
       barely-moving hover while parked. */
    var PATH = [
        { p: 0.000, x: 50.0, y: 50.0, k: 1.00, ease: 'linear' },  // the whole world
        { p: 0.070, x: 50.0, y: 50.0, k: 1.00, ease: 'linear' },  // overview hold

        { p: 0.110, x: 33.0, y: 57.0, k: 1.35, ease: 'in'     },  // dive west
        { p: 0.150, x: 13.0, y: 67.5, k: 2.10, ease: 'out'    },  // arrive · AI
        { p: 0.245, x: 13.8, y: 68.5, k: 2.18, ease: 'linear' },  // hover · AI

        { p: 0.285, x: 23.5, y: 62.0, k: 1.45, ease: 'in'     },  // lift off, travel east
        { p: 0.325, x: 33.5, y: 56.5, k: 2.10, ease: 'out'    },  // arrive · Angličtina
        { p: 0.420, x: 34.2, y: 57.5, k: 2.18, ease: 'linear' },  // hover

        { p: 0.460, x: 51.0, y: 51.0, k: 1.35, ease: 'in'     },  // out over the signpost
        { p: 0.500, x: 69.0, y: 45.5, k: 2.10, ease: 'out'    },  // arrive · Elektro
        { p: 0.595, x: 69.6, y: 46.5, k: 2.18, ease: 'linear' },  // hover

        { p: 0.635, x: 76.0, y: 50.0, k: 1.50, ease: 'in'     },  // travel
        { p: 0.675, x: 83.0, y: 54.5, k: 2.10, ease: 'out'    },  // arrive · Tvorba materiálů
        { p: 0.770, x: 83.6, y: 55.5, k: 2.18, ease: 'linear' },  // hover

        { p: 0.810, x: 85.5, y: 64.0, k: 1.55, ease: 'in'     },  // descend south
        { p: 0.850, x: 87.0, y: 72.5, k: 2.10, ease: 'out'    },  // arrive · Audio a video
        { p: 0.945, x: 87.5, y: 73.5, k: 2.18, ease: 'linear' },  // hover

        { p: 1.000, x: 52.0, y: 52.0, k: 1.00, ease: 'inOut'  }   // pull back to the world
    ];

    /* Plateaus: the camera is all but parked and the card is fully
       stable, so a visitor can stop, read and click without having to
       land on an exact scroll position. */
    var STOPS = [
        { area: 'ai',        from: 0.150, to: 0.245 },
        { area: 'language',  from: 0.325, to: 0.420 },
        { area: 'electric',  from: 0.500, to: 0.595 },
        { area: 'materials', from: 0.675, to: 0.770 },
        { area: 'media',     from: 0.850, to: 0.945 }
    ];

    var CARD_FADE    = 0.032;   // card ramps, just outside the plateau

    /* The place itself resolves over a window that reaches exactly to the
       apex of the arc between two stops (0.040 either side of a plateau
       lands on the transit waypoint). So one place has fully dissolved at
       the moment the next begins to appear — they never overlap, and at
       the top of every arc you briefly see the plain painted world. */
    var SCENE_LEAD   = 0.040;
    var SCENE_INSET  = 0.005;

    /* ── Media state ──
       One query, shared with the CSS, so JS and CSS can never
       disagree about which mode the page is in. */
    var staticMode = window.matchMedia('(max-width: 900px), (prefers-reduced-motion: reduce)');
    var reduced    = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* ── Easing ── */
    function easeIn(t)    { return t * t; }
    function easeOut(t)   { return 1 - (1 - t) * (1 - t); }
    function easeInOut(t) { return t * t * (3 - 2 * t); }

    function applyEase(name, t) {
        if (name === 'in')    return easeIn(t);
        if (name === 'out')   return easeOut(t);
        if (name === 'inOut') return easeInOut(t);
        return t;
    }

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

    /* 0 → 1 across [a, b] */
    function ramp(v, a, b) {
        if (b === a) return v < a ? 0 : 1;
        return clamp((v - a) / (b - a), 0, 1);
    }

    /* Camera at a given progress */
    function sample(p) {
        if (p <= PATH[0].p) return PATH[0];
        var last = PATH[PATH.length - 1];
        if (p >= last.p) return last;

        for (var i = 1; i < PATH.length; i++) {
            var b = PATH[i];
            if (p > b.p) continue;
            var a = PATH[i - 1];
            var t = applyEase(b.ease, (p - a.p) / (b.p - a.p));
            return {
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t,
                k: a.k + (b.k - a.k) * t
            };
        }
        return last;
    }

    /* ── Geometry, measured once and on resize only ── */
    var geom = { top: 0, len: 1, vw: 0, vh: 0, stageW: 0, stageH: 0, fill: 1 };

    function measure() {
        var r = track.getBoundingClientRect();
        geom.top = r.top + window.pageYOffset;
        geom.vw  = document.documentElement.clientWidth;
        geom.vh  = window.innerHeight;
        geom.len = Math.max(1, track.offsetHeight - geom.vh);

        geom.stageW = Math.min(geom.vw, geom.vh * ASPECT);
        geom.stageH = geom.stageW / ASPECT;
        geom.fill   = Math.max(geom.vw / geom.stageW, geom.vh / geom.stageH);

        scene.style.setProperty('--stage-w', geom.stageW + 'px');
        scene.style.setProperty('--stage-h', geom.stageH + 'px');
    }

    /* ── Render ── */
    var activeStop = -1;
    var railCurrent = -1;

    function render() {
        ticking = false;

        var p = clamp((window.pageYOffset - geom.top) / geom.len, 0, 1);
        var cam = sample(p);

        /* Camera. The world never shows its own edge: at any zoom the
           centre is clamped to the range that keeps the frame filled. */
        var S = geom.fill * cam.k;
        var halfW = 50 * geom.vw / (geom.stageW * S);
        var halfH = 50 * geom.vh / (geom.stageH * S);
        var cx = halfW >= 50 ? 50 : clamp(cam.x, halfW, 100 - halfW);
        var cy = halfH >= 50 ? 50 : clamp(cam.y, halfH, 100 - halfH);

        scene.style.setProperty('--cam-x', cx.toFixed(3));
        scene.style.setProperty('--cam-y', cy.toFixed(3));
        scene.style.setProperty('--cam-s', S.toFixed(4));

        /* Title yields as the flight begins */
        var introOut = ramp(p, 0.012, 0.075);
        intro.style.setProperty('--intro-o', (1 - introOut).toFixed(3));
        intro.style.setProperty('--intro-lift', introOut.toFixed(3));

        /* Stops: card + the place resolving into detail */
        var warm = 0;
        var nextActive = -1;

        for (var i = 0; i < STOPS.length; i++) {
            var s = STOPS[i];

            var cardO = Math.min(
                ramp(p, s.from - CARD_FADE, s.from),
                1 - ramp(p, s.to, s.to + CARD_FADE)
            );

            var sceneO = Math.min(
                ramp(p, s.from - SCENE_LEAD, s.from - SCENE_INSET),
                1 - ramp(p, s.to + SCENE_INSET, s.to + SCENE_LEAD)
            );

            var d = dioramas[i];
            if (d) {
                d.style.opacity = sceneO.toFixed(3);
                /* faint = still settling in, so it sits slightly large */
                d.style.setProperty('--d-s', (1 + 0.09 * (1 - sceneO)).toFixed(3));
                /* the plate leads, covering the painted original first */
                places[i].style.setProperty('--glow-o', Math.min(1, sceneO * 2.4).toFixed(3));
            }

            if (cardO > 0) {
                nextActive = i;
                stopEls[i].style.setProperty('--stop-o', cardO.toFixed(3));
                stopEls[i].style.setProperty('--stop-in', (1 - cardO).toFixed(3));
            }
            if (sceneO > warm) warm = sceneO;
        }

        scene.style.setProperty('--warm', warm.toFixed(3));

        /* Exactly one card is ever visible or focusable */
        if (nextActive !== activeStop) {
            if (activeStop > -1) stopEls[activeStop].classList.remove('is-active');
            if (nextActive > -1) stopEls[nextActive].classList.add('is-active');
            activeStop = nextActive;
        }

        /* Nearest plane: a blurred foreground only while we are
           actually travelling (low zoom, mid-journey) */
        var foreO = clamp((1.95 - cam.k) / 0.55, 0, 1)
                  * ramp(p, 0.075, 0.115)
                  * (1 - ramp(p, 0.945, 0.985))
                  * 0.5;
        foreLayer.style.opacity = foreO.toFixed(3);

        /* Skip rail */
        var railO = Math.min(ramp(p, 0.045, 0.09), 1 - ramp(p, 0.955, 0.995));
        rail.style.setProperty('--rail-o', railO.toFixed(3));
        rail.classList.toggle('is-shown', railO > 0.01);
        rail.style.setProperty('--journey-p', p.toFixed(4));

        var near = -1;
        for (var j = 0; j < STOPS.length; j++) {
            if (p >= STOPS[j].from - CARD_FADE && p <= STOPS[j].to + CARD_FADE) { near = j; break; }
        }
        if (near !== railCurrent) {
            railItems.forEach(function (item, idx) {
                if (idx === near) item.setAttribute('aria-current', 'true');
                else item.removeAttribute('aria-current');
            });
            railCurrent = near;
        }
    }

    /* ── Scroll plumbing ──
       Passive listener, one rAF per frame at most. Nothing is read
       from layout here, so scrolling never thrashes. */
    var ticking = false;
    var running = false;

    function onScroll() {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(render);
        }
    }

    function onResize() {
        measure();
        onScroll();
    }

    function start() {
        if (running) return;
        running = true;
        measure();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize);
        render();
    }

    function stop() {
        if (!running) return;
        running = false;
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);

        /* Leave nothing behind that the static layout would inherit */
        if (activeStop > -1) {
            stopEls[activeStop].classList.remove('is-active');
            activeStop = -1;
        }
        rail.classList.remove('is-shown');
    }

    function syncMode() {
        if (staticMode.matches) stop();
        else start();
    }

    /* ── Areas: find by comparing existing values, never by building a
       selector out of a string that came from the URL ── */
    function stopIndexFor(area) {
        for (var i = 0; i < STOPS.length; i++) {
            if (STOPS[i].area === area) return i;
        }
        return -1;
    }

    function detailsFor(area) {
        return details.filter(function (d) { return d.dataset.area === area; })[0] || null;
    }

    /* Scroll position that parks the camera in the middle of a stop */
    function scrollTargetFor(index) {
        var s = STOPS[index];
        return Math.round(geom.top + geom.len * ((s.from + s.to) / 2));
    }

    function goToArea(area, smooth) {
        var i = stopIndexFor(area);
        if (i < 0) return;

        if (staticMode.matches) {
            var d = detailsFor(area);
            if (d) {
                d.open = true;
                d.scrollIntoView({ block: 'start', behavior: smooth && !reduced.matches ? 'smooth' : 'auto' });
            }
            return;
        }

        measure();  // the track may not have settled on first paint
        window.scrollTo({
            top: scrollTargetFor(i),
            behavior: smooth && !reduced.matches ? 'smooth' : 'auto'
        });
    }

    /* ── Skip rail: moves the document, never the camera directly ── */
    railItems.forEach(function (item) {
        item.addEventListener('click', function () {
            goToArea(item.dataset.goto, true);
        });
    });

    /* ── Deep links: /#ai, /#language, … ──
       The hash is validated against the known areas first, so an
       unknown or malformed value is simply ignored and can never
       reach a selector. */
    function currentHashArea() {
        var hash = window.location.hash.replace('#', '');
        return (hash && stopIndexFor(hash) > -1) ? hash : null;
    }

    /* Changing only the hash is a same-document navigation: no load
       event fires, so the jump has to be driven from hashchange too. */
    window.addEventListener('hashchange', function () {
        var area = currentHashArea();
        if (area) goToArea(area, true);
    });

    (function () {
        var area = currentHashArea();
        if (!area) return;

        /* Wait for layout (fonts, the master map) before trusting the
           track's height. The browser may also restore a previous
           scroll position on this load, so the jump is taken on the
           frame after that has settled — and without an animation. */
        window.addEventListener('load', function () {
            requestAnimationFrame(function () { goToArea(area, false); });
        });
    }());

    /* ── Go ── */
    syncMode();

    if (staticMode.addEventListener) staticMode.addEventListener('change', syncMode);
    else if (staticMode.addListener) staticMode.addListener(syncMode);

    /* The master map settles the track height once it has decoded */
    window.addEventListener('load', function () {
        if (running) onResize();
    });

}());
