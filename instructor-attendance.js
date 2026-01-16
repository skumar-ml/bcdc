/*

Purpose: Instructor-facing attendance tracking system for managing student check-ins. Displays class sessions, student lists, and allows instructors to mark attendance and add notes.

Brief Logic: Fetches class and student data from API, displays classes in a filterable list, shows students for selected class with pagination, allows marking attendance status, and handles filtering by student name and attendance status.

Are there any dependent JS files: No

*/

/**
 * 	
 * @param name - HTML element name
 * @param className - HTML element class attribute
 * @param idName - HTML element id attribute
 */
// Helper function to create a DOM element with optional class and ID
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
  
  class checkInForm {
	  $currentClass = {};
	  $currentClassStudent = {};
	  $incheckIn = false;
	  // Initializes the checkInForm with member ID and class data
	  constructor(webflowMemberId, classData){
		  this.webflowMemberId = webflowMemberId;
		  this.classData = classData;
		  this.view();
	  }
	  // Creates a paginated list from an array of items
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
	  // Clears filter select box data
	  resetFilter(){
		  var studentData = this.$currentClass.studentDetails;
		  
		  var insCheckinFilter = document.getElementById("ins-checkin-filter");
		  
		  studentData.value = "";
		  insCheckinFilter.value = "";
		  
		  
		  
	  }
	  // Creates the DOM element for the instructor check-in filter
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
	  
	  // Creates the DOM element for the student search filter
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
	  // Creates the filter header for attendance
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
	  // Filters student data based on selected filter values
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
	  // Creates a column DOM element with specified message and width
	  createCol(message, col_width){
		  var col_width = (col_width) ? col_width : 3;
		  var col = creEl("div", 'w-col w-col-'+col_width);
		  if(message != ''){
			  col.innerHTML= message;
		  }
		  return col;
	  }
	  // Returns the appropriate icon for checked-in status
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
	  // Displays the class selection box and student list UI
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
	  // Returns the class selection box DOM element
	  getClasss(){
			
		  var $this = this;
		  var Class = this.classData;
		  
		  // Helper function to convert time string to minutes since midnight for sorting
		  function timeToMinutes(timeStr) {
			  if (!timeStr) return 0;
			  var timeMatch = timeStr.match(/(\d+):(\d+)(AM|PM)/i);
			  if (!timeMatch) return 0;
			  
			  var hours = parseInt(timeMatch[1]);
			  var minutes = parseInt(timeMatch[2]);
			  var period = timeMatch[3].toUpperCase();
			  
			  // Convert to 24-hour format
			  if (period === 'PM' && hours !== 12) {
				  hours += 12;
			  } else if (period === 'AM' && hours === 12) {
				  hours = 0;
			  }
			  
			  return hours * 60 + minutes;
		  }
		  
		  // Helper function to parse classLevelId for sorting (e.g., "1A" -> {num: 1, letter: "A"})
		  function parseClassLevelId(levelId) {
			  if (!levelId) return {num: 0, letter: '', isX: false};
			  var levelStr = levelId.toString().toUpperCase();
			  
			  // Check if level is "X" - should come last
			  if (levelStr === 'X' || levelStr.includes('X')) {
				  return {num: 999999, letter: '', isX: true};
			  }
			  
			  var match = levelStr.match(/(\d+)([A-Za-z]*)/);
			  if (!match) return {num: 0, letter: '', isX: false};
			  return {
				  num: parseInt(match[1]) || 0,
				  letter: (match[2] || '').toUpperCase(),
				  isX: false
			  };
		  }
		  
		  // sort class by startTime(4:00PM, 5:00PM, 6:00AM) and classLevelId(1A, 1B, 2A, 2B)
		  Class.sort(function(a, b) {
			  // First sort by startTime
			  var timeA = timeToMinutes(a.startTime);
			  var timeB = timeToMinutes(b.startTime);
			  
			  if (timeA !== timeB) {
				  return timeA - timeB;
			  }
			  
			  // If times are equal, sort by classLevelId
			  var levelA = parseClassLevelId(a.classLevelId);
			  var levelB = parseClassLevelId(b.classLevelId);
			  
			  // If one is X and the other is not, X comes last
			  if (levelA.isX && !levelB.isX) return 1;
			  if (!levelA.isX && levelB.isX) return -1;
			  
			  // Compare numeric part first
			  if (levelA.num !== levelB.num) {
				  return levelA.num - levelB.num;
			  }
			  
			  // If numeric parts are equal, compare letter part
			  if (levelA.letter < levelB.letter) return -1;
			  if (levelA.letter > levelB.letter) return 1;
			  return 0;
		  });
		  
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
	  // getClasss(){
		  
	  // 	var $this = this;
	  // 	var Class = this.classData;
	  // 	var classSelectBox = creEl('select', 'select-Class w-select', 'select-Class')
	  // 	/*Added by default first class and removed select Class option*/
	  // 	var defaultoption = creEl("option");
	  // 	defaultoption.value = "";
	  // 	defaultoption.text = "Select Class";
	  // 	classSelectBox.appendChild(defaultoption);
	  // 	Class.forEach(item => {
	  // 		if(item.classId){
	  // 				var option = creEl("option");
	  // 				option.value = item.classId;
	  // 				option.text = item.className;
	  // 				classSelectBox.appendChild(option);
	  // 		}
	  // 	})
	  // 	classSelectBox.addEventListener('change', function () {
	  // 		$this.displayStudentList(this.value, 'init');
	  // 		$this.resetFilter();
	  // 		if(!this.value){
	  // 			$this.hideShowUI();
	  // 		}
	  // 	})
		  
	  // 	return classSelectBox;
	  // }
	  // Hides or shows UI elements
	  hideShowUI(){
		  var studentlist = document.getElementById('student-list');
		  var btn = document.getElementsByClassName('student-list-head')[0];
		  var studentlistfilter = document.getElementsByClassName('student-list-filter')[0];
		  var paginationStudentList = document.getElementsByClassName('pagination-student-list')[0];
		  btn.style.opacity = 0;
		  studentlist.style.opacity = 0;
		  //studentlistfilter.style.opacity = 0;
		  studentlistfilter.style.display = "none";
		  paginationStudentList.style.opacity = 0;
	  }
	  // Creates the timezones select box HTML element
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
	  // Creates the DOM element for the attendance list header
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
	  // Creates a "New" ribbon HTML element
	  newRibbon(){
		  let newRibbon = creEl('div', 'new-ribbon')
		  let newRibbonText = creEl('span')
		  newRibbonText.innerHTML = "New"
		  newRibbon.appendChild(newRibbonText)
		  return newRibbon;
	  }
	  // Creates DOM elements for the student list
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
		  var display = (classId) ? "block" : "none";
		  
		  var btn = document.getElementsByClassName('student-list-head')[0];
		  btn.style.opacity = opacity;
		  //btn.style.transition = 'all 2s';
		  
		  var studentlistfilter = document.getElementsByClassName('student-list-filter')[0];
		  studentlistfilter.style.display = display;
		  //studentlistfilter.style.opacity = opacity;
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
					  // Get current student data from the updated data structure
					  var currentStudent = $this.$currentClass.studentDetails.find(function(student) {
						  return student.paymentId === item.paymentId;
					  });
					  
					  // Use current state if available, otherwise fall back to item
					  var currentAttendanceId = (currentStudent && currentStudent.attendanceId) ? currentStudent.attendanceId : (item.attendanceId ? item.attendanceId : '');
					  var currentPaymentId = (currentStudent && currentStudent.paymentId) ? currentStudent.paymentId : item.paymentId;
					  var isCurrentlyCheckedIn = currentAttendanceId ? true : false;
					  
					  icon.src = "https://cdn.jsdelivr.net/gh/sk1840939/nsd@044393b/loading.gif";
					  
					  if(isCurrentlyCheckedIn){
						  // Currently checked in, so we're unchecking in
						  if (confirm("Are you sure want to uncheck-in") == true) {
							  $this.updateAttendanceData(currentAttendanceId, currentPaymentId, icon);
						  } else {
							  // Reset icon if user cancels
							  icon.src = $this.getCheckedIcon(true).src;
						  }
					  }else{
						  // Currently not checked in, so we're checking in
						  $this.updateAttendanceData( '', currentPaymentId, icon);
					  }
					  
				  
			  })
			  col_3.appendChild(icon);
			  
			  
			  
			  row.appendChild(col_3);
			  // new-ribbon html code
			  if(item.prevStudent != "Yes"){
				  let newRibbon = this.newRibbon();
				  row.appendChild(newRibbon)	
			  }
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
	  // Updates current attendance data
	  updateAttendanceData(attendanceId, paymentId, iconElement){
		  this.callCheckedInApi(attendanceId, paymentId, iconElement);
	  }
	  // Returns the tick icon for checked-in status
	  getCheckInIcon(){
		  var img = creEl('img', 'checkedInIcon')
		  img.src = 'https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/6437ec2c6bc4131717b36b93_checkin.svg';
		  return img
	  }
	  // Makes an API call to update check-in status
	  callCheckedInApi(attendanceId, paymentId, iconElement){
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
		  xhr.open("POST", "https://xkopkui840.execute-api.us-east-1.amazonaws.com/prod/camp/updateAttendance", true)
		  xhr.withCredentials = false
		  xhr.send(JSON.stringify(data))
		  xhr.onload = function() {
			  try {
				  // Check if request was successful
				  if (xhr.status >= 200 && xhr.status < 300) {
					  let responseText = JSON.parse(xhr.responseText);
					  
					  // Check if response indicates success
					  var isSuccess = responseText.msg && responseText.msg.includes("successfully");
					  // The id field in response is paymentId
					  var responsePaymentId = responseText.id;
					  
					  // Update attendance status locally
					  // Find the student in current class
					  var studentIndex = currentClass.studentDetails.findIndex(function(student) {
						  return student.paymentId === paymentId;
					  });
					  
					  if (studentIndex !== -1 && isSuccess) {
						  // If attendanceId was provided, we're unchecking in (remove attendanceId)
						  // If attendanceId was empty, we're checking in (add new attendanceId from response)
						  if (attendanceId) {
							  // Uncheck-in: remove attendanceId
							  currentClass.studentDetails[studentIndex].attendanceId = '';
						  } else {
							  // Check-in: set attendanceId from response (if available)
							  // Try to get attendanceId from response, otherwise use paymentId or mark as checked
							  if (responseText.attendanceId) {
								  currentClass.studentDetails[studentIndex].attendanceId = responseText.attendanceId;
							  } else if (responseText.data && responseText.data.attendanceId) {
								  currentClass.studentDetails[studentIndex].attendanceId = responseText.data.attendanceId;
							  } else if (responsePaymentId) {
								  // Use paymentId as attendanceId if no attendanceId is provided
								  currentClass.studentDetails[studentIndex].attendanceId = responsePaymentId;
							  } else {
								  // If response doesn't have attendanceId, use a placeholder or keep it empty
								  // The API might return success without the ID, so we'll mark as checked in
								  currentClass.studentDetails[studentIndex].attendanceId = 'checked';
							  }
						  }
						  
						  // Update the classData array as well
						  var classDataIndex = $this.classData.findIndex(function(classItem) {
							  return classItem.classId === currentClass.classId;
						  });
						  
						  if (classDataIndex !== -1) {
							  var studentDataIndex = $this.classData[classDataIndex].studentDetails.findIndex(function(student) {
								  return student.paymentId === paymentId;
							  });
							  
							  if (studentDataIndex !== -1) {
								  if (attendanceId) {
									  $this.classData[classDataIndex].studentDetails[studentDataIndex].attendanceId = '';
								  } else {
									  if (responseText.attendanceId) {
										  $this.classData[classDataIndex].studentDetails[studentDataIndex].attendanceId = responseText.attendanceId;
									  } else if (responseText.data && responseText.data.attendanceId) {
										  $this.classData[classDataIndex].studentDetails[studentDataIndex].attendanceId = responseText.data.attendanceId;
									  } else if (responsePaymentId) {
										  // Use paymentId as attendanceId if no attendanceId is provided
										  $this.classData[classDataIndex].studentDetails[studentDataIndex].attendanceId = responsePaymentId;
									  } else {
										  $this.classData[classDataIndex].studentDetails[studentDataIndex].attendanceId = 'checked';
									  }
								  }
							  }
						  }
						  
						  // Update current class reference
						  $this.$currentClass = currentClass;
						  
						  // Re-paginate with updated data
						  $this.$currentClassStudent = $this.paginatorList(currentClass.studentDetails, $this.$currentClassStudent.page);
						  
						  // Update the icon based on new status
						  if (iconElement) {
							  var newStatus = currentClass.studentDetails[studentIndex].attendanceId ? true : false;
							  iconElement.src = newStatus 
								  ? "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/642a83485b6551a71e5b7e12_dd-check.png"
								  : "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/642a834899a0eb5204d6dafd_dd-cross.png";
						  }
						  
						  // Refresh the display
						 // $this.refreshData();
					  }
				  } else {
					  // API returned an error status
					  console.error('API error:', xhr.status, xhr.statusText);
					  // Reset icon to previous state on error
					  if (iconElement) {
						  var previousStatus = attendanceId ? true : false;
						  iconElement.src = previousStatus 
							  ? "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/642a83485b6551a71e5b7e12_dd-check.png"
							  : "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/642a834899a0eb5204d6dafd_dd-cross.png";
					  }
					  // Fallback to API call to get current state
					  $this.getUpdatedClasssData(currentClass.classId);
				  }
			  } catch (error) {
				  console.error('Error updating attendance locally:', error);
				  // Reset icon to previous state on error
				  if (iconElement) {
					  var previousStatus = attendanceId ? true : false;
					  iconElement.src = previousStatus 
						  ? "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/642a83485b6551a71e5b7e12_dd-check.png"
						  : "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/642a834899a0eb5204d6dafd_dd-cross.png";
				  }
				  // Fallback to API call if local update fails
				  $this.getUpdatedClasssData(currentClass.classId);
			  }
		  }
		  
		  xhr.onerror = function() {
			  console.error('Network error updating attendance');
			  // Reset icon to previous state on network error
			  if (iconElement) {
				  var previousStatus = attendanceId ? true : false;
				  iconElement.src = previousStatus 
					  ? "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/642a83485b6551a71e5b7e12_dd-check.png"
					  : "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/642a834899a0eb5204d6dafd_dd-cross.png";
			  }
			  // Fallback to API call on network error
			  $this.getUpdatedClasssData(currentClass.classId);
		  }
		  
	  }
	  // Creates the DOM element for pagination
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
	  // Refreshes the current student list data
	  refreshData(){
		  var studentlist = document.getElementById('student-list');
		  var paginationStuList = document.getElementById('pagination-student-list');
		  studentlist.innerHTML = "";
		  paginationStuList.innerHTML = "";
		  var classSelectBox = document.getElementById('select-Class');
		  this.displayStudentList(classSelectBox.value);
	  }
	  // Fetches updated class data from the API
	  getUpdatedClasssData(classId){
		  var xhr = new XMLHttpRequest()
		  var $this = this;
		  xhr.open("GET", "https://xkopkui840.execute-api.us-east-1.amazonaws.com/prod/camp/getAttendance/"+$this.webflowMemberId, true)
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
	  // Initializes the ClassData class
	  constructor(webflowMemberId){
		  this.webflowMemberId = webflowMemberId;
		  // element for handling api responce message message
		  this.noRecordAPIDiv = document.querySelector('[data-container="no-record-found"]');
		  this.spinner = document.getElementById("half-circle-spinner");
		  this.portalInfoWrapper = document.querySelector('.portal-info-wrapper');
		  
		  this.getClasssData();
	  }
	  // Fetches class data from the API and initializes checkInForm
	  getClasssData(){
		  var xhr = new XMLHttpRequest()
		  var $this = this;
		  if ($this.portalInfoWrapper) {
			  $this.portalInfoWrapper.style.display = "none";
		  }
		  if ($this.spinner) {
			  $this.spinner.style.display = "block";
		  }
		  xhr.open("GET", "https://xkopkui840.execute-api.us-east-1.amazonaws.com/prod/camp/getAttendance/"+$this.webflowMemberId, true)
		  xhr.withCredentials = false
		  xhr.send()
		  xhr.onload = function() {
			  $this.portalInfoWrapper.style.display = "block";
			  $this.spinner.style.display = "none";
			  let responseText =  JSON.parse(xhr.responseText);
			  new checkInForm($this.webflowMemberId, responseText); 			
		  }
		  // error handling if api not working
		  xhr.onerror = function() {
			  $this.spinner.style.display = "none";
			  $this.portalInfoWrapper.style.display = "none";
			  $this.noRecordAPIDiv.style.display = "block";
		  }
	  }
  }
