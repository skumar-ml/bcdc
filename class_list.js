/*

Purpose: Displays dynamic class listings on the Webflow class list page by fetching class details from API and rendering times, days, and locations for each class level.

Brief Logic: Fetches class details from API endpoint, filters classes by level and location, dynamically updates timing information in DOM elements, and shows/hides class cards based on availability.

Are there any dependent JS files: No

*/
class classLists {
	// Initializes the classLists class with base URL
	constructor(baseUrl) {
		this.baseUrl = baseUrl;
		this.renderPortalData();
	}
	// Fetches class data from the API endpoint
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
	// Renders class timing data from API into the web page
	viewClassLocations(classData){
		var timingElement = document.getElementsByClassName('location-dropdown-day-time');
		var detailsLinkElement = document.getElementsByClassName('main-button w-button');
		for(let i=0; i<timingElement.length; i++){
			timingElement[i].parentElement.parentElement.parentElement.style.display = 'none'
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
						let endTime = timeData.endTime.replace(/^0/, '')
						timingText = timingText+' '+timeData.day+" "+timeData.startTime+"-"+endTime+"<br>";
					})
					//console.log(levelId, location, timingText)
					timingText = timingText.replace(/PM/g, "")
					timingText = timingText.replace(/AM/g, "")
					timingElement[i].innerHTML = timingText;
					timingElement[i].parentElement.parentElement.parentElement.style.display = 'block'
				}else{
					timingElement[i].parentElement.parentElement.parentElement.style.display = 'none'
				}
			})
			
		}
		for(let j=0; j<detailsLinkElement.length; j++){
			let linkLevelId = detailsLinkElement[j].getAttribute('levelId');
			if(linkLevelId){
				var levelIdData = classData.filter(item=>item.levelId == linkLevelId)
				console.log('levelIdData', levelIdData)
				if(levelIdData.length <= 0){
					detailsLinkElement[j].style.display = 'none'
					detailsLinkElement[j].parentElement.parentElement.parentElement.parentElement.parentElement.style.display = 'none'
				}
				//detailsLinkElement[j].href = 'https://www.bergendebate.com/portal/class-details?levelId='+linkLevelId;
			}
		}
		var spinner = document.getElementById('half-circle-spinner');
		spinner.style.display = 'none';
	}
	// Fetches class data and renders it using viewClassLocations
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
