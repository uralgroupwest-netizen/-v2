document.addEventListener('DOMContentLoaded', () => {
  // --- Sticky Header and Scroll Tracking ---
  const header = document.querySelector('.header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // --- Mobile Menu ---
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      mobileNav.classList.toggle('active');
      hamburger.classList.toggle('active');
      
      // Animate hamburger lines
      const spans = hamburger.querySelectorAll('span');
      if (hamburger.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(6px, -6px)';
      } else {
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
      }
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('active');
        hamburger.classList.remove('active');
        const spans = hamburger.querySelectorAll('span');
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
      });
    });
  }

  // --- Reveal on Scroll (Intersection Observer) ---
  const revealElements = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // --- Metric Counters Animation ---
  const statNumbers = document.querySelectorAll('.stat-num-anim');
  const animateCounter = (el) => {
    const target = parseInt(el.getAttribute('data-target'), 10);
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 1500; // ms
    const startTime = performance.now();

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad
      const easeProgress = progress * (2 - progress);
      const current = Math.floor(easeProgress * target);

      el.textContent = current + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = target + suffix;
      }
    };
    requestAnimationFrame(update);
  };

  const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(num => counterObserver.observe(num));

  // --- Cases Tab Filtering ---
  const tabButtons = document.querySelectorAll('.tab-btn');
  const caseCards = document.querySelectorAll('.case-card');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all tabs
      tabButtons.forEach(b => b.classList.remove('active'));
      // Add active to current
      btn.classList.add('active');

      const targetTab = btn.getAttribute('data-tab');
      trackAnalyticsEvent(`scroll_to_cases_filter_${targetTab}`);

      caseCards.forEach(card => {
        if (targetTab === 'all') {
          card.style.display = 'flex';
          card.style.animation = 'fadeIn 0.4s ease-out';
        } else {
          if (card.classList.contains(`${targetTab}-case`)) {
            card.style.display = 'flex';
            card.style.animation = 'fadeIn 0.4s ease-out';
          } else {
            card.style.display = 'none';
          }
        }
      });
    });
  });

  // --- Testimonials Slider ---
  const testimonialCards = document.querySelectorAll('.testimonial-card');
  const sliderDots = document.querySelectorAll('.slider-dot');
  const prevBtn = document.querySelector('.slider-btn.prev');
  const nextBtn = document.querySelector('.slider-btn.next');
  let currentTestimonial = 0;

  const showTestimonial = (index) => {
    testimonialCards.forEach(card => card.classList.remove('active'));
    sliderDots.forEach(dot => dot.classList.remove('active'));

    testimonialCards[index].classList.add('active');
    sliderDots[index].classList.add('active');
    currentTestimonial = index;
  };

  if (testimonialCards.length > 0) {
    sliderDots.forEach((dot, index) => {
      dot.addEventListener('click', () => showTestimonial(index));
    });

    if (prevBtn && nextBtn) {
      prevBtn.addEventListener('click', () => {
        let index = currentTestimonial - 1;
        if (index < 0) index = testimonialCards.length - 1;
        showTestimonial(index);
      });

      nextBtn.addEventListener('click', () => {
        let index = currentTestimonial + 1;
        if (index >= testimonialCards.length) index = 0;
        showTestimonial(index);
      });
    }
  }

  // --- Exclusivity Timer/Spot Counter ---
  // Simple simulation that changes spots left from time to time or keeps it stable at 3.
  const spotsElement = document.querySelector('.spots-count');
  if (spotsElement) {
    let count = 3;
    // Every 45 seconds there's a 10% chance it decreases to simulate urgency, but not below 1
    setInterval(() => {
      if (count > 1 && Math.random() < 0.1) {
        count--;
        spotsElement.textContent = count;
        spotsElement.style.color = '#ef4444';
        setTimeout(() => { spotsElement.style.color = '#FFFFFF'; }, 1000);
      }
    }, 45000);
  }

  // --- Interactive Quiz Logic ---
  const quizForm = document.getElementById('efimov-quiz-form');
  const quizSteps = document.querySelectorAll('.quiz-step');
  const progressFill = document.querySelector('.quiz-progress-fill');
  const progressStepText = document.querySelector('.quiz-progress-step');
  const prevStepBtn = document.getElementById('quiz-prev-btn');
  const nextStepBtn = document.getElementById('quiz-next-btn');
  const quizSuccess = document.querySelector('.quiz-success');
  const quizInnerContainer = document.getElementById('quiz-inner-container');

  let currentStepIndex = 0;
  let selectedDept = ''; // 'tech', 'consult', 'urban'
  let selectedAnswers = {
    dept: '',
    detail: '',
    name: '',
    phone: '',
    contactMethod: 'Telegram'
  };

  const updateQuizUI = () => {
    // Show/hide steps
    quizSteps.forEach((step, idx) => {
      if (idx === currentStepIndex) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });

    // Update progress bar
    const totalSteps = 3;
    const progressPercent = ((currentStepIndex + 1) / totalSteps) * 100;
    progressFill.style.width = `${progressPercent}%`;
    progressStepText.textContent = `Шаг ${currentStepIndex + 1} из ${totalSteps}`;

    // Navigation buttons visibility
    if (currentStepIndex === 0) {
      prevStepBtn.style.visibility = 'hidden';
      nextStepBtn.textContent = 'Далее →';
    } else if (currentStepIndex === 2) {
      prevStepBtn.style.visibility = 'visible';
      nextStepBtn.textContent = 'Отправить заявку ✓';
    } else {
      prevStepBtn.style.visibility = 'visible';
      nextStepBtn.textContent = 'Далее →';
    }
  };

  // Step 1: Department selection
  const deptOptions = document.querySelectorAll('.quiz-option[data-dept]');
  deptOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      deptOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedDept = opt.getAttribute('data-dept');
      selectedAnswers.dept = selectedDept;
      
      // Update dynamic questions in Step 2
      updateDynamicQuestion(selectedDept);
      
      // Enable next navigation
      nextStepBtn.removeAttribute('disabled');
    });
  });

  // Step 2 Question Generation
  const updateDynamicQuestion = (dept) => {
    const questionEl = document.getElementById('quiz-step2-question');
    const optionsEl = document.getElementById('quiz-step2-options');
    
    // Clear previous options
    optionsEl.innerHTML = '';

    let questionText = '';
    let options = [];

    if (dept === 'tech') {
      questionText = 'Какая ситуация с CRM-системой у вас сейчас?';
      options = [
        { val: 'no_crm', text: 'CRM-системы нет, ведем клиентов в блокноте/Excel' },
        { val: 'have_crm_not_using', text: 'Есть amoCRM/Битрикс24, но менеджеры её саботируют' },
        { val: 'need_integrations', text: 'CRM настроена, нужны сложные интеграции или автоматизация' },
        { val: 'other', text: 'Другой вариант' }
      ];
    } else if (dept === 'consult') {
      questionText = 'Сколько менеджеров работает в вашем отделе продаж?';
      options = [
        { val: '1-3', text: 'От 1 до 3 менеджеров' },
        { val: '4-10', text: 'От 4 до 10 менеджеров' },
        { val: '10+', text: 'Более 10 менеджеров' },
        { val: 'no_department', text: 'Отдела продаж еще нет, продаю сам' }
      ];
    } else if (dept === 'urban') {
      questionText = 'Укажите тип вашей операционной задачи:';
      options = [
        { val: 'business', text: 'Бизнес-задача (снабжение, субподряд, контроль подрядчиков)' },
        { val: 'personal', text: 'Личная задача (помощь с ремонтом, переездом, закупками)' },
        { val: 'mixed', text: 'Смешанная задача / Нужен персональный ассистент' }
      ];
    } else {
      questionText = 'Какая задача перед вами стоит?';
      options = [
        { val: 'sales_boost', text: 'Навести порядок в продажах' },
        { val: 'operations', text: 'Делегировать рутину' },
        { val: 'consultation', text: 'Нужна общая консультация' }
      ];
    }

    questionEl.textContent = questionText;

    options.forEach(opt => {
      const div = document.createElement('div');
      div.className = 'quiz-option';
      div.setAttribute('data-val', opt.val);
      div.innerHTML = `
        <div class="quiz-radio"></div>
        <div class="quiz-option-text">${opt.text}</div>
      `;
      
      div.addEventListener('click', () => {
        const sibs = optionsEl.querySelectorAll('.quiz-option');
        sibs.forEach(s => s.classList.remove('selected'));
        div.classList.add('selected');
        selectedAnswers.detail = opt.text;
        nextStepBtn.removeAttribute('disabled');
      });

      optionsEl.appendChild(div);
    });
  };

  // Contact Method selector
  const methodBtns = document.querySelectorAll('.quiz-method-btn');
  methodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      methodBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedAnswers.contactMethod = btn.getAttribute('data-method');
    });
  });

  // Navigation handlers
  if (nextStepBtn && prevStepBtn) {
    nextStepBtn.addEventListener('click', () => {
      if (currentStepIndex === 0) {
        if (!selectedAnswers.dept) return; // Must select option
        currentStepIndex = 1;
        trackAnalyticsEvent(`quiz_step_2_${selectedAnswers.dept}`);
        updateQuizUI();
        // Disable next unless they choose step 2
        if (!selectedAnswers.detail) {
          nextStepBtn.setAttribute('disabled', 'true');
        }
      } else if (currentStepIndex === 1) {
        if (!selectedAnswers.detail) return;
        currentStepIndex = 2;
        updateQuizUI();
      } else if (currentStepIndex === 2) {
        // Form submit validation
        const nameInput = document.getElementById('quiz-name');
        const phoneInput = document.getElementById('quiz-phone');

        if (!nameInput.value.trim()) {
          nameInput.style.borderColor = '#ef4444';
          return;
        } else {
          nameInput.style.borderColor = 'var(--border-dark)';
        }

        if (!phoneInput.value.trim() || phoneInput.value.length < 7) {
          phoneInput.style.borderColor = '#ef4444';
          return;
        } else {
          phoneInput.style.borderColor = 'var(--border-dark)';
        }

        selectedAnswers.name = nameInput.value;
        selectedAnswers.phone = phoneInput.value;

        // Perform Submit Simulation
        submitQuizLead(selectedAnswers);
      }
    });

    prevStepBtn.addEventListener('click', () => {
      if (currentStepIndex > 0) {
        currentStepIndex--;
        updateQuizUI();
        nextStepBtn.removeAttribute('disabled');
      }
    });
  }

  // Submit Lead to amoCRM (Simulation)
  const submitQuizLead = (data) => {
    nextStepBtn.setAttribute('disabled', 'true');
    nextStepBtn.textContent = 'Отправка...';

    // Mock API call to simulate webhook delivery
    setTimeout(() => {
      console.log('--- LEADS DATA RECEIVED (amoCRM webhook simulation) ---');
      console.log('Name:', data.name);
      console.log('Phone:', data.phone);
      console.log('Preferred Contact:', data.contactMethod);
      console.log('Department Tag:', data.dept);
      console.log('Specific Requirement:', data.detail);
      console.log('UTM Source:', getUtmParam('utm_source') || 'direct');
      console.log('UTM Medium:', getUtmParam('utm_medium') || 'none');
      console.log('UTM Campaign:', getUtmParam('utm_campaign') || 'none');
      console.log('------------------------------------------------------');

      trackAnalyticsEvent('quiz_complete');

      // Hide quiz form, show success screen
      if (quizInnerContainer && quizSuccess) {
        quizInnerContainer.style.display = 'none';
        quizSuccess.classList.add('active');
      }
    }, 1200);
  };

  // --- External CTAs triggering Quiz directly ---
  const triggerQuizScroll = (dept) => {
    const quizSec = document.getElementById('quiz');
    if (quizSec) {
      quizSec.scrollIntoView({ behavior: 'smooth' });
      
      // Auto-select department option in step 1 if quiz is active
      const opt = document.querySelector(`.quiz-option[data-dept="${dept}"]`);
      if (opt) {
        opt.click();
      }
    }
  };

  window.selectQuizDept = (dept) => {
    trackAnalyticsEvent(`click_dept_${dept}`);
    triggerQuizScroll(dept);
  };

  const ctaQuizBtns = document.querySelectorAll('[data-trigger-quiz]');
  ctaQuizBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const dept = btn.getAttribute('data-trigger-quiz') || 'tech';
      triggerQuizScroll(dept);
    });
  });

  // --- Helpers ---
  const getUtmParam = (name) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  };

  // Analytics Event Simulation Tracker
  const trackAnalyticsEvent = (eventName) => {
    console.log(`[Analytics Event]: ${eventName}`);
    // Here we would push to dataLayer or call ym(XXXXXX, 'reachGoal', eventName)
    if (window.dataLayer) {
      window.dataLayer.push({ event: eventName });
    }
  };

  // --- Track main call-to-actions ---
  const heroPrimary = document.querySelector('.hero-ctas .btn-primary');
  if (heroPrimary) {
    heroPrimary.addEventListener('click', () => trackAnalyticsEvent('click_cta_hero_primary'));
  }
  const heroSecondary = document.querySelector('.hero-ctas .btn-secondary');
  if (heroSecondary) {
    heroSecondary.addEventListener('click', () => trackAnalyticsEvent('click_cta_hero_secondary'));
  }

  // Connect cases reading buttons
  const readCaseBtns = document.querySelectorAll('.case-footer-link');
  readCaseBtns.forEach(btn => {
    btn.addEventListener('click', () => trackAnalyticsEvent('click_case_read'));
  });

  // Connect messengers
  const tgLinks = document.querySelectorAll('a[href*="t.me"]');
  tgLinks.forEach(link => {
    link.addEventListener('click', () => trackAnalyticsEvent('click_telegram'));
  });
  
  const waLinks = document.querySelectorAll('a[href*="wa.me"]');
  waLinks.forEach(link => {
    link.addEventListener('click', () => trackAnalyticsEvent('click_wa'));
  });

  // --- Keyboard navigation for accessibility / quiz ---
  document.addEventListener('keydown', (e) => {
    // If quiz is focused, allow typing, but if choice is highlighted:
    if (e.key === 'Enter' && currentStepIndex < 2 && document.activeElement.classList.contains('quiz-option')) {
      document.activeElement.click();
    }
  });
});
