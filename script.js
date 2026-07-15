document.addEventListener('DOMContentLoaded', () => {
    // 1. Detect user preferences and library availability
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = window.innerWidth > 1024;
    const gsapAvailable = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

    let scrollTriggerInstance = null;

    // 2. Initialize GSAP ScrollTrigger if supported and on desktop
    if (gsapAvailable && isDesktop && !prefersReduced) {
        gsap.registerPlugin(ScrollTrigger);
        document.documentElement.classList.add('gsap-ready');

        // Setup matchMedia to handle resize and layout changes gracefully
        const mm = gsap.matchMedia();

        mm.add("(min-width: 1025px)", () => {
            // Initial states for animated layers
            gsap.set(".char-eduobot", { opacity: 0, scale: 0.5, y: 100 });
            gsap.set(".char-signpost", { opacity: 0, scale: 0.5, y: 100 });
            gsap.set(".theme-world", { autoAlpha: 0, scale: 0.8, y: 50 });
            gsap.set(".scene-outro-panel", { autoAlpha: 0, scale: 0.8, y: 50 });
            gsap.set(".scroll-cue", { autoAlpha: 1 });

            // Create pinned cinematic scroll timeline
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: ".immersive-scroll-space",
                    start: "top top",
                    end: "+=700%", // Slightly longer for the extra outro chapter (7x viewport height)
                    scrub: 0.5,
                    pin: ".immersive-scene",
                    pinSpacing: true,
                    invalidateOnRefresh: true
                }
            });

            // Save reference for custom scroll navigation
            scrollTriggerInstance = tl.scrollTrigger;

            // Chapter 0 -> 1: Intro Hero Fades Out, Characters slide up, Hide scroll cue
            tl.to(".scene-intro", { opacity: 0, scale: 0.9, y: -30, duration: 1.5 })
              .to(".scroll-cue", { autoAlpha: 0, duration: 1 }, "-=1.5")
              .to(".char-eduobot", { opacity: 1, scale: 1, y: 0, duration: 2 }, "-=1.2")
              .to(".char-signpost", { opacity: 1, scale: 1, y: 0, duration: 2 }, "-=1.8")
              .to(".bg-img", { scale: 1.02, duration: 2 }, "-=2");

            // Chapter 1 -> 2: AI & Assistants World enters
            tl.to([".char-eduobot", ".char-signpost"], { opacity: 0.05, scale: 0.7, y: -50, duration: 2 })
              .to(".world-ai", { autoAlpha: 1, scale: 1, y: 0, duration: 2 }, "-=1.5");

            // Chapter 2 -> 3: Language World enters
            tl.to(".world-ai", { autoAlpha: 0, scale: 1.2, y: -50, duration: 2 })
              .to(".world-language", { autoAlpha: 1, scale: 1, y: 0, duration: 2 }, "-=1.5");

            // Chapter 3 -> 4: Electric World enters
            tl.to(".world-language", { autoAlpha: 0, scale: 1.2, y: -50, duration: 2 })
              .to(".world-electric", { autoAlpha: 1, scale: 1, y: 0, duration: 2 }, "-=1.5");

            // Chapter 4 -> 5: Library World (Materials) enters
            tl.to(".world-electric", { autoAlpha: 0, scale: 1.2, y: -50, duration: 2 })
              .to(".world-library", { autoAlpha: 1, scale: 1, y: 0, duration: 2 }, "-=1.5");

            // Chapter 5 -> 6: Media World (Audio/Video) enters
            tl.to(".world-library", { autoAlpha: 0, scale: 1.2, y: -50, duration: 2 })
              .to(".world-media", { autoAlpha: 1, scale: 1, y: 0, duration: 2 }, "-=1.5");

            // Chapter 6 -> 7: Outro Panel enters
            tl.to(".world-media", { autoAlpha: 0, scale: 1.2, y: -50, duration: 2 })
              .to(".scene-outro-panel", { autoAlpha: 1, scale: 1, y: 0, duration: 2 }, "-=1.5");

            // Chapter 7 -> Exit: Return to full view (zoom out) and fade outro panel
            tl.to(".scene-outro-panel", { autoAlpha: 0, scale: 1.1, y: -35, duration: 2 })
              .to([".char-eduobot", ".char-signpost"], { opacity: 0.4, scale: 0.9, y: 0, duration: 2 }, "-=1.5")
              .to(".bg-img", { scale: 1.0, duration: 2 }, "-=2");

            return () => {
                // Cleanup on matchMedia destroy
                scrollTriggerInstance = null;
                document.documentElement.classList.remove('gsap-ready');
                // Revert all GSAP inline styles to prevent layout blocking in mobile view
                gsap.killTweensOf("*");
                gsap.set([".theme-world", ".scene-intro", ".scene-outro-panel", ".char-eduobot", ".char-signpost", ".bg-img", ".scroll-cue"], { clearProps: "all" });
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
                    scrollToCinematicPhase(0.24);
                    return;
                } else if (targetId === '#world-language') {
                    e.preventDefault();
                    scrollToCinematicPhase(0.38);
                    return;
                } else if (targetId === '#world-electric') {
                    e.preventDefault();
                    scrollToCinematicPhase(0.51);
                    return;
                } else if (targetId === '#world-library') {
                    e.preventDefault();
                    scrollToCinematicPhase(0.64);
                    return;
                } else if (targetId === '#world-media') {
                    e.preventDefault();
                    scrollToCinematicPhase(0.77);
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
