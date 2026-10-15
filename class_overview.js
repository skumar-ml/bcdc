
/*
Renders the semester class listing on the classes overview page.
Loads class details from the API and fills the Grades 5-8 and Grades 9+ tabs
with each level's schedule, register link, and syllabus.
*/

window.addEventListener('load', function() {
  (window.CE_API || (window.CE_API=[])).push(function(){
    CE2.startRecording();
  });
});

//Contact No.Validation >
const DEFAULT_COUNTRY = 'US'
const formatter = new libphonenumber.AsYouType(DEFAULT_COUNTRY)
const phoneInput = document.getElementById('Contact-Number')
if (phoneInput) {
  phoneInput.addEventListener('input', function (event) {
    formatter.reset()
    const newValue = formatter.input(phoneInput.value)
    phoneInput.value = newValue
    if (!libphonenumber.isValidPhoneNumber(newValue, DEFAULT_COUNTRY)) {
      phoneInput.setCustomValidity('Invalid phone number')
    } else {
      phoneInput.setCustomValidity('')
    }
  })
}

// ---------------------------------------------------------------------------
// Tab 1 (Grades 5-8) API-driven renderer
// ---------------------------------------------------------------------------
class classLists {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cachedApiData = null;
    this.dataLoaded = false;

    // Both tabs are now rendered from the API:
    //   Tab 1 = Grades 5-8 (numbered levels 1-2)
    //   Tab 2 = Grades 9+  (numbered levels 3+ and non-numbered tracks like X / customizedtrack)
    this.tab1 = document.querySelector('.tab-pane-tab-1');
    this.tab2 = document.querySelector('.tab-pane-tab-2');

    this.DAY_ORDER = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ];

    // Display order for the non-numbered "9+" tracks (anything not listed
    // sorts after these, alphabetically).
    this.SPECIAL_ORDER = ['x', 'customizedtrack', 'worldschools'];

    this.spinner = this.ensureSpinner();
    this.loaderRow = null;
    this.showCatalogLoader();
    this.renderPortalData();
    // The syllabus modal is shared by both tabs and is powered by the API data,
    // so its click handler stays global (document-level).
    this.initSyllabusModal();
    // Cloned cards miss Webflow's FAQ binding, so delegate the accordion per tab.
    this.initFaqAccordion(this.tab1);
    this.initFaqAccordion(this.tab2);
  }

  // ---- API ---------------------------------------------------------------
  async fetchData(endpoint) {
    try {
      const doFetch = (typeof bdcFetch === 'function') ? bdcFetch : fetch;
      const response = await doFetch(`${this.baseUrl}${endpoint}`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }

  // Show the site spinner under the grade tabs while class data loads.
  ensureSpinner() {
    let spinner = document.getElementById('half-circle-spinner');
    if (spinner) return spinner;

    spinner = document.createElement('div');
    spinner.id = 'half-circle-spinner';
    spinner.className = 'half-circle-spinner';
    spinner.innerHTML = '<div class="circle circle-1"></div><div class="circle circle-2"></div>';
    document.body.appendChild(spinner);
    return spinner;
  }

  getLoaderHost() {
    return (
      document.querySelector('.w-tab-content') ||
      document.querySelector('.tabs-content') ||
      (this.tab1 && this.tab1.parentElement) ||
      this.tab1
    );
  }

  setCatalogCardsHidden(hidden) {
    [this.tab1, this.tab2].forEach((pane) => {
      if (!pane) return;
      pane.querySelectorAll('.class-detail-wrapper').forEach((el) => {
        const row = el.closest('.collection-item') || el;
        row.style.display = hidden ? 'none' : '';
      });
    });
  }

  showCatalogLoader() {
    this.setCatalogCardsHidden(true);

    const host = this.getLoaderHost();
    const spinner = this.spinner || this.ensureSpinner();
    if (!host || !spinner) return;

    if (!this.loaderRow) {
      this.loaderRow = document.createElement('div');
      this.loaderRow.id = 'class-overview-loader';
      this.loaderRow.setAttribute('aria-live', 'polite');
      this.loaderRow.setAttribute('aria-busy', 'true');
      this.loaderRow.style.cssText =
        'width:100%;display:flex;justify-content:center;align-items:center;min-height:140px;padding:32px 0;box-sizing:border-box;';
    }

    this.loaderRow.style.display = 'flex';
    this.loaderRow.appendChild(spinner);
    if (this.loaderRow.parentElement !== host) {
      host.insertBefore(this.loaderRow, host.firstChild);
    }

    // Site CSS parks the spinner as a fixed overlay. Override so it sits
    // inline in the catalog row (full-width, centered).
    spinner.style.display = 'block';
    spinner.style.position = 'relative';
    spinner.style.top = 'auto';
    spinner.style.left = 'auto';
    spinner.style.transform = 'none';
    spinner.style.margin = '0';
  }

  hideCatalogLoader() {
    if (this.loaderRow) {
      this.loaderRow.style.display = 'none';
      this.loaderRow.setAttribute('aria-busy', 'false');
    }
    const spinner = this.spinner || document.getElementById('half-circle-spinner');
    if (spinner) {
      spinner.style.display = 'none';
      spinner.style.position = '';
      spinner.style.top = '';
      spinner.style.left = '';
      spinner.style.transform = '';
      spinner.style.margin = '';
    }
    this.setCatalogCardsHidden(false);
  }

  // ---- Helpers -----------------------------------------------------------

  // "3A" -> 3, "1A" -> 1, "X"/"customizedtrack" -> 0
  getLevelNumber(levelId) {
    const match = String(levelId || '').match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  // Tab 1 = Grades 5-8 = numbered levels 1 and 2 only.
  isGrades58(levelId) {
    const n = this.getLevelNumber(levelId);
    return /\d/.test(String(levelId || '')) && (n === 1 || n === 2);
  }

  // Tab 2 = Grades 9+ = numbered levels 3+ OR non-numbered tracks (X, customizedtrack, ...).
  isGrades9Plus(levelId) {
    const id = String(levelId || '');
    if (!id) return false;
    if (/\d/.test(id)) return this.getLevelNumber(id) >= 3;
    return true; // non-numbered special tracks belong to the 9+ tab
  }

  isUnnumbered(levelId) {
    return !/\d/.test(String(levelId || ''));
  }

  // "04:00PM" -> "4:00", "09:30AM" -> "9:30", "11:30AM" -> "11:30"
  normalizeTime(rawTime) {
    if (!rawTime || typeof rawTime !== 'string') return '';
    return rawTime.trim().replace(/(AM|PM)$/i, '').replace(/^0(\d:)/, '$1');
  }

  // Keep only real class slots (drops placeholders like day "-" / empty times).
  getValidTimings(timing) {
    return (Array.isArray(timing) ? timing : []).filter(
      (t) => t && t.day && t.day !== '-' && t.startTime && t.endTime
    );
  }

  // A level is "individually scheduled" (e.g. Customized Track) when it has no
  // real timings anywhere and is either a non-numbered track or uses the
  // placeholder "None" location.
  hasIndividualSchedule(item) {
    const locs = Array.isArray(item.location) ? item.location : [];
    const anyValid = locs.some((loc) => this.getValidTimings(loc.timing).length > 0);
    if (anyValid) return false;
    const hasNoneLocation = locs.some((loc) => String(loc.locationName).toLowerCase() === 'none');
    return this.isUnnumbered(item.levelId) || hasNoneLocation;
  }

  // Build "Thursday 4:00-6:00<br>Saturday 9:30-11:30" from a timing[] array.
  buildTimingText(timing) {
    const rows = this.getValidTimings(timing);
    rows.sort((a, b) => {
      const da = this.DAY_ORDER.indexOf(a.day);
      const db = this.DAY_ORDER.indexOf(b.day);
      if (da !== db) return da - db;
      return this.normalizeTime(a.startTime).localeCompare(this.normalizeTime(b.startTime));
    });
    return rows
      .map((t) => `${t.day} ${this.normalizeTime(t.startTime)}-${this.normalizeTime(t.endTime)}`)
      .join('<br>');
  }

  sortLevels(levels) {
    const specialIndex = (levelId) => {
      const idx = this.SPECIAL_ORDER.indexOf(String(levelId || '').toLowerCase());
      return idx === -1 ? this.SPECIAL_ORDER.length : idx;
    };

    return [...levels].sort((a, b) => {
      const aU = this.isUnnumbered(a.levelId);
      const bU = this.isUnnumbered(b.levelId);
      // Numbered levels first (1A, 2B, 3C...), non-numbered tracks last.
      if (aU !== bU) return aU ? 1 : -1;

      if (aU && bU) {
        const si = specialIndex(a.levelId) - specialIndex(b.levelId);
        if (si !== 0) return si;
        return String(a.levelId).localeCompare(String(b.levelId), undefined, { sensitivity: 'base' });
      }

      const na = this.getLevelNumber(a.levelId);
      const nb = this.getLevelNumber(b.levelId);
      if (na !== nb) return na - nb;
      return String(a.levelId).localeCompare(String(b.levelId), undefined, {
        numeric: true,
        sensitivity: 'base'
      });
    });
  }

  // Description strings from the API can include an anchor, e.g.
  //   ...on the calendar <a href="https://www.bergendebate.com/class-schedule">here</a>.
  fillRichText(el, raw) {
    const text = String(raw ?? '');
    if (!/<a\b/i.test(text)) {
      el.textContent = text;
      return;
    }

    el.innerHTML = text;
    el.querySelectorAll('a').forEach((link) => link.classList.add('any-link'));
  }

  // Fill a syllabus list and its preceding .description-header.
  // An empty section (for example accomplishments: []) hides both.
  fillSyllabusSection(listEl, items) {
    const header = listEl.previousElementSibling;
    const hasItems = Array.isArray(items) && items.some((item) => String(item || '').trim());

    listEl.innerHTML = '';
    listEl.style.display = hasItems ? '' : 'none';
    if (header && header.classList.contains('description-header')) {
      header.style.display = hasItems ? '' : 'none';
    }
    if (!hasItems) return;

    const ul = document.createElement('ul');
    items.forEach((item) => {
      if (!String(item || '').trim()) return;
      const li = document.createElement('li');
      this.fillRichText(li, item);
      li.classList.add('DM-Sans');
      ul.appendChild(li);
    });
    listEl.appendChild(ul);
  }

  // ---- Card population ---------------------------------------------------
  fillCard(card, item) {
    const levelId = item.levelId || '';

    // Tag the card + register links + timing slots with the levelId.
    card.setAttribute('levelId', levelId);

    // Level name
    const levelNameEl = card.querySelector('.class-level-text');
    if (levelNameEl) levelNameEl.textContent = item.levelName || levelId;

    // Fill Prerequisite and Suggested Grades on desktop and mobile.
    card.querySelectorAll('.class-prerequisite, .class-detail-header-text').forEach((block) => {
      const cells = block.querySelectorAll('.class-header-text');
      if (cells.length < 2) return;
      const label = (cells[0].textContent || '').toLowerCase();
      let value = null;
      if (label.includes('prereq')) value = item.prerequisites || '';
      else if (label.includes('suggest') || label.includes('grade')) value = item.suggestGrade || item.suggest_grade || '';
      if (value === null) return;
      for (let i = 1; i < cells.length; i++) cells[i].textContent = value;
    });

    // Register links
    const registerUrl = item.registerLink || `/programs/level-${String(levelId).toLowerCase()}`;
    card.querySelectorAll('a.main-button').forEach((btn) => {
      btn.setAttribute('href', registerUrl);
      btn.setAttribute('levelId', levelId);
    });

    // Fill each location's times from the API, and hide locations with no classes.
    const locations = Array.isArray(item.location) ? item.location : [];

    // Tracks with no fixed times show a note instead of a schedule.
    if (this.hasIndividualSchedule(item)) {
      card.querySelectorAll('.location-dropdown-day-time').forEach((slot) => {
        slot.setAttribute('levelId', levelId);
        slot.innerHTML = '';
        const column = slot.closest('[class*="location-detail-"]') || slot.parentElement;
        if (column) column.style.display = 'none';
      });

      const body = card.querySelector('.faq-body-with-padding') || card.querySelector('.class-detail-faq-body');
      if (body && !body.querySelector('.customized-track-message')) {
        const msg = document.createElement('div');
        msg.className = 'customized-track-message font-400';
        msg.style.margin = '10px 0';
        msg.textContent = 'Days and times scheduled individually after registration.';
        body.appendChild(msg);
      }
    } else {
      card.querySelectorAll('.location-dropdown-day-time').forEach((slot) => {
        slot.setAttribute('levelId', levelId);
        const locationName = slot.getAttribute('location');
        const match = locations.find((loc) => loc.locationName === locationName);
        const column = slot.closest('[class*="location-detail-"]') || slot.parentElement;

        if (match && Array.isArray(match.timing) && this.getValidTimings(match.timing).length > 0) {
          slot.innerHTML = this.buildTimingText(match.timing);
          slot.style.opacity = '1';
          if (column) column.style.display = '';
        } else {
          // No classes at this location for this level -> hide the whole column.
          slot.innerHTML = '';
          if (column) column.style.display = 'none';
        }
      });
    }

    // Hide the "View Syllabus" trigger when there is nothing to show.
    const descEmpty = !Array.isArray(item.description) || item.description.length === 0;
    const accEmpty = !Array.isArray(item.accomplishments) || item.accomplishments.length === 0;
    if (descEmpty && accEmpty) {
      card.querySelectorAll('.syllabus-content-div').forEach((div) => {
        div.style.visibility = 'hidden';
      });
    }
  }

  // Clone a pane's template .class-detail-wrapper once per matching API level.
  // `filterFn(levelId)` decides which levels belong in this pane.
  renderPane(pane, paneLabel, filterFn, classData) {
    if (!pane) {
      console.error(`${paneLabel} pane not found; skipping render.`);
      return;
    }

    const templates = Array.from(pane.querySelectorAll('.class-detail-wrapper'));
    if (templates.length === 0) {
      console.error(`No .class-detail-wrapper template found inside ${paneLabel}.`);
      return;
    }

    const template = templates[0];
    const container = template.parentElement;

    const levels = this.sortLevels(
      (Array.isArray(classData) ? classData : []).filter((item) => filterFn(item.levelId))
    );

    levels.forEach((item) => {
      const clone = template.cloneNode(true);
      clone.style.display = '';
      this.fillCard(clone, item);
      container.appendChild(clone);
    });

    // Remove the original template(s) so only API-rendered cards remain.
    templates.forEach((tpl) => tpl.remove());

    // Hide any leftover Webflow empty-state placeholders in this pane.
    pane.querySelectorAll('.w-dyn-empty').forEach((el) => {
      el.style.display = 'none';
    });
  }

  async renderPortalData() {
    try {
      this.showCatalogLoader();

      const data = await this.fetchData('getClassDetails?levelId=');
      // Cache the full response (all levels) for the shared syllabus modal.
      this.cachedApiData = data;
      this.dataLoaded = true;

      // Tab 1 = Grades 5-8, Tab 2 = Grades 9+ (incl. non-numbered tracks).
      this.renderPane(this.tab1, '.tab-pane-tab-1', (id) => this.isGrades58(id), data);
      this.renderPane(this.tab2, '.tab-pane-tab-2', (id) => this.isGrades9Plus(id), data);
    } catch (error) {
      console.error('Error rendering class data:', error);
    } finally {
      this.hideCatalogLoader();
    }
  }

  // ---- Syllabus modal (shared by both tabs, powered by the API) ----------
  async openSyllabusModal(levelId) {
    try {
      if (!this.dataLoaded || !this.cachedApiData) {
        setTimeout(() => this.openSyllabusModal(levelId), 300); // retry after data loads
        return;
      }

      const syllabusData = this.cachedApiData.find(
        (item) => String(item.levelId).toLowerCase() === String(levelId).toLowerCase()
      );

      if (!syllabusData) {
        console.warn(`No data found for levelId: ${levelId}`);
        return;
      }

      // Update Register Now button href
      const registerBtn = document.querySelector('.main-button.white-rounded-button.w-button');
      if (registerBtn && levelId) {
        registerBtn.href = `/programs/level-${String(levelId).toLowerCase()}`;
      }

      // Update modal title with levelName
      const titleEl = document.querySelector('.syllabus-title-text');
      if (titleEl && syllabusData.levelName) {
        titleEl.textContent = syllabusData.levelName;
      }

      const descriptionEl = document.getElementById('syllabus-description-list');
      const accomplishmentsEl = document.getElementById('syllabus-accomplishments-list');
      if (!descriptionEl || !accomplishmentsEl) {
        console.warn('Syllabus modal list elements not found in the DOM.');
        return;
      }

      this.fillSyllabusSection(descriptionEl, syllabusData.description);
      this.fillSyllabusSection(accomplishmentsEl, syllabusData.accomplishments);

      // --- Show the modal ---
      const syllabusModal = document.querySelector('.syllabus-modal');
      const syllabusModalBackground = document.querySelector('.syllabus-modal-bg');
      if (syllabusModal) {
        syllabusModal.classList.add('show');
        if (syllabusModalBackground) {
          syllabusModalBackground.setAttribute('aria-hidden', 'false');
        }
      }

      // --- Close handler ---
      const syllabusCloseButton = document.querySelector('.close-link.syllabus');
      if (syllabusModal && syllabusCloseButton) {
        syllabusCloseButton.onclick = function (event) {
          event.preventDefault();
          syllabusModal.classList.remove('show');
          if (syllabusModalBackground) {
            syllabusModalBackground.setAttribute('aria-hidden', 'true');
          }
        };
      }
    } catch (err) {
      console.error('Failed to load syllabus:', err);
    }
  }

  initSyllabusModal() {
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('.syllabus-content-div');
      if (!trigger) return;
      const wrapper = trigger.closest('.class-detail-wrapper');
      if (wrapper && wrapper.hasAttribute('levelid')) {
        const levelId = wrapper.getAttribute('levelid');
        this.openSyllabusModal(levelId);
      }
    });
  }

  // FAQ accordion: one item open at a time, scoped to each grade tab.
  closeFaqItem(item) {
    item.classList.remove('open');
    const body = item.querySelector('.class-detail-faq-body');
    if (body) body.style.maxHeight = '0';
    const parent = item.closest('.collection-item.w-dyn-item') || item.closest('.class-detail-wrapper');
    if (parent) {
      parent.style.borderBottom = '1px solid rgba(116, 65, 65, 0.5)';
      parent.style.marginBottom = '0';
    }
  }

  initFaqAccordion(pane) {
    if (!pane) return;

    pane.addEventListener('click', (event) => {
      const header = event.target.closest('.class-detail-faq-header');
      if (!header || !pane.contains(header)) return;

      const item = header.closest('.class-detail-faq-item');
      if (!item) return;

      const wasOpen = item.classList.contains('open');

      // Close every open item in this pane (one-open-at-a-time behaviour).
      pane.querySelectorAll('.class-detail-faq-item.open').forEach((openItem) => {
        this.closeFaqItem(openItem);
      });

      if (wasOpen) return; // clicking an open item just closes it

      // Open the clicked item.
      item.classList.add('open');
      const body = item.querySelector('.class-detail-faq-body');
      if (body) body.style.maxHeight = body.scrollHeight + 'px';
      const parent = item.closest('.collection-item.w-dyn-item') || item.closest('.class-detail-wrapper');
      if (parent) {
        parent.style.borderBottom = 'unset';
        parent.style.marginBottom = '10px';
      }
    });
  }
}

// Instantiate the classLists with API base URL
const apiBaseUrl = window.BDC_API.class;
(function () {
  new classLists(apiBaseUrl);
})();

