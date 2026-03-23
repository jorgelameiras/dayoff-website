// DayOff — Main JavaScript / TypeScript
// Handles: loader, nav scroll, mobile nav, reveal animations, FAQ, contact form

// Loader
    window.addEventListener('load', () => {
        setTimeout(() => {
            document.getElementById('loader').classList.add('hidden');
        }, 1800);
    });

    // Nav scroll effect
    const nav = document.getElementById('nav');
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Mobile nav toggle
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    navToggle.addEventListener('click', () => {
        const open = navLinks.classList.toggle('open');
        navToggle.classList.toggle('active', open);
        navToggle.setAttribute('aria-expanded', open);
        document.body.style.overflow = open ? 'hidden' : '';
    });
    navLinks.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            navLinks.classList.remove('open');
            navToggle.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        });
    });

    // Reveal on scroll
    const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
                observer.unobserve(e.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => observer.observe(el));

    // Particles
    const particleContainer = document.getElementById('particles');
    for (let i = 0; i < 18; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 3 + 1;
        p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;animation-duration:${Math.random()*15+10}s;animation-delay:-${Math.random()*20}s;opacity:${Math.random()*0.3+0.1}`;
        particleContainer.appendChild(p);
    }

    // Steps line animation
    const stepsLine = document.getElementById('stepsLine');
    if (stepsLine) {
        const stepsObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) stepsLine.classList.add('animated');
        }, { threshold: 0.5 });
        stepsObserver.observe(stepsLine);
    }

    // Active nav links
    const sections = document.querySelectorAll('section[id]');
    const navAnchors = document.querySelectorAll('.nav-links a');
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(s => {
            if (window.scrollY >= s.offsetTop - 120) current = s.id;
        });
        navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + current));
    });

    // Contact form
    async function handleSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        btn.classList.add('loading');
        btn.disabled = true;
        const form = document.getElementById('contactForm');
        try {
            const payload = {
                name: form.querySelector('[name=name]').value,
                email: form.querySelector('[name=email]').value,
                phone: form.querySelector('[name=phone]').value,
                units: form.querySelector('[name=units]').value,
                city: form.querySelector('[name=city]').value,
                message: form.querySelector('[name=message]').value,
            };
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                form.style.display = 'none';
                document.getElementById('formSuccess').classList.add('visible');
            } else {
                alert('Something went wrong. Please email info@dayoffac.com directly.');
            }
        } catch(err) {
            alert('Network error. Please email info@dayoffac.com directly.');
        }
        btn.classList.remove('loading');
        btn.disabled = false;
    }