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
	
	// Passing all supplementary program data and creating a cart list
	displaySessionsData(data){
		this.$suppPro = data.summerSessionData;
		// Getting main dom elment object to add supplementary program list with checkbox
		var sessionList = document.getElementById('checkout_session_data');
		// Supplementary program heading
		// var supplementaryProgramHead = document.getElementById('supplementary-program-head');
		var $this = this
		sessionList.innerHTML = "";
		// Remove duplicate data like Supplementary program
		//data = data.filter(item=>item.programDetailId !=this.memberData.programId);
		console.log('data', data)
		if(data.summerSessionData.length > 0){
			// filter summer inventory empty left spots
			var summerSessionData = data.summerSessionData.filter((item)=>{
				var findFortLee = item.location.find((i)=>i.locationId == 2 && i.leftSpot == 0)
				var findGlenRock = item.location.find((i)=>i.locationId == 1 && i.leftSpot == 0)
				
				if(findFortLee == undefined || findGlenRock == undefined){
					return true
				}else{
					return false
				}
			})
			// showing supplementary program heading when data in not empty
			//supplementaryProgramHead.style.display = "block"
			data.summerSessionData.forEach((sData, i)=>{
				// Getting single supplementary program cart list
				var sList = this.createSessionList(sData, i);
					sessionList.appendChild(sList);
			})
		}else{
			// hiding supplementary program heading when data is empty
			//supplementaryProgramHead.style.display = "none"
		}
	}
	// Manipulating a single supplementary program list
	createSessionList(suppData, i){
		var coreProductContainer = creEl('div', 'core-session-container core-product-container margin-top');
		var $this = this;
		
		// Creating checkbox for cart
		var coreCheckbox = creEl('div', 'core-checkbox');
		var wCheckbox = creEl('label', 'checkbox-field w-checkbox')
		var checkboxS = creEl('input', 'w-checkbox-input core-checkbox suppCheckbox');
		checkboxS.type ="radio";
		checkboxS.name ="checkbox";
		if(!i){
			this.updateLocation(suppData);
			checkboxS.checked = true
		}
		checkboxS.value =suppData.summerSessionId;
		//checkboxS.setAttribute('programDetailId', suppData.programDetailId)
		checkboxS.setAttribute('data-name', 'Checkbox')
		checkboxS.addEventListener('change', function() {
		  $this.updateLocation(suppData);
		});
		wCheckbox.appendChild(checkboxS)
		var spantext = creEl('span', 'core-checkbox-label w-form-label')
		wCheckbox.appendChild(spantext)
		coreCheckbox.appendChild(wCheckbox)
		
		// Creating heading for supplementary program heading
		var coreProductTitle = creEl('div', 'core-product-title')
		var h1 = creEl('h1', 'core-product-title-text')
		h1.innerHTML = suppData.summerSessionName;
		var div = creEl('div','core-product-title-subtext')
		const startDate = new Date(suppData.startDate)
		const endDate = new Date(suppData.endDate)
		const month = ["January","February","March","April","May","June","July","August","September","October","November","December"];
		div.innerHTML = startDate.getDate()+' '+month[startDate.getMonth()]+' '+startDate.getFullYear()+' - '+endDate.getDate()+' '+month[endDate.getMonth()]+' '+startDate.getFullYear();
		
		//var mobileResponsiveHide = creEl('div', 'mobile-responsive-hide')
		// Mobile responsive price text. it will display on mobile
		//var productPriceText = creEl('div', 'product-price-text')
		//productPriceText.innerHTML = '$'+suppData.amount.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		//mobileResponsiveHide.appendChild(productPriceText)
		coreProductTitle.prepend(h1, div)
		// Desktop responsive price text. it will display on mobile
		//var productPriceText1 = creEl('div', 'product-price-text')
		//productPriceText1.innerHTML = '$'+suppData.amount.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		//var productPriceContainer = creEl('div', 'product-price-container hide-mobile')
		//productPriceContainer.appendChild(productPriceText1)
		// append title , price and checkbox
		coreProductContainer.prepend(coreProductTitle, coreCheckbox)

		return coreProductContainer;
	}
	// Update Location based on session
	updateLocation(sessionData){
		
		var location = sessionData.location;
		var fortLeeContainer = document.getElementById('fortLeeContainer');
		var GlenRockContainer = document.getElementById('GlenRockContainer');
		var fort_lee_location = document.getElementById('fort_lee_location');
		var glen_rock_location = document.getElementById('glen_rock_location');
		var next_page_2 = document.getElementById('next_page_2');
		GlenRockContainer.style.display = "none"
		fortLeeContainer.style.display = "none"
		next_page_2.style.display = 'block';
		if(this.memberData.programId == '102'){
			var findFortLee = location.find((i)=>i.locationId == 2 && i.leftSpot == 0)
			var findGlenRock = location.find((i)=>i.locationId == 1 && i.leftSpot == 0)
			if(findFortLee == undefined){
				fortLeeContainer.style.display = "flex"
			}
			if(findGlenRock == undefined){
				GlenRockContainer.style.display = "flex"
			}
			
			if(findFortLee== undefined && findGlenRock != undefined){
				fort_lee_location.click()
			}else if(findFortLee != undefined && findGlenRock == undefined){
				glen_rock_location.click()
			}else if(findFortLee != undefined && findGlenRock != undefined){
				next_page_2.style.display = 'none';
			}else{
				fort_lee_location.click()
			}
			
		}else{
			var findFortLee = location.find((i)=>i.locationId == 2 && i.programId == this.memberData.programId && i.leftSpot > 0)
			if(findFortLee != undefined){
				fortLeeContainer.style.display = "flex"
			}
			var findGlenRock = location.find((i)=>i.locationId == 1 && i.programId == this.memberData.programId && i.leftSpot > 0)
			
			if(findGlenRock != undefined){
				GlenRockContainer.style.display = "flex"
			}
			if(findFortLee!= undefined && findGlenRock == undefined){
				fort_lee_location.click()
			}else if(findFortLee== undefined && findGlenRock != undefined){
				glen_rock_location.click()
			}else if(findFortLee== undefined && findGlenRock == undefined){
				next_page_2.style.display = 'none';
			}else{
				fort_lee_location.click()
			}
		}
		
        
		
	}
	// formating price in comma based value
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
			"summerSessionId": parseInt(summerSessionId),
			"programId" : this.memberData.programId,
			"successUrl" : "https://www.bergendebate.com/payment-confirmation?programName="+this.memberData.programName,
			//"successUrl":"https://www.bergendebate.com/members/"+this.webflowMemberId,
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
			
			// loader icon code
			var spinner = document.getElementById('half-circle-spinner');
			spinner.style.display = 'block';
			// API call
			const data = await this.fetchData('getSummerSessionDetails/'+this.memberData.memberId+'/'+this.memberData.programId);
			// Display supplementary program
			this.displaySessionsData(data)
			// Setup back button for browser and stripe checkout page
			this.setUpBackButtonTab();
			
			// Hide spinner 
			spinner.style.display = 'none';
		} catch (error) {
			console.error('Error rendering random number:', error);
		}
	}
}


