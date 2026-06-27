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
    var changed = false;
    if (!node) {
      node = document.createElement("meta");
      node.setAttribute(name.indexOf("og:") === 0 ? "property" : "name", name);
      document.head.appendChild(node);
      changed = true;
    }
    if (node.getAttribute("content") !== value) {
      node.setAttribute("content", value);
      changed = true;
    }
    return changed;
  }

  function rewriteVisibleBrand() {
    var changed = false;
    var nextTitle = cleanBrandText(document.title) || RELEASE_NAME;
    if (nextTitle !== RELEASE_NAME) nextTitle = RELEASE_NAME;
    if (document.title !== nextTitle) {
      document.title = nextTitle;
      changed = true;
    }
    changed = setMeta("application-name", RELEASE_NAME) || changed;
    changed = setMeta("apple-mobile-web-app-title", RELEASE_NAME) || changed;
    changed = setMeta("twitter:title", RELEASE_NAME) || changed;
    changed = setMeta("og:title", RELEASE_NAME) || changed;

    var root = document.body || document.documentElement;
    if (!root) return changed;

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
      changed = true;
    });

    Array.prototype.forEach.call(root.querySelectorAll("[title],[aria-label],[alt]"), function (node) {
      ["title", "aria-label", "alt"].forEach(function (attr) {
        var value = node.getAttribute(attr);
        if (/\bDo-Wallet\s+v2\b/i.test(value || "")) {
          node.setAttribute(attr, cleanBrandText(value));
          changed = true;
        }
      });
    });

    changed = replaceHeaderLogo() || changed;
    if (document.documentElement.getAttribute("data-do-wallet-branding-ready") !== "true") {
      document.documentElement.setAttribute("data-do-wallet-branding-ready", "true");
      changed = true;
    }
    return changed;
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
    var changed = false;
    Array.prototype.forEach.call(document.querySelectorAll("img"), function (img) {
      if (!isHeaderLogo(img)) return;
      img.replaceWith(createLogoVideo(img));
      changed = true;
    });
    return changed;
  }

  function isPotentialLogoImage(node) {
    if (!node || node.nodeType !== 1 || !/^IMG$/i.test(node.tagName || "")) return false;
    var src = String(node.currentSrc || node.src || node.getAttribute("src") || "");
    var label = String(node.getAttribute("alt") || node.getAttribute("title") || node.className || "");
    return /(do-logo|dologo|DoLogo|broadcasting-transmission)/i.test(src + " " + label);
  }

  function nodeNeedsRewrite(node) {
    if (!node) return false;
    if (node.nodeType === 3) return /\bDo-Wallet\s+v2\b/i.test(node.nodeValue || "");
    if (node.nodeType !== 1) return false;
    if (isPotentialLogoImage(node)) return true;
    var label = "";
    try {
      label = [
        node.getAttribute && node.getAttribute("title"),
        node.getAttribute && node.getAttribute("aria-label"),
        node.getAttribute && node.getAttribute("alt"),
        node.textContent
      ].join(" ");
    } catch (error) {}
    if (/\bDo-Wallet\s+v2\b/i.test(label || "")) return true;
    try {
      return Boolean(node.querySelector && node.querySelector('img[src*="do-logo"],img[src*="dologo"],img[src*="DoLogo"],img[src*="broadcasting-transmission"]'));
    } catch (error) {
      return false;
    }
  }

  function mutationsNeedRewrite(mutations) {
    if (!Array.isArray(mutations)) return true;
    for (var index = 0; index < mutations.length; index += 1) {
      var mutation = mutations[index];
      if (mutation.type === "characterData" && nodeNeedsRewrite(mutation.target)) return true;
      if (mutation.type === "attributes" && /^(title|aria-label|alt|src)$/i.test(mutation.attributeName || "") && nodeNeedsRewrite(mutation.target)) return true;
      if (mutation.type === "childList") {
        for (var childIndex = 0; childIndex < mutation.addedNodes.length; childIndex += 1) {
          if (nodeNeedsRewrite(mutation.addedNodes[childIndex])) return true;
        }
      }
    }
    return false;
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
    var observer = new MutationObserver(function (mutations) {
      if (mutationsNeedRewrite(Array.prototype.slice.call(mutations || []))) scheduleRewrite();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["title", "aria-label", "alt", "src"]
    });
    window.setTimeout(function () {
      observer.disconnect();
    }, 12 * 1000);
  } catch (error) {}

  var ticks = 0;
  var timer = window.setInterval(function () {
    scheduleRewrite();
    ticks += 1;
    if (ticks >= 6) window.clearInterval(timer);
  }, 1500);
})();
