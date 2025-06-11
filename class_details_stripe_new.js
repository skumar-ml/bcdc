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
  
  /*
   * This Class used to get class details based on location and pass the data to classLocation class
   */
  class classDetailsStripe {
    $suppPro = [];
    $isPrevStudent = false;
    constructor(
      baseUrl,
      webflowMemberId,
      accountEmail,
      levelId,
      parentName,
      amount
    ) {
      this.baseUrl = baseUrl;
      this.webflowMemberId = webflowMemberId;
      this.accountEmail = accountEmail;
      this.levelId = levelId;
      this.parentName = parentName;
      this.amount = amount;
      this.discount_amount = parseInt(amount)
      this.renderPortalData();
      this.initializeToolTips();
      this.updatePriceForCardPayment();
      this.updateOldStudentList();
      this.initiateLightbox();
    }
    // Creating main dom for location
    viewClassLocations(data) {
      console.log("data", data);
      const selectField = document.getElementById("location-select-field");
      //submit-class
      const submitClassPayment = document.getElementById("submit-class");
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
  
      console.log("Class Times Data:", classTimesData);
  
      const classTimesContainer = document.querySelector(
        ".class-times-grid-wrapper"
      );
      const classTimeDiv = document.getElementById("select-class-time-div");
      const paymentMethodsDiv = document.getElementById("payment-methods");
  
      // When the user selects a location, update the class times
      selectField.addEventListener("change", function () {
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
  
      if (this.levelId == "competitivetrack") {
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
        label.classList.add("class-time-with-brown-white-style");
        joinWaitListEl.style.display = "none";
        heading.style.display = "none";
        selectField.value = "none";
        classTimeDiv.style.display = "none";
      }
  
      // add event listener when  trying to payment
      // submitClassPayment
      submitClassPayment.addEventListener("click", function (event) {
        event.preventDefault();
        submitClassPayment.style.pointerEvents = "none";
  
        let selectedOption = selectField.options[selectField.selectedIndex];
        let responseText = selectedOption.getAttribute("responseText");
  
        responseText = JSON.parse(atob(responseText));
        console.log(responseText);
        let timingTextElement = document.querySelector(
          ".class-time.class-time-with-brown-white-style"
        );
        let timingText = timingTextElement.innerHTML;
        let classId = timingTextElement.getAttribute("classId");
        let levelName = timingTextElement.getAttribute("levelName");
  
        console.log(timingText);
  
        let paymentTab = document.querySelector(
          ".payment-cards-tabs-menu a.w--current"
        );
        let paymentType =
          paymentTab.getAttribute("data-w-tab") == "Tab 1" ? "ach" : "card";
        let has_fee = paymentType == "card" ? true : false;
        $this.initializeStripePayment(
          submitClassPayment,
          responseText,
          timingText,
          selectField,
          paymentType,
          has_fee,
          classId,
          levelName
        );
      });
    }
    //-------------Start new code for stripe payment integration----------------
  
    // Call API url with this method and response as a json
    async fetchData(endpoint) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`);
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
      var query = window.location.search;
      var urlPar = new URLSearchParams(query);
      var returnType = urlPar.get("returnType");
      // Get local storage data for back button
      var checkoutJson = localStorage.getItem("checkOutData");
      // Browser back button event hidden fields
      var ibackbutton = document.getElementById("backbuttonstate");
      if (
        (returnType == "back" || ibackbutton.value == 1) &&
        checkoutJson != undefined
      ) {
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
  
        studentFirstName.value = paymentData.firstName;
  
        studentLastName.value = paymentData.lastName;
  
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
        }
  
        if (paymentData.checkoutData) {
          //this.$checkoutData = paymentData.checkoutData;
          // Will debug latter
          //this.activateDiv('checkout_payment');
        }
      } else {
        // removed local storage when checkout page rendar direct without back button
        localStorage.removeItem("checkOutData");
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
          "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/checkPreviousStudent",
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
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
        //if (!isPreviousStudent) {
        //Update total price
        // console.log("prevStudentCheckBox[i]", prevStudentCheckBox[i])
        // prevStudentCheckBox[i].click();
        //   if (!prevStudentCheckBox[i].checked) {
        //     total_price[i].innerHTML =
        //       "$" + $this.numberWithCommas(totalAmount + 100);
        //   }
        //   prevStudentCheckBox[i].setAttribute("checked", true);
        // } else {
        //   if (prevStudentCheckBox[i].checked) {
        //     total_price[i].innerHTML =
        //       "$" + $this.numberWithCommas(totalAmount - 100);
        //       console.log(prevStudentCheckBox[i], prevStudentCheckBox[i].checked)
        //     prevStudentCheckBox[i].removeAttribute("checked");
        //     console.log("2", prevStudentCheckBox[i].checked)
        //   }
        // }
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
    }
    // update basic student form data from local storage
    updateBasicData() {
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
  
        studentFirstName.value = paymentData.firstName;
  
        studentLastName.value = paymentData.lastName;
  
        if (paymentData.grade) {
          studentGrade.value = paymentData.grade.toLowerCase();
        }
  
        if (paymentData.school) {
          studentSchool.value = paymentData.school;
        }
  
        if (paymentData.gender) {
          studentGender.value = paymentData.gender;
        }
        //if (paymentData.prevStudent) {
        prevStudent.value = paymentData.prevStudent;
        //}
      }
    }
    // Managing next and previous button
    addEventForPrevNaxt() {
      var next_page_1 = document.getElementById("next_page_1");
      var prev_page_1 = document.getElementById("prev_page_1");
  
      var $this = this;
      var form = $("#checkout-form");
      next_page_1.addEventListener("click", async function () {
        if (form.valid()) {
          $this.storeBasicData();
          $this.AddStudentData();
          $this.showSemesterBundleModal();
          $this.activeBreadCrumb("select-class");
          $this.activateDiv("class-selection-container");
        }
      });
  
      prev_page_1.addEventListener("click", function () {
        $this.activeBreadCrumb("student-details");
        $this.activateDiv("checkout_student_details");
      });
    }
    // Hide and show tab for program selection, student info and checkout payment
    activateDiv(divId) {
      var divIds = ["checkout_student_details", "class-selection-container"];
      // Remove the active class from all div elements
      divIds.forEach((id) =>
        document.getElementById(id).classList.remove("active_checkout_tab")
      );
      // Add the active class to the div with the specified id
      document.getElementById(divId).classList.add("active_checkout_tab");
    }
    //----------------End new code for stripe payment integration---------------
    // get data from api and pass the data to classLocation class
    async renderPortalData(memberId) {
      try {
        // -------------Start new code for stripe payment integration--------------
        // Modal No thanks events
        this.noThanksEvent();
        // Handle previous and next button
        this.addEventForPrevNaxt();
        // New Code Added
        this.activateDiv("checkout_student_details");
        // Update basic data
        this.updateBasicData();
        // Setup back button for browser and stripe checkout page
        this.setUpBackButtonTab();
        // -------------End new code for stripe payment integration---------------
        const data = await this.fetchData(
          "getClassDetailByMemberIdAndLevelId?levelId=" +
            this.levelId +
            "&memberId=" +
            this.webflowMemberId
        );
        console.log("data", data);
        this.viewClassLocations(data);
        this.$suppPro = await this.fetchData("getUpsellProgram/");
        this.updateAddonProgram();
        // var $this = this;
        // var locationData = data[0][0].location;
        // var levelId = data[0][0].levelId;
        // var levelName = data[0][0].levelName;
        // this.viewClassLocations(locationData);
        // Object.values(locationData).forEach((formData, index) => {
        // 	setTimeout(function () {
        // 		let currentIndex = index + 1;
        // 		new classLocationStripe($this.webflowMemberId, formData, currentIndex, $this.accountEmail, levelId, levelName, $this.parentName,  $this.amount);
        // 	}, 30)
        // })
      } catch (error) {
        console.error("Error rendering random number:", error);
      }
    }
  
    // API call for stripe checkout URL
    initializeStripePayment(
      locationActionLink,
      responseText,
      timingText,
      selectBox,
      type,
      has_fee,
      classId,
      levelName
    ) {
      var label;
      if (responseText.locationName != "None") {
        label =
          responseText.locationName + " | " + levelName + " | " + timingText;
      } else {
        label = "Competitive Track";
      }
  
      var iBackButton = document.getElementById("backbuttonstate");
  
      //Payment button
      //console.log('event', locationActionLink)
      locationActionLink.innerHTML = "Processing...";
      locationActionLink.disabled = true;
  
      // added code for up-sell program
      var suppProIdE = document.getElementById("suppProIds");
      let upsellProgramIds =
        JSON.parse(suppProIdE.value).length > 0
          ? JSON.parse(suppProIdE.value).map(Number)
          : [];
  
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
      var data = {
        checkoutId: checkOutLocalData.checkoutData.checkoutId,
        label: label,
        classUniqueId: classId,
        //added id for up-sell program
        upsellProgramIds: upsellProgramIds,
        has_fee: has_fee,
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
  
      //console.log('Data !!!!!', data)
      //return;
      var xhr = new XMLHttpRequest();
      var $this = this;
      xhr.open(
        "POST",
        "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/updateDataToCheckoutUrl",
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
  
          iBackButton.value = "1";
          //window.location.href = responseText.cardUrl;
          if (type == "card") {
            window.location.href = responseText.cardUrl;
          } else {
            window.location.href = responseText.achUrl;
          }
        }
      };
    }
  
    updateClassTimes(
      selectedLocation,
      classTimesData,
      classTimesContainer,
      classTimeDiv,
      paymentMethodsDiv
    ) {
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
        paymentMethodsDiv.classList.remove("hide");
        
        let timingTextElement = document.querySelector(
          ".class-time.class-time-with-brown-white-style"
        );
        let actionType = timingTextElement.getAttribute("action-type");
        let payment_option = document.querySelector('.payment_option')
        if (actionType == "waitlist") {
          payment_option.classList.add("hide"); // Show payment methods
        }else{
          payment_option.classList.remove("hide");
        }
        // hide and show join wait list link
        
        let joinWaitListEl = document.getElementById("join-waitlist-class");
        const submitClassPayment = document.getElementById("submit-class");
        
        let waitLink = timingTextElement.getAttribute("wait-link");
        //wait-link
        if (actionType == "waitlist") {
          joinWaitListEl.href = waitLink;
          joinWaitListEl.style.display = "block";
          submitClassPayment.style.display = "none";
        } else {
          joinWaitListEl.style.display = "none";
          submitClassPayment.style.display = "block";
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
        utm_source: (localUtmSource != null) ? localUtmSource : "null"
        
      };
  
      //console.log('Data !!!!!', data)
      //return;
      var xhr = new XMLHttpRequest();
      var $this = this;
      xhr.open(
        "POST",
        "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/checkoutUrlForClasses",
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
          localStorage.setItem("checkOutData", JSON.stringify(data));
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
      console.log("check_semester_bundle", check_semester_bundle);
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
  
      $this.addToCart();
    }
    closeModal(modal) {
      if (modal) {
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
      const addToCartButtons = document.querySelectorAll(".add-to-cart");
      addToCartButtons.forEach((button) => {
        const parent = button.closest("div");
        if (parent) {
          const checkbox = parent.querySelector(".bundleProgram");
          if (checkbox.checked) {
            isOpen = checkbox.checked;
          }
        }
      });
      return isOpen;
    }
  
    // New Feature Add to Cart
  
    addToCart() {
      // Select all 'add-to-card' buttons
      const addToCartButtons = document.querySelectorAll(".add-to-cart");
      var $this = this;
      addToCartButtons.forEach((button) => {
        button.addEventListener("click", function (event) {
          // check modal or normal page add to cart, using this variable
          let clickFrom = button.getAttribute("add-to-cart");
          event.preventDefault(); // Prevent default link behavior
  
          // Find the parent container with the 'btn-reserve-spot' class
          const parent = button.closest("div");
  
          if (parent) {
            // Locate the child checkbox within the parent container
            const checkbox = parent.querySelector(".bundleProgram");
  
            if (checkbox && !checkbox.checked) {
              // Toggle the checkbox state
              checkbox.checked = !checkbox.checked;
              //if(checkbox.checked){
              $this.updateAmount(checkbox, checkbox.value);
              //}
  
              // Update the button text based on the checkbox state
              button.textContent = checkbox.checked ? "Added" : "Add to Cart";
  
              // Optional: Add or remove a disabled class (if needed)
              button.classList.toggle("disabled", checkbox.checked);
  
              // while ($this.$suppPro.length == 0) {
              // 	console.log("$this.$suppPro.length", $this.$suppPro.length)
              // }
              setTimeout(() => {
                const semesterBundleModal = document.getElementById(
                  "semester-bundle-modal"
                );
                $this.closeModal(semesterBundleModal);
                if (clickFrom == "modal") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }, 100);
            }
          }
          // Update tab
          let paymentTab = document.querySelectorAll(".payment-cards-tab-link");
          paymentTab[0].click();
          $this.hideShowNewStudentFee("none");
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
      
      if (type == "none") {
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
      const addToCart = document.querySelectorAll(".add-to-cart");
      addToCart.forEach((button) => {
        const parent = button.closest("div");
        const checkbox = parent.querySelector(".bundleProgram");
        const programDetailId = checkbox.getAttribute("programDetailId");
        if (programDetailId == programId) {
          button.textContent = type ? "Added" : "Add to Cart";
          button.style.pointerEvents = type ? "none" : "auto";
          button.style.color = type ? "#ffffff" : "";
          button.style.backgroundColor = type ? "gray" : "";
          //button.style.textDecoration = type ? "underline" : "";
        }
      });
    }
  
    // Update total price when checkbox clicked for supplementary program
    updateAmount(checkEvent, amount) {
      // Sum of supplementary program price
      var totalAmountInput = document.getElementById("totalAmount");
      // core product price for resdential, commuter and online
      var core_product_price = document.getElementById("core_product_price");
      // Webflow total price dom element
      //var totalPriceText = document.getElementById("totalPrice");
      var totalPriceAllText = document.querySelectorAll(
        "[data-stripe='totalDepositPrice']"
      );
      // Webflow total price dom element
      //var totalPriceTextMob = document.getElementById("totalPriceMobile");
      // All added supplementary program id input fields
      var suppProIdE = document.getElementById("suppProIds");
      // selected supplementary program id
      var suppId = checkEvent.getAttribute("programDetailId");
  
      var selectedIds = [];
      if (checkEvent.checked) {
        // calulate total amount based on supplementary program price sum and core product price
        var amountHtml =
          parseFloat(core_product_price.value.replace(/,/g, "")) +
          parseFloat(totalAmountInput.value.replace(/,/g, "")) +
          parseFloat(amount.replace(/,/g, ""));
        let formateAmount = this.numberWithCommas(amountHtml.toFixed(2));
        totalPriceAllText.forEach(totalPriceText=>{
          totalPriceText.innerHTML = "$" + formateAmount;
        })
        
        //totalPriceText.setAttribute("data-stripe-price", formateAmount);
        // if (totalPriceTextMob) {
        //   totalPriceTextMob.innerHTML = formateAmount;
          //totalPriceTextMob.setAttribute("data-stripe-price", formateAmount);
        // }
  
        totalAmountInput.value =
          parseFloat(totalAmountInput.value) + parseFloat(amount);
        var arrayIds = JSON.parse(suppProIdE.value);
        arrayIds.push(suppId);
        selectedIds = arrayIds;
        suppProIdE.value = JSON.stringify(arrayIds);
        this.updateAllSameProduct(suppId, true);
      } else {
        // calulate total amount based on supplementary program price sum and core product price
        var amountHtml =
          parseFloat(core_product_price.value.replace(/,/g, "")) +
          parseFloat(totalAmountInput.value.replace(/,/g, "")) -
          parseFloat(amount);
        let formateAmount = this.numberWithCommas(amountHtml.toFixed(2));
        //totalPriceText.innerHTML = "$" + formateAmount;
        totalPriceAllText.forEach(totalPriceText=>{
          totalPriceText.innerHTML = "$" + formateAmount;
        })
        // totalPriceText.setAttribute("data-stripe-price", formateAmount);
        // if (totalPriceTextMob) {
        //   totalPriceTextMob.innerHTML = formateAmount;
        //   //totalPriceTextMob.setAttribute("data-stripe-price", formateAmount);
        // }
        totalAmountInput.value =
          parseFloat(totalAmountInput.value) - parseFloat(amount);
        var arrayIds = JSON.parse(suppProIdE.value);
        var allSupIds = arrayIds.filter((i) => i != suppId);
        selectedIds = allSupIds;
        suppProIdE.value = JSON.stringify(allSupIds);
        this.updateAllSameProduct(suppId, false);
      }
      // Hide and show based on supplementary program length
      // var totalPriceDiv = document.getElementById("totalPriceDiv");
      // if (selectedIds.length > 0) {
      //   totalPriceDiv.classList.add("show");
      // } else {
      //   totalPriceDiv.classList.remove("show");
      // }
      // Hide and show based on supplementary program length
      // var totalPriceDiv = document.getElementById("totalPriceDivMob");
      // if (totalPriceDiv != undefined) {
      //   if (selectedIds.length > 0) {
      //     totalPriceDiv.classList.add("show");
      //   } else {
      //     totalPriceDiv.classList.remove("show");
      //   }
      // }
      this.displaySelectedSuppProgram(selectedIds);
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
      // bundle label and remove 
      let cartGridWrapper1 = creEl("div", "cart-grid-wrapper");
      let offeringType = creEl("div", "main-text small-medium-mb-0");
      offeringType.innerHTML = sup.label;
      let offeringRemove = creEl("div", "main-text brown-red-text-small align-right");
      offeringRemove.innerHTML = "Remove";
      offeringRemove.addEventListener("click", function () {
        $this.removeSuppProgram(sup.upsellProgramId);
      });
      cartGridWrapper1.prepend(offeringType, offeringRemove);

      // Deposit price considered as single program
      let cartGridWrapper2 = creEl("div", "cart-grid-wrapper");
      let depositLabel = creEl("p", "main-text order-details-no-strike");
      depositLabel.innerHTML = "Deposit (Due Now)";
      let depositPrice = creEl("p", "main-text order-details-price-no-strike");
      depositPrice.innerHTML = "$"+$this.amount;
      depositPrice.setAttribute("data-stripe", "addon-deposit-price");
      cartGridWrapper2.prepend(depositLabel, depositPrice);
      // bundle amount considered as single program
      let cartGridWrapper3 = creEl("div", "cart-grid-wrapper");
      let bundleLabel = creEl("p", "main-text order-details-no-strike");
      bundleLabel.innerHTML = "Bundle Price";
      let bundlePrice = creEl("div","main-text order-details-price-no-strike");
      bundlePrice.innerHTML = "$" + $this.numberWithCommas(parseFloat(sup.amount).toFixed(2));
      bundlePrice.setAttribute("data-stripe", "addon_price");
      bundlePrice.setAttribute("addon-price",$this.numberWithCommas(parseFloat(sup.amount).toFixed(2)));
      cartGridWrapper3.prepend(bundleLabel, );
      cartGridWrapper3.prepend(bundleLabel, bundlePrice);
      // append all grid wrapper
      selectedSuppPro.prepend(cartGridWrapper1, cartGridWrapper2, cartGridWrapper3);
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
        checkboxEl.forEach((checkbox) => {
          let programDetailId = checkbox.getAttribute("programdetailid");
          if (programDetailId == suppId) {
            // Find the closest parent div
            const parentDiv = checkbox.closest("div").parentElement;
            if (checkbox.checked) {
              checkbox.checked = !checkbox.checked;
              this.updateAmount(checkbox, checkbox.value);
            }
  
            // Find the corresponding "add-to-card" button inside the same parent div
            var addToCardButton = parentDiv.querySelector(".add-to-card");
            if (addToCardButton != undefined) {
              addToCardButton.innerHTML = "Add to Cart";
              addToCardButton.classList.remove("disabled");
              addToCardButton.style.pointerEvents = "auto";
              addToCardButton.style.color = "";
            }
          }
        });
        // Update tab
        let paymentTab = document.querySelectorAll(".payment-cards-tab-link");
        paymentTab[0].click();
        this.hideShowNewStudentFee("grid");
      }
    }
  
    // Card payment update total price
    updatePriceForCardPayment() {
      var $this = this;
      let paymentTab = document.querySelectorAll(".payment-cards-tab-link");
      let totalDepositPrice = document.querySelectorAll(
        "[data-stripe='totalDepositPrice']"
      );
      for (let i = 0; i < paymentTab.length; i++) {
        paymentTab[i].addEventListener("click", function () {
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
               if(addonDepositPrices.length > 0){
                 addonDepositPrices.forEach(addonDepositPrice =>{
                   addonDepositPrice.innerHTML =   "$" + $this.numberWithCommas(coreDepositPrice.toFixed(2));  
                 })
               }
                
                let addonPriceEl = document.querySelector(
                  "[data-stripe='addon_price']"
                );
                if (addonPriceEl) {
                  let addonPrice = addonPriceEl.getAttribute('addon-price')
                    .replace(/,/g, "")
                    .replace(/\$/g, "");
                  addonPrice = (parseFloat(addonPrice) + 0.3) / 0.971;
                  coreDepositPrice = addonPrice + coreDepositPrice;
                }
                //let amount = deposit_price.innerHTML.replace(/,/g, "").replace(/\$/g, "");
                //deposit_price.innerHTML = "$"+ $this.numberWithCommas(((parseFloat(amount) + 0.30)/0.971).toFixed(2));
                deposit_price.innerHTML =
                  "$" + $this.numberWithCommas(coreDepositPrice.toFixed(2));
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
               if(addonDepositPrices.length > 0){
                 addonDepositPrices.forEach(addonDepositPrice =>{
                   addonDepositPrice.innerHTML =   "$" + $this.numberWithCommas(amount.toFixed(2));
                 })
               }
                  
                let addonPriceEl = document.querySelector(
                  "[data-stripe='addon_price']"
                );
                if (addonPriceEl) {
                  let addonPriceElValue =
                    addonPriceEl.getAttribute("addon-price");
                  addonPriceElValue = addonPriceElValue
                    .replace(/,/g, "")
                    .replace(/\$/g, "");
                  amount = amount + parseFloat(addonPriceElValue);
                }
  
                deposit_price.innerHTML =
                  "$" + $this.numberWithCommas(amount.toFixed(2));
              });
            }
          }
  
          // Code for addon price update based on payment method selection
          let addonPrice = document.querySelectorAll(
            "[data-stripe='addon_price']"
          );
          if (tab == "Tab 2") {
            if (addonPrice.length > 0) {
              addonPrice.forEach((addon_deposit_price) => {
                let addonPrice = addon_deposit_price.getAttribute("addon-price")
                  .replace(/,/g, "")
                  .replace(/\$/g, "");
                let addonPriceValue = (parseFloat(addonPrice) + 0.3) / 0.971;
                addon_deposit_price.innerHTML =
                  "$" + $this.numberWithCommas(addonPriceValue.toFixed(2));
              });
            }
          } else {
            if (addonPrice.length > 0) {
              addonPrice.forEach((addon_deposit_price) => {
                let addonSinglePrice =
                  addon_deposit_price.getAttribute("addon-price");
                addon_deposit_price.innerHTML = "$" + addonSinglePrice;
              });
            }
          }
        });
      }
      //data-stripe="totalDepositPrice"
    }
  
    //updateOldStudentList
    async updateOldStudentList() {
      const selectBox = document.getElementById("existing-students");
      var $this = this;
      try {
        const data = await this.fetchData(
          "getAllPreviousStudents/" + this.webflowMemberId+"/all"
        );
        console.log("Old Student Data", data);
  
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
        defaultOption.textContent = "Select Student Name";
        selectBox.appendChild(defaultOption);
        // Add new options from the API data
        filterData.forEach((item, index) => {
          const option = document.createElement("option");
          option.value = index;
          option.textContent = `${item.studentName}`;
          selectBox.appendChild(option);
        });
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
          localStorage.setItem("checkOutBasicData", JSON.stringify(data));
          $this.updateBasicData();
        });
      } catch (error) {
        console.error("Error fetching API data:", error);
  
        // Handle errors (optional)
        selectBox.innerHTML =
          '<option value="">Student Details not available</option>';
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
  }
