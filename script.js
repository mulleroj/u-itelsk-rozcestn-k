/**
 * Učitelský rozcestník — V4 Interactive Map
 * Vanilla JS, no external libraries.
 *
 * Behaviour:
 *  - Click hotspot → open its panel, close any other
 *  - Click close btn, Escape, click outside → close panel
 *  - Focus returns to the activating hotspot on close
 *  - Hotspots hidden on small screens (handled by CSS)
 */

(function () {
    'use strict';

    /* ── DOM references ── */
    const hotspots = Array.from(document.querySelectorAll('.map-hotspot'));
    const panels   = Array.from(document.querySelectorAll('.map-info-panel'));

    if (!hotspots.length) return; // no map on this page

    let activeHotspot = null;

    /* ── Helpers ── */

    function closeAll() {
        panels.forEach(function (p) { p.hidden = true; });
        hotspots.forEach(function (h) { h.setAttribute('aria-expanded', 'false'); });
        activeHotspot = null;
    }

    function openPanel(hotspot) {
        var target  = hotspot.dataset.mapTarget;
        var panelId = 'map-panel-' + target;
        var panel   = document.getElementById(panelId);

        if (!panel) return;

        // Close everything first
        closeAll();

        // Open the matched panel
        panel.hidden = false;
        hotspot.setAttribute('aria-expanded', 'true');
        activeHotspot = hotspot;

        // Move focus to the close button inside the panel
        var closeBtn = panel.querySelector('.panel-close');
        if (closeBtn) closeBtn.focus();
    }

    /* ── Hotspot click ── */
    hotspots.forEach(function (hotspot) {
        hotspot.addEventListener('click', function () {
            var isOpen = hotspot.getAttribute('aria-expanded') === 'true';
            if (isOpen) {
                closeAll();
            } else {
                openPanel(hotspot);
            }
        });
    });

    /* ── Panel close buttons ── */
    panels.forEach(function (panel) {
        var closeBtn = panel.querySelector('.panel-close');
        if (!closeBtn) return;

        closeBtn.addEventListener('click', function () {
            var returnTarget = activeHotspot;
            closeAll();
            if (returnTarget) returnTarget.focus();
        });
    });

    /* ── Keyboard: Escape closes ── */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            var returnTarget = activeHotspot;
            closeAll();
            if (returnTarget) returnTarget.focus();
        }
    });

    /* ── Click outside map panel + hotspot closes ── */
    document.addEventListener('click', function (e) {
        if (!activeHotspot) return;

        var clickedPanel   = e.target.closest('.map-info-panel');
        var clickedHotspot = e.target.closest('.map-hotspot');

        if (!clickedPanel && !clickedHotspot) {
            closeAll();
        }
    });

}());
