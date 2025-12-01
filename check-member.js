/*

Purpose: Lightweight membership verifier that hits the checkMemberExists API and fills status fields to verify member existence across MongoDB, Memberstack, and Webflow.

Brief Logic: Calls checkMemberExists API with Webflow member ID to verify member existence across different systems. Updates status fields in UI based on verification results.

Are there any dependent JS files: No

*/
class checkMember {
	constructor(webflowMemberId){
		this.webflowMemberId = webflowMemberId;
		this.checkMemberData();
	}
	// Get API data with the help of endpoint
	async fetchData(url) {
		try {
			const response = await fetch(`${url}`);
			if (!response.ok) {
			throw new Error('Network response was not ok');
			}
			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Error fetching data:', error);
			return false;
		}
	}
	async checkMemberData(){
		var checkMember = await this.fetchData('https://mxqvqi3685.execute-api.us-east-1.amazonaws.com/prod/camp/checkMemberExists/'+this.webflowMemberId)
		if(checkMember){
			var exists_in_memberstack = document.getElementById('exists_in_memberstack')
			var exists_in_mongodb = document.getElementById('exists_in_mongodb')
			var exists_in_webflow = document.getElementById('exists_in_webflow')
			exists_in_memberstack.value = checkMember.exists_in_memberstack
			exists_in_mongodb.value = checkMember.exists_in_mongodb
			exists_in_webflow.value = checkMember.exists_in_webflow
		}
	}
}

