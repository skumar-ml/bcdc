/*

Purpose: Simple logger that posts member sign-in activity to the backend. Tracks daily sign-in counts for analytics.

Brief Logic: Sends POST request to signInActivity API endpoint with member ID to record sign-in event. Based on 1-day sign-in count tracking.

Are there any dependent JS files: No

*/
class SigninActivity {
	// Initializes the class with the Webflow member ID
	constructor(webflowMemberId){
		this.webflowMemberId = webflowMemberId;
		this.InsertSignInData();
	}
	// Sends a POST request to record sign-in activity
	InsertSignInData(){
		var data = {
			 "memberId" : this.webflowMemberId
		}
		bdcFetch(`${window.BDC_API.member}signInActivity`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data)
		})
			.then(function(response) { return response.text(); })
			.then(function(responseText) {
				console.log('responseText', responseText)
			});
	}
}

