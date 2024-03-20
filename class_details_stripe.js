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

class classLocationStripe {
	constructor(webflowMemberId, responseText, currentIndex, accountEmail, levelId, levelName, parentName) {
		this.webflowMemberId = webflowMemberId;
		this.currentIndex = currentIndex;
		this.accountEmail = accountEmail;
		this.responseText = responseText;
		this.levelId = levelId;
		this.levelName = levelName;
		this.parentName = parentName;
		this.renderClassLocations() // gets mongoDB data from responseText object for specific registrations

	}
	// renderClassLocations method used to display location name, select time dropdown and button(payment and waitlist link)
	renderClassLocations() {
		var $this = this;
		var cartLocationDiv = document.getElementById('stripe-cart-location-div-' + this.currentIndex);
		cartLocationDiv.innerHTML = "";
		var heading = creEl('h2', 'sub-heading center');
		heading.innerHTML = (this.responseText.locationName) ? this.responseText.locationName : '';

		// get time and button html
		var innerContainer = this.getInnerContainer();




		cartLocationDiv.prepend(heading, innerContainer.timingContainer, innerContainer.buttonDiv);
		this.initiateLightbox();
		var spinner = document.getElementById('half-circle-spinner');
		spinner.style.display = 'none';
	}
	//Creating button and time dom element
	getInnerContainer() {
		var $this = this;
		var registerBtn;
		var timingContainer = creEl('div', 'main-text center cart-break-spaces timing-data');
		var buttonDiv = creEl('div', 'button-div margin-top-auto');
		var timingText = "";
		// conditionaly we are showing time select box or text
		if (this.responseText.timing.length == 1) {
			this.responseText.timing.forEach((timeData, index) => {


				var time = creEl('div', 'time-text')
				timingText = timeData.day + " " + timeData.startTime + "-" + timeData.endTime + " ";
				time.innerHTML = timingText;

				registerBtn = this.getRegisterBtn(timeData, index, this.responseText, timingText, selectBox='');
				buttonDiv.appendChild(registerBtn);

				timingContainer.appendChild(time);
			})
		} else {
			var label = creEl('label', 'form-field-label');
			label.innerHTML = "Select Class Time";
			var selectBox = creEl("select", "w-select")
			this.responseText.timing.forEach((timeData, index) => {
				var option = creEl('option')
				option.value = timeData.oid;
				option.setAttribute('classId', timeData.classUniqueId);
				option.innerHTML = timeData.day + " " + timeData.startTime + "-" + timeData.endTime;
				selectBox.appendChild(option)
				registerBtn = this.getRegisterBtn(timeData, index, this.responseText, timingText, selectBox);
				buttonDiv.appendChild(registerBtn);
			});
			timingContainer.appendChild(label)

			timingContainer.appendChild(selectBox)
			selectBox.addEventListener('change', function () {
				for (let i = 0; i < selectBox.options.length; i++) {
					document.getElementsByClassName(selectBox.options[i].value)[0].style.display = 'none';
				}
				document.getElementsByClassName(this.value)[0].style.display = 'block'
			})

		}
		//timingContainer.appendChild(buttonDiv)
		return {
			'timingContainer': timingContainer,
			'buttonDiv': buttonDiv
		};

	}
	// get Register or waitlist button
	getRegisterBtn(timeData, index, responseText, timingText, selectBox) {
		var locationActionDiv = creEl('div', 'location_action_div ' + timeData.oid + ' ' + (index ? 'hide' : ''));
		var $this = this;
		var alertMessage = this.getAlertMessage(timeData);
		var alertclass = (alertMessage) ? alertMessage.type : '';
		var alertMsg = creEl("div", 'alert_msg')
		if (alertMessage) {
			var aMessageIcon = creEl('div', 'alert-message ' + alertclass)
			var aMessage = creEl('span', 'alert-message');
			aMessage.innerHTML = alertMessage.message;
			aMessageIcon.appendChild(aMessage)
			alertMsg.appendChild(aMessageIcon);
		}
		locationActionDiv.prepend(alertMsg)

		var locationActionLink = document.createElement("a");
		locationActionLink.className = "main-button red w-button";
		
		var btnlbl = 'Register';
		var btnlink = 'https://form.jotform.com/231868905552162?classlevel=' + this.levelName + '&classlocation=' + this.responseText.locationName + '&classday=' + timeData.day + '&classtime=' + timeData.startTime + '&classspots=' + timeData.leftSpots + '&memberId=' + this.webflowMemberId + '&classUniqueId=' + timeData.classUniqueId + '&parentEmail=' + this.accountEmail;
		if (alertMessage && alertMessage.type == 'waitlist') {
			if (window.innerWidth > 1200) {
				locationActionLink.classList.add("iframe-lightbox-link");
				locationActionLink.setAttribute("data-scrolling", true);
			}	
			btnlbl = 'Join Waitlist';
			btnlink = 'https://form.jotform.com/231870526936160?classlevel=' + this.levelName + '&classlocation=' + this.responseText.locationName + '&classday=' + timeData.day + '&classtime=' + timeData.startTime + '&classspots=' + timeData.leftSpots + '&memberId=' + this.webflowMemberId + '&classUniqueId=' + timeData.classUniqueId + '&parentEmail=' + this.accountEmail;
			locationActionLink.href = btnlink;
		}else{
			locationActionLink.addEventListener('click', function(event){
				event.preventDefault();
				$this.initializeStripePayment(locationActionLink, responseText, timingText, selectBox);
			})
		}
		

		locationActionLink.innerHTML = btnlbl;
		locationActionDiv.appendChild(locationActionLink);


		return locationActionDiv;
	}
	// Get waitlist alert message
	getAlertMessage(timeData) {
		var numberOfSpots = timeData.numberOfSpots;
		var leftSpots = timeData.leftSpots;
		var message = ""
		var leftSpotsPercentage = (100 * leftSpots) / numberOfSpots;
		if (leftSpotsPercentage <= 0) {
			message = {};
			message.type = "waitlist";
			message.message = "Seats are full you can fill the wait list forms below";
		} else if (leftSpotsPercentage <= 25) {
			message = {};
			message.type = "filling_fast";
			message.message = "Hurry! Register now. Seats filling up fast! only <b>" + leftSpots + " spot left</b>";
		}
		return message;
	}
	/**
	 * initialize Lightbox and rerender accordion after close the lightbox
	 */
	initiateLightbox() {
		var $this = this;
		[].forEach.call(document.getElementsByClassName("iframe-lightbox-link"), function (el) {
			el.lightbox = new IframeLightbox(el, {
				onClosed: function () {
					var spinner = document.getElementById('half-circle-spinner');
					spinner.style.display = 'block';
					setTimeout(function () {
						new classDetails(api, $this.webflowMemberId, $this.accountEmail, $this.levelId)
					}, 500);
				},
				scrolling: true,
			});
		});
	}

	// ------------Start new code for stripe payment integration----------
	// API call for stripe checkout URL 
	initializeStripePayment(locationActionLink, responseText, timingText, selectBox) {
		
		console.log('responseText', responseText)
		console.log('timingText', timingText)
		let classId = responseText.timing[0].classUniqueId
		if(selectBox){
			timingText = selectBox.options[selectBox.selectedIndex].text
			classId = selectBox.options[selectBox.selectedIndex].getAttribute('classId')
		}
		console.log('timingText', timingText)
		console.log('classId', classId)
		var label = responseText.locationName +' | '+this.levelName+' | '+timingText;
		//return;
		var studentFirstName = document.getElementById('Student-First-Name');
		var studentLastName = document.getElementById('Student-Last-Name');
		var studentEmail = document.getElementById('Student-Email');
		var studentGrade = document.getElementById('Student-Grade');
		var studentSchool = document.getElementById('Student-School');
		var studentGender = document.getElementById('Student-Gender');
		var prevStudent = document.getElementById('prevStudent');

		var iBackButton = document.getElementById("backbuttonstate");
		
		//Payment button
		console.log('event',locationActionLink)
		locationActionLink.innerHTML = "Processing..."
		locationActionLink.disabled = true;
		
		
		//var cancelUrl = new URL("https://www.nsdebatecamp.com"+window.location.pathname);
		var cancelUrl = new URL(window.location.href);
		console.log(window.location.href)
		cancelUrl.searchParams.append('returnType', 'back')
		//console.log(cancelUrl)
		var data = {
			"email": this.accountEmail,
			"studentEmail": studentEmail.value,
			"firstName": studentFirstName.value,
			"lastName": studentLastName.value,
			"grade": studentGrade.value,
			"label": label,
			"school": studentSchool.value,
			"gender": studentGender.value,
			"prevStudent": prevStudent.value,
			"levelId": this.levelId,
			"classUniqueId":classId,
			"device": (/Mobi|Android/i.test(navigator.userAgent))? 'Mobile': 'Desktop',
			"deviceUserAgent": navigator.userAgent,
			"name":this.parentName,
			"successUrl": "https://www.bergendebate.com/payment-confirmation?programName="+label,
			"cancelUrl": cancelUrl.href,
			//"cancelUrl": "https://www.bergendebate.com/payment-confirmation?programName=",
			"memberId": this.webflowMemberId,
			"amount":30000
		}

		console.log('Data !!!!!', data)
		
		var xhr = new XMLHttpRequest()
		var $this = this;
		xhr.open("POST", "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/checkoutUrlForClasses", true)
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

				iBackButton.value = "1";
				window.location.href = responseText.stripe_url;
			}

		}
	}
	// ------------Start new code for stripe payment integration----------
}
/*
 * This Class used to get class details based on location and pass the data to classLocation class
 */
class classDetailsStripe {
	constructor(baseUrl, webflowMemberId, accountEmail, levelId, parentName) {
		this.baseUrl = baseUrl;
		this.webflowMemberId = webflowMemberId;
		this.accountEmail = accountEmail;
		this.levelId = levelId;
		this.parentName = parentName;
		this.renderPortalData();
	}
	// Creating main dom for location
	viewClassLocations(locationData) {
		var classLocationContainer = document.getElementById('classLocationStripe');
		Object.values(locationData).forEach((formData, index) => {
			var locationContainer = creEl('div', 'cart-location-div', 'stripe-cart-location-div-' + (index + 1))
			classLocationContainer.appendChild(locationContainer);
		})
	}
	//-------------Start new code for stripe payment integration----------------

	
	// Call API url with this method and response as a json
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

			var studentFirstName = document.getElementById('Student-First-Name');
			var studentLastName = document.getElementById('Student-Last-Name');
			var studentEmail = document.getElementById('Student-Email');
			var studentGrade = document.getElementById('Student-Grade');
			var studentSchool = document.getElementById('Student-School');
			var studentGender = document.getElementById('Student-Gender');
			var prevStudent = document.getElementById('prevStudent');
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
			

			if (paymentData.checkoutData) {
				//this.$checkoutData = paymentData.checkoutData;
				this.activateDiv('checkout_payment');
			}
		} else {
			// removed local storage when checkout page rendar direct without back button
			localStorage.removeItem("checkOutData");
		}
	}
	// store basic student form data in local storage
	storeBasicData() {
		var studentFirstName = document.getElementById('Student-First-Name');
		var studentLastName = document.getElementById('Student-Last-Name');
		var studentEmail = document.getElementById('Student-Email');
		var studentGrade = document.getElementById('Student-Grade');
		var studentSchool = document.getElementById('Student-School');
		var studentGender = document.getElementById('Student-Gender');
		var prevStudent = document.getElementById('prevStudent');
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
			var prevStudent = document.getElementById('prevStudent');

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
	// Managing next and previous button 
	addEventForPrevNaxt() {
		var next_page_1 = document.getElementById('next_page_1');
		var prev_page_1 = document.getElementById('prev_page_1');

		var $this = this;
		var form = $("#checkout-form");
		next_page_1.addEventListener('click', async function () {
			if (form.valid()) {
				$this.storeBasicData();
				$this.activateDiv('checkout_payment');
			}
		})

		prev_page_1.addEventListener('click', function () {
			$this.activateDiv('checkout_student_details');
		})
	}
	// Hide and show tab for program selection, student info and checkout payment
	activateDiv(divId) {
		var divIds = ['checkout_student_details', 'checkout_payment'];
		// Remove the active class from all div elements
		divIds.forEach(id => document.getElementById(id).classList.remove('active_checkout_tab'));
		// Add the active class to the div with the specified id
		document.getElementById(divId).classList.add('active_checkout_tab');
	}
	//----------------End new code for stripe payment integration---------------
	// get data from api and pass the data to classLocation class
	async renderPortalData(memberId) {
		try {
			// -------------Start new code for stripe payment integration--------------
			// Handle previous and next button
			this.addEventForPrevNaxt();
			// New Code Added
			this.activateDiv('checkout_student_details');
			// Update basic data
			this.updateBasicData();
			// Setup back button for browser and stripe checkout page
			this.setUpBackButtonTab();
			// -------------End new code for stripe payment integration---------------
			const data = await this.fetchData('getClassDetailByMemberIdAndLevelId?levelId=' + this.levelId + '&memberId=' + this.webflowMemberId);
			var $this = this;
			var locationData = data[0][0].location;
			var levelId = data[0][0].levelId;
			var levelName = data[0][0].levelName;
			this.viewClassLocations(locationData);
			Object.values(locationData).forEach((formData, index) => {
				setTimeout(function () {
					let currentIndex = index + 1;
					new classLocationStripe($this.webflowMemberId, formData, currentIndex, $this.accountEmail, levelId, levelName, $this.parentName);
				}, 30)
			})
		} catch (error) {
			console.error('Error rendering random number:', error);
		}
	}
}
