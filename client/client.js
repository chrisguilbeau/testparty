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
  if (test){
    var members = [];
    $(test.members).each(function(i, member){
        members.push(member.split("@")[0]);
        });
    return members.join(', ');
  }
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
    var fileInput = $('.modal-import-file')[0].files;
    var file = fileInput[0];
    var reader = new FileReader();
    reader.onload = function(e) {
        var content = reader.result;
        var tests = content.csvToArray({rSep: '\n'});
        console.log(tests);
        $.each(tests, function(i, test){
                testInsert(test[0], test[1], test[2]);
            }
            );
    }
    reader.readAsText(file);
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

function stepsEdit(e){
    var el = $(e.target);
    if (!el.hasClass('steps'))
        el = el.parents('.steps');
    el.attr('contenteditable', true);
}

function stepsEditCommit(e){
  var steps = $(e.target);
  var testId = steps.attr('testId');
  var text = steps.html()
  Tests.update({_id: testId}, {$set: {steps: text}});
  steps.attr('contenteditable', false);
}

function testCapabilityEdit(e){
    $(e.target).attr('contenteditable', true);
}

function testCapabilityEditCommit(e){
    var cap = $(e.target);
    var testId = cap.attr('testId');
    var text = cap.text();
    Tests.update({_id: testId}, {$set: {capability: text}});
    cap.attr('contenteditable', false);
}

function testComponentEdit(e){
    $(e.target).attr('contenteditable', true);
}

function testComponentEditCommit(e){
    var comp = $(e.target);
    var testId = comp.attr('testId');
    var text = comp.text();
    Tests.update({_id: testId}, {$set: {component: text}});
    comp.attr('contenteditable', false);
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

function testResetAll(e){
  if (confirm("Are you sure you want to reset all the tests? This can't be undone!")){
    Tests.find({projectId: SessionAmplify.get('currentProjectId')}).forEach(
      function(test){
        Tests.update({_id: test._id}, {$set: {status: ""}});
      }
      );
  }
}

function testStatusChange(e){
  var testId = $(e.target).attr('testId');
  var status = $(e.target).attr('status');
  var members = Tests.findOne(testId).members;
  var email = Meteor.user().services.google.email;
  var emailIndex = $.inArray(email, members);
  members.splice(emailIndex, 1);
  Tests.update({_id: testId}, {$set: {status: status, members: members, statusSetBy: email}});
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
  'change select': projectChange
});

Template.members.events({
  'click div.member-remove': memberRemove
});

Template.members.formatMember = function(email){
    return email.split("@")[0]
}

Template.members.score = function(email){
    var pass = Tests.find({statusSetBy: email, status: 'pass'}).count();
    var fail = Tests.find({statusSetBy: email, status: 'fail'}).count();
    var num = pass + fail;
    return num
}

Template.members.pos = function(email){
    var size = 34;
    var cols = 14;
    var num = Template.members.score(email);
    function getPos(){
        function getRow(){
            return Math.floor(num/cols);
        }
        function getCol(){
            return num % cols;
        }
        return getCol() * -1 * size + 'px ' + getRow() * -1 * size + 'px';
    }
    return getPos();
}

Template.commands.events({
  'click button.modal-invoke': modalInvoke,
  'click button.test-reset-all': testResetAll,
  'click button.project-delete': projectDelete
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

Template.workspace.format = function(text){
    if (text.length > 0)
        return text
    else return ' -- ';
}

Template.workspace.formatSteps = function(steps){
    console.log(steps);
    return steps.replace('\n', '<br>');
}

Template.workspace.test = function(){
  if (Meteor.user().services)
    return Tests.find(
      {projectId: SessionAmplify.get('currentProjectId'), members: Meteor.user().services.google.email},
      {sort: {component: 1, capability: 1, steps: 1, _id: 1}}
      );
}

Template.workspace.events({
  'click button.test-status-change': testStatusChange,
  'click button.test-delete': testDelete,
  'dblclick span.work-test-name-component': testComponentEdit,
  'blur span.work-test-name-component': testComponentEditCommit,
  'dblclick span.work-test-name-capability': testCapabilityEdit,
  'blur span.work-test-name-capability': testCapabilityEditCommit,
  'dblclick div.steps': stepsEdit,
  'blur div.steps': stepsEditCommit
});

Template.modals.events({
  'click button.modal-close': modalClose,
  'click button.modal-project-save': modalProjectSave,
  'click button.modal-member-save': modalMemberSave,
  'click button.modal-test-save': modalTestSave,
  'click button.modal-import-save': modalImportSave
});

