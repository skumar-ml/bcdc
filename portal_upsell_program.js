class DisplaySuppProgram {
  $selectedProgram = [];
  $suppPro = [];
  $bundleData = [];
  constructor(memberData) {
    this.spinner = document.getElementById("half-circle-spinner");
    this.upSellEls = document.querySelectorAll(".bundle-sem-rounded-red-div");
    // initial hide the up sell program
    this.upSellEls.forEach((el) => {
      el.style.display = "none";
    });
    this.memberData = memberData;
    this.displaySupplementaryProgram();
    this.updateOldStudentList();
    this.handlePaymentEvents();
    this.discount_amount = parseInt(memberData.amount);
    
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
      this.$suppPro = await this.fetchData("getUpsellProgramTest/");
      this.handleClickEvents();
      this.closeIconEvent();
      if (this.$suppPro.length === 0) {
        this.spinner.style.display = "none";
      } else {
        this.createBundleProgram();
        this.spinner.style.display = "none";
      }
    } catch (error) {
      console.error("Error in displaySupplementaryProgram:", error);
      this.spinner.style.display = "none";
    }
  }
  createBundleProgram() {
    const cardContainer = document.querySelector(
      "[data-upSell='card-container']"
    );
    const modalCardContainer = document.querySelector(
      "[data-upSell='modal-card-container']"
    );
    if (!cardContainer) {
      return;
    }
    if (!modalCardContainer) {
      return;
    }
    modalCardContainer.innerHTML = ""; // Clear existing content
    cardContainer.innerHTML = ""; // Clear existing content
    // remove remove session data based on summerSessionId 2
    var academicData = this.$suppPro.filter((item) => {
      return item.sessionId !== 2;
    });

    academicData.forEach((item) => {
      var currentSessionId = item.sessionId;
      // remove current Session Data based on summerSessionId item.
      var bundleData = item.upsellPrograms.filter(
        (bundle) => bundle.sessionId !== currentSessionId
      );
      bundleData.forEach((singleBundleData) => {
        var card = this.createBundleCard(singleBundleData);
        cardContainer.appendChild(card);
        var modelCard = this.createModelBundleCard(singleBundleData);
        modalCardContainer.appendChild(modelCard);
      });
      this.$bundleData = bundleData;
      this.renderPayNowModalCards();
    });
    this.disableEnableBuyNowButton();
  }
  createBundleCard(singleBundleData) {
    var $this = this;
    const upSellAmount = document.querySelectorAll(
      "[data-cart-total='cart-total-price']"
    );
    // Create the label with required classes
    const label = this.creEl("label", "bundle-sem-content-block");
    // Checkbox container
    const checkboxDiv = this.creEl("div");
    const input = this.creEl("input", "bundle-sem-checkbox");
    input.type = "checkbox";
    input.name = "bundle-sem";
    input.setAttribute("data-upsell-program-id", singleBundleData.upsellProgramId);
    input.value = singleBundleData.label || "";
    checkboxDiv.appendChild(input);

    input.addEventListener("change", (event) => {
      if (event.target.checked) {
        if (!this.$selectedProgram.includes(singleBundleData)) {
          this.$selectedProgram.push(singleBundleData);
          this.renderPayNowModalCards()
        }
      } else {
        this.$selectedProgram = this.$selectedProgram.filter(
          (program) =>
            program.upsellProgramId !== singleBundleData.upsellProgramId
        );
        this.renderPayNowModalCards()
      }
      // update amount in data-cart-total="cart-total-price" html element
      if (upSellAmount.length > 0) {
        upSellAmount.forEach((up_Sell_price) => {
          if (this.$selectedProgram.length === 0) {
            up_Sell_price.innerHTML = "$0";
          } else {
            const totalAmount = this.$selectedProgram.reduce(
              (acc, program) => acc + program.portal_amount,
              0
            );
            up_Sell_price.innerHTML = "$" + this.numberWithCommas(totalAmount);
          }
        });
      }
      // checked and unchecked all elements based on data-upsell-program-id
      const allCheckboxes = document.querySelectorAll("[data-upsell-program-id]");
      allCheckboxes.forEach((checkbox) => {
        if (
          checkbox.getAttribute("data-upsell-program-id") ==
          singleBundleData.upsellProgramId
        ) {
          checkbox.checked = event.target.checked;
          checkbox.parentElement.parentElement.classList.toggle("border-brown-red", event.target.checked);
        }
      });
      $this.disableEnableBuyNowButton();
    });

    // Content container
    const contentDiv = this.creEl("div");
    // Title
    const titleP = this.creEl("p", "bundle-sem-title");
    titleP.textContent = `${singleBundleData.label || "Winter/Spring"} (${singleBundleData.yearId || "2026"})`;
    // Price flex container
    const priceFlexDiv = this.creEl("div", "bundle-sem-price-flex-div");
    const discountPriceDiv = this.creEl("div", "bundle-sem-price-text-large");
    discountPriceDiv.setAttribute("data-addon", "discount-price");
    discountPriceDiv.textContent = singleBundleData.portal_amount
      ? `$${this.numberWithCommas(singleBundleData.portal_amount)}`
      : "$3,350";
    const priceDiv = this.creEl("div", "bundle-sem-price-gray");
    priceDiv.setAttribute("data-addon", "price");
    priceDiv.textContent = singleBundleData.portal_disc_amount
      ? `$${this.numberWithCommas(singleBundleData.portal_disc_amount)}`
      : "$3,770";
    priceFlexDiv.appendChild(discountPriceDiv);
    priceFlexDiv.appendChild(priceDiv);

    // Subtext
    const subtextDiv = this.creEl("div", "dm-sans bundle-sem-text-block");
    subtextDiv.innerHTML =
      (singleBundleData.desc
        ? singleBundleData.desc
        : "Last Year's Locked-In Tuition + Early Bird") + "<br />";

    // Assemble content
    contentDiv.appendChild(titleP);
    contentDiv.appendChild(priceFlexDiv);
    contentDiv.appendChild(subtextDiv);

    // Assemble label
    label.appendChild(checkboxDiv);
    label.appendChild(contentDiv);

     // Checkbox event: toggle border-brown-red
     input.addEventListener("change", (event) => {
      if (input.checked) {
        label.classList.add("border-brown-red");
      } else {
        label.classList.remove("border-brown-red");
      }
      // ... your selection logic ...
    });
    // Optionally, set initial state if checked
    if (input.checked) {
      label.classList.add("border-brown-red");
    }

    return label;
  }

  createModelBundleCard(singleBundleData) {
    var $this = this;
    const upSellAmount = document.querySelectorAll(
      "[data-cart-total='cart-total-price']"
    );
    // Outer grid div
    const grid = this.creEl("div", "bundle-sem-content-flex-container");
    // Checkbox
    const textWithCheckbox = this.creEl("div", "bundle-sem-text-with-checkbox")
    const checkboxDiv = this.creEl("div", "w-embed");
    const input = this.creEl("input", "bundle-sem-checkbox");
    input.type = "checkbox";
    input.name = "bundle-sem";
    input.value = singleBundleData.label || "";
    input.setAttribute("data-upsell-program-id", singleBundleData.upsellProgramId);
    input.addEventListener("change", (event) => {
      if (event.target.checked) {
        if (!this.$selectedProgram.includes(singleBundleData)) {
          this.$selectedProgram.push(singleBundleData);
          this.renderPayNowModalCards()
        }
      } else {
        this.$selectedProgram = this.$selectedProgram.filter(
          (program) =>
            program.upsellProgramId !== singleBundleData.upsellProgramId
        );
        this.renderPayNowModalCards()
      }
      // update amount in data-cart-total="cart-total-price" html element
      if (upSellAmount.length > 0) {
        upSellAmount.forEach((up_Sell_price) => {
          if (this.$selectedProgram.length === 0) {
            up_Sell_price.innerHTML = "$0";
          } else {
            const totalAmount = this.$selectedProgram.reduce(
              (acc, program) => acc + program.portal_amount,
              0
            );
            up_Sell_price.innerHTML = "$" + this.numberWithCommas(totalAmount);
          }
        });
      }
      // checked and unchecked all elements based on data-upsell-program-id
      const allCheckboxes = document.querySelectorAll("[data-upsell-program-id]");
      allCheckboxes.forEach((checkbox) => {
        if (
          checkbox.getAttribute("data-upsell-program-id") ==
          singleBundleData.upsellProgramId
        ) {
          checkbox.checked = event.target.checked;
          checkbox.parentElement.parentElement.classList.toggle("border-brown-red", event.target.checked);
        }
      });
      $this.disableEnableBuyNowButton();
    });
    checkboxDiv.appendChild(input);

    // Title
    const title = this.creEl("p", "bundle-sem-title");
    title.textContent = `${singleBundleData.label || "Winter/Spring"} (${singleBundleData.yearId || "2026"})`;

    // Price wrapper
    const priceWrapper = this.creEl("div");
    const priceFlex = this.creEl("div", "bundle-sem-popup-price-flex-wrapper");
    const price = this.creEl("div", "bundle-sem-popup-price-gray");
    price.setAttribute("data-addon", "price");
    price.textContent = singleBundleData.portal_disc_amount
      ? `$${this.numberWithCommas(singleBundleData.portal_disc_amount)}`
      : "$3,770";
    const discountPrice = this.creEl("div", "bundle-sem-pop-up-price-text");
    discountPrice.setAttribute("data-addon", "discount-price");
    discountPrice.textContent = singleBundleData.portal_amount
      ? `$${this.numberWithCommas(singleBundleData.portal_amount)}`
      : "$3,350";
    priceFlex.appendChild(price);
    priceFlex.appendChild(discountPrice);
    priceWrapper.appendChild(priceFlex);

    // Assemble
    textWithCheckbox.appendChild(checkboxDiv);
    textWithCheckbox.appendChild(title);
    grid.appendChild(textWithCheckbox);
    grid.appendChild(priceWrapper);

     // Checkbox event: toggle border-brown-red
     input.addEventListener("change", (event) => {
      if (input.checked) {
        grid.classList.add("border-brown-red");
      } else {
        grid.classList.remove("border-brown-red");
      }
      // ... your selection logic ...
    });
    // Optionally, set initial state if checked
    if (input.checked) {
      grid.classList.add("border-brown-red");
    }

    return grid;
  }
  handleClickEvents() {
    var $this = this;
    const semesterBundleModal = document.getElementById(
      "semester-bundle-modal"
    );

    const closeLinks = document.querySelectorAll(".upsell-close-link");
    // Add click event listener to the close links
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

    const allLearnMore = document.querySelector("[data-upSell='learn-more']");
    // Add click event listener to the learn more button
    allLearnMore.addEventListener("click", function (event) {
      event.preventDefault();
      semesterBundleModal.classList.add("show");
      semesterBundleModal.style.display = "flex";
    });
    $this.addToCart();
  }

  // New Feature Add to Cart

  addToCart() {
    // Select all 'add-to-card' buttons
    const addToCartButtons = document.querySelectorAll(
      ".add-to-cart, .bundle-add-to-cart"
    );
    var $this = this;
    addToCartButtons.forEach((button) => {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        // $this.$selectedProgram = item;
        //$this.updatePayNowModelAmount();
        const buyNowModal = document.getElementById("buyNowModal");
        $this.renderPayNowModalCards()
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
        "getAllPreviousStudents/" + this.memberData.memberId + "/current"
      );
      if (data != "No data Found") {
        this.upSellEls.forEach((el) => {
          el.style.display = "block";
        });
      } else {
        this.upSellEls.forEach((el) => {
          el.style.display = "none";
        });
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
      //upsellProgramIds: [parseInt(upsellProgramId), 105, 106],
      upsellProgramIds: upsellProgramId.map((id) => parseInt(id)),
      successUrl:
        this.memberData.site_url +
        "members/" +
        this.memberData.memberId +
        "?success=true",
      cancelUrl:
        this.memberData.site_url + "members/" + this.memberData.memberId,
      label: programName,
      amount: parseFloat(amount * 100),
      source: "portal_page",
      hasFee: false,
      memberId: this.memberData.memberId,
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
        payBtn.innerHTML = "Processing...";
        payBtn.style.pointerEvents = "none";
        let programName = $this.$selectedProgram.map(
          (program) => program.label 
        ).join(", ");
        let upsellProgramId = $this.$selectedProgram.map(
          (program) => program.upsellProgramId
        );
        let amount = (
          $this.$selectedProgram.reduce((total, program) => total + program.portal_amount, 0) + $this.discount_amount
        ).toFixed(2);
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
        up_Sell_price.innerHTML =
          "$" + ($this.$selectedProgram.portal_amount + $this.discount_amount);
      });
    }

    // Update buy now modal title
    let upSellTitle = document.querySelectorAll("[data-cart='title']");
    if (upSellTitle.length > 0) {
      upSellTitle.forEach((up_Sell_title) => {
        up_Sell_title.innerHTML = $this.$selectedProgram.label;
      });
    }
  }
  disableEnableBuyNowButton() {
    // is selected program is empty then disable the buy now button
    const buyNowButton = document.querySelectorAll(".add-to-cart, .bundle-add-to-cart");
    if (this.$selectedProgram.length === 0) {
      buyNowButton.forEach((button) => {
        button.disabled = true; // Disable each button
      });
    } else {
      buyNowButton.forEach((button) => {
        button.disabled = false; // Enable each button
      });
    } 
  }
  // Generate a card for payNow-modal-card-container
  createPayNowModalCard(singleBundleData) {
    var $this = this;
    const upSellAmount = document.querySelectorAll(
      "[data-cart-total='cart-total-price']"
    );

    // Outer grid wrapper (initially without border-brown-red)
    const wrapper = this.creEl("div", "bundle-sem-content-inner-div");
    const isSelected = this.$selectedProgram.find(
      (program) => program.upsellProgramId === singleBundleData.upsellProgramId
    );

    if (isSelected != undefined) {
      // Already selected program(s)
      const title = this.creEl("p", "bundle-sem-title-text");
      title.textContent = "Already selected program(s)";
      wrapper.appendChild(title);
      
      const flexWrapper = this.creEl("div", "bundle-sem-content-flex-wrapper");
      const nameText = this.creEl("p", "bundle-sem-name-text");
      nameText.textContent = `${singleBundleData.label || "Winter/Spring"} (${singleBundleData.yearId || "2026"})`;
      flexWrapper.appendChild(nameText);

      const priceWrapper = this.creEl("div", "bundle-sem-text-price-wrapper");
      const price = this.creEl("div", "bundle-sem-popup-price-gray small");
      price.setAttribute("data-addon", "price");
      price.innerHTML = singleBundleData.portal_disc_amount
        ? `$${this.numberWithCommas(singleBundleData.portal_disc_amount)}<br>`
        : "$3,770<br>";
      const discountPrice = this.creEl("div", "bundle-sem-price-text");
      discountPrice.setAttribute("data-addon", "discount-price");
      discountPrice.textContent = singleBundleData.portal_amount
        ? `$${this.numberWithCommas(singleBundleData.portal_amount)}`
        : "$3,350";
      priceWrapper.appendChild(price);
      priceWrapper.appendChild(discountPrice);

      flexWrapper.appendChild(priceWrapper);
      wrapper.appendChild(flexWrapper);
      return wrapper;
    } else {
      // You can also pre-register for
      const title = this.creEl("p", "bundle-sem-title-text");
      title.textContent = "You can also pre-register for";
      wrapper.appendChild(title);

      const flexWrapper = this.creEl("div", "bundle-sem-content-flex-wrapper");
      const textWithCheckbox = this.creEl("div", "bundle-sem-text-with-checkbox");
      const checkboxDiv = this.creEl("div", "w-embed");
      const input = this.creEl("input", "bundle-sem-checkbox");
      input.type = "checkbox";
      input.name = "bundle-sem";
      input.value = singleBundleData.label || "";
      input.setAttribute("data-upsell-program-id", singleBundleData.upsellProgramId);
      checkboxDiv.appendChild(input);
      textWithCheckbox.appendChild(checkboxDiv);

      const nameText = this.creEl("p", "bundle-sem-name-text");
      nameText.textContent = `${singleBundleData.label || "Winter/Spring"} (${singleBundleData.yearId || "2026"})`;
      textWithCheckbox.appendChild(nameText);

      flexWrapper.appendChild(textWithCheckbox);

      const priceWrapper = this.creEl("div", "bundle-sem-text-price-wrapper");
      const price = this.creEl("div", "bundle-sem-popup-price-gray small");
      price.setAttribute("data-addon", "price");
      price.innerHTML = singleBundleData.portal_disc_amount
        ? `$${this.numberWithCommas(singleBundleData.portal_disc_amount)}<br>`
        : "$3,770<br>";
      const discountPrice = this.creEl("div", "bundle-sem-price-text");
      discountPrice.setAttribute("data-addon", "discount-price");
      discountPrice.textContent = singleBundleData.portal_amount
        ? `$${this.numberWithCommas(singleBundleData.portal_amount)}`
        : "$3,350";
      priceWrapper.appendChild(price);
      priceWrapper.appendChild(discountPrice);

      flexWrapper.appendChild(priceWrapper);
      wrapper.appendChild(flexWrapper);

      // Add checkbox event logic
      input.addEventListener("change", (event) => {
        if (event.target.checked) {
          if (!this.$selectedProgram.includes(singleBundleData)) {
            this.$selectedProgram.push(singleBundleData);
          }
        } else {
          this.$selectedProgram = this.$selectedProgram.filter(
            (program) =>
              program.upsellProgramId !== singleBundleData.upsellProgramId
          );
        }
        // update amount in data-cart-total="cart-total-price" html element
        if (upSellAmount.length > 0) {
          upSellAmount.forEach((up_Sell_price) => {
            if (this.$selectedProgram.length === 0) {
              up_Sell_price.innerHTML = "$0";
            } else {
              const totalAmount = this.$selectedProgram.reduce(
                (acc, program) => acc + program.portal_amount,
                0
              );
              up_Sell_price.innerHTML = "$" + this.numberWithCommas(totalAmount);
            }
          });
        }
        // checked and unchecked all elements based on data-upsell-program-id
        const allCheckboxes = document.querySelectorAll("[data-upsell-program-id]");
        allCheckboxes.forEach((checkbox) => {
          if (
            checkbox.getAttribute("data-upsell-program-id") ==
            singleBundleData.upsellProgramId
          ) {
            checkbox.checked = event.target.checked;
            checkbox.parentElement.parentElement.classList.toggle("border-brown-red", event.target.checked);
          }
        });
        this.disableEnableBuyNowButton();
      });

      return wrapper;
    }
    
  }
  // Render a list of cards in the payNow-modal-card-container
  renderPayNowModalCards() {
    var programs = this.$bundleData;
    const payNowContainer = document.querySelector("[data-upSell='payNow-modal-card-container']");
    if (!payNowContainer) return;
    if(this.$selectedProgram.length == programs.length){
      payNowContainer.innerHTML = '';
      return;
    }
    payNowContainer.innerHTML = '';
    // Sort programs: selected programs first, then the rest
    programs = [
      ...programs.filter(p => this.$selectedProgram.some(sel => sel.upsellProgramId === p.upsellProgramId)),
      ...programs.filter(p => !this.$selectedProgram.some(sel => sel.upsellProgramId === p.upsellProgramId))
    ];
    programs.forEach(program => {
      // Show "Already selected program(s)" title only once at the top if more than one program is selected
      const card = this.createPayNowModalCard(program);
      payNowContainer.appendChild(card);
    });
  }
}
