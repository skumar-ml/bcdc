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
    $selectedProgram = [];
    $coreData = [];
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
      this.spinner = document.getElementById("half-circle-spinner"); 
      this.renderPortalData();
      this.initializeToolTips();
      this.updatePriceForCardPayment();
      this.updateOldStudentList();
      this.initiateLightbox();
    }
    // Creating main dom for location
    viewClassLocations(data) {
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
  
      const classTimesContainer = document.querySelector(
        ".class-times-grid-wrapper"
      );
      const classTimeDiv = document.getElementById("select-class-time-div");
      const paymentMethodsDiv = document.getElementById("payment-methods");
  
      // When the user selects a location, update the class times
      selectField.addEventListener("change", function () {
        $this.updateCheckOutData({location: this.value})
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
      this.spinner.style.display = "block";
      var query = window.location.search;
      var urlPar = new URLSearchParams(query);
      var returnType = urlPar.get("returnType");
      // Get local storage data for back button
      var checkoutJson = localStorage.getItem("checkOutData");
      
      if (checkoutJson != undefined) {
        var paymentData = JSON.parse(checkoutJson);
      }else{
         setTimeout(() => {this.spinner.style.display = "none";}, 500);
        return;
      }
      // check createdOn date for back button
      if(paymentData.createdOn == undefined){
       setTimeout(() => {this.spinner.style.display = "none";}, 500);
        return;
      }
      if ( this.checkBackButtonEvent() && checkoutJson != undefined)  {
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

        if (!paymentData.checkoutData) {
            this.storeBasicData();
            this.AddStudentData();
            this.activeBreadCrumb("select-class");
            this.activateDiv("class-selection-container");
            this.displayStudentInfo("block");
        } else {
          this.displayStudentInfo("block");
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
        if(paymentData.selectedProgram && paymentData.suppPro.length > 0){
          this.updateSupplementaryProgramData(paymentData.suppPro);
          this.$selectedProgram = paymentData.selectedProgram;
          console.log("old selected program", this.$selectedProgram)
          this.displaySelectedSuppProgram(paymentData.upsellProgramIds);
          if(paymentData.selectedProgram.length > 0){
            this.hideShowNewStudentFee("none");
            this.$selectedProgram.forEach((program) => {
              this.updateAmount(program.amount);
            });
          }else{
            this.hideShowNewStudentFee("grid");
          }

          // checked and unchecked all elements based on data-upsell-program-id
          setTimeout(() => {
        const allCheckboxes = document.querySelectorAll("[programDetailId]");
        allCheckboxes.forEach((checkbox) => {
          console.log("checkbox", checkbox.getAttribute("programDetailId"), paymentData.upsellProgramIds.includes(parseInt(checkbox.getAttribute("programDetailId"))))
          if(paymentData.upsellProgramIds.includes(parseInt(checkbox.getAttribute("programDetailId")))){
            checkbox.checked = true;
          }
        });
      }, 1000);
        this.disableEnableBuyNowButton();

        }
      } else {
        // removed local storage when checkout page rendar direct without back button
        localStorage.removeItem("checkOutData");
      }
      setTimeout(() => {this.spinner.style.display = "none";}, 500);
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
  
      var $this = this;
      var form = $("#checkout-form");
      next_page_1.addEventListener("click", async function () {
        if (form.valid()) {
          $this.storeBasicData();
          $this.AddStudentData();
          $this.showSemesterBundleModal();
          $this.activeBreadCrumb("select-class");
          $this.activateDiv("class-selection-container");
          $this.displayStudentInfo("block");
        }
      });
  
      prev_page_1.addEventListener("click", function () {
        $this.activeBreadCrumb("student-details");
        $this.activateDiv("checkout_student_details");
        $this.displayStudentInfo("none");
      });

      let editStudentEl = document.querySelectorAll("[data-student-info='edit']")
      if (editStudentEl.length > 0) {
        editStudentEl.forEach(editBtn => {
          editBtn.addEventListener("click", function () {
            // click on edit button reinitialize payment tab
            $this.activeBreadCrumb("student-details");
            $this.activateDiv("checkout_student_details");
            $this.displayStudentInfo("none");
          })
        })
      }
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
        var suppData = await this.fetchData("getUpsellProgramTest/");
        // Check if there are any upsell programs
        var academicSuppData = suppData.find((item) => {
          return item.sessionId !== 2;
        });
        //this.$suppPro = academicSuppData ? academicSuppData.upsellPrograms : [];
        this.updateSupplementaryProgramData(academicSuppData ? academicSuppData.upsellPrograms : [])
        //this.updateAddonProgram();
        this.createBundlePrograms(suppData);
        // Setup back button for browser and stripe checkout page
        this.setUpBackButtonTab();
        this.spinner.style.display = "none";
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
        this.spinner.style.display = "none";
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
        location: selectBox.value,
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

          $this.updateCheckOutData(data)

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
  
      $this.addToCart();
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
    
    // Update amount when checkbox selected
    // handleUpSellSelection(){
    //   var upSellCheckbox = document.querySelectorAll('.bundleProgram');
    //   upSellCheckbox.forEach((checkbox) => {
    //     checkbox.addEventListener('change', (event) => {
    //       const programId = checkbox.getAttribute('programDetailId');
    //       if (checkbox.checked) {
    //         this.updateAmount(checkbox, checkbox.value);
    //        // this.updateAllSameProduct(programId, true);
    //       } else {
    //         this.updateAmount(checkbox, checkbox.value);
    //         // this.updateAllSameProduct(programId, false);
    //       }
    //     });
    //   });
    // }

  addToCart() {
      const addToCartButtons = document.querySelectorAll(".add-to-cart");
      var $this = this;
      addToCartButtons.forEach((button) => { 
        button.addEventListener("click", function (event) {
          console.log("selected program", $this.$selectedProgram)
          // Select all 'add-to-card' buttons
          // bundleProgram checkbox
          const checkboxes = document.querySelectorAll(".bundleProgram");
          checkboxes.forEach((checkbox) => {
            if (checkbox.checked) {
              // Toggle the checkbox state
              //checkbox.checked = !checkbox.checked;
              let upsellProgramId =  parseInt(checkbox.getAttribute("programDetailId"));
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
          $this.updateCheckOutData({upsellProgramIds: $this.$selectedProgram.map(item => item.upsellProgramId), suppPro: $this.$suppPro, selectedProgram: $this.$selectedProgram});
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
    updateAmount(amount){
      var totalAmountInput = document.getElementById("totalAmount");
      var totalPriceAllText = document.querySelectorAll(
        "[data-stripe='totalDepositPrice']"
      );
      var selectedIds = [];
      totalPriceAllText.forEach(totalPriceText=>{
        var sumOfSelectedPrograms = 0;
        sumOfSelectedPrograms = (
          this.$selectedProgram.reduce((total, program) => total + program.amount, 0)
        ).toFixed(2);
        var dataStripePrice = parseFloat(totalPriceText.getAttribute("data-stripe-price"));
        sumOfSelectedPrograms = parseFloat(sumOfSelectedPrograms) + parseFloat(dataStripePrice);
        totalPriceText.innerHTML = "$" + this.numberWithCommas(sumOfSelectedPrograms);
        
      });
      totalAmountInput.value =
          parseFloat(totalAmountInput.value) + parseFloat(amount);
      var suppProIdE = document.getElementById("suppProIds");
      var allSupIds = this.$selectedProgram.map(item => item.upsellProgramId);
      suppProIdE.value = JSON.stringify(allSupIds);

      // Update selected supplementary program ids
      this.displaySelectedSuppProgram(allSupIds);
      this.updateCheckOutData({upsellProgramIds: allSupIds});
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
    
    // Deposit price considered as single program
      let cartGridWrapper2 = creEl("div", "cart-grid-wrapper");
      let depositLabel = creEl("p", "main-text order-details-no-strike");
      depositLabel.innerHTML = "Deposit (Due Now)";
      let depositPrice = creEl("p", "main-text order-details-price-no-strike");
      depositPrice.innerHTML = "$300";
      depositPrice.setAttribute("data-stripe", "addon-deposit-price");
      cartGridWrapper2.prepend(depositLabel, depositPrice);
      selectedSuppPro.append( cartGridWrapper2);


      selectedData.forEach((sup) => {
      // bundle label and remove 
      let cartGridWrapper1 = creEl("div", "cart-grid-wrapper");
      let offeringType = creEl("div", "main-text bundle-sem");
      offeringType.innerHTML = sup.label;
      if(this.$coreData.upsellProgramId !== sup.upsellProgramId){
        let offeringRemove = creEl("div", "main-text brown-red-text-small align-right");
        offeringRemove.innerHTML = "Remove";
        offeringRemove.addEventListener("click", function () {
          $this.removeSuppProgram(sup.upsellProgramId);
        });
        cartGridWrapper1.prepend(offeringType, offeringRemove);
     }else{
        cartGridWrapper1.prepend(offeringType);
     }

      
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
      selectedSuppPro.append(cartGridWrapper1, cartGridWrapper3);
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
        
        this.updateCheckOutData({upsellProgramIds: arrayIds, selectedProgram: this.$selectedProgram});
        // Hide and show new student fee
        if(this.$selectedProgram.length > 0){
          this.hideShowNewStudentFee("none");
        }else{
          this.hideShowNewStudentFee("grid");
        }
      }
      
      this.disableEnableBuyNowButton()
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
                let sumOfSelectedPrograms = (
                  $this.$selectedProgram.reduce((total, program) => total + ((parseFloat(program.amount) + 0.3) / 0.971), 0)
                ).toFixed(2);
                coreDepositPrice = parseFloat(sumOfSelectedPrograms) + coreDepositPrice;
                // let addonPriceEl = document.querySelectorAll(
                //   "[data-stripe='addon_price']"
                // );
                // if (addonPriceEl) {
                //   addonPriceEl.forEach(addonPrice => {
                //     let addonPriceValue = addonPrice.getAttribute('addon-price')
                //       .replace(/,/g, "")
                //       .replace(/\$/g, "");
                //     addonPriceValue = (parseFloat(addonPriceValue) + 0.3) / 0.971;
                //     coreDepositPrice = addonPriceValue + coreDepositPrice;
                //   });
                // }
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
                  
              //   let addonPriceEl = document.querySelectorAll(
              //     "[data-stripe='addon_price']"
              //   );
              //   if (addonPriceEl) {
              //     addonPriceEl.forEach(addonPrice => {
              //       let addonPriceElValue =
              //         addonPrice.getAttribute("addon-price");
              //     addonPriceElValue = addonPriceElValue
              //       .replace(/,/g, "")
              //       .replace(/\$/g, "");
              //     amount = amount + parseFloat(addonPriceElValue);
              //   });
              // }
              var sumOfSelectedPrograms = (
          $this.$selectedProgram.reduce((total, program) => total + program.amount, 0)
        ).toFixed(2);
              deposit_price.innerHTML =
                "$" + $this.numberWithCommas(parseFloat(sumOfSelectedPrograms)+ parseFloat(amount));
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
          $this.updateBasicData('old_student');
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
      }else{
        return;
      }
      if ((returnType == "back" || ibackbutton.value == 1 || this.isWithinAWeek(paymentData.createdOn)) && checkoutJson != undefined ) {
        return true;
      }else {
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
    displayStudentInfo(display){
      document.querySelectorAll('.student-info-container').forEach(el=>el.style.display = display)
      var localCheckOutData = localStorage.getItem('checkOutBasicData')
      if(localCheckOutData != undefined){
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
      if(checkoutData != null && localCheckoutData != null){
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
          coreData.amount = coreAmount - dataStripePrice;
        }
        this.$coreData = coreData;
        var bundlePopUpText = creEl("p", "bundle-pop-up-text");
        bundlePopUpText.innerHTML = "*To get the bundle benefits, a future session must be selected and the full tuition is due at class registration.";

        var addonHeading = creEl('p', 'bundle-sem-title-medium')
        addonHeading.innerHTML = "Add Future Session(s) "
        var addonSubHeading = creEl("span", "poppins-para bundle-sem-text");
        addonSubHeading.innerHTML = "(select at least one to bundle)";
        addonHeading.appendChild(addonSubHeading)

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
    
    displayTotalDiscount(bundleData){
      const totalDiscount = bundleData.reduce((acc, bundle) => {
          const amount = Number(bundle.portal_amount) || 0;
          const discAmount = Number(bundle.portal_disc_amount) || 0;
          return acc + (discAmount - amount);
        }, 0);
      const discountEl = document.querySelectorAll('[data-addon="discount"]')
      discountEl.forEach(el=>{
        el.innerHTML = "$"+this.numberWithCommas(totalDiscount);
      })
    }
    // createModelBundleCard(singleBundleData) {
    //   var $this = this;
    //   const label = creEl("label", "option");
    //   const input = creEl("input", "bundleProgram");
    //   input.type = "checkbox";
    //   input.setAttribute("programDetailId", singleBundleData.upsellProgramId);
    //   input.value = singleBundleData.amount
    //     ? singleBundleData.amount
    //     : "3350";
    //   input.addEventListener("change", (event) => {
    //     console.log("Checkbox changed:", event.target.checked);
    //     if (event.target.checked) {
    //       // push in array if not already present
    //       if (!this.$selectedProgram.includes(singleBundleData)) {
    //         this.$selectedProgram.push(singleBundleData);
    //       }
    //     } else {
    //       // remove singleBundleData from $selectedProgram
    //       this.$selectedProgram = this.$selectedProgram.filter(
    //         (program) =>
    //           program.upsellProgramId !== singleBundleData.upsellProgramId
    //       );
    //     }
        
    //     // checked and unchecked all elements based on data-upsell-program-id
    //     const allCheckboxes = document.querySelectorAll("[programDetailId]");
    //     allCheckboxes.forEach((checkbox) => {
    //       if(checkbox.getAttribute("programDetailId") ==
    //       singleBundleData.upsellProgramId){
    //         checkbox.checked = event.target.checked;
    //       }
    //     });
    //     //$this.disableEnableBuyNowButton();
    //   });
    //   // check if $selectedProgram already contains singleBundleData
    //   const cardContent = creEl("div", "option-content");

    //   const seasonTitle = creEl("div", "term-title");
    //   seasonTitle.textContent = `${singleBundleData.label + "("+ singleBundleData.yearId+ ")" || "Winter/Spring"}`;

    //   const priceDiv = creEl("div", "price");
    //   const price = creEl("span", "original");
    //   price.textContent = singleBundleData.disc_amount
    //     ? `$${this.numberWithCommas(singleBundleData.disc_amount)}`
    //     : "$3,350";
    //   const originalPrice = creEl("span", "discounted-price");
    //   originalPrice.textContent = singleBundleData.amount
    //     ? `$${this.numberWithCommas(singleBundleData.amount)}`
    //     : "$3,770";
    //   priceDiv.appendChild(price);
    //   priceDiv.appendChild(originalPrice);


    //   cardContent.appendChild(seasonTitle);
    //   cardContent.appendChild(priceDiv);

    //   label.appendChild(input);
    //   label.appendChild(cardContent);
    //   return label;
    // }

     createBundleCard(singleBundleData, type="upsell", position="", coreData) {
      var $this = this;
      var flexContainer = creEl("div", "bundle-sem-content-flex-container");
      // Container
      if(position == "page"){
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
        : "Fall (2025)";
      const infoP = creEl("p", "bundle-sem-info");
      infoP.textContent = (singleBundleData.desc )
        ? (singleBundleData.desc || "")
        : "Fall Tuition + Early Bird (With Deposit)";
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
        : "$3,770";
      const discountPrice = creEl("div", "bundle-sem-pop-up-price-text");
      discountPrice.setAttribute("data-addon", "discount-price");
      let amount = (type !== "upsell") ? parseFloat(singleBundleData.amount) + parseFloat(this.amount) : singleBundleData.amount;
      discountPrice.textContent = singleBundleData.amount
        ? `$${this.numberWithCommas(amount)}`
        : "$3,350";
      priceFlex.appendChild(originalPrice);
      priceFlex.appendChild(discountPrice);

      // Assemble
      flexContainer.appendChild(textWithCheckbox);
      flexContainer.appendChild(priceFlex);

      // Checkbox logic
      input.addEventListener("change", (event) => {
        if (event.target.checked) {
          if (!this.$selectedProgram.includes(singleBundleData)) {
            this.$selectedProgram.push(singleBundleData);
            console.log("push selected program", this.$selectedProgram)
          }
          flexContainer.classList.add("border-brown-red");
        } else {
          this.$selectedProgram = this.$selectedProgram.filter(
            (program) => program.upsellProgramId !== singleBundleData.upsellProgramId
          );
          console.log("pop selected program", this.$selectedProgram)
          flexContainer.classList.remove("border-brown-red");
        }
        const allCheckboxes = document.querySelectorAll("[programDetailId]");
        allCheckboxes.forEach((checkbox) => {
          if (checkbox.getAttribute("programDetailId") == singleBundleData.upsellProgramId) {
            checkbox.checked = event.target.checked;
            checkbox.closest(".bundle-sem-content-flex-container")?.classList.toggle("border-brown-red", event.target.checked);
          }
        });
	$this.disableEnableBuyNowButton()
        // If this is a bundle (upsell), manage coreData in $selectedProgram
        $this.updateCoreData(type);
      });
      if (input.checked) {
        flexContainer.classList.add("border-brown-red");
      }

      return flexContainer;
    }

    updateCoreData( type="upsell"){
      var coreData = this.$coreData;
      if (type=="upsell" && coreData && coreData.upsellProgramId) {
          const isBundleSelected = this.$selectedProgram.some(
            (program) => program.upsellProgramId !== coreData.upsellProgramId
          );
          const isCoreSelected = this.$selectedProgram.some(
            (program) => program.upsellProgramId === coreData.upsellProgramId
          );
          if (isBundleSelected ) {
            if (!this.$selectedProgram.includes(coreData)) {
              if(!isCoreSelected){
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
    disableEnableBuyNowButton() {
      // is selected program is empty then disable the buy now button
      const buyNowButton = document.querySelectorAll(".add-to-cart, .bundle-add-to-cart");
      if (this.$selectedProgram.length === 0) {
        buyNowButton.forEach((button) => {
          button.innerHTML = "Add to Cart";
          button.classList.add("disabled");
        });
      } else {
        buyNowButton.forEach((button) => {
          button.innerHTML = "Update Cart";
          button.classList.remove("disabled");
        });
      } 
    }

  }
