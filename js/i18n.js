/* The Meat Company · Sprachen
   Deutsch steht im HTML. Für EN, TR, AR, RU tauscht dieses Skript vor main.js alle Texte
   (data-i18n = Inhalt, data-i18n-a = "attr:schluessel;attr:schluessel") aus js/i18n-data.js.
   Die Sprache setzt das Skript im <head> (?lang= vor gespeicherter Wahl, sonst Deutsch).
   Ein Wechsel lädt die Seite neu, damit alle Animationen mit dem neuen Text messen. */
(function () {
  "use strict";

  var doc = document.documentElement;
  var lang = doc.lang || "de";
  var all = window.TMC_I18N || {}, de = all.de || {}, dict = all[lang] || {};
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  window.TMC_LANG = lang;
  window.TMC_t = function (key, vars) {
    var s = dict[key] != null ? dict[key] : (de[key] != null ? de[key] : key);
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
    return s;
  };

  if (lang !== "de" && all[lang]) {
    $$("[data-i18n]").forEach(function (el) {
      var v = dict[el.getAttribute("data-i18n")];
      if (v == null) return;
      if (v.indexOf("{p") > -1) {
        var pills = el.querySelectorAll(".pill");
        v = v.replace(/\{p(\d)\}/g, function (m, n) { var p = pills[n - 1]; return p ? p.outerHTML : ""; });
      }
      el.innerHTML = v;
    });
    $$("[data-i18n-a]").forEach(function (el) {
      el.getAttribute("data-i18n-a").split(";").forEach(function (pair) {
        var i = pair.indexOf(":"), attr = pair.slice(0, i).trim(), v = dict[pair.slice(i + 1).trim()];
        if (v != null) el.setAttribute(attr, v);
      });
    });
  }

  /* Türkisch schreibt groß mit İ. Unübersetzte Namen (Brisket, Shokupan, Sriracha) sind englisch
     und sollen als BRISKET erscheinen, nicht als BRİSKET. */
  if (lang === "tr") {
    $$("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      if (dict[k] == null) return;
      if (dict[k] === de[k]) el.setAttribute("lang", "en");
      else if (el.parentNode.closest('[lang="en"], [lang="de"]')) el.setAttribute("lang", "tr");
    });
    /* Safari beachtet lang beim Großschreiben nicht, deshalb werden diese Texte hier selbst groß geschrieben */
    $$('[lang="en"], [lang="de"]', document.body).forEach(function (root) {
      var walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n;
      while ((n = walk.nextNode())) {
        var p = n.parentElement, own = p && p.closest("[lang]");
        if (!own || own.getAttribute("lang") === "tr" || !n.nodeValue.trim()) continue;
        if (getComputedStyle(p).textTransform === "uppercase") n.nodeValue = n.nodeValue.toLocaleUpperCase(own.getAttribute("lang"));
      }
    });
  }

  /* Kleines "Heute" Schild in den Öffnungszeiten kommt aus CSS (content: var(--today)) */
  doc.style.setProperty("--today", JSON.stringify(window.TMC_t("js.today")));

  /* Umschalter: Menü oben in der Navigation und Reihe im Handy Menü */
  $$("[data-lang-current]").forEach(function (el) { el.textContent = lang.toUpperCase(); });
  $$("[data-lang]").forEach(function (a) {
    var l = a.getAttribute("data-lang");
    if (l === lang) a.setAttribute("aria-current", "true");
    a.addEventListener("click", function (e) {
      e.preventDefault();
      if (l === lang) return close();
      try { localStorage.setItem("tmc-lang", l); } catch (err) { /* privat */ }
      try { sessionStorage.setItem("tmc-scroll", String(window.pageYOffset)); } catch (err) { /* privat */ }
      location.href = location.pathname + "?lang=" + l;
    });
  });

  var box = document.querySelector(".lang"), btn = box && box.querySelector(".lang-toggle");
  function close() {
    if (!box) return;
    box.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
  }
  if (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = !box.classList.contains("is-open");
      box.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) { if (!box.contains(e.target)) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  doc.classList.remove("i18n-wait");
})();
