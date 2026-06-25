(function(){
  var VIDEO_SRC = "/static/media/broadcasting-transmission-20260615.mp4";
  var scheduled = false;
  var WATCH_MS = 2 * 60 * 1000;
  var VIDEO_ATTR = "data-do-wallet-broadcasting-video";
  var MODAL_ATTR = "data-do-wallet-broadcasting-modal";
  var BROADCAST_TEXT = /Broadcasting transaction|Broadcast transaction|Transaction is processing|Transaction queued|Tx hash|Queued|Signing transaction|Submitting transaction|Processing transaction|Waiting for transaction|Transaction submitted/i;
  var STRONG_BROADCAST_TEXT = /Broadcasting transaction|Tx hash|Transaction is processing|Queued/i;

  function textOf(node){
    if (!node || node.nodeType !== 1) return "";
    try {
      return (node.innerText || node.textContent || "").slice(0, 5000);
    } catch (e) {
      return "";
    }
  }

  function hasBroadcastingText(node){
    return BROADCAST_TEXT.test(textOf(node));
  }

  function hasStrongBroadcastingText(node){
    var text = textOf(node);
    return STRONG_BROADCAST_TEXT.test(text) && /Broadcasting|Tx hash|Transaction/i.test(text);
  }

  function rectOf(node){
    try {
      return node && node.getBoundingClientRect ? node.getBoundingClientRect() : null;
    } catch (e) {
      return null;
    }
  }

  function isVisible(node){
    var rect = rectOf(node);
    if (!rect) return true;
    return rect.width > 20 && rect.height > 20;
  }

  function looksLikeBroadcastPanel(node){
    if (!node || node.nodeType !== 1 || !isVisible(node)) return false;
    if (!hasStrongBroadcastingText(node)) return false;
    var rect = rectOf(node);
    if (!rect) return true;
    return rect.width >= 250 && rect.height >= 180;
  }

  function scorePanel(node){
    var rect = rectOf(node);
    var area = rect ? rect.width * rect.height : 999999;
    var score = area;
    var position = "";
    try {
      position = window.getComputedStyle(node).position;
    } catch (e) {}
    if (position === "fixed" || position === "absolute") score -= 250000;
    if (node.querySelector && node.querySelector("img, picture")) score -= 100000;
    return score;
  }

  function findBroadcastPanelFrom(node){
    var best = null;
    var current = node && node.nodeType === 1 ? node : null;
    var depth = 0;
    while (current && current !== document.body && depth < 12) {
      if (looksLikeBroadcastPanel(current)) {
        if (!best || scorePanel(current) < scorePanel(best)) best = current;
      }
      current = current.parentElement;
      depth += 1;
    }
    return best;
  }

  function findBroadcastPanels(){
    var panels = [];
    var candidates = Array.prototype.slice.call(document.querySelectorAll(
      '[role="dialog"], .modal, [class*="modal"], [class*="Modal"], [class*="Dialog"], [class*="dialog"], div, section, article'
    ));

    candidates.forEach(function(node){
      if (!looksLikeBroadcastPanel(node)) return;
      var childPanel = Array.prototype.slice.call(node.children || []).some(function(child){
        return child !== node && looksLikeBroadcastPanel(child) && scorePanel(child) < scorePanel(node);
      });
      if (!childPanel && panels.indexOf(node) === -1) panels.push(node);
    });

    Array.prototype.forEach.call(document.querySelectorAll("img, picture"), function(node){
      var panel = findBroadcastPanelFrom(node);
      if (panel && panels.indexOf(panel) === -1) panels.push(panel);
    });

    return panels.sort(function(a, b){ return scorePanel(a) - scorePanel(b); });
  }

  function injectStyle(){
    if (document.getElementById("do-wallet-broadcasting-video-style")) return;
    var style = document.createElement("style");
    style.id = "do-wallet-broadcasting-video-style";
    style.textContent = [
      "video[" + VIDEO_ATTR + "='1']{width:100px!important;height:100px!important;max-width:100%!important;object-fit:contain!important;display:block!important;margin:0 auto 10px!important;border:0!important;background:transparent!important;}",
      "[" + MODAL_ATTR + "='1'] img[data-do-wallet-broadcasting-hidden='1']{display:none!important;}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function createVideo(){
    var video = document.createElement("video");
    video.src = VIDEO_SRC;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("preload", "auto");
    video.setAttribute("aria-label", "Broadcasting transmission");
    video.setAttribute(VIDEO_ATTR, "1");
    video.style.width = "100px";
    video.style.height = "100px";
    video.style.maxWidth = "100%";
    video.style.objectFit = "contain";
    video.style.display = "block";
    video.style.margin = "0 auto 10px";
    video.style.border = "0";
    video.style.background = "transparent";
    return video;
  }

  function copyBoxStyles(from, to){
    var style = from.getAttribute && from.getAttribute("style");
    if (style) to.setAttribute("style", style);
    to.style.width = to.style.width || (from.width ? from.width + "px" : "100px");
    to.style.height = to.style.height || (from.height ? from.height + "px" : "100px");
    to.style.maxWidth = to.style.maxWidth || "100%";
    to.style.objectFit = to.style.objectFit || "contain";
    to.style.display = to.style.display || "block";
    to.style.margin = to.style.margin || "0 auto 10px";
    to.style.border = "0";
    to.style.background = "transparent";
    if (from.width && !to.width) to.width = from.width;
    if (from.height && !to.height) to.height = from.height;
  }

  function imageLooksBroken(img){
    if (!img || img.tagName !== "IMG") return false;
    var src = img.getAttribute("src") || "";
    if (/static\/media\/Broadcasting\./i.test(src)) return true;
    if (/Broadcasting\./i.test(src)) return true;
    if (!src || src === "#" || src === "undefined") return true;
    return img.complete && img.naturalWidth === 0;
  }

  function isTopBroadcastImage(panel, img){
    var panelRect = rectOf(panel);
    var imgRect = rectOf(img);
    if (!panelRect || !imgRect) return true;
    var centerX = imgRect.left + imgRect.width / 2;
    var nearTop = imgRect.top >= panelRect.top && imgRect.top < panelRect.top + Math.max(190, panelRect.height * 0.35);
    var centered = centerX > panelRect.left + panelRect.width * 0.25 && centerX < panelRect.right - panelRect.width * 0.25;
    return nearTop && centered && imgRect.width <= 220 && imgRect.height <= 220;
  }

  function replaceNodeWithVideo(node){
    if (!node || node.getAttribute && node.getAttribute(VIDEO_ATTR) === "1") return null;
    var video = createVideo();
    copyBoxStyles(node, video);
    if (node.parentElement && node.parentElement.tagName === "PICTURE") {
      node.parentElement.replaceWith(video);
    } else {
      node.replaceWith(video);
    }
    if (video.play) video.play().catch(function(){});
    return video;
  }

  function firstUsefulChild(panel){
    var nodes = Array.prototype.slice.call(panel.children || []);
    return nodes.find(function(node){
      if (!node || node.getAttribute && node.getAttribute(VIDEO_ATTR) === "1") return false;
      if (node.matches && node.matches("button,[aria-label='Close'],[class*='close'],[class*='Close']")) return false;
      return true;
    }) || null;
  }

  function ensurePanelVideo(panel){
    if (!panel || !hasBroadcastingText(panel)) return;
    injectStyle();
    var existing = panel.querySelector("video[" + VIDEO_ATTR + "='1']");
    if (existing) {
      panel.setAttribute(MODAL_ATTR, "1");
      if (existing.play) existing.play().catch(function(){});
      return;
    }

    var images = Array.prototype.slice.call(panel.querySelectorAll("img"));
    var target = images.find(imageLooksBroken) || images.find(function(img){
      return isTopBroadcastImage(panel, img);
    }) || images.find(function(img){
      var rect = rectOf(img);
      return !rect || (rect.width <= 180 && rect.height <= 180);
    });

    if (target) {
      replaceNodeWithVideo(target);
      panel.setAttribute(MODAL_ATTR, "1");
      return;
    }

    var video = createVideo();
    var anchor = firstUsefulChild(panel);
    if (anchor) panel.insertBefore(video, anchor);
    else panel.insertBefore(video, panel.firstChild);
    panel.setAttribute(MODAL_ATTR, "1");
    if (video.play) video.play().catch(function(){});
  }

  function forceReplaceAnyBroadcastImage(bodyText){
    bodyText = bodyText || textOf(document.body || document.documentElement);
    if (!STRONG_BROADCAST_TEXT.test(bodyText)) return;
    Array.prototype.forEach.call(document.querySelectorAll("img"), function(img){
      if (!img || img.closest("header,nav,aside")) return;
      var rect = rectOf(img);
      var smallEnough = !rect || (rect.width <= 220 && rect.height <= 220);
      if (smallEnough && (imageLooksBroken(img) || findBroadcastPanelFrom(img))) {
        replaceNodeWithVideo(img);
      }
    });
  }

  function normalizeQueuedTimer(){
    Array.prototype.forEach.call(document.querySelectorAll("body *"), function(node){
      if (!node || node.children.length) return;
      var value = node.textContent || "";
      if (/^undefined:\d{2}$/i.test(value.trim())) {
        node.textContent = value.trim().replace(/^undefined:/i, "00:");
      }
    });
  }

  function run(){
    scheduled = false;
    var bodyText = textOf(document.body || document.documentElement);
    if (!BROADCAST_TEXT.test(bodyText)) return;
    normalizeQueuedTimer();
    findBroadcastPanels().forEach(ensurePanelVideo);
    forceReplaceAnyBroadcastImage(bodyText);
  }

  function schedule(){
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame ? window.requestAnimationFrame(run) : window.setTimeout(run, 50);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule);
  else schedule();

  document.addEventListener("error", function(event){
    var target = event.target;
    if (!target || target.tagName !== "IMG") return;
    var panel = findBroadcastPanelFrom(target);
    if (panel) {
      replaceNodeWithVideo(target);
      panel.setAttribute(MODAL_ATTR, "1");
    }
  }, true);

  try {
    var observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"]
    });
    window.setTimeout(function(){
      observer.disconnect();
    }, WATCH_MS);
  } catch (e) {
    window.setTimeout(schedule, 1000);
  }

  var fallbackTicks = 0;
  var fallbackTimer = window.setInterval(function(){
    fallbackTicks += 1;
    schedule();
    if (fallbackTicks >= 60) window.clearInterval(fallbackTimer);
  }, 2000);
})();
