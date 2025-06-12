class DisplaySuppProgram {
  $selectedProgram = [];
  $suppPro = [];
  constructor(memberData) {
    this.spinner = document.getElementById("half-circle-spinner");
    this.upSellEls = document.querySelectorAll(".bundle-sem-rounded-red-div");
    // initial hide the up sell program
    this.upSellEls.forEach((el) => { el.style.display = "none"; });
    this.memberData = memberData;
    this.displaySupplementaryProgram();
    this.updateOldStudentList();
    this.handlePaymentEvents();
    this.discount_amount = parseInt(memberData.amount)
  }
  /**
   *
   * @param name - HTML element name
   * @param className - HTML element class attribute
   * @param idName - HTML element id attribute
   */
  creEl(name, className, idName) {
    var el = document.createElement(name);
    if (className) {
      el.className = className;
    }
    if (idName) {
      el.setAttribute("id", idName);
    }
    return el;
  }
  async fetchData(endpoint) {
    try {
      const response = await fetch(`${this.memberData.baseUrl}${endpoint}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }
  async displaySupplementaryProgram() {
    try {
      this.spinner.style.display = "block";
      this.$suppPro = await this.fetchData("getUpsellProgram/");
      this.handleClickEvents();
      this.closeIconEvent();
      if (this.$suppPro.length === 0) {
        this.spinner.style.display = "none";
      } else {
        this.updateAddonProgram();
        this.spinner.style.display = "none";
      }
    } catch (error) {
      console.error("Error in displaySupplementaryProgram:", error);
      this.spinner.style.display = "none";
    }
  }
  updateAddonProgram() {
      const addonProgram = this.$suppPro.find(
        (data) => data.upsellProgramId == 104
      );
      
      console.log("addonProgram", addonProgram, this.$suppPro);
      if (addonProgram == undefined) {
        return;
      }
      this.$selectedProgram = addonProgram;
      const title = document.querySelectorAll("[data-addon='title']");
      const price = document.querySelectorAll("[data-addon='price']");
      const discountPrice = document.querySelectorAll(
        "[data-addon='discount-price']"
      );
      const discount = document.querySelectorAll("[data-addon='discount']");
      const bundleProgram = document.querySelectorAll(".bundleProgram ");
      if (title.length > 0) {
        title.forEach((addon_title) => {
          addon_title.innerHTML = addonProgram.label;
        });
      }
  
      let disc_amount = addonProgram.disc_amount + this.discount_amount;
      let amount = parseInt(addonProgram.portal_amount) + this.discount_amount;
  
      if (price.length > 0) {
        price.forEach((p) => {
          p.innerHTML = "$" + this.numberWithCommas(disc_amount);
        });
      }
      if (discountPrice.length > 0) {
        discountPrice.forEach((dp) => {
          dp.innerHTML = "$" + this.numberWithCommas(amount);
        });
      }
      if (discount.length > 0) {
        discount.forEach((d) => {
          d.innerHTML =
            "$" + this.numberWithCommas(disc_amount - amount);
        });
      }
      if (bundleProgram.length > 0) {
        bundleProgram.forEach((bp) => {
          bp.value = this.numberWithCommas(amount);
        });
      }
  }
  handleClickEvents() {
    var $this = this;
    const closeLinks = document.querySelectorAll(".upsell-close-link");
    const semesterBundleModal = document.getElementById(
      "semester-bundle-modal"
    );

    const learnMore = document.getElementById("learn-more");
    closeLinks.forEach(function (closeLink) {
      closeLink.addEventListener("click", function (event) {
        event.preventDefault();
        $this.hideModal(semesterBundleModal);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    let closeModal = document.querySelectorAll("[data-modal='close']");
    if (closeModal.length > 0) {
      closeModal.forEach((close_modal_link) => {
        close_modal_link.addEventListener("click", function (event) {
          event.preventDefault();
          $this.hideModal(semesterBundleModal);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
    }

    learnMore.addEventListener("click", function () {
      semesterBundleModal.classList.add("show");
      semesterBundleModal.style.display = "flex";
    });
     $this.addToCart();
  }

  // New Feature Add to Cart
  
    addToCart() {
      // Select all 'add-to-card' buttons
      const addToCartButtons = document.querySelectorAll(".add-to-cart, .bundle-add-to-cart");
      var $this = this;
      addToCartButtons.forEach((button) => {
        button.addEventListener("click", function (event) {
          event.preventDefault();
          // $this.$selectedProgram = item;
          $this.updatePayNowModelAmount();
          const buyNowModal = document.getElementById("buyNowModal");
          $this.showModal(buyNowModal);
        });
    });
  }

  // formatting price in comma based value
  numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  showModal(modal) {
    modal.classList.add("show");
    modal.style.display = "flex";
  }
  hideModal(modal) {
    modal.classList.remove("show");
    modal.style.display = "none";
  }
  closeIconEvent() {
    const closeLinks = document.querySelectorAll(
      ".upsell-close-link, .main-button.close, .upsell-buy-now-close-link"
    );
    closeLinks.forEach(function (closeLink) {
      closeLink.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation(); // Prevent event bubbling

        // First, try getting the modal from `data-target`
        const targetModalId = closeLink.getAttribute("data-target");
        let targetModal = targetModalId
          ? document.getElementById(targetModalId)
          : null;

        // If no `data-target`, find the closest parent that is a modal (checking if it has inline `display: flex;`)
        if (!targetModal) {
          targetModal = closeLink.closest('[role="dialog"][aria-modal="true"]');
        }

        if (targetModal) {
          console.log(`Closing ${targetModal.id}`);
          targetModal.classList.remove("show");
          targetModal.style.display = "none";
        }
      });
    });
  }
  //updateOldStudentList
  async updateOldStudentList() {
    const selectBox = document.getElementById("portal-students");
    var $this = this;
    try {
      const data = await this.fetchData(
        "getAllPreviousStudents/" + this.memberData.memberId+"/current"
      );
      if (data != "No data Found" ) {
        this.upSellEls.forEach((el) => { el.style.display = "block"; });
      }else {
        this.upSellEls.forEach((el) => { el.style.display = "none"; });
        return;
      }
      //finding unique value and sorting by firstName
      const filterData = data
        .filter(
          (item, index, self) =>
            index ===
            self.findIndex((obj) => obj.studentEmail === item.studentEmail)
        )
        .sort(function (a, b) {
          return a.studentName.trim().localeCompare(b.studentName.trim());
        });
      // Clear existing options
      selectBox.innerHTML = "";
      // Add a "Please select" option
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "Select a student";
      selectBox.appendChild(defaultOption);
      // Add new options from the API data
      filterData.forEach((item, index) => {
        const option = document.createElement("option");
        option.value = item.paymentId;
        // Add selected if filterData length is 1
        if (filterData.length === 1) {
          option.selected = true;
        }
        option.textContent = `${item.studentName}`;
        selectBox.appendChild(option);
      });
    } catch (error) {
      console.error("Error fetching API data:", error);

      // Handle errors (optional)
      selectBox.innerHTML =
        '<option value="">Student Details not available</option>';
    }
  }

  initSupplementaryPayment(paymentId, upsellProgramId, programName, amount) {
    // Define the data to be sent in the POST request
    const data = {
      sessionId: "",
      paymentId: paymentId,
      upsellProgramId: parseInt(upsellProgramId),
       successUrl:
        this.memberData.site_url + "members/" + this.memberData.memberId+"?success=true",
      cancelUrl:
        this.memberData.site_url + "members/" + this.memberData.memberId,
      label: programName,
      amount: parseFloat(amount * 100),
      source: "portal_page",
      hasFee: false,
      memberId: this.memberData.memberId
    };
    // Create the POST request
    fetch(this.memberData.baseUrl + "checkoutUrlForUpsellProgram", {
      method: "POST", // Specify the method
      headers: {
        "Content-Type": "application/json", // Specify the content type
      },
      body: JSON.stringify(data), // Convert the data to a JSON string
    })
      .then((response) => {
        if (!response.ok) {
          // Handle the error response
          throw new Error("Network response was not ok " + response.statusText);
        }
        return response.json(); // Parse the JSON from the response
      })
      .then((data) => {
        console.log("Success:", data); // Handle the JSON data
        if (data.success) {
          console.log(data.cardUrl);
          window.location.href = data.cardUrl;
        }
      })
      .catch((error) => {
        console.error("There was a problem with the fetch operation:", error); // Handle errors
      });
  }
  handlePaymentEvents() {
    var $this = this;
    const payBtn = document.getElementById("pay-supp-program");
    payBtn.addEventListener("click", function (event) {
      event.preventDefault();

      const studentEl = document.getElementById("portal-students");
      if (studentEl.value) {
        payBtn.value = "Processing...";
        payBtn.style.pointerEvents = "none";
        let programName = $this.$selectedProgram.label;
        let upsellProgramId = $this.$selectedProgram.upsellProgramId;
        let amount = ($this.$selectedProgram.portal_amount + $this.discount_amount).toFixed(2);
        // Check if the program name, upsellProgramId, amount, and paymentId are defined
        let paymentId = studentEl.value;
        if (programName && upsellProgramId && amount && paymentId) {
          $this.initSupplementaryPayment(
            paymentId,
            upsellProgramId,
            programName,
            amount
          );
        }
      } else {
        alert("Please select student");
      }
    });
  }
  updatePayNowModelAmount() {
    var $this = this;
    let upSellAmount = document.querySelectorAll(
      "[data-cart-total='cart-total-price']"
    );
    if (upSellAmount.length > 0) {
      upSellAmount.forEach((up_Sell_price) => {
        up_Sell_price.innerHTML = "$" + ($this.$selectedProgram.portal_amount + $this.discount_amount);
      });
    }

    // Update buy now modal title
    let upSellTitle = document.querySelectorAll(
      "[data-cart='title']"
    );
    if (upSellTitle.length > 0) {
      upSellTitle.forEach((up_Sell_title) => {
        up_Sell_title.innerHTML = $this.$selectedProgram.label;
      });
    }
  }
}
