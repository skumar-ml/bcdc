/*
* Using this class On the webflow class list page, we demonstrate dynamic time using the API
*/
class classLists {
	constructor(baseUrl) {
		this.baseUrl = baseUrl;
		this.renderPortalData();
	}
	// Calling API to get all class details like times, days and locations
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
	// Manipulating class timing from API data and rendering in the web page.
	viewClassLocations(classData){
		var timingElement = document.getElementsByClassName('location-dropdown-day-time');
		var detailsLinkElement = document.getElementsByClassName('main-button w-button');
		for(let i=0; i<timingElement.length; i++){
			let levelId = timingElement[i].getAttribute('levelId');
			let location = timingElement[i].getAttribute('location');
			var levelData = classData.filter(item=>item.levelId == levelId)	
			levelData.forEach(item=>{
				let locationData = item.location.filter(data => data.locationName == location)
				//console.log('locationData', locationData)
				if(locationData.length > 0){
					let timingData = locationData[0].timing
					var timingText = '';
					timingData.forEach((timeData,index)=>{
						timingText = timingText+' '+timeData.day+" "+timeData.startTime+"-"+timeData.endTime+"<br>";
					})
					//console.log(levelId, location, timingText)
					timingText = timingText.replace(/PM/g, "")
					timingText = timingText.replace(/AM/g, "")
					timingElement[i].innerHTML = timingText;
				}else{
					timingElement[i].parentElement.parentElement.parentElement.style.display = 'none'
				}
			})
			
		}
		for(let j=0; j<detailsLinkElement.length; j++){
			let linkLevelId = detailsLinkElement[j].getAttribute('levelId');
			if(linkLevelId){
				detailsLinkElement[j].href = 'https://www.bergendebate.com/portal/class-details?levelId='+linkLevelId;
			}
		}
		var spinner = document.getElementById('half-circle-spinner');
		spinner.style.display = 'none';
	}
	// Passing every class data to the viewClassLocations method and manipulating data there.
	async renderPortalData() {
		try {
		  var spinner = document.getElementById('half-circle-spinner');
		  spinner.style.display = 'block';
		  const data = await this.fetchData('getClassDetails?levelId=');
		  var $this = this;
		  var listsData = data[0];
		  this.viewClassLocations(listsData);
		  
		} catch (error) {
			console.error('Error rendering random number:', error);
		}
	}
}
