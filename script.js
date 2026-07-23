/**
 * Učitelský rozcestník — V5 Scenic Map
 * Vanilla JS, no external libraries.
 *
 * Behaviour:
 *  - Click hotspot → the camera stage zooms/pans to that area
 *    (CSS custom properties per area, driven by data-area on the shell),
 *    the local light fades in and the area panel opens shortly after
 *  - Click another hotspot → camera travels to the new area
 *  - Close btn, "Zpět na celou mapu", Escape, click outside → camera
 *    returns to the full-map overview, focus returns to the hotspot
 *  - Hotspots hidden on small screens (handled by CSS)
 */

(function () {
    'use strict';

    /* ── DOM references ── */
    var shell    = document.querySelector('.interactive-map-shell');
    var hotspots = Array.prototype.slice.call(document.querySelectorAll('.map-hotspot'));
    var panels   = Array.prototype.slice.call(document.querySelectorAll('.map-info-panel'));

    if (!shell || !hotspots.length) return; // no map on this page

    var activeHotspot = null;
    var panelTimer    = null;

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Same 900px breakpoint the CSS uses to switch to the mobile accordion,
    // so the JS never invents a second, conflicting boundary.
    var mobileView    = window.matchMedia('(max-width: 900px)');

    /* ── Helpers ── */

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
        activeHotspot = null;
    }

    function returnToOverview() {
        var returnTarget = activeHotspot;
        closeAll();
        if (returnTarget) returnTarget.focus();
    }

    // moveFocus is false for the deep-link path: opening an area from a
    // #hash on page load must not yank focus (and scroll) to the close
    // button — that is disorienting for keyboard / screen-reader users.
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
        activeHotspot = hotspot;

        // Reveal the panel once the camera has (mostly) arrived. The wait
        // lives entirely here (single source of timing); the CSS no longer
        // adds its own transition-delay. Reduced motion opens immediately.
        // While hidden=false but not yet .is-open the panel is transparent
        // AND pointer-events:none (see CSS), so it never blocks clicks on
        // hotspots / the map behind it during the reveal window.
        var delay = reducedMotion.matches ? 0 : 420;

        panel.hidden = false;

        panelTimer = setTimeout(function () {
            panelTimer = null;
            panel.classList.add('is-open'); // starts the fade + pointer-events

            // Move focus to the close button only once the panel has
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

    /* ── Hotspot click ── */
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

    /* ── Panel close + return buttons ── */
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
       Below the mobile breakpoint the desktop scene (zoom + panel) is
       hidden, so a deep link must open the matching accordion item
       instead of zooming a map the visitor can't navigate. Neither path
       steals focus on load. */
    (function () {
        var hash = window.location.hash.replace('#', '');
        if (!hash) return;

        if (mobileView.matches) {
            var details = document.querySelector('.mobile-area-item[data-area="' + hash + '"]');
            if (details) details.open = true;
            return;
        }

        var match = hotspots.filter(function (h) {
            return h.dataset.mapTarget === hash;
        })[0];
        if (match) openPanel(match, false); // open the area, but keep focus
    }());

    /* ── Click outside map panel + hotspot closes ── */
    document.addEventListener('click', function (e) {
        if (!activeHotspot) return;

        var clickedPanel   = e.target.closest('.map-info-panel');
        var clickedHotspot = e.target.closest('.map-hotspot');

        if (clickedPanel || clickedHotspot) return;

        // Was keyboard focus still inside the panel we're about to hide?
        // (A click on a real control elsewhere has already moved focus to
        //  it by this point, so we must not steal it back.)
        var openPanelEl     = document.querySelector('.map-info-panel:not([hidden])');
        var focusWasInPanel = openPanelEl && openPanelEl.contains(document.activeElement);
        var returnTarget    = activeHotspot;

        closeAll();

        // Only restore focus if it would otherwise be stranded on the
        // now-hidden panel; leave any legitimately clicked control focused.
        if (focusWasInPanel && returnTarget) returnTarget.focus();
    });

}());
