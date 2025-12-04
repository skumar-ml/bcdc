/*

Purpose: Manages class detail page for bundle purchases with Stripe payment processing. Handles pre-registration flow, bundle program selection, location selection, supplementary programs, and briefs integration.

Brief Logic: Checks if program is a bundle and determines checkout flow (Normal, Pre-Registration-Info, or Bundle-Purchase). Fetches class details, handles location and session selection, manages supplementary programs and briefs, calculates pricing with discounts, and processes payment through Stripe.

Are there any dependent JS files: Yes, Utils.js
Utils.js provides common functionality for modal management, credit data fetching, and API calls.


*/

/**
 *
 * @param name - HTML element name
 * @param className - HTML element class attribute
 * @param idName - HTML element id attribute
 */
function creEl(name, className, idName) {
  var el = document.createElement(name);
  if (className) {
    el.className = className;
  }
  if (idName) {
    el.setAttribute("id", idName);
  }
  return el;
}


class classDetailsStripe {
  $suppPro = [];
  $isPrevStudent = false;
  $selectedProgram = [];
  $oldSelectedProgram = [];
  $coreData = [];
  $isCheckoutFlow = "Normal"; // Normal | Pre-Registration-Info | Bundle-Purchase
  $selectedBundleProgram = null;
  $allBundlePrograms = [];
  $allSuppData = [];
  constructor(
    baseUrl,
    webflowMemberId,
    accountEmail,
    levelId,
    parentName,
    amount,
    typeFBaseUrl,
    typeEBaseUrl
  ) {
    this.baseUrl = baseUrl;
    this.typeFBaseUrl = typeFBaseUrl;
    this.typeEBaseUrl = typeEBaseUrl;
    this.webflowMemberId = webflowMemberId;
    this.accountEmail = accountEmail;
    this.levelId = levelId;
    this.parentName = parentName;
    this.amount = amount;
    this.discount_amount = parseInt(amount)
    this.spinner = document.getElementById("half-circle-spinner");
    this.modal = document.getElementById("briefs-preview-modal");
    this.iframe = document.getElementById("preview-frame");
    this.closeBtn = document.getElementById("close-preview");
    //this.checkBundleProgram();
    this.checkBundleProgram();
    this.renderCheckoutData();
    this.initializeToolTips();
    this.updatePriceForCardPayment();
    this.initiateLightbox();
    this.initBriefs();
    this.displayTopicData("none")
    // check pre registered bundle program

  }
  // checkBundleProgram
  async checkBundleProgram() {
    let preRegistration = document.querySelector("[data-checkout='pre-registration']");
    let registration = document.querySelector("[data-checkout='registration']");
    let isBundle = "Pre-Registration-Info";
    if (preRegistration) {
      preRegistration.style.display = "none";
    }
    if (registration) {
      registration.style.display = "none";
    }
    // Logic to check if the program is a bundle
    await this.fetchData("getYearLongBundleDetails/" + this.webflowMemberId)
      .then((data) => {
        if (data.message && data.data.length == 0 && data.message == "Either pre-registration not yet started or already ended") {
          isBundle = "Normal";
        }
        else if (data.data && data.data.length == 0 && data.message == "Pre-registration is going on") {
          isBundle = "Pre-Registration-Info";
        } else if (data.data && data.data.length > 0 && data.message == "Pre-registration is going on") {
          isBundle = "Bundle-Purchase";
        } else {
          isBundle = "Normal";
        }
        // TODO: Explain what is tracked in allBundlePrograms
        this.$allBundlePrograms = data.data;

        // TODO: Shouldn't we only be calling this if isBundle is Pre-Registration-Info?
        if (data.preRegistrationEndDate) {
          this.updateCountdown(data.preRegistrationEndDate);
          setInterval(() => {
            this.updateCountdown(data.preRegistrationEndDate);
          }, 1000);
        }

      });

    this.$isCheckoutFlow = isBundle;

    // TODO: I don't understand why we have if (preRegistration). Isn't this always true, since we are selecting the element? Ditto below with registration. Could be that I'm just not familiar with this design-pattern. Seems like we should just have if-else with isBundle instead.
    if (preRegistration) {
      preRegistration.style.display = isBundle == "Pre-Registration-Info" ? "block" : "none";
    }
    if (registration) {
      registration.style.display = isBundle == "Bundle-Purchase" || isBundle == "Normal" ? "grid" : "none";
    }
    if (isBundle == "Bundle-Purchase") {
      this.updateDepositePriceForBundle()
      const checkout_student_container = document.getElementById("checkout_student_container");
      // for="existing-students" change label text to "Select Student Info"
      let existingStudentLabel = document.querySelector("label[for='existing-students']");
      if (existingStudentLabel) {
        existingStudentLabel.innerText = "Select Student Info";
      }
      if (checkout_student_container) {
        checkout_student_container.style.display = "none";
      }
    }
    this.updateOldStudentList();
    return isBundle;
  }
  // Creating main dom for location
  viewClassLocations(data) {
    const selectField = document.getElementById("location-select-field");
    //submit-class
    const submitClassPayment = document.getElementById("submit-class");
    const preRegistrationDiv = document.getElementById("pre_registration_btn");
    var $this = this;
    // Create an object to store class times by location
    const classTimesData = {};

    // Create option variable
    var locationOption = "";
    // initially blank the location option to fill dynamic value
    //selectField.innerHTML = "";

    // Process the API response
    data[0].forEach((level) => {
      level.location.forEach((location) => {
        //  create option element and add value and text in option
        locationOption = creEl("option");
        locationOption.valueOf = location.locationName
          .toLowerCase()
          .replace(/\s/g, "-");
        locationOption.value = location.locationName
          .toLowerCase()
          .replace(/\s/g, "-");
        locationOption.innerHTML = location.locationName;
        locationOption.setAttribute(
          "responseText",
          btoa(JSON.stringify(location))
        );
        // Append option in select list
        selectField.appendChild(locationOption);
        // Format the class timing as a combined string: "Day StartTime - EndTime"
        classTimesData[
          location.locationName.toLowerCase().replace(/\s/g, "-")
        ] = location.timing.map((timing) => {
          return {
            timing_text: `${timing.day} ${timing.startTime} - ${timing.endTime}`,
            classId: timing.classUniqueId,
            levelName: level.levelName,
            numberOfSpots: timing.numberOfSpots,
            leftSpots: timing.leftSpots,
            waitListLink:
              "https://form.jotform.com/231870526936160?classlevel=" +
              level.levelName +
              "&classlocation=" +
              location.locationName +
              "&classday=" +
              timing.day +
              "&classtime=" +
              timing.startTime +
              "&classspots=" +
              timing.leftSpots +
              "&memberId=" +
              this.webflowMemberId +
              "&classUniqueId=" +
              timing.classUniqueId +
              "&parentEmail=" +
              this.accountEmail,
          };
        });
      });
    });

    const classTimesContainer = document.querySelector(
      ".class-times-grid-wrapper"
    );
    const classTimeDiv = document.getElementById("select-class-time-div");
    const paymentMethodsDiv = document.getElementById("payment-methods");

    // When the user selects a location, update the class times
    selectField.addEventListener("change", function () {
      $this.updateCheckOutData({ location: this.value })
      $this.updateClassTimes(
        this.value,
        classTimesData,
        classTimesContainer,
        classTimeDiv,
        paymentMethodsDiv
      );
    });

    classTimeDiv.classList.add("hide");
    paymentMethodsDiv.classList.add("hide");

    if (this.levelId == "customizedtrack") {
      $this.updateClassTimes(
        "none",
        classTimesData,
        classTimesContainer,
        classTimeDiv,
        paymentMethodsDiv
      );
      let locationForm = document.getElementById("email-form-2");
      let label = document.querySelector(".class-time");
      let joinWaitListEl = document.getElementById("join-waitlist-class");
      let heading = document.querySelector(
        ".node-title.margin-bottom-20.margin-top-0"
      );
      //select-class-time-div
      paymentMethodsDiv.classList.remove("hide");
      locationForm.style.display = "none";
      if (label) {
        label.classList.add("class-time-with-brown-white-style");
      }
      if (joinWaitListEl) {
        joinWaitListEl.style.display = "none";
      }
      if (heading) {
        heading.style.display = "none";
      }
      if (selectField) {
        selectField.value = "none";
      }
      if (classTimeDiv) {
        classTimeDiv.style.display = "none";
      }
    }

    // add event listener when  trying to payment
    // submitClassPayment
    [preRegistrationDiv, submitClassPayment].forEach((element) => {
      element.addEventListener("click", async function (event) {
        event.preventDefault();
        submitClassPayment.style.pointerEvents = "none";

        let selectedOption = selectField.options[selectField.selectedIndex];
        let responseText = selectedOption.getAttribute("responseText");

        responseText = JSON.parse(atob(responseText));
        let timingTextElement = document.querySelector(
          ".class-time.class-time-with-brown-white-style"
        );
        let timingText = timingTextElement.innerHTML;
        let classId = timingTextElement.getAttribute("classId");
        let levelName = timingTextElement.getAttribute("levelName");


        let paymentTab = document.querySelector(
          ".payment-cards-tabs-menu a.w--current"
        );
        let paymentType =
          paymentTab.getAttribute("data-w-tab") == "Tab 1" ? "ach" : "card";
        let has_fee = paymentType == "card" ? true : false;
        await $this.initializeStripePayment(
          submitClassPayment,
          responseText,
          timingText,
          selectField,
          paymentType,
          has_fee,
          classId,
          levelName,
          preRegistrationDiv
        );
      });
    });
  }

  //-------------Start new code for stripe payment integration----------------

  // Call API url with this method and response as a json
  async fetchData(endpoint, baseUrl) {
    var apiBaseUrl = this.baseUrl;
    if (baseUrl) {
      apiBaseUrl = baseUrl
    }
    try {
      const response = await fetch(`${apiBaseUrl}${endpoint}`);
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
  // Setup back button for stripe back button and browser back button
  setUpBackButtonTab() {
    return;
    this.spinner.style.display = "block";
    var query = window.location.search;
    var urlPar = new URLSearchParams(query);
    var returnType = urlPar.get("returnType");
    // Get local storage data for back button
    var checkoutJson = localStorage.getItem("checkOutData");

    if (checkoutJson != undefined) {
      var paymentData = JSON.parse(checkoutJson);
    } else {
      setTimeout(() => { this.spinner.style.display = "none"; }, 500);
      return;
    }
    if (paymentData.memberId !== this.webflowMemberId) {
      return;
    }
    if (this.$isCheckoutFlow == "Bundle-Purchase" || this.levelId == 'worldschools') {
      return;
    }

    // check createdOn date for back button
    if (paymentData.createdOn == undefined) {
      setTimeout(() => { this.spinner.style.display = "none"; }, 500);
      return;
    }
    if (this.checkBackButtonEvent() && checkoutJson != undefined) {
      var paymentData = JSON.parse(checkoutJson);

      var studentFirstName = document.getElementById("Student-First-Name");
      var studentLastName = document.getElementById("Student-Last-Name");
      var studentEmail = document.getElementById("Student-Email");
      var studentGrade = document.getElementById("Student-Grade");
      var studentSchool = document.getElementById("Student-School");
      var studentGender = document.getElementById("Student-Gender");
      var prevStudent = document.getElementById("prevStudent");
      var fort_lee_location = document.getElementById("fort_lee_location");
      var glen_rock_location = document.getElementById("glen_rock_location");
      // Update all local storage data
      studentEmail.value = paymentData.studentEmail;

      // id paymentData available fullname with key studentName then split first and last name

      if (paymentData.studentName) {
        const [firstName, lastName] = paymentData.studentName.split(" ");
        if (firstName && lastName) {
          studentFirstName.value = firstName;
          studentLastName.value = lastName;
        }
      }
      if (paymentData.firstName) {
        studentFirstName.value = paymentData.firstName;
      }
      if (paymentData.lastName) {
        studentLastName.value = paymentData.lastName;
      }

      if (paymentData.grade) {
        studentGrade.value = paymentData.grade;
      }

      if (paymentData.school) {
        studentSchool.value = paymentData.school;
      }

      if (paymentData.gender) {
        studentGender.value = paymentData.gender;
      }
      if (paymentData.prevStudent) {
        prevStudent.value = paymentData.prevStudent;
      } else {
        prevStudent.value = "No";
      }

      // match studentEmail with allBundlePrograms studentEmail and assign match bundle program as a selectedBundleProgram 
      if (this.$allBundlePrograms.length > 0) {
        const matchedProgram = this.$allBundlePrograms.find(
          (program) => program.studentName.replace(" ", "").toLowerCase() === (paymentData.firstName.replace(" ", "").toLowerCase() + paymentData.lastName.replace(" ", "").toLowerCase())
        );
        if (matchedProgram) {
          this.$selectedBundleProgram = matchedProgram;
          this.$isCheckoutFlow = "Bundle-Purchase";
        } else {
          this.$selectedBundleProgram = null;
          this.$isCheckoutFlow = "Normal";
        }
      }

      if (!paymentData.checkoutData) {
        this.storeBasicData();
        this.AddStudentData();
        this.activeBreadCrumb("select-class");
        this.activateDiv("class-selection-container");
        this.displayStudentInfo("block");
        this.displayTopicData("block")
      } else {
        this.displayStudentInfo("block");
        this.displayTopicData("none")
      }


      if (paymentData.checkoutData) {
        //this.$checkoutData = paymentData.checkoutData;
        // Will debug latter
        this.activateDiv('class-selection-container');
        const selectField = document.getElementById("location-select-field");
        // Set the selected location in the dropdown
        if (paymentData.location) {
          // check select field values is present in the select field
          if (Array.from(selectField.options).some(option => option.value === paymentData.location)) {
            selectField.value = paymentData.location;
            // trigger change event to update class times
            selectField.dispatchEvent(new Event("change"));
          }
        }
      }
      if (!paymentData.isPreviousStudent) {
        this.$isPrevStudent = paymentData.isPreviousStudent;
        this.checkUncheckOldStudentCheckBox(paymentData.isPreviousStudent, this);
      }
      // if (paymentData.upsellProgramIds && paymentData.upsellProgramIds.length > 0) {
      //   let addToCartBtn = document.getElementById("add-to-cart");
      //   if (addToCartBtn) {
      //     addToCartBtn.click();
      //   }
      // }
      this.createBundlePrograms(this.$allSuppData);
      this.updateBundleProgram(paymentData)
    } else {
      // removed local storage when checkout page rendar direct without back button
      localStorage.removeItem("checkOutData");
    }
    setTimeout(() => { this.spinner.style.display = "none"; }, 500);
  }
  // update Addon program based on local storage data
  updateBundleProgram(paymentData) {
    if (paymentData.selectedProgram && paymentData.suppPro.length > 0) {
      this.updateSupplementaryProgramData(paymentData.suppPro);
      //this.$selectedProgram = paymentData.selectedProgram;
      this.displaySelectedSuppProgram(paymentData.upsellProgramIds);
      if (paymentData.selectedProgram.length > 0) {
        this.hideShowNewStudentFee("none");
        this.$selectedProgram.forEach((program) => {
          this.updateAmount(program.amount);
        });
      } else {
        this.hideShowNewStudentFee("grid");
      }

      // checked and unchecked all elements based on data-upsell-program-id
      setTimeout(() => {
        const allCheckboxes = document.querySelectorAll("[programDetailId]");
        allCheckboxes.forEach((checkbox) => {
          if (paymentData.upsellProgramIds.includes(parseInt(checkbox.getAttribute("programDetailId")))) {
            checkbox.checked = true;
          }
        });
      }, 1000);
      this.disableEnableBuyNowButton();

    }
  }
  // store basic student form data in local storage
  storeBasicData() {
    var studentFirstName = document.getElementById("Student-First-Name");
    var studentLastName = document.getElementById("Student-Last-Name");
    var studentEmail = document.getElementById("Student-Email");
    var studentGrade = document.getElementById("Student-Grade");
    var studentSchool = document.getElementById("Student-School");
    var studentGender = document.getElementById("Student-Gender");
    var prevStudent = document.getElementById("prevStudent");
    var studentName = document.getElementById("studentName");
    //save data in local storage
    var data = {
      studentEmail: studentEmail.value,
      firstName: studentFirstName.value,
      lastName: studentLastName.value,
      grade: studentGrade.value,
      school: studentSchool.value,
      gender: studentGender.value,
      prevStudent: prevStudent.value,
    };
    this.checkOldStudent(
      studentEmail.value,
      studentFirstName.value,
      studentLastName.value
    );
    // match studentEmail with allBundlePrograms studentEmail and assign match bundle program as a selectedBundleProgram
    if (this.$allBundlePrograms.length > 0) {
      // remove whitespace and convert to lowercase before compare
      const matchedProgram = this.$allBundlePrograms.find(
        (program) => program.studentName.replace(" ", "").toLowerCase() === (studentFirstName.value.replace(" ", "").toLowerCase() + studentLastName.value.replace(" ", "").toLowerCase())
      );
      if (matchedProgram) {
        this.$selectedBundleProgram = matchedProgram;
        this.$isCheckoutFlow = "Bundle-Purchase";
      }
    }
    studentName.innerHTML = studentFirstName.value + ' ' + studentLastName.value;
    localStorage.setItem("checkOutBasicData", JSON.stringify(data));
  }
  // check old student records
  checkOldStudent(sEmail, sFirstName, sLastName) {
    return new Promise((resolve, reject) => {
      var data = {
        email: this.accountEmail,
        studentEmail: sEmail,
        firstName: sFirstName,
        lastName: sLastName,
      };
      //return;
      var xhr = new XMLHttpRequest();
      var $this = this;
      xhr.open(
        "POST",
        "https://b4z5gqv2xj.execute-api.us-east-1.amazonaws.com/prod/camp/checkPreviousStudent",
        true
      );
      xhr.withCredentials = false;
      xhr.send(JSON.stringify(data));
      xhr.onload = function () {
        if (xhr.status == 200) {
          let responseText = JSON.parse(xhr.responseText);
          let isPreviousStudent = responseText.isPreviousStudent;
          $this.$isPrevStudent = responseText.isPreviousStudent
          $this.checkUncheckOldStudentCheckBox(isPreviousStudent, $this);
          resolve(isPreviousStudent);
        } else {
          reject(xhr.status);
        }
      };
    });
  }
  // formatting price in comma based value

  numberWithCommas(x) {
    x = parseFloat(x).toFixed(2)
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // trim to 2 decimal places without rounding
  trimToTwoDecimals(x) {
    const num = parseFloat(x);
    return Math.floor(num * 100) / 100;
  }
  checkUncheckOldStudentCheckBox(isPreviousStudent, $this) {
    const prevStudentCheckBox = document.getElementsByClassName(
      "prev_student_checkbox"
    );
    // if(isPreviousStudent){
    //   return;
    // }
    let total_price = document.getElementsByClassName("total_price");
    const totalAmount = parseFloat(
      total_price[0].innerHTML.replace(/,/g, "").replace(/\$/g, "")
    );

    var $this = this;
    for (let i = 0; i < prevStudentCheckBox.length; i++) {
      if (!isPreviousStudent) {
        if (!prevStudentCheckBox[i].checked) {
          prevStudentCheckBox[i].click();
          $this.$isPrevStudent = true;
        }
      } else {
        if (prevStudentCheckBox[i].checked) {
          prevStudentCheckBox[i].click();
        }
      }

    }
  }
  eventUpdateTotalAmountPrice() {
    let prevStudentCheckBox = document.getElementsByClassName(
      "prev_student_checkbox"
    );
    let total_price = document.getElementsByClassName("total_price");
    let totalAmount = parseFloat(
      total_price[0].innerHTML.replace(/,/g, "").replace(/\$/g, "")
    );
    var $this = this;
    for (let i = 0; i < prevStudentCheckBox.length; i++) {
      prevStudentCheckBox[i].addEventListener("change", function (ele) {
        if (prevStudentCheckBox[i].checked) {
          $this.$isPrevStudent = true;
          for (let j = 0; j < total_price.length; j++) {
            total_price[j].innerHTML =
              "$" + $this.numberWithCommas(totalAmount + 100);
          }
          prevStudentCheckBox[i].setAttribute("checked", true);
        } else {
          $this.$isPrevStudent = false;
          for (let j = 0; j < total_price.length; j++) {
            total_price[j].innerHTML =
              "$" + $this.numberWithCommas(totalAmount);
          }
          prevStudentCheckBox[i].removeAttribute("checked");
        }
      });
    }
  }
  // Get waitlist alert message
  getAlertMessage(timeData) {
    var numberOfSpots = timeData.numberOfSpots;
    var leftSpots = timeData.leftSpots;
    var message = "";
    var leftSpotsPercentage = (100 * leftSpots) / numberOfSpots;
    if (leftSpotsPercentage <= 0) {
      message = {};
      message.type = "waitlist";
      message.class = "yellow-info-text";
      message.message = "Seats are full you can fill the wait list forms below";
    } else if (leftSpotsPercentage <= 25) {
      message = {};
      message.type = "filling_fast";
      message.class = "brown-info-text";
      message.message =
        "Hurry! Register now. Seats filling up fast! only <b>" +
        leftSpots +
        " spot left</b>";
    }
    return message;
  }
  /**
   * initialize Lightbox and rerender accordion after close the lightbox
   */
  initiateLightbox() {
    var $this = this;
    [].forEach.call(
      document.getElementsByClassName("iframe-lightbox-link"),
      function (el) {
        el.lightbox = new IframeLightbox(el, {
          onClosed: function () {
            var spinner = document.getElementById("half-circle-spinner");
            spinner.style.display = "block";
            setTimeout(function () {
              new classDetails(
                api,
                $this.webflowMemberId,
                $this.accountEmail,
                $this.levelId
              );
            }, 500);
          },
          scrolling: true,
        });
      }
    );
  }
  // Add Custom tooltip
  initializeToolTips() {
    const elements = [...document.querySelectorAll("[tip]")];
    var i = 0;
    for (const el of elements) {
      //console.log('el', el)
      const tip = document.createElement("div");
      tip.innerHTML = "";
      tip.classList.add("tooltip");
      tip.textContent = el.getAttribute("tip");
      const x = el.hasAttribute("tip-left") ? "calc(-100% - 5px)" : "16px";
      const y = el.hasAttribute("tip-top") ? "-100%" : "0";
      tip.style.transform = `translate(${x}, ${y})`;
      el.appendChild(tip);
      el.onpointermove = (e) => {
        if (e.target !== e.currentTarget) return;

        const rect = tip.getBoundingClientRect();
        const rectWidth = rect.width + 16;
        const vWidth = window.innerWidth - rectWidth;
        const rectX = el.hasAttribute("tip-left")
          ? e.clientX - rectWidth
          : e.clientX + rectWidth;
        const minX = el.hasAttribute("tip-left") ? 0 : rectX;
        const maxX = el.hasAttribute("tip-left") ? vWidth : window.innerWidth;
        const x = rectX < minX ? rectWidth : rectX > maxX ? vWidth : e.clientX;
        tip.style.left = `${x}px`;
        tip.style.top = `${e.clientY}px`;
      };
    }
    this.eventUpdateTotalAmountPrice();
  } t
  // update basic student form data from local storage
  updateBasicData(old_student = false) {
    var checkoutJson = localStorage.getItem("checkOutBasicData");
    if (checkoutJson != undefined) {
      var paymentData = JSON.parse(checkoutJson);
      var studentFirstName = document.getElementById("Student-First-Name");
      var studentLastName = document.getElementById("Student-Last-Name");
      var studentEmail = document.getElementById("Student-Email");
      var studentGrade = document.getElementById("Student-Grade");
      var studentSchool = document.getElementById("Student-School");
      var studentGender = document.getElementById("Student-Gender");
      var prevStudent = document.getElementById("prevStudent");


      studentEmail.value = paymentData.studentEmail;

      if (paymentData.studentName) {
        const [firstName, lastName] = paymentData.studentName.split(" ");
        if (firstName && lastName) {
          studentFirstName.value = firstName;
          studentLastName.value = lastName;
        }
      }

      if (paymentData.firstName) {
        studentFirstName.value = paymentData.firstName;
      }

      if (paymentData.lastName) {
        studentLastName.value = paymentData.lastName;
      }

      if (paymentData.grade) {
        studentGrade.value = paymentData.grade.toLowerCase();
      }

      if (paymentData.school) {
        studentSchool.value = paymentData.school;
      }

      if (paymentData.gender) {
        studentGender.value = paymentData.gender;
      }
      if (old_student) {
        prevStudent.value = "Yes";
      } else {
        prevStudent.value = paymentData.prevStudent;
      }
    }
  }
  // Managing next and previous button
  addEventForPrevNaxt() {
    var next_page_1 = document.getElementById("next_page_1");
    var prev_page_1 = document.getElementById("prev_page_1");
    var pflabs_prev_page_1 = document.getElementById("pflabs_prev_page_1");
    const selectField = document.getElementById("location-select-field");

    var $this = this;
    var form = $("#checkout-form");
    next_page_1.addEventListener("click", async function (event) {
      event.preventDefault();
      next_page_1.style.pointerEvents = "none";
      setTimeout(() => {
        next_page_1.style.pointerEvents = "auto";
      }, 3000);
      // check bundle purchase flow
      $this.checkBundlePurchaseFlow();
      $this.updateDepositePriceForBundle();
      // existing-students required if this.$isCheckoutFlow is Bundle-Purchase
      let existingStudents = document.getElementById("existing-students");
      var studentEmail = document.getElementById("Student-Email");

      $this.createBundlePrograms($this.$allSuppData);
      var totalAmountInput = document.getElementById("totalAmount");
      $this.updateAmount(totalAmountInput.value)

      if ($this.$selectedProgram.length > 0) {
        // Get local storage data for back button
        var checkoutJson = localStorage.getItem("checkOutData");
        if (checkoutJson != undefined) {
          var paymentData = JSON.parse(checkoutJson);
          // update bundle program based on local storage data
          $this.updateBundleProgram(paymentData);
        }
      }

      let existingStudentLabel = document.querySelector("label[for='existing-students']");
      if (existingStudentLabel.innerText == "Select Student Info") {
        if (existingStudents) {
          existingStudents.setAttribute("required", "true");
        }
      } else {
        if (existingStudents) {
          existingStudents.removeAttribute("required");
        }
      }
      if (form.valid()) {
        var eligible = true;

        $this.storeBasicData();
        $this.AddStudentData();

        if ($this.levelId == 'worldschools') {
          eligible = false;
        }
        if (eligible) {
          $this.showSemesterBundleModal();

          // trigger change event to update class times, Removed world school condition
          if ($this.levelId != 'customizedtrack') {
            selectField.value = "";
            selectField.dispatchEvent(new Event("change"));
          }
          $this.activeBreadCrumb("select-class");
          $this.activateDiv("class-selection-container");
          $this.displayStudentInfo("block");
          $this.displayTopicData("block")
        } else {
          $this.activateDiv('pf_labs_error_message');
        }

      }
    });

    prev_page_1.addEventListener("click", function () {
      $this.activeBreadCrumb("student-details");
      $this.activateDiv("checkout_student_details");
      $this.displayStudentInfo("none");
      $this.displayTopicData("none")
    });

    let editStudentEl = document.querySelectorAll("[data-student-info='edit']")
    if (editStudentEl.length > 0) {
      editStudentEl.forEach(editBtn => {
        editBtn.addEventListener("click", function () {
          // click on edit button reinitialize payment tab
          $this.activeBreadCrumb("student-details");
          $this.activateDiv("checkout_student_details");
          $this.displayStudentInfo("none");
          $this.displayTopicData("none")
        })
      })
    }

    pflabs_prev_page_1.addEventListener('click', function () {
      $this.activeBreadCrumb("student-details");
      $this.activateDiv("checkout_student_details");
      $this.displayStudentInfo("none");
      $this.displayTopicData("none")
    })

    // Coupon code event
    //Coupon code variable
    var coupon_code_button = document.getElementById('coupon_code_button');
    var coupon_2f_code = document.getElementById('coupon_2f_code');
    var code2fErrorMsg = document.getElementById('code-2f-error-msg');
    //Added event for validate 2F coupon code
    coupon_code_button.addEventListener('click', function (event) {
      event.preventDefault();
      if (coupon_2f_code.value == '') {
        code2fErrorMsg.style.display = 'block';
        code2fErrorMsg.innerHTML = 'Please insert coupon code';
      } else if (coupon_2f_code.value != 'qp4wM1hDXZ') {
        code2fErrorMsg.style.display = 'block';
        code2fErrorMsg.innerHTML = 'The code you entered is invalid. Please enter a different code.';
      } else {
        code2fErrorMsg.style.display = 'none';
        $this.showSemesterBundleModal();
        // selectField.value = "";
        // // trigger change event to update class times
        // selectField.dispatchEvent(new Event("change"));
        $this.activeBreadCrumb("select-class");
        $this.activateDiv("class-selection-container");
        $this.displayStudentInfo("block");
        $this.displayTopicData("block");
      }
    })
  }
  // Hide and show tab for program selection, student info and checkout payment
  activateDiv(divId) {
    var divIds = ["checkout_student_details", "pf_labs_error_message", "class-selection-container"];
    // Remove the active class from all div elements
    divIds.forEach((id) =>
      document.getElementById(id).classList.remove("active_checkout_tab")
    );
    // Add the active class to the div with the specified id
    document.getElementById(divId).classList.add("active_checkout_tab");
  }
  //----------------End new code for stripe payment integration---------------
  // get data from api and pass the data to classLocation class
  async renderCheckoutData(memberId) {
    try {
      this.spinner.style.display = "block";
      // -------------Start new code for stripe payment integration--------------
      // Modal No thanks events
      this.noThanksEvent();
      // Handle previous and next button
      this.addEventForPrevNaxt();
      // New Code Added
      this.activateDiv("checkout_student_details");
      // Update basic data
      this.updateBasicData();

      // -------------End new code for stripe payment integration---------------
      const data = await this.fetchData(
        "getClassDetailByMemberIdAndLevelId?levelId=" +
        this.levelId +
        "&memberId=" +
        this.webflowMemberId
      );
      this.viewClassLocations(data);
      var suppData = await this.fetchData("getUpsellProgramV2", this.typeEBaseUrl);
      this.$allSuppData = suppData;
      // Check if there are any upsell programs
      var academicSuppData = suppData.find((item) => {
        return item.sessionId !== 2;
      });
      //this.$suppPro = academicSuppData ? academicSuppData.upsellPrograms : [];
      this.updateSupplementaryProgramData(academicSuppData ? academicSuppData.upsellPrograms : [])
      //this.updateAddonProgram();
      // Setup back button for browser and stripe checkout page
      this.setUpBackButtonTab();
      // Onload render bundle programs
      this.createBundlePrograms(suppData);

      this.spinner.style.display = "none";

    } catch (error) {
      this.spinner.style.display = "none";
      console.error("Error rendering random number:", error);
    }
  }
  getSelectedBundleProgram() {
    // added code for up-sell program
    var suppProIdE = document.getElementById("suppProIds");
    let upsellProgramIds =
      JSON.parse(suppProIdE.value).length > 0
        ? JSON.parse(suppProIdE.value).map(Number)
        : [];
    // Remove core program id from upsellProgramIds if present
    if (this.$coreData && this.$coreData.upsellProgramId) {
      upsellProgramIds = upsellProgramIds.filter(
        id => id !== this.$coreData.upsellProgramId
      );
    }
    upsellProgramIds = [...new Set(upsellProgramIds)];
    return upsellProgramIds;
  }
  // API call for stripe checkout URL
  async initializeStripePayment(
    locationActionLink,
    responseText,
    timingText,
    selectBox,
    type,
    has_fee,
    classId,
    levelName,
    preRegistrationDiv = null
  ) {

    // Open Bergen credits modal and wait for user's decision
    // This will show the modal, fetch credit data, and wait for user to choose apply/no
    //const applyCredit = await Utils.waitForCreditApplicationChoice(this.webflowMemberId);
    const applyCredit = false;

    // applyCredit is now set: true if "apply" was clicked, false if "no" was clicked
    console.log("Apply credit:", applyCredit);

    var label;
    if (responseText.locationName != "None") {
      label =
        responseText.locationName + " | " + levelName + " | " + timingText;
    } else {
      // label = this.levelId == "worldschools" ? "World Schools" : "Customized Track";
      label = "Customized Track";
    }

    var iBackButton = document.getElementById("backbuttonstate");

    //Payment button
    //console.log('event', locationActionLink)
    locationActionLink.innerHTML = "Processing...";
    locationActionLink.disabled = true;
    preRegistrationDiv.innerHTML = "Processing...";
    preRegistrationDiv.disabled = true;
    // Get selected up-sell program ids
    var upsellProgramIds = this.getSelectedBundleProgram();
    //var cancelUrl = new URL("https://www.nsdebatecamp.com"+window.location.pathname);
    var cancelUrl = new URL(window.location.href);
    //console.log(window.location.href)
    cancelUrl.searchParams.append("returnType", "back");
    //console.log(cancelUrl)
    var checkOutLocalData = localStorage.getItem("checkOutData");
    if (checkOutLocalData == undefined) {
      return;
    }
    checkOutLocalData = JSON.parse(checkOutLocalData);
    var finalPrice = this.amount * 100;
    if (this.$selectedProgram.length > 0) {
      finalPrice = this.$coreData.amount * 100;
    }
    var data = {
      checkoutId: checkOutLocalData.checkoutData.checkoutId,
      label: label,
      classUniqueId: classId,
      location: selectBox.value,
      memberId: this.webflowMemberId,
      //added id for up-sell program
      upsellProgramIds: upsellProgramIds,
      has_fee: has_fee,
      source: "cart_page",
      amount: finalPrice,
      applyCredit: applyCredit,
      successUrl: encodeURI(
        "https://www.bergendebate.com/payment-confirmation?type=Academic&programName=" +
        label +
        "&pType=" +
        type
      ),
      cancelUrl: cancelUrl.href.includes("file:///")
        ? "https://www.bergendebate.com/payment-confirmation"
        : cancelUrl.href,
    };

    if (this.$isCheckoutFlow == "Bundle-Purchase") {
      data.paymentId = this.$selectedBundleProgram.paymentId;
      data.isBundleProgram = true;
      data.classUniqueId = classId;
    }
    if (this.$isCheckoutFlow == "Bundle-Purchase" && (upsellProgramIds.length > 0 || this.selectedBriefs.length > 0)) {
      // Add Briefs data if selected
      if (this.selectedBriefs.length > 0) {
        data.topics = this.selectedBriefs.map(brief => ({
          topicId: brief.topicId,
          version: brief.version === 'full' ? 'full_version' : 'light_version'
        }))
      }
      this.initSupplementaryPayment(data, type);
    } else {
      // Add Briefs data if selected
      if (this.selectedBriefs.length > 0) {
        data.topics = this.selectedBriefs.map(brief => ({
          topicId: brief.topicId,
          version: brief.version === 'full' ? 'full_version' : 'light_version'
        }))
      }

      //console.log('Data !!!!!', data)
      //return;
      var xhr = new XMLHttpRequest();
      var $this = this;
      xhr.open(
        "POST",
        "https://nqxxsp0jzd.execute-api.us-east-1.amazonaws.com/prod/camp/updateDataToCheckoutUrl",
        true
      );
      xhr.withCredentials = false;
      xhr.send(JSON.stringify(data));
      xhr.onload = function () {
        let responseText = JSON.parse(xhr.responseText);
        //console.log('responseText', responseText)
        if (responseText.success) {
          $this.$checkoutData = responseText;

          //Storing data in local storage
          //data = [...checkOutLocalData, ...data]
          data.checkoutId = responseText;
          //localStorage.setItem("checkOutData", JSON.stringify(data));

          $this.updateCheckOutData(data)

          iBackButton.value = "1";
          //window.location.href = responseText.cardUrl;
          if (type == "card") {
            window.location.href = responseText.cardUrl;
          } else {
            window.location.href = responseText.achUrl;
          }
        } else {
          window.location.href = 'https://www.bergendebate.com/portal/dashboard';
        }
      }
    };
  }

  initSupplementaryPayment(data, type) {
    // Create the POST request
    fetch("https://nqxxsp0jzd.execute-api.us-east-1.amazonaws.com/prod/camp/checkoutUrlForUpsellProgram", {
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
        if (data.success) {
          if (type == "card") {
            window.location.href = data.cardUrl;
          } else {
            window.location.href = data.achUrl;
          }
        }
      })
      .catch((error) => {
        console.error("There was a problem with the fetch operation:", error); // Handle errors
      });
  }
  updateClassTimes(
    selectedLocation,
    classTimesData,
    classTimesContainer,
    classTimeDiv,
    paymentMethodsDiv
  ) {
    let joinWaitListEl = document.getElementById("join-waitlist-class");
    const submitClassPayment = document.getElementById("submit-class");
    var $this = this;
    let pre_registration_btn = document.querySelector('[data-checkout="pre-registration-btn"]');
    pre_registration_btn.classList.add("hide");
    classTimesContainer.innerHTML = ""; // Clear previous times
    paymentMethodsDiv.classList.add("hide"); // Hide payment methods initially

    if (!selectedLocation || !classTimesData[selectedLocation]) {
      classTimeDiv.classList.add("hide");
      return;
    }

    classTimeDiv.classList.remove("hide");

    // Create labels for each timing and add them to the classTimesContainer
    classTimesData[selectedLocation].forEach((time) => {
      const label = document.createElement("label");
      label.className = "form-label class-time"; // Initially gray
      label.textContent = time.timing_text;
      label.setAttribute("classId", time.classId);
      label.setAttribute("levelName", time.levelName);

      // Click event to make the selected time red and show payment methods
      label.addEventListener("click", function () {
        document
          .querySelectorAll(".class-times-grid-wrapper .form-label")
          .forEach((lbl) =>
            lbl.classList.remove("class-time-with-brown-white-style")
          ); // Remove red from others

        label.classList.add("class-time-with-brown-white-style"); // Make selected red
        if ($this.$isCheckoutFlow == "Bundle-Purchase") {
          pre_registration_btn.classList.remove("hide");
          // Hide payment methods for bundle purchase and not as supplementary program
          var upsellProgramIds = $this.getSelectedBundleProgram();
          if (upsellProgramIds.length == 0 && $this.selectedBriefs.length == 0) {
            paymentMethodsDiv.classList.add("hide");
            submitClassPayment.style.display = "block";
          } else {
            paymentMethodsDiv.classList.remove("hide");
            submitClassPayment.style.display = "none";
          }
        } else {
          paymentMethodsDiv.classList.remove("hide");
        }

        let timingTextElement = document.querySelector(
          ".class-time.class-time-with-brown-white-style"
        );
        let actionType = timingTextElement.getAttribute("action-type");
        let payment_option = document.querySelector('.payment_option')
        if (actionType == "waitlist") {
          paymentMethodsDiv.classList.remove("hide");
          pre_registration_btn.classList.add("hide");
          payment_option.classList.add("hide"); // Show payment methods
        } else {
          payment_option.classList.remove("hide");
        }
        // hide and show join wait list link



        let waitLink = timingTextElement.getAttribute("wait-link");
        //wait-link
        if (actionType == "waitlist") {
          joinWaitListEl.href = waitLink;
          joinWaitListEl.style.display = "block";
          submitClassPayment.style.display = "none";
        } else {
          joinWaitListEl.style.display = "none";
          if ($this.$isCheckoutFlow != "Bundle-Purchase") {
            submitClassPayment.style.display = "block";
          }
        }
      });

      // Hover effect: Add yellow border on hover
      label.addEventListener("mouseenter", function () {
        if (!label.classList.contains("class-time-with-brown-white-style")) {
          label.classList.add("class-time-with-yellow-border");
        }
      });

      // Remove yellow border when mouse leaves
      label.addEventListener("mouseleave", function () {
        label.classList.remove("class-time-with-yellow-border");
      });
      // info Message

      var alertMessage = this.getAlertMessage(time);

      label.setAttribute("action-type", "");
      if (alertMessage) {
        let classTimeWrapper = creEl("div", "class-time-flex-wrapper");
        var alertClass = alertMessage.class;
        let infoWrapper = creEl("div", "class-info-text-flex-wrapper");
        let infoDiv = creEl("div", alertClass);
        infoDiv.innerHTML = alertMessage.message;
        infoWrapper.appendChild(infoDiv);
        classTimeWrapper.prepend(label, infoWrapper);
        classTimesContainer.prepend(classTimeWrapper);
        label.setAttribute("action-type", alertMessage.type);
        if (alertMessage.type == "waitlist") {
          label.setAttribute("wait-link", time.waitListLink);
        }
      } else {
        classTimesContainer.prepend(label);
      }
    });
  }

  // Add student data before checkout url created in database
  AddStudentData() {
    var studentFirstName = document.getElementById("Student-First-Name");
    var studentLastName = document.getElementById("Student-Last-Name");
    var studentEmail = document.getElementById("Student-Email");
    var studentGrade = document.getElementById("Student-Grade");
    var studentSchool = document.getElementById("Student-School");
    var studentGender = document.getElementById("Student-Gender");
    var prevStudent = document.getElementById("prevStudent");

    //Utm Source
    let localUtmSource = localStorage.getItem("utm_source");

    var register_btn_card = document.querySelectorAll(".register_btn_card");
    register_btn_card.forEach((e) => {
      e.innerHTML = "Processing...";
    });
    //var cancelUrl = new URL("https://www.nsdebatecamp.com"+window.location.pathname);
    var cancelUrl = new URL(window.location.href);
    //console.log(window.location.href)
    cancelUrl.searchParams.append("returnType", "back");
    //console.log(cancelUrl)
    var data = {
      email: this.accountEmail,
      studentEmail: studentEmail.value,
      firstName: studentFirstName.value,
      lastName: studentLastName.value,
      grade: studentGrade.value,
      school: studentSchool.value,
      gender: studentGender.value,
      prevStudent: prevStudent.value,
      levelId: this.levelId,
      device: /Mobi|Android/i.test(navigator.userAgent) ? "Mobile" : "Desktop",
      deviceUserAgent: navigator.userAgent,
      name: this.parentName,
      //"successUrl": "https://www.bergendebate.com/payment-confirmation?programName=",
      //"cancelUrl": cancelUrl.href,
      //"cancelUrl": "https://www.bergendebate.com/payment-confirmation?programName=",
      memberId: this.webflowMemberId,
      amount: this.amount * 100,
      source: "cart_page",
      utm_source: (localUtmSource != null) ? localUtmSource : "null",
      createdOn: new Date().toISOString(),
      isPreviousStudent: this.$isPrevStudent

    };

    //console.log('Data !!!!!', data)
    //return;
    var xhr = new XMLHttpRequest();
    var $this = this;
    xhr.open(
      "POST",
      "https://nqxxsp0jzd.execute-api.us-east-1.amazonaws.com/prod/camp/checkoutUrlForClasses",
      true
    );
    xhr.withCredentials = false;
    xhr.send(JSON.stringify(data));
    xhr.onload = function () {
      let responseText = JSON.parse(xhr.responseText);
      //console.log('responseText', responseText)
      if (responseText.success) {
        $this.$checkoutData = responseText;
        //Storing data in local storage
        data.checkoutData = responseText;
        $this.updateCheckOutData(data);
        //localStorage.setItem("checkOutData", JSON.stringify(data));
        register_btn_card.forEach((e) => {
          e.innerHTML = "Register";
          if (e.classList.contains("option_b_card")) {
            e.innerHTML = "Register via Credit Card (Has Fee)";
          } else if (e.classList.contains("option_b_bt")) {
            e.innerHTML = "Register via Bank Transfer";
          } else {
            e.innerHTML = "Register";
          }
        });
      }
    };
  }

  showSemesterBundleModal() {
    const check_semester_bundle = this.checkSemesterBundleModalOpen();
    if (check_semester_bundle) {
      return;
    }

    const semesterBundleModal = document.getElementById(
      "semester-bundle-modal"
    );
    semesterBundleModal.classList.add("show");
    semesterBundleModal.style.display = "flex";
  }
  noThanksEvent() {
    var $this = this;
    const closeLinks = document.querySelectorAll(".upsell-close-link");
    const semesterBundleModal = document.getElementById(
      "semester-bundle-modal"
    );

    const learnMore = document.getElementById("learn-more");
    closeLinks.forEach(function (closeLink) {
      closeLink.addEventListener("click", function (event) {
        event.preventDefault();
        $this.closeModal(semesterBundleModal);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    let closeModal = document.querySelectorAll("[data-modal='close']");
    if (closeModal.length > 0) {
      closeModal.forEach((close_modal_link) => {
        close_modal_link.addEventListener("click", function (event) {
          event.preventDefault();
          $this.closeModal(semesterBundleModal);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
    }

    learnMore.addEventListener("click", function () {
      semesterBundleModal.classList.add("show");
      semesterBundleModal.style.display = "flex";
    });

    //$this.addToCart();
    //$this.handleUpSellSelection();
  }
  closeModal(modal) {
    if (modal) {
      document.cookie = "bundleModalClosed=" + encodeURIComponent(new Date().toISOString()) + "; path=/";
      modal.classList.remove("show");
      modal.style.display = "none";
    }
  }
  activeBreadCrumb(activeId) {
    let breadCrumbList = document.querySelectorAll(" ul.c-stepper li");
    breadCrumbList.forEach((element) => element.classList.remove("active"));
    document.getElementById(activeId).classList.add("active");
  }

  checkSemesterBundleModalOpen() {
    let isOpen = false;
    // Direct check with checkbox with bundleProgram class
    const bundleCheckbox = document.querySelector(".bundleProgram");
    if (bundleCheckbox && bundleCheckbox.checked) {
      isOpen = true;
    }
    // check bundleModalClosed cookie date time for 1 hour. no need to show if less then 1 hour
    const bundleModalClosed = document.cookie
      .split("; ")
      .find((row) => row.startsWith("bundleModalClosed="));
    if (bundleModalClosed) {
      const closedTime = new Date(
        decodeURIComponent(bundleModalClosed.split("=")[1])
      );
      const currentTime = new Date();
      const oneHour = 60 * 60 * 1000;
      if (currentTime - closedTime < oneHour) {
        isOpen = true;
      }
    }
    return isOpen;
  }



  addToCart() {
    const addToCartButtons = document.querySelectorAll(".add-to-cart");
    var $this = this;
    addToCartButtons.forEach((button) => {
      button.addEventListener("click", function (event) {
        // Select all 'add-to-card' buttons
        // bundleProgram checkbox
        const checkboxes = document.querySelectorAll(".bundleProgram");
        checkboxes.forEach((checkbox) => {
          if (checkbox.checked) {
            // Toggle the checkbox state
            //checkbox.checked = !checkbox.checked;
            let upsellProgramId = parseInt(checkbox.getAttribute("programDetailId"));
            // upsellProgramId already available in selectProgramData don't update the amount
            var suppProIdE = document.getElementById("suppProIds");
            let selectedIds = JSON.parse(suppProIdE.value);
            //if (!selectedIds.includes(upsellProgramId)) {
            $this.updateAmount(checkbox.value);
            //}
          }
        });
        // Update the button text based on the checkbox state
        button.textContent = Array.from(checkboxes).some(checkbox => checkbox.checked) ? "Update Cart" : "Add to Cart";
        // Optional: Add or remove a disabled class (if needed)
        button.classList.toggle("disabled", Array.from(checkboxes).some(checkbox => checkbox.checked));
        button.classList.toggle("active", Array.from(checkboxes).some(checkbox => checkbox.checked));
        // Close the modal after adding to cart
        const semesterBundleModal = document.getElementById("semester-bundle-modal");
        $this.closeModal(semesterBundleModal);
        // Scroll to top after closing the modal
        window.scrollTo({ top: 0, behavior: "smooth" });
        // Update tab
        let paymentTab = document.querySelectorAll(".payment-cards-tab-link");
        paymentTab[0].click();
        $this.hideShowNewStudentFee("none");
        $this.disableEnableBuyNowButton();
        window.scrollTo({ top: 0, behavior: "smooth" });
        $this.updateCheckOutData({ upsellProgramIds: $this.$selectedProgram.map(item => item.upsellProgramId), suppPro: $this.$suppPro, selectedProgram: $this.$selectedProgram });
        $this.$oldSelectedProgram = $this.$selectedProgram;
      });
    });
  }

  hideShowNewStudentFee(type) {
    const bundleOrderSummary = document.querySelectorAll(
      ".bundle-order-details-new-div"
    );
    const defaultOrderSummary = document.querySelectorAll(
      ".bundle-order-details-old-div"
    );
    const prev_student_checkbox = document.querySelector(
      ".prev_student_checkbox"
    );
    this.updateDepositePriceForBundle();
    if (this.$selectedProgram.length > 0) {
      this.checkUncheckOldStudentCheckBox(true, "");
      defaultOrderSummary.forEach((el) => (el.style.display = "none"));
      bundleOrderSummary.forEach((el) => (el.style.display = "block"));
    } else {
      this.checkUncheckOldStudentCheckBox(this.$isPrevStudent, "")
      defaultOrderSummary.forEach((el) => (el.style.display = "block"));
      bundleOrderSummary.forEach((el) => (el.style.display = "none"));
    }
  }

  updateAllSameProduct(programId, type) {
    const checkboxes = document.querySelectorAll(".bundleProgram");
    checkboxes.forEach((checkbox) => {
      const programDetailId = checkbox.getAttribute("programDetailId");
      if (programDetailId == programId) {
        button.textContent = type ? "Update Cart" : "Add to Cart";
        button.style.pointerEvents = type ? "none" : "auto";
        button.style.color = type ? "#ffffff" : "";
        button.style.backgroundColor = type ? "gray" : "";
        //button.style.textDecoration = type ? "underline" : "";
      }
    });
  }
  updateAmount(amount) {
    var totalAmountInput = document.getElementById("totalAmount");
    var totalPriceAllText = document.querySelectorAll(
      "[data-stripe='totalDepositPrice']"
    );
    var selectedIds = [];
    let briefsTotal = this.selectedBriefs.reduce((sum, brief) => {
      return sum + (parseFloat(brief.price) || 0);
    }, 0);

    totalPriceAllText.forEach(totalPriceText => {
      var sumOfSelectedPrograms = 0;

      sumOfSelectedPrograms = this.trimToTwoDecimals(
        this.$selectedProgram.reduce((total, program) => total + (parseFloat(program.amount) || 0), 0)
      );

      var dataStripePrice = parseFloat(totalPriceText.getAttribute("data-stripe-price"));
      if (this.$isCheckoutFlow == "Bundle-Purchase") {
        dataStripePrice = 0;
      }

      if (this.$selectedProgram.length > 0) {
        sumOfSelectedPrograms = parseFloat(sumOfSelectedPrograms) + (briefsTotal ? parseFloat(briefsTotal) : 0);
      } else {
        sumOfSelectedPrograms = parseFloat(sumOfSelectedPrograms) + parseFloat(dataStripePrice) + (briefsTotal ? parseFloat(briefsTotal) : 0);
      }

      const formattedValue =
        (sumOfSelectedPrograms == "0.00" || sumOfSelectedPrograms == "0")
          ? "Free"
          : "$" + this.numberWithCommas(sumOfSelectedPrograms);

      totalPriceText.innerHTML = formattedValue;

      // NEW — update .current-price-gray without changing any logic
      const grayElem = document.querySelector(".current-price-gray");
      if (grayElem) grayElem.innerHTML = formattedValue;

    });


    if (this.$isCheckoutFlow == "Bundle-Purchase") {
      totalAmountInput.value = parseFloat(amount);
    } else {
      totalAmountInput.value =
        parseFloat(totalAmountInput.value) + parseFloat(amount);
    }

    var suppProIdE = document.getElementById("suppProIds");
    var allSupIds = this.$selectedProgram.map(item => item.upsellProgramId);
    suppProIdE.value = JSON.stringify(allSupIds);

    // Update selected supplementary program ids
    this.displaySelectedSuppProgram(allSupIds);
    this.updateCheckOutData({ upsellProgramIds: allSupIds });
    this.updateOriginPrice()
  }


  displaySelectedSuppProgram(selectedIds) {
    var selectedSuppPro = document.getElementById("add-on-program-desktop");
    var selectedSuppProMob = document.getElementById("add-on-program-mobile");

    if (selectedSuppPro != null) {
      selectedSuppPro.innerHTML = "";
      if (selectedIds.length > 0) {
        this.displaySelectedSuppPrograms(selectedIds, selectedSuppPro);
      }
    }

    if (selectedSuppProMob != null) {
      selectedSuppProMob.innerHTML = "";
      if (selectedIds.length > 0) {
        this.displaySelectedSuppPrograms(selectedIds, selectedSuppProMob);
      }
    }
  }
  // This method use to display selected supplementary program in sidebar
  displaySelectedSuppPrograms(suppIds, selectedSuppPro) {
    var $this = this;
    // Filtering selected Supplementary program id from all Supplementary program data
    var selectedData = this.$suppPro.filter((item) =>
      suppIds.some((d) => d == item.upsellProgramId)
    );





    selectedData.forEach((sup) => {
      let mainGridWrapper = creEl("div", "cart-grid-wrapper");
      // bundle label and remove 
      let cartGridWrapper1 = creEl("div", "cart-grid-wrapper order-detail");
      let offeringType = creEl("p", "main-text bundle-semester");
      offeringType.innerHTML = sup.label;
      if (this.$coreData.upsellProgramId !== sup.upsellProgramId) {
        let offeringRemove = creEl("p", "main-text brown-red-text-small");
        offeringRemove.innerHTML = "Remove";
        offeringRemove.addEventListener("click", function () {
          $this.removeSuppProgram(sup.upsellProgramId);
        });
        cartGridWrapper1.prepend(offeringType, offeringRemove);
      } else {
        cartGridWrapper1.appendChild(offeringType);
      }
      mainGridWrapper.appendChild(cartGridWrapper1)

      // bundle amount considered as single program
      //let cartGridWrapper3 = creEl("div", "cart-grid-wrapper");
      // let bundleLabel = creEl("p", "main-text order-details-no-strike");
      // bundleLabel.innerHTML = "Bundle Price";
      let bundlePrice = creEl("div", "main-text order-details-price-no-strike");
      bundlePrice.innerHTML = (parseFloat(sup.amount) > 0) ? "$" + $this.numberWithCommas(parseFloat(sup.amount).toFixed(2)) : "Purchased";
      bundlePrice.setAttribute("data-stripe", "addon-price");
      bundlePrice.setAttribute("addon-price", $this.numberWithCommas(parseFloat(sup.amount).toFixed(2)));
      //cartGridWrapper3.prepend(bundleLabel);
      mainGridWrapper.appendChild(bundlePrice);

      // append all grid wrapper
      selectedSuppPro.appendChild(mainGridWrapper);
    });
  }
  removeSuppProgram(suppId) {
    var suppProIdE = document.getElementById("suppProIds");
    var arrayIds = JSON.parse(suppProIdE.value);
    if (arrayIds.length > 0) {
      arrayIds.push(suppId);
      arrayIds = arrayIds.filter((i) => i != suppId);
      suppProIdE.value = JSON.stringify(arrayIds);
      this.displaySelectedSuppProgram(arrayIds);
      const checkboxEl = document.querySelectorAll(".bundleProgram");

      this.$selectedProgram = this.$selectedProgram.filter((item) => item.upsellProgramId != suppId);
      this.updateCoreData()
      checkboxEl.forEach((checkbox) => {
        let programDetailId = checkbox.getAttribute("programDetailId");
        if (programDetailId == suppId) {
          // Find the closest parent div
          const parentDiv = checkbox.closest("div").parentElement;
          // if (checkbox.checked) {
          checkbox.checked = !checkbox.checked;
          this.updateAmount(checkbox.value);
          // }
        }
      });
      // Update tab
      let paymentTab = document.querySelectorAll(".payment-cards-tab-link");
      paymentTab[0].click();

      this.updateCheckOutData({ upsellProgramIds: arrayIds, selectedProgram: this.$selectedProgram });
      // Hide and show new student fee
      if (this.$selectedProgram.length > 0) {
        this.hideShowNewStudentFee("none");
      } else {
        this.hideShowNewStudentFee("grid");
      }
    }
    this.$oldSelectedProgram = this.$selectedProgram;
    this.disableEnableBuyNowButton()
    this.resetPaymentOption();
  }
  calculateCreditCardAmount(amount) {
    var total = (parseFloat(amount) + 0.3) / 0.971;
    //let truncated = Math.floor(total * 100) / 100;
    return total;
  }
  // Card payment update total price
  updatePriceForCardPayment() {
    var $this = this;
    let paymentTab = document.querySelectorAll(".payment-cards-tab-link");
    let totalDepositPrice = document.querySelectorAll(
      "[data-stripe='totalDepositPrice']"
    );
    for (let i = 0; i < paymentTab.length; i++) {
      paymentTab[i].addEventListener("click", function (e) {
        e.preventDefault()
        let tab = paymentTab[i].getAttribute("data-w-tab");
        if (tab == "Tab 2") {
          if (totalDepositPrice.length > 0) {
            totalDepositPrice.forEach((deposit_price) => {
              var core_product_price =
                document.getElementById("core_product_price");
              var coreDepositPrice = parseFloat(
                core_product_price.value.replace(/,/g, "")
              );
              coreDepositPrice = (parseFloat(coreDepositPrice) + 0.3) / 0.971;

              // Update deposit Price for addon program
              let addonDepositPrices = document.querySelectorAll(
                "[data-stripe='addon-deposit-price']"
              );
              if (addonDepositPrices.length > 0) {
                addonDepositPrices.forEach(addonDepositPrice => {
                  addonDepositPrice.innerHTML = "$" + $this.numberWithCommas(coreDepositPrice.toFixed(2));
                })
              }

              let sumOfSelectedPrograms = (
                $this.$selectedProgram.reduce((total, program) => {

                  let ccp = (program.amount) ? $this.calculateCreditCardAmount(program.amount).toFixed(2) : 0;
                  let tA = parseFloat(total) + parseFloat(ccp)
                  return tA
                }, 0)
              ).toFixed(2);

              let briefsTotal = $this.selectedBriefs.reduce((total, brief) => {
                let ccp = $this.calculateCreditCardAmount(brief.price).toFixed(2);
                let tA = parseFloat(total) + parseFloat(ccp)
                return tA
              }, 0).toFixed(2);

              briefsTotal = (briefsTotal) ? briefsTotal : 0
              if ($this.$selectedProgram.length > 0) {
                coreDepositPrice = parseFloat(sumOfSelectedPrograms) + parseFloat(briefsTotal);
              } else {
                coreDepositPrice = parseFloat(sumOfSelectedPrograms) + coreDepositPrice + parseFloat(briefsTotal);
              }

              deposit_price.innerHTML =
                "$" + $this.numberWithCommas(coreDepositPrice);
              // NEW — update .current-price-gray
              const grayElem = document.querySelector(".current-price-gray");
              if (grayElem) {
                grayElem.innerHTML = "$" + $this.numberWithCommas(coreDepositPrice.toFixed(2));
              }

            });
          }
        } else {
          if (totalDepositPrice.length > 0) {
            totalDepositPrice.forEach((deposit_price) => {
              let amountEl = deposit_price.getAttribute("data-stripe-price");


              let amount = parseFloat(
                amountEl.replace(/,/g, "").replace(/\$/g, "")
              );

              // Update deposit Price for addon program
              let addonDepositPrices = document.querySelectorAll(
                "[data-stripe='addon-deposit-price']"
              );
              if (addonDepositPrices.length > 0) {
                addonDepositPrices.forEach(addonDepositPrice => {
                  addonDepositPrice.innerHTML = "$" + $this.numberWithCommas(amount.toFixed(2));
                })
              }

              if ($this.$isCheckoutFlow == "Bundle-Purchase") {
                amount = 0;
              }

              var sumOfSelectedPrograms = $this.trimToTwoDecimals(
                $this.$selectedProgram.reduce((total, program) => total + program.amount, 0));

              let briefsTotal = $this.selectedBriefs.reduce((total, brief) => {
                return total + (parseFloat(brief.price) || 0);
              }, 0);

              var finalPrice;
              if ($this.$selectedProgram.length > 0) {
                finalPrice = $this.numberWithCommas(parseFloat(sumOfSelectedPrograms) + ((briefsTotal) ? parseFloat(briefsTotal) : 0));
              } else {
                finalPrice = $this.numberWithCommas(parseFloat(sumOfSelectedPrograms) + parseFloat(amount) + ((briefsTotal) ? parseFloat(briefsTotal) : 0));
              }
              deposit_price.innerHTML =
                (finalPrice == "0.00" || finalPrice == "0") ? "Free" : "$" + finalPrice;
              // NEW — update .current-price-gray
              const grayElem = document.querySelector(".current-price-gray");
              if (grayElem) {
                grayElem.innerHTML =
                  (finalPrice == "0.00" || finalPrice == "0") ? "Free" : "$" + finalPrice;
              }

            });
          }
        }

        // Code for addon price update based on payment method selection
        let addonPrice = document.querySelectorAll(
          "[data-stripe='addon-price']"
        );
        if (tab == "Tab 2") {
          if (addonPrice.length > 0) {
            addonPrice.forEach((addon_deposit_price) => {
              let addonPrice = addon_deposit_price.getAttribute("addon-price")
                .replace(/,/g, "")
                .replace(/\$/g, "");
              let addonPriceValue = (parseFloat(addonPrice) > 0) ? (parseFloat(addonPrice) + 0.3) / 0.971 : 0;
              addon_deposit_price.innerHTML = (parseFloat(addonPriceValue) > 0) ? "$" + $this.numberWithCommas(addonPriceValue.toFixed(2)) : "Purchased";
            });
          }
        } else {
          if (addonPrice.length > 0) {
            addonPrice.forEach((addon_deposit_price) => {
              let addonSinglePrice =
                addon_deposit_price.getAttribute("addon-price");
              addon_deposit_price.innerHTML = (parseFloat(addonSinglePrice) > 0
              ) ? "$" + addonSinglePrice : "Purchased";
            });
          }
        }

        // update briefs order details amaount 
        let briefAaddonPrice = document.querySelectorAll(
          "[data-stripe='brief-price']"
        );
        if (tab == "Tab 2") {
          if (briefAaddonPrice.length > 0) {
            briefAaddonPrice.forEach((addon_deposit_price) => {
              let addonPrice = addon_deposit_price.getAttribute("data-stripe-price")
              addonPrice = addonPrice.replace(/,/g, "")
                .replace(/\$/g, "");
              let addonPriceValue = (parseFloat(addonPrice) > 0) ? (parseFloat(addonPrice) + 0.3) / 0.971 : 0;
              addon_deposit_price.innerHTML = (parseFloat(addonPriceValue) > 0) ? "$" + $this.numberWithCommas(addonPriceValue.toFixed(2)) : "Purchased";
            });
          }
        } else {
          if (briefAaddonPrice.length > 0) {
            briefAaddonPrice.forEach((addon_deposit_price) => {
              let addonSinglePrice =
                addon_deposit_price.getAttribute("data-stripe-price");
              addon_deposit_price.innerHTML = (parseFloat(addonSinglePrice) > 0
              ) ? "$" + addonSinglePrice : "Purchased";
            });
          }
        }
        // After deposit price is updated, now recalc the discount
        Utils.calculateDiscountPrice();
      });
    }
    //data-stripe="totalDepositPrice"
  }


  //updateOldStudentList
  async updateOldStudentList(data) {
    const selectBox = document.getElementById("existing-students");
    var $this = this;
    try {
      var data = [];
      if ($this.$allBundlePrograms.length > 0 && $this.$isCheckoutFlow == "Bundle-Purchase") {
        data = $this.$allBundlePrograms;
      } else {
        data = await this.fetchData(
          "getAllPreviousStudents/" + this.webflowMemberId + "/all",
          this.typeFBaseUrl
        );
      }
      //finding unique value and sorting by firstName
      if (data == "No data Found" || data.length == 0) {
        selectBox.disabled = true;
        selectBox.innerHTML = '<option value="">No previous students found</option>';
        return;
      }
      data = data.filter(i => i.studentEmail != null && i.studentEmail != undefined && i.studentEmail != "");
      const filterData = data
        .filter(
          (item, index, self) =>
            index ===
            self.findIndex((obj) => obj.studentName === item.studentName)
        )
        .sort(function (a, b) {
          return a.studentName.trim().localeCompare(b.studentName.trim());
        });
      // Clear existing options
      selectBox.innerHTML = "";
      // Add a "Please select" option
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "Select Student Name";
      selectBox.appendChild(defaultOption);
      // Store filterData for use in custom dropdown
      selectBox._filterData = filterData;

      // Add new options from the API data
      filterData.forEach((item, index) => {
        let checkBundle = this.checkStudentBundleProgram({ firstName: item.studentName.split(" ")[0], lastName: item.studentName.split(" ")[1] });
        let checkBundleLabel = (checkBundle) ? " - Pre-registration available" : "";
        let checkBundleIconClass = (checkBundle) ? "pre-reg-available" : "normal-reg-available";
        const option = document.createElement("option");
        option.value = index;
        option.classList.add(checkBundleIconClass);
        //option.textContent = `${item.studentName+" ("+item.studentEmail+")"}`;
        option.textContent = `${item.studentName}${checkBundleLabel}`;
        option.setAttribute("data-check-bundle", checkBundle ? "true" : "false");
        option.setAttribute("data-student-name", item.studentName);
        selectBox.appendChild(option);
      });

      // Create custom styled dropdown with styled options
      this.createCustomSelectDisplay(selectBox, filterData);
      selectBox.addEventListener("change", function (event) {
        var checkoutJson = localStorage.getItem("checkOutBasicData");
        let studentName = filterData[event.target.value].studentName.split(
          " ",
          2
        );
        var data = {
          studentEmail: filterData[event.target.value].studentEmail,
          firstName: studentName[0],
          lastName: studentName[1],
          grade: filterData[event.target.value].studentGrade,
          school: filterData[event.target.value].school,
          gender: filterData[event.target.value].gender,
          prevStudent: filterData[event.target.value].prevStudent
            ? filterData[event.target.value].prevStudent
            : "",
        };
        // match studentEmail with allBundlePrograms studentEmail and assign match bundle program as a selectedBundleProgram 
        const matchedProgram = $this.$allBundlePrograms.find(
          (program) => program.studentName.replace(" ", "").toLowerCase() === (data.firstName.replace(" ", "").toLowerCase() + data.lastName.replace(" ", "").toLowerCase())
        );
        var preRegistrationTag = document.querySelectorAll(".pre-reg-tag")
        if (matchedProgram) {
          $this.$selectedBundleProgram = matchedProgram;
          $this.$isCheckoutFlow = "Bundle-Purchase";
          preRegistrationTag.forEach(preRegistrationTagEl => preRegistrationTagEl.style.display = "block");
        } else {
          $this.$selectedBundleProgram = null;
          $this.$isCheckoutFlow = "Normal";
          preRegistrationTag.forEach(preRegistrationTagEl => preRegistrationTagEl.style.display = "none");
        }

        localStorage.setItem("checkOutBasicData", JSON.stringify(data));
        $this.updateBasicData('old_student');
      });
    } catch (error) {
      console.error("Error fetching API data:", error);

      // Handle errors (optional)
      selectBox.innerHTML =
        '<option value="">Student Details not available</option>';
    }
  }
  createCustomSelectDisplay(selectBox, filterData) {
    // Inject CSS styles into head if not already present

    // Remove existing custom display wrapper if it exists
    const existingWrapper = selectBox.parentElement.querySelector('.custom-select-display-wrapper');
    if (existingWrapper) {
      existingWrapper.remove();
    }

    // Create wrapper div
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-display-wrapper';

    // Create display div that shows the selected value
    const displayDiv = document.createElement('div');
    displayDiv.className = 'custom-select-display';

    // Create text container for the selected value
    const textContainer = document.createElement('span');
    textContainer.className = 'custom-select-display-text';

    // Create arrow icon
    const arrowIcon = document.createElement('span');
    arrowIcon.className = 'custom-select-arrow';
    arrowIcon.innerHTML = '▼';

    // Create dropdown options container
    const dropdownOptions = document.createElement('div');
    dropdownOptions.className = 'custom-select-dropdown';

    // Hide the original select but keep it for form submission
    selectBox.className = (selectBox.className ? selectBox.className + ' ' : '') + 'custom-select-hidden';

    // Wrap the select
    const parent = selectBox.parentElement;
    parent.insertBefore(wrapper, selectBox);
    wrapper.appendChild(selectBox);
    wrapper.appendChild(displayDiv);
    displayDiv.appendChild(textContainer);
    displayDiv.appendChild(arrowIcon);
    wrapper.appendChild(dropdownOptions);

    // Function to create option HTML with styled checkBundleLabel
    const createOptionHTML = (option) => {
      const hasCheckBundle = option.getAttribute('data-check-bundle') === 'true';
      const studentName = option.getAttribute('data-student-name') || option.textContent;

      if (hasCheckBundle) {
        return `${studentName}<span class="custom-select-bundle-label"> - Pre-registration available</span>`;
      } else {
        return studentName;
      }
    };

    // Function to build dropdown options
    const buildDropdownOptions = () => {
      dropdownOptions.innerHTML = '';

      // Add default option
      const defaultOptionDiv = document.createElement('div');
      defaultOptionDiv.className = 'custom-select-option custom-select-option-default';
      defaultOptionDiv.textContent = 'Select Student Name';
      defaultOptionDiv.addEventListener('click', function () {
        selectBox.selectedIndex = 0;
        selectBox.dispatchEvent(new Event('change'));
        toggleDropdown();
      });
      dropdownOptions.appendChild(defaultOptionDiv);

      // Add student options
      for (let i = 1; i < selectBox.options.length; i++) {
        const option = selectBox.options[i];
        const optionDiv = document.createElement('div');
        optionDiv.className = 'custom-select-option';
        optionDiv.innerHTML = createOptionHTML(option);
        optionDiv.setAttribute('data-value', option.value);

        optionDiv.addEventListener('click', function () {
          selectBox.selectedIndex = parseInt(this.getAttribute('data-value')) + 1;
          selectBox.dispatchEvent(new Event('change'));
          toggleDropdown();
        });

        dropdownOptions.appendChild(optionDiv);
      }
    };

    // Function to toggle dropdown
    const toggleDropdown = () => {
      const isOpen = dropdownOptions.classList.contains('show');
      if (isOpen) {
        dropdownOptions.classList.remove('show');
        arrowIcon.classList.remove('rotated');
      } else {
        buildDropdownOptions();
        dropdownOptions.classList.add('show');
        arrowIcon.classList.add('rotated');
      }
    };

    // Function to update display
    const updateDisplay = () => {
      const selectedOption = selectBox.options[selectBox.selectedIndex];
      if (selectedOption && selectedOption.value !== '') {
        textContainer.innerHTML = createOptionHTML(selectedOption);
        displayDiv.classList.remove('custom-select-display-placeholder');
      } else {
        textContainer.textContent = 'Select Student Name';
        displayDiv.classList.add('custom-select-display-placeholder');
      }
    };

    // Event listeners
    displayDiv.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
      if (!wrapper.contains(e.target)) {
        dropdownOptions.classList.remove('show');
        arrowIcon.classList.remove('rotated');
      }
    });

    // Update display on change
    selectBox.addEventListener('change', updateDisplay);

    // Initial display update
    updateDisplay();
  }
  checkStudentBundleProgram(data) {
    const matchedProgram = this.$allBundlePrograms.find(
      (program) => program.studentName.replace(" ", "").toLowerCase() === (data.firstName.replace(" ", "").toLowerCase() + data.lastName.replace(" ", "").toLowerCase())
    );
    if (matchedProgram) {
      return true;
    } else {
      return false;
    }
  }
  checkBundlePurchaseFlow() {
    var studentFirstName = document.getElementById("Student-First-Name").value;
    var studentLastName = document.getElementById("Student-Last-Name").value;
    var studentEmail = document.getElementById("Student-Email").value;
    const matchedProgram = this.$allBundlePrograms.find(
      (program) => program.studentName.replace(" ", "").toLowerCase() === (studentFirstName.replace(" ", "").toLowerCase() + studentLastName.replace(" ", "").toLowerCase())
    );
    var preRegistrationTag = document.querySelectorAll(".pre-reg-tag")
    if (matchedProgram) {
      this.$selectedBundleProgram = matchedProgram;
      this.$isCheckoutFlow = "Bundle-Purchase";
      preRegistrationTag.forEach(preRegistrationTagEl => preRegistrationTagEl.style.display = "block");
    } else {
      this.$selectedBundleProgram = null;
      this.$isCheckoutFlow = "Normal";
      preRegistrationTag.forEach(preRegistrationTagEl => preRegistrationTagEl.style.display = "none");
    }
  }
  updateAddonProgram() {
    const addonProgram = this.$suppPro.find(
      (data) => data.upsellProgramId == 104
    );
    if (addonProgram == undefined) {
      return;
    }
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
    let amount = addonProgram.amount + this.discount_amount;

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

  checkBackButtonEvent() {
    var query = window.location.search;
    var urlPar = new URLSearchParams(query);
    var returnType = urlPar.get("returnType");
    var ibackbutton = document.getElementById('backbuttonstate');
    var checkoutJson = localStorage.getItem("checkOutData");
    if (checkoutJson != undefined) {
      var paymentData = JSON.parse(checkoutJson);
    } else {
      return;
    }
    if ((returnType == "back" || ibackbutton.value == 1 || this.isWithinAWeek(paymentData.createdOn)) && checkoutJson != undefined) {
      return true;
    } else {
      return false;
    }
  }
  isWithinAWeek(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    return date >= oneWeekAgo && date <= now;
  }
  displayStudentInfo(display) {
    document.querySelectorAll('.student-info-container').forEach(el => el.style.display = display)
    if (classDetailsStripe.isMobile()) {
      document.querySelectorAll('.student-info-container-mobile').forEach(el => el.style.display = display)
    }
    var localCheckOutData = localStorage.getItem('checkOutBasicData')
    if (localCheckOutData != undefined) {
      localCheckOutData = JSON.parse(localCheckOutData);
      let firstNameEls = document.querySelectorAll("[data-student='first-name']")
      if (firstNameEls.length > 0) {
        firstNameEls.forEach(El => {
          El.innerHTML = localCheckOutData.firstName;
        })
      }

      let lastNameEls = document.querySelectorAll("[data-student='last-name']")
      if (lastNameEls.length > 0) {
        lastNameEls.forEach(El => {
          El.innerHTML = localCheckOutData.lastName;
        })
      }

      let emailEls = document.querySelectorAll("[data-student='email']")
      if (emailEls.length > 0) {
        emailEls.forEach(El => {
          El.innerHTML = localCheckOutData.studentEmail;
        })
      }

      let schoolEls = document.querySelectorAll("[data-student='school']")
      if (schoolEls.length > 0) {
        schoolEls.forEach(El => {
          El.innerHTML = localCheckOutData.school;
        })
      }

      let gradeEls = document.querySelectorAll("[data-student='grade']")
      if (gradeEls.length > 0) {
        gradeEls.forEach(El => {
          El.innerHTML = localCheckOutData.grade;
        })
      }

      let genderEls = document.querySelectorAll("[data-student='gender']")
      if (genderEls.length > 0) {
        genderEls.forEach(El => {
          El.innerHTML = localCheckOutData.gender;
        })
      }


    }
  }
  updateCheckOutData(checkoutData) {
    var localCheckoutData = localStorage.getItem('checkOutData');
    if (checkoutData != null && localCheckoutData != null) {
      checkoutData = {
        ...JSON.parse(localCheckoutData),
        ...checkoutData
      }
    }
    localStorage.setItem("checkOutData", JSON.stringify(checkoutData));
  }
  updateSupplementaryProgramData(suppProData) {
    if (suppProData != null && suppProData.length > 0) {
      // this.$suppPro, Update unique supplementary program data based on upsellProgramId
      this.$suppPro.push(...suppProData);
      this.$suppPro = this.$suppPro.filter((item, index, self) =>
        index === self.findIndex((obj) => obj.upsellProgramId === item.upsellProgramId)
      );
    } else {
      console.error("Supplementary program data is empty or not available.");
    }
  }

  createBundlePrograms(academicData) {
    var academicData = academicData;
    if (academicData.length == 0) {
      return;
    }
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
    academicData = academicData.filter((item) => {
      return item.sessionId !== 2;
    });

    academicData.forEach((item) => {
      var currentSessionId = item.sessionId;
      // remove current Session Data based on summerSessionId item.
      var bundleData = item.upsellPrograms.filter(
        (bundle) => bundle.sessionId !== currentSessionId
      );
      var coreData = item.upsellPrograms.find(
        (bundle) => bundle.sessionId == currentSessionId
      );
      // Select  [data-stripe='totalDepositPrice'] and get data-stripe-price attribute value
      var totalDepositPriceEl = document.querySelector("[data-stripe='totalDepositPrice']");
      var coreDepositPrice = 0;
      if (totalDepositPriceEl) {
        var dataStripePrice = parseFloat(totalDepositPriceEl.getAttribute("data-stripe-price") || "0");
        var coreAmount = parseFloat(coreData.amount || "0");
        // removed deposit amount
        //coreData.amount = coreAmount - dataStripePrice;
      }
      this.$coreData = coreData;
      var bundlePopUpText = creEl("p", "bundle-pop-up-text");
      bundlePopUpText.innerHTML = "*To get the bundle benefits, a future session must be selected and the full tuition is due at class registration.";

      var addonHeading = creEl('p', 'bundle-sem-title-medium')
      addonHeading.innerHTML = "Add Future Session(s) "
      var addonSubHeading = creEl("span", "poppins-para bundle-sem-text");
      addonSubHeading.innerHTML = "(select at least one to bundle)";
      addonHeading.appendChild(addonSubHeading)
      if (this.$isCheckoutFlow === "Bundle-Purchase") {
        // Store original coreData values for future restoration
        if (coreData._originalAmount === undefined && coreData._originalDiscAmount === undefined) {
          coreData._originalAmount = coreData.amount;
          coreData._originalDiscAmount = coreData.disc_amount;
        }
        // Set core program amount and disc_amount to 0
        coreData.amount = 0;
        coreData.disc_amount = 0;
        this.$selectedProgram = [coreData, ...this.$selectedProgram.filter(prog => prog.upsellProgramId !== coreData.upsellProgramId)];
      } else {
        // Restore original coreData values if available
        if (coreData._originalAmount !== undefined && coreData._originalDiscAmount !== undefined) {
          coreData.amount = coreData._originalAmount;
          coreData.disc_amount = coreData._originalDiscAmount;
        } else {
          // Store original values for future restoration
          coreData._originalAmount = coreData.amount;
          coreData._originalDiscAmount = coreData.disc_amount;
        }
      }

      var coreCard = this.createBundleCard(coreData, 'core', "", coreData);

      cardContainer.appendChild(coreCard);
      cardContainer.appendChild(bundlePopUpText);
      cardContainer.appendChild(addonHeading);

      modalCardContainer.appendChild(coreCard.cloneNode(true));
      modalCardContainer.appendChild(bundlePopUpText.cloneNode(true));
      modalCardContainer.appendChild(addonHeading.cloneNode(true));

      bundleData.forEach((singleBundleData) => {
        var card = this.createBundleCard(singleBundleData, "upsell", "page", coreData);
        cardContainer.appendChild(card);
        var modelCard = this.createBundleCard(singleBundleData, "upsell", "modal", coreData);
        modalCardContainer.appendChild(modelCard);
      });
      this.displayTotalDiscount(item.upsellPrograms);
    });
    this.disableEnableBuyNowButton();
  }

  displayTotalDiscount(bundleData) {
    const totalDiscount = bundleData.reduce((acc, bundle) => {
      const amount = Number(bundle.portal_amount) || 0;
      const discAmount = Number(bundle.portal_disc_amount) || 0;
      return acc + (discAmount - amount);
    }, 0);
    const discountEl = document.querySelectorAll('[data-addon="discount"]')
    discountEl.forEach(el => {
      el.innerHTML = "$" + this.numberWithCommas(totalDiscount);
    })
  }

  createBundleCard(singleBundleData, type = "upsell", position = "", coreData) {
    var $this = this;
    var flexContainer = creEl("div", "bundle-sem-content-flex-container");
    // Container
    if (position == "page") {
      flexContainer = creEl("div", "bundle-sem-info-flex-wrapper margin-bottom-10");
    }

    if (type !== "upsell") flexContainer.classList.add("border-brown-red");

    // Checkbox + title/info
    const textWithCheckbox = creEl("div", "bundle-sem-text-with-checkbox");

    // Checkbox
    const wEmbed = creEl("div", "w-embed");
    const input = creEl("input", "bundle-sem-checkbox bundleProgram");
    input.type = "checkbox";
    input.name = "bundle-sem";
    input.setAttribute("programDetailId", singleBundleData.upsellProgramId);
    input.value = singleBundleData.amount ? singleBundleData.amount : "3350";
    if (type !== "upsell") {
      input.checked = true;
      input.setAttribute("disabled", true);

    }
    wEmbed.appendChild(input);

    // Title and info
    const titleInfoDiv = creEl("div");
    const titleP = creEl("p", "bundle-sem-title");
    titleP.textContent = type === "upsell"
      ? `${singleBundleData.label} (${singleBundleData.yearId})`
      : "Winter/Spring (2026)";
    const infoP = creEl("p", "bundle-sem-info");
    infoP.textContent = (singleBundleData.desc)
      ? (singleBundleData.desc || "")
      : "Winter/Spring Tuition + Early Bird (With Deposit)";
    titleInfoDiv.appendChild(titleP);
    titleInfoDiv.appendChild(infoP);

    textWithCheckbox.appendChild(wEmbed);
    textWithCheckbox.appendChild(titleInfoDiv);

    // Price
    const priceFlex = creEl("div", "bundle-sem-popup-price-flex-wrapper");
    const originalPrice = creEl("div", "bundle-sem-popup-price-gray");
    originalPrice.setAttribute("data-addon", "price");
    originalPrice.textContent = singleBundleData.disc_amount
      ? `$${this.numberWithCommas(singleBundleData.disc_amount)}`
      : "Purchased";
    const discountPrice = creEl("div", "bundle-sem-pop-up-price-text");
    discountPrice.setAttribute("data-addon", "discount-price");
    //let amount = (type !== "upsell") ? parseFloat(singleBundleData.amount) + parseFloat(this.amount) : singleBundleData.amount;
    // removed deposit amount
    let amount = singleBundleData.amount;
    discountPrice.textContent = singleBundleData.amount
      ? `$${this.numberWithCommas(amount)}`
      : "";
    priceFlex.appendChild(originalPrice);
    priceFlex.appendChild(discountPrice);

    // Assemble
    flexContainer.appendChild(textWithCheckbox);
    flexContainer.appendChild(priceFlex);

    // Checkbox logic
    input.addEventListener("change", (event) => {
      event.preventDefault();
      if (event.target.checked) {
        if (!this.$selectedProgram.includes(singleBundleData)) {
          this.$selectedProgram.push(singleBundleData);
          // console.log("push selected program", this.$selectedProgram)
        }
        flexContainer.classList.add("border-brown-red");
      } else {
        this.$selectedProgram = this.$selectedProgram.filter(
          (program) => program.upsellProgramId !== singleBundleData.upsellProgramId
        );
        // console.log("single pop selected program", this.$selectedProgram)
        flexContainer.classList.remove("border-brown-red");
      }

      const allCheckboxes = document.querySelectorAll("[programDetailId]");
      allCheckboxes.forEach((checkbox) => {
        if (checkbox.getAttribute("programDetailId") == singleBundleData.upsellProgramId) {
          checkbox.checked = event.target.checked;
          checkbox.closest(".bundle-sem-content-flex-container")?.classList.toggle("border-brown-red", event.target.checked);
        }
      });


      // If this is a bundle (upsell), manage coreData in $selectedProgram
      $this.updateCoreData(type);
      $this.disableEnableBuyNowButton(false)
      //console.log("Final pop selected program", this.$selectedProgram)
      // Update the cart
      $this.updateAmount(event.target.value);
      let paymentTab = document.querySelectorAll(".payment-cards-tab-link");
      paymentTab[0].click();
      $this.hideShowNewStudentFee("none");
      //window.scrollTo({ top: 0, behavior: "smooth" });
      $this.updateCheckOutData({ upsellProgramIds: $this.$selectedProgram.map(item => item.upsellProgramId), suppPro: $this.$suppPro, selectedProgram: $this.$selectedProgram });
      $this.$oldSelectedProgram = $this.$selectedProgram;
      $this.resetPaymentOption();

    });
    if (input.checked) {
      flexContainer.classList.add("border-brown-red");
    }

    return flexContainer;
  }

  resetPaymentOption() {
    // Trigger click event for payment class tab
    //if(this.$selectedProgram.length - 1 > 0){
    // trigger click event class name class-time-with-brown-white-style
    let paymentClassTab = document.querySelectorAll(".class-time-with-brown-white-style");
    if (paymentClassTab.length > 0) {
      paymentClassTab[0].click();
      // event trigger click event
      paymentClassTab[0].dispatchEvent(new Event('click'));
    }
    //}
  }

  updateCoreData(type = "upsell") {
    var coreData = this.$coreData;
    if (type == "upsell" && coreData && coreData.upsellProgramId) {
      const isBundleSelected = this.$selectedProgram.some(
        (program) => program.upsellProgramId !== coreData.upsellProgramId
      );
      const isCoreSelected = this.$selectedProgram.some(
        (program) => program.upsellProgramId === coreData.upsellProgramId
      );
      if (isBundleSelected) {
        if (!this.$selectedProgram.includes(coreData)) {
          if (!isCoreSelected) {
            this.$selectedProgram.push(coreData);
          }
        }
      } else {
        this.$selectedProgram = this.$selectedProgram.filter(
          (program) => program.upsellProgramId !== coreData.upsellProgramId
        );
      }
    }
  }
  disableEnableBuyNowButton(isUpdateText = true) {
    // is selected program is empty then disable the buy now button
    const buyNowButton = document.querySelectorAll(".add-to-cart, .bundle-add-to-cart");
    if (isUpdateText) {
      if (this.$selectedProgram.length === 0) {
        buyNowButton.forEach((button) => {
          button.innerHTML = "Add to Cart";
          if (this.$oldSelectedProgram.length == 0 && isUpdateText) {
            button.classList.add("disabled");
          }
        });
      } else {
        buyNowButton.forEach((button) => {
          button.innerHTML = "Update Cart";
          button.classList.remove("disabled");
        });
      }
    } else {
      if (this.$selectedProgram.length === 0) {
        buyNowButton.forEach((button) => {
          if (this.$oldSelectedProgram.length == 0 && !isUpdateText) {
            button.classList.add("disabled");
          }
        });
      } else {
        buyNowButton.forEach((button) => {
          button.classList.remove("disabled");
        });
      }
    }
  }
  // display Original Price 
  updateOriginPrice() {
    const container = document.querySelector('[data-upsell="original-tution-fee"]');
    if (!container) return;

    // Clear existing content
    container.innerHTML = "";

    // Always show core program first if selected
    const selected = [...this.$selectedProgram];
    const core = this.$coreData;
    let programs = [];

    if (core && selected.some(p => p.upsellProgramId === core.upsellProgramId)) {
      programs.push(core);
      programs = programs.concat(selected.filter(p => p.upsellProgramId !== core.upsellProgramId));
    } else {
      programs = selected;
    }

    let tuitionTotal = 0;

    programs.forEach(program => {
      const grid = creEl("div", "cart-grid-wrapper");
      const label = creEl("p", "main-text order-details");
      label.textContent = "Tuition " + program.label || "Tuition";
      const priceWrap = creEl("div", "w-embed");
      const price = creEl("p", "main-text order-details-price");
      price.textContent = "$" + this.numberWithCommas(this.trimToTwoDecimals(Number(program.disc_amount)));
      priceWrap.appendChild(price);
      grid.appendChild(label);
      grid.appendChild(priceWrap);
      container.appendChild(grid);
      tuitionTotal += Number(program.disc_amount) || 0;
    });

    // Tuition Total
    const totalGrid = creEl("div", "cart-grid-wrapper");
    const totalLabel = creEl("p", "main-text order-details");
    totalLabel.textContent = "Tuition Total";
    const totalWrap = creEl("div", "w-embed");
    const totalPrice = creEl("p", "main-text order-details-price");
    totalPrice.textContent = "$" + this.numberWithCommas(this.trimToTwoDecimals(tuitionTotal));
    totalWrap.appendChild(totalPrice);
    totalGrid.appendChild(totalLabel);
    totalGrid.appendChild(totalWrap);
    container.appendChild(totalGrid);

    // New Student Fee (if not previous student)
    if (!this.$isPrevStudent) {
      const feeGrid = creEl("div", "cart-grid-wrapper");
      const feeLabel = creEl("p", "main-text order-details");
      feeLabel.textContent = "New Student Fee";
      const feeWrap = creEl("div", "w-embed");
      const feePrice = creEl("p", "main-text order-details-price");
      feePrice.textContent = "$100";
      feeWrap.appendChild(feePrice);
      feeGrid.appendChild(feeLabel);
      feeGrid.appendChild(feeWrap);
      container.appendChild(feeGrid);
    }
  }
  updateCountdown(preRegistrationEndDate) {
    // Registration start date
    // Convert UTC date string (e.g., "2025-10-08 03:45:00") to local date-time string in ISO format
    // Replace space with 'T' and append 'Z' to indicate UTC
    if (typeof preRegistrationEndDate === "string" && preRegistrationEndDate.indexOf(" ") > -1 && preRegistrationEndDate.indexOf("T") === -1) {
      preRegistrationEndDate = preRegistrationEndDate.replace(" ", "T") + "Z";
    }

    var registrationStartDate = preRegistrationEndDate;
    // change year for the 2026 session dynamicly 
    //registrationStartDate = registrationStartDate.replace(new Date().getFullYear(), new Date().getFullYear() + 1);

    const now = new Date().getTime();
    const registrationDate = new Date(registrationStartDate).getTime();
    const timeLeft = registrationDate - now;

    // If countdown is over, set all to 0
    if (timeLeft < 0) {
      document.querySelector('[data-countdown="days"]').textContent = '0';
      document.querySelector('[data-countdown="hours"]').textContent = '0';
      document.querySelector('[data-countdown="minutes"]').textContent = '0';
      document.querySelector('[data-countdown="seconds"]').textContent = '0';
      return;
    }

    // Calculate time units
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    // Update DOM elements
    document.querySelector('[data-countdown="days"]').textContent = days;
    document.querySelector('[data-countdown="hours"]').textContent = hours;
    document.querySelector('[data-countdown="minutes"]').textContent = minutes;
    document.querySelector('[data-countdown="seconds"]').textContent = seconds;

    // Format and update the registration begin date
    const registrationDateTime = new Date(registrationStartDate);
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    };
    const formattedDate = registrationDateTime.toLocaleDateString('en-US', options);
    document.querySelector('[data-registration-begin="date"]').textContent = formattedDate;
  }
  initBriefs() {
    this.selectedBriefs = [];
    this.getBriefs();
    this.addCloseModalHandler();
  }
  addCloseModalHandler() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => {
        this.modal.style.display = "none";
        this.iframe.src = "";
      });
    }
  }
  async getBriefs() {
    this.showLoading();
    try {
      const response = await this.fetchData('getTopicsDetails');
      if (response && response.topics) {
        if (response.topics.length === 0) {
          this.showError('No briefs are currently available.');
        } else {
          this.renderBriefs(response.topics);
          this.attachPreviewHandlers(response.topics);
        }
      } else {
        console.error('No briefs data received');
        this.showError('Unable to load briefs. Please try again later.');
      }
    } catch (error) {
      console.error('Error fetching briefs:', error);
      this.showError('Network error. Please check your connection and try again.');
    }
  }
  renderBriefs(topics) {
    // Select all containers for briefs checkout
    const containers = document.querySelectorAll('[data-briefs-checkout="select-briefs"]');
    containers.forEach(container => {
      container.innerHTML = '';
    });
    if (containers.length === 0) {
      console.error('Briefs container not found');
      return;
    }
    // Clear existing content
    // Sort topics by topic_order
    const sortedTopics = topics.sort((a, b) => (a.topic_order || 0) - (b.topic_order || 0));

    // Create brief cards for each container
    containers.forEach(container => {
      sortedTopics.forEach((topic, index) => {
        const briefCard = this.createBriefCard(topic, false); // No default selection
        container.appendChild(briefCard);
      });
    });
  }
  createBriefCard(topic, isSelected = false) {
    const card = document.createElement('div');
    card.className = `brief-card supp-pdf ${isSelected ? 'brown-red-border' : ''}`;
    card.dataset.topicId = topic.topicId;

    const fullVersion = topic.full_version || {};
    const lightVersion = topic.light_version || {};

    card.innerHTML = `
            <div class="brief-flex-wrapper">
                <div class="brief-title-black">${topic.topicName}</div>
                <a href="#" class="button preview-brief w-button" data-topic-id="${topic.topicId}">View Brief</a>
            </div>
            <div data-briefs-checkout="full-version" class="brief-pricing-info-wrapper ${isSelected ? 'selected-border-red' : 'not-selected-white'}">
                <div class="brief-pricing-info-flex">
                    <div class="brief-inner-flex">
                        <label class="no-margin-bottom w-radio">
                            <input type="radio" data-name="Radio" name="radio-${topic.topicId}" 
                                   class="w-form-formradioinput w-radio-input" value="full" ${isSelected ? 'checked' : ''} />
                            <span class="hide w-form-label">Radio</span>
                        </label>
                        <div class="brief-pricing-title-red">Full Version</div>
                        <div class="brief-info-wrapper">
                            <img src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68d12df293ed238fb7b07265_Info.svg"
                             loading="lazy" alt="" class="brief-info-icon" />
                             <div><p class="dm-sans brief-tooltip">${fullVersion.description}</p></div>
                        </div>
                    </div>
                    <div class="brief-price-medium">$${parseFloat(fullVersion.price || 0).toFixed(2)}</div>
                </div>
                <div class="recommended-tag-text">Recommended</div>
            </div>
            <div data-briefs-checkout="light-version" class="brief-pricing-info-wrapper not-selected-white">
                <div class="brief-pricing-info-flex">
                    <div class="brief-inner-flex">
                        <label class="no-margin-bottom w-radio">
                            <input type="radio" data-name="Radio" name="radio-${topic.topicId}" 
                                   class="w-form-formradioinput w-radio-input" value="light" />
                            <span class="hide w-form-label">Radio</span>
                        </label>
                        <div class="brief-pricing-title-red">Light Version</div>
                        <div class="brief-info-wrapper">
                        <img src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68d12df293ed238fb7b07265_Info.svg"
                             loading="lazy" alt="" class="brief-info-icon" />
                             <div><p class="dm-sans brief-tooltip">${lightVersion.description}</p></div>
                        </div>
                    </div>
                    <div class="brief-price-medium">$${parseFloat(lightVersion.price || 0).toFixed(2)}</div>
                </div>
            </div>
        `;

    // Add click handlers for version selection
    const fullVersionDiv = card.querySelector('[data-briefs-checkout="full-version"]');
    const lightVersionDiv = card.querySelector('[data-briefs-checkout="light-version"]');
    const fullRadio = card.querySelector('input[value="full"]');
    const lightRadio = card.querySelector('input[value="light"]');

    fullVersionDiv.addEventListener('click', () => {
      fullRadio.checked = true;
      this.selectVersion(topic, 'full', card);
    });

    lightVersionDiv.addEventListener('click', () => {
      lightRadio.checked = true;
      this.selectVersion(topic, 'light', card);
    });

    // Add to selected briefs if initially selected
    if (isSelected) {
      this.selectedBriefs.push({
        topicId: topic.topicId,
        topicName: topic.topicName,
        version: 'full',
        price: fullVersion.price || 0,
        description: fullVersion.description || topic.headings
      });
      // Add brown-red-border class for initially selected briefs
      card.classList.add('brown-red-border');
    }

    return card;
  }

  attachPreviewHandlers(briefs) {
    document.querySelectorAll(".button.preview-brief").forEach((button) => {
      //console.log("Buttons:", document.querySelectorAll(".button.view-brief"));

      button.addEventListener("click", async (e) => {
        e.preventDefault();

        const topicId = button.dataset.topicId;
        const brief = briefs.find((b) => b.topicId == topicId);

        if (!brief) return;

        const originalText = button.textContent;
        // show spinner while PDF is loading
        //this.showLoading();

        // Determine which PDF to use (full_version preferred)
        const pdfUrl = brief.full_version?.preview_pdf_url || brief.light_version?.preview_pdf_url;

        if (pdfUrl) {
          this.modal.style.display = "flex";
          this.iframe.src = pdfUrl;

          this.iframe.onload = () => {
            button.textContent = originalText;
            button.disabled = false;
            //this.hideLoading(); // hide spinner after PDF loads
          };
        } else {
          button.textContent = "Not Available";
          setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
            //this.hideLoading(); // hide spinner after PDF loads
          }, 2000);
        }
      });

    });
  }
  selectVersion(topic, version, card) {
    const fullVersionDiv = card.querySelector('[data-briefs-checkout="full-version"]');
    const lightVersionDiv = card.querySelector('[data-briefs-checkout="light-version"]');
    const fullRadio = card.querySelector('input[value="full"]');
    const lightRadio = card.querySelector('input[value="light"]');

    // Check if this brief is already selected with the same version
    const existingIndex = this.selectedBriefs.findIndex(brief => brief.topicId === topic.topicId);
    const isAlreadySelected = existingIndex >= 0 && this.selectedBriefs[existingIndex].version === version;

    if (isAlreadySelected) {
      // Unselect the brief
      this.selectedBriefs.splice(existingIndex, 1);

      // Remove brown-red-border class
      card.classList.remove('brown-red-border');

      // Reset visual selection to unselected state
      fullVersionDiv.className = 'brief-pricing-info-wrapper not-selected-white';
      lightVersionDiv.className = 'brief-pricing-info-wrapper not-selected-white';

      // Uncheck radio buttons
      fullRadio.checked = false;
      lightRadio.checked = false;
    } else {
      // Select the brief
      const versionData = version === 'full' ? topic.full_version : topic.light_version;

      const briefData = {
        topicId: topic.topicId,
        topicName: topic.topicName,
        version: version,
        price: versionData.price || 0,
        description: versionData.description || topic.headings
      };

      if (existingIndex >= 0) {
        // Update existing selection
        this.selectedBriefs[existingIndex] = briefData;
      } else {
        // Add new selection
        this.selectedBriefs.push(briefData);
      }

      // Update visual selection
      if (version === 'full') {
        fullVersionDiv.className = 'brief-pricing-info-wrapper selected-border-red';
        lightVersionDiv.className = 'brief-pricing-info-wrapper not-selected-white';
      } else {
        fullVersionDiv.className = 'brief-pricing-info-wrapper not-selected-white';
        lightVersionDiv.className = 'brief-pricing-info-wrapper selected-border-red';
      }

      // Add brown-red-border class to the card when selected
      card.classList.add('brown-red-border');
    }
    this.updateCheckOutData({ selectedBriefs: this.selectedBriefs });
    this.updateTotal();
    this.resetPaymentOption()
    let paymentTab = document.querySelectorAll(".payment-cards-tab-link");
    paymentTab[0].click()
    //this.updatePriceForBriefs();
  }
  // Update briefs list in order details

  updateBriefsListInOrderDetails() {

    const briefsContainers = document.querySelectorAll('[data-briefs-checkout="briefs-order-details"]');
    if (!briefsContainers.length) return;

    // Process all briefs containers
    briefsContainers.forEach(briefsContainer => {
      // Find the template brief-flex-wrapper (the one with hide class)
      const templateBrief = briefsContainer.querySelector('.brief-flex-wrapper.hide');
      if (!templateBrief) return;

      // Clear existing briefs (except the template)
      const existingBriefs = briefsContainer.querySelectorAll('.brief-flex-wrapper:not(.hide)');
      existingBriefs.forEach(brief => {
        brief.remove();
      });

      // Add selected briefs to this container
      this.selectedBriefs.forEach(brief => {
        const briefElement = document.createElement('div');
        briefElement.className = 'brief-flex-wrapper';
        briefElement.innerHTML = `
                      <p class="main-text order-details-price-no-strike">${brief.topicName} (${brief.version === 'full' ? 'Full' : 'Light'})</p>
                      <p class="main-text order-details-price-no-strike" data-stripe="brief-price" data-stripe-price="${brief.price}">$${parseFloat(brief.price).toFixed(2)}</p>
                  `;
        briefsContainer.insertBefore(briefElement, templateBrief.nextSibling);
      });
    });

    // Update total
    this.updateOrderTotal();
  }
  // Update total
  updateTotal() {
    // Calculate total from selected briefs
    const total = this.selectedBriefs.reduce((sum, brief) => {
      return sum + (parseFloat(brief.price) || 0);
    }, 0);

    // Update order details sidebar
    this.updateBriefsListInOrderDetails();

    this.updateAmount(total)

  }

  // Update total
  updateOrderTotal() {
    const totalElements = document.querySelectorAll('[data-briefs-checkout="briefs-order-details"] .total-price-bold');
    if (totalElements.length > 0) {
      const total = this.selectedBriefs.reduce((sum, brief) => {
        return sum + (parseFloat(brief.price) || 0);
      }, 0);

      totalElements.forEach(totalElement => {
        totalElement.textContent = `$${this.trimToTwoDecimals(total)}`;
      });
    }
  }



  showLoading() {
    const container = document.querySelector('[data-briefs-checkout="select-briefs"]');
    if (container) {
      container.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #666; grid-column: 1 / 4">
              <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #d38d97; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <p style="margin-top: 20px;">Loading briefs...</p>
          </div>
          <style>
              @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
              }
          </style>
      `;
    }
  }

  showError(message) {
    const container = document.querySelector('[data-briefs-checkout="select-briefs"]');
    if (container) {
      container.innerHTML = `
          <div style="text-align: center; padding: 20px; color: #666;">
              <p>${message}</p>
          </div>
      `;
    }
  }

  displayTopicData(display = "none") {
    const topicContainer = document.querySelectorAll('.add-supplimental-pdf-container');
    // if(this.isMobile()){
    // topicContainer = document.querySelectorAll('.add-supplimental-pdf-container-mobile');
    // }
    if (display == "none") {
      topicContainer.forEach(container => {
        container.style.display = 'none';
      });
    } else {
      topicContainer.forEach(container => {
        container.style.display = 'block';
      });
    }
  }

  updateDepositePriceForBundle() {
    const defaultOrderSummaries = document.querySelectorAll('.bundle-order-details-old-div');

    defaultOrderSummaries.forEach(defaultOrderSummary => {
      const total_price = defaultOrderSummary.querySelector('.total_price');
      const totalStripePrice = defaultOrderSummary.querySelector('[data-stripe="totalDepositPrice"]');
      const addonStripePrice = defaultOrderSummary.querySelector('[data-stripe="addon-deposit-price"]');

      if (this.$isCheckoutFlow === "Bundle-Purchase") {
        total_price.classList.remove('order-details-price-no-strike');
        total_price.classList.add('order-details-price');
        addonStripePrice.classList.remove('order-details-price-no-strike');
        addonStripePrice.classList.add('order-details-price');
        totalStripePrice.innerHTML = "Free";
      } else {
        total_price.classList.remove('order-details-price');
        total_price.classList.add('order-details-price-no-strike');
        addonStripePrice.classList.remove('order-details-price');
        addonStripePrice.classList.add('order-details-price-no-strike');
        addonStripePrice.classList.remove('order-details');
        totalStripePrice.innerHTML = totalStripePrice.getAttribute("data-stripe-price");
      }
    });
  }

  /**
   * Check if the current viewport is mobile (width <= 766px)
   * @returns {boolean} True if mobile viewport
   */
  static isMobile() {
    return window.innerWidth <= 766;
  }
}


