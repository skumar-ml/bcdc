/*
* Inserting member sign-in record in the database. It is based on a 1-day sign-in count.
*/
class SigninActivity {
	constructor(webflowMemberId){
		this.webflowMemberId = webflowMemberId;
		this.InsertSignInData();
	}
	// Inserting Sign In record in the database
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

