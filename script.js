(() => {
  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const menu = document.querySelector("[data-menu]");
  const year = document.querySelector("[data-year]");
  const lightbox = document.querySelector("[data-lightbox]");
  const lightboxImg = document.querySelector("[data-lightbox-image]");
  const lightboxClose = document.querySelector("[data-lightbox-close]");

  if (year) year.textContent = String(new Date().getFullYear());

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const closeMenu = () => {
    if (!header || !toggle || !menu) return;
    header.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    menu.hidden = true;
  };

  toggle?.addEventListener("click", () => {
    const open = header.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
  });

  menu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  const reveal = document.querySelectorAll(".soins-list li, .schedule-row, .gallery-item");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -40px 0px" }
    );

    reveal.forEach((el, index) => {
      el.style.transitionDelay = `${Math.min(index * 70, 280)}ms`;
      io.observe(el);
    });
  } else {
    reveal.forEach((el) => el.classList.add("is-visible"));
  }

  const openLightbox = (src, alt) => {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightboxClose?.focus();
  };

  const closeLightbox = () => {
    if (!lightbox || !lightboxImg) return;
    lightbox.hidden = true;
    lightboxImg.removeAttribute("src");
    document.body.style.overflow = "";
  };

  document.querySelectorAll("[data-lightbox-src]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openLightbox(btn.getAttribute("data-lightbox-src"), btn.getAttribute("data-lightbox-alt"));
    });
  });

  lightboxClose?.addEventListener("click", closeLightbox);
  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLightbox();
  });

  const SLOTS = {
    1: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"],
    2: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"],
    3: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"],
    4: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"],
    5: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30"],
  };

  const form = document.querySelector("[data-rdv-form]");
  const dateInput = document.querySelector("[data-rdv-date]");
  const hourSelect = document.querySelector("[data-rdv-heure]");
  const formStatus = document.querySelector("[data-rdv-status]");

  const setStatus = (text, ok = false) => {
    if (!formStatus) return;
    formStatus.hidden = !text;
    formStatus.textContent = text;
    formStatus.classList.toggle("is-ok", ok);
  };

  const fillHours = (slots) => {
    if (!hourSelect) return;
    hourSelect.innerHTML = slots.length
      ? `<option value="">Choisir</option>${slots.map((h) => `<option value="${h}">${h}</option>`).join("")}`
      : `<option value="">Aucun créneau ce jour</option>`;
  };

  if (dateInput) {
    const today = new Date().toISOString().slice(0, 10);
    dateInput.min = today;
  }

  dateInput?.addEventListener("change", async () => {
    const date = dateInput.value;
    const fallback = SLOTS[new Date(`${date}T12:00:00`).getDay()] || [];
    try {
      const res = await fetch(`/api/slots?date=${encodeURIComponent(date)}`);
      if (!res.ok) throw new Error("offline");
      const data = await res.json();
      fillHours(data.slots || fallback);
    } catch {
      fillHours(fallback);
    }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible d’enregistrer.");
      form.reset();
      fillHours([]);
      setStatus("Demande enregistrée. Le cabinet vous confirmera le rendez-vous.", true);
    } catch (error) {
      setStatus(error.message || "Le serveur de réservation n’est pas lancé.");
    }
  });
})();
