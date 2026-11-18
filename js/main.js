/* The Meat Company · Interaktion und Motion
   GSAP 3.13 (ScrollTrigger, SplitText) plus Lenis für weiches Scrollen am Desktop.
   Ohne GSAP oder bei "Bewegung reduzieren" bleibt alles statisch lesbar. */
(function () {
  "use strict";

  var doc = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var motion = hasGsap && !reduce;

  window.__tmcReady = true;
  if (!motion) doc.classList.remove("has-motion");

  var lenis = null;
  /* Texte kommen aus js/i18n.js (DE, EN, TR, AR, RU), Deutsch ist der Rückfall */
  var tr = window.TMC_t || function (k) { return k; };
  var COPPER_HI = "#f3c39c", BONE = "#f1e9dc";

  /* ------------------------------------------------------------------
     Zeit in Berlin: Öffnungsstatus, Mittagsmenü, Uhr
     ------------------------------------------------------------------ */
  var DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function berlin() {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    var h = parseInt(o.hour, 10) % 24, m = parseInt(o.minute, 10);
    return { day: DAYS[o.weekday], h: h, m: m, mins: h * 60 + m };
  }
  var OPEN = 12 * 60;
  function closeAt() { return 24 * 60; }
  function pad(n) { return String(n).padStart(2, "0"); }

  function updateTime() {
    var t = berlin();
    var close = closeAt(t.day);
    var isOpen = t.mins >= OPEN && t.mins < close;
    var text;
    if (isOpen) text = tr("js.openUntil", { t: close / 60 + ":00" });
    else if (t.mins < OPEN) text = tr("js.closedSoon");
    else text = tr("js.closedTomorrow");
    $$("[data-status]").forEach(function (el) {
      el.classList.toggle("is-open", isOpen);
      el.classList.toggle("is-closed", !isOpen);
      $(".status-text", el).textContent = text;
    });

    $$(".hours tr[data-days]").forEach(function (tr) {
      tr.classList.toggle("is-today", tr.dataset.days.split(",").indexOf(String(t.day)) > -1);
    });

    var lunch = $("[data-lunch]");
    if (lunch) {
      var weekday = t.day >= 1 && t.day <= 5, lt, on = false;
      if (weekday && t.mins >= OPEN && t.mins < 15 * 60) {
        var left = 15 * 60 - t.mins;
        lt = tr("js.lunchNow", { t: Math.floor(left / 60) + ":" + pad(left % 60) });
        on = true;
      } else if (weekday && t.mins < OPEN) lt = tr("js.lunchToday");
      else if (t.day >= 1 && t.day <= 4) lt = tr("js.lunchTomorrow");
      else if (t.day === 0) lt = tr("js.lunchTomorrow");
      else lt = tr("js.lunchMonday");
      $(".lunch-live-text", lunch).textContent = lt;
      $(".status-dot", lunch).classList.toggle("is-on", on);
    }

    var clock = $("[data-clock]");
    if (clock) clock.textContent = pad(t.h) + ":" + pad(t.m);
  }
  updateTime();
  setInterval(updateTime, 30000);
  var yearEl = $("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------
     Navigation: Bestellmenü, mobiles Menü, Ankerlinks
     ------------------------------------------------------------------ */
  var nav = $("#nav");
  var order = $(".order");
  var orderBtn = $(".order-toggle");
  function setOrder(open) {
    order.classList.toggle("is-open", open);
    orderBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  orderBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    setOrder(!order.classList.contains("is-open"));
  });
  document.addEventListener("click", function (e) {
    if (!order.contains(e.target)) setOrder(false);
  });

  var burger = $(".burger"), mmenu = $("#mobileMenu"), menuOpen = false;
  function setMenu(open) {
    menuOpen = open;
    mmenu.classList.toggle("is-open", open);
    mmenu.setAttribute("aria-hidden", open ? "false" : "true");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", tr(open ? "js.menuClose" : "js.menuOpen"));
    document.body.style.overflow = open ? "hidden" : "";
    if (lenis) open ? lenis.stop() : lenis.start();
    nav.classList.remove("is-hidden");
  }
  burger.addEventListener("click", function () { setMenu(!menuOpen); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { setOrder(false); if (menuOpen) setMenu(false); }
  });

  function scrollToTarget(target) {
    var offset = target.classList && target.classList.contains("m-cat") ? 76 : 0;
    if (target === document.body || target.id === "top") {
      lenis ? lenis.scrollTo(0, { duration: 1.6 }) : window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      return;
    }
    if (lenis) lenis.scrollTo(target, { offset: -offset, duration: 1.5 });
    else {
      var y = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    }
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    var target = id ? document.getElementById(id) : document.body;
    if (!target) return;
    e.preventDefault();
    var go = function () { scrollToTarget(target); };
    if (menuOpen) { setMenu(false); setTimeout(go, 450); } else go();
  });
  $$("[data-top]").forEach(function (b) {
    b.addEventListener("click", function () { scrollToTarget(document.body); });
  });

  /* Adresse kopieren */
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var txt = b.dataset.copy, label = b.textContent;
      var done = function () { b.textContent = tr("js.copied"); setTimeout(function () { b.textContent = label; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
      else done();
    });
  });

  /* Lightbox der Galerie */
  var lb = $(".lightbox");
  if (lb && typeof lb.showModal === "function") {
    var lbImg = $("img", lb);
    $$(".gal-item").forEach(function (item) {
      item.addEventListener("click", function () {
        var small = $("img", item);
        lbImg.src = item.dataset.full;
        lbImg.alt = small ? small.alt : "";
        lb.showModal();
        if (lenis) lenis.stop();
      });
    });
    lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });
    $(".lightbox-close", lb).addEventListener("click", function () { lb.close(); });
    lb.addEventListener("close", function () { if (lenis) lenis.start(); });
  }

  /* Imagefilm: lädt erst beim Klick. Deutsche Seite spielt den deutschen Film, alle anderen Sprachen den englischen.
     Fehlt eine Sprachfassung noch, springt der Player auf Englisch. Am Handy läuft das Hochformat. */
  (function film() {
    var f = $(".film");
    if (!f) return;
    var v = $(".film-video", f), btn = $(".film-play", f);
    var langs = (f.dataset.filmLangs || "en").split(","), lang = window.TMC_LANG || doc.lang;
    var l = langs.indexOf(lang) > -1 ? lang : "en";
    var fmt = window.matchMedia("(max-width: 760px)").matches ? "9x16" : "16x9";
    function src(lg) { return f.dataset.film.replace("{l}", lg).replace("{f}", fmt); }
    if (l !== "de") {
      $$("picture source, .film-poster", f).forEach(function (el) {
        var a = el.tagName === "SOURCE" ? "srcset" : "src";
        el.setAttribute(a, el.getAttribute(a).replace("poster-de-", "poster-" + l + "-"));
      });
    }
    v.addEventListener("error", function () {
      if (l === "en") return;
      l = "en";
      v.src = src(l);
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
    btn.addEventListener("click", function () {
      if (!v.getAttribute("src")) v.src = src(l);
      v.hidden = false;
      f.classList.add("is-playing");
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
    v.addEventListener("ended", function () { f.classList.remove("is-playing"); v.hidden = true; v.currentTime = 0; });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (!en.isIntersecting && !v.paused) v.pause(); });
      }, { threshold: 0.2 }).observe(f);
    }
  })();

  /* Tabs der Speisekarte (funktioniert auch ohne GSAP) */
  var tabs = $$(".m-tab"), tabInd = $(".m-tabs-ind"), tabInner = $(".m-tabs-inner"), activeCat = null;
  function setTab(id, instant) {
    if (!tabs.length) return;
    activeCat = id;
    var tab = null;
    tabs.forEach(function (t) {
      var on = t.dataset.cat === id;
      t.classList.toggle("is-active", on);
      if (on) { tab = t; t.setAttribute("aria-current", "true"); } else t.removeAttribute("aria-current");
    });
    if (!tab) return;
    tabInd.style.width = tab.offsetWidth + "px";
    tabInd.style.transform = "translateX(" + tab.offsetLeft + "px)";
    var left = tab.offsetLeft - (tabInner.clientWidth - tab.offsetWidth) / 2;
    tabInner.scrollTo({ left: left, behavior: instant ? "auto" : "smooth" });
  }
  if (tabs.length) setTab(tabs[0].dataset.cat, true);
  if (!motion && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) setTab(en.target.id.replace("karte-", "")); });
    }, { rootMargin: "-40% 0px -55% 0px" });
    $$(".m-cat").forEach(function (c) { io.observe(c); });
  }

  /* Karte der Umgebung: Straßenraster */
  (function buildMap() {
    var g = $(".map-grid");
    if (!g) return;
    var ns = "http://www.w3.org/2000/svg", d = [];
    [70, 175, 290, 455, 560, 650].forEach(function (y, i) { d.push(["M-20 " + (y + (i % 2 ? 8 : -6)) + " L620 " + y, i % 3 === 2]); });
    [60, 160, 430, 520].forEach(function (x, i) { d.push(["M" + x + " -20 L" + (x + (i % 2 ? 14 : -10)) + " 720", i === 3]); });
    d.push(["M-20 380 L620 340", true], ["M120 720 L470 -20", true]);
    d.forEach(function (p) {
      var el = document.createElementNS(ns, "path");
      el.setAttribute("d", p[0]);
      if (p[1]) el.setAttribute("class", "thin");
      g.appendChild(el);
    });
  })();

  /* Tickmarken für Signatur Ring und Uhr */
  function ticks(group, cx, n, r1, r2, majorEvery, r1Major) {
    if (!group) return;
    var ns = "http://www.w3.org/2000/svg";
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2, major = i % majorEvery === 0;
      var ra = major ? r1Major : r1;
      var l = document.createElementNS(ns, "line");
      l.setAttribute("x1", (cx + Math.cos(a) * ra).toFixed(2));
      l.setAttribute("y1", (cx + Math.sin(a) * ra).toFixed(2));
      l.setAttribute("x2", (cx + Math.cos(a) * r2).toFixed(2));
      l.setAttribute("y2", (cx + Math.sin(a) * r2).toFixed(2));
      if (major) l.setAttribute("class", "is-major");
      group.appendChild(l);
    }
  }
  ticks($(".sig-ticks"), 300, 96, 282, 292, 8, 274);
  ticks($(".clock-ticks"), 200, 56, 182, 190, 4, 176);

  /* Mood Video hinter dem Manifest: lädt erst kurz vor dem Abschnitt und läuft nur, solange er sichtbar ist.
     Bei "Bewegung reduzieren" oder Datensparmodus bleibt das Standbild. */
  (function moodVideo() {
    var v = $(".manifest-video");
    var spar = navigator.connection && navigator.connection.saveData;
    if (!v || reduce || spar) return;
    var src = window.matchMedia("(max-width: 760px)").matches ? v.dataset.srcSm : v.dataset.src;
    function play() {
      if (!v.getAttribute("src")) v.src = src;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
    if (!("IntersectionObserver" in window)) return play();
    new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) play();
        else if (v.getAttribute("src")) v.pause();
      });
    }, { rootMargin: "200px 0px" }).observe(v);
  })();

  /* Social: Reels und Posts von Instagram. Daten aus js/social-data.js (tools/instagram_holen.py).
     Desktop: ziehen oder Pfeile, ein Reel spielt beim Drüberfahren einen kurzen Clip ohne Ton.
     Handy: wischen, der Reel im Blick läuft. Bei "Bewegung reduzieren" oder Datensparmodus nur Standbilder. */
  var socLoc = (window.TMC_LANG || doc.lang) === "ar" ? "ar-u-nu-latn" : (window.TMC_LANG || doc.lang || "de");
  var socNum = new Intl.NumberFormat(socLoc);
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  (function social() {
    var track = $(".social-track"), rail = $(".social-rail");
    if (!track) return;
    var data = window.TMC_SOCIAL || [];
    var compact = socLoc === "de" ? socNum : new Intl.NumberFormat(socLoc, { notation: "compact", maximumFractionDigits: 1 });
    var date = new Intl.DateTimeFormat(socLoc, { day: "numeric", month: "short", year: "numeric" });
    var play = !reduce && !(navigator.connection && navigator.connection.saveData);
    var IG = '<svg class="social-ig" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" class="fill"/></svg>';
    var PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>';
    var ICON = {
      reel: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M3.5 8.6h17M9 3.6l2.6 5M14.6 3.6l2.6 5"/><path d="M10.4 11.6v5.2l4.4-2.6z" fill="currentColor" stroke="none"/></svg>',
      foto: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="9" cy="9.5" r="1.6"/><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4"/></svg>',
      karussell: '<svg viewBox="0 0 24 24"><rect x="3.5" y="7" width="13.5" height="13.5" rx="3.5"/><path d="M7.5 3.5h9.5a3.5 3.5 0 0 1 3.5 3.5v9.5"/></svg>'
    };

    track.innerHTML = data.map(function (b) {
      var reel = b.typ === "reel", r = b.w / b.h;
      var d = b.zeit ? date.format(new Date(b.zeit * 1000)) : "";
      var typ = tr(reel ? "js.socReel" : b.typ === "karussell" ? "js.socCarousel" : "js.socPhoto");
      return '<li class="soc soc--' + b.typ + '" style="--ar:' + b.w + ' / ' + b.h + '">' +
        '<a class="soc-link" href="https://www.instagram.com/' + (reel ? "reel/" : "p/") + b.id + '/" target="_blank" rel="noopener" draggable="false" data-cursor="Instagram ↗" aria-label="' + esc(tr("js.socOpen", { type: typ, h: "@" + b.nutzer, d: d })) + '">' +
        '<span class="soc-media"><img src="assets/social/sm/' + b.id + '.webp" srcset="assets/social/sm/' + b.id + '.webp 360w, assets/social/' + b.id + '.webp 720w"' +
        ' sizes="(max-width: 760px) ' + Math.round(60 * r) + 'vh, ' + Math.round(38 * r) + 'vw" width="' + b.w + '" height="' + b.h + '" alt="" loading="lazy" decoding="async" draggable="false">' +
        (reel ? '<video muted loop playsinline preload="none" disablepictureinpicture data-src="assets/social/' + b.id + '.mp4"></video>' : "") + "</span>" +
        '<span class="soc-top" aria-hidden="true"><span class="soc-type">' + ICON[b.typ] + esc(typ) + "</span>" +
        (b.aufrufe ? '<span class="soc-views">' + PLAY + compact.format(b.aufrufe) + "</span>" : "") + "</span>" +
        '<span class="soc-bottom" aria-hidden="true"><span class="soc-user' + (b.nutzer === "themeatcompanyberlin" ? " is-own" : "") + '">@' + esc(b.nutzer) + '</span><span class="soc-date">' + esc(d) + "</span></span>" +
        "</a></li>";
    }).join("") +
      '<li class="soc soc--more" style="--ar:9 / 16"><a class="soc-link" href="https://www.instagram.com/themeatcompanyberlin/reels/" target="_blank" rel="noopener" draggable="false" data-cursor="Instagram ↗">' +
      IG + '<span class="soc-more-title" dir="auto">' + esc(track.dataset.more || "Instagram") + "</span>" +
      '<span class="soc-more-row"><span class="soc-user">@themeatcompanyberlin</span><span class="soc-more-arrow" aria-hidden="true">↗</span></span></a></li>';

    $$(".social-num").forEach(function (el) { el.textContent = socNum.format(+el.dataset.num) + (el.hasAttribute("data-plus") ? "+" : ""); });

    /* Clips: Quelle erst beim ersten Abspielen setzen */
    var reels = $$(".soc--reel", track);
    reels.forEach(function (c) {
      var v = $("video", c);
      v.addEventListener("playing", function () { c.classList.add("is-playing"); });
    });
    function start(c) {
      var v = $("video", c);
      if (!play || !v) return;
      if (!v.getAttribute("src")) v.src = v.dataset.src;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
    function stop(c) {
      var v = $("video", c);
      if (!v) return;
      v.pause();
      c.classList.remove("is-playing");
    }

    /* Ziehen mit Schwung (nur Maus), danach kein versehentlicher Klick auf den Link */
    var down = false, moved = 0, sx = 0, sl = 0, lx = 0, lt = 0, vx = 0, glide = 0;
    if (fine) {
      reels.forEach(function (c) {
        c.addEventListener("pointerenter", function () { if (!down) start(c); });
        c.addEventListener("pointerleave", function () { stop(c); });
      });
      rail.addEventListener("pointerdown", function (e) {
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        down = true; moved = 0; vx = 0;
        sx = lx = e.clientX; sl = rail.scrollLeft; lt = performance.now();
        cancelAnimationFrame(glide);
      });
      window.addEventListener("pointermove", function (e) {
        if (!down) return;
        var dx = e.clientX - sx, now = performance.now();
        moved = Math.max(moved, Math.abs(dx));
        if (moved > 4) rail.classList.add("is-drag");
        rail.scrollLeft = sl - dx;
        vx = (e.clientX - lx) / Math.max(1, now - lt);
        lx = e.clientX; lt = now;
      });
      window.addEventListener("pointerup", function () {
        if (!down) return;
        down = false;
        rail.classList.remove("is-drag");
        var v = performance.now() - lt > 80 ? 0 : -vx * 16;
        (function step() {
          if (Math.abs(v) < 0.4) return;
          rail.scrollLeft += v;
          v *= 0.93;
          glide = requestAnimationFrame(step);
        })();
      });
      rail.addEventListener("click", function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } moved = 0; }, true);
      rail.addEventListener("dragstart", function (e) { e.preventDefault(); });
    } else if (play && "IntersectionObserver" in window) {
      /* Handy: der erste Reel, der fast ganz im Bild ist, läuft */
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { en.target._seen = en.isIntersecting; });
        var first = null;
        reels.forEach(function (c) { if (c._seen && !first) first = c; });
        reels.forEach(function (c) { if (c === first) start(c); else stop(c); });
      }, { threshold: 0.75 });
      reels.forEach(function (c) { io.observe(c); });
    }

    /* Pfeile und Fortschrittsbalken */
    var bar = $(".social-bar span"), prev = $('.social-btn[data-dir="-1"]'), next = $('.social-btn[data-dir="1"]');
    function upd() {
      var max = rail.scrollWidth - rail.clientWidth, w = max > 0 ? rail.clientWidth / rail.scrollWidth : 1;
      bar.style.width = (w * 100) + "%";
      bar.style.transform = "translateX(" + (max > 0 ? rail.scrollLeft / max * (1 / w - 1) * 100 : 0) + "%)";
      prev.disabled = rail.scrollLeft < 4;
      next.disabled = rail.scrollLeft > max - 4;
    }
    $$(".social-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        cancelAnimationFrame(glide);
        rail.scrollBy({ left: +b.dataset.dir * rail.clientWidth * 0.72, behavior: reduce ? "auto" : "smooth" });
      });
    });
    rail.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", upd);
    upd();
  })();

  /* Speisekarte als PDF: Link und Titelbild folgen der Sprache der Seite, die anderen Sprachen stehen darunter */
  (function menuPdf() {
    var main = $("[data-menu-pdf]");
    if (!main) return;
    var l = window.TMC_LANG || doc.lang || "de";
    main.setAttribute("href", "assets/menu/The-Meat-Company-Menu-" + l.toUpperCase() + ".pdf");
    var cv = $("[data-menu-cover]", main);
    if (cv) cv.setAttribute("src", "assets/menu/cover-" + l + ".webp");
    $$("[data-pdf-lang]").forEach(function (a) { if (a.dataset.pdfLang === l) a.setAttribute("aria-current", "true"); });

    /* Andere Sprachen: erst ein Zwischenschritt mit Titelbild und Knopf "Herunterladen", damit klar ist, was passiert */
    var dlg = $("[data-pdfstep]");
    if (!dlg || typeof dlg.showModal !== "function") return;
    var NAMES = { de: "Deutsch", en: "English", tr: "Türkçe", ar: "العربية", ru: "Русский" };
    var go = $("[data-pdfstep-go]", dlg), cover = $(".pdfstep-cover img", dlg), langEl = $(".pdfstep-lang", dlg), sizeEl = $(".pdfstep-size", dlg);
    var sizes = {};
    function showSize(url) {
      sizeEl.textContent = sizes[url] || "PDF";
      if (sizes[url] || !window.fetch) return;
      fetch(url, { method: "HEAD" }).then(function (r) {
        var b = +r.headers.get("content-length");
        if (!b) return;
        sizes[url] = "PDF · " + new Intl.NumberFormat(l, { maximumFractionDigits: 1 }).format(b / 1048576) + " MB";
        if (go.getAttribute("href") === url) sizeEl.textContent = sizes[url];
      }).catch(function () {});
    }
    $$("[data-pdf-lang]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var pl = a.dataset.pdfLang, url = a.getAttribute("href");
        go.setAttribute("href", url);
        cover.setAttribute("src", "assets/menu/cover-" + pl + ".webp");
        langEl.textContent = NAMES[pl] || pl.toUpperCase();
        langEl.setAttribute("lang", pl);
        langEl.setAttribute("dir", pl === "ar" ? "rtl" : "ltr");
        showSize(url);
        dlg.showModal();
        if (lenis) lenis.stop();
      });
    });
    go.addEventListener("click", function () { setTimeout(function () { dlg.close(); }, 600); });
    $$("[data-pdfstep-cancel]", dlg).forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", function () { if (lenis) lenis.start(); });
  })();

  /* Gericht im Detail: Klick oder Tippen auf ein Gericht der Karte öffnet es groß, mit Bild, Text und Preis.
     Der Inhalt kommt aus der Zeile selbst (schon übersetzt), Pfeile und Wischen blättern durch die Karte. */
  (function dish() {
    var dlg = $("[data-dish]");
    if (!dlg || typeof dlg.showModal !== "function") return;
    var items = $$(".m-item[data-img]");
    if (!items.length) return;
    var img = $(".dish-media img", dlg), cur = 0;
    var set = function (sel, html) { var el = $(sel, dlg); el.innerHTML = html || ""; el.hidden = !html; };
    function fill(i) {
      cur = (i + items.length) % items.length;
      var it = items[cur], cat = it.closest(".m-cat");
      var name = $(".m-name > span", it), desc = $(".m-desc", it), extra = $(".m-extra", it);
      var qty = $(".m-qty", it), num = $(".m-num", it);
      img.src = "assets/img/cut/" + it.dataset.img + ".webp";
      img.alt = name ? name.textContent : "";
      set(".dish-cat", cat ? esc($(".m-cat-title", cat).textContent) : "");
      $(".dish-name", dlg).textContent = name ? name.textContent : "";
      $(".dish-name", dlg).setAttribute("lang", name && name.closest("[lang]") ? name.closest("[lang]").getAttribute("lang") : doc.lang);
      set(".dish-tags", $$(".m-tag", it).map(function (t) { return t.outerHTML; }).join(" "));
      set(".dish-desc", desc ? esc(desc.textContent) : "");
      set(".dish-extra", extra ? esc(extra.textContent) : "");
      $(".dish-qty", dlg).textContent = qty ? qty.textContent : "";
      $(".dish-num", dlg).textContent = num ? num.textContent : "";
      $(".dish-count", dlg).textContent = String(cur + 1).padStart(2, "0") + " / " + String(items.length).padStart(2, "0");
      dlg.classList.remove("is-swap"); void dlg.offsetWidth; dlg.classList.add("is-swap");
    }
    function open(i) {
      fill(i);
      dlg.showModal();
      if (lenis) lenis.stop();
    }
    var viewLabel = tr("gal.view");
    items.forEach(function (it, i) {
      it.setAttribute("tabindex", "0");
      it.setAttribute("role", "button");
      it.setAttribute("aria-haspopup", "dialog");
      if (!it.hasAttribute("data-cursor")) it.setAttribute("data-cursor", viewLabel);
      it.addEventListener("click", function () { open(i); });
      it.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); }
      });
    });
    var rtl = doc.dir === "rtl";
    $$("[data-dish-step]", dlg).forEach(function (b) {
      b.addEventListener("click", function () { fill(cur + parseInt(b.dataset.dishStep, 10)); });
    });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") fill(cur + (rtl ? -1 : 1));
      else if (e.key === "ArrowLeft") fill(cur + (rtl ? 1 : -1));
    });
    $(".dish-close", dlg).addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", function () {
      if (lenis) lenis.start();
      var it = items[cur];
      if (it && fine) it.focus({ preventScroll: true });
    });
    /* Wischen: seitlich blättern, nach unten ziehen schließt */
    var sx = 0, sy = 0, sheet = $(".dish-sheet", dlg);
    sheet.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) fill(cur + (dx < 0 ? 1 : -1));
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5 && sheet.scrollTop <= 0) dlg.close();
    }, { passive: true });
  })();

  /* Coming Soon Charlottenburg: Aktivitäten aus js/news-data.js, neueste zuerst, Angekündigtes grau darunter.
     Texte in der Sprache der Seite, sonst Englisch, sonst Deutsch. */
  (function news() {
    var list = $(".soon-news");
    if (!list) return;
    var lang = window.TMC_LANG || doc.lang || "de";
    var date = new Intl.DateTimeFormat(socLoc, { day: "numeric", month: "long", year: "numeric" });
    var pick = function (o) { return o ? o[lang] || o.en || o.de || "" : ""; };
    var all = window.TMC_NEWS || [];
    var done = all.filter(function (n) { return !n.bald && n.datum; }).sort(function (a, b) { return a.datum < b.datum ? 1 : -1; });
    var next = all.filter(function (n) { return n.bald; });
    list.innerHTML = done.map(function (n, i) {
      return '<li class="news' + (i ? "" : " news--latest") + '"><p class="news-meta mono"><time datetime="' + n.datum + '">' + date.format(new Date(n.datum + "T12:00:00")) + "</time>" +
        (i ? "" : '<span class="news-badge">' + esc(list.dataset.new) + "</span>") + "</p>" +
        '<h4 class="news-title">' + esc(pick(n.titel)) + "</h4>" + (n.text ? '<p class="news-text">' + esc(pick(n.text)) + "</p>" : "") + "</li>";
    }).join("") + next.map(function (n) {
      return '<li class="news news--next"><p class="news-meta mono">' + esc(list.dataset.next) + '</p><h4 class="news-title">' + esc(pick(n.titel)) + "</h4></li>";
    }).join("");
  })();

  /* Nach einem Sprachwechsel an dieselbe Stelle der Seite zurück */
  function restoreScroll() {
    var y = 0;
    try { y = +sessionStorage.getItem("tmc-scroll") || 0; sessionStorage.removeItem("tmc-scroll"); } catch (e) { /* privat */ }
    if (y > 0) lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y);
  }

  /* Ohne Bewegung endet es hier: Inhalte sind sichtbar, Funktionen laufen */
  if (!motion) {
    var ld = $(".loader");
    if (ld) ld.style.display = "none";
    document.body.classList.remove("is-loading");
    restoreScroll();
    return;
  }

  /* ==================================================================
     Ab hier: Motion
     ================================================================== */
  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.defaults({ ease: "power3.out" });

  /* Lenis nur mit Maus und Trackpad, Touch scrollt nativ */
  if (fine && window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true,
      /* Seitliches Wischen über der Instagram Leiste scrollt die Leiste, nicht die Seite */
      virtualScroll: function (e) { return !(Math.abs(e.deltaX) > Math.abs(e.deltaY) && e.event.target.closest && e.event.target.closest(".social-rail")); }
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  var mm = gsap.matchMedia();
  var isMobile = function () { return window.innerWidth <= 760; };

  /* ------------------------------------------------------------------
     Rauch und Glut im Hero
     ------------------------------------------------------------------ */
  var hero = $(".hero");
  var smoke = window.TMCSmoke ? new window.TMCSmoke($(".hero-smoke"), { scale: isMobile() ? 0.4 : 0.5 }) : null;
  var embers = window.TMCEmbers ? new window.TMCEmbers($(".hero-embers"), isMobile() ? 22 : 46) : null;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) { smoke && smoke.start(); embers && embers.start(); }
        else { smoke && smoke.stop(); embers && embers.stop(); }
      });
    }, { threshold: 0 }).observe(hero);
  }
  hero.addEventListener("pointermove", function (e) {
    if (smoke) smoke.pointer(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
  });

  /* ------------------------------------------------------------------
     Preloader und Hero Auftritt
     ------------------------------------------------------------------ */
  var heroImg = $(".hero-dish img");
  gsap.set(".hero-dish", { xPercent: -50, yPercent: -50, x: 0, y: 0 });

  function imgReady(img) {
    return new Promise(function (res) {
      if (!img || (img.complete && img.naturalWidth)) return res();
      img.addEventListener("load", res, { once: true });
      img.addEventListener("error", res, { once: true });
    });
  }
  function withTimeout(p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(r, ms); })]); }

  function heroIntro() {
    var tl = gsap.timeline({
      onComplete: function () {
        gsap.set(".ht-meat", { clipPath: "none" });
        gsap.to(heroImg, { y: -12, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
      }
    });
    tl.fromTo(".ht-char", { y: 0, yPercent: 108 }, { yPercent: 0, duration: 1.4, ease: "expo.out", stagger: 0.07 }, 0)
      .fromTo(".ht-lets", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: "expo.out" }, 0.2)
      .fromTo(heroImg, { autoAlpha: 0, scale: 0.62, rotation: -14, yPercent: 14, filter: "blur(16px)" },
        { autoAlpha: 1, scale: 1, rotation: 0, yPercent: 0, filter: "blur(0px)", duration: 1.7, ease: "expo.out" }, 0.25)
      .fromTo(".ht-here", { autoAlpha: 0, y: 50, rotation: -6 }, { autoAlpha: 1, y: 0, rotation: 0, duration: 1.3, ease: "expo.out" }, 0.55)
      .fromTo([".hero-eyebrow", ".hero-copy > *", ".hero-meta > div", ".hero-tag", ".hero-scroll"],
        { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.06 }, 0.75);
    return tl;
  }

  function runLoader() {
    var loader = $(".loader");
    var num = $(".loader-num"), fill = $(".loader-mark-fill"), bar = $(".loader-bar span");
    var seen = false;
    try { seen = sessionStorage.getItem("tmc-seen") === "1"; sessionStorage.setItem("tmc-seen", "1"); } catch (e) { /* privat */ }
    var o = { p: 0 };
    var count = gsap.to(o, {
      p: 100, duration: seen ? 0.6 : 1.6, ease: "power2.inOut",
      onUpdate: function () {
        num.textContent = pad(Math.round(o.p) === 100 ? 100 : Math.round(o.p));
        fill.style.clipPath = "inset(" + (100 - o.p) + "% 0 0 0)";
        bar.style.transform = "scaleX(" + o.p / 100 + ")";
      }
    });
    var assets = withTimeout(Promise.all([document.fonts ? document.fonts.ready : Promise.resolve(), imgReady(heroImg)]), 2500);
    Promise.all([assets, count.then()]).then(function () {
      var tl = gsap.timeline({
        onComplete: function () {
          loader.style.display = "none";
          ScrollTrigger.refresh();
          restoreScroll();
        }
      });
      tl.to(".loader-inner", { autoAlpha: 0, y: -24, duration: 0.5, ease: "power2.in" })
        .to(".loader-panel--a", { yPercent: -100, duration: 1.1, ease: "expo.inOut" }, 0.25)
        .to(".loader-panel--b", { yPercent: 100, duration: 1.1, ease: "expo.inOut" }, 0.25)
        .add(function () {
          document.body.classList.remove("is-loading");
          if (lenis) lenis.start();
        }, 0.6)
        .add(heroIntro(), 0.55);
    });
  }
  runLoader();

  /* Hero beim Rausscrollen: Buchstaben weichen aus, Burger steigt auf */
  gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } })
    .to(".ht-char", { x: function (i) { return [-1, -0.36, 0.36, 1][i] * window.innerWidth * 0.2; }, ease: "none" }, 0)
    .to(".ht-meat", { opacity: 0.18, ease: "none" }, 0)
    .to(".ht-lets", { y: -90, ease: "none" }, 0)
    .to(".ht-here", { y: -150, ease: "none" }, 0)
    .to(".hero-dish", { y: function () { return -window.innerHeight * 0.14; }, scale: 0.8, ease: "none" }, 0)
    .to(".hero-foot", { y: -50, autoAlpha: 0, ease: "none" }, 0)
    .to(".hero-smoke", { opacity: 0.35, ease: "none" }, 0);

  /* Maus bewegt den Burger leicht in 3D */
  if (fine) {
    gsap.set(heroImg, { transformPerspective: 900 });
    var rx = gsap.quickTo(heroImg, "rotationX", { duration: 0.9, ease: "power3" });
    var ry = gsap.quickTo(heroImg, "rotationY", { duration: 0.9, ease: "power3" });
    hero.addEventListener("pointermove", function (e) {
      var x = e.clientX / window.innerWidth - 0.5, y = e.clientY / window.innerHeight - 0.5;
      ry(x * 16);
      rx(-y * 10);
    });
    hero.addEventListener("pointerleave", function () { rx(0); ry(0); });
  }

  /* ------------------------------------------------------------------
     Navigation: verstecken beim Runterscrollen, aktiver Abschnitt
     ------------------------------------------------------------------ */
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: function (self) {
      var y = self.scroll();
      var hide = self.direction === 1 && y > 240 && !menuOpen && !order.classList.contains("is-open");
      nav.classList.toggle("is-hidden", hide);
      nav.classList.toggle("is-scrolled", y > 40);
      document.body.classList.toggle("nav-up", !hide && y > 240);
    }
  });
  var navLinks = $$(".nav-links a");
  ["signature", "karte", "mittag", "story", "galerie", "charlottenburg", "besuch"].forEach(function (id) {
    var sec = document.getElementById(id);
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec, start: "top 50%", end: "bottom 50%",
      onToggle: function (self) {
        if (!self.isActive) return;
        navLinks.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + id); });
      }
    });
  });

  /* ------------------------------------------------------------------
     Laufband: Tempo und Neigung folgen der Scrollgeschwindigkeit
     ------------------------------------------------------------------ */
  var loop = gsap.to(".ticker-track", { xPercent: -50, duration: 42, ease: "none", repeat: -1 });
  var skewTo = gsap.quickTo(".ticker-row span, .ticker-row em", "skewX", { duration: 0.5, ease: "power3" });
  ScrollTrigger.create({
    trigger: ".ticker", start: "top bottom", end: "bottom top",
    onUpdate: function (self) {
      var v = self.getVelocity();
      gsap.to(loop, { timeScale: 1 + Math.min(Math.abs(v) / 220, 6), duration: 0.3, overwrite: true });
      gsap.to(loop, { timeScale: 1, duration: 1.4, delay: 0.35, overwrite: false });
      skewTo(gsap.utils.clamp(-14, 14, -v / 140));
    },
    onLeave: function () { skewTo(0); }, onLeaveBack: function () { skewTo(0); }
  });

  /* ------------------------------------------------------------------
     Überschriften: Zeilenweise aus der Maske
     ------------------------------------------------------------------ */
  if (window.SplitText) {
    $$(".sig-title, .process-title, .menu-title, .gal-title, .jerky-title, .social-title, .soon-title, .visit-title").forEach(function (el) {
      /* Arabisch nur in Zeilen teilen: einzelne Wort Blöcke würden lateinische Wörter (Low & slow) umdrehen */
      var rtl = doc.dir === "rtl";
      window.SplitText.create(el, {
        type: rtl ? "lines" : "lines,words", mask: "lines", autoSplit: true,
        onSplit: function (self) {
          return gsap.from(rtl ? self.lines : self.words, {
            yPercent: 115, duration: 1.2, ease: "expo.out", stagger: 0.05,
            scrollTrigger: { trigger: el, start: "top 88%", once: true }
          });
        }
      });
    });
  }
  ScrollTrigger.batch(".eyebrow:not(.hero-eyebrow)", {
    start: "top 92%", once: true,
    onEnter: function (b) { gsap.fromTo(b, { autoAlpha: 0, x: -16 }, { autoAlpha: 1, x: 0, duration: 1, ease: "expo.out", stagger: 0.08 }); }
  });
  var fadeSel = ".stat, .lunch-sub, .lunch-text, .lunch-live, .process-text, .jerky-text, .jerky-flavors, .visit-block, .order-card, .map, .m-note, .m-cat-head";
  gsap.set(fadeSel, { autoAlpha: 0, y: 30 });
  ScrollTrigger.batch(fadeSel, {
    start: "top 90%", once: true,
    onEnter: function (b) { gsap.to(b, { autoAlpha: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.08 }); }
  });

  /* ------------------------------------------------------------------
     Manifest: Wort für Wort aus dem Rauch, Bilder öffnen sich im Satz
     ------------------------------------------------------------------ */
  (function manifest() {
    var el = $(".manifest-text");
    if (!el) return;
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(" "));
            else { var s = document.createElement("span"); s.className = "word"; s.textContent = part; frag.appendChild(s); }
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1 && ch.classList.contains("pill")) ch.classList.add("word");
        else if (ch.nodeType === 1) walk(ch);
      });
    }
    walk(el);
    var words = $$(".word", el);
    gsap.to(words, {
      color: function (i, t) { return t.closest("em") ? COPPER_HI : BONE; },
      ease: "none", stagger: 0.12,
      scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 42%", scrub: 0.4 }
    });
    $$(".pill", el).forEach(function (p) {
      gsap.fromTo(p, { width: "0em", marginLeft: 0, marginRight: 0 }, {
        width: "1.7em", marginLeft: "0.04em", marginRight: "0.04em", ease: "none",
        scrollTrigger: { trigger: p, start: "top 82%", end: "top 58%", scrub: 0.4 }
      });
      gsap.fromTo($("img", p), { scale: 1.6 }, { scale: 1, ease: "none", scrollTrigger: { trigger: p, start: "top 82%", end: "top 50%", scrub: 0.4 } });
    });

    $$("[data-count]").forEach(function (n) {
      var target = parseInt(n.dataset.count, 10), from = target > 1000 ? target - 30 : 0, o = { v: from };
      n.textContent = from;
      ScrollTrigger.create({
        trigger: n, start: "top 90%", once: true,
        onEnter: function () {
          gsap.to(o, { v: target, duration: 1.8, ease: "power3.out", onUpdate: function () { n.textContent = Math.round(o.v); } });
        }
      });
    });
  })();

  /* ------------------------------------------------------------------
     Signatur: gepinnte Bühne, fünf Gerichte drehen sich ein,
     Zutaten werden beschriftet
     ------------------------------------------------------------------ */
  (function signature() {
    var sec = $(".sig");
    if (!sec) return;
    var stage = $(".sig-stage", sec);
    var dishes = $$(".sig-dish", sec), texts = $$(".sig-text", sec), words = $$(".sig-bgwords span", sec);
    var segs = $$(".sig-progress i", sec), idxEl = $(".sig-idx", sec), ring = $(".sig-ring", sec), tickG = $(".sig-ticks", sec);
    var RING = 1646.3, N = dishes.length;

    function layoutCallouts() {
      if (isMobile()) return;
      var sr = stage.getBoundingClientRect(), vw = window.innerWidth;
      dishes.forEach(function (d) {
        var W = d.offsetWidth, left = sr.left + d.offsetLeft;
        $$(".co", d).forEach(function (co) {
          var x = parseFloat(co.style.getPropertyValue("--x")) / 100;
          var label = $(".co-label", co), lw = label.offsetWidth;
          var dotX = left + x * W, isR = co.classList.contains("co--r");
          var want = (isR ? (1 - x) * W : x * W) + 36;
          var room = isR ? vw - 20 - lw - 26 - dotX : dotX - 20 - lw - 26;
          co.style.setProperty("--len", Math.max(28, Math.min(want, room)) + "px");
        });
      });
    }
    layoutCallouts();
    ScrollTrigger.addEventListener("refreshInit", layoutCallouts);

    gsap.set(words, { autoAlpha: 0 });
    gsap.set(texts, { autoAlpha: 0 });
    gsap.set($$(".co-dot", sec), { scale: 0 });
    gsap.set($$(".co-line", sec), { scaleX: 0 });
    gsap.set($$(".co-label", sec), { autoAlpha: 0 });

    var blur = function (px) { return isMobile() ? "blur(0px)" : "blur(" + px + "px)"; };

    function inTl(i) {
      var d = dishes[i], tl = gsap.timeline();
      tl.fromTo(d, { autoAlpha: 0, scale: 0.55, rotation: -26, yPercent: 10, filter: blur(10) },
        { autoAlpha: 1, scale: 1, rotation: 0, yPercent: 0, filter: blur(0), duration: 0.8, ease: "power2.out" }, 0)
        .fromTo(words[i], { autoAlpha: 0, xPercent: 14 }, { autoAlpha: 1, xPercent: 0, duration: 0.8, ease: "power2.out" }, 0)
        .fromTo(texts[i], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0.25)
        .to($$(".co-dot", d), { scale: 1, duration: 0.25, stagger: 0.07, ease: "back.out(3)" }, 0.55)
        .to($$(".co-line", d), { scaleX: 1, duration: 0.35, stagger: 0.07, ease: "power2.out" }, 0.62)
        .fromTo($$(".co-label", d), { autoAlpha: 0, x: function (k, el) { return el.closest(".co--l") ? 12 : -12; } },
          { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.07 }, 0.78);
      return tl;
    }
    function outTl(i) {
      var d = dishes[i], tl = gsap.timeline();
      tl.to($$(".co-label", d), { autoAlpha: 0, duration: 0.15 }, 0)
        .to($$(".co-line", d), { scaleX: 0, duration: 0.2 }, 0)
        .to($$(".co-dot", d), { scale: 0, duration: 0.2 }, 0.05)
        .to(texts[i], { autoAlpha: 0, y: -30, duration: 0.35, ease: "power2.in" }, 0)
        .to(words[i], { autoAlpha: 0, xPercent: -14, duration: 0.6, ease: "power2.in" }, 0)
        .to(d, { autoAlpha: 0, scale: 1.2, rotation: 20, yPercent: -8, filter: blur(10), duration: 0.55, ease: "power2.in" }, 0.05);
      return tl;
    }

    /* Erstes Gericht steht schon, wenn die Bühne pinnt. Der Auftritt beim
       Hereinscrollen läuft über Kind und Container Elemente, die der gepinnte
       Ablauf nie anfasst. So können sich die beiden nie überschreiben. */
    var d0 = dishes[0];
    gsap.set([d0, texts[0], words[0]], { autoAlpha: 1 });
    gsap.set($$(".co-dot", d0), { scale: 1 });
    gsap.set($$(".co-line", d0), { scaleX: 1 });
    gsap.set($$(".co-label", d0), { autoAlpha: 1 });
    gsap.timeline({ scrollTrigger: { trigger: sec, start: "top 80%", end: "top 5%", scrub: 0.6 } })
      .fromTo($("img", d0), { autoAlpha: 0, scale: 0.55, rotation: -26, yPercent: 10 },
        { autoAlpha: 1, scale: 1, rotation: 0, yPercent: 0, duration: 0.8, ease: "power2.out" }, 0)
      .fromTo(".sig-bgwords", { autoAlpha: 0, xPercent: 8 }, { autoAlpha: 1, xPercent: 0, duration: 0.8 }, 0)
      .fromTo(".sig-texts", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.3)
      .fromTo($(".co-list", d0), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.6);

    var H = 0.9, X = 1.3;
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: sec, pin: ".sig-pin", start: "top top",
        end: function () { return "+=" + window.innerHeight * (isMobile() ? 3.4 : 4.6); },
        scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: function (self) {
          var p = self.progress;
          var active = Math.min(N - 1, Math.max(0, Math.round(p * (N - 1))));
          idxEl.textContent = pad(active + 1);
          segs.forEach(function (s, k) { s.style.setProperty("--p", gsap.utils.clamp(0, 1, p * N - k)); });
          ring.style.strokeDashoffset = RING * (1 - p);
          tickG.style.transform = "rotate(" + p * 120 + "deg)";
        }
      }
    });
    tickG.style.transformOrigin = "300px 300px";
    tl.to({}, { duration: H });
    for (var i = 0; i < N - 1; i++) {
      var at = i * (H + X) + H;
      tl.add(outTl(i), at).add(inTl(i + 1), at + 0.3);
    }
    tl.to({}, { duration: H });
  })();

  /* ------------------------------------------------------------------
     Mittagsmenü: Preis rollt wie ein Zählwerk, drei Burger fächern auf
     ------------------------------------------------------------------ */
  (function lunch() {
    var num = $(".lunch-num");
    if (!num) return;
    var txt = num.textContent.trim();
    num.textContent = "";
    num.setAttribute("aria-label", txt);
    var cols = [];
    txt.split("").forEach(function (ch) {
      if (/\d/.test(ch)) {
        var cell = document.createElement("span"), col = document.createElement("span");
        cell.className = "roll"; col.className = "roll-col";
        for (var k = 0; k < 20; k++) { var s = document.createElement("span"); s.textContent = k % 10; col.appendChild(s); }
        cell.setAttribute("aria-hidden", "true");
        cell.appendChild(col); num.appendChild(cell);
        cols.push({ el: col, d: parseInt(ch, 10) });
      } else {
        var sep = document.createElement("span");
        sep.className = "roll-sep"; sep.textContent = ch; sep.setAttribute("aria-hidden", "true");
        num.appendChild(sep);
      }
    });
    gsap.set(cols.map(function (c) { return c.el; }), { yPercent: 0 });
    ScrollTrigger.create({
      trigger: num, start: "top 85%", once: true,
      onEnter: function () {
        cols.forEach(function (c, k) {
          gsap.to(c.el, { yPercent: -((10 + c.d) / 20) * 100, duration: 2 + k * 0.25, ease: "expo.inOut" });
        });
      }
    });

    gsap.fromTo(".lunch-bg", { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: ".lunch", start: "top bottom", end: "bottom top", scrub: true } });

    mm.add({ d: "(min-width: 761px)", m: "(max-width: 760px)" }, function (ctx) {
      var spread = ctx.conditions.d ? 40 : 30;
      var tl = gsap.timeline({ scrollTrigger: { trigger: ".lunch-trio", start: "top 85%", end: "center 45%", scrub: 0.6 } });
      tl.fromTo(".trio-item--1", { xPercent: 0, rotation: 0, scale: 0.8 }, { xPercent: -spread, yPercent: 8, rotation: -11, scale: 0.92, ease: "none" }, 0)
        .fromTo(".trio-item--2", { yPercent: 0, rotation: 0, scale: 0.8 }, { yPercent: -26, rotation: 4, scale: 0.82, ease: "none" }, 0)
        .fromTo(".trio-item--3", { xPercent: 0, rotation: 0, scale: 0.8 }, { xPercent: spread, yPercent: 10, rotation: 11, scale: 0.9, ease: "none" }, 0);
    });
  })();

  /* ------------------------------------------------------------------
     Prozess: horizontal am Desktop, gestapelt am Handy
     ------------------------------------------------------------------ */
  (function processSection() {
    var track = $(".process-track");
    if (!track) return;
    var hEl = $(".clock-h"), fillEl = $(".clock-fill");
    hEl.textContent = "0";

    function clockTl(trigger) {
      var o = { v: 0 };
      return gsap.timeline({ scrollTrigger: trigger })
        .to(fillEl, { strokeDashoffset: 0, ease: "none" }, 0)
        .to(o, { v: 16, ease: "none", onUpdate: function () { hEl.textContent = Math.round(o.v); } }, 0);
    }

    mm.add("(min-width: 761px)", function () {
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var tween = gsap.to(track, {
        x: function () { return -dist(); }, ease: "none",
        scrollTrigger: {
          trigger: ".process", pin: ".process-pin", start: "top top",
          end: function () { return "+=" + dist(); }, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true
        }
      });
      gsap.to(".process-line i", {
        scaleX: 1, ease: "none",
        scrollTrigger: { trigger: ".process", start: "top top", end: function () { return "+=" + dist(); }, scrub: true }
      });
      $$(".pp-media:not(.pp-media--cut) img").forEach(function (img) {
        gsap.fromTo(img, { xPercent: -7 }, {
          xPercent: 7, ease: "none",
          scrollTrigger: { trigger: img.closest(".pp"), containerAnimation: tween, start: "left right", end: "right left", scrub: true }
        });
      });
      gsap.fromTo(".pp-media--cut img", { rotation: -18, scale: 0.85 }, {
        rotation: 6, scale: 1.05, ease: "none",
        scrollTrigger: { trigger: ".pp--cut", containerAnimation: tween, start: "left right", end: "right left", scrub: true }
      });
      clockTl({ trigger: ".pp--clock", containerAnimation: tween, start: "left 85%", end: "center 45%", scrub: true });
      gsap.from(".sauce-pic", {
        scale: 0.55, yPercent: 18, autoAlpha: 0, stagger: 0.06, ease: "none",
        scrollTrigger: { trigger: ".pp--sauce", containerAnimation: tween, start: "left 90%", end: "left 35%", scrub: true }
      });
    });

    mm.add("(max-width: 760px)", function () {
      clockTl({ trigger: ".pp--clock", start: "top 80%", end: "center 45%", scrub: true });
      $$(".pp-media img").forEach(function (img) {
        gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: img, start: "top bottom", end: "bottom top", scrub: true } });
      });
    });
  })();

  /* ------------------------------------------------------------------
     Speisekarte: Tabs folgen dem Scrollen, Bild schwebt am Cursor
     ------------------------------------------------------------------ */
  (function menu() {
    $$(".m-cat").forEach(function (c) {
      ScrollTrigger.create({
        trigger: c, start: "top 45%", end: "bottom 45%",
        onToggle: function (self) { if (self.isActive) setTab(c.id.replace("karte-", "")); }
      });
    });
    gsap.set(".m-item", { autoAlpha: 0, y: 24 });
    ScrollTrigger.batch(".m-item", {
      start: "top 94%", once: true,
      onEnter: function (b) { gsap.to(b, { autoAlpha: 1, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.05 }); }
    });

    if (!fine) return;
    var pv = $(".m-preview"), pimg = $("img", pv), list = $(".m-body");
    gsap.set(pv, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 0.6, autoAlpha: 0 });
    var xTo = gsap.quickTo(pv, "x", { duration: 0.65, ease: "power3" });
    var yTo = gsap.quickTo(pv, "y", { duration: 0.65, ease: "power3" });
    var rTo = gsap.quickTo(pv, "rotation", { duration: 0.8, ease: "power3" });
    var lastX = 0, current = null, visible = false;
    list.addEventListener("pointermove", function (e) {
      var off = Math.min(300, window.innerWidth * 0.2);
      xTo(e.clientX - off);
      yTo(e.clientY);
      rTo(gsap.utils.clamp(-16, 16, (e.clientX - lastX) * 0.8));
      lastX = e.clientX;
      var item = e.target.closest(".m-item[data-img]");
      if (item && item.dataset.img !== current) {
        current = item.dataset.img;
        pimg.src = "assets/img/cut/" + current + ".webp";
      }
      if (item && !visible) { visible = true; gsap.to(pv, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)", overwrite: "auto" }); }
      if (!item && visible) { visible = false; gsap.to(pv, { autoAlpha: 0, scale: 0.6, duration: 0.35, overwrite: "auto" }); }
    });
    list.addEventListener("pointerleave", function () {
      visible = false;
      gsap.to(pv, { autoAlpha: 0, scale: 0.6, duration: 0.35, overwrite: "auto" });
    });
  })();

  /* ------------------------------------------------------------------
     Galerie: Bilder öffnen sich von unten, Parallax im Rahmen
     ------------------------------------------------------------------ */
  gsap.fromTo(".film-frame", { clipPath: "inset(14% 6% 14% 6% round 22px)" }, {
    clipPath: "inset(0% 0% 0% 0% round 22px)", duration: 1.5, ease: "expo.out",
    scrollTrigger: { trigger: ".film", start: "top 85%", once: true }
  });
  $$(".gal-item").forEach(function (item, i) {
    gsap.fromTo(item, { clipPath: "inset(100% 0% 0% 0% round 20px)" }, {
      clipPath: "inset(0% 0% 0% 0% round 20px)", duration: 1.4, ease: "expo.out", delay: (i % 3) * 0.08,
      scrollTrigger: { trigger: item, start: "top 90%", once: true }
    });
    gsap.fromTo($("img", item), { yPercent: -7 }, {
      yPercent: 7, ease: "none",
      scrollTrigger: { trigger: item, start: "top bottom", end: "bottom top", scrub: true }
    });
  });

  /* ------------------------------------------------------------------
     Jerky: das Wort dehnt sich über die variable Breite der Schrift
     ------------------------------------------------------------------ */
  gsap.fromTo(".jerky-word", { "--wdth": 62 }, {
    "--wdth": 125, ease: "none",
    scrollTrigger: { trigger: ".jerky", start: "top bottom", end: "bottom top", scrub: true }
  });
  (function jerky() {
    var pack = $(".jerky-pack-inner");
    if (!pack) return;
    gsap.to(pack, { y: -14, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1 });
    gsap.fromTo(".jerky-shine", { xPercent: -130 }, { xPercent: 130, duration: 1.6, ease: "power2.inOut", repeat: -1, repeatDelay: 2.8 });
    gsap.fromTo(".jerky-pack", { rotation: -12, yPercent: 20, autoAlpha: 0 }, {
      rotation: -4, yPercent: 0, autoAlpha: 1, duration: 1.6, ease: "expo.out",
      scrollTrigger: { trigger: ".jerky", start: "top 70%", once: true }
    });
    if (!fine) return;
    gsap.set(pack, { transformPerspective: 900 });
    var rX = gsap.quickTo(pack, "rotationX", { duration: 0.8, ease: "power3" });
    var rY = gsap.quickTo(pack, "rotationY", { duration: 0.8, ease: "power3" });
    $(".jerky").addEventListener("pointermove", function (e) {
      var r = pack.getBoundingClientRect();
      rY(gsap.utils.clamp(-22, 22, (e.clientX - (r.left + r.width / 2)) / 18));
      rX(gsap.utils.clamp(-16, 16, -(e.clientY - (r.top + r.height / 2)) / 22));
    });
    $(".jerky").addEventListener("pointerleave", function () { rX(0); rY(0); });
  })();

  /* ------------------------------------------------------------------
     Social: Karten fliegen von rechts rein, Zahlen zählen hoch
     ------------------------------------------------------------------ */
  gsap.from(".soc", {
    x: 140, autoAlpha: 0, duration: 1.3, ease: "expo.out", stagger: 0.06,
    scrollTrigger: { trigger: ".social-rail", start: "top 88%", once: true }
  });
  $$(".social-num").forEach(function (el) {
    var n = +el.dataset.num, o = { v: 0 }, plus = el.hasAttribute("data-plus") ? "+" : "", step = n >= 50000 ? 1000 : 100;
    gsap.to(o, {
      v: n, duration: 1.8, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 92%", once: true },
      onUpdate: function () { el.textContent = socNum.format(Math.round(o.v / step) * step) + plus; }
    });
  });

  /* ------------------------------------------------------------------
     Coming Soon: Bild öffnet sich, Aktivitäten erscheinen nacheinander
     ------------------------------------------------------------------ */
  gsap.fromTo(".soon-photo", { clipPath: "inset(12% 10% 12% 10% round 24px)" }, {
    clipPath: "inset(0% 0% 0% 0% round 24px)", duration: 1.5, ease: "expo.out",
    scrollTrigger: { trigger: ".soon-photo", start: "top 85%", once: true }
  });
  gsap.from(".news", {
    y: 26, autoAlpha: 0, duration: 1, ease: "expo.out", stagger: 0.1,
    scrollTrigger: { trigger: ".soon-news", start: "top 88%", once: true }
  });

  /* ------------------------------------------------------------------
     Besuch: Straße zeichnet sich, Pin landet
     ------------------------------------------------------------------ */
  gsap.timeline({ scrollTrigger: { trigger: ".map", start: "top 75%", once: true } })
    .from(".map-grid path", { opacity: 0, duration: 0.8, stagger: 0.04 }, 0)
    .to(".map-street--main", { strokeDashoffset: 0, duration: 1.6, ease: "expo.inOut" }, 0.1)
    .from(".map-pin", { scale: 0, transformOrigin: "50% 50%", duration: 0.8, ease: "back.out(2.5)" }, 1.1)
    .from(".map-card", { y: 30, autoAlpha: 0, duration: 0.9, ease: "expo.out" }, 1.2);

  gsap.from(".foot-mark", {
    yPercent: 30, autoAlpha: 0, duration: 1.6, ease: "expo.out",
    scrollTrigger: { trigger: ".foot", start: "top 85%", once: true }
  });

  /* ------------------------------------------------------------------
     Cursor und magnetische Buttons
     ------------------------------------------------------------------ */
  if (fine) {
    var cur = $(".cursor"), dot = $(".cursor-dot", cur), ringEl = $(".cursor-ring", cur), lab = $(".cursor-label", cur);
    var dx = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3" }), dy = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3" });
    var cx = gsap.quickTo([ringEl, lab], "x", { duration: 0.5, ease: "power3" }), cy = gsap.quickTo([ringEl, lab], "y", { duration: 0.5, ease: "power3" });
    gsap.set([dot, ringEl, lab], { xPercent: -50, yPercent: -50 });
    window.addEventListener("pointermove", function (e) {
      dx(e.clientX); dy(e.clientY); cx(e.clientX); cy(e.clientY);
      cur.style.opacity = 1;
    });
    document.addEventListener("pointerleave", function () { cur.style.opacity = 0; });
    document.addEventListener("pointerover", function (e) {
      var t = e.target.closest("[data-cursor]");
      var h = e.target.closest("a, button, .m-item");
      cur.classList.toggle("has-label", !!t);
      cur.classList.toggle("is-hover", !t && !!h);
      if (t) lab.textContent = t.dataset.cursor;
    });

    $$("[data-magnetic]").forEach(function (el) {
      var mx = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" }), my = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.28);
        my((e.clientY - (r.top + r.height / 2)) * 0.36);
      });
      el.addEventListener("pointerleave", function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, .4)" });
      });
    });
  }

  /* ------------------------------------------------------------------
     Größe ändern
     ------------------------------------------------------------------ */
  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      smoke && smoke.resize();
      embers && embers.resize();
      if (activeCat) setTab(activeCat, true);
    }, 150);
  });
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
