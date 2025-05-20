class ReferralProgram {
  constructor(memberId, baseUrl) {
    this.memberId = memberId;
    this.baseUrl = baseUrl;
    this.referralCodeInput = document.getElementById("referralCode");
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
    this.copyMsg.style.display = "inline";
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
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      // Set coupon code
      this.referralCodeInput.value = data.coupon_code || "";

      // data referrals count based on data-referrals="count" element
        const countElement = document.querySelectorAll("[data-referrals='count']");
        countElement.forEach((el) => {
          const count = data.referrals.filter((ref) => ref.referred_stage != "None").length;
          el.textContent = count;
        });


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
      

      // Populate referrals table
      this.referralsTableBody.innerHTML = "";
      (data.referrals || []).forEach((ref) => {
        const wrapper = document.createElement("div");
        wrapper.className = "my-referral-table-row-grid-wrapper-copy";

        // Status and Name
        const statusFlex = document.createElement("div");
        statusFlex.className = "my-referral-status-flex-wrapper";
        const statusIcon = document.createElement("img");
        statusIcon.src =
          "https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/682b19d6917e60cb04ec4624_Rectangle%204630.svg";
        statusIcon.loading = "lazy";
        statusIcon.alt = "";
        statusIcon.className = "status-uncheck-icon";
        const nameDiv = document.createElement("div");
        nameDiv.className = "my-referral-table-row-text";
        nameDiv.textContent = ref.name || "";
        //statusFlex.appendChild(statusIcon);
        statusFlex.appendChild(nameDiv);
        wrapper.appendChild(statusFlex);

        // Enrolled/Pending status
        const statusDiv = document.createElement("div");
        statusDiv.className = "my-referral-table-row-text";
        statusDiv.textContent =
          ref.referred_stage !== "None" ? "Enrolled" : "Pending";
        wrapper.appendChild(statusDiv);

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
          : "-";
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
      this.formMsg.textContent = "Submission failed!";
      setTimeout(() => (this.formMsg.textContent = ""), 2000);
    } finally {
      // Re-enable submit button after submission is complete
      if (this.submitBtn) {
        this.submitBtn.style.pointerEvents = "auto";
        this.submitBtn.innerHTML = "Submit";
      }
    }
  }
}
