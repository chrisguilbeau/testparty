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
  if ($.inArray(Meteor.user().services.google.email, Tests.findOne(testId).members) > -1)
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
  alert(1);
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
  Meteor.call("createProject", name);
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

function changeProject(e){
  SessionAmplify.set('currentProjectId', $(e.target).val());
}

Meteor.subscribe("projects");
Meteor.subscribe("tests");
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
  'change select': changeProject,
});

Template.commands.events({
  'click button.modal-invoke': modalInvoke,
});

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

Template.modals.events({
  'click button.modal-close': modalClose,
  'click button.modal-project-save': modalProjectSave,
  'click button.modal-member-save': modalMemberSave,
  'click button.modal-test-save': modalTestSave,
  'click button.modal-import-save': modalImportSave
});