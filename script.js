document.addEventListener('DOMContentLoaded', () => {
    // Feature item entrance is now handled by immersive.js via IntersectionObserver.
    // This block only runs as a fallback if immersive.js did not load or did not
    // add the .immersive-ready class (which takes over feature animations).
    const isImmersiveReady = document.documentElement.classList.contains('immersive-ready');

    if (!isImmersiveReady) {
        // Original stagger animation – simple setTimeout fallback
        const features = document.querySelectorAll('.feature-item');

        features.forEach((feature, index) => {
            feature.style.opacity = '0';
            feature.style.transform = 'translateY(20px)';
            feature.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

            setTimeout(() => {
                feature.style.opacity = '1';
                feature.style.transform = 'translateY(0)';
            }, 500 + (index * 150));
        });
    }

    // Smooth scroll for anchors with programmatic focus and reduced motion support
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
                const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

                // Scroll to target
                target.scrollIntoView({
                    behavior: isReduced ? 'auto' : 'smooth',
                    block: 'start'
                });

                // Update URL hash without jumping
                if (history.pushState) {
                    history.pushState(null, null, targetId);
                } else {
                    window.location.hash = targetId;
                }

                // Programmatic focus shift for accessibility
                target.focus();
            }
        });
    });
});
