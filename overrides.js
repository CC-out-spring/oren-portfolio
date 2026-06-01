(function () {
  const config = window.JACKIE_EDITABLE_CONFIG || {};
  const textMap = config.text || {};
  const linkMap = config.links || {};
  const galleryMap = config.galleries || {};
  const defaultGallerySpreadSize = 3;
  const framerImageMap = window.OREN_FRAMER_IMAGE_MAP || {};
  const imageMap = {
    "JnX4DQ93dVEHzTFGkUsZLNV4.png": "./assets-optimized/oren-side-icon-stamp-v1.webp",
    "RYvnMMGEz4Ds3BGL5W1lRp9GOCU.png": "./assets-optimized/oren-side-icon-bowl-v1.webp",
    "zs8DG1Zf6J6s1d5yc00xHp98b60.png": "./assets-optimized/oren-side-icon-digital-v1.webp",
    "X8TlTAmfaqh8FaOYxjSjYMniaE.png": "./assets-optimized/oren-side-icon-sprig-v1.webp",
    "2LGPmWLUdShRmg0q79YvdcxivM.png": "./assets-optimized/oren-side-icon-sprig-v1.webp",
    "jvHISkS7qP9hkgBbgfRCAiPpjjI.png": "./assets-optimized/oren-side-icon-sprig-v1.webp",
    "J4bjhr8zDlxffN0kZnWBShva0GY.png": "./assets-optimized/oren-side-icon-night-v1.webp",
    "z0ha6Cap1xjkHBWyu1iV9tnWBNQ.png": "./assets-optimized/oren-side-icon-bowl-v1.webp",
    "uNzaxXZLk1aHsF3AXi7f4aGR0g.png": "./assets-optimized/oren-side-doodle-juicebox-v1.webp",
    "qe4YBLLmBViMAbL2fiphUNfdxA.png": "./assets-optimized/oren-side-doodle-orbit-bowl-v1.webp",
    "DUDVhZzaglA4vXZTKvTA6gePrU.png": "./assets-optimized/oren-side-doodle-househead-v1.webp",
    ...(config.images || {}),
  };
  let activeGallery = null;
  let activeGalleryIndex = 0;
  let lastWorkNavigationAt = 0;
  let workRouteGuardInstalled = false;

  function getGallerySpreadSize(gallery) {
    const size = Number(gallery && gallery.spreadSize) || defaultGallerySpreadSize;
    return Math.max(1, Math.min(size, defaultGallerySpreadSize));
  }

  function getImageKeyStem(key) {
    const fileName = String(key || "").split("?")[0].split("/").pop() || "";
    return fileName.replace(/\.[a-z0-9]+$/i, "");
  }

  function imageSourceMatchesKey(image, key) {
    if (!image || !key) return false;

    const stem = getImageKeyStem(key);
    const values = [
      image.getAttribute("src") || "",
      image.getAttribute("srcset") || "",
      image.dataset.editableImageKey || "",
      image.dataset.orenTargetedReplacementFor || "",
    ];

    return values.some((value) => value.includes(key) || (stem && value.includes(stem)));
  }

  function getScopedImages(root) {
    const scope = root || document;
    return [
      ...(scope.matches && scope.matches("img") ? [scope] : []),
      ...(scope.querySelectorAll ? scope.querySelectorAll("img") : []),
    ];
  }

  function replaceMeta() {
    if (config.meta && config.meta.title) {
      document.title = config.meta.title;
    }

    if (window.__OREN_APPLY_META__) window.__OREN_APPLY_META__();

    const description = config.meta && config.meta.description;
    if (!description) return;

    document
      .querySelectorAll('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]')
      .forEach((meta) => meta.setAttribute("content", description));
  }

  function replaceText(root) {
    const entries = Object.entries(textMap).filter(([from]) => from);
    if (!entries.length) return;

    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      let value = node.nodeValue;
      entries.forEach(([from, to]) => {
        value = value.split(from).join(to);
      });
      if (value !== node.nodeValue) node.nodeValue = value;
    });
  }

  function replaceLinks(root) {
    const entries = Object.entries(linkMap).filter(([from]) => from);
    if (!entries.length) return;

    (root || document).querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href");
      entries.forEach(([from, to]) => {
        if (href === from || href.includes(from)) {
          link.setAttribute("href", href.split(from).join(to));
        }
      });
    });
  }

  function replaceImages(root) {
    const entries = Object.entries(imageMap).filter(([from]) => from);

    (root || document).querySelectorAll("img").forEach((image) => {
      const src = image.getAttribute("src") || "";
      const srcset = image.getAttribute("srcset") || "";

      entries.forEach(([from, to]) => {
        const isMatchedSource = imageSourceMatchesKey(image, from);

        if (isMatchedSource) {
          image.setAttribute("src", to);
          image.dataset.editableReplacedImage = "true";
          image.dataset.editableImageKey = from;
          if (galleryMap[from]) image.dataset.orenGalleryKey = from;
        }
        if (srcset && isMatchedSource) {
          image.removeAttribute("srcset");
          image.setAttribute("src", to);
          image.dataset.editableReplacedImage = "true";
          image.dataset.editableImageKey = from;
          if (galleryMap[from]) image.dataset.orenGalleryKey = from;
        }

        if (from === "afys4KtZC007XBhmTWURY9KL4.png" && isMatchedSource) {
          image.classList.add("oren-ai-color-match-image");
          const frame = image.closest("a");
          if (frame) frame.classList.add("oren-ai-color-match-frame");
          const card = frame && frame.parentElement;
          if (card) card.classList.add("oren-ai-color-match-card");
        }

        if (from === "x3y7QRdmiIS5JFAwhWC4IHHHJsE.png" && isMatchedSource) {
          image.classList.add("oren-ai-lab-poster-image");
          const frame = image.closest("a");
          if (frame) frame.classList.add("oren-ai-lab-poster-frame");
          const card = frame && frame.parentElement;
          if (card) card.classList.add("oren-ai-lab-poster-card");
        }

        if (from === "UeG3qBVgjLwvwcGSGQLZM9AI.png" && isMatchedSource) {
          image.classList.add("oren-ai-scene-image");
          const frame = image.closest("a");
          if (frame) frame.classList.add("oren-ai-scene-frame");
          const card = frame && frame.parentElement;
          if (card) card.classList.add("oren-ai-scene-card");
        }
      });

      replaceFramerRemoteImage(image);
    });

    replaceFramerRemoteBackgrounds(root);
  }

  function getFramerImageKey(value) {
    if (!value || !value.includes("framerusercontent.com/images/")) return "";

    try {
      const url = new URL(value.replace(/&amp;/g, "&"));
      const fileName = url.pathname.split("/").pop() || "";
      return url.search ? `${fileName}${url.search}` : fileName;
    } catch (error) {
      const match = value.match(/\/images\/([^"')\s,]+)/);
      return match ? match[1].replace(/&amp;/g, "&") : "";
    }
  }

  function getLocalFramerImage(value) {
    const key = getFramerImageKey(value);
    if (!key) return "";

    const fileName = key.split("?")[0];
    return framerImageMap[key] || framerImageMap[fileName] || "";
  }

  function replaceFramerRemoteImage(image) {
    const src = image.getAttribute("src") || "";
    const srcset = image.getAttribute("srcset") || "";
    const localSrc = getLocalFramerImage(src) || getLocalFramerImage(srcset);

    if (!localSrc) return;

    image.removeAttribute("srcset");
    image.setAttribute("src", localSrc);
    image.dataset.orenFramerRemoteImage = "localized";
  }

  function replaceFramerRemoteBackgrounds(root) {
    const scope = root || document;
    const elements = [
      ...(scope.matches && scope.matches("[style*='framerusercontent.com/images/']") ? [scope] : []),
      ...(scope.querySelectorAll ? scope.querySelectorAll("[style*='framerusercontent.com/images/']") : []),
    ];

    elements.forEach((element) => {
      const style = element.getAttribute("style") || "";
      if (!style.includes("framerusercontent.com/images/")) return;

      const nextStyle = style.replace(/https:\/\/framerusercontent\.com\/images\/[^"')\s,]+/g, (remoteUrl) => {
        return getLocalFramerImage(remoteUrl) || remoteUrl;
      });

      if (nextStyle !== style) {
        element.setAttribute("style", nextStyle);
        element.dataset.orenFramerRemoteBackground = "localized";
      }
    });
  }

  function replaceContentGrowthBashpayCard(root) {
    const targetKey = "aybhK1OWWsMUjIyA7Kj5iET0zE.png";

    getScopedImages(root).forEach((image) => {
      const isTargetImage = imageSourceMatchesKey(image, targetKey);

      if (!isTargetImage) return;

      image.removeAttribute("srcset");
      image.setAttribute("src", "./assets-optimized/xiaobai-dongwuyuan-content-growth-v1.jpg?v=20260530-bashpay-v1");
      image.dataset.orenTargetedReplacementFor = targetKey;
      image.classList.add("oren-content-growth-bashpay-image");

      const frame = image.closest("a") || image.parentElement;
      if (frame) frame.classList.add("oren-content-growth-bashpay-frame");

      const card = frame?.parentElement || image.parentElement;
      if (card) card.classList.add("oren-content-growth-bashpay-card");
    });
  }

  function replaceContentGrowthLogisticsCard(root) {
    const targetKey = "6rBYKVmILDjUMitcTXjMZ0SPM.png";

    getScopedImages(root).forEach((image) => {
      const isTargetImage = imageSourceMatchesKey(image, targetKey);

      if (!isTargetImage) return;

      image.removeAttribute("srcset");
      image.setAttribute("src", "./assets-optimized/itg-real-estate-content-growth-v1.jpg?v=20260530-itg-v1");
      image.dataset.orenTargetedReplacementFor = targetKey;
      image.dataset.orenContentGrowthSlot = "left-top";
      image.classList.add("oren-content-growth-logistics-image");

      const frame = image.closest("a") || image.parentElement;
      if (frame) frame.classList.add("oren-content-growth-logistics-frame");

      const card = frame?.parentElement || image.parentElement;
      if (card) card.classList.add("oren-content-growth-logistics-card");
    });
  }

  function replaceContentGrowthMediaMapCard(root) {
    const targetKey = "QvIk4OtR2xbSpy213Cwtbyw6Q.png";

    getScopedImages(root).forEach((image) => {
      const isTargetImage = imageSourceMatchesKey(image, targetKey);

      if (!isTargetImage) return;

      image.removeAttribute("srcset");
      image.setAttribute("src", "./assets-optimized/content-growth-media-map-v1.webp?v=20260531-media-map-v1");
      image.dataset.orenTargetedReplacementFor = targetKey;
      image.dataset.orenContentGrowthSlot = "left-bottom";
      image.classList.add("oren-content-growth-media-map-image");

      const frame = image.closest("a") || image.parentElement;
      if (frame) frame.classList.add("oren-content-growth-media-map-frame");

      const card = frame?.parentElement || image.parentElement;
      if (card) card.classList.add("oren-content-growth-media-map-card");
    });
  }

  function hideLeftFinishTourCard(root) {
    const scope = root || document;
    const images = [
      ...(scope.matches && scope.matches("img") ? [scope] : []),
      ...(scope.querySelectorAll ? scope.querySelectorAll("img") : []),
    ];

    images.forEach((image) => {
      const src = image.getAttribute("src") || "";
      const srcset = image.getAttribute("srcset") || "";
      if (!imageSourceMatchesKey(image, "CjJRxESsZDM96KjX4zi3ntiSl7c.png")) {
        return;
      }

      const card = image.closest(".framer-f2dxcs-container") || image.closest("a") || image.parentElement;
      if (!card) return;

      card.dataset.orenLeftFinishTourCard = "hidden";
      card.setAttribute("aria-hidden", "true");
      card.style.setProperty("display", "none", "important");
    });
  }

  function replaceToursHeroImage(root) {
    const scope = root || document;
    const images = [
      ...(scope.matches && scope.matches("img") ? [scope] : []),
      ...(scope.querySelectorAll ? scope.querySelectorAll("img") : []),
    ];
    const targetKey = "CjJRxESsZDM96KjX4zi3ntiSl7c.png";

    images.forEach((image) => {
      const src = image.getAttribute("src") || "";
      const srcset = image.getAttribute("srcset") || "";
      const isTargetImage = imageSourceMatchesKey(image, targetKey);

      if (!isTargetImage) return;
      if (image.closest(".framer-f2dxcs-container")) return;

      image.removeAttribute("srcset");
      image.setAttribute("src", "./assets-optimized/fitness-app-horizontal-clean-ordered.jpg?v=20260601-fitness-tour-v2");
      image.dataset.orenTargetedReplacementFor = targetKey;
      image.classList.add("oren-tours-fitness-image");

      const frame = image.closest("a") || image.parentElement;
      if (frame) frame.classList.add("oren-tours-fitness-frame");
    });
  }

  function replaceToursDashboardCard(root) {
    const scope = root || document;
    const images = [
      ...(scope.matches && scope.matches("img") ? [scope] : []),
      ...(scope.querySelectorAll ? scope.querySelectorAll("img") : []),
    ];
    const targetKey = "jkezJCVWvw8W2KInfhlRWQOlS4.png";

    images.forEach((image) => {
      const src = image.getAttribute("src") || "";
      const srcset = image.getAttribute("srcset") || "";
      const isTargetImage = imageSourceMatchesKey(image, targetKey);

      if (!isTargetImage) return;

      image.removeAttribute("srcset");
      image.setAttribute("src", "./assets-optimized/fitness-app-horizontal-lianna-composite.jpg?v=20260601-fitness-tour-v5");
      image.setAttribute("loading", "eager");
      image.setAttribute("decoding", "async");
      image.dataset.orenTargetedReplacementFor = targetKey;
      image.classList.add("oren-tours-dashboard-image");

      const frame = image.closest("a") || image.parentElement;
      if (frame) frame.classList.add("oren-tours-dashboard-frame");

      const card = image.closest(".framer-p3jkcu-container") || frame?.parentElement;
      if (card) card.classList.add("oren-tours-dashboard-card");
    });
  }

  function collapseLegacyScreenies(root) {
    const scope = root || document;
    const hiddenElements = [
      ...(scope.matches && scope.matches(".framer-9vsaio, .framer-100tknh, .framer-10nctlo, .framer-1ms7onh")
        ? [scope]
        : []),
      ...(scope.querySelectorAll
        ? scope.querySelectorAll(".framer-9vsaio, .framer-100tknh, .framer-10nctlo, .framer-1ms7onh")
        : []),
    ];

    hiddenElements.forEach((element) => {
      element.dataset.orenLegacyScreenies = "hidden";
      element.setAttribute("aria-hidden", "true");
      element.style.setProperty("display", "none", "important");
    });

    const containers = [
      ...(scope.matches && scope.matches(".framer-1jkx40b") ? [scope] : []),
      ...(scope.querySelectorAll ? scope.querySelectorAll(".framer-1jkx40b") : []),
    ];

    containers.forEach((container) => {
      container.dataset.orenLegacyScreenies = "collapsed";
      container.setAttribute("aria-hidden", "true");
      container.style.setProperty("display", "none", "important");
      container.style.setProperty("height", "0px", "important");
      container.style.setProperty("min-height", "0px", "important");
      container.style.setProperty("margin", "0", "important");
      container.style.setProperty("padding", "0", "important");
      container.style.setProperty("overflow", "hidden", "important");
    });
  }

  function ensureGalleryModal() {
    let modal = document.querySelector(".oren-gallery-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "oren-gallery-modal";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="oren-gallery-backdrop" data-gallery-close></div>
      <section class="oren-gallery-panel" aria-labelledby="oren-gallery-title">
        <button class="oren-gallery-close" type="button" aria-label="Close" data-gallery-close>×</button>
        <div class="oren-gallery-copy">
          <h2 id="oren-gallery-title"></h2>
          <p class="oren-gallery-subtitle"></p>
          <p class="oren-gallery-award"></p>
        </div>
        <div class="oren-gallery-stage">
          <button class="oren-gallery-nav oren-gallery-prev" type="button" aria-label="Previous">‹</button>
          <div class="oren-gallery-spread">
            <img class="oren-gallery-image oren-gallery-image-primary" alt="" decoding="async">
            <img class="oren-gallery-image oren-gallery-image-secondary" alt="" decoding="async">
            <img class="oren-gallery-image oren-gallery-image-tertiary" alt="" decoding="async">
          </div>
          <button class="oren-gallery-nav oren-gallery-next" type="button" aria-label="Next">›</button>
        </div>
        <div class="oren-gallery-meta">
          <span class="oren-gallery-counter"></span>
        </div>
        <div class="oren-gallery-thumbs" aria-label="Gallery pages"></div>
      </section>
    `;

    modal.querySelectorAll("[data-gallery-close]").forEach((node) => {
      node.addEventListener("click", closeGallery);
    });

    modal.querySelector(".oren-gallery-prev").addEventListener("click", () => moveGallery(-1));
    modal.querySelector(".oren-gallery-next").addEventListener("click", () => moveGallery(1));
    modal.querySelector(".oren-gallery-thumbs").addEventListener("click", (event) => {
      const button = event.target.closest("[data-gallery-index]");
      if (!button) return;
      activeGalleryIndex = normalizeGalleryIndex(Number(button.dataset.galleryIndex) || 0);
      renderGallery();
    });

    document.addEventListener("keydown", (event) => {
      if (!activeGallery || modal.hidden) return;
      if (event.key === "Escape") closeGallery();
      if (event.key === "ArrowLeft") moveGallery(-1);
      if (event.key === "ArrowRight") moveGallery(1);
    });

    document.body.appendChild(modal);
    return modal;
  }

  function openGallery(gallery, index) {
    if (!gallery || !Array.isArray(gallery.images) || !gallery.images.length) return;

    activeGallery = gallery;
    activeGalleryIndex = normalizeGalleryIndex(index || 0);

    const modal = ensureGalleryModal();
    modal.hidden = false;
    modal.classList.add("is-open");
    document.documentElement.classList.add("oren-gallery-open");
    renderGallery();
  }

  function closeGallery() {
    const modal = document.querySelector(".oren-gallery-modal");
    if (!modal) return;

    modal.classList.remove("is-open");
    modal.hidden = true;
    activeGallery = null;
    document.documentElement.classList.remove("oren-gallery-open");
  }

  function moveGallery(direction) {
    if (!activeGallery || !activeGallery.images.length) return;
    const spreadSize = getGallerySpreadSize(activeGallery);
    const nextIndex = activeGalleryIndex + direction * spreadSize;
    if (nextIndex < 0) {
      activeGalleryIndex = lastGallerySpreadIndex();
    } else if (nextIndex >= activeGallery.images.length) {
      activeGalleryIndex = 0;
    } else {
      activeGalleryIndex = normalizeGalleryIndex(nextIndex);
    }
    renderGallery();
  }

  function lastGallerySpreadIndex() {
    if (!activeGallery || !activeGallery.images.length) return 0;
    const spreadSize = getGallerySpreadSize(activeGallery);
    return Math.floor((activeGallery.images.length - 1) / spreadSize) * spreadSize;
  }

  function normalizeGalleryIndex(index) {
    if (!activeGallery || !activeGallery.images.length) return 0;

    const spreadSize = getGallerySpreadSize(activeGallery);
    const clamped = Math.max(0, Math.min(index, activeGallery.images.length - 1));
    return Math.floor(clamped / spreadSize) * spreadSize;
  }

  function renderGallery() {
    if (!activeGallery) return;

    const modal = ensureGalleryModal();
    const title = modal.querySelector("#oren-gallery-title");
    const subtitle = modal.querySelector(".oren-gallery-subtitle");
    const award = modal.querySelector(".oren-gallery-award");
    const imageNodes = [
      modal.querySelector(".oren-gallery-image-primary"),
      modal.querySelector(".oren-gallery-image-secondary"),
      modal.querySelector(".oren-gallery-image-tertiary"),
    ];
    const counter = modal.querySelector(".oren-gallery-counter");
    const thumbs = modal.querySelector(".oren-gallery-thumbs");
    const spreadSize = getGallerySpreadSize(activeGallery);
    const currentSpread = activeGallery.images.slice(activeGalleryIndex, activeGalleryIndex + spreadSize);

    modal.dataset.gallerySpreadSize = String(spreadSize);
    title.textContent = activeGallery.title || "";
    subtitle.textContent = activeGallery.subtitle || "";
    award.textContent = activeGallery.award || "";
    imageNodes.forEach((image, offset) => {
      const src = currentSpread[offset];
      image.hidden = !src;
      image.src = src || "";
      image.alt = src ? `${activeGallery.title || "Gallery"} ${activeGalleryIndex + offset + 1}` : "";
    });
    counter.textContent = currentSpread.length > 1
      ? `${activeGalleryIndex + 1}-${activeGalleryIndex + currentSpread.length} / ${activeGallery.images.length}`
      : `${activeGalleryIndex + 1} / ${activeGallery.images.length}`;
    thumbs.innerHTML = activeGallery.images
      .map(
        (src, index) => `
          <button class="oren-gallery-thumb${index >= activeGalleryIndex && index < activeGalleryIndex + spreadSize ? " is-active" : ""}" type="button" data-gallery-index="${index}" aria-label="Page ${index + 1}">
            <img src="${src}" alt="" loading="lazy" decoding="async">
          </button>
        `
      )
      .join("");
  }

  function enhanceGalleries(root) {
    if (!Object.keys(galleryMap).length) return;

    (root || document).querySelectorAll("img[data-oren-gallery-key]").forEach((image) => {
      const key = image.dataset.orenGalleryKey;
      const gallery = galleryMap[key];
      if (!gallery) return;

      const trigger = image.closest("a") || image.parentElement || image;
      if (trigger.dataset.orenGalleryTriggerFor === key) return;

      trigger.dataset.orenGalleryTriggerFor = key;
      trigger.classList.add("oren-gallery-trigger");
      const previewTitle = gallery.previewTitle || gallery.title || "";
      trigger.setAttribute("role", "button");
      trigger.setAttribute("tabindex", "0");
      trigger.setAttribute("aria-label", previewTitle || "Open gallery");
      if (!trigger.querySelector(".oren-gallery-preview-label")) {
        const label = document.createElement("span");
        label.className = "oren-gallery-preview-label";
        label.innerHTML = `<strong>${previewTitle}</strong><span>${gallery.award || ""}</span>`;
        trigger.appendChild(label);
      }

      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openGallery(gallery, 0);
      });
      trigger.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openGallery(gallery, 0);
      });
    });
  }

  function injectOrenHero() {
    if (document.querySelector(".oren-hero-copy")) return;

    const host =
      document.querySelector(".framer-cvfoij") ||
      document.querySelector(".framer-su76c3") ||
      document.querySelector(".framer-1hjpp53");

    if (!host) return;

    const copy = document.createElement("div");
    copy.className = "oren-hero-copy";
    copy.innerHTML = `
      <div class="oren-signature-mark" aria-label="Oren" role="img">
        <img class="oren-wordmark-img" src="./assets-optimized/oren-wordmark-v1.webp?v=20260528-v1" alt="Oren" decoding="async" loading="eager">
      </div>
      <div class="oren-welcome">
        Welcome to
        <span class="world-line">My World.</span>
      </div>
    `;

    host.appendChild(copy);
  }

  function injectGeneratedPortrait() {
    if (document.querySelector(".oren-portrait-scene")) return;

    const host =
      document.querySelector(".framer-cvfoij") ||
      document.querySelector(".framer-su76c3") ||
      document.querySelector(".framer-1hjpp53");

    if (!host) return;

    const scene = document.createElement("div");
    scene.className = "oren-portrait-scene";
    scene.innerHTML = `
      <div class="oren-head-stage" aria-hidden="true">
        <img class="oren-portrait-full" src="./assets-optimized/oren-main-head-crayon-v1.webp?v=20260601-crayon-v1" alt="" decoding="async" loading="eager">
      </div>
    `;

    host.appendChild(scene);
  }

  function injectOrenDoodles() {
    document
      .querySelectorAll(".oren-doodle-field, .oren-soft-doodle-layer, .oren-corner-doodle-layer")
      .forEach((field) => field.remove());
  }

  function replaceSignature() {
    document.querySelectorAll('[data-framer-name="signature"] .svgContainer').forEach((signature) => {
      if (signature.dataset.orenSignature === "true") return;

      const usesJackieSignature = signature.querySelector('use[href="#svg12071792336"]');
      if (!usesJackieSignature) return;

      signature.dataset.orenSignature = "true";
      signature.innerHTML = `
        <img src="./assets-optimized/oren-wordmark-v1.webp?v=20260528-v1" alt="Oren" style="display:block;width:100%;height:100%;object-fit:contain">
      `;
    });
  }

  function getVisibleWorkTarget() {
    const selectors = [
      '[data-framer-name="Value block"]',
      '[data-framer-name="Project cards"]',
      '[data-framer-name="Work"]',
    ];

    for (const selector of selectors) {
      const target = [...document.querySelectorAll(selector)].find((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      });
      if (target) return target;
    }

    return null;
  }

  function scrollToWork() {
    const target = getVisibleWorkTarget();
    if (target) {
      if (!target.id) target.id = "work";
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    window.scrollTo({ top: window.innerHeight * 0.9, behavior: "smooth" });
  }

  function isWorkHref(href) {
    if (!href) return false;

    const value = href.trim();
    if (value === "#work") return true;

    try {
      const url = new URL(value, window.location.href);
      const path = url.pathname.replace(/\/+$/, "");
      return path.split("/").pop() === "work";
    } catch (error) {
      const normalized = value.replace(/[#?].*$/, "").replace(/\/+$/, "");
      return normalized === "./work" || normalized === "/work" || normalized.endsWith("/work");
    }
  }

  function getHomeUrlForWorkRoute(urlValue) {
    const url = new URL(urlValue || window.location.href, window.location.href);
    const nextPath = url.pathname.replace(/\/work\/?$/, "/");
    return `${url.origin}${nextPath}${url.search}#work`;
  }

  function isWorkNavLink(link) {
    if (!link || link.tagName !== "A") return false;

    const href = link.getAttribute("href") || "";
    if (isWorkHref(href)) return true;

    const label = (link.textContent || "").trim().replace(/\s+/g, " ").toLowerCase();
    const framerName = (link.getAttribute("data-framer-name") || "").trim().toLowerCase();
    const isTopNavItem = Boolean(link.closest('[data-framer-name="Texts"]'));
    return isTopNavItem && (framerName === "work" || label === "work");
  }

  function getWorkNavigationElement(target) {
    const element = target && (target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement);
    if (!element || !element.closest) return null;

    const link = element.closest("a");
    if (isWorkNavLink(link)) return link;

    return element.closest('[data-framer-name="Texts"] [data-framer-name="Work"]');
  }

  function normalizeWorkLink(link) {
    if (!isWorkNavLink(link)) return;

    link.dataset.orenWorkNav = "true";
    link.setAttribute("href", "#work");
    link.removeAttribute("target");
    link.setAttribute("aria-label", "Work, scroll down");
  }

  function normalizeWorkLinks(root) {
    const scope = root || document;
    const links = [
      ...(scope.matches && scope.matches("a") ? [scope] : []),
      ...(scope.querySelectorAll ? scope.querySelectorAll("a") : []),
    ];

    links.forEach(normalizeWorkLink);
  }

  function runWorkNavigation() {
    const now = Date.now();
    if (now - lastWorkNavigationAt < 260) return;

    lastWorkNavigationAt = now;
    window.requestAnimationFrame(scrollToWork);
  }

  function interceptWorkNavigation(event) {
    const workElement = getWorkNavigationElement(event.target);
    if (!workElement) return;

    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (workElement.tagName === "A") normalizeWorkLink(workElement);
    runWorkNavigation();
  }

  function keepWorkRouteOnHome() {
    if (!isWorkHref(window.location.href)) return;

    window.history.replaceState(window.history.state, document.title, getHomeUrlForWorkRoute(window.location.href));
    window.requestAnimationFrame(scrollToWork);
  }

  function installWorkRouteGuard() {
    if (workRouteGuardInstalled || !window.history) return;
    workRouteGuardInstalled = true;

    const wrapHistoryMethod = (methodName) => {
      const original = window.history[methodName];
      if (typeof original !== "function") return;

      window.history[methodName] = function (state, title, url) {
        if (url && isWorkHref(String(url))) {
          const result = original.call(this, state, title, getHomeUrlForWorkRoute(url));
          runWorkNavigation();
          return result;
        }

        return original.apply(this, arguments);
      };
    };

    wrapHistoryMethod("pushState");
    wrapHistoryMethod("replaceState");
    window.addEventListener("popstate", keepWorkRouteOnHome);
  }

  function bindWorkNavigationEvents() {
    const options = { capture: true, passive: false };
    ["touchstart", "touchend", "pointerdown", "pointerup", "mousedown", "mouseup", "click"].forEach((eventName) => {
      window.addEventListener(eventName, interceptWorkNavigation, options);
      document.addEventListener(eventName, interceptWorkNavigation, options);
    });
  }

  function ensureNavTooltip(item, variant) {
    if (item.querySelector(".oren-nav-tooltip")) return;

    const tooltip = document.createElement("span");
    tooltip.className = `oren-nav-tooltip oren-nav-tooltip-${variant}`;
    tooltip.setAttribute("aria-hidden", "true");

    if (variant === "work") {
      tooltip.innerHTML = `<span class="oren-work-note">scroll down</span>`;
    }

    if (variant === "connect") {
      tooltip.innerHTML = `
        <span class="oren-contact-stack">
          <span class="oren-contact-row oren-contact-row-email" data-copy-value="xuhaocheng.xmu@vip.163.com">
            <span class="oren-email-icon" aria-hidden="true"></span>
            <span class="oren-email-address">xuhaocheng.xmu@vip.163.com</span>
          </span>
          <span class="oren-contact-row oren-contact-row-wechat" data-copy-value="Spring_wall">
            <span class="oren-wechat-icon" aria-hidden="true">
              <svg viewBox="0 0 58 42" focusable="false">
                <path d="M 21 6 C 10.6 6 3.5 12.2 3.5 20.1 C 3.5 24.4 5.6 28.1 9.1 30.6 L 7.8 36.2 L 14.2 33.1 C 16.2 33.7 18.5 34.1 21 34.1 C 31.4 34.1 38.5 27.9 38.5 20.1 C 38.5 12.2 31.4 6 21 6 Z" />
                <path d="M 36.4 13.5 C 47 13.5 54 19.5 54 27 C 54 30.5 52.3 33.6 49.4 35.9 L 50.5 40 L 45.3 37.5 C 42.8 38.3 39.8 38.7 36.4 38.7 C 26.1 38.7 19.5 32.8 19.5 26.1 C 19.5 18.9 26.6 13.5 36.4 13.5 Z" />
                <circle cx="15.8" cy="19.7" r="1.65" />
                <circle cx="25.4" cy="19.7" r="1.65" />
                <circle cx="32.8" cy="26.1" r="1.45" />
                <circle cx="42.1" cy="26.1" r="1.45" />
              </svg>
            </span>
            <span class="oren-wechat-address">Spring_wall</span>
          </span>
        </span>
      `;
    }

    item.appendChild(tooltip);
  }

  function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value);
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand("copy");
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    } finally {
      textarea.remove();
    }
  }

  function enhanceNavigation() {
    const workItems = document.querySelectorAll('[data-framer-name="Texts"] > [data-framer-name="Work"]');
    const connectItems = document.querySelectorAll('[data-framer-name="Texts"] > [data-framer-name="Connect"]');

    workItems.forEach((item) => {
      item.dataset.orenNavHint = "work";
      item.setAttribute("aria-label", "Work, scroll down");

      if (item.dataset.orenNavHoverBound !== "true") {
        item.dataset.orenNavHoverBound = "true";
        const showWorkHint = () => item.classList.add("is-oren-nav-open");
        const hideWorkHint = () => item.classList.remove("is-oren-nav-open");
        item.addEventListener("pointerenter", showWorkHint);
        item.addEventListener("pointerleave", hideWorkHint);
        item.addEventListener("mouseenter", showWorkHint);
        item.addEventListener("mouseleave", hideWorkHint);
        item.addEventListener("focusin", showWorkHint);
        item.addEventListener("focusout", hideWorkHint);
      }

      if (item.dataset.orenNavClickBound === "true") return;
      item.dataset.orenNavClickBound = "true";
      item.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          scrollToWork();
        },
        true
      );
    });

    connectItems.forEach((item) => {
      item.dataset.orenNavHint = "connect";
      item.setAttribute("role", "link");
      item.setAttribute("tabindex", "0");
      item.setAttribute("aria-label", "Connect by email");
      ensureNavTooltip(item, "connect");
      const tooltip = item.querySelector(".oren-nav-tooltip-connect");

      if (item.dataset.orenNavHoverBound !== "true") {
        item.dataset.orenNavHoverBound = "true";
        const showEmailHint = () => item.classList.add("is-oren-nav-open");
        const hideEmailHint = () => item.classList.remove("is-oren-nav-open");
        item.addEventListener("pointerenter", showEmailHint);
        item.addEventListener("pointerleave", hideEmailHint);
        item.addEventListener("mouseenter", showEmailHint);
        item.addEventListener("mouseleave", hideEmailHint);
        item.addEventListener("focusin", showEmailHint);
        item.addEventListener("focusout", hideEmailHint);
      }

      if (tooltip && tooltip.dataset.orenCopyBound !== "true") {
        tooltip.dataset.orenCopyBound = "true";
        const copyContact = async (event) => {
          const target = event.target.closest("[data-copy-value]");
          if (!target) return;
          event.preventDefault();
          event.stopPropagation();

          try {
            await copyText(target.dataset.copyValue);
            target.classList.add("is-copied");
            window.setTimeout(() => target.classList.remove("is-copied"), 1100);
          } catch (error) {
            console.warn("Unable to copy contact text", error);
          }
        };

        tooltip.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          copyContact(event);
        });
      }

      if (item.dataset.orenNavClickBound === "true") return;
      item.dataset.orenNavClickBound = "true";
      const openEmail = () => {
        window.location.href = "mailto:xuhaocheng.xmu@vip.163.com";
      };
      item.addEventListener("click", openEmail);
      item.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openEmail();
      });
    });
  }

  function applyAll(root) {
    replaceMeta();
    replaceText(root);
    replaceLinks(root);
    replaceImages(root);
    replaceContentGrowthBashpayCard(root);
    replaceContentGrowthLogisticsCard(root);
    replaceContentGrowthMediaMapCard(root);
    replaceToursHeroImage(root);
    replaceToursDashboardCard(root);
    hideLeftFinishTourCard(root);
    collapseLegacyScreenies(root);
    enhanceGalleries(root);
    injectOrenHero();
    injectGeneratedPortrait();
    injectOrenDoodles();
    replaceSignature();
    enhanceNavigation();
  }

  function lockMeta() {
    if (!config.meta) return;

    const update = () => {
      replaceMeta();
      if (window.__OREN_APPLY_META__) window.__OREN_APPLY_META__();
    };
    update();
    window.setTimeout(update, 250);
    window.setTimeout(update, 1000);
    window.setTimeout(update, 2500);
    window.setTimeout(update, 5000);
  }

  function start() {
    installWorkRouteGuard();
    lockMeta();
    applyAll(document.body);
    keepWorkRouteOnHome();
    window.requestAnimationFrame(() => {
      document.documentElement.dataset.editableMirror = "ready";
    });

    [0, 250, 1000, 2500].forEach((delay) => window.setTimeout(keepWorkRouteOnHome, delay));

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.target.nodeType === Node.ELEMENT_NODE) {
          const target = mutation.target;
          if (target.tagName === "IMG") replaceImages(target);
          if (mutation.attributeName === "style") replaceFramerRemoteBackgrounds(target);
        }

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) applyAll(node);
          if (node.nodeType === Node.TEXT_NODE) replaceText(node.parentNode || document.body);
        });
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["src", "srcset", "style"],
      childList: true,
      subtree: true,
    });
  }

  bindWorkNavigationEvents();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
