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
	constructor(apiBaseUrl, memberData) {
		this.baseUrl = apiBaseUrl;
		this.memberData = memberData;
		this.renderPortalData();
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
		
		//var cancelUrl = new URL("https://www.nsdebatecamp.com"+window.location.pathname);
		var cancelUrl = new URL(window.location.href);
		console.log(window.location.href)
		cancelUrl.searchParams.append('returnType', 'back')
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

	updateClickEventInDB(checkOutUrl){
		let checkOutData = localStorage.getItem('checkOutData')
		if(checkOutData == undefined){
			return true
		}
		checkOutData = JSON.parse(checkOutData)
		var data = {
			"checkoutId": checkOutData.checkoutData.checkoutId,
			"isSummerData": true,
		}

		var xhr = new XMLHttpRequest()
		var $this = this;
		xhr.open("POST", "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/updateDataToCheckoutUrl", true)
		xhr.withCredentials = false
		xhr.send(JSON.stringify(data))
		xhr.onload = function () {
			let responseText = JSON.parse(xhr.responseText);
			console.log('responseText', responseText)
			window.location = checkOutUrl;
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
			$this.updateClickEventInDB($this.$checkoutData.achUrl)
			//window.location.href = $this.$checkoutData.achUrl;
		})
		card_payment.addEventListener('click', function () {
			// card_payment.innerHTML = "Processing..."
			// $this.initializeStripePayment('card', card_payment);
			ibackbutton.value = "1";
			$this.updateClickEventInDB($this.$checkoutData.cardUrl)
			//window.location.href = $this.$checkoutData.cardUrl;
		})
		paylater_payment.addEventListener('click', function () {
			// paylater_payment.innerHTML = "Processing..."
			// $this.initializeStripePayment('paylater', paylater_payment);
			ibackbutton.value = "1";
			$this.updateClickEventInDB($this.$checkoutData.payLaterUrl)
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
}
