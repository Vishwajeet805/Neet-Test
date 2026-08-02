/* =========================================================
   NEET Answer Checker — script.js
   Pure vanilla JS. No frameworks, no backend, no network
   calls except PDF.js (CDN) which only reads the uploaded
   answer-key PDF locally in the browser.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------- Constants ---------------- */
  const TOTAL_QUESTIONS = 180;
  const SUBJECTS = [
    { name: "Physics", from: 1, to: 45 },
    { name: "Chemistry", from: 46, to: 90 },
    { name: "Botany", from: 91, to: 135 },
    { name: "Zoology", from: 136, to: 180 },
  ];

  const TEST_DURATION_SECONDS = 180 * 60; // 180 minute countdown

  /* ---------------- State ----------------
     Index 0 is unused; questions are 1..180 for readability. */
  const state = {
    userAnswers: new Array(TOTAL_QUESTIONS + 1).fill(null),
    keyAnswers: new Array(TOTAL_QUESTIONS + 1).fill(null),
    missing: new Set(),
    marking: { correct: 4, wrong: -1, unattempted: 0 },
    results: null, // filled by checkAnswers()
    currentFilter: "all",
    unlocked: new Set(["home"]),
    timer: {
      secondsLeft: TEST_DURATION_SECONDS,
      intervalId: null,
      running: false,
    },
  };

  /* ---------------- DOM refs ---------------- */
  const $ = (id) => document.getElementById(id);

  const questionSections = $("questionSections");
  const keyGrid = $("keyGrid");
  const attemptedCount = $("attemptedCount");
  const progressFill = $("progressFill");
  const timerDisplay = $("timerDisplay");

  const pdfInput = $("pdfInput");
  const fileNameLabel = $("fileNameLabel");
  const extractStatus = $("extractStatus");
  const rawTextPanel = $("rawTextPanel");
  const rawTextArea = $("rawTextArea");
  const keyReviewPanel = $("keyReviewPanel");

  const toastEl = $("toast");
  const confirmModal = $("confirmModal");

  /* =========================================================
     THEME
     ========================================================= */
  function initTheme() {
    const saved = localStorage.getItem("neet-theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
  }
  $("themeToggle").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("neet-theme", next);
  });
  initTheme();

  /* =========================================================
     TOAST
     ========================================================= */
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.hidden = true), 2600);
  }

  /* =========================================================
     SCREEN NAVIGATION
     ========================================================= */
  function goToScreen(name) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("is-active"));
    $(`screen-${name}`).classList.add("is-active");
    document.querySelectorAll(".step").forEach((s) => {
      s.classList.toggle("is-active", s.dataset.step === name);
    });
    state.unlocked.add(name);
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  /* =========================================================
     BUBBLE GRID RENDERING (reused for question screen + key screen)
     ========================================================= */
  function renderBubbleGrid(container, { namePrefix, getValue, setValue, highlightMissing, fromQ, toQ }) {
    const start = fromQ || 1;
    const end = toQ || TOTAL_QUESTIONS;
    const frag = document.createDocumentFragment();
    for (let q = start; q <= end; q++) {
      const row = document.createElement("div");
      row.className = "omr-row";
      row.dataset.qnum = q;
      if (highlightMissing && state.missing.has(q)) row.classList.add("is-missing");

      const numEl = document.createElement("span");
      numEl.className = "omr-row__num";
      numEl.textContent = "Q" + q;
      row.appendChild(numEl);

      const opts = document.createElement("div");
      opts.className = "omr-row__opts";

      [1, 2, 3, 4].forEach((opt) => {
        const id = `${namePrefix}-${q}-${opt}`;
        const input = document.createElement("input");
        input.type = "radio";
        input.className = "bubble";
        input.name = `${namePrefix}-${q}`;
        input.id = id;
        input.value = opt;
        input.checked = getValue(q) === opt;

        const label = document.createElement("label");
        label.className = "bubble__label";
        label.htmlFor = id;
        label.textContent = opt;

        input.addEventListener("change", () => {
          setValue(q, opt);
          if (highlightMissing) {
            state.missing.delete(q);
            row.classList.remove("is-missing");
          }
          if (namePrefix === "q") updateProgress();
        });

        // clicking an already-selected bubble clears it (toggle / "leave blank")
        label.addEventListener("click", (e) => {
          if (input.checked) {
            e.preventDefault();
            input.checked = false;
            setValue(q, null);
            if (namePrefix === "q") updateProgress();
          }
        });

        opts.appendChild(input);
        opts.appendChild(label);
      });

      row.appendChild(opts);
      frag.appendChild(row);
    }
    container.innerHTML = "";
    container.appendChild(frag);
  }

  function renderQuestionGrid() {
    // Build one section per subject so subjects are never mixed together.
    questionSections.innerHTML = "";
    SUBJECTS.forEach((subj) => {
      const section = document.createElement("div");
      section.className = "subject-section";

      const heading = document.createElement("div");
      heading.className = "subject-section__heading";
      heading.innerHTML = `<h2>${subj.name}</h2><span>Questions ${subj.from}–${subj.to}</span>`;

      const grid = document.createElement("div");
      grid.className = "omr-grid";

      section.appendChild(heading);
      section.appendChild(grid);
      questionSections.appendChild(section);

      renderBubbleGrid(grid, {
        namePrefix: "q",
        getValue: (q) => state.userAnswers[q],
        setValue: (q, v) => (state.userAnswers[q] = v),
        highlightMissing: false,
        fromQ: subj.from,
        toQ: subj.to,
      });
    });
    updateProgress();
  }

  function renderKeyGrid() {
    renderBubbleGrid(keyGrid, {
      namePrefix: "k",
      getValue: (q) => state.keyAnswers[q],
      setValue: (q, v) => (state.keyAnswers[q] = v),
      highlightMissing: true,
    });
  }

  function updateProgress() {
    // index 0 is unused (always null), so this count is naturally 1..180 only
    const attempted = state.userAnswers.filter((v) => v !== null).length;
    attemptedCount.textContent = attempted;
    progressFill.style.width = (attempted / TOTAL_QUESTIONS) * 100 + "%";
  }

  /* =========================================================
     CLEAR ALL / SUBMIT
     ========================================================= */
  $("clearAllBtn").addEventListener("click", () => {
    if (!confirm("Clear all marked answers?")) return;
    state.userAnswers.fill(null);
    renderQuestionGrid();
    showToast("All answers cleared.");
  });

  // Manual submit always asks for confirmation with attempted/skipped counts.
  $("submitAnswersBtn").addEventListener("click", () => {
    openConfirmModal();
  });

  $("confirmCancelBtn").addEventListener("click", closeConfirmModal);
  $("confirmSubmitBtn").addEventListener("click", () => {
    closeConfirmModal();
    stopTimer();
    goToScreen("key");
  });

  function openConfirmModal() {
    const attempted = state.userAnswers.filter((v) => v !== null).length;
    const skipped = TOTAL_QUESTIONS - attempted;
    $("confirmAttempted").textContent = attempted;
    $("confirmSkipped").textContent = skipped;
    confirmModal.classList.add("is-open");
  }
  function closeConfirmModal() {
    confirmModal.classList.remove("is-open");
  }

  $("backToAnswersBtn").addEventListener("click", () => goToScreen("answering"));

  /* =========================================================
     START TEST + TIMER
     ========================================================= */
  $("startTestBtn").addEventListener("click", () => {
    goToScreen("answering");
    startTimer();
  });

  function startTimer() {
    if (state.timer.running) return;
    state.timer.running = true;
    updateTimerDisplay();
    state.timer.intervalId = setInterval(() => {
      state.timer.secondsLeft--;
      updateTimerDisplay();
      if (state.timer.secondsLeft <= 0) {
        stopTimer();
        // Time's up — submit directly with no confirmation dialog.
        goToScreen("key");
        showToast("Time's up — test submitted automatically.");
      }
    }, 1000);
  }

  function stopTimer() {
    state.timer.running = false;
    if (state.timer.intervalId) {
      clearInterval(state.timer.intervalId);
      state.timer.intervalId = null;
    }
  }

  function updateTimerDisplay() {
    const total = Math.max(0, state.timer.secondsLeft);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n) => String(n).padStart(2, "0");
    timerDisplay.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    timerDisplay.classList.toggle("is-running", state.timer.running);
    timerDisplay.classList.toggle("is-critical", state.timer.running && total <= 300);
  }

  /* =========================================================
     PDF UPLOAD + TEXT EXTRACTION
     ========================================================= */
  if (window["pdfjsLib"]) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  $("dropzone").addEventListener("dragover", (e) => e.preventDefault());
  $("dropzone").addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handlePdfFile(file);
  });
  pdfInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handlePdfFile(file);
  });

  async function handlePdfFile(file) {
    fileNameLabel.textContent = file.name;
    setStatus("Reading PDF…", "warn");

    try {
      const buffer = await file.arrayBuffer();
      const text = await extractTextFromPdf(buffer);
      rawTextArea.value = text;
      rawTextPanel.hidden = false;
      processExtractedText(text);
    } catch (err) {
      console.error(err);
      setStatus(
        "Could not read this PDF automatically (" + err.message + "). You can still fill the key manually below.",
        "err"
      );
      rawTextPanel.hidden = true;
      state.missing = new Set(Array.from({ length: TOTAL_QUESTIONS }, (_, i) => i + 1));
      keyReviewPanel.hidden = false;
      renderKeyGrid();
    }
  }

  async function extractTextFromPdf(arrayBuffer) {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const lineMap = new Map(); // group items roughly by their vertical position (y)

      content.items.forEach((item) => {
        const y = Math.round(item.transform[5]);
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y).push(item.str);
      });

      // sort lines top-to-bottom (PDF y-axis grows upward)
      const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
      sortedY.forEach((y) => {
        fullText += lineMap.get(y).join(" ") + "\n";
      });
      fullText += "\n";
    }
    return fullText;
  }

  /* ---------------- Regex-based answer extraction ----------------
     Supports: "1. (4)"  "1 - 4"  "1) 4"  "Q1 = 4"  "1 4"          */
  function processExtractedText(text) {
    const found = new Map(); // qnum -> answer(1-4)

    // Matches an optional "Q"/"Q." prefix, a question number, an optional
    // separator ( . ) - = : ), an optional opening paren, and the answer digit 1-4.
    const re = /Q?\.?\s*(\d{1,3})\s*[\.\)\-:=]?\s*\(?\s*([1-4])\s*\)?/g;

    let match;
    while ((match = re.exec(text)) !== null) {
      const qnum = parseInt(match[1], 10);
      const ans = parseInt(match[2], 10);
      if (qnum >= 1 && qnum <= TOTAL_QUESTIONS && !found.has(qnum)) {
        found.set(qnum, ans);
      }
    }

    // apply to state
    state.keyAnswers.fill(null);
    found.forEach((ans, qnum) => (state.keyAnswers[qnum] = ans));

    state.missing = new Set();
    for (let q = 1; q <= TOTAL_QUESTIONS; q++) {
      if (state.keyAnswers[q] === null) state.missing.add(q);
    }

    const foundCount = TOTAL_QUESTIONS - state.missing.size;
    if (foundCount === TOTAL_QUESTIONS) {
      setStatus(`✓ All ${TOTAL_QUESTIONS} answers detected successfully.`, "ok");
    } else if (foundCount === 0) {
      setStatus(
        `⚠ Could not automatically detect any answers. Please fill the key manually using the grid below.`,
        "err"
      );
    } else {
      setStatus(
        `⚠ Detected ${foundCount} of ${TOTAL_QUESTIONS} answers. Please fill the ${state.missing.size} missing one(s) highlighted in amber below.`,
        "warn"
      );
    }

    keyReviewPanel.hidden = false;
    renderKeyGrid();
  }

  function setStatus(msg, kind) {
    extractStatus.hidden = false;
    extractStatus.textContent = msg;
    extractStatus.className = "status status--" + kind;
  }

  /* =========================================================
     CHECK ANSWERS / SCORING
     ========================================================= */
  $("checkAnswersBtn").addEventListener("click", () => {
    if (state.missing.size > 0) {
      const proceed = confirm(
        `${state.missing.size} answer key question(s) are still unmarked. They will be treated as blank in the analysis. Continue anyway?`
      );
      if (!proceed) return;
    }

    state.marking.correct = parseFloat($("markCorrect").value) || 0;
    state.marking.wrong = parseFloat($("markWrong").value) || 0;
    state.marking.unattempted = parseFloat($("markUnattempted").value) || 0;

    computeResults();
    renderResults();
    goToScreen("result");
  });

  function computeResults() {
    const perQuestion = [];
    let correct = 0,
      wrong = 0,
      skipped = 0,
      marks = 0;

    const subjectStats = SUBJECTS.map((s) => ({
      ...s,
      correct: 0,
      wrong: 0,
      skipped: 0,
      marks: 0,
      total: s.to - s.from + 1,
    }));

    for (let q = 1; q <= TOTAL_QUESTIONS; q++) {
      const userAns = state.userAnswers[q];
      const correctAns = state.keyAnswers[q];
      let status;

      if (userAns === null) {
        status = "skipped";
        skipped++;
        marks += state.marking.unattempted;
      } else if (correctAns !== null && userAns === correctAns) {
        status = "correct";
        correct++;
        marks += state.marking.correct;
      } else {
        status = "wrong";
        wrong++;
        marks += state.marking.wrong;
      }

      perQuestion.push({ q, userAns, correctAns, status });

      const subj = subjectStats.find((s) => q >= s.from && q <= s.to);
      if (subj) {
        subj[status] += 1;
        subj.marks += status === "correct" ? state.marking.correct : status === "wrong" ? state.marking.wrong : state.marking.unattempted;
      }
    }

    const attempted = correct + wrong;
    const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
    const maxMarks = TOTAL_QUESTIONS * state.marking.correct;

    subjectStats.forEach((s) => (s.maxMarks = s.total * state.marking.correct));

    state.results = {
      total: TOTAL_QUESTIONS,
      correct,
      wrong,
      skipped,
      marks,
      maxMarks,
      accuracy,
      perQuestion,
      subjectStats,
    };
  }

  /* =========================================================
     RESULT RENDERING
     ========================================================= */
  function renderResults() {
    const r = state.results;

    $("sumTotal").textContent = r.total;
    $("sumCorrect").textContent = r.correct;
    $("sumWrong").textContent = r.wrong;
    $("sumSkipped").textContent = r.skipped;
    $("sumMarks").textContent = `${round(r.marks)} / ${r.maxMarks}`;
    $("sumMaxMarks").textContent = r.maxMarks;
    $("sumAccuracy").textContent = r.accuracy.toFixed(2) + "%";

    renderSubjectCards(r.subjectStats);
    renderQuestionTable(r.perQuestion, state.currentFilter);
  }

  function renderSubjectCards(subjectStats) {
    const grid = $("subjectGrid");
    grid.innerHTML = "";
    subjectStats.forEach((s) => {
      const attempted = s.correct + s.wrong;
      const acc = attempted > 0 ? (s.correct / attempted) * 100 : 0;
      const card = document.createElement("div");
      card.className = "subject-card";
      card.innerHTML = `
        <h3>${s.name} <span style="color:var(--text-dim); font-weight:400;">(Q${s.from}-${s.to})</span></h3>
        <div class="subject-card__row"><span>Correct</span><strong style="color:var(--correct)">${s.correct}</strong></div>
        <div class="subject-card__row"><span>Wrong</span><strong style="color:var(--wrong)">${s.wrong}</strong></div>
        <div class="subject-card__row"><span>Skipped</span><strong style="color:var(--skip)">${s.skipped}</strong></div>
        <div class="subject-card__row"><span>Marks</span><strong>${round(s.marks)} / ${s.maxMarks}</strong></div>
        <div class="subject-card__row"><span>Accuracy</span><strong>${acc.toFixed(2)}%</strong></div>
      `;
      grid.appendChild(card);
    });
  }

  function renderQuestionTable(perQuestion, filter) {
    const body = $("qtableBody");
    body.innerHTML = "";
    const frag = document.createDocumentFragment();

    perQuestion.forEach((row) => {
      if (filter !== "all" && row.status !== filter) return;
      const tr = document.createElement("tr");
      tr.className = "row--" + row.status;
      tr.innerHTML = `
        <td>${row.q}</td>
        <td>${row.userAns ?? "-"}</td>
        <td>${row.correctAns ?? "-"}</td>
        <td>${capitalize(row.status)}</td>
      `;
      frag.appendChild(tr);
    });
    body.appendChild(frag);
  }

  $("filterBar").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    state.currentFilter = btn.dataset.filter;
    renderQuestionTable(state.results.perQuestion, state.currentFilter);
  });

  /* =========================================================
     EXPORT (browser print → "Save as PDF", fully offline)
     ========================================================= */
  $("exportPdfBtn").addEventListener("click", () => {
    window.print();
  });

  /* =========================================================
     RESTART
     ========================================================= */
  $("restartBtn").addEventListener("click", () => {
    if (!confirm("Start a new test? This clears all current answers and the answer key.")) return;
    stopTimer();
    state.timer.secondsLeft = TEST_DURATION_SECONDS;
    updateTimerDisplay();
    state.userAnswers.fill(null);
    state.keyAnswers.fill(null);
    state.missing = new Set();
    state.results = null;
    state.unlocked = new Set(["home"]);
    rawTextPanel.hidden = true;
    keyReviewPanel.hidden = true;
    extractStatus.hidden = true;
    fileNameLabel.textContent = "";
    pdfInput.value = "";
    renderQuestionGrid();
    goToScreen("home");
    showToast("New test started.");
  });

  /* =========================================================
     STEP NAV (allow going back to earlier screens only)
     ========================================================= */
  document.querySelectorAll(".step").forEach((step) => {
    step.addEventListener("click", () => {
      const target = step.dataset.step;
      if (!state.unlocked.has(target)) return; // can't jump ahead to a screen not reached yet
      goToScreen(target);
    });
  });

  /* ---------------- helpers ---------------- */
  function round(n) {
    return Math.round(n * 100) / 100;
  }
  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ---------------- INIT ---------------- */
  $("homeMaxMarks").textContent = TOTAL_QUESTIONS * state.marking.correct;
  updateTimerDisplay();
  renderQuestionGrid();
})();
