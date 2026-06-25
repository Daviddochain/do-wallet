(function () {
  "use strict";

  var RELEASE_NAME = "Do-Wallet";
  var RELEASE_VERSION = "current";
  var RELEASE_DATE = "2026-06-21";
  var LOGO_VIDEO_SRC = "/static/media/broadcasting-transmission-20260615.mp4";

  window.__DO_WALLET_RELEASE_NAME__ = RELEASE_NAME;
  window.__DO_WALLET_RELEASE_VERSION__ = RELEASE_VERSION;
  window.__DO_WALLET_RELEASE_DATE__ = RELEASE_DATE;

  function text(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function cleanBrandText(value) {
    return String(value || "")
      .replace(/\bDo-Wallet\s+v2\b/gi, RELEASE_NAME)
      .replace(/\bDo-Wallet\s+V2\b/g, RELEASE_NAME);
  }

  function setMeta(name, value) {
    var selector = 'meta[name="' + name + '"],meta[property="' + name + '"]';
    var node = document.querySelector(selector);
    if (!node) {
      node = document.createElement("meta");
      node.setAttribute(name.indexOf("og:") === 0 ? "property" : "name", name);
      document.head.appendChild(node);
    }
    node.setAttribute("content", value);
  }

  function rewriteVisibleBrand() {
    document.title = cleanBrandText(document.title) || RELEASE_NAME;
    if (document.title !== RELEASE_NAME) document.title = RELEASE_NAME;
    setMeta("application-name", RELEASE_NAME);
    setMeta("apple-mobile-web-app-title", RELEASE_NAME);
    setMeta("twitter:title", RELEASE_NAME);
    setMeta("og:title", RELEASE_NAME);

    var root = document.body || document.documentElement;
    if (!root) return;

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        if (!parent || /^(SCRIPT|STYLE|NOSCRIPT)$/i.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return /\bDo-Wallet\s+v2\b/i.test(node.nodeValue || "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });

    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      node.nodeValue = cleanBrandText(node.nodeValue);
    });

    Array.prototype.forEach.call(root.querySelectorAll("[title],[aria-label],[alt]"), function (node) {
      ["title", "aria-label", "alt"].forEach(function (attr) {
        var value = node.getAttribute(attr);
        if (/\bDo-Wallet\s+v2\b/i.test(value || "")) node.setAttribute(attr, cleanBrandText(value));
      });
    });

    replaceHeaderLogo();
    document.documentElement.setAttribute("data-do-wallet-branding-ready", "true");
  }

  function createLogoVideo(img) {
    var video = document.createElement("video");
    video.src = LOGO_VIDEO_SRC;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("aria-label", RELEASE_NAME);
    video.setAttribute("data-do-wallet-brand-video", "1");
    video.className = img.className || "";
    video.style.width = img.style.width || (img.width ? img.width + "px" : "34px");
    video.style.height = img.style.height || (img.height ? img.height + "px" : "34px");
    video.style.minWidth = video.style.width;
    video.style.borderRadius = img.style.borderRadius || "8px";
    video.style.objectFit = "contain";
    video.style.display = "inline-block";
    video.style.verticalAlign = "middle";
    video.addEventListener("loadedmetadata", function () {
      try {
        video.play().catch(function () {});
      } catch (error) {}
    });
    return video;
  }

  function isHeaderLogo(img) {
    if (!img) return false;
    if (img.closest("[data-do-wallet-brand-video]")) return false;
    var src = String(img.currentSrc || img.src || "");
    var nearbyText = "";
    try {
      nearbyText = text((img.closest("header,nav,aside,[class*='header'],[class*='sidebar']") || img.parentElement || {}).innerText || "");
    } catch (error) {}
    if (!/(do-logo|dologo|logo|icon|DoLogo|broadcasting-transmission)/i.test(src) && !/\bDo-Wallet\b/i.test(nearbyText)) return false;
    var rect = img.getBoundingClientRect ? img.getBoundingClientRect() : null;
    if (!rect) return false;
    if (!rect.width || !rect.height) {
      return /\bDo-Wallet\b/i.test(nearbyText) || /(do-logo|dologo|DoLogo)/i.test(src);
    }
    return rect.top >= 0 && rect.top < 130 && rect.left >= 0 && rect.left < 300 && rect.width <= 120 && rect.height <= 120;
  }

  function replaceHeaderLogo() {
    Array.prototype.forEach.call(document.querySelectorAll("img"), function (img) {
      if (!isHeaderLogo(img)) return;
      img.replaceWith(createLogoVideo(img));
    });
  }

  var scheduled = false;
  function scheduleRewrite() {
    if (scheduled) return;
    scheduled = true;
    var run = function () {
      scheduled = false;
      rewriteVisibleBrand();
    };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run);
    else window.setTimeout(run, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleRewrite, { once: true });
  } else {
    scheduleRewrite();
  }

  try {
    var observer = new MutationObserver(scheduleRewrite);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
    window.setTimeout(function () {
      observer.disconnect();
    }, 60 * 1000);
  } catch (error) {}

  var ticks = 0;
  var timer = window.setInterval(function () {
    scheduleRewrite();
    ticks += 1;
    if (ticks >= 30) window.clearInterval(timer);
  }, 1000);
})();
