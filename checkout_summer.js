/**
 * 	
 * @param name - HTML element name
 * @param className - HTML element class attribute
 * @param idName - HTML element id attribute
 */
function creEl(name,className,idName){
  var el = document.createElement(name);
	if(className){
	  el.className = className;
	}
	if(idName){
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
	$suppPro = [];
	$checkoutData = "";
	constructor(apiBaseUrl, memberData) {
		this.baseUrl = apiBaseUrl;
		this.memberData = memberData;
		this.renderPortalData();
	}
	
	
	
	// formating price in comma based value
	numberWithCommas(x) {
		return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}
	
	// API call for checkout URL 
	initializeStripePayment(){
		var studentFirstName = document.getElementById('Student-First-Name');
		var studentLastName = document.getElementById('Student-Last-Name');
		var studentEmail = document.getElementById('Student-Email');
		var studentGrade = document.getElementById('Student-Grade');
		var studentSchool = document.getElementById('Student-School');
		var studentGender = document.getElementById('Student-Gender');
		var prevStudent = document.getElementById('prevStudent-2');
		var suppProIdE = document.getElementById('suppProIds');
		var core_product_price = document.getElementById('core_product_price');
		var fort_lee_location = document.getElementById('fort_lee_location');
		var glen_rock_location = document.getElementById('glen_rock_location');

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
		//var cancelUrl = new URL("https://www.nsdebatecamp.com"+window.location.pathname);
		var cancelUrl = new URL(window.location.href);
		console.log(window.location.href)
		cancelUrl.searchParams.append('returnType', 'back')
		//console.log(cancelUrl)
		var data = {
			"email": this.memberData.email,
			"studentEmail" : studentEmail.value,
			"firstName" : studentFirstName.value,
			"lastName" : studentLastName.value,
			"grade" : studentGrade.value,
			"label": this.memberData.programName,
			"school": studentSchool.value,
			"gender": studentGender.value,
			"prevStudent": prevStudent.value,
			"locationId": (fort_lee_location.checked) ? 1 : 2,
			"programId" : this.memberData.programId,
			//"successUrl" : "https://www.nsdebatecamp.com/payment-confirmation?programName="+this.memberData.programName,
			"successUrl":"https://www.bergendebate.com/members/"+this.webflowMemberId,
			"cancelUrl" : cancelUrl.href,
			"memberId" : this.memberData.memberId,
			"achAmount": parseFloat(this.memberData.achAmount.replace(/,/g, '')),
			"cardAmount": parseFloat(this.memberData.cardAmount.replace(/,/g, ''))
		}
		
		
		var xhr = new XMLHttpRequest()
		var $this = this;
		xhr.open("POST", "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/createNewProgramCheckoutUrls", true)
		xhr.withCredentials = false
		xhr.send(JSON.stringify(data))
		xhr.onload = function() {
			let responseText = JSON.parse(xhr.responseText);
			console.log('responseText', responseText)
			if(responseText.success){
				// btn.innerHTML = 'Checkout';
				// window.location.href = responseText.stripe_url;

				$this.$checkoutData = responseText;

				//Storing data in local storage
				data.checkoutData = responseText
				localStorage.setItem("checkOutData", JSON.stringify(data));
				
				ach_payment.innerHTML = "Checkout"
				ach_payment.disabled = false;
				card_payment.innerHTML = "Checkout"
				card_payment.disabled = false;
				paylater_payment.innerHTML = "Checkout"
				paylater_payment.disabled = false;
			}

		}
	}
	// Hide and show tab for program selection, student infor and checkout payment
	activateDiv(divId){
		var divIds = ['checkout_program', 'checkout_student_details', 'checkout_payment'];
		 // Remove the active class from all div elements
		divIds.forEach(id => document.getElementById(id).classList.remove('active_checkout_tab'));
		// Add the active class to the div with the specified id
		document.getElementById(divId).classList.add('active_checkout_tab');
	}
	// Managing next and previous button 
	addEventForPrevNaxt(){
		var next_page_1 = document.getElementById('next_page_1');
		var next_page_2 = document.getElementById('next_page_2');
		var prev_page_1 = document.getElementById('prev_page_1');
		var prev_page_2 = document.getElementById('prev_page_2');
		var $this = this;
		var form = $( "#checkout-form" );
		next_page_1.addEventListener('click', function(){
			if(form.valid()){
			$this.activateDiv('checkout_student_details');
			}
		})
		next_page_2.addEventListener('click', function(){
			$this.activateDiv('checkout_payment');
			$this.initializeStripePayment();
				
			
		})
		prev_page_1.addEventListener('click', function(){
			$this.activateDiv('checkout_program');
		})
		prev_page_2.addEventListener('click', function(){
			// click on back button reinitialze payment tab
			document.getElementsByClassName("bank-transfer-tab")[0].click();
			//document.getElementById('w-tabs-1-data-w-tab-0').click()
			setTimeout(function(){ 
				$(".w-tab-link").removeClass("w--current");
				$(".w-tab-pane").removeClass("w--tab-active");
				Webflow.require('tabs').redraw();
			}, 2000);
			
			$this.activateDiv('checkout_student_details');
		})
	}
	
	// handle payment button click
	handlePaymentEvent(){
		var ach_payment = document.getElementById('ach_payment');
		var card_payment = document.getElementById('card_payment');
		var paylater_payment = document.getElementById('paylater_payment');
		// Browser back button event hidden fields
		var ibackbutton = document.getElementById("backbuttonstate");
		var $this = this;
		ach_payment.addEventListener('click', function(){
			// ach_payment.innerHTML = "Processing..."
			// $this.initializeStripePayment('us_bank_account', ach_payment);
			ibackbutton.value = "1";
			window.location.href = $this.$checkoutData.achUrl;
		})
		card_payment.addEventListener('click', function(){
			// card_payment.innerHTML = "Processing..."
			// $this.initializeStripePayment('card', card_payment);
			ibackbutton.value = "1";
			window.location.href = $this.$checkoutData.cardUrl;
		})
		paylater_payment.addEventListener('click', function(){
			// paylater_payment.innerHTML = "Processing..."
			// $this.initializeStripePayment('paylater', paylater_payment);
			ibackbutton.value = "1";
			window.location.href = $this.$checkoutData.payLaterUrl;
		})
	}

	// Setup back stripe button and browser back button
	setUpBackButtonTab(){
		var query = window.location.search;
        var urlPar = new URLSearchParams(query);
        var returnType = urlPar.get('returnType');
		// Get local storage data for back button
		var checkoutJson= localStorage.getItem("checkOutData");
		// Browser back button event hidden fields
		var ibackbutton = document.getElementById("backbuttonstate");
		if((returnType == 'back' || ibackbutton.value == 1) && checkoutJson != undefined){
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
			
			if(paymentData.grade){
				studentGrade.value = paymentData.grade;
			}
			
			if(paymentData.school){
				studentSchool.value = paymentData.school;
			}
			
			if(paymentData.gender){
				studentGender.value = paymentData.gender;
			}
			if(paymentData.prevStudent){
				studentGender.value = paymentData.prevStudent;
			}
			if(paymentData.location == 1){
				fort_lee_location.checked = true;
			}else{
				glen_rock_location.checked = true;
			}
			
			if(paymentData.checkoutData){
				this.$checkoutData = paymentData.checkoutData;
				this.activateDiv('checkout_payment');
			}
		}else{
			// removed local storage when checkout page rendar direct without back button
			localStorage.removeItem("checkOutData");
		}
	}
	// After API response we call the createMakeUpSession method to manipulate student data 
	async renderPortalData(memberId) {
		try {
			// Handle checkout button
			this.handlePaymentEvent();
			// Handle previous and next button
			this.addEventForPrevNaxt();
			// activate program tab
			this.activateDiv('checkout_program')
			
			this.setUpBackButtonTab();
		} catch (error) {
			console.error('Error rendering random number:', error);
		}
	}
}


