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
 * Used PortalTabs class name to integrate with portal js easily.
 * In this API we pass apiBaseUrl, webflowMemberId, accountEmail.
 * In this class we are manipulating student data and creating makeup session links for students
 */
class PortalTabs {
	
	constructor(apiBaseUrl, webflowMemberId,accountEmail) {
		this.baseUrl = apiBaseUrl;
		this.webflowMemberId = webflowMemberId;
		this.accountEmail = accountEmail;
		this.renderPortalData();
	}
	// Passing all student data and creating student link
	createMakeUpSession(data){
		// Getting main dom element object to add student list with link
		var studentList = document.getElementById('make_up_session');
		studentList.innerHTML = "";
		data.forEach((sData)=>{
			// Getting single student list
			var sList = this.createStudentList(sData);
				studentList.appendChild(sList);
		})
	}
	// Manipulating single student list
	createStudentList(studentData){
		var wLayoutGrid = creEl('div', 'w-layout-grid make-student-data');
		var sName = creEl('h4')
		
		var classLevel = (studentData.classDetail != null)? studentData.classDetail.classLevel : '';
		// Creating student name with class details
		sName.innerHTML = studentData.studentDetail.studentName+" ( "+classLevel+" - "+studentData.classLoactionDeatils.locationName+' - '+studentData.classDetail.startTime+")";
				
		var btnSection = creEl('div', 'link-container');
		var link = creEl('a', 'main-button w-button')
		link.innerHTML = "Schedule Make Up Session";
		// Passing dynamic data to acuity scheduling link
		link.href = 'https://bergendebate.as.me/schedule.php?appointmentType=51374724&field:12876955='+studentData.studentDetail.studentName+'&field:13727280='+studentData.studentDetail.parentEmail;
		link.target = '_blank';
		btnSection.appendChild(link)
		wLayoutGrid.appendChild(sName)
		wLayoutGrid.appendChild(btnSection)
		return wLayoutGrid;
	}
	// Get API data with the help of an endpoint
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
	// After the API response we call the createMakeUpSession method to manipulate student data
	async renderPortalData(memberId) {
		try {
		  const data = await this.fetchData('getInvoiceDetail/'+this.webflowMemberId);
		  this.createMakeUpSession(data)
		} catch (error) {
			console.error('Error rendering random number:', error);
		}
	}
}
