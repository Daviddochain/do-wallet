(() => {
  "use strict";

  const STYLE_ID = "dochain-approval-popup-polish-20260610-style";
  const ROOT_CLASS = "dw-approval-root";
  const PAGE_CLASS = "dw-approval-page";
  const ACTIONS_CLASS = "dw-approval-actions";
  const PASSWORD_CLASS = "dw-approval-password";
  const ORIGIN_CARD_CLASS = "dw-approval-origin-card";
  const DUPLICATE_ORIGIN_CLASS = "dw-approval-duplicate-origin";

  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

  const visible = (element) => {
    if (!element || element.nodeType !== 1) return false;
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const buttonText = (element) => clean(element && (element.innerText || element.textContent));

  const isApprovalScreen = () => {
    const text = clean(document.body && document.body.innerText);
    if (!text) return false;
    const hasCredential = /\b(Password|Authentication code|Save password)\b/i.test(text);
    const hasAction = /\b(Deny|Post|Sign|Confirm|Approve)\b/i.test(text);
    const hasDetails = /\b(Network|Origin|Timestamp|Fee|Memo|Execute contract|Send|Swap|Delegate|Vote)\b/i.test(text);
    return hasCredential && hasAction && hasDetails;
  };

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
html[data-dochain-approval-popup="true"],
html[data-dochain-approval-popup="true"] body {
  width: 100% !important;
  min-width: 0 !important;
  min-height: 100% !important;
  overflow: hidden !important;
  background: #1b1028 !important;
}

html[data-dochain-approval-popup="true"] #do-wallet,
html[data-dochain-approval-popup="true"] #station {
  box-sizing: border-box !important;
  width: 100vw !important;
  max-width: 100vw !important;
  min-width: 0 !important;
  height: 100vh !important;
  min-height: 100vh !important;
  overflow: auto !important;
  overflow-x: hidden !important;
}

html[data-dochain-approval-popup="true"] #do-wallet,
html[data-dochain-approval-popup="true"] #do-wallet *,
html[data-dochain-approval-popup="true"] #station,
html[data-dochain-approval-popup="true"] #station * {
  box-sizing: border-box !important;
  min-width: 0 !important;
}

html[data-dochain-approval-popup="true"] #do-wallet > *,
html[data-dochain-approval-popup="true"] #station > *,
html[data-dochain-approval-popup="true"] .${PAGE_CLASS} {
  width: 100% !important;
  max-width: 100vw !important;
  min-width: 0 !important;
  overflow-x: hidden !important;
}

html[data-dochain-approval-popup="true"] .${ROOT_CLASS} {
  box-sizing: border-box !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 100vh !important;
  max-width: none !important;
  padding: 16px clamp(14px, 3vw, 28px) 28px !important;
  overflow: auto !important;
  overflow-x: hidden !important;
  contain: layout paint !important;
  scrollbar-gutter: stable both-edges;
}

html[data-dochain-approval-popup="true"] .${ROOT_CLASS},
html[data-dochain-approval-popup="true"] .${ROOT_CLASS} * {
  animation-duration: .001ms !important;
  transition-duration: .001ms !important;
  scroll-behavior: auto !important;
  letter-spacing: 0 !important;
}

html[data-dochain-approval-popup="true"] .${ORIGIN_CARD_CLASS} {
  width: 100% !important;
  max-width: 100% !important;
  margin: 10px 0 18px !important;
  padding: 16px 20px !important;
  min-height: 0 !important;
  border-radius: 16px !important;
  overflow: hidden !important;
}

html[data-dochain-approval-popup="true"] .${ORIGIN_CARD_CLASS} h1,
html[data-dochain-approval-popup="true"] .${ORIGIN_CARD_CLASS} h2,
html[data-dochain-approval-popup="true"] .${ORIGIN_CARD_CLASS} [class*="title" i] {
  margin: 0 0 6px !important;
  font-size: 30px !important;
  line-height: 1.12 !important;
  overflow-wrap: anywhere !important;
}

html[data-dochain-approval-popup="true"] .${DUPLICATE_ORIGIN_CLASS} {
  display: none !important;
}

html[data-dochain-approval-popup="true"] .${ROOT_CLASS} input,
html[data-dochain-approval-popup="true"] .${ROOT_CLASS} textarea {
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 100% !important;
  min-height: 54px !important;
  border-radius: 10px !important;
  font-size: 17px !important;
}

html[data-dochain-approval-popup="true"] .${PASSWORD_CLASS} {
  display: grid !important;
  grid-template-columns: 1fr !important;
  gap: 8px !important;
  width: 100% !important;
  max-width: 100% !important;
  margin: 18px 0 0 !important;
}

html[data-dochain-approval-popup="true"] .${PASSWORD_CLASS} input[type="password"] {
  display: block !important;
  width: 100% !important;
}

html[data-dochain-approval-popup="true"] .${ROOT_CLASS} pre,
html[data-dochain-approval-popup="true"] .${ROOT_CLASS} code,
html[data-dochain-approval-popup="true"] .${ROOT_CLASS} textarea {
  white-space: pre-wrap !important;
  overflow-wrap: anywhere !important;
}

html[data-dochain-approval-popup="true"] .${ACTIONS_CLASS} {
  position: sticky !important;
  bottom: 0 !important;
  z-index: 2147482000 !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
  align-items: stretch !important;
  width: 100% !important;
  max-width: 100% !important;
  gap: 14px !important;
  padding: 14px 0 6px !important;
  margin-top: 16px !important;
  background: linear-gradient(180deg, rgba(33, 22, 49, 0), #211631 28%) !important;
}

html[data-dochain-approval-popup="true"] .${ACTIONS_CLASS} button,
html[data-dochain-approval-popup="true"] .${ACTIONS_CLASS} [role="button"] {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  min-height: 58px !important;
  border-radius: 18px !important;
  padding: 12px 14px !important;
  font-size: 18px !important;
  line-height: 1 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

html[data-dochain-approval-popup="true"] .${ROOT_CLASS} button,
html[data-dochain-approval-popup="true"] .${ROOT_CLASS} [role="button"] {
  max-width: 100% !important;
}

@media (max-width: 760px) {
  html[data-dochain-approval-popup="true"] .${ROOT_CLASS} {
    padding: 12px 16px 22px !important;
  }

  html[data-dochain-approval-popup="true"] .${ORIGIN_CARD_CLASS} h1,
  html[data-dochain-approval-popup="true"] .${ORIGIN_CARD_CLASS} h2,
  html[data-dochain-approval-popup="true"] .${ORIGIN_CARD_CLASS} [class*="title" i] {
    font-size: 24px !important;
  }

  html[data-dochain-approval-popup="true"] .${ACTIONS_CLASS} {
    gap: 10px !important;
  }

  html[data-dochain-approval-popup="true"] .${ACTIONS_CLASS} button,
  html[data-dochain-approval-popup="true"] .${ACTIONS_CLASS} [role="button"] {
    min-height: 54px !important;
    border-radius: 16px !important;
    font-size: 16px !important;
  }
}
`;
    document.head.appendChild(style);
  };

  const findActionElements = () => {
    const candidates = [...document.querySelectorAll("button,[role='button']")].filter(visible);
    const deny = candidates.find((element) => /^deny$/i.test(buttonText(element)));
    const submit = candidates.find((element) => /^(post|sign|confirm|approve)$/i.test(buttonText(element)));
    return { deny, submit };
  };

  const smallestCommonAncestor = (first, second) => {
    if (!first || !second) return null;
    let element = first;
    while (element && element !== document.body) {
      if (element.contains(second)) return element;
      element = element.parentElement;
    }
    return null;
  };

  const findApprovalRoot = (deny, submit) => {
    const seed = smallestCommonAncestor(deny, submit) || document.querySelector("input[type='password']") || submit || deny;
    let element = seed;
    let best = null;

    while (element && element !== document.body && element !== document.documentElement) {
      const text = clean(element.innerText);
      const rect = element.getBoundingClientRect();
      if (
        rect.width >= 360 &&
        rect.height >= 360 &&
        /\bPassword\b/i.test(text) &&
        /\bDeny\b/i.test(text) &&
        /\b(Post|Sign|Confirm|Approve)\b/i.test(text)
      ) {
        best = element;
      }
      element = element.parentElement;
    }

    return best || document.getElementById("do-wallet") || document.body;
  };

  const markActionBar = (root, deny, submit) => {
    document.querySelectorAll(`.${ACTIONS_CLASS}`).forEach((element) => element.classList.remove(ACTIONS_CLASS));
    const ancestor = smallestCommonAncestor(deny, submit);
    if (!ancestor || !root.contains(ancestor)) return;

    let actionBar = ancestor;
    while (actionBar.parentElement && actionBar.parentElement !== root) {
      if (actionBar.parentElement.querySelector("input[type='password'], input[type='checkbox'], textarea")) break;
      const text = clean(actionBar.parentElement.innerText);
      if (!/\bDeny\b/i.test(text) || !/\b(Post|Sign|Confirm|Approve)\b/i.test(text)) break;
      const rect = actionBar.parentElement.getBoundingClientRect();
      if (rect.height > 180) break;
      actionBar = actionBar.parentElement;
    }
    actionBar.classList.add(ACTIONS_CLASS);
  };

  const markPasswordBlock = (root) => {
    document.querySelectorAll(`.${PASSWORD_CLASS}`).forEach((element) => element.classList.remove(PASSWORD_CLASS));
    const input = root.querySelector("input[type='password']");
    if (!input) return;

    let block = input;
    while (block.parentElement && block.parentElement !== root) {
      const text = clean(block.parentElement.innerText);
      const rect = block.parentElement.getBoundingClientRect();
      if (/\b(Deny|Post|Sign|Confirm|Approve)\b/i.test(text)) break;
      if (rect.height > 220) break;
      block = block.parentElement;
    }
    block.classList.add(PASSWORD_CLASS);
  };

  const markPageAncestors = (root) => {
    document.querySelectorAll(`.${PAGE_CLASS}`).forEach((element) => element.classList.remove(PAGE_CLASS));
    let element = root;
    while (element && element !== document.body && element !== document.documentElement) {
      element.classList.add(PAGE_CLASS);
      if (element.id === "do-wallet" || element.id === "station") break;
      element = element.parentElement;
    }
  };

  const leafTextElements = (root) =>
    [...root.querySelectorAll("h1,h2,h3,p,a,span,strong,small,div")]
      .filter(visible)
      .filter((element) => {
        const text = clean(element.innerText || element.textContent);
        if (!/^https?:\/\/[^\s]+$/i.test(text)) return false;
        return ![...element.children].some((child) => clean(child.innerText || child.textContent) === text);
      });

  const markOriginCard = (root) => {
    document.querySelectorAll(`.${ORIGIN_CARD_CLASS}`).forEach((element) => element.classList.remove(ORIGIN_CARD_CLASS));
    document.querySelectorAll(`.${DUPLICATE_ORIGIN_CLASS}`).forEach((element) => element.classList.remove(DUPLICATE_ORIGIN_CLASS));

    const urlElements = leafTextElements(root);
    if (!urlElements.length) return;

    const byUrl = new Map();
    urlElements.forEach((element) => {
      const text = clean(element.innerText || element.textContent);
      byUrl.set(text, [...(byUrl.get(text) || []), element]);
    });

    const duplicate = [...byUrl.values()].find((elements) => elements.length > 1);
    const primary = duplicate ? duplicate[0] : urlElements[0];
    const duplicates = duplicate ? duplicate.slice(1) : [];

    let card = primary;
    while (card.parentElement && card.parentElement !== root) {
      const rect = card.parentElement.getBoundingClientRect();
      const text = clean(card.parentElement.innerText);
      if (rect.width >= 320 && rect.height >= 70 && rect.height <= 220 && /^https?:\/\//i.test(text)) {
        card = card.parentElement;
      } else {
        break;
      }
    }

    card.classList.add(ORIGIN_CARD_CLASS);
    duplicates.forEach((element) => element.classList.add(DUPLICATE_ORIGIN_CLASS));
  };

  let scheduled = false;
  const apply = () => {
    scheduled = false;

    if (!isApprovalScreen()) {
      document.documentElement.removeAttribute("data-dochain-approval-popup");
      document.querySelectorAll(`.${PAGE_CLASS},.${ROOT_CLASS},.${ACTIONS_CLASS},.${PASSWORD_CLASS},.${ORIGIN_CARD_CLASS},.${DUPLICATE_ORIGIN_CLASS}`).forEach((element) => {
        element.classList.remove(PAGE_CLASS, ROOT_CLASS, ACTIONS_CLASS, PASSWORD_CLASS, ORIGIN_CARD_CLASS, DUPLICATE_ORIGIN_CLASS);
      });
      return;
    }

    ensureStyles();
    document.documentElement.setAttribute("data-dochain-approval-popup", "true");

    const { deny, submit } = findActionElements();
    const root = findApprovalRoot(deny, submit);
    document.querySelectorAll(`.${ROOT_CLASS}`).forEach((element) => {
      if (element !== root) element.classList.remove(ROOT_CLASS);
    });
    root.classList.add(ROOT_CLASS);
    markPageAncestors(root);

    if (deny && submit) markActionBar(root, deny, submit);
    markPasswordBlock(root);
    markOriginCard(root);
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(apply);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
