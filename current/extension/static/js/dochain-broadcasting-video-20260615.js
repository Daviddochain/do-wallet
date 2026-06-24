(function(){
  var VIDEO_SRC = "/static/media/broadcasting-transmission-20260615.mp4";
  var SELECTOR = 'img[src*="static/media/Broadcasting."]';
  var scheduled = false;

  function hasBroadcastingText(node){
    var scope = node && node.nodeType === 1 ? node : document.body;
    if (!scope) return false;
    var text = "";
    try {
      text = (scope.innerText || scope.textContent || "").slice(0, 3000);
    } catch (e) {}
    return /Broadcasting transaction|Transaction is processing|Tx hash|Queued/i.test(text);
  }

  function isBroadcastingImage(img){
    if (!img) return false;
    var src = img.getAttribute("src") || "";
    if (/static\/media\/Broadcasting\./i.test(src)) return true;
    var panel = img.closest('[role="dialog"], .modal, [class*="modal"], [class*="Modal"], [class*="Dialog"], [class*="dialog"]');
    return !!panel && hasBroadcastingText(panel);
  }

  function copyBoxStyles(from, to){
    to.className = from.className || "";
    var style = from.getAttribute("style");
    if (style) to.setAttribute("style", style);
    to.style.width = to.style.width || (from.width ? from.width + "px" : "100px");
    to.style.height = to.style.height || (from.height ? from.height + "px" : "100px");
    to.style.maxWidth = to.style.maxWidth || "100%";
    to.style.objectFit = to.style.objectFit || "contain";
    to.style.display = to.style.display || "block";
    to.style.margin = to.style.margin || "0 auto";
    to.style.border = "0";
    to.style.background = "transparent";
    if (from.width && !to.width) to.width = from.width;
    if (from.height && !to.height) to.height = from.height;
  }

  function replaceImage(img){
    if (!img || img.dataset.doWalletBroadcastingReplaced === "1") return;
    if (!isBroadcastingImage(img)) return;

    var video = document.createElement("video");
    video.src = VIDEO_SRC;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("preload", "auto");
    video.setAttribute("aria-label", "Broadcasting transmission");
    video.setAttribute("data-do-wallet-broadcasting-video", "1");
    copyBoxStyles(img, video);

    img.dataset.doWalletBroadcastingReplaced = "1";
    img.replaceWith(video);
    if (video.play) video.play().catch(function(){});
  }

  function run(){
    scheduled = false;
    Array.prototype.forEach.call(document.querySelectorAll(SELECTOR + ", img"), replaceImage);
  }

  function schedule(){
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame ? window.requestAnimationFrame(run) : window.setTimeout(run, 50);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule);
  else schedule();

  try {
    new MutationObserver(schedule).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"]
    });
  } catch (e) {
    window.setInterval(schedule, 1000);
  }

  window.setInterval(schedule, 2000);
})();
