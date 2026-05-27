document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // 1. Navigation Header Scroll Effect & Active Link Highlight
    // ==========================================================================
    const header = document.querySelector('.header');
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        // Add shadow/glass background on scroll
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Active link highlighting based on current section viewport
        let currentSectionId = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    });

    // ==========================================================================
    // 2. Mobile Menu Toggle Action
    // ==========================================================================
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    const menuIcon = menuToggle.querySelector('i');

    menuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        
        // Change icon bars to close cross representation
        if (navMenu.classList.contains('active')) {
            menuIcon.classList.remove('fa-bars');
            menuIcon.classList.add('fa-xmark');
        } else {
            menuIcon.classList.remove('fa-xmark');
            menuIcon.classList.add('fa-bars');
        }
    });

    // Close menu when clicking links in mobile menu
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            menuIcon.classList.remove('fa-xmark');
            menuIcon.classList.add('fa-bars');
        });
    });

    // ==========================================================================
    // 3. Scroll Reveal Animation using Intersection Observer
    // ==========================================================================
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Unobserve once shown to prevent redundant calculations
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15, // trigger when 15% of the element is visible
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(element => {
        revealObserver.observe(element);
    });

    // ==========================================================================
    // 4. Email Clipboard Copy Action & Toast Alert
    // ==========================================================================
    const emailAddress = document.getElementById('email-address');
    const copyBtn = document.getElementById('copy-email-btn');
    const toast = document.getElementById('toast');

    const copyEmailToClipboard = () => {
        const textToCopy = emailAddress.textContent.trim();
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            // Show toast notification
            toast.classList.add('show');
            
            // Hide toast after 3 seconds
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }).catch(err => {
            console.error('이메일 복사 실패:', err);
        });
    };

    // Trigger copy on either click of text or click of button
    emailAddress.addEventListener('click', copyEmailToClipboard);
    copyBtn.addEventListener('click', copyEmailToClipboard);

    // ==========================================================================
    // 5. Gallery Lightbox Modal Popup Functionality
    // ==========================================================================
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const zoomButtons = document.querySelectorAll('.btn-zoom');

    zoomButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent triggering other overlay actions
            const imageSrc = button.getAttribute('data-image');
            lightboxImg.setAttribute('src', imageSrc);
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden'; // block scrolling behind modal
        });
    });

    const closeLightbox = () => {
        lightbox.classList.remove('active');
        document.body.style.overflow = ''; // restore scrolling
        setTimeout(() => {
            lightboxImg.setAttribute('src', '');
        }, 300);
    };

    lightboxClose.addEventListener('click', closeLightbox);
    
    // Close lightbox modal when clicking backdrop area outside the image
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Close lightbox on pressing 'Escape' key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });
});
