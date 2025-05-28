class ReferralProgram {
  constructor(data) {
    this.referralCount = data.referralCount;
    this.maxReferrals = data.maxReferrals;
    this.rewards = data.rewards;
    this.icons = data.icons;
    this.memberId = data.memberId;
    this.baseUrl = data.baseUrl;
    this.referralCodeInput = document.getElementById("referralCode");
    this.referralCodeInput.setAttribute("readonly", "true");
    this.referralCodeInput.setAttribute("aria-readonly", "true");
    this.copyMsg = document.getElementById("copyMsg");
    this.referralsTableBody = document.getElementById("referralList");
    // showEnrolled and showPending is checkbox field
    // this.showEnrolled = document.getElementById("showEnrolled");
    // this.showPending = document.getElementById("showPending");
    this.referralForm = document.getElementById("referralForm");
    this.formMsg = document.getElementById("formMsg");
    this.submitBtn = document.getElementById("formSubmit");
    this.spinner = document.getElementById("half-circle-spinner");

    this.submitBtn.addEventListener("click", (e) => this.handleFormSubmit(e));
    // Copy code button
    this.copyCodeBtns = document.querySelectorAll("[data-referrals='copy']");
    this.copyCodeBtns.forEach((btn) => {
      btn.addEventListener("click", () => this.copyCode());
    });
    // Load referral data on page load
    this.loadReferralData();
    //this.showEnrolled.addEventListener("change", () => this.loadReferralData());
    //this.showPending.addEventListener("change", () => this.loadReferralData());
  }
  copyCode() {
    this.referralCodeInput.select();
    this.referralCodeInput.setSelectionRange(0, 99999);
    document.execCommand("copy");
    this.copyMsg.style.display = "block";
    setTimeout(() => (this.copyMsg.style.display = "none"), 1500);
  }

  async loadReferralData() {
    this.spinner.style.display = "block";
    try {
      const res = await fetch(
        `${this.baseUrl}getReferralData/${this.memberId}`
      );
      this.spinner.style.display = "none";
      // Check if the response is ok
      if (!res.ok) {
        // class no-record-div display block
        document.querySelector(".no-record-div").style.display = "block";
        throw new Error("Failed to fetch");
      }
      const data = await res.json();

      // Set coupon code
      this.referralCodeInput.value = data.coupon_code || "";
      data.referrals = data.referrals || [];
      if(data.referrals.length == 0) {
        document.querySelector(".no-record-div").style.display = "block";
      }else {
        document.querySelector(".no-record-div").style.display = "none";
      }

      // data referrals count based on data-referrals="count" element
      const countElement = document.querySelectorAll(
        "[data-referrals='count']"
      );
      const count = data.referrals.filter(
        (ref) => ref.referred_stage != "None"
      ).length;

      countElement.forEach((el) => {
        el.textContent = count;
      });

      // const activeReferrals = count; // Set how many referrals are completed
      // const totalReferrals = 7;
      // const fill = document.getElementById("progress-fill");
      // if (count < 7) {
      //   fill.style.width = `${(activeReferrals / totalReferrals) * 100}%`;
      // } else {
      //   fill.style.width = "100%";
      // }

      this.createTracker(count);
      this.createMobileTracker(count)

      // display showEnrolled and showPending based on referred_stage None or else
      // if (this.showEnrolled.checked && this.showPending.checked) {
      //   data.referrals = data.referrals;
      // } else if (this.showEnrolled.checked && !this.showPending.checked) {
      //   data.referrals = data.referrals.filter(
      //     (ref) => ref.referred_stage != "None"
      //   );
      // } else if (this.showPending.checked && !this.showEnrolled.checked) {
      //   data.referrals = data.referrals.filter(
      //     (ref) => ref.referred_stage == "None"
      //   );
      // }
      // Sort referrals by date_referred in descending order
      data.referrals = (data.referrals || []).sort((a, b) => {
        const dateA = new Date(a.date_referred || 0);
        const dateB = new Date(b.date_referred || 0);
        return dateB - dateA;
      });
      if(data.referrals.length == 0) {
        //this.referralsTableBody.classList.add("no-record");
        document.querySelector(".no-record-div").style.display = "block";
      }else {
        //this.referralsTableBody.classList.remove("no-record");
        document.querySelector(".no-record-div").style.display = "none";
      }
      // Populate referrals table
      this.referralsTableBody.innerHTML = "";
      (data.referrals || []).forEach((ref) => {
        let pendingClass =
          ref.referred_stage == "None" ? "pending-referral" : "";
        const wrapper = document.createElement("div");
        wrapper.className =
          "my-referral-table-row-grid-wrapper " + pendingClass;

        // Status and Name
        const statusFlex = document.createElement("div");
        statusFlex.className = "my-referral-status-flex-wrapper";
        const checkIcon = document.createElement("img");
        // Set the status icon based on referred_stage
        if (ref.referred_stage == "None") {
          checkIcon.src =
            "https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/682b19d6917e60cb04ec4624_Rectangle%204630.svg";
          checkIcon.loading = "lazy";
        } else {
          checkIcon.src =
            "https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/682ecd5b8bc5ccc9aff51d85_checked-icon.svg";
          checkIcon.loading = "lazy";
        }

        checkIcon.alt = "";
        checkIcon.className = "status-uncheck-icon";
        const nameDiv = document.createElement("div");
        nameDiv.className = "my-referral-table-row-text";
        nameDiv.textContent = ref.name || "";
        wrapper.appendChild(checkIcon);
        wrapper.appendChild(nameDiv);
        //wrapper.appendChild(statusFlex);

        // Enrolled/Pending status
        const statusDiv = document.createElement("div");
        statusDiv.className = "my-referral-table-row-text";
        statusDiv.textContent =
          ref.referred_stage !== "None" ? "Enrolled" : "Pending";
        statusFlex.appendChild(statusDiv);

        const pendingStatusIcon = document.createElement("img");
        pendingStatusIcon.classList.add("pending-icon");
        // Set the status icon based on referred_stage
        if (ref.referred_stage == "None") {
          pendingStatusIcon.src =
            "https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/682fffc2c9964985fed5191a_Layer_1%20(7).svg";
          pendingStatusIcon.loading = "lazy";
          statusFlex.appendChild(pendingStatusIcon);
        }
        wrapper.appendChild(statusFlex);

        // Date referred
        const referredDiv = document.createElement("div");
        referredDiv.className = "my-referral-table-row-text";
        referredDiv.textContent = ref.date_referred
          ? this.formatDate(ref.date_referred)
          : "";
        wrapper.appendChild(referredDiv);

        // Purchased date or Pending
        const purchasedDiv = document.createElement("div");
        purchasedDiv.className = "my-referral-table-row-text";
        purchasedDiv.textContent = ref.purchased_date
          ? this.formatDate(ref.purchased_date)
          : "--";
        wrapper.appendChild(purchasedDiv);

        this.referralsTableBody.appendChild(wrapper);
      });
    } catch (err) {
      console.error(err);
    }
  }
  formatDate(dateString) {
    const options = { year: "numeric", month: "long", day: "numeric" };
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", options);
  }
  async handleFormSubmit(e) {
    e.preventDefault();
    this.spinner.style.display = "block";
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    // select w-form-done and w-form-fail
    const formDone = document.querySelector(".w-form-done");
    const formFail = document.querySelector(".w-form-fail");
    if (!name || !email) {
      formFail.textContent = "Please fill in all fields.";
      formFail.style.display = "block";
      this.spinner.style.display = "none";
      // Hide the error message after 3 seconds
      setTimeout(() => (formFail.style.display = "none"), 3000);
      this.referralForm.setAttribute("data-wf-page", "false");
      return;
    }

    // Disable submit button to prevent multiple submissions
    if (this.submitBtn) {
      this.submitBtn.style.pointerEvents = "none";
      //this.submitBtn.innerHTML = "Submitting...";
    }

    try {
      const res = await fetch(`${this.baseUrl}addReferralData`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, memberId: this.memberId }),
      });
      let apiResponse = await res.json();
      formDone.textContent = apiResponse;
      if (res.ok) {
        this.referralForm.style.display = "none";
        formDone.style.display = "block";
        formFail.style.display = "none";
        this.referralForm.setAttribute("data-wf-page", "true");
        this.loadReferralData();
      } else {
        this.referralForm.style.display = "grid";
        formDone.style.display = "none";
        formFail.style.display = "block";
        formFail.textContent = apiResponse;
        this.referralForm.setAttribute("data-wf-page", "false");
        // Hide the error message after 3 seconds
        setTimeout(() => (formFail.style.display = "none"), 3000);
        //throw new Error(apiResponse);
      }
      // Reset the form
      this.referralForm.reset();
      this.spinner.style.display = "none";
      return;
    } catch (err) {
      this.spinner.style.display = "none";
      this.formMsg.textContent = "Submission failed!";
      setTimeout(() => (this.formMsg.textContent = ""), 2000);
    } finally {
      // Re-enable submit button after submission is complete
      if (this.submitBtn) {
        this.submitBtn.style.pointerEvents = "auto";
        this.submitBtn.innerHTML = "Submit";
        this.spinner.style.display = "none";
      }
    }
  }

  createTracker(referralCount) {
    const container = document.querySelector(".progress-tracker-rounded-div.desktop");
    container.innerHTML = ""; // Clear existing content
    const progressPercent =
      (Math.min(referralCount, this.maxReferrals) / this.maxReferrals) * 100;

    let html = `
    <div class="progress-track-inner-rounded-div">
      <div id="progress-fill" class="progress-track-fill" style="width: ${progressPercent}%;"><div class="progress-tracker-circle-container">`;

    for (let i = 0; i < this.maxReferrals; i++) {
      const isEven = i % 2 === 0;
      const isCompleted = referralCount > i;
      const isCurrent = referralCount + 1 === i + 1;

      let textPositionClass = isEven ? "top-text" : "bottom-text";
      let rewardText =
        i === this.maxReferrals - 1 && referralCount > this.maxReferrals
          ? "7+ Referrals"
          : `${i + 1} ${i==0 ? 'Referral': 'Referrals'}`;
      let rewardSubtext = this.rewards[i] || "Bergen Speech Stand";

      let circleClass = "referral-circle-gray";
      if (!isCompleted) circleClass += " light-gray";

      let icon = isCompleted
        ? this.icons.check
        : isCurrent
        ? this.icons.timer
        : "";
      let circleIcon = icon ? `<img src="${icon}" loading="lazy" alt="">` : "";

      let connectorLine = isEven
        ? `<img src="${this.icons.lineBottom}" class="progress-track-bottom-line" loading="lazy" alt="">`
        : `<img src="${this.icons.lineTop}" class="progress-track-top-line" loading="lazy" alt="">`;
      let circleDiv = isEven
        ? `<div class="progress-track-bottom-circle ${
            !icon ? "no-inner-icon" : ""
          }">${circleIcon}</div>`
        : `<div class="progress-track-top-circle ${
            !icon ? "no-inner-icon" : ""
          }">${circleIcon}</div>`;

      html += `<div class="progress-tracker-referral-circle-div">
      <div class="${circleClass}">
        <div class="progress-tracker-text ${textPositionClass} ${
        !isCompleted ? "text-400" : ""
      }">${rewardText}<br><span class="reward-subtext">${rewardSubtext}</span></div>
        ${connectorLine}
        ${circleDiv}
      </div>
    </div>`;
    }

    html += `</div></div></div>`;
    container.innerHTML = html;
  }

  createMobileTracker(referralCount) {
  const container = document.querySelector(".progress-tracker-rounded-div.mobile");
  container.innerHTML = ""; // Clear existing content

  const progressPercent = Math.min(referralCount, this.maxReferrals) / this.maxReferrals * 100;

  const progressInner = [];
  progressInner.push(`<div class="progress-track-inner-rounded-div"><div id="progress-fill-mob" class="progress-track-fill" style="height: ${progressPercent}%;"><div class="progress-tracker-circle-container">`);

  for (let i = 0; i < this.maxReferrals; i++) {
    const isLeft = i % 2 === 0;
    const isCompleted = referralCount > i;
    const isCurrent = referralCount === i + 1;

    const rewardText = i === this.maxReferrals - 1 && referralCount > this.maxReferrals
      ? "7+ Referrals"
      : `${i + 1} ${i==0 ? 'Referral': 'Referrals'}`;
    const rewardSubtext = this.rewards[i] || "Bergen Speech Stand";

    const circleClass = isCompleted ? "referral-circle-gray" : "referral-circle-gray light-gray";
    const iconSrc = isCompleted ? this.icons.check : isCurrent ? this.icons.timer : null;
    const icon = iconSrc
      ? `<img src="${iconSrc}" loading="lazy" alt="" class="inline-block-icon">`
      : "";

    const circle = `<div class="${isLeft ? "progress-track-left-circle" : "progress-track-right-circle"}">${icon}</div>`;
    const line = `<img src="${this.icons.lineTop}" loading="lazy" alt="" class="${isLeft ? "progress-track-left-icon" : "progress-track-right-icon"}">`;
    const textClass = isCompleted ? "progress-tracker-text" : "progress-tracker-text font-400";
    const text = `<div class="${textClass} ${isLeft ? "mob-right" : "mob-left"}">${rewardText}<br /><span class="reward-subtext">${rewardSubtext}</span></div>`;

    progressInner.push(`
      <div class="progress-tracker-referral-circle-div">
        <div class="${circleClass}">
          ${circle}
          ${text}
          ${line}
        </div>
      </div>`);
  }

  progressInner.push(`</div></div></div>`);

  container.innerHTML = progressInner.join("");
  }
}
