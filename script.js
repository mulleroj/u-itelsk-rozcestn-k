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

    // Smooth scroll for anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
