(function () {
  const report = document.getElementById("test-report");
  const results = [];
  let failed = 0;
  let passed = 0;

  function ok(name, condition, detail) {
    if (condition) {
      passed += 1;
      results.push({ ok: true, name });
      return;
    }
    failed += 1;
    results.push({ ok: false, name, detail: detail || "" });
  }

  function ids(pages) {
    return pages.map((page) => page.id);
  }

  function pageById(id) {
    return PAGES.find((page) => page.id === id);
  }

  function resetReader() {
    pageIndex = 0;
    fontScale = 1;
    applyFontScale();
    renderPage();
    hideInstallHelp();
  }

  function fakeTouch(type, x, y, extras) {
    const point = { clientX: x, clientY: y };
    const event = {
      touches: type === "touchend" ? [] : [point],
      changedTouches: [point],
      ...extras,
    };
    if (type === "touchstart") {
      onTouchStart(event);
    } else {
      onTouchEnd(event);
    }
  }

  // --- извор и парсер ---
  ok("IZVOR је учитан", typeof IZVOR === "string" && IZVOR.length > 1000);
  ok("парсер враћа странице", Array.isArray(TEXT_PAGES) && TEXT_PAGES.length >= 18);

  const parsed = parseIzvor(IZVOR);
  ok("нема Песме 2", parsed.every((page) => page.id !== "pesma-2" && page.title !== "Песма 2"));
  ok(
    "песме иду 1, 3, 4, 5, 6, 7, 8, 9",
    parsed
      .filter((page) => page.id.startsWith("pesma-"))
      .map((page) => page.id)
      .join() === "pesma-1,pesma-3,pesma-4,pesma-5,pesma-6,pesma-7,pesma-8,pesma-9"
  );

  ok("Предговор је прва текстуална страна", parsed[0] && parsed[0].id === "predgovor");
  ok("има две молитве", parsed.filter((page) => page.id.startsWith("molitva-")).length === 2);
  ok(
    "прва молитва је свештенослужитеља",
    parsed.some((page) => page.id === "molitva-1" && page.title === "Молитва свештенослужитеља")
  );
  ok(
    "друга молитва је Амвросија",
    parsed.some(
      (page) => page.id === "molitva-2" && page.title.indexOf("Амвросија") !== -1
    )
  );

  const pesma1 = parsed.find((page) => page.id === "pesma-1");
  ok("Песма 1 има кicker Канон, глас 3", pesma1 && pesma1.kicker === "Канон, глас 3");
  ok(
    "остале песме немају тај kicker",
    parsed.filter((page) => page.id.startsWith("pesma-") && page.id !== "pesma-1").every((page) => !page.kicker)
  );

  ok(
    "раздељници --- се бацају",
    parseIzvor("Предговор\n---\nтекст\n---\n").some((page) =>
      (page.paragraphs || []).every((p) => (p.text || "").indexOf("---") === -1)
    )
  );

  const labeled = joinParagraphs(["Ирмос: Појмо Господу", "", "Припев: Помилуј ме Боже"]);
  ok("Ирмос се препознаје као рубрика", labeled[0] && labeled[0].label === "Ирмос");
  ok("Припев се препознаје као рубрика", labeled[1] && labeled[1].label === "Припев");

  const note = joinParagraphs(["(ово је напомена)"]);
  ok("заграда је напомена", note[0] && note[0].kind === "note");

  const joined = joinParagraphs(["први", "ред", "", "други"]);
  ok("празан ред дели пасусе", joined.length === 2 && joined[0].text === "први ред");

  ok(
    "matchHeading не хвата обичан текст",
    matchHeading("Благословен Бог наш", 0) === null
  );
  ok("matchHeading хвата Предговор", matchHeading("Предговор", 0).id === "predgovor");
  ok("трећа Молитва се игнорише", matchHeading("Молитва", 2) === null);

  // --- распоред PAGES ---
  ok("насловна је прва", PAGES[0].kind === "cover" && PAGES[0].title === "Манастир Лешје");
  ok("назив је одмах после насловне", PAGES[1].kind === "naziv");
  ok("TOC_INDEX је на крају", TOC_INDEX === PAGES.length - 1);

  const predgovorPos = PAGES.findIndex((page) => page.id === "predgovor");
  const nazivPos = PAGES.findIndex((page) => page.kind === "naziv");
  ok("назив је друга страна", nazivPos === 1);
  ok("Предговор је одмах после назива", predgovorPos === nazivPos + 1);
  ok(
    "после Предговора иде Почетак",
    PAGES[predgovorPos + 1] && PAGES[predgovorPos + 1].id === "pocetak"
  );
  ok("назив има Три Јерарха у HTML-у", /sveta tri jerarha/.test(renderNaziv()));

  const pocetak = pageById("pocetak");
  ok("почетак у садржају стоји као Почетак", pocetak && pocetak.title === "Почетак");

  ok(
    "садржај не линкује сам на себе",
    !renderToc().includes('data-page="' + TOC_INDEX + '"')
  );

  // --- HTML ---
  ok("escapeHtml бежи опасне знаке", escapeHtml('<img src="x" onerror="x">') === "&lt;img src=&quot;x&quot; onerror=&quot;x&quot;&gt;");
  ok(
    "рубрика не убацује сирови HTML",
    paragraphHtml({ label: "Припев", text: "<b>x</b>" }).indexOf("<b>") === -1
  );

  const coverHtml = renderCover();
  ok("насловна има Манастир Лешје", coverHtml.indexOf("Манастир Лешје") !== -1);
  ok("насловна има swipe-hint.png", coverHtml.indexOf("swipe-hint.png") !== -1);
  ok("насловна има покров", coverHtml.indexOf("pokrov-cover.jpg") !== -1);
  ok("насловна има cover-side за landscape", coverHtml.indexOf("cover-side") !== -1);

  // --- навигација ---
  resetReader();
  const start = pageIndex;
  goTo(-1);
  ok("goTo(-1) не мења страну", pageIndex === start);
  goTo(PAGES.length);
  ok("goTo преко краја не мења страну", pageIndex === start);
  goTo(0);
  goTo(0);
  ok("goTo на исту страну је празан ход", pageIndex === 0);

  goTo(TOC_INDEX);
  ok("одлазак на садржај", pageIndex === TOC_INDEX && document.getElementById("app").dataset.pageKind === "toc");
  ok("Садржај дугме је скривено на садржају", contentsBtn.hidden === true);
  ok("индикатор показује број стране", pageIndicator.textContent === TOC_INDEX + 1 + " / " + PAGES.length);

  goTo(0);
  ok("Садржај дугме је видљиво ван садржаја", contentsBtn.hidden === false);

  const beforeSwipe = pageIndex;
  fakeTouch("touchstart", 200, 300);
  fakeTouch("touchend", 80, 305);
  ok("свайп улево иде на следећу страну", pageIndex === beforeSwipe + 1);

  fakeTouch("touchstart", 80, 300);
  fakeTouch("touchend", 220, 305);
  ok("свайп удесно се враћа", pageIndex === beforeSwipe);

  const stay = pageIndex;
  fakeTouch("touchstart", 200, 200);
  fakeTouch("touchend", 200, 360);
  ok("вертикални потез не мења страну", pageIndex === stay);

  fakeTouch("touchstart", 200, 300);
  fakeTouch("touchend", 160, 305);
  ok("кратак потез не мења страну", pageIndex === stay);

  const beforeZoom = pageIndex;
  const previousViewport = window.visualViewport;
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: { scale: 2 },
  });
  fakeTouch("touchstart", 240, 300);
  fakeTouch("touchend", 40, 300);
  const noTurnWhenZoomed = pageIndex === beforeZoom;
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: previousViewport,
  });
  ok("при зуму свайп не листа стране", noTurnWhenZoomed);

  goTo(0);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
  ok("стрелица десно листа напред", pageIndex === 1);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
  ok("стрелица лево листа назад", pageIndex === 0);

  // --- фонт ---
  fontScale = 1;
  changeFont(1);
  ok("А+ повећава слово за 0.1", fontScale === 1.1);
  changeFont(-1);
  ok("А− враћа слово", fontScale === 1);

  fontScale = FONT_MIN;
  changeFont(-1);
  ok("слово не иде испод минимума", fontScale === FONT_MIN);

  fontScale = FONT_MAX;
  changeFont(1);
  ok("слово не иде изнад максимума", fontScale === FONT_MAX);

  fontScale = 1.3;
  saveState();
  ok(
    "фонт се памти",
    localStorage.getItem(STORAGE_FONT) === "1.3"
  );
  pageIndex = 4;
  saveState();
  const remembered = pageIndex;
  pageIndex = 0;
  loadState();
  ok("страна се памти", pageIndex === remembered);

  document.documentElement.style.setProperty("--type-scale", "1");
  fontScale = 1.2;
  applyFontScale();
  ok(
    "CSS променљива прати фонт",
    getComputedStyle(document.documentElement).getPropertyValue("--type-scale").trim() === "1.2"
  );

  // --- Преузми ---
  goTo(0);
  showInstallButton();
  ok("Преузми је на насловној", installBtn.hidden === false && !installBtn.classList.contains("is-hidden"));
  ok("натпис је Преузми", installBtn.textContent.replace(/\s+/g, " ").trim().indexOf("Преузми") !== -1);

  goTo(TOC_INDEX);
  showInstallButton();
  ok("Преузми није на садржају", installBtn.hidden === true);

  goTo(nazivPos);
  showInstallButton();
  ok("Преузми није на називу", installBtn.hidden === true);

  goTo(0);
  showInstallButton();
  const style = window.getComputedStyle(installBtn);
  ok("Преузми је доле лево", parseFloat(style.left) >= 0 && parseFloat(style.left) < 48);

  showChrome();
  ok("на насловној нема А+ А− траке", !chromeEl.classList.contains("is-visible"));

  goTo(predgovorPos);
  showChrome();
  ok("ван насловне А+ А− трака се показује", chromeEl.classList.contains("is-visible"));
  hideChrome();
  goTo(0);

  installApp();
  ok("без системског промпта отвара упутство", installHelp.hidden === false);
  hideInstallHelp();
  ok("упутство се затвара", installHelp.hidden === true);

  // --- бројач само за власника ---
  sessionStorage.removeItem(STORAGE_OWNER);
  const params = new URLSearchParams(window.location.search);
  if (params.get("ja") !== "1") {
    ok("без ?ja=1 бројач није власников", isOwnerView() === false);
    ok("трака статистике је скривена", statsEl.hidden === true);
  } else {
    ok("?ja=1 укључује власника", isOwnerView() === true);
  }

  sessionStorage.setItem(STORAGE_OWNER, "1");
  ok("session ја памти власника", isOwnerView() === true);
  sessionStorage.removeItem(STORAGE_OWNER);

  ok("iOS препознавање је функција", typeof isIosDevice === "function");
  ok("standalone препознавање је функција", typeof isStandaloneApp === "function");

  function extraOk(name, condition, detail) {
    ok(name, condition, detail);
  }

  function finish() {
    const lines = [
      "ТЕСТОВИ ПОКАЈНОГ КАНОНА",
      "прошли: " + passed + "   пали: " + failed,
      "",
    ];
    results.forEach((item) => {
      if (item.ok) {
        lines.push("ПРОШАО  " + item.name);
      } else {
        lines.push("ПАО     " + item.name + (item.detail ? " — " + item.detail : ""));
      }
    });
    lines.push("");
    lines.push("РУЧНО НА ТЕЛЕФОНУ (није у овом коду):");
    lines.push("1. Насловна: рука свайп улево, пауза, опет.");
    lines.push("2. Преузми доле лево, испод руке; само на насловној.");
    lines.push("3. Samsung S24: Преузми се види у Chrome-у, не у већ инсталираној икони.");
    lines.push("4. Пинч-зум: страна се помера, не листа.");
    lines.push("5. А+ на Припеву: поглед остаје на истом месту.");
    lines.push("6. Офлајн после инсталације: канон се и даље отвара.");
    lines.push("7. Икона IC XC NIKA на почетном екрану после поновне инсталације.");
    lines.push("8. Android (Chrome) и iPhone (Safari): portrait и landscape.");
    lines.push("9. Landscape: насловна (икона лево, наслов десно), текст се чита, Преузми и хром нису испод notch-а.");
    lines.push("10. Инсталирана икона ротира; није закључана у portrait.");
    lines.push("11. iPhone: Подели → Додај на почетни екран; после тога landscape и даље ради.");
    report.innerHTML = lines
      .map((line) => {
        if (line.indexOf("ПРОШАО") === 0) {
          return '<span class="pass">' + escapeHtml(line) + "</span>";
        }
        if (line.indexOf("ПАО") === 0) {
          return '<span class="fail">' + escapeHtml(line) + "</span>";
        }
        return escapeHtml(line);
      })
      .join("\n");
    document.title = failed ? "ПАЛО " + failed : "Сви тестови прошли";
    resetReader();
  }

  Promise.all([
    fetch("manifest.json", { cache: "no-store" }).then((res) => res.json()),
    fetch("index.html", { cache: "no-store" }).then((res) => res.text()),
    fetch("style.css", { cache: "no-store" }).then((res) => res.text()),
    fetch("script.js", { cache: "no-store" }).then((res) => res.text()),
  ])
    .then(([manifest, html, css, script]) => {
      extraOk(
        "манифест користи nika-192",
        manifest.icons.some((icon) => icon.src.indexOf("nika-192") !== -1)
      );
      extraOk("манифест је sr-Cyrl", manifest.lang === "sr-Cyrl");
      extraOk("PWA је standalone", manifest.display === "standalone");
      extraOk("PWA има стабилан id", manifest.id === "/pokajni-kanon/");
      extraOk("PWA није Play Store апликација", manifest.prefer_related_applications === false);
      extraOk("орјентација није закључана (any)", manifest.orientation === "any");
      extraOk("viewport-fit=cover за notch", html.indexOf("viewport-fit=cover") !== -1);
      extraOk("viewport дозвољава pinch-zoom", html.indexOf("user-scalable=no") === -1);
      extraOk("iPhone PWA meta", html.indexOf("apple-mobile-web-app-capable") !== -1);
      extraOk("Android PWA meta", html.indexOf("mobile-web-app-capable") !== -1);
      extraOk("CSS има landscape распоред", css.indexOf("orientation: landscape") !== -1);
      extraOk("CSS има safe-left/right", css.indexOf("--safe-left") !== -1 && css.indexOf("--safe-right") !== -1);
      extraOk("скрипта не закључава екран", script.indexOf("orientation.lock") === -1);
      finish();
    })
    .catch((error) => {
      extraOk(
        "манифест се чита (покрени локални сервер, не file://)",
        false,
        String(error)
      );
      finish();
    });
})();
