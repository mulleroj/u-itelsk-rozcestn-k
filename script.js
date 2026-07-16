document.addEventListener('DOMContentLoaded', () => {
    // 1. Detect user preferences and library availability
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = window.innerWidth > 1024;
    const gsapAvailable = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

    let scrollTriggerInstance = null;

    // Mathematical camera positioning function (stage size 200vw x 140vh)
    function getCameraCoords(nodePctX, nodePctY, targetPctX, targetPctY, scale) {
        const stageWidth = window.innerWidth * 2.0;
        const stageHeight = window.innerHeight * 1.4;
        const nodeX = stageWidth * nodePctX;
        const nodeY = stageHeight * nodePctY;
        const targetX = window.innerWidth * targetPctX;
        const targetY = window.innerHeight * targetPctY;
        return {
            x: targetX - nodeX * scale,
            y: targetY - nodeY * scale
        };
    }

    // 2. Initialize GSAP ScrollTrigger if supported and on desktop
    if (gsapAvailable && isDesktop && !prefersReduced) {
        gsap.registerPlugin(ScrollTrigger);
        document.documentElement.classList.add('gsap-ready');

        // Setup matchMedia to handle resize and layout changes gracefully
        const mm = gsap.matchMedia();

        mm.add("(min-width: 1025px)", () => {
            // Initial states for animated layers on spatial canvas
            gsap.set(".world-stage", {
                x: () => getCameraCoords(0.50, 0.50, 0.50, 0.50, 0.95).x,
                y: () => getCameraCoords(0.50, 0.50, 0.50, 0.50, 0.95).y,
                scale: 0.95
            });
            gsap.set(".scene-crossroads", { autoAlpha: 0, scale: 0.8, y: 50 });

            // Clean initial state for worlds to clean up intro scene view
            gsap.set(".world-node", {
                opacity: 0.14,
                filter: "brightness(0.45) saturate(0.6) blur(2px)",
                zIndex: 4
            });
            // Setup precise individual scale attributes
            gsap.set(".world-ai", { scale: 0.90 });
            gsap.set(".world-language", { scale: 0.72 });
            gsap.set(".world-electric", { scale: 0.90 });
            gsap.set(".world-library", { scale: 0.72 });
            gsap.set(".world-media", { scale: 0.60 });

            // Viewport background initial scale
            gsap.set(".scene-background", { xPercent: 0, yPercent: 0, scale: 1.03 });

            gsap.set(".chapter-callout", { autoAlpha: 0, pointerEvents: "none" });
            gsap.set(".callout-intro", { autoAlpha: 1, pointerEvents: "auto" });
            gsap.set(".scroll-cue", { autoAlpha: 1 });

            // Create pinned cinematic scroll timeline
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: ".immersive-scroll-space",
                    start: "top top",
                    end: "+=700%", // 7x viewport height scroll runway
                    scrub: 0.5,
                    pin: ".immersive-camera",
                    pinSpacing: true,
                    invalidateOnRefresh: true
                }
            });

            // Save reference for custom scroll navigation
            scrollTriggerInstance = tl.scrollTrigger;

            // Chapter 0 -> 1: Intro Fades Out, Crossroads slide up
            tl.to(".callout-intro", { autoAlpha: 0, pointerEvents: "none", duration: 1.0 })
              .to(".scroll-cue", { autoAlpha: 0, duration: 1.0 }, "-=1.0")
              .to(".world-node", { opacity: 0.35, filter: "brightness(0.6) saturate(0.6) blur(1px)", duration: 1.0 }, "-=1.0")
              .to(".world-stage", {
                  x: () => getCameraCoords(0.50, 0.62, 0.50, 0.55, 1.12).x,
                  y: () => getCameraCoords(0.50, 0.62, 0.50, 0.55, 1.12).y,
                  scale: 1.12,
                  duration: 1.5
              }, "-=0.8")
              .to(".scene-crossroads", { autoAlpha: 1, scale: 1, y: 0, duration: 1.2 }, "-=1.2")
              // Viewport background parallax shift
              .to(".scene-background", { xPercent: 0, yPercent: -1.5, scale: 1.05, duration: 1.5 }, "-=1.5");

            // Chapter 1 -> 2: AI World (Visual Left, Callout Right)
            tl.to(".scene-crossroads", { autoAlpha: 0, scale: 0.75, y: -50, duration: 1.0 })
              .to(".world-stage", {
                  x: () => getCameraCoords(0.27, 0.50, 0.30, 0.52, 1.40).x,
                  y: () => getCameraCoords(0.27, 0.50, 0.30, 0.52, 1.40).y,
                  scale: 1.40,
                  duration: 1.5
              }, "-=0.8")
              .to(".world-ai", { opacity: 1.0, filter: "brightness(1.15) saturate(1.0) drop-shadow(0 0 45px rgba(211, 158, 0, 0.25))", scale: 0.97, zIndex: 5, duration: 0.5 }, "-=0.5")
              .to(".callout-ai", { autoAlpha: 1, pointerEvents: "auto", duration: 1.0 }, "-=0.3")
              .to(".scene-background", { xPercent: -2, yPercent: -1, scale: 1.07, duration: 1.5 }, "-=1.5");

            // Chapter 2 -> 3: Language World (Visual Left, Callout Right)
            tl.to(".callout-ai", { autoAlpha: 0, pointerEvents: "none", duration: 1.0 })
              .to(".world-ai", { opacity: 0.35, filter: "brightness(0.6) saturate(0.6) blur(1px)", scale: 0.90, zIndex: 4, duration: 0.5 }, "-=1.0")
              .to(".world-stage", {
                  x: () => getCameraCoords(0.18, 0.34, 0.30, 0.52, 1.45).x,
                  y: () => getCameraCoords(0.18, 0.34, 0.30, 0.52, 1.45).y,
                  scale: 1.45,
                  duration: 1.5
              }, "-=0.8")
              .to(".world-language", { opacity: 1.0, filter: "brightness(1.15) saturate(1.0) drop-shadow(0 0 45px rgba(211, 158, 0, 0.25))", scale: 0.77, zIndex: 5, duration: 0.5 }, "-=0.5")
              .to(".callout-language", { autoAlpha: 1, pointerEvents: "auto", duration: 1.0 }, "-=0.3")
              .to(".scene-background", { xPercent: -3, yPercent: 1.5, scale: 1.08, duration: 1.5 }, "-=1.5");

            // Chapter 3 -> 4: Electric World (Callout Left, Visual Right)
            tl.to(".callout-language", { autoAlpha: 0, pointerEvents: "none", duration: 1.0 })
              .to(".world-language", { opacity: 0.35, filter: "brightness(0.6) saturate(0.6) blur(1px)", scale: 0.72, zIndex: 4, duration: 0.5 }, "-=1.0")
              .to(".world-stage", {
                  x: () => getCameraCoords(0.48, 0.28, 0.70, 0.52, 1.40).x,
                  y: () => getCameraCoords(0.48, 0.28, 0.70, 0.52, 1.40).y,
                  scale: 1.40,
                  duration: 1.5
              }, "-=0.8")
              .to(".world-electric", { opacity: 1.0, filter: "brightness(1.15) saturate(1.0) drop-shadow(0 0 45px rgba(211, 158, 0, 0.25))", scale: 0.97, zIndex: 5, duration: 0.5 }, "-=0.5")
              .to(".callout-electric", { autoAlpha: 1, pointerEvents: "auto", duration: 1.0 }, "-=0.3")
              .to(".scene-background", { xPercent: 1, yPercent: 2, scale: 1.07, duration: 1.5 }, "-=1.5");

            // Chapter 4 -> 5: Library World (Callout Left, Visual Right)
            tl.to(".callout-electric", { autoAlpha: 0, pointerEvents: "none", duration: 1.0 })
              .to(".world-electric", { opacity: 0.35, filter: "brightness(0.6) saturate(0.6) blur(1px)", scale: 0.90, zIndex: 4, duration: 0.5 }, "-=1.0")
              .to(".world-stage", {
                  x: () => getCameraCoords(0.72, 0.34, 0.70, 0.52, 1.45).x,
                  y: () => getCameraCoords(0.72, 0.34, 0.70, 0.52, 1.45).y,
                  scale: 1.45,
                  duration: 1.5
              }, "-=0.8")
              .to(".world-library", { opacity: 1.0, filter: "brightness(1.15) saturate(1.0) drop-shadow(0 0 45px rgba(211, 158, 0, 0.25))", scale: 0.77, zIndex: 5, duration: 0.5 }, "-=0.5")
              .to(".callout-library", { autoAlpha: 1, pointerEvents: "auto", duration: 1.0 }, "-=0.3")
              .to(".scene-background", { xPercent: 2.5, yPercent: 1, scale: 1.08, duration: 1.5 }, "-=1.5");

            // Chapter 5 -> 6: Media World (Visual Left, Callout Right)
            tl.to(".callout-library", { autoAlpha: 0, pointerEvents: "none", duration: 1.0 })
              .to(".world-library", { opacity: 0.35, filter: "brightness(0.6) saturate(0.6) blur(1px)", scale: 0.72, zIndex: 4, duration: 0.5 }, "-=1.0")
              .to(".world-stage", {
                  x: () => getCameraCoords(0.84, 0.18, 0.30, 0.52, 1.50).x,
                  y: () => getCameraCoords(0.84, 0.18, 0.30, 0.52, 1.50).y,
                  scale: 1.50,
                  duration: 1.5
              }, "-=0.8")
              .to(".world-media", { opacity: 1.0, filter: "brightness(1.15) saturate(1.0) drop-shadow(0 0 45px rgba(211, 158, 0, 0.25))", scale: 0.65, zIndex: 5, duration: 0.5 }, "-=0.5")
              .to(".callout-media", { autoAlpha: 1, pointerEvents: "auto", duration: 1.0 }, "-=0.3")
              .to(".scene-background", { xPercent: 3, yPercent: -2, scale: 1.08, duration: 1.5 }, "-=1.5");

            // Chapter 6 -> 7: Outro Panel enters
            tl.to(".callout-media", { autoAlpha: 0, pointerEvents: "none", duration: 1.0 })
              .to(".world-media", { opacity: 0.35, filter: "brightness(0.6) saturate(0.6) blur(1px)", scale: 0.60, zIndex: 4, duration: 0.5 }, "-=1.0")
              .to(".world-stage", {
                  x: () => getCameraCoords(0.50, 0.40, 0.50, 0.45, 0.95).x,
                  y: () => getCameraCoords(0.50, 0.40, 0.50, 0.45, 0.95).y,
                  scale: 0.95,
                  duration: 1.5
              }, "-=0.8")
              .to(".callout-outro", { autoAlpha: 1, pointerEvents: "auto", duration: 1.2 }, "-=0.5")
              .to(".scene-background", { xPercent: 0, yPercent: 0, scale: 1.03, duration: 1.5 }, "-=1.5");

            // Final Outro Exit: fade outro panel
            tl.to(".callout-outro", { autoAlpha: 0, pointerEvents: "none", duration: 1.0 });

            return () => {
                // Cleanup on matchMedia destroy
                scrollTriggerInstance = null;
                document.documentElement.classList.remove('gsap-ready');
                // Revert all GSAP inline styles to prevent layout blocking in mobile view
                gsap.killTweensOf("*");
                gsap.set([".world-stage", ".scene-background", ".scene-crossroads", ".world-node", ".chapter-callout", ".bg-img", ".scroll-cue"], { clearProps: "all" });
            };
        });
    }

    // 3. Helper function to scroll to a specific cinematic phase smoothly
    function scrollToCinematicPhase(fraction) {
        if (!scrollTriggerInstance) return;
        const start = scrollTriggerInstance.start;
        const end = scrollTriggerInstance.end;
        const targetScroll = start + (end - start) * fraction;
        window.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
        });
    }

    // 4. Central Smooth Scroll Anchor Event Listeners
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (!targetId || targetId === '#') return;

            // Direct cinematic phase scroll on desktop
            if (document.documentElement.classList.contains('gsap-ready')) {
                if (targetId === '#world-ai') {
                    e.preventDefault();
                    scrollToCinematicPhase(0.28);
                    return;
                } else if (targetId === '#world-language') {
                    e.preventDefault();
                    scrollToCinematicPhase(0.42);
                    return;
                } else if (targetId === '#world-electric') {
                    e.preventDefault();
                    scrollToCinematicPhase(0.56);
                    return;
                } else if (targetId === '#world-library') {
                    e.preventDefault();
                    scrollToCinematicPhase(0.70);
                    return;
                } else if (targetId === '#world-media') {
                    e.preventDefault();
                    scrollToCinematicPhase(0.84);
                    return;
                }
            }

            // Normal scroll for skip-link or mobile links
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

                // Update URL hash without jumping
                if (history.pushState) {
                    history.pushState(null, null, targetId);
                } else {
                    window.location.hash = targetId;
                }

                // Programmatic focus shift for accessibility
                try {
                    target.focus({ preventScroll: true });
                } catch (err) {
                    target.focus(); // Fallback for older engines
                }

                // Scroll into view
                target.scrollIntoView({
                    behavior: isReduced ? 'auto' : 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // 5. IntersectionObserver for lower cards progressive fade-in
    const grid = document.querySelector('.features-grid');
    if (grid && 'IntersectionObserver' in window) {
        grid.classList.add('animation-active');
        const items = grid.querySelectorAll('.feature-item');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('item-visible');
                }
            });
        }, { threshold: 0.1 });

        items.forEach(item => observer.observe(item));
    }

    // 6. Refresh ScrollTrigger once images are fully loaded
    window.addEventListener('load', () => {
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }
    });
});
