const STORAGE_FONT = "pokajni-font-scale";
const STORAGE_PAGE = "pokajni-page-index";

const FONT_MIN = 0.85;
const FONT_MAX = 1.8;
const FONT_STEP = 0.1;

const PAGE_HEADINGS = [
  { id: "predgovor", title: "Предговор", re: /^Предговор$/ },
  {
    id: "pocetak",
    title: "Покајни канон Господу нашем Исусу Христу",
    re: /^Покајни канон Господу нашем Исусу Христу$/,
  },
  { id: "psalam-83", title: "Псалам 83", re: /^Псалам 83:?$/ },
  { id: "tropar", title: "Тропар, глас 6", re: /^Тропар,?\s*глас 6$/ },
  { id: "slava-glas", title: "Слава, глас исти", re: /^Слава,?\s*глас исти:?$/ },
  {
    id: "bogorodicen",
    title: "И сада, Богородичен, глас исти",
    re: /^И сада,?\s*Богородичен,?\s*глас исти:?$/,
  },
  { id: "pesma-1", title: "Песма 1", re: /^Песма 1\.?$/ },
  { id: "pesma-3", title: "Песма 3", re: /^Песма 3\.?$/ },
  { id: "sjedalen", title: "Сједален, глас 6", re: /^Сједален,?\s*глас 6\.?$/ },
  { id: "pesma-4", title: "Песма 4", re: /^Песма 4:?$/ },
  { id: "pesma-5", title: "Песма 5", re: /^Песма 5:?$/ },
  { id: "pesma-6", title: "Песма 6", re: /^Песма 6\.?$/ },
  { id: "kondak", title: "Кондак, глас 2", re: /^Кондак\s+глас 2\.?$/ },
  { id: "ikos", title: "Икос", re: /^Икос\.?$/ },
  { id: "pesma-7", title: "Песма 7", re: /^Песма 7\.?$/ },
  { id: "pesma-8", title: "Песма 8", re: /^Песма 8\.?$/ },
  { id: "pesma-9", title: "Песма 9", re: /^Песма 9\.?$/ },
  { id: "svetilen", title: "Светилен, глас 6", re: /^Светилен,?\s*глас 6:?$/ },
];

const MOLITVA_TITLES = [
  { id: "molitva-1", title: "Молитва свештенослужитеља" },
  { id: "molitva-2", title: "Молитва светог Амвросија Медиоланског" },
];

const LABEL_RE =
  /^(Ирмос|Припев|Слава и сада,?\s*Богородичен(?:,?\s*глас 6)?|И сада,?\s*Богородичен|Слава|И сада)\s*:\s*(.*)$/;
const KANON_RE = /^Канон,?\s*глас 3\.?$/;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function matchHeading(line, molitvaCount) {
  const text = line.trim();
  if (!text) {
    return null;
  }
  if (text === "Молитва") {
    return MOLITVA_TITLES[molitvaCount] || null;
  }
  return PAGE_HEADINGS.find((heading) => heading.re.test(text)) || null;
}

function joinParagraphs(rawLines) {
  const blocks = [];
  let current = [];

  rawLines.forEach((line) => {
    const stripped = line.trim();
    if (!stripped) {
      if (current.length) {
        blocks.push(current);
        current = [];
      }
      return;
    }
    current.push(stripped);
  });

  if (current.length) {
    blocks.push(current);
  }

  return blocks.map((block) => {
    const text = block.join(" ").replace(/\s+/g, " ").trim();
    const labeled = text.match(LABEL_RE);
    if (labeled) {
      return {
        label: labeled[1].replace(/\s+/g, " ").trim(),
        text: labeled[2].trim(),
      };
    }
    if (text.startsWith("(") && text.endsWith(")")) {
      return { kind: "note", text };
    }
    return { text };
  });
}

function parseIzvor(source) {
  const lines = source.split(/\r?\n/).filter((line) => !/^\s*---\s*$/.test(line));
  const start = lines.findIndex((line) => line.trim() === "Предговор");
  const slice = start >= 0 ? lines.slice(start) : lines;

  const pages = [];
  let current = null;
  let body = [];
  let pendingKicker = "";
  let molitvaCount = 0;

  function flush() {
    if (!current) {
      return;
    }
    current.paragraphs = joinParagraphs(body);
    pages.push(current);
    current = null;
    body = [];
  }

  slice.forEach((line) => {
    const stripped = line.trim();
    if (KANON_RE.test(stripped)) {
      pendingKicker = "Канон, глас 3";
      return;
    }

    const heading = matchHeading(stripped, molitvaCount);
    if (heading) {
      if (heading.id.startsWith("molitva-")) {
        molitvaCount += 1;
      }
      const kicker = pendingKicker;
      flush();
      current = {
        id: heading.id,
        title: heading.title,
        kicker,
      };
      pendingKicker = "";
      return;
    }

    if (current) {
      body.push(line);
    }
  });

  flush();
  return pages;
}

const TEXT_PAGES = parseIzvor(typeof IZVOR === "string" ? IZVOR : "").map((page) => {
  if (page.id === "pocetak") {
    return { ...page, kind: "text", title: "Почетак" };
  }
  return { ...page, kind: "text" };
});

const NAZIV_PAGE = {
  id: "naziv",
  kind: "naziv",
  title: "Покајни канон",
};

const predgovorIndex = TEXT_PAGES.findIndex((page) => page.id === "predgovor");
const orderedTextPages = [...TEXT_PAGES];
if (predgovorIndex >= 0) {
  orderedTextPages.splice(predgovorIndex + 1, 0, NAZIV_PAGE);
} else {
  orderedTextPages.unshift(NAZIV_PAGE);
}

const PAGES = [
  {
    id: "naslovna",
    kind: "cover",
    title: "Манастир Лешје",
  },
  {
    id: "sadrzaj",
    kind: "toc",
    title: "Садржај",
  },
  ...orderedTextPages,
];

const TOC_INDEX = PAGES.findIndex((page) => page.kind === "toc");

const reader = document.getElementById("reader");
const pageEl = document.getElementById("page");
const chromeEl = document.getElementById("chrome");
const fontDown = document.getElementById("font-down");
const fontUp = document.getElementById("font-up");
const pageIndicator = document.getElementById("page-indicator");
const contentsBtn = document.getElementById("contents-btn");

let pageIndex = 0;
let fontScale = 1;
let chromeTimer = 0;
let touchStartX = 0;
let touchStartY = 0;

function loadState() {
  const savedScale = Number(localStorage.getItem(STORAGE_FONT));
  if (Number.isFinite(savedScale) && savedScale >= FONT_MIN && savedScale <= FONT_MAX) {
    fontScale = savedScale;
  }

  const savedPage = Number(localStorage.getItem(STORAGE_PAGE));
  if (Number.isInteger(savedPage) && savedPage >= 0 && savedPage < PAGES.length) {
    pageIndex = savedPage;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_FONT, String(fontScale));
  localStorage.setItem(STORAGE_PAGE, String(pageIndex));
}

function applyFontScale() {
  document.documentElement.style.setProperty("--type-scale", String(fontScale));
}

function paragraphHtml(paragraph) {
  if (paragraph.label) {
    const body = paragraph.text
      ? ` ${escapeHtml(paragraph.text)}`
      : "";
    return `<p class="rubric"><span class="label">${escapeHtml(paragraph.label)}:</span>${body}</p>`;
  }
  if (paragraph.kind === "note") {
    return `<p class="note">${escapeHtml(paragraph.text)}</p>`;
  }
  return `<p>${escapeHtml(paragraph.text)}</p>`;
}

function renderCover() {
  return `
    <figure class="cover-stack">
      <img
        class="cover-image"
        src="pokrov-cover.jpg"
        alt="Покров Пресвете Богородице"
        width="622"
        height="752"
      />
      <h1 class="cover-title">Манастир Лешје</h1>
      <div class="swipe-hint" aria-hidden="true">
        <svg class="swipe-finger" viewBox="0 0 32 40" width="34" height="44">
          <path
            fill="currentColor"
            d="M20.2 2.4c-1.3 0-2.3 1-2.3 2.3v11.2c0 .3-.3.5-.6.4-.3-.1-.4-.4-.3-.6l2.4-6.3c.4-1.1-.2-2.3-1.3-2.7-.9-.3-1.9.1-2.4.9L12.4 14c-.2.3-.6.3-.8.1-.2-.2-.2-.5 0-.7l3.2-4.6c.7-1 .5-2.4-.5-3.1-.9-.6-2.1-.4-2.8.5L7.2 12.4c-2.4 3.3-3.7 7.3-3.7 11.4 0 7.1 5.4 12.8 12.1 12.8 5.6 0 10.2-4.6 10.2-10.3V8.6c0-3.4-2.5-6.2-5.6-6.2z"
          />
        </svg>
      </div>
    </figure>
  `;
}

function renderNaziv() {
  return `
    <section class="naziv">
      <div class="naziv-text">
        <p class="naziv-heading">Покајни канон</p>
        <p class="naziv-heading">Господу нашем Исусу Христу</p>
        <p>певан од архи(јереја)</p>
        <p>који ће вршити свету литургију,</p>
        <p>односно свештенодејствовати</p>
        <p>за људе Божије</p>
      </div>
      <img
        class="naziv-image"
        src="sveta tri jerarha.jpg"
        alt="Света Три Јерарха"
      />
    </section>
  `;
}

function renderToc() {
  const items = PAGES.map((page, index) => {
    if (page.kind === "toc") {
      return "";
    }
    const current = index === pageIndex ? ' aria-current="page"' : "";
    return `<li><button type="button" class="toc-link" data-page="${index}"${current}>${escapeHtml(
      page.title
    )}</button></li>`;
  }).join("");

  return `<section class="toc"><h1 class="page-title">Садржај</h1><ol class="toc-list">${items}</ol></section>`;
}

function renderText(page) {
  const kicker = page.kicker
    ? `<p class="kicker">${escapeHtml(page.kicker)}</p>`
    : "";
  const paragraphs = (page.paragraphs || []).map(paragraphHtml).join("");
  return `${kicker}<h1 class="page-title">${escapeHtml(page.title)}</h1><div class="prose">${paragraphs}</div>`;
}

function renderPage() {
  const page = PAGES[pageIndex];
  const app = document.getElementById("app");
  pageEl.className = "page";
  app.dataset.pageKind = page.kind;

  if (page.kind === "cover") {
    pageEl.classList.add("page-cover");
    pageEl.innerHTML = renderCover();
  } else if (page.kind === "toc") {
    pageEl.classList.add("page-toc");
    pageEl.innerHTML = renderToc();
  } else if (page.kind === "naziv") {
    pageEl.classList.add("page-naziv");
    pageEl.innerHTML = renderNaziv();
  } else {
    pageEl.classList.add("page-text");
    pageEl.innerHTML = renderText(page);
  }
  pageEl.scrollTop = 0;
  pageIndicator.textContent = `${pageIndex + 1} / ${PAGES.length}`;
  contentsBtn.hidden = page.kind === "toc";
  saveState();
}

function getViewportScale() {
  if (window.visualViewport && window.visualViewport.scale) {
    return window.visualViewport.scale;
  }
  return 1;
}

function isZoomedView() {
  return (
    getViewportScale() > 1.05 ||
    pageEl.scrollWidth > pageEl.clientWidth + 8
  );
}

function captureReadAnchor() {
  const bounds = pageEl.getBoundingClientRect();
  const x = bounds.left + Math.min(28, bounds.width * 0.12);
  const y = bounds.top + Math.min(24, bounds.height * 0.08);
  let node = document.elementFromPoint(x, y);

  if (!node || !pageEl.contains(node)) {
    const max = Math.max(1, pageEl.scrollHeight - pageEl.clientHeight);
    return { kind: "ratio", ratio: pageEl.scrollTop / max };
  }

  while (
    node.parentElement &&
    node.parentElement !== pageEl &&
    !node.matches("p, h1, li, .kicker, .page-title, .rubric, .naziv-text p, .cover-title")
  ) {
    node = node.parentElement;
  }

  return {
    kind: "node",
    node,
    offset: node.getBoundingClientRect().top - bounds.top,
  };
}

function restoreReadAnchor(anchor) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (anchor.kind === "node" && anchor.node && pageEl.contains(anchor.node)) {
        const top = pageEl.getBoundingClientRect().top;
        pageEl.scrollTop += anchor.node.getBoundingClientRect().top - top - anchor.offset;
        return;
      }
      if (anchor.kind === "ratio") {
        const max = Math.max(1, pageEl.scrollHeight - pageEl.clientHeight);
        pageEl.scrollTop = anchor.ratio * max;
      }
    });
  });
}

function changeFont(direction) {
  const anchor = captureReadAnchor();
  fontScale = Math.min(
    FONT_MAX,
    Math.max(FONT_MIN, Number((fontScale + direction * FONT_STEP).toFixed(2)))
  );
  applyFontScale();
  restoreReadAnchor(anchor);
  saveState();
  showChrome();
}

function goTo(index) {
  if (index < 0 || index >= PAGES.length || index === pageIndex) {
    return;
  }
  pageIndex = index;
  renderPage();
}

function showChrome() {
  chromeEl.classList.add("is-visible");
  window.clearTimeout(chromeTimer);
  chromeTimer = window.setTimeout(() => {
    chromeEl.classList.remove("is-visible");
  }, 3200);
}

function onTouchStart(event) {
  if (event.touches.length !== 1) {
    return;
  }
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
}

function onTouchEnd(event) {
  const touch = event.changedTouches[0];
  if (!touch) {
    return;
  }

  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.4) {
    showChrome();
    return;
  }

  if (isZoomedView()) {
    return;
  }

  if (dx < 0) {
    goTo(pageIndex + 1);
  } else {
    goTo(pageIndex - 1);
  }
}

fontDown.addEventListener("click", () => changeFont(-1));
fontUp.addEventListener("click", () => changeFont(1));
contentsBtn.addEventListener("click", () => {
  goTo(TOC_INDEX);
  showChrome();
});
reader.addEventListener("click", (event) => {
  const link = event.target.closest("[data-page]");
  if (link) {
    goTo(Number(link.dataset.page));
    return;
  }
  showChrome();
});
reader.addEventListener("touchstart", onTouchStart, { passive: true });
reader.addEventListener("touchend", onTouchEnd, { passive: true });

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") {
    goTo(pageIndex + 1);
  } else if (event.key === "ArrowLeft") {
    goTo(pageIndex - 1);
  } else if (event.key === "+" || event.key === "=") {
    changeFont(1);
  } else if (event.key === "-") {
    changeFont(-1);
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {});
  });
}

loadState();
applyFontScale();
renderPage();
showChrome();
