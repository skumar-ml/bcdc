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
 * Class for handling instructor checkInForm form
 * @param webflowMemberId - memberId
 * @param messageData - instructor checkInForm data by API
 */
class checkInForm {
	$currentClass = {};
	$currentClassStudent = {};
	$incheckIn = false;
	constructor(webflowMemberId, classData){
		this.webflowMemberId = webflowMemberId;
		this.classData = classData;
		this.view();
	}
	/*Creating pagination array object*/
	paginatorList(items, page, per_page) {
		
		//Alphabetical order sorting
		items.sort(function (a, b) {
		  if (a.studentName < b.studentName) {
			return -1;
		  }
		  if (a.studentName > b.studentName) {
			return 1;
		  }
		  return 0;
		});
		
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
	// clear filter select box data
	resetFilter(){
		var studentData = this.$currentClass.studentDetails;
		
		var insCheckinFilter = document.getElementById("ins-checkin-filter");
		
		studentData.value = "";
		insCheckinFilter.value = "";
		
		
		
	}
	/* Creating the DOM element for instructor checked in */
	createInstructorCheckInFilter(){
		var $this = this;
		var col = creEl("div", 'col');
		var classel = creEl("classel", 'form-field-classel')
		classel.innerHTML = "Status";
		col.appendChild(classel)
		
		var dateFilter = creEl('select', 'ins-checkin-filter w-select', 'ins-checkin-filter');
		var defaultoption = creEl("option");
		defaultoption.value = "";
		defaultoption.text = "Select";
		dateFilter.appendChild(defaultoption);
		//Newest
		var newestoption = creEl("option");
		newestoption.value = "true";
		newestoption.text = "CheckedIn";
		dateFilter.appendChild(newestoption);
		//oldest
		var oldestoption = creEl("option");
		oldestoption.value = "false";
		oldestoption.text = "Not Checked In";
		dateFilter.appendChild(oldestoption);
		col.appendChild(dateFilter)
		dateFilter.addEventListener('change', function () {
			$this.filterstudentData('type', this.value);
		})
		return col;
	}
	
	/* Creating dom element for search filter*/
	createSearchFilter(){
		var $this = this;
		var col = creEl("div", 'col');
		
		var classel = creEl("classel", 'form-field-classel')
		classel.innerHTML = "Search";
		col.appendChild(classel)
		
		
		var searchFilter = creEl('input', 'search-filter form-text-classel w-input', 'search-filter')
		searchFilter.name = 'messageSearch';
		searchFilter.placeholder = "Student";
		/*Event for search*/
		searchFilter.addEventListener('keypress', function (event) {
			if (event.key === "Enter") {
				$this.filterstudentData('type', this.value);
			}
		})
		
		col.appendChild(searchFilter)
		return col;
	}
	/* Creating dom element for filter header */
	makeAttendanceFilter(){
		//var attendanceFilter = document.getElementById("attendance-filter");
		/*Filter*/
		var attendanceHeader = creEl('div', 'attendance-header w-layout-grid grid-6', 'attendance-header')
		var instructorFilter = this.createInstructorCheckInFilter();
		var searchFilter = this.createSearchFilter();
		attendanceHeader.appendChild(instructorFilter);
		attendanceHeader.appendChild(searchFilter);
		//attendanceFilter.appendChild(attendanceHeader);
		return attendanceHeader;
	}
	/*Filter api response based on current seleted filter value*/
	filterstudentData(){
		//this.studentData = this.filterData;
		var studentData = this.$currentClass.studentDetails;
		var currentClass = this.$currentClass;
		
		
		var insCheckinFilter = document.getElementById("ins-checkin-filter");
		
		
		var searchFilter = document.getElementById("search-filter");
		if(insCheckinFilter.value){
			if(insCheckinFilter.value == 'true'){
			studentData = studentData.filter(item => item.attendanceId != '')
			}else{
			studentData = studentData.filter(item => item.attendanceId == '')
			}
		}
		if(searchFilter.value){
			var search = searchFilter.value;
			var condition = new RegExp(search, 'i');
			studentData = studentData.filter(function (el) {
			  return condition.test(el.studentName);
			});
		}
		this.$currentClass = studentData;
		this.$currentClassStudent = this.paginatorList(studentData)
		this.refreshData();
	}
	/* Creating dom element for column based on column width*/
	createCol(message, col_width){
		var col_width = (col_width) ? col_width : 3;
		var col = creEl("div", 'w-col w-col-'+col_width);
		if(message != ''){
			col.innerHTML= message;
		}
		return col;
	}
	/*Creating Read and unread icon for list page*/
	getCheckedIcon(status){
		var img = creEl('img', 'is_read_icon')
		if(status){
			var src = "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/642a83485b6551a71e5b7e12_dd-check.png";
		}else{
			var src = "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/642a834899a0eb5204d6dafd_dd-cross.png";
		}
		img.src = src;
		return img
	}
	/* Display Classs select box for instructor */
	view(){
		var accordionDiv = document.getElementById("instructor-attendance");
		var row = creEl('div', 'w-row ');
		
		var col = creEl("div", 'w-col-12 checkin-row');
		var classData = this.getClasss();
		col.appendChild(classData)
		
		
		
		
		var studentlistfilter = creEl("div", 'student-list-filter', 'student-list-filter');
		var filter = this.makeAttendanceFilter();
		studentlistfilter.appendChild(filter);
		col.appendChild(studentlistfilter)
		
		var head = this.createAttendanceTitle();
		col.appendChild(head)
		
		
		
		var studentlist = creEl("div", 'student-list', 'student-list');
		col.appendChild(studentlist)
		
		var noRecord = creEl('p', 'no-record', 'no-record');
		noRecord.innerHTML = 'No record found';
		col.appendChild(noRecord)
		
		var pagination = creEl("div", "pagination-student-list", 'pagination-student-list')
		col.appendChild(pagination)
		
		row.appendChild(col)
		accordionDiv.appendChild(row);
	}
	/* Get Class select box dom element */
	getClasss(){
		
		var $this = this;
		var Class = this.classData;
		var classSelectBox = creEl('select', 'select-Class w-select', 'select-Class')
		/*Added by default first class and removed select Class option*/
		var defaultoption = creEl("option");
		defaultoption.value = "";
		defaultoption.text = "Select Class";
		classSelectBox.appendChild(defaultoption);
		Class.forEach(item => {
			if(item.classId){
					var option = creEl("option");
					option.value = item.classId;
					option.text = item.className;
					classSelectBox.appendChild(option);
			}
		})
		classSelectBox.addEventListener('change', function () {
			$this.displayStudentList(this.value, 'init');
			$this.resetFilter();
			if(!this.value){
				$this.hideShowUI();
			}
		})
		
		return classSelectBox;
	}
	hideShowUI(){
		var studentlist = document.getElementById('student-list');
		var btn = document.getElementsByClassName('student-list-head')[0];
		var studentlistfilter = document.getElementsByClassName('student-list-filter')[0];
		var paginationStudentList = document.getElementsByClassName('pagination-student-list')[0];
		btn.style.opacity = 0;
		studentlist.style.opacity = 0;
		studentlistfilter.style.opacity = 0;
		paginationStudentList.style.opacity = 0;
	}
	// Create Class select box html element 
	getTimeZones(){
		var $this = this;
		// Get all Class data
		var Class = this.timezones;
		var classSelectBox = creEl('select', 'select-timezones w-select', 'select-timezone')
		var defaultoption = creEl("option");
		defaultoption.value = "";
		defaultoption.text = "Select Time Slot";
		classSelectBox.appendChild(defaultoption);
		Class.forEach(item => {
			var option = creEl("option");
				option.value = item.timezoneId;
				option.text = item.timezone;
				classSelectBox.appendChild(option);
		})
		
		classSelectBox.addEventListener('change', function () {
			var classSelectBox = document.getElementById('select-Class');
			$this.displayStudentList(classSelectBox.value, 'init');
			$this.resetFilter();
		})
		
		return classSelectBox;
	}
	/*Creating dom element message list header*/
	createAttendanceTitle(){
		var title = ['Student Name', 'Coach Check-In']
		//var title = ['Student Name', 'Check-in']
		var row = creEl('div', 'w-row student-list-head', 'student-list-head')
		title.forEach(item=> {
			var col_width = 3
			if(item == 'Student Name'){
				col_width = 8
			}else{
				col_width = 4;
			}
			var col = this.createCol(item, col_width);
			row.appendChild(col);
		})
		return row;
	}
	/*Creating DOM element for student list*/
	displayStudentList(classId, type=''){
		
		if(!classId){
			return;
		}
		
		var studentlist = document.getElementById('student-list');
		studentlist.innerHTML = "";
		var $this = this;
		var currentClass = this.classData.find(item => item.classId == classId);
		if(type == 'init'){
			var currentClassStudent = this.paginatorList(currentClass.studentDetails)
		}else{
			var currentClassStudent = this.$currentClassStudent
		}
		this.$currentClass = currentClass;
		this.$currentClassStudent = currentClassStudent;
		
		
		var opacity = (classId) ? 1 : 0;
		
		var btn = document.getElementsByClassName('student-list-head')[0];
		btn.style.opacity = opacity;
		//btn.style.transition = 'all 2s';
		
		var studentlistfilter = document.getElementsByClassName('student-list-filter')[0];
		studentlistfilter.style.opacity = opacity;
		//studentlistfilter.style.transition = 'all 2s';
		
		studentlist.style.opacity = opacity;
		//studentlist.style.transition = 'all 2s';
		
		var paginationStudentList = document.getElementsByClassName('pagination-student-list')[0];
		paginationStudentList.style.opacity = opacity;
		
		currentClassStudent.data.forEach((item, index) => {
			var row = creEl('div', 'w-row')
			
			var col_1 = this.createCol(item.studentName,8);
			row.appendChild(col_1);

			
			
			
			
			var col_3 = this.createCol('', 4);
			col_3.classList.add('text-center')
			var icon = $this.getCheckedIcon( (item.attendanceId) ? true : false);
			icon.addEventListener('click', function(){
					//var message = (selectInsTimezone && selectInsTimezone.checkedIn) ? "Are you sure want to uncheck-in" : "Are you sure want to check-in";
					icon.src = "https://cdn.jsdelivr.net/gh/sk1840939/nsd@044393b/loading.gif";
					var insCheckedIn = (item.attendanceId) ? true : false;
					var attendanceId = (item.attendanceId) ? item.attendanceId : '';
					var sCheckedIn = (item.attendanceId) ? true : false;
					if(item.attendanceId){
						
						if (confirm("Are you sure want to uncheck-in") == true) {
							$this.updateAttendanceData(item.studentemail, attendanceId, item.paymentId);
						}
					}else{
						$this.updateAttendanceData(item.studentemail, attendanceId, item.paymentId);
					}
					
				
			})
			col_3.appendChild(icon);
			
			
			
			row.appendChild(col_3);
			studentlist.appendChild(row)
		})
		
		var noRecord = document.getElementById('no-record');
		if(currentClassStudent.data.length > 0){
			noRecord.style.display = 'none';
		}else{
			noRecord.style.display = 'block';
		} 
		//Pagination
		var paginationStuList = document.getElementById('pagination-student-list');
		paginationStuList.innerHTML = "";
		var pagination = this.createPagination();
		paginationStuList.appendChild(pagination);
		
		//return studentlist;
	}
	/*Update current attendance data*/
	updateAttendanceData(studentId, attendanceId, paymentId){
		this.callCheckedInApi(studentId, attendanceId, paymentId);
	}
	/*Get tick icon for checked in*/
	getCheckInIcon(){
		var img = creEl('img', 'checkedInIcon')
		img.src = 'https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/6437ec2c6bc4131717b36b93_checkin.svg';
		return img
	}
	/*API call for checked in*/
	callCheckedInApi(studentId, attendanceId, paymentId){
		var currentClass = this.$currentClass;
		var data = {
		 "memberId":this.webflowMemberId, 	
		 "classId" : currentClass.classId,
		 "paymentId":paymentId,
		 "week" : currentClass.week,
		}
		if(attendanceId){
			data.attendanceId = attendanceId;
		}
		var xhr = new XMLHttpRequest()
		var $this = this;
		xhr.open("POST", "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/updateAttendance", true)
		xhr.withCredentials = false
		xhr.send(JSON.stringify(data))
		xhr.onload = function() {
			let responseText =  JSON.parse(xhr.responseText);
			$this.getUpdatedClasssData(currentClass.classId)
		}
		
	}
	/* Creating dom element pagination */
	createPagination(){
		var $this = this;
		var pagination = creEl('div', 'w-pagination-wrapper', 'notification-body');
		/*Previous Button*/
		if(this.$currentClassStudent.pre_page != null){
			var preBtn = creEl('a', 'w-pagination-previous');
			preBtn.innerHTML = '< Previous';
			preBtn.addEventListener('click', function () {
				$this.$currentClassStudent = $this.paginatorList($this.$currentClass.studentDetails, $this.$currentClassStudent.pre_page);
				$this.refreshData();
			})
			pagination.appendChild(preBtn);
		}
		/*Next Button*/
		if(this.$currentClassStudent.next_page != null){
			var nextBtn = creEl('a', 'w-pagination-next');
			nextBtn.innerHTML = 'Next >';
			nextBtn.addEventListener('click', function () {
				$this.$currentClassStudent = $this.paginatorList($this.$currentClass.studentDetails, $this.$currentClassStudent.next_page);
				$this.refreshData();
			})
			pagination.appendChild(nextBtn);
		}
		
		return pagination;
	}
	/*Refresh currrnt student list data*/
	refreshData(){
		var studentlist = document.getElementById('student-list');
		var paginationStuList = document.getElementById('pagination-student-list');
		studentlist.innerHTML = "";
		paginationStuList.innerHTML = "";
		var classSelectBox = document.getElementById('select-Class');
		this.displayStudentList(classSelectBox.value);
	}
	getUpdatedClasssData(classId){
		var xhr = new XMLHttpRequest()
		var $this = this;
		xhr.open("GET", "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/getAttendance/"+$this.webflowMemberId, true)
		xhr.withCredentials = false
		xhr.send()
		xhr.onload = function() {
			let responseText =  JSON.parse(xhr.responseText);
			$this.classData	= responseText;
			var currentClass = responseText.find(item => item.classId == classId);
			
			$this.$currentClass = currentClass
			$this.$currentClassStudent = $this.paginatorList(currentClass.studentDetails, $this.$currentClassStudent.page);
			$this.refreshData();
		}
	}
}
/**
  * Class for Handling API for Classs Data
  * @param webflowMemberId - MemberId
  */
class ClassData {
	$isLoading = true;
	$studentData = '';
	constructor(webflowMemberId){
		this.webflowMemberId = webflowMemberId;
		this.getClasssData();
	}
	getClasssData(){
		var xhr = new XMLHttpRequest()
		var $this = this;
		xhr.open("GET", "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/getAttendance/"+$this.webflowMemberId, true)
		xhr.withCredentials = false
		xhr.send()
		xhr.onload = function() {
			let responseText =  JSON.parse(xhr.responseText);
			new checkInForm($this.webflowMemberId, responseText); 			
		}
	}
}

