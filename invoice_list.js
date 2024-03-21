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
 * Class for handling InvoiceList List
 * @param webflowMemberId - memberId
 * @param invoiceData - invoice data by API
 */
class InvoiceList {
	constructor(webflowMemberId, invoiceData) {
		this.webflowMemberId = webflowMemberId;
		// invoiceData.sort(function (a, b) {
		// 	return new Date(b.created_on) - new Date(a.created_on);
		// });
		this.invoiceData = invoiceData.classInvoiceData;
		this.paginateData = this.paginatorList(invoiceData.classInvoiceData);

		this.summerInvoiceData = invoiceData.SummerInvoiceData;
		this.summerPaginateData = this.paginatorList(invoiceData.SummerInvoiceData);

		this.makeInvoiceList('academic');
		this.makeInvoiceList('summer');

	}
	/*Creating pagination array object*/
	paginatorList(items, page, per_page) {
		var page = page || 1,
			per_page = per_page || 100,
			offset = (page - 1) * per_page,

			paginatedItems = items.slice(offset).slice(0, per_page),
			total_pages = Math.ceil(items.length / per_page);
		return {
			page: page,
			per_page: per_page,
			pre_page: page - 1 ? page - 1 : null,
			next_page: (total_pages > page) ? page + 1 : null,
			total: items.length,
			total_pages: total_pages,
			data: paginatedItems
		};
	}




	/* Creating dom element for column based on column width*/
	createCol(message, col_width) {
		var col_width = (col_width) ? col_width : 3;
		var col = creEl("div", 'w-col w-col-' + col_width);
		if (message != '') {
			col.innerHTML = message;
		}
		return col;
	}
	/*Creating bold text dom element*/
	creBoldText(text) {
		var boldText = creEl('b', 'bold-text');
		boldText.innerHTML = text;
		return boldText;
	}
	/*Display download file icon for detail and listing page*/
	downLoadLinkIcon(fileLink, type = '') {
		var $this = this;
		var fileName = fileLink
		var a = creEl('a', 'downloadLink')

		if (type == 'download') {
			var img = creEl('img', 'downloadIcon')
			img.class = "download-file"
			img.title = 'Download'
			img.src = "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/6434ff69906fb9a8c9c8b4d3_download-file.svg";
		} else {
			var img = creEl('img')
			img.src = "https://uploads-ssl.webflow.com/64091ce7166e6d5fb836545e/65fa4cad1c30f8603b7a1161_view-icon.png";
		}
		a.appendChild(img);
		a.addEventListener('click', function () {
			//$this.download(fileLink, fileLink.substring(fileLink.lastIndexOf('/') + 1));
		})
		return a;
	}


	/*Display download file icon for detail and listing page*/
	getInvoiceDownloadIcon($type) {
		var $this = this;
		var a = creEl('a', 'downloadLink')

		
			var img = creEl('img', 'downloadIcon')
			img.class = "download-file"
			img.title = 'Download'
			img.src = "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/6434ff69906fb9a8c9c8b4d3_download-file.svg";
		
		a.appendChild(img);
		a.addEventListener('click', function () {
			$this.downloadInvoice($type);
		})
		return a;
	}
	async downloadInvoice($type){
		try {
			// Proceed to generate and download the PDF
			if($type == 'summer'){
				var contentToConvert = document.querySelector('.summer-invoice');
			}else{
				var contentToConvert = document.querySelector('.invoice');
			}
			
			const currentDate = new Date();
			const formattedDate = currentDate.toISOString().slice(0, 19).replace(/[-:]/g, '');

			const filename = `Receipt-${formattedDate}.pdf`;

			await html2pdf()
				.from(contentToConvert)
				.set({ margin: 1, filename: filename, html2canvas: { scale: 2 } })
				.save();

			console.log('PDF generated successfully');
		} catch (error) {
			console.error('Error generating PDF:', error);
		} finally {
			//downloadButton.textContent = originalButtonText;
		}
	}
	
	/*Creating dom element for invoice list*/
	createInvoiceList($type) {
		var $this = this;
		var messageList = creEl('div', 'message-list');
		var invoicePaginationData = ($type == 'summer') ? this.summerPaginateData  : this.paginateData;
		invoicePaginationData.data.forEach((item, index) => {
			var row = creEl('div', 'w-row ')
			var programName = item.programName;
			var classLevel = item.classLevel;
			var startTime = item.startTime;
			var sessionName = item.sessionName;
			var currentYear = item.currentYear;
			if($type != 'summer' ){
				var title = item.studentName + " - " + classLevel + " - " + item.day + " " + startTime + " (" + item.location + ", " + sessionName + " " + currentYear + ")"
			}else{
				var title = item.studentName + " - " + programName + " (" + item.location + ", " + currentYear + " " + sessionName + ")"
			}
			
			var col_1 = this.createCol(title, 6);
			row.appendChild(col_1);




			var div = document.createElement("div");
			var totalAmount = ($type == 'summer') ? parseFloat(item.paymentTotal)  : parseFloat(item.totalAmount) + parseFloat(item.depositAmount);
			div.innerHTML = '$' + this.numberWithCommas(totalAmount.toFixed(2));
			var text = div.textContent || div.innerText || "";

			//console.log('item.message', text)
			var col_4 = this.createCol(text, 2);
			row.appendChild(col_4);
			var col_5 = this.createCol('', 2);

			var viewIcon = this.downLoadLinkIcon(item.uploadedFiles);
			col_5.appendChild(viewIcon);

			// var downloadIcon = this.downLoadLinkIcon(item.uploadedFiles, 'download');
			// col_5.appendChild(downloadIcon);

			row.appendChild(col_5);
			row.addEventListener('click', function () {
				$this.displayDetailsPage(item, $type);
			})
			messageList.appendChild(row)
		})

		return messageList;
	}
	// Format the amount with comma separated 
	numberWithCommas(x) {
		return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}
	/*Creating dom element message list header*/
	createMessageTitle() {
		var title = ['Student', 'Amount', 'Action']
		var row = creEl('div', 'w-row')
		title.forEach(item => {
			var col_width = 3
			if (item == '') {
				col_width = 1
			} else if (item == 'Student') {
				col_width = 6
			} else if (item == 'Action') {
				col_width = 2;
			} else if (item == 'Amount') {
				col_width = 2;
			}
			var col = this.createCol(item, col_width);
			row.appendChild(col);
		})
		return row;
	}
	/*Refreshing the message list*/
	refreshData() {
		var invoice = document.getElementById("invoice");
		invoice.innerHTML = "";
		this.makeInvoiceList();

	}
	/*hide and show message list and details page*/
	showListPage($type) {
		var invoice = document.getElementById("invoice");
		var invoiceDetails = document.getElementById("invoice-details");
		var invoiceHeading = document.getElementsByClassName("invoice-heading")[0];
		if($type  == 'summer'){
			invoice = document.getElementById("summer-invoice");
			invoiceDetails = document.getElementById("summer-invoice-details");
			invoiceHeading = document.getElementsByClassName("summer-invoice-heading")[0];
		}
		invoice.style.display = 'block';
		invoiceDetails.style.display = 'none';
		invoiceHeading.style.display = 'block';
	}
	/*Creating back button dom element for */
	detailPageBackButton(className, $type) {
		var $this = this;
		var backButton = creEl('a', 'w-previous ' + className)
		var img = creEl('img', 'back-icon')
		img.src = "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/6434fd8a3e27f65f1168c15b_arrow-left.svg"
		img.title = 'Back'
		backButton.appendChild(img);
		var backText = creEl("span", 'back-text')
		backText.innerHTML = "BACK";
		backButton.appendChild(backText);
		backButton.addEventListener('click', function () {
			$this.showListPage($type);
		})
		return backButton;
	}
	
	/*Foramated date for list and details page*/
	formatedDate(dateString, type = '') {
		const monthText = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
		var date = new Date(dateString);
		var day = date.getDate();
		var month = date.getMonth();
		var year = date.getFullYear();
		var newDate = month + 1 + '/' + day + '/' + year;
		if (type == 'detailPage') {
			newDate = monthText[date.getMonth()] + ' ' + day + ', ' + year
		}
		return newDate;
	}
	/* Creating DOM element for detail page */
	detailPageContain(item, $type) {
		var contain = creEl('div', 'detail-contain  w-row', 'detail-contain');

		var detailHead = creEl('div', 'detail-head w-row');
		var title = item.title;
		var dateTextcol = creEl("div", 'w-col w-col-6 detail-title-text');
		var titleB = this.creBoldText(title)
		dateTextcol.appendChild(titleB);

		
		var downloadIcon =  this.getInvoiceDownloadIcon();
		var downloadCol = creEl("div", 'w-col w-col-12 download-icon');
		downloadCol.appendChild(downloadIcon);
		contain.appendChild(downloadCol);
		// change class to print pdf for academic and summer invoice
		var invoicePdfClass= ($type == 'summer' ? 'summer-invoice' : 'invoice');
		var invoice = document.createElement('div');
		invoice.classList.add(invoicePdfClass);

		var header = document.createElement('div');
		header.classList.add('invoice-header');

		var title = document.createElement('h4');
		title.textContent = 'Invoice for '+item.studentName;
		header.appendChild(title);

		header.innerHTML += '<div class="invoice-icon">' +
			'<svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="138.000000pt" height="138.000000pt" viewBox="0 0 138.000000 138.000000" preserveAspectRatio="xMidYMid meet">' +
			'<g transform="translate(0.000000,138.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none">'+
			'<path d="M545 1364 c-38 -8 -113 -35 -165 -61 -77 -38 -109 -61 -176 -127 -214 -214 -262 -519 -127 -796 38 -77 61 -109 127 -176 214 -214 519 -262 796 -127 77 38 109 61 176 127 214 214 262 519 127 796 -38 77 -61 109 -127 176 -67 66 -99 89 -176 127 -151 74 -298 93 -455 61z m350 -49 c203 -68 350 -215 421 -420 25 -71 28 -94 28 -205 0 -111 -3 -134 -28 -205 -71 -205 -216 -350 -421 -421 -71 -25 -94 -28 -205 -28 -111 0 -134 3 -205 28 -205 71 -350 216 -421 421 -25 71 -28 94 -28 205 0 111 3 134 28 205 79 229 254 386 491 441 93 21 242 12 340 -21z"/>'+
			'<path d="M567 1298 c6 -7 13 -20 16 -28 3 -9 6 -3 6 13 1 19 -4 27 -15 27 -12 0 -14 -4 -7 -12z"/>'+
			'<path d="M822 1293 c5 -19 -14 -83 -25 -83 -28 -1 21 -20 50 -20 62 0 71 78 12 99 -38 13 -40 13 -37 4z m56 -41 c4 -28 -14 -52 -38 -52 -15 0 -16 5 -6 40 11 45 39 52 44 12z"/>'+
			'<path d="M515 1246 c8 -24 11 -47 8 -50 -4 -3 2 -6 12 -6 12 0 15 4 8 13 -13 16 -23 57 -14 57 4 0 18 -11 31 -25 29 -31 40 -32 40 -3 0 12 -3 19 -6 15 -4 -3 -21 5 -39 18 -47 36 -55 32 -40 -19z"/>'+
			'<path d="M350 1220 c-14 -11 -20 -20 -14 -20 8 0 36 -43 50 -78 2 -5 64 33 64 40 0 4 -4 10 -10 13 -5 3 -10 0 -10 -8 0 -8 -6 -17 -14 -20 -18 -7 -31 24 -15 34 6 4 8 12 4 19 -6 9 -9 9 -16 -1 -7 -11 -11 -11 -21 -1 -10 10 -10 14 1 21 8 5 21 7 29 3 10 -3 13 -1 8 6 -10 17 -27 14 -56 -8z"/>' +
			'<path d="M1004 1222 c3 -5 -7 -27 -23 -49 l-29 -40 30 -18 c24 -14 32 -15 41 -5 9 10 8 12 -4 7 -23 -8 -41 7 -33 26 7 19 24 23 24 6 0 -5 5 -7 11 -3 8 5 7 9 -1 14 -14 9 -6 40 10 40 6 0 14 -10 19 -22 6 -16 9 -18 13 -7 4 9 -7 23 -29 38 -19 12 -33 18 -29 13z"/>'+
			'<path d="M591 1159 c-185 -36 -344 -205 -373 -397 -49 -314 229 -593 542 -545 260 41 442 286 403 543 -42 271 -301 452 -572 399z m-44 -191 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m373 -71 c0 -1 -24 -25 -52 -52 l-53 -50 50 53 c46 48 55 57 55 49z m-360 -92 c19 -19 32 -35 29 -35 -3 0 -20 16 -39 35 -19 19 -32 35 -29 35 3 0 20 -16 39 -35z m-169 -55 c4 0 12 8 18 17 16 29 24 7 12 -30 -18 -55 -42 -71 -95 -63 -60 9 -64 20 -17 38 31 13 40 22 46 49 7 33 8 33 18 12 6 -13 14 -23 18 -23z m389 36 c0 -2 -8 -10 -17 -17 -16 -13 -17 -12 -4 4 13 16 21 21 21 13z m285 -73 c43 -21 44 -29 4 -37 -74 -15 -102 4 -116 77 -6 32 -6 32 15 14 20 -18 21 -18 33 5 13 23 13 23 21 -10 6 -23 19 -37 43 -49z m-424 30 c13 -16 12 -17 -3 -4 -10 7 -18 15 -18 17 0 8 8 3 21 -13z m89 -7 c0 -2 -8 -10 -17 -17 -16 -13 -17 -12 -4 4 13 16 21 21 21 13z m-108 -73 c64 -16 70 -16 142 1 66 17 82 17 134 6 33 -7 92 -11 131 -8 l71 4 0 -28 c0 -47 -31 -68 -100 -68 -32 0 -83 5 -111 11 -44 10 -65 8 -126 -7 -65 -16 -79 -17 -131 -4 -66 15 -96 16 -208 5 -103 -10 -132 -3 -140 33 -3 15 -8 34 -10 42 -3 13 9 14 79 12 45 -2 98 1 117 6 52 15 78 14 152 -5z"/>'+
			'<path d="M475 640 c-4 -6 -11 -8 -16 -5 -5 3 -6 -1 -3 -9 3 -9 1 -16 -4 -16 -6 0 -13 8 -15 18 -4 15 -5 15 -6 0 -2 -26 20 -33 36 -13 12 18 18 13 13 -10 -1 -5 4 -4 12 3 11 11 10 14 -1 21 -11 7 -11 9 0 14 9 3 10 6 2 6 -6 1 -15 -4 -18 -9z"/>'+
			'<path d="M765 640 c-3 -5 -12 -7 -19 -4 -18 7 -28 -9 -20 -30 8 -22 25 -20 31 4 4 16 9 18 24 9 13 -6 19 -6 19 1 0 5 -5 10 -11 10 -5 0 -7 5 -4 10 3 6 2 10 -4 10 -5 0 -12 -4 -16 -10z m-15 -26 c0 -8 -4 -12 -10 -9 -5 3 -10 10 -10 16 0 5 5 9 10 9 6 0 10 -7 10 -16z"/>'+
			'<path d="M868 633 c-3 -13 -3 -23 0 -24 4 0 15 -2 25 -4 12 -2 17 3 17 18 -1 22 -1 22 -12 2 -12 -19 -12 -19 -18 5 -6 25 -6 25 -12 3z"/>' +
			'<path d="M310 619 c0 -11 4 -18 10 -14 5 3 7 12 3 20 -7 21 -13 19 -13 -6z"/>' +
			'<path d="M381 633 c0 -4 4 -17 9 -28 8 -19 9 -19 9 2 1 12 -3 25 -9 28 -5 3 -10 3 -9 -2z"/>' +
			'<path d="M412 620 c0 -14 2 -19 5 -12 2 6 2 18 0 25 -3 6 -5 1 -5 -13z"/>' +
			'<path d="M573 625 c-3 -9 -3 -19 1 -22 3 -4 6 1 6 11 0 9 5 14 10 11 6 -3 10 -1 10 4 0 17 -20 13 -27 -4z"/>' +
			'<path d="M924 618 c0 -9 3 -16 6 -16 3 0 7 -1 10 -2 21 -10 72 -6 77 6 4 10 10 11 24 3 13 -6 19 -6 19 1 0 5 -5 10 -11 10 -5 0 -8 4 -5 9 3 5 -5 8 -17 7 -17 -1 -23 -6 -19 -18 2 -10 -1 -18 -7 -18 -6 0 -11 7 -11 16 0 13 -2 13 -17 -2 -12 -12 -18 -13 -21 -4 -3 7 1 16 8 20 8 5 4 8 -11 7 -16 -1 -25 -8 -25 -19z"/>' +
			'<path d="M357 610 c3 -11 7 -20 9 -20 2 0 4 9 4 20 0 11 -4 20 -9 20 -5 0 -7 -9 -4 -20z"/>' +
			'<path d="M606 614 c-3 -8 -2 -13 3 -9 5 3 12 -1 14 -7 3 -7 6 -3 6 10 1 25 -14 30 -23 6z"/>' +
			'<path d="M648 608 c5 -19 7 -20 10 -5 5 24 20 21 25 -5 4 -20 4 -19 6 5 1 22 -3 27 -23 27 -20 0 -23 -4 -18 -22z"/>' +
			'<path d="M700 616 c0 -8 4 -17 9 -20 5 -4 7 3 4 14 -6 23 -13 26 -13 6z"/>' +
			'<path d="M214 1105 c-28 -44 9 -94 61 -81 30 8 42 43 23 63 -13 12 -17 12 -29 -3 -8 -10 -9 -15 -3 -11 13 8 37 -16 27 -26 -12 -12 -50 -7 -63 7 -18 22 -9 62 14 58 11 -2 15 1 11 7 -10 17 -23 13 -41 -14z"/>' +
			'<path d="M1144 1104 c5 -11 -53 -61 -66 -56 -16 5 -7 -15 16 -38 26 -23 56 -22 56 4 0 7 9 16 20 19 27 7 25 20 -6 54 -14 15 -23 23 -20 17z m26 -45 c0 -16 -5 -20 -19 -16 -14 3 -17 0 -14 -14 4 -14 0 -19 -14 -19 -34 0 -34 13 -1 41 40 34 48 35 48 8z"/>' +
			'<path d="M120 955 c-11 -13 -10 -14 3 -9 21 8 37 -3 31 -21 -5 -11 -11 -12 -24 -5 -24 13 -27 13 -34 -5 -3 -8 -2 -14 2 -13 15 4 82 -24 82 -35 0 -7 4 -6 10 3 12 18 13 33 2 26 -12 -7 -35 10 -29 22 4 5 18 7 32 4 15 -2 25 0 25 7 0 6 -13 11 -29 11 -16 0 -31 6 -35 15 -7 19 -20 19 -36 0z"/>' +
			'<path d="M1156 905 c4 -8 8 -15 10 -15 2 0 4 7 4 15 0 8 -4 15 -10 15 -5 0 -7 -7 -4 -15z"/>' +
			'<path d="M1190 905 c14 -17 6 -50 -10 -40 -6 3 -7 -1 -4 -9 3 -9 8 -16 11 -16 9 0 83 64 83 72 0 4 -21 8 -46 8 -40 0 -45 -2 -34 -15z m40 -10 c-7 -8 -14 -15 -15 -15 -2 0 -5 7 -9 15 -4 10 1 15 16 15 17 0 18 -2 8 -15z"/>' +
			'<path d="M66 788 c-3 -7 -6 -25 -9 -41 -3 -22 -1 -26 12 -23 9 3 33 1 54 -3 31 -8 37 -6 37 8 0 12 -9 16 -32 15 -18 0 -39 2 -45 4 -16 5 -17 29 -1 34 9 3 9 6 0 12 -7 4 -14 2 -16 -6z"/>' +
			'<path d="M140 786 c0 -2 7 -9 15 -16 12 -10 15 -10 15 4 0 9 -7 16 -15 16 -8 0 -15 -2 -15 -4z"/>' +
			'<path d="M100 770 c0 -5 5 -10 11 -10 5 0 7 5 4 10 -3 6 -8 10 -11 10 -2 0 -4 -4 -4 -10z"/>' +
			'<path d="M1290 770 c25 -16 -4 -33 -49 -28 -33 3 -41 0 -41 -13 0 -13 8 -15 50 -11 31 3 50 1 50 -6 0 -6 -6 -13 -12 -15 -8 -3 -6 -6 5 -6 14 -1 17 8 17 44 0 36 -3 45 -17 45 -15 0 -16 -2 -3 -10z"/>' +
			'<path d="M115 619 c-4 -6 -13 -8 -20 -5 -21 8 -36 -18 -29 -53 5 -23 10 -29 19 -21 7 6 30 11 52 13 36 2 39 4 35 27 -8 44 -41 66 -57 39z m42 -26 c4 -11 -26 -27 -35 -19 -2 3 -2 12 2 21 6 18 27 16 33 -2z m-51 -4 c8 -14 -18 -31 -30 -19 -9 9 0 30 14 30 5 0 12 -5 16 -11z"/>' +
			'<path d="M1196 588 c-8 -33 -7 -58 3 -58 4 0 6 11 3 25 -5 26 3 31 27 16 7 -5 10 -14 7 -20 -4 -6 -2 -11 3 -11 6 0 11 7 11 15 0 18 5 18 31 5 15 -9 19 -7 19 7 0 14 -9 18 -36 20 -19 1 -41 7 -48 13 -10 8 -15 5 -20 -12z"/>' +
			'<path d="M1271 531 c-10 -6 -10 -10 -1 -16 13 -8 24 -1 19 14 -3 6 -10 7 -18 2z"/>' +
			'<path d="M154 459 c-8 -14 11 -33 25 -25 11 7 4 36 -9 36 -5 0 -12 -5 -16 -11z"/>' +
			'<path d="M1207 453 c-4 -3 -7 -12 -7 -20 0 -15 26 -18 34 -4 7 11 -18 33 -27 24z"/>' +
			'<path d="M216 394 c-3 -8 -3 -27 0 -41 6 -21 4 -24 -12 -21 -11 2 -18 11 -18 21 2 18 -11 23 -21 7 -6 -10 29 -50 44 -50 17 0 33 29 26 49 -9 29 3 45 21 30 7 -6 11 -15 8 -20 -3 -5 0 -9 5 -9 14 0 14 6 1 31 -13 23 -46 25 -54 3z"/>' +
			'<path d="M1122 388 c-14 -14 -16 -38 -2 -38 5 0 7 7 3 16 -4 12 -1 15 13 12 10 -2 18 -11 16 -19 -1 -10 5 -15 20 -15 14 1 23 -5 23 -14 0 -9 -7 -14 -17 -12 -10 2 -18 -2 -18 -8 0 -14 23 -13 38 2 20 20 14 48 -12 58 -13 5 -27 14 -31 19 -8 14 -18 14 -33 -1z"/>' +
			'<path d="M305 310 c-3 -11 -17 -28 -30 -38 -18 -14 -21 -22 -13 -30 9 -9 16 -3 30 19 11 17 28 33 39 36 15 4 17 8 8 19 -16 19 -27 17 -34 -6z"/>' +
			'<path d="M1035 290 c-3 -5 0 -10 7 -10 12 0 36 -29 48 -58 4 -10 11 -7 25 9 11 12 14 19 7 15 -7 -4 -22 4 -38 23 -27 33 -39 38 -49 21z"/>' +
			'<path d="M380 266 c0 -17 -27 -66 -43 -77 -5 -3 -1 -9 9 -13 10 -4 15 -4 12 0 -4 3 0 21 9 38 l17 31 9 -55 9 -54 25 42 c14 23 29 42 35 42 5 0 6 5 3 10 -11 17 -20 11 -35 -22 l-14 -33 -3 42 c-4 41 -33 85 -33 49z"/>' +
			'<path d="M984 210 c11 -21 17 -42 12 -47 -11 -11 -46 34 -46 61 0 16 -2 18 -9 7 -12 -19 6 -69 29 -81 14 -7 23 -6 34 6 9 8 16 18 16 20 0 14 -31 62 -43 67 -10 4 -8 -6 7 -33z"/>' +
			'<path d="M502 188 c-18 -18 -15 -62 6 -81 19 -18 52 -23 52 -9 0 5 -10 8 -22 8 -18 -1 -24 5 -26 27 -2 16 2 35 9 43 15 19 46 18 52 -1 4 -11 4 -10 3 2 -2 22 -55 30 -74 11z"/>' +
			'<path d="M831 186 c-8 -10 -9 -16 -1 -21 5 -3 10 1 10 9 0 9 5 16 10 16 19 0 22 -28 6 -59 -19 -36 -11 -44 29 -25 l30 14 -27 -4 c-32 -4 -33 -3 -13 28 9 13 13 31 9 40 -8 20 -37 21 -53 2z"/>' +
			'<path d="M635 130 c0 -61 20 -68 24 -8 3 51 6 56 31 40 17 -10 20 -10 20 3 0 11 -11 15 -37 15 l-38 0 0 -50z"/>' +
			'<path d="M677 135 c-4 -8 -2 -17 3 -20 6 -4 10 3 10 14 0 25 -6 27 -13 6z"/>' +
			'<path d="M682 85 c-10 -12 -10 -15 2 -15 7 0 16 7 20 15 7 19 -5 19 -22 0z"/>'+
			'</g></svg>' +
			'</div>';

		invoice.appendChild(header);

		var details = document.createElement('div');
		details.classList.add('invoice-details');
		// change invoice for content based on summer and academic class
		var invoiceForContent =  ($type != 'summer' ? item.sessionName+' '+item.currentYear : item.classSessionName+' '+item.currentYear);
		var invoiceFor = document.createElement('p');
		invoiceFor.innerHTML = '<strong>Invoice for '+invoiceForContent+' Bergen Debate Club Semester Course</strong>';
		details.appendChild(invoiceFor);

		var studentName = document.createElement('p');
		studentName.innerHTML = '<strong>Student Name:</strong> '+item.studentName;
		details.appendChild(studentName);

		var amount = document.createElement('p');
		var totalAmount = ($type == 'summer') ? parseFloat(item.paymentTotal) : (parseFloat(item.totalAmount) + parseFloat(item.depositAmount));
		amount.innerHTML = '<strong>Amount:</strong> $'+this.numberWithCommas(totalAmount.toFixed(2));
		details.appendChild(amount);

		var status = document.createElement('p');
		status.innerHTML = '<strong>Status:</strong> Paid';
		details.appendChild(status);

		var invoiceDate = (item.invoiceDateLast) ? item.invoiceDateLast : item.paymentDate;
		var dateOfBilling = document.createElement('p');
		dateOfBilling.innerHTML = '<strong>Date of Billing:</strong> '+this.formatedDate(invoiceDate, 'detailPage');
		details.appendChild(dateOfBilling);

		var location = document.createElement('p');
		location.innerHTML = '<strong>Location:</strong> 440 West Street, Fort Lee NJ 07024';
		details.appendChild(location);

		var paymentMadeTo = document.createElement('p');
		paymentMadeTo.innerHTML = '<strong>Payment Made To:</strong> DCA - Bergen County, LLC<br/>201-421-8621';
		details.appendChild(paymentMadeTo);

		var ein = document.createElement('p');
		ein.innerHTML = '<strong>EIN:</strong> 92-1876164';
		details.appendChild(ein);

		invoice.appendChild(details);
		contain.appendChild(invoice);
		return contain;
	}
	
	
	/* Hide and show detail page and append the content */
	displayDetailsPage(item, $type) {
		var $this = this;
		/*hide and show detail and list page*/
		if($type == 'summer'){
			var invoice = document.getElementById("summer-invoice");
			var invoiceDetails = document.getElementById("summer-invoice-details");
			var invoiceHeading = document.getElementsByClassName("summer-invoice-heading")[0];
		}else{
			var invoice = document.getElementById("invoice");
			var invoiceDetails = document.getElementById("invoice-details");
			var invoiceHeading = document.getElementsByClassName("invoice-heading")[0];
		}
		

		invoiceDetails.innerHTML = "";
		invoice.style.display = 'none';
		invoiceDetails.style.display = 'block';
		invoiceHeading.style.display = 'none';

		var backButton = this.detailPageBackButton('top-button', $type);
		invoiceDetails.appendChild(backButton);

		var notificationInnerDetails = creEl("div", 'invoice-details')

		


		/*Data to display*/
		var contain = this.detailPageContain(item, $type);
		notificationInnerDetails.appendChild(contain);

		/*Back button for detail page*/
		var backButton = this.detailPageBackButton('bottom-button', $type);
		notificationInnerDetails.appendChild(backButton);
		invoiceDetails.appendChild(notificationInnerDetails);
		


	}
	/* Creating dom element pagination */
	createPagination() {
		var $this = this;
		var pagination = creEl('div', 'w-pagination-wrapper', 'invoice-body');
		/*Previous Button*/
		if (this.paginateData.pre_page != null) {
			var preBtn = creEl('a', 'w-pagination-previous');
			preBtn.innerHTML = '< Previous';
			preBtn.addEventListener('click', function () {
				$this.paginateData = $this.paginatorList($this.invoiceData, $this.paginateData.pre_page);
				$this.refreshData();
			})
			pagination.appendChild(preBtn);
		}
		/*Next Button*/
		if (this.paginateData.next_page != null) {
			var nextBtn = creEl('a', 'w-pagination-next');
			nextBtn.innerHTML = 'Next >';
			nextBtn.addEventListener('click', function () {
				$this.paginateData = $this.paginatorList($this.invoiceData, $this.paginateData.next_page);
				$this.refreshData();
			})
			pagination.appendChild(nextBtn);
		}

		return pagination;
	}

	/* Creating dom element for message list */
	makeInvoiceList($type) {
		var classType = ($type == 'summer') ? 'summer-invoice' : 'invoice'
		var invoice = document.getElementById(classType);

		/*Message Title*/
		var messageTitle = this.createMessageTitle();
		var notificationTitle = creEl('div', 'invoice-title', 'invoice-title');
		notificationTitle.appendChild(messageTitle);
		invoice.appendChild(notificationTitle);
		/*Message List*/
		var messageList = this.createInvoiceList($type);
		var notificationbody = creEl('div', 'invoice-body', 'invoice-body');
		notificationbody.appendChild(messageList);
		invoice.appendChild(notificationbody);

		/*Message Pagination*/

		var pagination = this.createPagination();
		invoice.appendChild(pagination);

	}

}
/**
 * Class for Handling API for invoice center
 * @param webflowMemberId - MemberId
 */
class InvoiceApi {
	$isLoading = true;
	$invoiceData = '';
	constructor(webflowMemberId) {
		this.webflowMemberId = webflowMemberId;
		this.getInvoiceData();
	}
	async fetchData(url) {
		var spinner = document.getElementById('half-circle-spinner');
		try {
			spinner.style.display = 'block';
			const response = await fetch(`${url}`);
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			const data = await response.json();
			spinner.style.display = 'none';
			return data;
		} catch (error) {
			spinner.style.display = 'none';
			console.error('Error fetching data:', error);
			throw error;
		}
	}
	async getInvoiceData() {
		const data = await this.fetchData("https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/getSemesterInvoiceData/" + this.webflowMemberId);
		new InvoiceList(this.webflowMemberId, data);
	}
}
