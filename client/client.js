SessionAmplify = _.extend({}, Session, {
  keys: _.object(_.map(amplify.store(), function(value, key) {
    return [key, JSON.stringify(value)]
  })),
  set: function (key, value) {
    Session.set.apply(this, arguments);
    amplify.store(key, value);
  },
});

Handlebars.registerHelper("authenticated", function() {
  return !!Meteor.user();
});

Handlebars.registerHelper("isProjectSelected", function() {
  return !!SessionAmplify.get("currentProjectId");
});

Handlebars.registerHelper("isTestChecked", function(testId) {
  var test = Tests.findOne(testId);
  if (test && $.inArray(Meteor.user().services.google.email, test.members) > -1)
    return "checked";
});

Handlebars.registerHelper("projectMembers", function(){
  var proj = Projects.findOne({_id: SessionAmplify.get("currentProjectId")});
  if (proj)
    return proj.members;
});

Handlebars.registerHelper("testMembers", function(testId){
  var test = Tests.findOne(testId);
  if (test)
    return test.members.join(', ');
});

function memberRemove(e){
  var projectId = SessionAmplify.get('currentProjectId');
  var members = Projects.findOne(projectId).members;
  var email = $(e.target).attr('email');
  var emailIndex = $.inArray(email, members);
  members.splice(emailIndex, 1);
  Projects.update({_id: projectId}, {$set: {members: members}});
  if (email == Meteor.user().services.google.email)
    SessionAmplify.set('currentProjectId', "");

}

function modalInvoke(e){
  $('.modal-screen').show();
  $('.modal#' + $(e.target).attr('modal')).show(100);
}

function modalClose(e){
  e.preventDefault();
  $(e.target).parents('.modal').hide(100);
  $('.modal-screen').hide();
}

function modalGetVal(e, className){
  var modal = $(e.target).parents('.modal');
  return modal.find('.' + className).val();
}

function modalImportSave(e){
  var fileText = modalGetVal(e, 'modal-import-file');
  $.each(fileText.split('\n'), function(i, line){
    if ($.trim(line)){
      var obj = JSON.parse(line);
      testInsert(obj.component, obj.capability, obj.steps);
    }
  });
  modalClose(e);
}

function modalProjectSave(e){
  var name = modalGetVal(e, 'modal-project-name');
  // TODO: Validation?
  var projectId = Projects.insert({
    name: name,
    members: [Meteor.user().services.google.email]
    });
  SessionAmplify.set('currentProjectId', projectId);
  modalClose(e);
}

function modalMemberSave(e){
  var email = modalGetVal(e, 'modal-member-email');
  var currentProjectId = SessionAmplify.get('currentProjectId');
  var members = Projects.findOne(currentProjectId).members;
  if ($.inArray(email, members) == -1){
    members.push(email);
    Projects.update({_id: currentProjectId}, {$set: {members: members}});
    modalClose(e);
  }
  else
    alert("Already a member!");
}

function modalTestSave(e){
  var component = modalGetVal(e, 'modal-test-component');
  var capability = modalGetVal(e, 'modal-test-capability');
  var steps = modalGetVal(e, 'modal-test-steps');
  testInsert(component, capability, steps);
  modalClose(e);
}

function projectChange(e){
  SessionAmplify.set('currentProjectId', $(e.target).val());
}

function projectDelete(e){
  if (confirm('Are you sure you want to delete this project? All will be lost forever!')) {
    tests = Tests.find({projectId: SessionAmplify.get('currentProjectId')});
    tests.forEach(function(test){
      Tests.remove(test._id)
    });
    Projects.remove(SessionAmplify.get('currentProjectId'));
    SessionAmplify.set('currentProjectId', "");
  }
}

function testCheckboxClicked(e){
  var checkbox = $(e.target);
  var checked = checkbox.prop('checked');
  var testId = checkbox.attr('testId');
  var members = Tests.findOne(testId).members;
  var email = Meteor.user().services.google.email;
  var emailIndex = $.inArray(email, members);
  if (checked && emailIndex == -1){
    members.push(email);
  }
  else{
    members.splice(emailIndex, 1);
  }
  Tests.update({_id: testId}, {$set: {members: members}});
}

function testDelete(e){
  if (confirm("Are you sure? This can't be undone!")){
    var testId = $(e.target).attr('testId');
    Tests.remove(testId);
  }
}

function testInsert(component, capability, steps){
  Tests.insert({
    projectId: SessionAmplify.get('currentProjectId'),
    component: component,
    capability: capability,
    steps: steps,
    status: "",
    members: []
  });
}

function testStatusChange(e){
  var testId = $(e.target).attr('testId');
  var status = $(e.target).attr('status');
  var members = Tests.findOne(testId).members;
  var email = Meteor.user().services.google.email;
  var emailIndex = $.inArray(email, members);
  members.splice(emailIndex, 1);
  Tests.update({_id: testId}, {$set: {status: status, members: members}});
}

Meteor.subscribe("projects");
Deps.autorun(function () {
  Meteor.subscribe("tests", SessionAmplify.get("currentProjectId"));
});
Meteor.subscribe("currentUserData");

Template.project.project = function(){
  return Projects.find();
}

Template.project.selected = function(_id){
  if (_id == SessionAmplify.get("currentProjectId"))
    return "selected"
}

Template.project.events({
  'click button.modal-invoke': modalInvoke,
  'change select': projectChange,
});

Template.members.events({
  'click div.member-remove': memberRemove
});

Template.commands.events({
  'click button.modal-invoke': modalInvoke,
  'click button.project-delete': projectDelete,
});

Template.stats.tests = function(){
  return Tests.find({projectId: SessionAmplify.get('currentProjectId')}).count();
}

Template.stats.passed = function(){
  return Tests.find({projectId: SessionAmplify.get('currentProjectId'), status: "pass"}).count();
}

Template.stats.failed = function(){
  return Tests.find({projectId: SessionAmplify.get('currentProjectId'), status: "fail"}).count();
}

Template.tests.test = function(){
  return Tests.find({projectId: SessionAmplify.get('currentProjectId')}, {sort: {component: 1, capability: 1, steps: 1, _id: 1}});
}

Template.tests.events({
  'click input[type=checkbox]': testCheckboxClicked
});

Template.workspace.test = function(){
  if (Meteor.user().services)
    return Tests.find(
      {projectId: SessionAmplify.get('currentProjectId'), members: Meteor.user().services.google.email},
      {sort: {component: 1, capability: 1, steps: 1, _id: 1}}
      );
}

Template.workspace.events({
  'click button.test-status-change': testStatusChange,
  'click button.test-delete': testDelete
});

Template.modals.events({
  'click button.modal-close': modalClose,
  'click button.modal-project-save': modalProjectSave,
  'click button.modal-member-save': modalMemberSave,
  'click button.modal-test-save': modalTestSave,
  'click button.modal-import-save': modalImportSave
});
