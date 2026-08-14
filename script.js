/**
 * Učitelský rozcestník — V6 Living Interactive World
 * Vanilla JS, no external libraries.
 *
 * Behaviour:
 *  - The world wakes up on load: the five trail markers arrive one by
 *    one, then their lights keep breathing (CSS)
 *  - Pointer moves over the scene → the near depth planes drift a
 *    little further than the map (2.5D parallax)
 *  - Hover / keyboard focus on a marker → the camera leans in by 1.03
 *    about that place, a warm bloom travels to it and the rest of the
 *    world steps back. Hover never opens anything.
 *  - Click / Enter / Space → the camera flies to the area, the signpost
 *    echo yields, the detail diorama takes over and the travel board
 *    with the links appears
 *  - The signpost rail (visible only inside an area) flies straight
 *    from area A to area B, or back out to the whole map
 *  - Close btn, "Zpět na celou mapu", Escape, click outside → back to
 *    the overview, focus returns to the marker
 *  - Markers, rail and boards are hidden on small screens (CSS); the
 *    accordion takes over there
 */

(function () {
    'use strict';

    /* ── DOM references ── */
    var shell       = document.querySelector('.interactive-map-shell');
    var wrap        = document.querySelector('.world-stage-wrap');
    var hotspots    = Array.prototype.slice.call(document.querySelectorAll('.map-marker'));
    var panels      = Array.prototype.slice.call(document.querySelectorAll('.map-info-panel'));
    var railItems   = Array.prototype.slice.call(document.querySelectorAll('[data-rail-target]'));
    var railHome    = document.querySelector('[data-rail-home]');
    var mobileAreas = Array.prototype.slice.call(document.querySelectorAll('.mobile-area-item'));

    /* Find the accordion <details> for an area by comparing existing
       data-area values — never by concatenating a value into a selector,
       so an untrusted string can't produce an invalid selector. */
    function mobileAreaFor(area) {
        return mobileAreas.filter(function (d) { return d.dataset.area === area; })[0] || null;
    }

    if (!shell || !hotspots.length) return; // no map on this page

    var activeHotspot = null;
    var panelTimer    = null;
    var previewed     = null;

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Same 900px breakpoint the CSS uses to switch to the mobile accordion,
    // so the JS never invents a second, conflicting boundary.
    var mobileView    = window.matchMedia('(max-width: 900px)');
    var finePointer   = window.matchMedia('(hover: hover) and (pointer: fine)');

    /* Each marker carries its own place as --mk-x / --mk-y in the markup;
       cache them once so hover never has to reach for computed styles. */
    hotspots.forEach(function (h) {
        h.dataset.hx = h.style.getPropertyValue('--mk-x').trim();
        h.dataset.hy = h.style.getPropertyValue('--mk-y').trim();
    });


    /* ────────────────────────────────────────────────────────────
       Waking the world up
       ──────────────────────────────────────────────────────────── */
    requestAnimationFrame(function () {
        requestAnimationFrame(function () { shell.classList.add('is-awake'); });
    });


    /* ────────────────────────────────────────────────────────────
       Ambient depth — the near planes drift further than the map
       ──────────────────────────────────────────────────────────── */
    (function pointerDepth() {
        if (reducedMotion.matches || !finePointer.matches) return;

        var pending = false;
        var px = 0, py = 0;

        function apply() {
            pending = false;
            shell.style.setProperty('--par-x', px.toFixed(3));
            shell.style.setProperty('--par-y', py.toFixed(3));
        }

        shell.addEventListener('pointermove', function (e) {
            if (e.pointerType !== 'mouse') return;
            var r = shell.getBoundingClientRect();
            if (!r.width || !r.height) return;
            px = ((e.clientX - r.left) / r.width) * 2 - 1;
            py = ((e.clientY - r.top) / r.height) * 2 - 1;
            if (!pending) {
                pending = true;
                requestAnimationFrame(apply);
            }
        }, { passive: true });

        shell.addEventListener('pointerleave', function () {
            px = 0; py = 0;
            if (!pending) {
                pending = true;
                requestAnimationFrame(apply);
            }
        }, { passive: true });
    }());


    /* ────────────────────────────────────────────────────────────
       Preview — "you can enter here". Never opens anything.
       ──────────────────────────────────────────────────────────── */
    function startPreview(hotspot) {
        // Inside an area the detail scene owns the frame; a lean-in
        // there would fight the camera that is already parked.
        if (shell.classList.contains('is-zoomed')) return;
        if (previewed === hotspot) return;

        if (previewed) previewed.classList.remove('is-preview');
        previewed = hotspot;
        hotspot.classList.add('is-preview');

        shell.style.setProperty('--hover-x', hotspot.dataset.hx);
        shell.style.setProperty('--hover-y', hotspot.dataset.hy);
        shell.classList.add('is-previewing');
    }

    function endPreview(hotspot) {
        if (hotspot && previewed !== hotspot) return;
        if (previewed) previewed.classList.remove('is-preview');
        previewed = null;
        shell.classList.remove('is-previewing');
    }

    hotspots.forEach(function (hotspot) {
        hotspot.addEventListener('pointerenter', function (e) {
            if (e.pointerType === 'touch') return;   // tapping is not previewing
            startPreview(hotspot);
        });
        hotspot.addEventListener('pointerleave', function () { endPreview(hotspot); });

        // Keyboard focus gets exactly the same reaction as hover
        hotspot.addEventListener('focus', function () { startPreview(hotspot); });
        hotspot.addEventListener('blur',  function () { endPreview(hotspot); });
    });


    /* ────────────────────────────────────────────────────────────
       Camera + boards
       ──────────────────────────────────────────────────────────── */
    function syncRail(area) {
        railItems.forEach(function (item) {
            if (item.dataset.railTarget === area) {
                item.setAttribute('aria-current', 'true');
            } else {
                item.removeAttribute('aria-current');
            }
        });
    }

    function closeAll() {
        if (panelTimer) {
            clearTimeout(panelTimer);
            panelTimer = null;
        }
        panels.forEach(function (p) {
            p.hidden = true;
            p.classList.remove('is-open');
        });
        hotspots.forEach(function (h) { h.setAttribute('aria-expanded', 'false'); });
        shell.classList.remove('is-zoomed');
        shell.setAttribute('data-area', '');
        if (wrap) wrap.classList.remove('is-focused');
        syncRail('');
        endPreview();
        activeHotspot = null;
    }

    function returnToOverview() {
        var returnTarget = activeHotspot;
        closeAll();
        if (returnTarget) returnTarget.focus();
    }

    // The signpost echo is a one-shot CSS animation carried by the
    // .guide-echo helper class. On a direct area→area switch openPanel
    // removes and re-adds .is-zoomed in the same task, so an echo keyed on
    // .is-zoomed would never be seen to stop and would not replay. Instead
    // the script drives the class: remove it, cancel any held animation,
    // and re-add it on a later frame so the CSS animation starts fresh.
    // This touches only the guide element — never the camera stage, detail
    // scene or board — so the zoom does not reflow or flicker. Reduced
    // motion keeps the echo off entirely.
    function replayGuideEcho() {
        if (reducedMotion.matches) return;
        var guide = shell.querySelector('.guide-signpost');
        if (!guide) return;

        guide.classList.remove('guide-echo');
        guide.getAnimations().forEach(function (a) { a.cancel(); });

        // Re-add on a later frame so the class removal is committed first
        // and the animation is guaranteed to run from the start.
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { guide.classList.add('guide-echo'); });
        });
    }

    // moveFocus is false for two paths that must not yank focus:
    //  - a deep link on page load (focus would jump and scroll the page)
    //  - a jump from the rail (the visitor is navigating the rail and
    //    should stay on it, the way a set of view switchers behaves)
    function openPanel(hotspot, moveFocus) {
        if (moveFocus === undefined) moveFocus = true;

        var target  = hotspot.dataset.mapTarget;
        var panelId = 'map-panel-' + target;
        var panel   = document.getElementById(panelId);

        if (!panel) return;

        // Close everything first (also clears any pending panel timer)
        closeAll();

        // Move the camera to the selected area
        shell.setAttribute('data-area', target);
        shell.classList.add('is-zoomed');
        hotspot.setAttribute('aria-expanded', 'true');
        if (wrap) wrap.classList.add('is-focused');
        syncRail(target);
        activeHotspot = hotspot;

        // Replay the signpost echo even on a direct area→area switch
        replayGuideEcho();

        // Reveal the board once the camera has (mostly) arrived. The wait
        // lives entirely here (single source of timing); the CSS no longer
        // adds its own transition-delay. Reduced motion opens immediately.
        // While hidden=false but not yet .is-open the board is transparent
        // AND pointer-events:none (see CSS), so it never blocks clicks on
        // markers / the map behind it during the reveal window.
        var delay = reducedMotion.matches ? 0 : 420;

        panel.hidden = false;

        panelTimer = setTimeout(function () {
            panelTimer = null;
            panel.classList.add('is-open'); // starts the fade + pointer-events

            // Move focus to the close button only once the board has
            // actually begun to appear (next painted frame), never while it
            // is still fully transparent — and only for user activation.
            if (moveFocus) {
                requestAnimationFrame(function () {
                    if (!panel.classList.contains('is-open')) return;
                    var closeBtn = panel.querySelector('.panel-close');
                    if (closeBtn) closeBtn.focus();
                });
            }
        }, delay);
    }

    /* ── Marker click ── */
    hotspots.forEach(function (hotspot) {
        hotspot.addEventListener('click', function () {
            var isOpen = hotspot.getAttribute('aria-expanded') === 'true';
            if (isOpen) {
                returnToOverview();
            } else {
                openPanel(hotspot);
            }
        });
    });

    /* ── Signpost rail: direct A → B flight, and the way back out ── */
    railItems.forEach(function (item) {
        item.addEventListener('click', function () {
            var target = item.dataset.railTarget;
            if (shell.getAttribute('data-area') === target) return;

            var match = hotspots.filter(function (h) {
                return h.dataset.mapTarget === target;
            })[0];
            if (match) openPanel(match, false);   // keep focus on the rail
        });
    });

    if (railHome) railHome.addEventListener('click', returnToOverview);

    /* ── Board close + return buttons ── */
    panels.forEach(function (panel) {
        var closeBtn  = panel.querySelector('.panel-close');
        var returnBtn = panel.querySelector('.panel-return');

        if (closeBtn)  closeBtn.addEventListener('click', returnToOverview);
        if (returnBtn) returnBtn.addEventListener('click', returnToOverview);
    });

    /* ── Keyboard: Escape closes ── */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && activeHotspot) {
            returnToOverview();
        }
    });

    /* ── Deep link: /#ai, /#language, … opens that area on load ──
       Below the mobile breakpoint the desktop scene (zoom + board) is
       hidden, so a deep link must open the matching accordion item
       instead of zooming a map the visitor can't navigate. Neither path
       steals focus on load. */
    (function () {
        var hash = window.location.hash.replace('#', '');
        if (!hash) return;

        // Validate against the known areas first (the markers' own
        // data-map-target values). An unknown or malformed hash — including
        // one carrying quotes/brackets — is ignored, leaving the normal
        // overview, and can never reach a selector or throw.
        var match = hotspots.filter(function (h) {
            return h.dataset.mapTarget === hash;
        })[0];
        if (!match) return;

        if (mobileView.matches) {
            var details = mobileAreaFor(hash);
            if (details) details.open = true;
            return;
        }

        openPanel(match, false); // open the area, but keep focus
    }());

    /* ── Click outside board, marker and rail closes ── */
    document.addEventListener('click', function (e) {
        if (!activeHotspot) return;

        if (e.target.closest('.map-info-panel') ||
            e.target.closest('.map-marker') ||
            e.target.closest('.world-rail')) return;

        // Was keyboard focus still inside the board we're about to hide?
        // (A click on a real control elsewhere has already moved focus to
        //  it by this point, so we must not steal it back.)
        var openPanelEl     = document.querySelector('.map-info-panel:not([hidden])');
        var focusWasInPanel = openPanelEl && openPanelEl.contains(document.activeElement);
        var returnTarget    = activeHotspot;

        closeAll();

        // Only restore focus if it would otherwise be stranded on the
        // now-hidden board; leave any legitimately clicked control focused.
        if (focusWasInPanel && returnTarget) returnTarget.focus();
    });

    /* ── Crossing to the mobile breakpoint clears the desktop scene ──
       Below 900px the zoomed stage, boards, rail and markers are hidden,
       so a leftover open area would strand the map cropped/zoomed with no
       way back. When we enter mobile with an area still active, reset the
       scene; if focus was inside the now-hidden desktop nav, move it to
       the matching accordion (a visible, logical target) and open it so
       the visitor keeps the area they were viewing. */
    function handleBreakpointToMobile(e) {
        if (!e.matches) return;

        // The parallax offsets belong to a scene that is no longer shown.
        shell.style.setProperty('--par-x', '0');
        shell.style.setProperty('--par-y', '0');

        if (!activeHotspot) {
            endPreview();
            return;
        }

        var target = activeHotspot.dataset.mapTarget;

        closeAll();

        // Always carry the area the visitor was viewing into the mobile
        // accordion, so its links stay available regardless of where focus
        // is — otherwise the active area's links would vanish on resize.
        var details = mobileAreaFor(target);
        if (details) details.open = true;

        // The CSS media query hides the desktop nav as we cross the
        // breakpoint, so its focused control has already lost focus to
        // <body>. Only when focus is stranded (on <body> or an off-screen
        // element) do we move it to that area's summary; focus the user
        // put on a still-visible control is left untouched.
        var ae        = document.activeElement;
        var focusLost = !ae || ae === document.body || ae.offsetParent === null;

        if (focusLost && details) {
            var summary = details.querySelector('.mobile-area-summary');
            if (summary) summary.focus();
        }
    }

    if (mobileView.addEventListener) {
        mobileView.addEventListener('change', handleBreakpointToMobile);
    } else if (mobileView.addListener) {
        mobileView.addListener(handleBreakpointToMobile); // older browsers
    }

}());
