Projects = new Meteor.Collection("projects");
_project = {
	name: "Windows",
	members: ["bill@microsoft.com"]
}

Tests = new Meteor.Collection("tests");
_test = {
	projectId: "_OP09PLYCCY",
	component: "Start Menu",
	capability: "Shutdown",
	steps: "1) click start menu\n2) click shutdown",
	status: "passed",
	members: ["bill@microsoft.com"]
}
