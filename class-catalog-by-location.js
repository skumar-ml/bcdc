/*

Purpose: Renders the per-location class catalog on program location pages (Fort Lee, Westchester, Online, Livingston, Glen Rock, etc). Fetches class details for one location from the API, fills in CMS-templated catalog cards with schedule/timing data, and powers the syllabus preview modal.

Brief Logic: Reads the target location's ID from window.CATALOG_LOCATION_ID (set per-page before this script loads), activates the first schedule tab, fetches getClassDetails for that location, matches API rows to existing CMS catalog cards by levelId, fills in times/labels, hides non-matching or wrong-tab cards, and wires up the syllabus modal.

Are there any dependent JS files: No — expects getMemberstackToken/window.BDC_API/bdcFetch from Webflow's site-wide Head code, and window.CATALOG_LOCATION_ID to be set by a small inline script on each location page before this file loads.

*/
(function classCatalogByLocationRenderer() {
  const API_BASE_URL = window.BDC_API.class;
  const LOCATION_ID = window.CATALOG_LOCATION_ID;
  if (!LOCATION_ID) {
    console.error("window.CATALOG_LOCATION_ID must be set before loading class-catalog-by-location.js");
    return;
  }
  const CLASS_DETAILS_ENDPOINT = `getClassDetails?locationId=${LOCATION_ID}`;
  const CARD_CLASS = "fort-lee_catalog-wapper";
  const DETAIL_WRAPPER_SELECTOR = ".class-detail-wrapper";
  const TIME_WRAPPER_CLASS = "fort-lee_time-wapper";
  const SYLLABUS_TRIGGER_CLASS = "fort-lee_syllabus-content-div";

  let cachedApiData = null;
  let syllabusDataLoaded = false;

  const DAY_SELECTOR_MAP = {
    Sunday: [".class-sun"],
    Monday: [".class-mon"],
    Tuesday: [".class-tue"],
    Wednesday: [".class-wed"],
    Thursday: [".class-thu"],
    Friday: [".class-fri"],
    Saturday: [".class-sat"]
  };
  const DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Activate the first schedule tab (same on every location page).
  function activateFirstTab() {
    const tabs = document.querySelectorAll('.schedule_tab-button');
    const panes = document.querySelectorAll('.w-tab-pane');

    if (tabs.length > 0 && panes.length > 0) {
      tabs.forEach((tab) => tab.classList.remove('w--current'));
      panes.forEach((pane) => pane.classList.remove('w--tab-active'));

      tabs[0].classList.add('w--current');
      panes[0].classList.add('w--tab-active');
    }
  }

  // Format API time values for display.
  function normalizeTime(rawTime) {
    if (!rawTime || typeof rawTime !== "string") {
      return "";
    }

    return rawTime.trim().replace(/^0(\d:)/, "$1");
  }

  /**
   * Expect API `day` values as full English weekday names (e.g. "Tuesday").
   * Lowercase key → canonical name used by DAY_ORDER / DAY_SELECTOR_MAP.
   */
  function normalizeDay(dayValue) {
    if (!dayValue || typeof dayValue !== "string") {
      return "";
    }

    const normalized = dayValue.trim().toLowerCase();
    const dayMap = {
      sunday: "Sunday",
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday"
    };

    return dayMap[normalized] || "";
  }

  /** Used for tab bucketing: levelId like "3B" → 3 (grades 9+ vs 5–8 tabs). */
  function getLevelNumber(levelId) {
    if (!levelId || typeof levelId !== "string") {
      return 0;
    }

    const match = levelId.match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  function clearTemplatePlaceholders(cardEl) {
    const timeWrappers = cardEl.querySelectorAll(`.${TIME_WRAPPER_CLASS}`);
    timeWrappers.forEach((wrapper) => {
      const oldRows = wrapper.querySelectorAll("p");
      oldRows.forEach((row) => row.remove());
    });
  }

  /** Safe DOM update — avoids errors if Webflow renames a nested class. */
  function setTextIfFound(rootEl, selector, textValue) {
    const target = rootEl.querySelector(selector);
    if (target) {
      target.textContent = textValue || "";
    }
  }

  // Match class-overview: hide syllabus triggers when API has no syllabus content.
  function applyEmptySyllabusRules(apiData) {
    if (!Array.isArray(apiData)) {
      return;
    }

    apiData.forEach((item) => {
      const isDescriptionEmpty = !Array.isArray(item.description) || item.description.length === 0;
      const isAccomplishmentsEmpty =
        !Array.isArray(item.accomplishments) || item.accomplishments.length === 0;

      if (isDescriptionEmpty && isAccomplishmentsEmpty) {
        const wrappers = document.querySelectorAll(
          `.${CARD_CLASS}[levelid="${CSS.escape(String(item.levelId || ""))}"]`
        );
        wrappers.forEach((wrapper) => {
          wrapper.querySelectorAll(`.${SYLLABUS_TRIGGER_CLASS}`).forEach((div) => {
            div.style.visibility = "hidden";
          });
        });
        console.warn(`Both description and accomplishments are empty for levelId: ${item.levelId}`);
      }
    });
  }

  // Append one time row into a day wrapper.
  function appendTimeRow(dayEl, textValue) {
    const row = document.createElement("p");
    row.className = "fort-lee_time-text";
    row.textContent = textValue;
    dayEl.appendChild(row);
  }

  // Render day-wise timings in the card.
  function renderTimes(cardEl, timings) {
    const normalizedTimings = Array.isArray(timings)
      ? timings
          .map((slot) => ({
            ...slot,
            normalizedDay: normalizeDay(slot.day)
          }))
          .filter((slot) => slot.normalizedDay)
      : [];

    const allTimeWrappers = Array.from(cardEl.querySelectorAll(`.${TIME_WRAPPER_CLASS}`));

    DAY_ORDER.forEach((dayName, dayIndex) => {
      const selectorList = DAY_SELECTOR_MAP[dayName] || [];
      let host = null;

      for (let i = 0; i < selectorList.length; i += 1) {
        const candidate = cardEl.querySelector(selectorList[i]);
        if (!candidate) {
          continue;
        }

        host = candidate.querySelector(`.${TIME_WRAPPER_CLASS}`) || candidate;
        break;
      }

      if (!host && allTimeWrappers[dayIndex]) {
        host = allTimeWrappers[dayIndex];
      }

      if (!host) {
        return;
      }

      const dayItems = normalizedTimings.filter((slot) => slot.normalizedDay === dayName);
      if (dayItems.length === 0) {
        return;
      }

      dayItems.forEach((slot) => {
        const start = normalizeTime(slot.startTime);
        const end = normalizeTime(slot.endTime);
        appendTimeRow(host, `${start}-${end}`);
      });
    });
  }

  // Fill API-driven fields only — prerequisite / suggested grades stay from Webflow CMS.
  function fillCard(cardEl, classItem, locationEntry) {
    const firstTiming = locationEntry.timing[0] || {};
    const firstDay = firstTiming.day || "";

    setTextIfFound(cardEl, ".fort-lee_class-label", classItem.levelName || classItem.levelId || "");
    setTextIfFound(
      cardEl,
      ".fort-lee_schedule-text",
      `Weekly meeting times (${locationEntry.locationName || ""})`
    );
    setTextIfFound(cardEl, ".semester-tab", firstDay ? `First day: ${firstDay}` : "Semester: Fall");

    cardEl.setAttribute("levelid", classItem.levelId || "");
    cardEl.setAttribute("data-level-id", classItem.levelId || "");

    clearTemplatePlaceholders(cardEl);
    renderTimes(cardEl, locationEntry.timing || []);
  }

  function getDetailWrapper(cardEl) {
    return cardEl.closest(DETAIL_WRAPPER_SELECTOR) || cardEl;
  }

  function resolveLevelId(cardEl) {
    const wrapper = getDetailWrapper(cardEl);
    const raw =
      cardEl.getAttribute("levelid") ||
      cardEl.getAttribute("data-level-id") ||
      (wrapper !== cardEl ? wrapper.getAttribute("levelid") : null) ||
      (wrapper !== cardEl ? wrapper.getAttribute("data-level-id") : null);
    return raw != null ? String(raw).trim() : "";
  }

  function getPaneIndex(cardEl, tabPanes) {
    const pane = cardEl.closest(".w-tab-pane");
    if (!pane || tabPanes.length === 0) {
      return -1;
    }
    return tabPanes.indexOf(pane);
  }

  function shouldShowInPane(levelId, paneIndex) {
    if (paneIndex < 0 || paneIndex > 1) {
      return true;
    }
    const n = getLevelNumber(levelId);
    const isNinePlus = n >= 3;
    return paneIndex === 0 ? isNinePlus : !isNinePlus;
  }

  function buildLocationLookup(apiData) {
    const map = new Map();
    extractLocationClasses(apiData).forEach((entry) => {
      const id = entry.classItem.levelId;
      if (id == null || id === "") {
        return;
      }
      map.set(String(id).trim().toLowerCase(), entry);
    });
    return map;
  }

  async function openSyllabusModal(levelId) {
    try {
      const allLevels = cachedApiData;
      if (!syllabusDataLoaded || !cachedApiData) {
        setTimeout(() => openSyllabusModal(levelId), 300);
        return;
      }

      const syllabusData = allLevels.find(
        (item) => String(item.levelId).toLowerCase() === String(levelId).toLowerCase()
      );

      if (!syllabusData) {
        console.warn(`No data found for levelId: ${levelId}`);
        return;
      }

      const registerBtn = document.querySelector(".main-button.white-rounded-button.w-button");
      if (registerBtn && levelId) {
        registerBtn.href = `/programs/level-${String(levelId).toLowerCase()}`;
      }

      const titleEl = document.querySelector(".syllabus-title-text");
      if (titleEl && syllabusData.levelName) {
        titleEl.textContent = syllabusData.levelName;
      }

      const descriptionEl = document.getElementById("syllabus-description-list");
      const accomplishmentsEl = document.getElementById("syllabus-accomplishments-list");

      if (!descriptionEl || !accomplishmentsEl) {
        console.warn("Syllabus modal list elements not found in the DOM.");
        return;
      }

      descriptionEl.innerHTML = "";
      accomplishmentsEl.innerHTML = "";

      if (Array.isArray(syllabusData.description)) {
        const ul = document.createElement("ul");
        syllabusData.description.forEach((item) => {
          const li = document.createElement("li");
          li.textContent = item;
          li.classList.add("DM-Sans");
          ul.appendChild(li);
        });
        descriptionEl.appendChild(ul);
      } else {
        console.warn("No description data or invalid format.");
        descriptionEl.textContent = "No description available.";
      }

      if (Array.isArray(syllabusData.accomplishments)) {
        const ul = document.createElement("ul");
        syllabusData.accomplishments.forEach((item) => {
          const li = document.createElement("li");
          li.textContent = item;
          li.classList.add("DM-Sans");
          ul.appendChild(li);
        });
        accomplishmentsEl.appendChild(ul);
      } else {
        console.warn("No accomplishments data or invalid format.");
        accomplishmentsEl.textContent = "No accomplishments available.";
      }

      const syllabusModal = document.querySelector(".syllabus-modal");
      const syllabusModalBackground = document.querySelector(".syllabus-modal-bg");
      if (syllabusModal) {
        syllabusModal.classList.add("show");
        if (syllabusModalBackground) {
          syllabusModalBackground.setAttribute("aria-hidden", "false");
        }
      }

      const syllabusCloseButton = document.querySelector(".close-link.syllabus");
      if (syllabusModal && syllabusCloseButton) {
        syllabusCloseButton.onclick = function (event) {
          event.preventDefault();
          syllabusModal.classList.remove("show");
          if (syllabusModalBackground) {
            syllabusModalBackground.setAttribute("aria-hidden", "true");
          }
        };
      }
    } catch (err) {
      console.error("Failed to load syllabus:", err);
    }
  }

  function initSyllabusModal() {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest(`.${SYLLABUS_TRIGGER_CLASS}`);
      if (!trigger) {
        return;
      }
      const wrapper = trigger.closest(DETAIL_WRAPPER_SELECTOR);
      const card = trigger.closest(`.${CARD_CLASS}`);
      let levelId = null;
      if (wrapper && wrapper.hasAttribute("levelid")) {
        levelId = wrapper.getAttribute("levelid");
      } else if (card && card.hasAttribute("levelid")) {
        levelId = card.getAttribute("levelid");
      }
      if (levelId) {
        openSyllabusModal(levelId);
      }
    });
  }

  // Function to fetch data from API
  async function fetchData(endpoint) {
    try {
      const response = await bdcFetch(`${API_BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }

  // Map API rows to cards using the first location block (response is pre-filtered by locationId).
  function extractLocationClasses(apiData) {
    if (!Array.isArray(apiData)) {
      return [];
    }

    return apiData
      .map((classItem) => {
        const locations = Array.isArray(classItem.location) ? classItem.location : [];
        const locationEntry = locations[0];
        if (!locationEntry || !Array.isArray(locationEntry.timing) || locationEntry.timing.length === 0) {
          return null;
        }
        return { classItem, locationEntry };
      })
      .filter(Boolean);
  }

  // Walk existing CMS cards only — fill API fields hide rows with no API match.
  async function render() {
    const catalogCards = document.querySelectorAll(`.${CARD_CLASS}`);
    if (!catalogCards.length) {
      console.error(`No .${CARD_CLASS} catalog cards found (CMS collection items).`);
      return;
    }

    try {
      const apiData = await fetchData(CLASS_DETAILS_ENDPOINT);
      cachedApiData = apiData;
      syllabusDataLoaded = true;
      const lookup = buildLocationLookup(apiData);
      const tabPanes = Array.from(document.querySelectorAll(".w-tab-pane"));

      catalogCards.forEach((cardEl) => {
        const wrapper = getDetailWrapper(cardEl);
        const levelKey = resolveLevelId(cardEl).toLowerCase();
        const paneIndex = getPaneIndex(cardEl, tabPanes);

        // Match CMS levelId to API (case-insensitive) missing binding → hide row.
        if (!levelKey) {
          console.warn("Catalog card missing levelid — hiding row.", cardEl);
          wrapper.style.display = "none";
          return;
        }

        const entry = lookup.get(levelKey);
        if (!entry) {
          wrapper.style.display = "none";
          return;
        }

        // Two-tab layout: hide CMS rows that belong in the other grades band.
        if (tabPanes.length >= 2 && !shouldShowInPane(entry.classItem.levelId, paneIndex)) {
          wrapper.style.display = "none";
          return;
        }

        wrapper.style.display = "";
        fillCard(cardEl, entry.classItem, entry.locationEntry);
      });

      applyEmptySyllabusRules(apiData);
    } catch (error) {
      console.error("Failed to render class catalog cards:", error);
    }
  }

  activateFirstTab();
  initSyllabusModal();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
    return;
  }

  render();
})();
