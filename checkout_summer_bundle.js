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
		el.setAttribute("id", idName)
	}
	return el;
}
/**
 * CheckOutWebflow Class is used to intigrate with stripe payment.
 * In this API we pass baseUrl, memberData.
 * In this class we are manipulating student form and member data
 */

class CheckOutWebflow {
	$sessionData = [];
	$checkoutData = "";
	$suppPro = [];
	$selectedProgram = [];
	constructor(apiBaseUrl, memberData) {
		this.baseUrl = apiBaseUrl;
		this.memberData = memberData;
		this.renderPortalData();
		this.displaySupplementaryProgram();
		this.updatePriceForCardPayment()
		
	}

	// Passing all summer session data and creating a cart list
	displaySessionsData(data) {
		this.$sessionData = data.summerSessionData;
		// Getting main dom elment object to add summer session list with checkbox
		var sessionList = document.getElementById('checkout_session_data');
		var $this = this
		sessionList.innerHTML = "";
		if (data.summerSessionData.length > 0) {
			// filter summer inventory empty left spots
			var summerSessionData = data.summerSessionData.filter((item) => {
				var findFortLee = item.location.find((i) => i.locationId == 2 && i.leftSpot == 0)
				var findGlenRock = item.location.find((i) => i.locationId == 1 && i.leftSpot == 0)

				if (findFortLee == undefined || findGlenRock == undefined) {
					return true
				} else {
					return false
				}
			})

			summerSessionData.forEach((sData, i) => {
				// Getting single summer session  list
				var sList = this.createSessionList(sData, i);
				sessionList.appendChild(sList);
			})
		}
	}
	// Manipulating a single summer session list
	createSessionList(sessionProData, i) {
		var coreProductContainer = creEl('div', 'core-session-container core-product-container'+ (i ? ' margin-top' : ''));
		var $this = this;

		// Creating checkbox for summer list
		var coreCheckbox = creEl('div', 'core-checkbox');
		var wCheckbox = creEl('label', 'checkbox-field w-checkbox')
		var checkboxS = creEl('input', 'w-checkbox-input core-checkbox suppCheckbox');
		checkboxS.type = "radio";
		checkboxS.name = "checkbox";
		if (!i) {
			//this.updateLocation(sessionProData);
		}
		checkboxS.value = sessionProData.summerSessionId;
		checkboxS.setAttribute('data-name', 'Checkbox')
		checkboxS.addEventListener('change', function () {
			var locationSessionError = document.getElementById('locationSessionError');
			locationSessionError.style.display = 'none';
			$this.updateLocation(sessionProData);

		});
		wCheckbox.appendChild(checkboxS)
		var spantext = creEl('span', 'core-checkbox-label w-form-label')
		wCheckbox.appendChild(spantext)
		coreCheckbox.appendChild(wCheckbox)

		// Creating heading for summer session heading
		var coreProductTitle = creEl('div', 'core-product-title')
		var h1 = creEl('h1', 'core-product-title-text')
		h1.innerHTML = sessionProData.summerSessionName;
		var div = creEl('div', 'core-product-title-subtext')
		const startDate = new Date(sessionProData.startDate)
		const endDate = new Date(sessionProData.endDate)
		const month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
		div.innerHTML = month[startDate.getMonth()]  + ' ' + startDate.getDate() + ', ' + startDate.getFullYear() + ' - ' + endDate.getDate() + ' ' + month[endDate.getMonth()] + ' ' + startDate.getFullYear();

		coreProductTitle.prepend(h1, div)

		coreProductContainer.prepend(coreProductTitle, coreCheckbox)

		return coreProductContainer;
	}
	// Based on session selection we are showing location
	updateLocation(sessionData) {

		var location = sessionData.location;
		var fortLeeContainer = document.getElementById('fortLeeContainer');
		var GlenRockContainer = document.getElementById('GlenRockContainer');
		var LivingstonContainer = document.getElementById('LivingstonContainer');
		var next_page_2 = document.getElementById('next_page_2');
		GlenRockContainer.style.display = "none";
		fortLeeContainer.style.display = "none";
		LivingstonContainer.style.display = "none";
		next_page_2.style.display = 'block';
		if (this.memberData.programId == '102') {
			var findFortLee = location.filter((i) => i.locationId == 2 && i.leftSpot > 0)
			var findGlenRock = location.filter((i) => i.locationId == 1 && i.leftSpot > 0)
			var findLivingston = location.filter((i) => i.locationId == 4 && i.leftSpot > 0)
			if (findFortLee.length == 2) {
				fortLeeContainer.style.display = "flex"
			}
			if (findGlenRock.length == 2) {
				GlenRockContainer.style.display = "flex"
			}
			if (findLivingston.length == 2) {
				LivingstonContainer.style.display = "flex"
			}

			if (findFortLee.length != 2 && findGlenRock.length != 2 && findLivingston.length != 2) {
				next_page_2.style.display = 'none';
				document.querySelector('.cart-location-container').style.display = "none";
			}else{
				document.querySelector('.cart-location-container').style.display = "block";
			}

		} else {
			var findFortLee = location.find((i) => i.locationId == 2 && i.programId == this.memberData.programId && i.leftSpot > 0)
			if (findFortLee != undefined) {
				fortLeeContainer.style.display = "flex"
			}
			var findGlenRock = location.find((i) => i.locationId == 1 && i.programId == this.memberData.programId && i.leftSpot > 0)

			if (findGlenRock != undefined) {
				GlenRockContainer.style.display = "flex"
			}

			var findLivingston = location.find((i) => i.locationId == 4 && i.programId == this.memberData.programId && i.leftSpot > 0)

			if (findLivingston != undefined) {
				LivingstonContainer.style.display = "flex"
			}

			if (findFortLee == undefined && findGlenRock == undefined && findLivingston == undefined) {
				next_page_2.style.display = 'none';
				document.querySelector('.cart-location-container').style.display = "none";
			}else{
				document.querySelector('.cart-location-container').style.display = "block";
			}
		}
	}
	// API Call for validate user for program for level 2A
	async validateUserForProgram() {
		var studentFirstName = document.getElementById('Student-First-Name');
		var studentLastName = document.getElementById('Student-Last-Name');
		var data = {
			"firstName": studentFirstName.value,
			"lastName": studentLastName.value,
			"memberId": this.memberData.memberId,
		}
		const rawResponse = await fetch('https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/validateUserForProgram', {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});
		const content = await rawResponse.json();
		return content;
	}
	// formatting price in comma based value
	numberWithCommas(x) {
		return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}
	// Get API data with the help of endpoint
	async fetchData(endpoint) {
		try {
			const response = await fetch(`${this.baseUrl}${endpoint}`);
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Error fetching data:', error);
			throw error;
		}
	}
	// API call for stripe checkout URL 
	initializeStripePayment() {
		var studentFirstName = document.getElementById('Student-First-Name');
		var studentLastName = document.getElementById('Student-Last-Name');
		var studentEmail = document.getElementById('Student-Email');
		var studentGrade = document.getElementById('Student-Grade');
		var studentSchool = document.getElementById('Student-School');
		var studentGender = document.getElementById('Student-Gender');
		var prevStudent = document.getElementById('prevStudent-2');
		var suppProIdE = document.getElementById('suppProIds');
		var core_product_price = document.getElementById('core_product_price');
		// var fort_lee_location = document.getElementById('fort_lee_location');
		// var glen_rock_location = document.getElementById('glen_rock_location');
		// var summerSessionId = document.querySelector('input[name = checkbox]:checked').value;

		//Utm Source
		let localUtmSource = localStorage.getItem("utm_source");
		
		//Payment button
		var next_page_2 = document.getElementById('next_page_2');
		next_page_2.innerHTML ="Processing..."
		
		var cancelUrl = new URL("https://www.bergendebate.com"+window.location.pathname);
		//var cancelUrl = new URL(window.location.href);
		console.log(window.location.href)
		// Check if the URL already has a query string returnType based on the current URL
		if (!cancelUrl.searchParams.has('returnType')) {
			cancelUrl.searchParams.set('returnType', 'back');
		}
		//console.log(cancelUrl)
		var data = {
			"email": this.memberData.email,
			"studentEmail": studentEmail.value,
			"firstName": studentFirstName.value,
			"lastName": studentLastName.value,
			"grade": studentGrade.value,
			"label": this.memberData.programName,
			"school": studentSchool.value,
			"gender": studentGender.value,
			"prevStudent": prevStudent.value,
			// "locationId": (fort_lee_location.checked) ? 2 : 1,
			// "summerSessionId": parseInt(summerSessionId),
			"programId": this.memberData.programId,
			"successUrl": "https://www.bergendebate.com/payment-confirmation?type=Summer&programName=" + this.memberData.programName,
			//"successUrl":"https://www.bergendebate.com/members/"+this.webflowMemberId,
			"cancelUrl": cancelUrl.href,
			"memberId": this.memberData.memberId,
			"achAmount": parseFloat(this.memberData.achAmount.replace(/,/g, '')),
			"cardAmount": parseFloat(this.memberData.cardAmount.replace(/,/g, '')),
			"utm_source": (localUtmSource != null) ? localUtmSource : "null"
		}


		var xhr = new XMLHttpRequest()
		var $this = this;
		xhr.open("POST", "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/createNewProgramCheckoutUrls", true)
		xhr.withCredentials = false
		xhr.send(JSON.stringify(data))
		xhr.onload = function () {
			let responseText = JSON.parse(xhr.responseText);
			console.log('responseText', responseText)
			if (responseText.success) {

				$this.$checkoutData = responseText;

				//Storing data in local storage
				data.checkoutData = responseText
				localStorage.setItem("checkOutData", JSON.stringify(data));

				next_page_2.innerHTML ="Next"
			}

		}
	}

	updateStudentDataInDB(){
		let checkOutData = localStorage.getItem('checkOutData')
		if(checkOutData == undefined){
			return true
		}
		var locationId = document.querySelector('input[name = radio]:checked').value;
		var summerSessionId = document.querySelector('input[name = checkbox]:checked').value;
		
		//Payment button
		var ach_payment = document.getElementById('ach_payment');
		var card_payment = document.getElementById('card_payment');
		var paylater_payment = document.getElementById('paylater_payment');
		ach_payment.innerHTML = "Processing..."
		ach_payment.disabled = true;
		card_payment.innerHTML = "Processing..."
		card_payment.disabled = true;
		paylater_payment.innerHTML = "Processing..."
		paylater_payment.disabled = true;
		
		checkOutData = JSON.parse(checkOutData)
		var data = {
			"checkoutId": checkOutData.checkoutData.checkoutId,
			"locationId": parseInt(locationId),
			"summerSessionId": parseInt(summerSessionId)
		}
		checkOutData.updateData = data
		localStorage.setItem("checkOutData", JSON.stringify(checkOutData));
		
		var xhr = new XMLHttpRequest()
		var $this = this;
		xhr.open("POST", "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/updateDataToCheckoutUrl", true)
		xhr.withCredentials = false
		xhr.send(JSON.stringify(data))
		xhr.onload = function () {
			let responseText = JSON.parse(xhr.responseText);
			console.log('responseText', responseText)
			ach_payment.innerHTML = "Checkout"
			ach_payment.disabled = false;
			card_payment.innerHTML = "Checkout"
			card_payment.disabled = false;
			paylater_payment.innerHTML = "Checkout"
			paylater_payment.disabled = false;

		}
	}

	updateClickEventInDB(checkOutUrl, paymentType) {
		let checkOutData = localStorage.getItem('checkOutData')
    var ach_payment = document.getElementById('ach_payment');
		var card_payment = document.getElementById('card_payment');
    ach_payment.innerHTML = "Processing..."
    ach_payment.style.pointerEvents = "none";
    card_payment.innerHTML = "Processing..."
    card_payment.style.pointerEvents = "none";
		if(checkOutData == undefined){
			return true
		}
		//
		var cancelUrl = new URL("https://www.bergendebate.com"+window.location.pathname);
		//var cancelUrl = new URL(window.location.href);
		console.log(window.location.href)
		// Check if the URL already has a query string returnType based on the current URL
		if (!cancelUrl.searchParams.has('returnType')) {
			cancelUrl.searchParams.set('returnType', 'back');
		}
		
		checkOutData = JSON.parse(checkOutData)
		var data = {
			"checkoutId": checkOutData.checkoutData.checkoutId,
			"isSummerData": true,
			"upsellProgramIds": this.$selectedProgram.map(item => item.upsellProgramId),
			"successUrl": "https://www.bergendebate.com/payment-confirmation?type=Summer&programName=" + this.memberData.programName,
			//"successUrl":"https://www.bergendebate.com/members/"+this.webflowMemberId,
			"cancelUrl": cancelUrl.href
		}
		
		var xhr = new XMLHttpRequest()
		var $this = this;
		xhr.open("POST", "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/updateDataToCheckoutUrl", true)
		xhr.withCredentials = false
		xhr.send(JSON.stringify(data))
		xhr.onload = function () {
			let responseText = JSON.parse(xhr.responseText);
			console.log('responseText', responseText)
      if (responseText.success) {
        $this.$checkoutData = responseText;
        if (paymentType == 'ach_payment' && responseText.achUrl) {
          ach_payment.innerHTML = "Checkout"
          ach_payment.style.pointerEvents = "auto";
          window.location = responseText.achUrl;
        } else if (paymentType == 'card_payment' && responseText.cardUrl) {
          card_payment.innerHTML = "Checkout"
          card_payment.style.pointerEvents = "auto";
          window.location = responseText.cardUrl;
        } else if (paymentType == 'paylater_payment' && responseText.paylaterUrl) {
          paylater_payment.innerHTML = "Checkout"
          paylater_payment.style.pointerEvents = "auto";
          window.location = responseText.paylaterUrl;
        } else {
          window.location = checkOutUrl;
        }
      }else {
        window.location = checkOutUrl;
      }
    }
	}
  
	
	// Hide and show tab for program selection, student info and checkout payment
	activateDiv(divId) {
		var divIds = ['checkout_program', 'checkout_student_details', 'checkout_payment', 'pf_labs_error_message'];
		// Remove the active class from all div elements
		divIds.forEach(id => document.getElementById(id).classList.remove('active_checkout_tab'));
		// Add the active class to the div with the specified id
		document.getElementById(divId).classList.add('active_checkout_tab');
	}
	// Managing next and previous button 
	addEventForPrevNaxt() {
		var next_page_1 = document.getElementById('next_page_1');
		var next_page_2 = document.getElementById('next_page_2');
		var prev_page_1 = document.getElementById('prev_page_1');
		var prev_page_2 = document.getElementById('prev_page_2');
		var $this = this;
		var form = $("#checkout-form");
		next_page_1.addEventListener('click', async function () {
			if (form.valid()) {
				$this.storeBasicData();
				var eligible = true;
				if ($this.memberData.programId == '101') {
					next_page_1.innerHTML = 'Processing'
					const validate = await $this.validateUserForProgram();
					next_page_1.innerHTML = 'Next'
					eligible = validate.eligible;
				}
				$this.initializeStripePayment();
				if (eligible) {
					$this.activateDiv('checkout_student_details');
					$this.activeBreadCrumb('select-class')
				} else {
					$this.activateDiv('pf_labs_error_message');
				}
			}
		})
		next_page_2.addEventListener('click', function () {
			var summerSessionId = document.querySelector('input[name = checkbox]:checked');
			var locationId = document.querySelector('input[name = radio]:checked');
			var locationSessionError = document.getElementById('locationSessionError');
			if (summerSessionId && locationId) {
				locationSessionError.style.display = 'none';
				$this.activeBreadCrumb('pay-deposite')
				$this.activateDiv('checkout_payment');
				$this.showSemesterBundleModal()
				$this.updateStudentDataInDB();
			} else {
				locationSessionError.style.display = 'block';
			}


		})
		prev_page_1.addEventListener('click', function () {
			$this.activateDiv('checkout_program');
			$this.activeBreadCrumb('student-details')
		})
		pflabs_prev_page_1.addEventListener('click', function () {
			$this.activateDiv('checkout_program');
			$this.activeBreadCrumb('student-details')
		})
		prev_page_2.addEventListener('click', function () {
			// click on back button reinitialze payment tab
			document.getElementsByClassName("bank-transfer-tab")[0].click();
			//document.getElementById('w-tabs-1-data-w-tab-0').click()
			setTimeout(function () {
				$(".w-tab-link").removeClass("w--current");
				$(".w-tab-pane").removeClass("w--tab-active");
				Webflow.require('tabs').redraw();
			}, 2000);

			$this.activateDiv('checkout_student_details');
			$this.activeBreadCrumb('select-class')
		})

		//Coupon code variable
		var coupon_code_button = document.getElementById('coupon_code_button');
		var coupon_2f_code = document.getElementById('coupon_2f_code');
		var code2fErrorMsg = document.getElementById('code-2f-error-msg');
		//Added event for validate 2F coupon code
		coupon_code_button.addEventListener('click',function(event){
			event.preventDefault();
			if(coupon_2f_code.value == ''){
				code2fErrorMsg.style.display = 'block';
				code2fErrorMsg.innerHTML = 'Please insert coupon code';
			}else if(coupon_2f_code.value != 'TVUM89NX4P'){
				code2fErrorMsg.style.display = 'block';
				code2fErrorMsg.innerHTML = 'The code you entered is invalid. Please enter a different code.';
			}else{
				code2fErrorMsg.style.display = 'none';
				$this.activateDiv('checkout_student_details');
				$this.activeBreadCrumb('select-class')
			}
		})
	}
	// store basic student form data in local storage
	storeBasicData() {
		var studentFirstName = document.getElementById('Student-First-Name');
		var studentLastName = document.getElementById('Student-Last-Name');
		var studentEmail = document.getElementById('Student-Email');
		var studentGrade = document.getElementById('Student-Grade');
		var studentSchool = document.getElementById('Student-School');
		var studentGender = document.getElementById('Student-Gender');
		var prevStudent = document.getElementById('prevStudent-2');
		var studentName = document.getElementById('studentName');
		//save data in local storage
		var data = {
			"studentEmail": studentEmail.value,
			"firstName": studentFirstName.value,
			"lastName": studentLastName.value,
			"grade": studentGrade.value,
			"school": studentSchool.value,
			"gender": studentGender.value,
			"prevStudent": prevStudent.value,
		}
		studentName.innerHTML = studentFirstName.value + ' ' + studentLastName.value;
		localStorage.setItem("checkOutBasicData", JSON.stringify(data));
	}
	// update basic student form data from local storage
	updateBasicData() {
		var checkoutJson = localStorage.getItem("checkOutBasicData");
		if (checkoutJson != undefined) {
			var paymentData = JSON.parse(checkoutJson);
			var studentFirstName = document.getElementById('Student-First-Name');
			var studentLastName = document.getElementById('Student-Last-Name');
			var studentEmail = document.getElementById('Student-Email');
			var studentGrade = document.getElementById('Student-Grade');
			var studentSchool = document.getElementById('Student-School');
			var studentGender = document.getElementById('Student-Gender');
			var prevStudent = document.getElementById('prevStudent-2');

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
		}
	}
	// handle payment button click like ach, card and pay later
	handlePaymentEvent() {
		var ach_payment = document.getElementById('ach_payment');
		var card_payment = document.getElementById('card_payment');
		var paylater_payment = document.getElementById('paylater_payment');
		// Browser back button event hidden fields
		var ibackbutton = document.getElementById("backbuttonstate");
		var $this = this;
		ach_payment.addEventListener('click', function () {
			// ach_payment.innerHTML = "Processing..."
			// $this.initializeStripePayment('us_bank_account', ach_payment);
			ibackbutton.value = "1";
			$this.updateClickEventInDB($this.$checkoutData.achUrl, 'ach_payment');
			//window.location.href = $this.$checkoutData.achUrl;
		})
		card_payment.addEventListener('click', function () {
			// card_payment.innerHTML = "Processing..."
			// $this.initializeStripePayment('card', card_payment);
			ibackbutton.value = "1";
			$this.updateClickEventInDB($this.$checkoutData.cardUrl, 'card_payment');
			//window.location.href = $this.$checkoutData.cardUrl;
		})
		paylater_payment.addEventListener('click', function () {
			// paylater_payment.innerHTML = "Processing..."
			// $this.initializeStripePayment('paylater', paylater_payment);
			ibackbutton.value = "1";
			$this.updateClickEventInDB($this.$checkoutData.payLaterUrl, 'paylater_payment');
			//window.location.href = $this.$checkoutData.payLaterUrl;
		})
	}

	// Setup back button for stripe back button and browser back button
	setUpBackButtonTab() {
		var query = window.location.search;
		var urlPar = new URLSearchParams(query);
		var returnType = urlPar.get('returnType');
		// Get local storage data for back button
		var checkoutJson = localStorage.getItem("checkOutData");
		// Browser back button event hidden fields
		var ibackbutton = document.getElementById("backbuttonstate");
		if ((returnType == 'back' || ibackbutton.value == 1) && checkoutJson != undefined) {
			var paymentData = JSON.parse(checkoutJson);
			//console.log('checkoutData', paymentData)

			var studentFirstName = document.getElementById('Student-First-Name');
			var studentLastName = document.getElementById('Student-Last-Name');
			var studentEmail = document.getElementById('Student-Email');
			var studentGrade = document.getElementById('Student-Grade');
			var studentSchool = document.getElementById('Student-School');
			var studentGender = document.getElementById('Student-Gender');
			var prevStudent = document.getElementById('prevStudent-2');
			var fort_lee_location = document.getElementById('fort_lee_location');
			var glen_rock_location = document.getElementById('glen_rock_location');
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
			if (paymentData.updateData.locationId == 1) {
				fort_lee_location.checked = true;
			} else if(paymentData.updateData.locationId == 4){
				livingston_location.checked = true;
			} else {
				glen_rock_location.checked = true;
			}
			if(paymentData.updateData.locationId){
				document.querySelector('.cart-location-container').style.display = "block";
			}
			const sessionEls = document.querySelectorAll('input[data-name="Checkbox"]');
			sessionEls.forEach(el=>{
				if(el.value == paymentData.updateData.summerSessionId){
					el.checked = true;
				}
			})

			if (paymentData.checkoutData) {
				this.$checkoutData = paymentData.checkoutData;
				this.activateDiv('checkout_payment');
			}
		} else {
			// removed local storage when checkout page rendar direct without back button
			localStorage.removeItem("checkOutData");
		}
	}
	// After API response we call the displaySessionsData method to manipulate session data 
	async renderPortalData(memberId) {
		try {
			// Handle checkout button
			this.handlePaymentEvent();
			// Handle previous and next button
			this.addEventForPrevNaxt();
			// activate program tab
			this.activateDiv('checkout_program')

			// loader icon code
			var spinner = document.getElementById('half-circle-spinner');
			spinner.style.display = 'block';
			// API call
			const data = await this.fetchData('getSummerSessionDetails/' + this.memberData.memberId + '/' + this.memberData.programId);
			// Display summer session
			this.displaySessionsData(data)
			// Setup back button for browser and stripe checkout page
			//this.setUpBackButtonTab();
			// Update basic data
			this.updateBasicData();
			// Hide spinner 
			spinner.style.display = 'none';
		} catch (error) {
			console.error('Error rendering random number:', error);
		}
	}
	// Progress Bar
	activeBreadCrumb(activeId) {
		let breadCrumbList = document.querySelectorAll(" ul.c-stepper li");
		breadCrumbList.forEach((element) => element.classList.remove("active"));
		document.getElementById(activeId).classList.add("active");
	}


	// Add modal related code

	addToCart() {
      // Select all 'add-to-card' buttons
      const addToCartButtons = document.querySelectorAll(".add-to-cart");
      var $this = this;
      addToCartButtons.forEach((button) => { 
        button.addEventListener("click", function (event) {
			event.preventDefault()
          // bundleProgram checkbox
          const checkboxes = document.querySelectorAll(".bundleProgram");
          checkboxes.forEach((checkbox) => {
            //if (checkbox.checked) {
              // Toggle the checkbox state
              //checkbox.checked = !checkbox.checked;
              let upsellProgramId =  parseInt(checkbox.getAttribute("programDetailId"));
              // upsellProgramId already available in selectProgramData don't update the amount
              var suppProIdE = document.getElementById("suppProIds");
              let selectedIds = JSON.parse(suppProIdE.value);
              //if (!selectedIds.includes(upsellProgramId)) {
                $this.updateAmount(checkbox.value);
              //}
            //}
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
          
          $this.disableEnableBuyNowButton();
          //$this.updateCheckOutData({upsellProgramIds: $this.$selectedProgram.map(item => item.upsellProgramId), suppPro: $this.$suppPro, selectedProgram: $this.$selectedProgram});
        });
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
		if(this.$selectedProgram.length > 0){
			 sumOfSelectedPrograms = (
			this.$selectedProgram.reduce((total, program) => total + program.amount, 0)
			).toFixed(2);
      var dataStripePrice = totalPriceText.getAttribute("data-stripe-price");
      //1,750.00 convert to 1750.00
      if(dataStripePrice){
        dataStripePrice = dataStripePrice.replace(/,/g, '');
      }
			var dataStripePrice = parseFloat(dataStripePrice);
			sumOfSelectedPrograms = parseFloat(sumOfSelectedPrograms) + parseFloat(dataStripePrice);
			totalPriceText.innerHTML = "$" + this.numberWithCommas(sumOfSelectedPrograms);
		}else{
			var dataStripePrice = totalPriceText.getAttribute("data-stripe-price");
      if(dataStripePrice){
        dataStripePrice = dataStripePrice.replace(/,/g, '');
      }
      dataStripePrice = parseFloat(dataStripePrice);
      totalPriceText.innerHTML = "$" + this.numberWithCommas(dataStripePrice);
		}
       
        
      });
      totalAmountInput.value =
          parseFloat(totalAmountInput.value) + parseFloat(amount);
      var suppProIdE = document.getElementById("suppProIds");
      var allSupIds = this.$selectedProgram.map(item => item.upsellProgramId);
      suppProIdE.value = JSON.stringify(allSupIds);

      // Update selected supplementary program ids
      this.displaySelectedSuppProgram(allSupIds);
    }
	displaySelectedSuppProgram(selectedIds) {
      var selectedSuppPro = document.getElementById("add-on-program-desktop");
      var selectedSuppProMob = document.getElementById("add-on-program-mobile");
  
      if (selectedSuppPro != null) {
        selectedSuppPro.innerHTML = "";
        if (selectedIds.length > 0) {
          this.displaySelectedSuppPrograms(selectedIds, selectedSuppPro);
          selectedSuppPro.style.display = "block";
        }
        else {
          selectedSuppPro.style.display = "none";
        }
      }
  
      if (selectedSuppProMob != null) {
        selectedSuppProMob.innerHTML = "";
        if (selectedIds.length > 0) {
          this.displaySelectedSuppPrograms(selectedIds, selectedSuppProMob);
          selectedSuppProMob.style.display = "block";
        }
        else {
          selectedSuppProMob.style.display = "none";
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
      // let cartGridWrapper2 = creEl("div", "cart-grid-wrapper");
      // let depositLabel = creEl("p", "main-text order-details-no-strike");
      // depositLabel.innerHTML = "Deposit (Due Now)";
      // let depositPrice = creEl("p", "main-text order-details-price-no-strike");
      // depositPrice.innerHTML = "$300";
      // depositPrice.setAttribute("data-stripe", "addon-deposit-price");
      // cartGridWrapper2.prepend(depositLabel, depositPrice);
      // selectedSuppPro.append( cartGridWrapper2);


      selectedData.forEach((sup) => {
        let mainGridWrapper = creEl("div", "cart-grid-wrapper");
      // bundle label and remove 
      let cartGridWrapper1 = creEl("div", "cart-grid-wrapper order-detail");
      let offeringType = creEl("p", "main-text bundle-semester");
      offeringType.innerHTML = sup.label;
      if(this.$coreData.upsellProgramId !== sup.upsellProgramId){
        let offeringRemove = creEl("p", "main-text brown-red-text-small");
        offeringRemove.innerHTML = "Remove";
        offeringRemove.addEventListener("click", function () {
          $this.removeSuppProgram(sup.upsellProgramId);
        });
        cartGridWrapper1.prepend(offeringType, offeringRemove);
     }else{
        cartGridWrapper1.appendChild(offeringType);
     }
     mainGridWrapper.appendChild(cartGridWrapper1)
      
      // bundle amount considered as single program
      //let cartGridWrapper3 = creEl("div", "cart-grid-wrapper");
      // let bundleLabel = creEl("p", "main-text order-details-no-strike");
      // bundleLabel.innerHTML = "Bundle Price";
      let bundlePrice = creEl("div","main-text order-details-price-no-strike");
      bundlePrice.innerHTML = "$" + $this.numberWithCommas(parseFloat(sup.amount).toFixed(2));
      bundlePrice.setAttribute("data-stripe", "addon_price");
      bundlePrice.setAttribute("addon-price",$this.numberWithCommas(parseFloat(sup.amount).toFixed(2)));
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

        checkboxEl.forEach((checkbox) => {
          let programDetailId = checkbox.getAttribute("programDetailId");
          if (programDetailId == suppId) {
            // Find the closest parent div
            const parentDiv = checkbox.closest("div").parentElement;
            //if (checkbox.checked) {
              checkbox.checked = !checkbox.checked;
              this.updateAmount(checkbox.value);
            //}
  
            // Find the corresponding "add-to-card" button inside the same parent div
            // var addToCardButton = parentDiv.querySelector(".add-to-card");
            // if (addToCardButton != undefined) {
            //   addToCardButton.innerHTML = "Add to Cart";
            //   addToCardButton.classList.remove("disabled");
            //   addToCardButton.style.pointerEvents = "auto";
            //   addToCardButton.style.color = "";
            // }
          }
        });
        // Update tab
        // let paymentTab = document.querySelectorAll(".payment-cards-tab-link");
        // paymentTab[0].click();
        
        //this.updateCheckOutData({upsellProgramIds: arrayIds, selectedProgram: this.$selectedProgram});
        // Hide and show new student fee
        // if(this.$selectedProgram.length > 0){
        //   this.hideShowNewStudentFee("none");
        // }else{
        //   this.hideShowNewStudentFee("grid");
        // }
		
      }
	  this.disableEnableBuyNowButton();
    }
	async displaySupplementaryProgram() {
		var suppData = await this.fetchData("getUpsellProgramTest/");
        // Check if there are any upsell programs
        var academicSuppData = suppData.find((item) => {
          return item.sessionId == 2;
        });
        //this.$suppPro = academicSuppData ? academicSuppData.upsellPrograms : [];
        this.updateSupplementaryProgramData(academicSuppData ? academicSuppData.upsellPrograms : [])
		
		this.createBundlePrograms(suppData);
		this.noThanksEvent();
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
        return  item.sessionId == 2;
      });

      academicData.forEach((item) => {
        var currentSessionId = item.sessionId;
        // remove current Session Data based on summerSessionId item.
        // var bundleData = item.upsellPrograms.filter(
        //   (bundle) => bundle.sessionId != currentSessionId && bundle.yearId != item.yearId
        // );
        // var coreData = item.upsellPrograms.find(
        //   (bundle) => bundle.sessionId == currentSessionId
        // );
		var bundleData = item.upsellPrograms;

		if (this.memberData.achAmount && typeof this.memberData.achAmount === "string") {
			// Remove commas and parse as float
			let achAmount = parseFloat(this.memberData.achAmount.replace(/,/g, ""));
			// Add 50 and assign to disc_amount
			var disc_amount = (achAmount + 50).toFixed(2);
		}
		var coreData = {
			"amount": this.memberData.achAmount,
			"bundle_type": "Summer",
			"desc": "Last Year's Locked-In Tuition + $50 Off | Full-Day Enrollment",
			"disc_amount": this.numberWithCommas(disc_amount),
			"label": "Summer",
			"sessionId": 2,
			"upsellProgramId": 99,
			"yearId": 2025
		}
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
	  var input = creEl("input", "bundle-sem-checkbox bundleProgram");
		if (type !== "upsell"){
			input = creEl("input", "bundle-sem-checkbox");
	   	}
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
        : "Summer (2025)";
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
      //let amount = (type !== "upsell") ? parseFloat(singleBundleData.amount) + parseFloat(this.amount) : singleBundleData.amount;
      // removed deposit amount
      let amount = singleBundleData.amount;
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
        //$this.updateCoreData(type);
       // $this.disableEnableBuyNowButton(false)
        //console.log("Final pop selected program", this.$selectedProgram)
        // Update the cart
        $this.updateAmount(event.target.value);
        // let paymentTab = document.querySelectorAll(".payment-cards-tab-link");
        // paymentTab[0].click(); 
        //$this.hideShowNewStudentFee("none");
        //window.scrollTo({ top: 0, behavior: "smooth" });
        //$this.updateCheckOutData({upsellProgramIds: $this.$selectedProgram.map(item => item.upsellProgramId), suppPro: $this.$suppPro, selectedProgram: $this.$selectedProgram});
        ///$this.$oldSelectedProgram = $this.$selectedProgram;
      });
      if (input.checked) {
        flexContainer.classList.add("border-brown-red");
      }

      return flexContainer;
    }
    // createBundlePrograms(academicData) {
    //   const cardContainer = document.querySelector(
    //     "[data-upSell='card-container']"
    //   );
    //   const modalCardContainer = document.querySelector(
    //     "[data-upSell='modal-card-container']"
    //   );
    //   if (!cardContainer) {
    //     return;
    //   }
    //   if (!modalCardContainer) {
    //     return;
    //   }
    //   modalCardContainer.innerHTML = ""; // Clear existing content
    //   cardContainer.innerHTML = ""; // Clear existing content
    //   // remove remove session data based on summerSessionId 2
    //   academicData = academicData.filter((item) => {
    //     return item.sessionId !== 2;
    //   });

    //   academicData.forEach((item) => {
    //     var currentSessionId = item.sessionId;
    //     // remove current Session Data based on summerSessionId item.
    //     var bundleData = item.upsellPrograms.filter(
    //       (bundle) => bundle.sessionId !== currentSessionId
    //     );
    //     bundleData.forEach((singleBundleData) => {
    //       var card = this.createBundleCard(singleBundleData);
    //       cardContainer.appendChild(card);
    //       var modelCard = this.createModelBundleCard(singleBundleData);
    //       modalCardContainer.appendChild(modelCard);
    //     });
    //   });
    //   this.disableEnableBuyNowButton();
    // }
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

    // createBundleCard(singleBundleData) {
    //   var $this = this;
    //   const planOption = creEl("div", "plan-option");

    //   // Checkbox label and input
    //   const label = creEl("label", "checkbox");
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
    //   const seasonTitle = creEl("div", "term-title");
    //   seasonTitle.textContent = `${singleBundleData.label + "("+ singleBundleData.yearId+ ")" || "Winter/Spring"}`;
       
    //   label.appendChild(input);
    //   label.appendChild(seasonTitle);

    //   // Price div
    //   const priceDiv = creEl("div", "price");
    //   const discounted = creEl("span", "discounted");
    //   discounted.textContent = singleBundleData.amount
    //     ? `$${this.numberWithCommas(singleBundleData.amount)}`
    //     : "$3,350";
    //   const original = creEl("span", "original");
    //   original.textContent = singleBundleData.disc_amount
    //     ? `$${this.numberWithCommas(singleBundleData.disc_amount)}`
    //     : "$3,770";
    //   priceDiv.appendChild(discounted);
    //   priceDiv.appendChild(original);

    //   // Assemble
    //   planOption.appendChild(label);
    //   planOption.appendChild(priceDiv);

    //   return planOption;
    // }

    disableEnableBuyNowButton() {
      // is selected program is empty then disable the buy now button
      const buyNowButton = document.querySelectorAll(".add-to-cart, .bundle-add-to-cart");
      if (this.$selectedProgram.length === 0) {
        buyNowButton.forEach((button) => {
          button.innerHTML = "Add to Cart"; // Disable each button
        });
      } else {
        buyNowButton.forEach((button) => {
          button.innerHTML = "Update Cart"; // Enable each button
        });
      } 
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
	  
	  // data-upSell="learn-more"
      learnMore.addEventListener("click", function (event) {
		event.preventDefault()
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
  
    checkSemesterBundleModalOpen() {
      let isOpen = false;
      // Direct check with checkbox with bundleProgram class
      const bundleCheckbox = document.querySelector(".bundleProgram");
      if (bundleCheckbox && bundleCheckbox.checked) {
        isOpen = true;
      }
      // check summerBundleModalClosed cookie date time for 1 hour. no need to show if less then 1 hour
      const summerBundleModalClosed = document.cookie
        .split("; ")
        .find((row) => row.startsWith("summerBundleModalClosed="));
      if (summerBundleModalClosed) {
        const closedTime = new Date(
          decodeURIComponent(summerBundleModalClosed.split("=")[1])
        );
        const currentTime = new Date();
        const oneHour = 60 * 60 * 1000;
        if (currentTime - closedTime < oneHour) {
          isOpen = true;
        }
      }
      return isOpen;
    }

	updatePriceForCardPayment() {
      var $this = this;
      let paymentTab = document.querySelectorAll(".checkout-tab-link");
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
               if(addonDepositPrices.length > 0){
                 addonDepositPrices.forEach(addonDepositPrice =>{
                   addonDepositPrice.innerHTML =   "$" + $this.numberWithCommas(coreDepositPrice.toFixed(2));  
                 })
               }
                let sumOfSelectedPrograms = (
                  $this.$selectedProgram.reduce((total, program) => total + ((parseFloat(program.amount) + 0.3) / 0.971), 0)
                ).toFixed(2);
                // if($this.$selectedProgram.length > 0){
                //     coreDepositPrice = parseFloat(sumOfSelectedPrograms);
                // } else {
                    coreDepositPrice = parseFloat(sumOfSelectedPrograms) + coreDepositPrice;
                //}
                
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
                  
              
              var sumOfSelectedPrograms = (
              $this.$selectedProgram.reduce((total, program) => total + program.amount, 0)
        ).toFixed(2);
              var finalPrice = $this.numberWithCommas(parseFloat(sumOfSelectedPrograms)+ parseFloat(amount))      
              // if($this.$selectedProgram.length > 0){
              //     finalPrice = $this.numberWithCommas(parseFloat(sumOfSelectedPrograms))
              // }      
              deposit_price.innerHTML =
                "$" + finalPrice;
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
}
