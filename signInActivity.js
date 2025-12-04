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
		var xhr = new XMLHttpRequest()
		var $this = this;
		xhr.open("POST", "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/signInActivity", true)
		xhr.withCredentials = false
		xhr.send(JSON.stringify(data))
		xhr.onload = function() {
			let responseText = xhr.responseText;
			console.log('responseText', responseText)
		}
	}
}

