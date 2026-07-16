document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile/no-JS simple fade-up animation delays for features grid
    const features = document.querySelectorAll('.feature-item');
    features.forEach((feature, index) => {
        feature.style.opacity = '0';
        feature.style.transform = 'translateY(20px)';
        feature.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        setTimeout(() => {
            feature.style.opacity = '1';
            feature.style.transform = 'translateY(0)';
        }, 500 + (index * 100));
    });

    // 2. Initialize Cinematic Master Journey
    const img = document.querySelector('.master-scene-image');
    if (img) {
        if (typeof img.decode === 'function') {
            img.decode().then(initMasterJourney).catch(() => initMasterJourney());
        } else {
            if (img.complete) {
                initMasterJourney();
            } else {
                img.addEventListener('load', initMasterJourney);
                setTimeout(initMasterJourney, 1500); // Safe fallback
            }
        }
    } else {
        initMasterJourney();
    }

    let scrollTriggerInstance = null;
    let tl = null;
    let renderedWidth = 0;
    let renderedHeight = 0;
    let offsetX = 0;
    let offsetY = 0;
    const imageNaturalWidth = 2752;
    const imageNaturalHeight = 1536;
    const measuredGaps = {};

    // 8 Chapters configuration matrix
    const chapters = [
        {
            id: "intro",
            imageX: 0.50,
            imageY: 0.52,
            viewportX: 0.50,
            viewportY: 0.50,
            scale: 1.00,
            hotspot: null
        },
        {
            id: "crossroads",
            imageX: 0.55,
            imageY: 0.60,
            viewportX: 0.50,
            viewportY: 0.55,
            scale: 1.12,
            hotspot: null
        },
        {
            id: "ai",
            imageX: 0.15,
            imageY: 0.62,
            viewportX: 0.30,
            viewportY: 0.52,
            scale: 1.20,
            hotspot: { x: 0.08, y: 0.47, width: 0.16, height: 0.28 }
        },
        {
            id: "language",
            imageX: 0.35,
            imageY: 0.58,
            viewportX: 0.30,
            viewportY: 0.52,
            scale: 1.20,
            hotspot: { x: 0.28, y: 0.43, width: 0.15, height: 0.26 }
        },
        {
            id: "electric",
            imageX: 0.68,
            imageY: 0.46,
            viewportX: 0.70,
            viewportY: 0.50,
            scale: 1.20,
            hotspot: { x: 0.60, y: 0.33, width: 0.16, height: 0.28 }
        },
        {
            id: "library",
            imageX: 0.83,
            imageY: 0.55,
            viewportX: 0.70,
            viewportY: 0.52,
            scale: 1.20,
            hotspot: { x: 0.76, y: 0.42, width: 0.14, height: 0.25 }
        },
        {
            id: "media",
            imageX: 0.86,
            imageY: 0.76,
            viewportX: 0.70,
            viewportY: 0.55,
            scale: 1.22,
            hotspot: { x: 0.79, y: 0.64, width: 0.15, height: 0.24 }
        },
        {
            id: "outro",
            imageX: 0.50,
            imageY: 0.52,
            viewportX: 0.50,
            viewportY: 0.50,
            scale: 1.00,
            hotspot: null
        }
    ];

    function calculateCoverDimensions() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const baseScale = Math.max(viewportWidth / imageNaturalWidth, viewportHeight / imageNaturalHeight);

        renderedWidth = imageNaturalWidth * baseScale;
        renderedHeight = imageNaturalHeight * baseScale;

        offsetX = (viewportWidth - renderedWidth) / 2;
        offsetY = (viewportHeight - renderedHeight) / 2;
    }

    function getCameraCoords(imageX, imageY, viewportX, viewportY, scale) {
        const pointX = offsetX + imageX * renderedWidth;
        const pointY = offsetY + imageY * renderedHeight;

        const tx = (viewportX * window.innerWidth) - (pointX * scale);
        const ty = (viewportY * window.innerHeight) - (pointY * scale);

        return { x: tx, y: ty };
    }

    function getChapterCoords(chapter) {
        if (chapter.id === 'intro' || chapter.id === 'outro') {
            return { x: 0, y: 0, scale: 1.00 };
        }
        const coords = getCameraCoords(chapter.imageX, chapter.imageY, chapter.viewportX, chapter.viewportY, chapter.scale);
        return { x: coords.x, y: coords.y, scale: chapter.scale };
    }

    function initMasterJourney() {
        const isDesktop = window.innerWidth > 1024;
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const gsapAvailable = typeof gsap !== 'undefined';

        if (!gsapAvailable || !isDesktop || prefersReduced) {
            // Clean up and use simple static fallback
            document.documentElement.classList.remove('gsap-ready');
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        document.documentElement.classList.add('gsap-ready');

        // Setup MatchMedia to handle resizing/breakpoints
        const mm = gsap.matchMedia();

        mm.add("(min-width: 1025px)", () => {
            calculateCoverDimensions();
            createDebugHotspots();

            // Set initial state of camera scene
            gsap.set(".master-scene", {
                x: 0,
                y: 0,
                scale: 1.00
            });
            gsap.set(".chapter-callout", { autoAlpha: 0, pointerEvents: "none" });
            gsap.set(".callout-intro", { autoAlpha: 1, pointerEvents: "auto" });
            gsap.set(".scroll-cue", { autoAlpha: 1 });

            // Pinned timeline with 6x viewport runway
            tl = gsap.timeline({
                scrollTrigger: {
                    trigger: ".master-journey",
                    start: "top top",
                    end: "+=600%",
                    scrub: 0.5,
                    pin: ".master-camera",
                    pinSpacing: true,
                    invalidateOnRefresh: true,
                    onUpdate: () => {
                        performCollisionChecks();
                    }
                }
            });

            scrollTriggerInstance = tl.scrollTrigger;

            // Chapter 0 (Intro) -> Chapter 1 (Crossroads)
            tl.addLabel("intro")
              .to(".callout-intro", { autoAlpha: 0, duration: 1.0 })
              .to(".scroll-cue", { autoAlpha: 0, duration: 0.5 }, "-=1.0")
              .to(".master-scene", {
                  x: () => getChapterCoords(chapters[1]).x,
                  y: () => getChapterCoords(chapters[1]).y,
                  scale: chapters[1].scale,
                  duration: 2.0
              }, "-=0.8")
              .to(".callout-crossroads", { autoAlpha: 1, duration: 1.0 }, "-=0.5");

            // Chapter 1 (Crossroads) -> Chapter 2 (AI)
            tl.addLabel("crossroads")
              .to(".callout-crossroads", { autoAlpha: 0, duration: 1.0 })
              .to(".master-scene", {
                  x: () => getChapterCoords(chapters[2]).x,
                  y: () => getChapterCoords(chapters[2]).y,
                  scale: chapters[2].scale,
                  duration: 2.0
              }, "-=0.8")
              .to(".callout-ai", { autoAlpha: 1, duration: 1.0 }, "-=0.5");

            // Chapter 2 (AI) -> Chapter 3 (Language)
            tl.addLabel("ai")
              .to(".callout-ai", { autoAlpha: 0, duration: 1.0 })
              .to(".master-scene", {
                  x: () => getChapterCoords(chapters[3]).x,
                  y: () => getChapterCoords(chapters[3]).y,
                  scale: chapters[3].scale,
                  duration: 2.0
              }, "-=0.8")
              .to(".callout-language", { autoAlpha: 1, duration: 1.0 }, "-=0.5");

            // Chapter 3 (Language) -> Chapter 4 (Electric)
            tl.addLabel("language")
              .to(".callout-language", { autoAlpha: 0, duration: 1.0 })
              .to(".master-scene", {
                  x: () => getChapterCoords(chapters[4]).x,
                  y: () => getChapterCoords(chapters[4]).y,
                  scale: chapters[4].scale,
                  duration: 2.0
              }, "-=0.8")
              .to(".callout-electric", { autoAlpha: 1, duration: 1.0 }, "-=0.5");

            // Chapter 4 (Electric) -> Chapter 5 (Library)
            tl.addLabel("electric")
              .to(".callout-electric", { autoAlpha: 0, duration: 1.0 })
              .to(".master-scene", {
                  x: () => getChapterCoords(chapters[5]).x,
                  y: () => getChapterCoords(chapters[5]).y,
                  scale: chapters[5].scale,
                  duration: 2.0
              }, "-=0.8")
              .to(".callout-library", { autoAlpha: 1, duration: 1.0 }, "-=0.5");

            // Chapter 5 (Library) -> Chapter 6 (Media)
            tl.addLabel("library")
              .to(".callout-library", { autoAlpha: 0, duration: 1.0 })
              .to(".master-scene", {
                  x: () => getChapterCoords(chapters[6]).x,
                  y: () => getChapterCoords(chapters[6]).y,
                  scale: chapters[6].scale,
                  duration: 2.0
              }, "-=0.8")
              .to(".callout-media", { autoAlpha: 1, duration: 1.0 }, "-=0.5");

            // Chapter 6 (Media) -> Chapter 7 (Outro)
            tl.addLabel("media")
              .to(".callout-media", { autoAlpha: 0, duration: 1.0 })
              .to(".master-scene", {
                  x: () => getChapterCoords(chapters[7]).x,
                  y: () => getChapterCoords(chapters[7]).y,
                  scale: chapters[7].scale,
                  duration: 2.0
              }, "-=0.8")
              .to(".callout-outro", { autoAlpha: 1, duration: 1.0 }, "-=0.5");

            tl.addLabel("outro")
              .to(".callout-outro", { autoAlpha: 0, duration: 1.0 });

            // Resize listener wrapper inside MatchMedia context
            window.addEventListener('resize', onWindowResize);

            return () => {
                window.removeEventListener('resize', onWindowResize);
                scrollTriggerInstance = null;
                tl = null;
                document.documentElement.classList.remove('gsap-ready');
                gsap.killTweensOf("*");
                gsap.set([".master-scene", ".master-scene-image", ".chapter-callout", ".scroll-cue"], { clearProps: "all" });
                removeDebugHotspots();
            };
        });
    }

    function onWindowResize() {
        calculateCoverDimensions();
        updateDebugHotspots();
        if (scrollTriggerInstance) {
            scrollTriggerInstance.refresh();
        }
    }

    // Dynamic scroll destination calculated by fraction
    function scrollToJourneyChapter(chapterId) {
        if (!scrollTriggerInstance || !tl) return;
        const labelTime = tl.labels[chapterId];
        if (labelTime === undefined) return;

        const totalDuration = tl.totalDuration();
        const fraction = labelTime / totalDuration;

        const start = scrollTriggerInstance.start;
        const end = scrollTriggerInstance.end;
        const targetScroll = start + (end - start) * fraction;

        window.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
        });
    }

    // QA Collision and Gap Measurement Checks
    function performCollisionChecks() {
        const curX = gsap.getProperty(".master-scene", "x") || 0;
        const curY = gsap.getProperty(".master-scene", "y") || 0;
        const curScale = gsap.getProperty(".master-scene", "scale") || 1.0;

        chapters.forEach(c => {
            if (!c.hotspot) return;

            const calloutEl = document.querySelector(`.callout-${c.id}`);
            if (!calloutEl) return;

            // Only run comparison when the callout is visibly active
            const opacity = parseFloat(window.getComputedStyle(calloutEl).opacity);
            if (opacity < 0.2) return;

            const calloutRect = calloutEl.getBoundingClientRect();

            // Calculate hotspot position in viewport space
            const hLeft = (offsetX + c.hotspot.x * renderedWidth) * curScale + curX;
            const hTop = (offsetY + c.hotspot.y * renderedHeight) * curScale + curY;
            const hWidth = c.hotspot.width * renderedWidth * curScale;
            const hHeight = c.hotspot.height * renderedHeight * curScale;

            const hotspotRect = {
                left: hLeft,
                top: hTop,
                right: hLeft + hWidth,
                bottom: hTop + hHeight
            };

            const intersects = !(
                hotspotRect.right < calloutRect.left ||
                hotspotRect.left > calloutRect.right ||
                hotspotRect.bottom < calloutRect.top ||
                hotspotRect.top > calloutRect.bottom
            );

            let gapX = 0;
            if (hotspotRect.right < calloutRect.left) {
                gapX = calloutRect.left - hotspotRect.right;
            } else if (calloutRect.right < hotspotRect.left) {
                gapX = hotspotRect.left - calloutRect.right;
            }

            let gapY = 0;
            if (hotspotRect.bottom < calloutRect.top) {
                gapY = calloutRect.top - hotspotRect.bottom;
            } else if (calloutRect.bottom < hotspotRect.top) {
                gapY = hotspotRect.top - calloutRect.bottom;
            }

            // Real physical gap
            const gap = Math.max(gapX, gapY);

            measuredGaps[c.id] = {
                intersects,
                gap,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight
            };

            // Expose values globally for verification runner
            window.__measuredGaps = measuredGaps;
        });
    }

    // Helper functions for visual debug hotspots
    function createDebugHotspots() {
        const sceneEl = document.querySelector('.master-scene');
        if (!sceneEl) return;

        chapters.forEach(c => {
            if (!c.hotspot) return;
            const d = document.createElement('div');
            d.className = 'debug-hotspot';
            d.id = `debug-hotspot-${c.id}`;
            sceneEl.appendChild(d);
        });
        updateDebugHotspots();
    }

    // Update debug hotspot layout coordinates in map scale
    function updateDebugHotspots() {
        chapters.forEach(c => {
            if (!c.hotspot) return;
            const d = document.getElementById(`debug-hotspot-${c.id}`);
            if (d) {
                const hLeft = offsetX + c.hotspot.x * renderedWidth;
                const hTop = offsetY + c.hotspot.y * renderedHeight;
                const hWidth = c.hotspot.width * renderedWidth;
                const hHeight = c.hotspot.height * renderedHeight;

                d.style.left = `${hLeft}px`;
                d.style.top = `${hTop}px`;
                d.style.width = `${hWidth}px`;
                d.style.height = `${hHeight}px`;
            }
        });
    }

    function removeDebugHotspots() {
        document.querySelectorAll('.debug-hotspot').forEach(el => el.remove());
    }

    // 3. Central Click Event Handlers
    document.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('[data-journey-target]');
        if (targetBtn) {
            const targetId = targetBtn.getAttribute('data-journey-target');
            if (document.documentElement.classList.contains('gsap-ready')) {
                e.preventDefault();
                scrollToJourneyChapter(targetId);
            } else {
                const contentStart = document.querySelector('#content-start');
                if (contentStart) {
                    e.preventDefault();
                    contentStart.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
    });

    const anchorMap = {
        '#asistenti': 'ai',
        '#nastroje': 'language',
        '#vysledky': 'library',
        '#metodiky': 'language',
        '#elektrikar': 'electric',
        '#generator': 'library',
        '#presentation': 'library',
        '#audiovideo': 'media'
    };

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (!targetId || targetId === '#') return;

            if (document.documentElement.classList.contains('gsap-ready')) {
                const mappedChapter = anchorMap[targetId];
                if (mappedChapter) {
                    e.preventDefault();
                    scrollToJourneyChapter(mappedChapter);
                    return;
                }
            }

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

                try {
                    target.focus({ preventScroll: true });
                } catch (err) {
                    target.focus();
                }

                target.scrollIntoView({
                    behavior: isReduced ? 'auto' : 'smooth',
                    block: 'start'
                });
            }
        });
    });
});
