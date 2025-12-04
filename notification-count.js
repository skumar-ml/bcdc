/*

Purpose: Fetches unread notifications and injects the badge count beside the bell icon in the menu section.

Brief Logic: Calls notification API to get all notifications, filters unread notifications, calculates count, and updates the notification badge element in the menu with the unread count.

Are there any dependent JS files: No

*/
class NotificationCount {
	// Initializes the class with the member ID
	constructor(webflowMemberId){
		this.webflowMemberId = webflowMemberId;
		this.getNotificationData();
	}
	// Updates the notification count badge in the DOM
	displayUnreadMessage(messageData){
		var notificationBudge = document.getElementsByClassName("notification-budge")[0];
		var notificationCount = document.getElementsByClassName("notification-count")[0];
		if(notificationBudge){
			if(notificationCount){
				notificationCount.remove();
			}
			var unreadMessage = messageData.filter(data => !data.is_read)
			var notificationMessage = creEl('span', 'notification-count');
			notificationMessage.innerHTML = unreadMessage.length;
			//notificationBudge.setAttribute('data-count', unreadMessage.length);
			notificationBudge.appendChild(notificationMessage)
		}
	}
	// Calls the notification API and passes data to displayUnreadMessage
	getNotificationData(){
		var xhr = new XMLHttpRequest()
		var $this = this;
		xhr.open("GET", "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/getNotifications/"+$this.webflowMemberId, true)
		xhr.withCredentials = false
		xhr.send()
		xhr.onload = function() {
			let responseText =  JSON.parse(xhr.responseText);
			$this.displayUnreadMessage(responseText)
		}
	}
}
