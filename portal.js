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
/*
* Created a new class to call API
*/
class ApiClient {
	constructor(baseUrl) {
		this.baseUrl = baseUrl;
	}
	// Calling API with the help of base URL and end URL
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
}
/*
* With the help of this class we are managing student's forms and invoice
*/

class portalForm {
	$completedForm = [];
	$formslist = [];
	$invoiceList = [];
	$classDeatils = {};
	$classLoactionDeatils = {};
	$studentDetail = {};
	$formCompletedList = [];
	$totalForm = 0;
	$totalInvoice = 0;
	$isLiveProgram = true;
	$completetdInvoice = 0;
	constructor(webflowMemberId,responseText,currentIndex, accountEmail){
		this.webflowMemberId = webflowMemberId;
		this.currentIndex = currentIndex;
		this.accountEmail = accountEmail;
		this.$completedForm = [];
		this.renderFormData(responseText) // gets mongoDB data from responseText object for specific registrations
		
	}
	/**
	 * Render single json form data
	 * @param responseText - single form object provided by API
	 */
	// responseText is an object corresponding to MongoDB collection
	renderFormData(responseText){
		var $this = this;
		  $this.$completedForm = (responseText.formCompletedList) ? responseText.formCompletedList : [];
		  $this.$invoiceList = responseText.invoiceList;
		  $this.$formList = responseText.formList;
		  $this.$classDeatils = responseText.classDetail;
		  $this.$studentDetail = responseText.studentDetail;
		  $this.$summerProgramDetail = responseText.summerProgramDetail;
		  $this.$classLoactionDeatils = responseText.classLoactionDeatils;
		  //$this.$formCompletedList = [];
		  //$this.checkProgramDeadline();
		  // unhide when form is live
		  $this.viewForms();
		  $this.viewService();
		  $this.viewInvoice();
		  if(responseText.formList.length > 0){
		  // unhide when form is live
		  $this.renderAccordionFormsHeader();
		  
		  ;
		  // unhide when form is live
		  $this.setPercentage();
		 }
		  if(responseText.invoiceList){
				$this.renderAccordionInvoiceHeader()
				$this.setInvoicePercentage();
		  }
		  
		  $this.initiateAccordion();
		  $this.initiateLightbox();
		  //$this.initializeToolTips();
		  var spinner = document.getElementById('half-circle-spinner');
		  spinner.style.display = 'none';
	}
	/**
	 * Display class name for single students
	 */
	viewService(){
		var service = document.getElementById('service');
		var serviceTitle = document.getElementById('singlePurchaseTitle');
		console.log('this.$classDeatils.classLevel', this.$classDeatils)
		var classLevel = (this.$classDeatils != null) ? this.$classDeatils.classLevel : '';
		//service.innerHTML = this.$studentDetail.studentName+" - "+classLevel+" - "+this.$classDeatils.day+" "+this.$classDeatils.startTime+"("+this.$classLoactionDeatils.locationName+")";
		if(Object.keys(this.$classDeatils).length > 0){
			service.innerHTML = this.$studentDetail.studentName+" - "+classLevel+" - "+this.$classDeatils.day+" "+this.$classDeatils.startTime+"("+this.$classLoactionDeatils.locationName+", "+this.$classDeatils.sessionName+" "+this.$classDeatils.currentYear +")";
			serviceTitle.innerHTML = 'Class';
		}else{
			service.innerHTML = this.$studentDetail.studentName+" - "+this.$summerProgramDetail.programName+" ("+this.$summerProgramDetail.location+", "+this.$summerProgramDetail.currentYear+" Summer) ";
			serviceTitle.innerHTML = 'Program';
		}
	}
	
	/**
	 * Display accordion and forms data
	 */
	viewForms(){
		var $this = this;
		if($this.$formList){
			let parentFormList = this.$formList;
			var accordionDiv = document.getElementById("accordionforms-"+$this.currentIndex);
			if($this.$formList.length <= 0){
				accordionDiv.innerHTML = "No forms required. Registration complete from previous enrollment";
			}else{
				accordionDiv.innerHTML = "";
			}
			var $tabNo = 1;
			$this.$totalForm = 0;
			parentFormList.sort(function(r,a){return r.sequence-a.sequence}); // order invoice categories via order specified in MongoDB
			parentFormList.forEach((form) => {
				console.log('forms', form)
				var accordionContainerDiv = creEl("div", "accordion-container", "accordion-container-"+$tabNo+$this.currentIndex)
				var labelDiv = creEl("div", "label label-"+$this.currentIndex);
				// check forms for completion and put corresponding icon & text
				var checkAllForms = $this.checkAllForms(form.forms);
				var imgUncheck = creEl("img",'all-img-status');
				imgUncheck.src = $this.getCheckedIcon(checkAllForms);
				var textUncheck = $this.getCheckedText(checkAllForms);
				labelDiv.innerHTML = form.name;
				labelDiv.prepend(imgUncheck, textUncheck)
				var accordionContentDiv = document.createElement("div");
				accordionContentDiv.className="accordion-content";
				var ul= creEl('ul');
				
				// for every form category in parentInvoiceForm, start building accordion
				form.forms.forEach((cForm, i) => {
					//check it's editable
					let editable = $this.checkform(cForm.formId);
					let is_live = cForm.is_live;
					var li=creEl('li');;
					// Added cross line for completed forms
					var li_text=creEl('span', 'invoice_name'+((editable)? ' completed_form': ''));
					var imgCheck = creEl("img");
					imgCheck.src = $this.getCheckedIcon(editable);
					li_text.innerHTML = cForm.name;
					li.prepend(imgCheck, li_text);

				   
					var linkContainer = creEl('div', 'link-container');   
					var formLink=creEl('a');
					
					// display link/text depending on if form is live/editable
					if(is_live){
					if(editable){
					   let dbData = $this.getformData(cForm.formId)
						if(this.$isLiveProgram  && cForm.is_editable){
							formLink.href = (cForm.formId) ? "https://www.jotform.com/edit/"+dbData.submissionId+"?memberId="+$this.webflowMemberId+"&classId="+$this.$classDeatils.classId+"&studentName="+$this.$studentDetail.studentName+"&accountEmail="+$this.accountEmail+"&paymentId="+$this.$studentDetail.uniqueIdentification+"&locationId="+$this.$classLoactionDeatils.locationId : "";
						}else{
						   formLink.href = "https://www.jotform.com/submission/"+dbData.submissionId;
					   }
					}else{
						formLink.href = (cForm.formId) ? "https://form.jotform.com/"+cForm.formId+"?memberId="+$this.webflowMemberId+"&classId="+$this.$classDeatils.classId+"&studentName="+$this.$studentDetail.studentName+"&accountEmail="+$this.accountEmail+"&paymentId="+$this.$studentDetail.uniqueIdentification+"&locationId="+$this.$classLoactionDeatils.locationId: "";
				    }
					}
					//Add iframe when it's live and above certain screenwidth
					formLink.className = (is_live && window.innerWidth > 1200) ? "iframe-lightbox-link" : "";
					var span=creEl('span', 'action_text');
				    if(is_live){
						span.innerHTML = (editable) ? ((this.$isLiveProgram && cForm.is_editable) ? "Edit form" : "View Form" ): "Go to form";
					}else{
						span.innerHTML = "Coming Soon";
					}	
						
						
						
					formLink.append(span)
					linkContainer.append(formLink);
					
					
					
					li.append(linkContainer);
					ul.appendChild(li);
					$this.$totalForm++;
				})
				accordionContentDiv.appendChild(ul)
				accordionContainerDiv.prepend(labelDiv, accordionContentDiv);
				accordionDiv.appendChild(accordionContainerDiv);
				$tabNo++;
			})
		}
       let percentageAmount = (this.$completedForm.length) ? (100 * this.$completedForm.length) / this.$totalForm : 0;
		if(percentageAmount == '100'){
			accordionDiv.classList.add("all_completed_form")
		}
	}
	
	/**
	 * Display single accordion and invoice data
	 */
	viewInvoice(){
		var $this = this;
       if(this.$invoiceList){
			
		   let parentInvoiceForm = this.$invoiceList;
		   var accordionDiv = document.getElementById("accordion-"+$this.currentIndex);
		   accordionDiv.innerHTML = "";
		   var $tabNo = 1;
		   $this.$totalInvoice = 0;
		   parentInvoiceForm.sort(function(r,a){return r.sequence-a.sequence}); // order invoice categories via order specified in MongoDB
		   var accordionContainerDiv = creEl("div", "accordion-container", "accordion-container-invoice-"+$tabNo+$this.currentIndex)
			var labelDiv = creEl("div", "label label-"+$this.currentIndex);
			// check forms for completion and put corresponding icon & text
			var checkAllInvoices = $this.checkAllInvoices(parentInvoiceForm);
			var imgUncheck = creEl("img",'all-img-status');
			imgUncheck.src = $this.getCheckedIcon(checkAllInvoices);
			var textUncheck = $this.getCheckedText(checkAllInvoices);
			labelDiv.innerHTML = 'Invoice';
			labelDiv.prepend(imgUncheck, textUncheck)
			var accordionContentDiv = document.createElement("div");
			accordionContentDiv.className="accordion-content";
			var ul= creEl('ul');
			// for every form category in parentInvoiceForm, start building accordion
		   parentInvoiceForm.forEach((invoice) => {
			   //check it's editable
			   let editable = (invoice.is_completed || invoice.status == 'Processing') ? true : false;
			   
			   let completed = (editable && (invoice.status =='Complete' || !invoice.status));
			   let failed = (invoice.status == 'Failed');
			   let processing = (invoice.status == 'Processing');
			   let paymentProcessMsg = (invoice.paymentProcessMsg != '');
			   let info_text = creEl('span', 'info_text')
			   info_text.innerHTML = 'i';
			   
			   var li=creEl('li');;
			   // Added cross line for completed forms
			   var li_text=creEl('span', 'invoice_name'+((completed)? ' completed_form': ((failed) ? ' failed_form' : '')));
			   var imgCheck = creEl("img");
			   
			   imgCheck.src = $this.getCheckedIcon(completed, failed, processing);
			   if(failed){
				   imgCheck.title = "Last transaction failed!";
				   
			   }
			   
			   li_text.innerHTML = invoice.invoiceName;

			   if(failed){
				li_text.append(info_text)
				info_text.setAttribute('tip', 'Last transaction failed, Pay again!')
				 
				info_text.setAttribute('tip-top','')
				info_text.setAttribute('tip-left','')
			   }
			   
			   li.prepend(imgCheck, li_text);

			   var jotFormUrlLink = invoice.jotFormUrlLink;	
			   jotFormUrlLink.sort((a,b) => (a.title > b.title) ? 1 : ((b.title > a.title) ? -1 : 0));
			   var linkContainer = creEl('div', 'link-container'); 
			   if(!editable || failed){
				   if(jotFormUrlLink.length > 0){
					jotFormUrlLink.forEach(link => {
						var formLink=creEl('a');
						var span=creEl('span', 'invoice_text');
							span.innerHTML = link.title;
						if(link.paymentType == 'jotform'){
						formLink.href = (link.formid) ? "https://form.jotform.com/"+link.formid+"?memberId="+$this.webflowMemberId+"&invoiceId="+invoice.invoice_id+"&paymentLinkId="+link.paymentLinkId+"&paymentId="+$this.$studentDetail.uniqueIdentification : "";
						//Add iframe when it's live and above certain screenwidth
						formLink.className = (window.innerWidth > 1200) ? "iframe-lightbox-link" : "";
						}else{
							formLink.addEventListener('click', function () {
								span.innerHTML = "Processing..."
								$this.initializeStripePayment(invoice.invoice_id, invoice.invoiceName, link.amount, link.paymentLinkId, span, link.title, link.paymentType)
							})
						}
						
							
						formLink.append(span)
						linkContainer.append(formLink);
					})
					if(paymentProcessMsg){
						linkContainer.prepend(info_text)
						info_text.setAttribute('tip', invoice.paymentProcessMsg)
							
						info_text.setAttribute('tip-top','')
						info_text.setAttribute('tip-left','')
					}
					li.append(linkContainer);
				   }
				   
			   }else{
					var formLink=creEl('a', (completed)? 'completed_form_link': '');
					//formLink.href = "https://www.jotform.com/submission/"+invoice.submissionId;
					//Add iframe when it's live and above certain screenwidth
					//formLink.className = (window.innerWidth > 1200) ? "iframe-lightbox-link" : "";
					var span=creEl('span', 'invoice_text');
						if(processing){
							span.innerHTML = 'Processing...';
						}else{
							span.innerHTML = 'Completed';	
						}
					formLink.append(span)
					linkContainer.append(formLink);
					li.append(linkContainer);
					$this.$completetdInvoice++;
			   }
			   
			   
			   ul.appendChild(li);
			   $this.$totalInvoice++;
		   })
		   accordionContentDiv.appendChild(ul)
		   accordionContainerDiv.prepend(labelDiv, accordionContentDiv);
		   accordionDiv.appendChild(accordionContainerDiv);
		   $tabNo++;
	   }
	
		let percentageAmount = (this.$completedForm.length) ? (100 * this.$completedForm.length) / this.$totalInvoice : 0;
		if(percentageAmount == '100'){
			accordionDiv.classList.add("all_completed_form")
		}
	}
	/**
 	*
  	*Initilize stripe payment
   	*/
	initializeStripePayment(invoice_id, title, amount, paymentLinkId, span, link_title, paymentType){
		var centAmount = (amount*100).toFixed(2);
		var data = {
			"email":this.$studentDetail.parentEmail,
			"name":this.$studentDetail.studentName,
			"label": title,
			"paymentType": paymentType,
			"amount": parseFloat(centAmount),
			"invoiceId": invoice_id,
			"paymentId": this.$studentDetail.uniqueIdentification,
			"paymentLinkId": paymentLinkId,
			"memberId": this.webflowMemberId,
			"successUrl":encodeURI("https://www.bergendebate.com/members/"+this.webflowMemberId+"?programName="+title),
			"cancelUrl": "https://www.bergendebate.com/members/"+this.webflowMemberId,
		}
		var xhr = new XMLHttpRequest()
		var $this = this;
		xhr.open("POST", "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/createCheckoutUrl", true)
		xhr.withCredentials = false
		xhr.send(JSON.stringify(data))
		xhr.onload = function() {
			let responseText = JSON.parse(xhr.responseText);
			console.log('responseText', responseText)
			span.innerHTML = link_title;
			if(responseText.success){
				window.location.href = responseText.stripe_url;
			}

		}
	}
	/**
	 * Check form's id in completedForm list (from MongoDB) and use to determine if form is editable
	 * @param formId - Jotform Id
	 */
	checkform($formId){
		if($formId){
			const found = this.$completedForm.some(el => el.formId == $formId);
			return found;
		}
		return false;
	}
	/**
	 * Check Program Deadline
	 */
	checkProgramDeadline(){
		var deadlineDate = this.$programDetail.deadlineDate.replace(/\\/g, '');
		deadlineDate = deadlineDate.replace(/"/g, '')
		var formatedDeadlineDate = new Date(deadlineDate);
		var currentDate = new Date(); 
		this.$isLiveProgram = (currentDate < formatedDeadlineDate) ? true : false;
	}
	/**
	 * Check all form status
	 * @param forms - forms Array Object
	 */
	checkAllForms(forms){
		if(forms){
			// showing status only for live forms
			var form = forms.filter((item => item.is_live));
			var formsId = form.map((formItem) => formItem.formId.toString());
			//var formsId = forms.map((formItem) => formItem.formId.toString());
			var completedFormsId = this.$completedForm.map((formItem) => formItem.formId.toString());
			const compareForm = completedFormsId.filter((obj) => formsId.indexOf(obj) !== -1);
			console.log('compareForm', compareForm)
			const uniqueform = compareForm.filter((value, index, self) => self.indexOf(value) === index)
			return ((formsId.length === uniqueform.length) && (formsId.every(val => uniqueform.includes(val))));
		}
	}
	/**
	 * Check all invoice status
	 * @param invoices - invoices Array Object
	 */
	checkAllInvoices(invoices){
		if(invoices.length > 0){
		 var submittedInvoice =	invoices.filter(item => item.is_completed);
		  return (submittedInvoice.length == invoices.length)
		}else{
			return false;
		}
	}
	/**
	 * Get Completed Form data by form id
	 * @param formId - Jotform Id
	 */
	getformData($formId){
		let data = this.$completedForm.find(o => o.formId == $formId);
		return data;
	}
	/**
	 * Get Checkbox icon for form complete or complete
	 */
	getCheckedIcon(status, failed, processing){
		
		if(processing){
			return "https://uploads-ssl.webflow.com/64091ce7166e6d5fb836545e/653a046b720f1634ea7288cc_loading-circles.gif";
		}
		else if(failed){
			return "https://uploads-ssl.webflow.com/64091ce7166e6d5fb836545e/6539ec996a84c0196f6009bc_circle-xmark-regular.png";
		}
		else if(status){
			return "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/639c495f35742c15354b2e0d_circle-check-regular.png";
		}else{
			return "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/639c495fdc487955887ade5b_circle-regular.png";
		}
	}
	/**
	 * Get category all form status as a text like it's complete or not
	 */
	getCheckedText(status){
		var imgCheck = "";
		if(status){
			imgCheck = creEl("span", 'forms_complete_status');
			imgCheck.innerHTML = '&#10003;  Done';
		}else{
			imgCheck = creEl("span", 'forms_incomplete_status');
			imgCheck.innerHTML = 'Needs to be Completed';
		}
		return imgCheck;
	}
	/**
	 * Render Accordion Header like form completion and deadline
	 */
	renderAccordionFormsHeader(){
		// Define months
		const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
		
		
		// create and set progress bar & percentage
		let percentageAmount = (this.$completedForm.length) ? (100 * this.$completedForm.length) / this.$totalForm : 0;
		let accordionFormsHeader = document.getElementById("accordion-forms-header-"+this.currentIndex);
		if(percentageAmount == '100'){
			accordionFormsHeader.classList.add("all_completed_form")
		}
		accordionFormsHeader.innerHTML ="";
		let progressbar = document.createElement("div");
		progressbar.className = "form-progressbar";
		let protext = document.createElement("p");
		protext.innerHTML = "<span class='percentage-value-"+this.currentIndex+"'>0%</span> / "+this.$completedForm.length+" of "+this.$totalForm+" forms complete &nbsp;";
		let progressContainer = document.createElement("div");
		progressContainer.className = "progress-container progress-container-"+this.currentIndex;
		progressContainer.setAttribute("data-percentage", (Math.round(percentageAmount)) ? Math.round(percentageAmount) : 0);
		let progress = document.createElement("div");
		progress.className = "progress progress-"+this.currentIndex;
		let percentage = document.createElement("div");
		percentage.className = "percentage percentage-"+this.currentIndex;
		progressContainer.prepend(progress, percentage);
		progressbar.prepend(progressContainer, protext)
				
		
		accordionFormsHeader.prepend(progressbar)
	}
	/**
	 * Render Accordion Header like form completion and deadline
	 */
	renderAccordionInvoiceHeader(){
		
		// Define months
		const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
		
		
		// create and set progress bar & percentage
		let percentageAmount = (this.$completetdInvoice) ? (100 * this.$completetdInvoice) / this.$totalInvoice : 0;
		let accordionInvoiceHeader = document.getElementById("accordion-invoice-header-"+this.currentIndex);
		if(percentageAmount == '100'){
			accordionInvoiceHeader.classList.add("all_completed_form")
		}
		accordionInvoiceHeader.innerHTML ="";
		let progressbar = document.createElement("div");
		progressbar.className = "form-progressbar";
		let protext = document.createElement("p");
		protext.innerHTML = "<span class='percentage-value-invoice-"+this.currentIndex+"'>0%</span> / "+this.$completetdInvoice+" of "+this.$totalInvoice+" invoices complete &nbsp;";
		let progressContainer = document.createElement("div");
		progressContainer.className = "progress-container progress-container-invoice-"+this.currentIndex;
		progressContainer.setAttribute("data-percentage-invoice", (Math.round(percentageAmount)) ? Math.round(percentageAmount) : 0);
		let progress = document.createElement("div");
		progress.className = "progress progress-invoice-"+this.currentIndex;
		let percentage = document.createElement("div");
		percentage.className = "percentage percentage-invoice-"+this.currentIndex;
		progressContainer.prepend(progress, percentage);
		progressbar.prepend(progressContainer, protext)
				
		
		accordionInvoiceHeader.prepend(progressbar)
	}
	/**
	 * Set Percentage value on accordion header
	 */
	setPercentage() {
	  const progressContainer = document.querySelector('.progress-container-'+this.currentIndex);
	  const percentage = progressContainer.getAttribute('data-percentage') + '%';
	  const progressEl = progressContainer.querySelector('.progress-'+this.currentIndex);
	  progressEl.style.width = percentage;
	  const percentageValue = document.querySelector('.percentage-value-'+this.currentIndex);
	  percentageValue.innerText = percentage;
	}
	/**
	 * Set Percentage value on accordion header
	 */
	setInvoicePercentage() {
	  const progressContainer = document.querySelector('.progress-container-invoice-'+this.currentIndex);
	  const percentage = progressContainer.getAttribute('data-percentage-invoice') + '%';
	  const progressEl = progressContainer.querySelector('.progress-invoice-'+this.currentIndex);
	  progressEl.style.width = percentage;
	  const percentageValue = document.querySelector('.percentage-value-invoice-'+this.currentIndex);
	  percentageValue.innerText = percentage;
	}
	
	/**
	 * Script for accordion feature
	 */
	initiateAccordion(){
		const accordion = document.getElementsByClassName('label-'+this.currentIndex);

			function removeActiveItem(cEl){
				for (let x=0; x<accordion.length; x++) {
					if(cEl !==accordion[x]){
						accordion[x].parentNode.classList.remove('active')
					}
				}
			}
		for (let i=0; i<accordion.length; i++) {
			accordion[i].addEventListener('click', function () {
			  removeActiveItem(this)
			  this.parentNode.classList.toggle('active')
		  })
		}
	}
	/**
	 * initialize Lightbox and rerender accordion after close the lightbox
	 */
	initiateLightbox(){
		var $this = this;
		[].forEach.call(document.getElementsByClassName("iframe-lightbox-link"), function (el) {
		  el.lightbox = new IframeLightbox(el, {
			onClosed: function() {
				var spinner = document.getElementById('half-circle-spinner');
				spinner.style.display = 'block';				
				setTimeout(function() {
					new PortalTabs(api, $this.webflowMemberId, $this.accountEmail)
				}, 500);
			},
			scrolling: true,
		  });
		});
	}
	// initializeToolTips(){
	// 	const elements = [...document.querySelectorAll('[tip]')]
	// 	for (const el of elements) {
	// 	  const tip = document.createElement('div')
	// 	  tip.classList.add('tooltip')
	// 	  tip.textContent = el.getAttribute('tip')
	// 	  const x = el.hasAttribute('tip-left') ? 'calc(-100% - 5px)' : '16px'
	// 	  const y = el.hasAttribute('tip-top') ? '-100%' : '0'
	// 	  tip.style.transform = `translate(${x}, ${y})`
	// 	  el.appendChild(tip)
	// 	  el.onpointermove = e => {
	// 		if (e.target !== e.currentTarget) return

	// 		const rect = tip.getBoundingClientRect()
	// 		const rectWidth = rect.width + 16
	// 		const vWidth = window.innerWidth - rectWidth
	// 		const rectX = el.hasAttribute('tip-left') ? e.clientX - rectWidth : e.clientX + rectWidth
	// 		const minX = el.hasAttribute('tip-left') ? 0 : rectX
	// 		const maxX = el.hasAttribute('tip-left') ? vWidth : window.innerWidth
	// 		const x = rectX < minX ? rectWidth : rectX > maxX ? vWidth : e.clientX
	// 		tip.style.left = `${x}px`
	// 		tip.style.top = `${e.clientY}px`
	// 	  }
	// 	}
	// }
}
class PortalTabs {
	$activeTabID = "";
	$activeMainTabID = "";
	constructor(apiClient, webflowMemberId,accountEmail) {
		this.apiClient = apiClient;
		this.webflowMemberId = webflowMemberId;
		this.accountEmail = accountEmail;
		this.renderPortalData();
	}
	/**
	* Render tabs for multiple forms
	* @param responseText - forms object provided by API
	*/
	viewtabs(responseText){
		var tabsContainer = document.getElementById("tabs-container");
		tabsContainer.innerHTML = "";
		var tabs = creEl("ul", "tabs")
		var contentSection = creEl("div", "content-section");
		
		var is_single = (responseText.length > 1) ? false : true;
		responseText.forEach((formData, index) => {
			let currentIndex = index+1;
			var activeliClass = (currentIndex == 1 && is_single) ? "tab_li active_tab" : "tab_li";
			if(!is_single){
				document.getElementById("service-para").style.display = "none";
				var tabsE = creEl("li", activeliClass, 'li-tab'+currentIndex);
				var classLevel = (formData.classDetail != null)? formData.classDetail.classLevel : '';
				//tabsE.innerHTML = formData.studentDetail.studentName+" - "+classLevel+" - "+formData.classDetail.day+" "+formData.classDetail.startTime+"("+formData.classLoactionDeatils.locationName+")";
				if(Object.keys(formData.classDetail).length > 0){
					tabsE.innerHTML = formData.studentDetail.studentName+" - "+classLevel+" - "+formData.classDetail.day+" "+formData.classDetail.startTime+" ("+formData.classLoactionDeatils.locationName+", "+formData.classDetail.sessionName+" "+formData.classDetail.currentYear+")";
				}else{
					tabsE.innerHTML = formData.studentDetail.studentName+" - "+formData.summerProgramDetail.programName+" ("+formData.summerProgramDetail.location+", "+formData.summerProgramDetail.currentYear+" Summer) ";
				}
				tabsE.setAttribute("data-tab-id", 'tab'+currentIndex )
				tabs.appendChild(tabsE);
				
			}
			
			var activeClass = (currentIndex == 1 && is_single) ? "active_tab" : "";
			var tabContent = creEl("div", "content "+activeClass, "tab"+currentIndex);
			var accordionHeading = creEl('h3', 'totolist-text');
			//accordionHeading.innerHTML = "To Do List";
			var accordion = creEl("div","accordion","accordion-"+currentIndex)
			
			var program_dates = creEl("h4","program_dates","program_dates-"+currentIndex)
			var accordionFormsHeader = creEl("div","accordion-forms-header","accordion-forms-header-"+currentIndex)
			var accordionInvoiceHeader = creEl("div","accordion-invoice-header","accordion-forms-header-"+currentIndex)
			var accordionforms = creEl("div","accordion","accordionforms-"+currentIndex)
			var accordionInvoiceHeader = creEl("div","accordion-forms-header","accordion-invoice-header-"+currentIndex)
			
			tabContent.prepend(program_dates, accordionHeading, accordionFormsHeader,accordionforms, accordionInvoiceHeader, accordion)
			contentSection.appendChild(tabContent);
		});
		
		// failed message display
		var failedData = this.getFaildData(responseText);
		if(failedData.length > 0){
			var notificationDiv = creEl('div', 'notification_container');
			failedData.forEach(item => {
				let noText = creEl('span', 'noti_text');
				noText.innerHTML = item;
				notificationDiv.appendChild(noText);
			})
			tabsContainer.prepend(notificationDiv, tabs,contentSection)
		}else{
			tabsContainer.prepend(tabs,contentSection)
		}
	}
	/**
	 * initialize  Tabs feature - adds toggle function for folders in accordion 
	 */
	initiateTabs(){
	  var d = document,
      tabs = d.querySelector('.tabs'),
      tab = d.querySelectorAll('.tab_li'),
      contents = d.querySelectorAll('.content');
	  if(!tabs){
		 return false; 
	  }
	  tabs.addEventListener('click', function(e) {
		  if (e.target && e.target.nodeName === 'LI') {
			for (var i = 0; i < tab.length; i++) {
			  tab[i].classList.remove('active_tab');
			}
			e.target.classList.toggle('active_tab');
			for (i = 0; i < contents.length; i++) {
			  contents[i].classList.remove('active_tab');
			}
			var tabId = '#' + e.target.dataset.tabId;
	 d.querySelector(tabId).classList.toggle('active_tab'); 
		  }  
	  });
	}
	/**
	 * Get current active tab before initiate new accordion
	 */
	getCurrentActiveTag(){
		const accordion = document.getElementsByClassName('active');
		console.log('accordion', accordion.length)
		var $this = this;
		for (let i=0; i<accordion.length; i++) {
			console.log('accordion[i].id', accordion[i].id)
			$this.$activeTabID = accordion[i].id;
		}
		const tabs = document.getElementsByClassName('active_tab');
		var $this = this; // makes global
		for (let i=0; i<tabs.length; i++) {
			$this.$activeMainTabID = tabs[i].id;
		}
	}
	/**
   If form is submitted/closed, set active tab to know which accordion folder to display as open
	 */
	setCurrentActiveTag(){
		var $this = this;
		console.log('?????', $this.$activeTabID)
		const accordion = document.getElementById($this.$activeTabID);
		console.log('accordion>>>>', accordion)
		if(accordion){
			accordion.classList.add("active");
		}
		const activeMainTabID = document.getElementById($this.$activeMainTabID);
		if(activeMainTabID){
			activeMainTabID.classList.add("active_tab");
		}
		const activeMainTabLi = document.getElementById('li-'+$this.$activeMainTabID);
		if(activeMainTabLi){
			activeMainTabLi.classList.add("active_tab");
		}
	}
	getFaildData(data){
		console.log('failed data', data)
		if(data.length <= 0){
			return false;
		}
		var failedData = data.filter(item=>{
			if(item.invoiceList != null && item.invoiceList.length > 0 ){
				let failedSingleData = item.invoiceList.filter(invoice => invoice.status == "Failed" );
				if(failedSingleData.length > 0){
					return true;
				}else{
					return false;
				}
			}else{
				return false;
			}
		})
		
		var FailedInvoiceData = [];
		failedData.forEach(i =>{
			let fInvoice = i.invoiceList.filter(invoice => invoice.status == "Failed");
			fInvoice.forEach(iData=>{
				let invoiceText = iData.invoiceName+' Invoice is failed for '+i.studentDetail.studentName
				FailedInvoiceData.push(invoiceText);
			})
		})
		return FailedInvoiceData;
	}
	async renderPortalData(memberId) {
		var spinner = document.getElementById('half-circle-spinner');
		spinner.style.display = 'block';
		try {
		  var $this = this;	
		  this.getCurrentActiveTag();
		  //const data = await this.apiClient.fetchData('getInvoiceDetail/'+this.webflowMemberId);
		  const data = await this.apiClient.fetchData('getAllStudentDetails/'+this.webflowMemberId);
		  this.viewtabs(data);
		  this.initiateTabs();
		  var $this = this;
		  data.forEach((formData,index) => {
			  //setTimeout(function(){
				  let currentIndex = index+1;
				  new portalForm($this.webflowMemberId, formData,currentIndex, $this.accountEmail);
			  //},30)
		  })
		  this.initializeToolTips()
		  document.getElementById("paid-resources").style.display = "block";
		  setTimeout(function(){
			$this.setCurrentActiveTag();
			spinner.style.display = 'none';
		  },30)
		} catch (error) {
			document.getElementById("free-resources").style.display = "block";
			console.error('Error rendering random number:', error);
			spinner.style.display = 'none';
		}
	}
	initializeToolTips(){
		const elements = [...document.querySelectorAll('[tip]')]
		for (const el of elements) {
		  const tip = document.createElement('div')
		  tip.classList.add('tooltip')
		  tip.textContent = el.getAttribute('tip')
		  const x = el.hasAttribute('tip-left') ? 'calc(-100% - 5px)' : '16px'
		  const y = el.hasAttribute('tip-top') ? '-100%' : '0'
		  tip.style.transform = `translate(${x}, ${y})`
		  el.appendChild(tip)
		  el.onpointermove = e => {
			if (e.target !== e.currentTarget) return

			const rect = tip.getBoundingClientRect()
			const rectWidth = rect.width + 16
			const vWidth = window.innerWidth - rectWidth
			const rectX = el.hasAttribute('tip-left') ? e.clientX - rectWidth : e.clientX + rectWidth
			const minX = el.hasAttribute('tip-left') ? 0 : rectX
			const maxX = el.hasAttribute('tip-left') ? vWidth : window.innerWidth
			const x = rectX < minX ? rectWidth : rectX > maxX ? vWidth : e.clientX
			tip.style.left = `${x}px`
			tip.style.top = `${e.clientY}px`
		  }
		}
	}
}
