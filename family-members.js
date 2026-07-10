/*

Purpose: Manages the family members list on the member portal - loading, creating, and editing parent/student accounts linked to a member.

Brief Logic: Fetches family members from the API and renders them into a list, opens create/edit modals for parent or student accounts, validates and submits form data to add or update family members, and handles DOB field masking/calendar pickers.

Are there any dependent JS files: No

*/
document.addEventListener("DOMContentLoaded", async () => {
  const FAMILY_MEMBERS_API_BASE = window.BDC_API.member;

  window.familyMembersList = [];
  window.editingMemberRecord = null;

  const container =
    document.getElementById("family-members-list") ||
    document.querySelector(".member-container");

  if (!container) {
    console.error("Container #family-members-list / .member-container not found");
    return;
  }

  const template = container.querySelector(".member-card-template");
  if (!template) {
    console.error("Template .member-card-template not found inside container");
    return;
  }

  const templateClone = template.cloneNode(true);
  template.remove();

  const memberModal = document.getElementById("member-modal");
  const memberEditModal = document.getElementById("member-edit-modal");
  const parentFormRoot =
    document.getElementById("member-parent-form") ||
    document.querySelector(".member-parent-form") ||
    document.querySelector(".parent-member-field");
  const parentForm =
    parentFormRoot?.querySelector("form") || parentFormRoot;
  const studentFormRoot =
    document.getElementById("member-student-form") ||
    document.querySelector(".member-student-form") ||
    document.querySelector(".student-member-field");
  const studentForm =
    studentFormRoot?.querySelector("form") || studentFormRoot;

  const log = (...args) => console.log("[members]", ...args);

  let openModalCount = 0;

  const lockBodyScroll = () => {
    openModalCount += 1;
    document.body.style.setProperty("overflow", "hidden", "important");
  };

  const unlockBodyScroll = () => {
    openModalCount = Math.max(0, openModalCount - 1);
    if (openModalCount === 0) {
      document.body.style.removeProperty("overflow");
    }
  };

  const isNarrowViewport = () => window.matchMedia("(max-width: 991px)").matches;

  const setModalContainerScroll = (modal, enabled) => {
    if (!modal) return;
    const container = modal.querySelector(".member-modal-container");
    if (!container) return;

    if (enabled && isNarrowViewport()) {
      container.style.setProperty("overflow-y", "scroll");
    } else {
      container.style.removeProperty("overflow-y");
    }
  };

  const openMemberModal = (modal) => {
    if (!modal) return;
    modal.style.setProperty("display", "block", "important");
    setModalContainerScroll(modal, true);
    lockBodyScroll();
  };

  const getMemberId = (member) => member?.id || member?.memberId || "";

  const findEditButton = (row) => {
    const editBtn =
      row.querySelector(".member-edit-btn") ||
      row.querySelector(".white-button-style") ||
      row.querySelector(".edit-member");

    if (editBtn) return editBtn;

    return (
      Array.from(row.querySelectorAll("a, button")).find((el) => {
        return (el.textContent || "").trim().toLowerCase() === "edit";
      }) || null
    );
  };

  const getWebflowMemberId = () => {
    try {
      const memberstack = localStorage.getItem("memberstack");
      if (!memberstack) return null;

      const memberstackData = JSON.parse(memberstack);
      return window.globalMemberId || memberstackData?.information?.id || null;
    } catch (error) {
      console.error("Failed to read memberstack data", error);
      return null;
    }
  };

  const WEBFLOW_FIELD_IDS = {
    student_grade: "Student-Grade",
    student_gender: "Student-Gender",
    student_school: "Student-School",
  };

  const FIELD_NAME_ALIASES = {
    student_school: ["student_school", "school"],
    student_grade: ["student_grade", "grade"],
    student_gender: ["student_gender", "gender"],
  };

  const findFormFields = (name, formRoot) => {
    if (!formRoot) return [];

    const names = FIELD_NAME_ALIASES[name] || [name];
    const fields = [];

    names.forEach((fieldName) => {
      formRoot.querySelectorAll(`[name="${fieldName}"]`).forEach((field) => {
        if (!fields.includes(field)) fields.push(field);
      });

      const byNameId = formRoot.querySelector(`#${fieldName}`);
      if (byNameId && !fields.includes(byNameId)) fields.push(byNameId);
    });

    const webflowId = WEBFLOW_FIELD_IDS[name];
    if (webflowId) {
      const byWebflowId = formRoot.querySelector(`#${webflowId}`);
      if (byWebflowId && !fields.includes(byWebflowId)) fields.push(byWebflowId);
    }

    return fields;
  };

  const setFieldValue = (field, value) => {
    const normalizedValue = (value ?? "").toString().trim();

    if (field.tagName === "SELECT") {
      if (!normalizedValue) {
        field.value = "";
      } else {
        const matchedOption = Array.from(field.options).find((option) => {
          const optionValue = (option.value || "").trim();
          const optionText = (option.textContent || "").trim();
          return (
            optionValue.toLowerCase() === normalizedValue.toLowerCase() ||
            optionText.toLowerCase() === normalizedValue.toLowerCase()
          );
        });

        field.value = matchedOption ? matchedOption.value : normalizedValue;
      }
    } else {
      field.value = normalizedValue;
    }

    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const setFormValue = (name, value, formRoot) => {
    if (!formRoot) {
      console.warn("[members] setFormValue: form root not found for", name);
      return;
    }

    const fields = findFormFields(name, formRoot);

    if (!fields.length) {
      console.warn("[members] setFormValue: field not found", name, formRoot);
      return;
    }

    fields.forEach((field) => setFieldValue(field, value));
  };

  const getFormValue = (name, formRoot) => {
    if (formRoot) {
      const fields = findFormFields(name, formRoot);
      if (!fields.length) return "";

      const field =
        fields.find((f) => f.offsetParent !== null && f.value?.trim()) ||
        fields.find((f) => f.value?.trim()) ||
        fields.find((f) => f.offsetParent !== null) ||
        fields[0];
      return field?.value?.trim() || "";
    }

    const field =
      document.querySelector(`[name="${name}"]`) ||
      document.getElementById(name);
    return field?.value?.trim() || "";
  };

  const splitMemberName = (name) => {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { firstName: "", lastName: "" };
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
    };
  };

  const formatDobForInput = (value) => {
    if (!value) return "";

    const trimmed = value.trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return `${isoMatch[2]}-${isoMatch[3]}-${isoMatch[1]}`;

    return trimmed;
  };

  const getDobWrapper = (field) =>
    field.closest("[data-student='dob']") ||
    field.closest(".date-field") ||
    field.parentElement;

  const mmddyyyyToISO = (mmddyyyy) => {
    const match = (mmddyyyy || "").match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) return "";
    const [, mm, dd, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  };

  const syncNativeDateFromText = (textField) => {
    const wrapper = getDobWrapper(textField);
    const nativeField = wrapper?.querySelector(".native-date");
    if (!nativeField) return;

    nativeField.value = mmddyyyyToISO(textField.value.trim());
  };

  const syncTextDateFromNative = (nativeField) => {
    const wrapper = getDobWrapper(nativeField);
    const textField =
      wrapper?.querySelector(".text-date") ||
      wrapper?.querySelector("#dob, [name='dob']");
    if (!textField || !nativeField.value) return;

    const [yyyy, mm, dd] = nativeField.value.split("-");
    textField.value = `${mm}-${dd}-${yyyy}`;
    textField.dispatchEvent(new Event("input", { bubbles: true }));
    textField.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const initDobField = (dob) => {
    if (!dob || dob.dataset.dobMaskInit === "true") return;

    dob.dataset.dobMaskInit = "true";
    dob.setAttribute("maxlength", "10");
    dob.setAttribute("placeholder", "MM-DD-YYYY");

    dob.addEventListener("input", function () {
      let value = this.value.replace(/\D/g, "");
      if (value.length > 8) {
        value = value.substring(0, 8);
      }
      if (value.length > 4) {
        value =
          value.substring(0, 2) +
          "-" +
          value.substring(2, 4) +
          "-" +
          value.substring(4);
      } else if (value.length > 2) {
        value = value.substring(0, 2) + "-" + value.substring(2);
      }

      this.value = value;
      syncNativeDateFromText(this);
    });
  };

  const handleOpenCalendarClick = (e) => {
    const btn = e.target.closest(".open-calendar");
    if (!btn) return;

    const wrapper = getDobWrapper(btn);
    const nativeField = wrapper?.querySelector(".native-date");
    if (!nativeField) return;

    e.preventDefault();
    nativeField.focus();

    if (typeof nativeField.showPicker === "function") {
      nativeField.showPicker();
    } else {
      nativeField.click();
    }

    nativeField.addEventListener(
      "change",
      () => syncTextDateFromNative(nativeField),
      { once: true },
    );
  };

  const initDobCalendars = () => {
    [memberModal, memberEditModal].forEach((modal) => {
      modal?.addEventListener("click", handleOpenCalendarClick);
    });
  };
  const initDobFields = () => {
    const dobFields = new Set();

    document.querySelectorAll("#dob, [name='dob']").forEach((field) => {
      dobFields.add(field);
    });

    [memberModal, memberEditModal, studentFormRoot].forEach((root) => {
      root
        ?.querySelectorAll("#dob, [name='dob']")
        .forEach((field) => dobFields.add(field));
    });

    dobFields.forEach(initDobField);
    log("DOB fields initialized", dobFields.size);
  };

  const formatCreatedDate = (createdOn) => {
    if (!createdOn) return "-";

    const date = new Date(createdOn);
    if (Number.isNaN(date.getTime())) return "-";

    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  const getFormElement = (formRoot) => {
    if (!formRoot) return null;
    if (formRoot.tagName === "FORM") return formRoot;
    return formRoot.querySelector("form");
  };

  const BADGE_CLASSES = ["badge-parent", "badge-student", "badge-account-info"];

  const getBadgeState = (member) => {
    const role = (member.role || "").toLowerCase();

    if (role === "parent") {
      return { class: "badge-parent", text: "Parent" };
    }
    if (role === "student") {
      return { class: "badge-student", text: "Student" };
    }
    return {
      class: "badge-account-info",
      text: "Account not created yet",
    };
  };

  const updateBadge = (badgeEl, member) => {
    if (!badgeEl) return;

    const { class: badgeClass, text: badgeText } = getBadgeState(member);

    badgeEl.classList.remove(...BADGE_CLASSES);
    badgeEl.classList.add(badgeClass);
    badgeEl.textContent = badgeText;
  };

  const hasAccount = (member) => {
    const role = (member.role || "").toLowerCase();
    return role === "parent" || role === "student";
  };

  const renderMemberRow = (member) => {
    const row = templateClone.cloneNode(true);
    row.classList.remove("member-card-template");

    const nameEl = row.querySelector(".member-text");
    if (nameEl) nameEl.textContent = member.name || "—";

    const badgeEl =
      row.querySelector(".member-badge") ||
      row.querySelector(
        ".member-name-wrapper .badge-parent, .member-name-wrapper .badge-student, .member-name-wrapper .badge-account-info",
      );
    updateBadge(badgeEl, member);

    const textEls = row.querySelectorAll(".dm-sans");
    if (textEls[0]) textEls[0].textContent = member.email || "";
    if (textEls[1]) {
      textEls[1].textContent = hasAccount(member)
        ? `Created on: ${formatCreatedDate(member.createdOn)}`
        : "Account not created yet";
    }

    const editBtn = findEditButton(row);
    if (editBtn) {
      editBtn.setAttribute("data-fm-user-id", getMemberId(member));
      log("Edit button rendered", {
        dataFmUserId: getMemberId(member),
        name: member.name,
      });
    } else {
      console.warn("[members] Edit button not found in member row template");
    }

    return row;
  };

  const loadFamilyMembers = async (webflowMemberId) => {
    const response = await bdcFetch(
      `${FAMILY_MEMBERS_API_BASE}/getFamilyMembers/${webflowMemberId}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch family members");
    }

    const data = await response.json();
    const members = Array.isArray(data?.members) ? data.members : [];
    window.familyMembersList = members;

    log("Family members stored in window.familyMembersList", members);

    container.innerHTML = "";

    if (!members.length) {
      const emptyEl = document.createElement("p");
      emptyEl.className = "dm-sans";
      emptyEl.textContent = "No family members found.";
      container.appendChild(emptyEl);
      return;
    }

    const fragment = document.createDocumentFragment();
    members.forEach((member) => {
      fragment.appendChild(renderMemberRow(member));
    });
    container.appendChild(fragment);
  };

  const buildParentPayload = (memberId, form) => ({
    memberId,
    accountType: "parent",
    firstName: getFormValue("first_name", form),
    lastName: getFormValue("last_name", form),
    emailId: getFormValue("email", form),
    parentPhoneNumber: getFormValue("parent_phone_number", form),
    doUpdate: false,
    external_sync: false,
    provision_external: false,
    force_insert: true,
  });

  const buildStudentPayload = (memberId, form) => ({
    memberId,
    accountType: "student",
    firstName: getFormValue("first_name", form),
    lastName: getFormValue("last_name", form),
    studentEmail: getFormValue("email", form),
    studentGrade: getFormValue("student_grade", form),
    school: getFormValue("student_school", form),
    gender: getFormValue("student_gender", form),
    dob: getFormValue("dob", form),
    source: "family-members-portal",
    doUpdate: false,
    external_sync: false,
    provision_external: false,
    force_insert: true,
  });

  const buildParentUpdatePayload = (formRoot) => {
    const firstName = getFormValue("first_name", formRoot);
    const lastName = getFormValue("last_name", formRoot);
    const fullName = `${firstName} ${lastName}`.trim();

    return {
      record_id: getMemberId(window.editingMemberRecord),
      parentEmail: getFormValue("email", formRoot),
      parentName: fullName,
      parentFirstName: firstName,
      parentLastName: lastName,
      parentPhoneNumber: getFormValue("parent_phone_number", formRoot),
      accountType: "parent",
      external_sync: false,
      doUpdate: true,
      signUpRef: "manual_update",
    };
  };

  const buildStudentUpdatePayload = (formRoot) => {
    const firstName = getFormValue("first_name", formRoot);
    const lastName = getFormValue("last_name", formRoot);
    const fullName = `${firstName} ${lastName}`.trim();

    return {
      record_id: getMemberId(window.editingMemberRecord),
      studentName: fullName,
      studentFirstName: firstName,
      studentLastName: lastName,
      studentEmail: getFormValue("email", formRoot),
      studentGrade: getFormValue("student_grade", formRoot),
      school: getFormValue("student_school", formRoot),
      gender: getFormValue("student_gender", formRoot),
      dob: getFormValue("dob", formRoot),
      accountType: "student",
      doUpdate: true,
      external_sync: false,
    };
  };

  const toFormUrlEncoded = (payload) => {
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    return params.toString();
  };

  const messageHideTimers = new WeakMap();

  const hideMessageAfterDelay = (el, delayMs = 6000) => {
    if (!el) return;

    const existingTimer = messageHideTimers.get(el);
    if (existingTimer) clearTimeout(existingTimer);

    const timerId = setTimeout(() => {
      el.style.setProperty("display", "none", "important");
      messageHideTimers.delete(el);
    }, delayMs);

    messageHideTimers.set(el, timerId);
  };

  const toggleMessage = (successEl, errorEl, message, isSuccess) => {
    if (successEl) {
      successEl.style.setProperty(
        "display",
        isSuccess ? "block" : "none",
        "important",
      );
      if (isSuccess) {
        successEl.textContent = message;
        if (message) hideMessageAfterDelay(successEl);
      }
    }
    if (errorEl) {
      errorEl.style.setProperty(
        "display",
        isSuccess ? "none" : "block",
        "important",
      );
      if (!isSuccess) {
        errorEl.textContent = message;
        if (message) hideMessageAfterDelay(errorEl);
      }
    }
  };

  const FIELD_LABELS = {
    first_name: "First name",
    last_name: "Last name",
    email: "Email",
  };

  // Email Validation
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email);
  }

  const validateRequiredFields = (formRoot, requiredFields) => {
    const missing = requiredFields.filter(
      (field) => !getFormValue(field, formRoot),
    );

    if (!missing.length) return null;

    const labels = missing.map((field) => FIELD_LABELS[field] || field);
    if (labels.length === 1) {
      return `${labels[0]} is required.`;
    }

    return `Please fill in required fields: ${labels.join(", ")}.`;
  };

  const validateMemberForm = (formRoot, requiredFields) => {
    const requiredError = validateRequiredFields(formRoot, requiredFields);
    if (requiredError) return requiredError;

    const email = getFormValue("email", formRoot);
    if (email && !isValidEmail(email)) {
      return "Please enter a valid email address.";
    }

    return null;
  };

  const getTabPaneByRole = (modalRoot, role) => {
    const tabPanes = modalRoot?.querySelectorAll(".w-tab-pane");
    if (!tabPanes?.length) return null;

    return (role || "").toLowerCase() === "parent"
      ? tabPanes[0]
      : tabPanes[1] || tabPanes[tabPanes.length - 1];
  };

  const getFormRootForRole = (modalRoot, role) => {
    return getTabPaneByRole(modalRoot, role);
  };

  const getCreateFormRoot = (modalRoot, role, btn) => {
    const formRoot = getFormRootForRole(modalRoot, role);
    if (formRoot) return formRoot;

    const tabPane = btn?.closest(".w-tab-pane");
    if (tabPane) {
      return tabPane.querySelector("form") || tabPane;
    }

    return btn?.closest("form") || null;
  };

  const getMessageElements = (formRoot, btn) => {
    const tabPane = btn?.closest(".w-tab-pane");

    return {
      successEl:
        formRoot?.querySelector(".success-message") ||
        tabPane?.querySelector(".success-message") ||
        btn?.closest(".w-tab-pane")?.querySelector(".success-message"),
      errorEl:
        formRoot?.querySelector(".error-message") ||
        tabPane?.querySelector(".error-message") ||
        btn?.closest(".w-tab-pane")?.querySelector(".error-message"),
    };
  };

  const getParentFormRoot = (modalRoot) => getFormRootForRole(modalRoot, "parent");

  const getStudentFormRootInModal = (modalRoot) =>
    getFormRootForRole(modalRoot, "student");

  const getEditTabContainer = () =>
    memberEditModal?.querySelector(".member_tab-container") ||
    memberEditModal?.querySelector(".w-tabs");

  const resetEditModalTabs = () => {
    const tabContainer = getEditTabContainer();
    if (!tabContainer) return;

    tabContainer
      .querySelectorAll(".w-tab-link, .schedule_tab-button")
      .forEach((tab) => {
        tab.style.pointerEvents = "auto";
        tab.style.opacity = "1";
        tab.classList.remove("disabled-tab");
        tab.setAttribute("aria-disabled", "false");
      });
  };

  const setEditModalTabAccess = (role) => {
    const tabContainer = getEditTabContainer();
    if (!tabContainer) return;

    const tabButtons = tabContainer.querySelectorAll(
      ".w-tab-link, .schedule_tab-button",
    );
    const parentTab = tabButtons[0];
    const studentTab = tabButtons[1];
    const isParent = (role || "").toLowerCase() === "parent";

    if (parentTab) {
      parentTab.style.pointerEvents = isParent ? "auto" : "none";
      parentTab.style.opacity = isParent ? "1" : "0.5";
      parentTab.classList.toggle("disabled-tab", !isParent);
      parentTab.setAttribute("aria-disabled", isParent ? "false" : "true");
    }

    if (studentTab) {
      studentTab.style.pointerEvents = isParent ? "none" : "auto";
      studentTab.style.opacity = isParent ? "0.5" : "1";
      studentTab.classList.toggle("disabled-tab", isParent);
      studentTab.setAttribute("aria-disabled", isParent ? "true" : "false");
    }

    log("Edit modal tab access updated", { role, isParent });
  };

  const activateEditModalTab = (accountType) => {
    const tabContainer = getEditTabContainer();
    if (!tabContainer) return;

    const tabButtons = tabContainer.querySelectorAll(
      ".w-tab-link, .schedule_tab-button",
    );
    const tabIndex = (accountType || "").toLowerCase() === "parent" ? 0 : 1;

    if (tabButtons[tabIndex]) {
      tabButtons[tabIndex].click();
    }
  };

  const prefillParentForm = (member, formRoot) => {
    const firstName =
      member.firstName || member.first_name || splitMemberName(member.name).firstName;
    const lastName =
      member.lastName || member.last_name || splitMemberName(member.name).lastName;

    log("Prefilling parent form", { member, formRoot, firstName, lastName });

    setFormValue("first_name", firstName, formRoot);
    setFormValue("last_name", lastName, formRoot);
    setFormValue(
      "email",
      member.email || member.emailId || member.email_id || "",
      formRoot,
    );
    setFormValue(
      "parent_phone_number",
      member.parentPhoneNumber ||
        member.parent_phone_number ||
        member.phone ||
        "",
      formRoot,
    );
  };

  const prefillStudentForm = (member, formRoot) => {
    const root =
      formRoot ||
      getStudentFormRootInModal(memberEditModal) ||
      memberEditModal;

    const { firstName, lastName } = member.firstName
      ? { firstName: member.firstName, lastName: member.lastName || "" }
      : splitMemberName(member.name);

    const grade = member.studentGrade || member.grade || "";
    const school = member.school || member.studentSchool || "";
    const gender = member.gender || member.studentGender || "";

    log("Prefilling student form", {
      member,
      formRoot: root,
      grade,
      school,
      gender,
    });

    setFormValue("first_name", firstName, root);
    setFormValue("last_name", lastName, root);
    setFormValue(
      "email",
      member.email || member.studentEmail || member.emailId || "",
      root,
    );
    setFormValue("student_grade", grade, root);
    setFormValue("student_school", school, root);
    setFormValue("student_gender", gender, root);
    setFormValue(
      "dob",
      formatDobForInput(member.dob || member.dateOfBirth || ""),
      root,
    );
  };

  const getEditFormRoot = (role, btn) => {
    const formRoot = getFormRootForRole(memberEditModal, role);
    if (formRoot) return formRoot;

    return btn?.closest(".w-tab-pane") || btn?.closest("form") || null;
  };

  const openEditMemberModal = (member) => {
    if (!memberEditModal) {
      console.error("[members] #member-edit-modal not found");
      return;
    }

    const role = (member.role || member.accountType || "").toLowerCase();
    window.editingMemberRecord = member;

    memberEditModal.style.setProperty("display", "block", "important");
    setModalContainerScroll(memberEditModal, true);
    lockBodyScroll();

    resetEditModalTabs();
    setEditModalTabAccess(role);
    activateEditModalTab(role);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (role === "parent") {
          const formRoot = getParentFormRoot(memberEditModal);
          log("Opening edit modal for parent", { member, formRoot });
          prefillParentForm(member, formRoot);
        } else if (role === "student") {
          const formRoot = getStudentFormRootInModal(memberEditModal);
          log("Opening edit modal for student", { member, formRoot });
          prefillStudentForm(member, formRoot);
        } else {
          log("Unknown member role for edit", role);
        }
      });
    });
  };

  const handleEditClick = (e) => {
    const editBtn = e.target.closest("[data-fm-user-id]");
    if (!editBtn) return;

    e.preventDefault();

    const userId = editBtn.getAttribute("data-fm-user-id");
    log("Edit clicked", { userId });

    const member = window.familyMembersList.find(
      (item) => String(getMemberId(item)) === String(userId),
    );

    if (!member) {
      console.error("[members] Member not found in familyMembersList", {
        userId,
        familyMembersList: window.familyMembersList,
      });
      return;
    }

    openEditMemberModal(member);
  };

  container.addEventListener("click", handleEditClick);

  try {
    const webflowMemberId = getWebflowMemberId();
    if (!webflowMemberId) {
      console.error("Member ID not found");
    } else {
      await loadFamilyMembers(webflowMemberId);
    }
  } catch (error) {
    console.error("Failed to load family members", error);
  }

  const addMemberBtn = document.getElementById("add-member");
  if (addMemberBtn && memberModal) {
    addMemberBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openMemberModal(memberModal);
    });
  }

  const closeMemberModals = () => {
    if (memberModal) {
      memberModal.style.setProperty("display", "none", "important");
      setModalContainerScroll(memberModal, false);
    }

    const editModal = document.getElementById("member-edit-modal") || memberEditModal;
    if (editModal) {
      editModal.style.setProperty("display", "none", "important");
      setModalContainerScroll(editModal, false);
      resetEditModalTabs();
    }

    window.editingMemberRecord = null;
    openModalCount = 0;
    document.body.style.removeProperty("overflow");
  };

  const memberCloseLinks = new Set([
    ...document.querySelectorAll(".member-close-link-text"),
    ...document.querySelectorAll("#member-edit-modal-close"),
  ]);

  memberCloseLinks.forEach((closeLink) => {
    closeLink.addEventListener("click", (e) => {
      e.preventDefault();
      closeMemberModals();
    });
  });

  const submitFamilyMember = async (
    btn,
    formRoot,
    buildPayload,
    requiredFields = [],
  ) => {
    const webflowMemberId = getWebflowMemberId();
    if (!webflowMemberId) {
      console.error("Member ID not found");
      return;
    }

    const { successEl, errorEl } = getMessageElements(formRoot, btn);
    const formEl = getFormElement(formRoot);

    const validationError = validateMemberForm(formRoot, requiredFields);
    if (validationError) {
      toggleMessage(successEl, errorEl, validationError, false);
      log("Form validation failed", validationError);
      return;
    }

    if (errorEl) {
      errorEl.style.setProperty("display", "none", "important");
    }

    const payload = buildPayload(webflowMemberId, formRoot);

    const originalText = btn.textContent;
    btn.textContent = "Processing...";
    btn.style.pointerEvents = "none";

    try {
      const response = await bdcFetch(
        `${FAMILY_MEMBERS_API_BASE}/addFamilyMember`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await response
        .json()
        .catch(() => ({ error: "Failed to create family member" }));

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || "Failed to create family member",
        );
      }

      toggleMessage(
        successEl,
        errorEl,
        data?.message || "Family member created successfully.",
        true,
      );

      if (formEl) formEl.reset();

      await loadFamilyMembers(webflowMemberId);
    } catch (error) {
      console.error("Failed to create family member", error);
      toggleMessage(
        successEl,
        errorEl,
        error.message || "Could not create family member. Please try again.",
        false,
      );
    } finally {
      btn.textContent = originalText;
      btn.style.pointerEvents = "auto";
    }
  };

  const submitUpdateMember = async (
    btn,
    formRoot,
    buildPayload,
    requiredFields = [],
  ) => {
    const webflowMemberId = getWebflowMemberId();
    if (!webflowMemberId) {
      console.error("Member ID not found");
      return;
    }

    if (!window.editingMemberRecord) {
      console.error("[members] No member selected for update");
      return;
    }

    const recordId = getMemberId(window.editingMemberRecord);
    if (!recordId) {
      console.error("[members] record_id not found for update");
      return;
    }

    const { successEl, errorEl } = getMessageElements(formRoot, btn);

    const validationError = validateMemberForm(formRoot, requiredFields);
    if (validationError) {
      toggleMessage(successEl, errorEl, validationError, false);
      log("Update validation failed", validationError);
      return;
    }

    if (errorEl) {
      errorEl.style.setProperty("display", "none", "important");
    }

    const payload = buildPayload(formRoot);
    log("Updating member", payload);

    const originalText = btn.textContent;
    btn.textContent = "Processing...";
    btn.style.pointerEvents = "none";

    try {
      const response = await bdcFetch(
        `${FAMILY_MEMBERS_API_BASE}/createAccount`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: toFormUrlEncoded(payload),
        },
      );

      const data = await response
        .json()
        .catch(() => ({ error: "Failed to update family member" }));

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || "Failed to update family member",
        );
      }

      toggleMessage(
        successEl,
        errorEl,
        data?.message || "Family member updated successfully.",
        true,
      );

      await loadFamilyMembers(webflowMemberId);
    } catch (error) {
      console.error("Failed to update family member", error);
      toggleMessage(
        successEl,
        errorEl,
        error.message || "Could not update family member. Please try again.",
        false,
      );
    } finally {
      btn.textContent = originalText;
      btn.style.pointerEvents = "auto";
    }
  };

  const createParentMemberBtn = document.getElementById("create-parent-member");
  if (createParentMemberBtn) {
    createParentMemberBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const formRoot = getCreateFormRoot(
        memberModal,
        "parent",
        createParentMemberBtn,
      );
      log("Parent create form root", formRoot);
      await submitFamilyMember(
        createParentMemberBtn,
        formRoot,
        buildParentPayload,
        ["first_name", "last_name", "email"],
      );
    });
  }

  const createStudentMemberBtn = document.getElementById("create-student-member");
  if (createStudentMemberBtn) {
    createStudentMemberBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const formRoot =
        getCreateFormRoot(memberModal, "student", createStudentMemberBtn) ||
        studentFormRoot ||
        studentForm ||
        createStudentMemberBtn.closest("form");
      await submitFamilyMember(
        createStudentMemberBtn,
        formRoot,
        buildStudentPayload,
        ["first_name", "last_name"],
      );
    });
  }

  const updateParentMemberBtn = document.getElementById("update-parent-member");
  if (updateParentMemberBtn) {
    updateParentMemberBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const formRoot = getEditFormRoot("parent", updateParentMemberBtn);
      log("Parent update form root", formRoot);
      await submitUpdateMember(
        updateParentMemberBtn,
        formRoot,
        buildParentUpdatePayload,
        ["first_name", "last_name", "email"],
      );
    });
  }

  const updateStudentMemberBtn = document.getElementById("update-student-member");
  if (updateStudentMemberBtn) {
    updateStudentMemberBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const formRoot = getEditFormRoot("student", updateStudentMemberBtn);
      log("Student update form root", formRoot);
      await submitUpdateMember(
        updateStudentMemberBtn,
        formRoot,
        buildStudentUpdatePayload,
        ["first_name", "last_name"],
      );
    });
  }

  initDobFields();
  initDobCalendars();

  log("Members script ready", {
    memberModal,
    memberEditModal,
    parentFormRoot,
    studentFormRoot,
  });
});
