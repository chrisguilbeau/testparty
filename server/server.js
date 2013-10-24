Meteor.publish(
  "currentUserData",
  function(){
    return Meteor.users.find(
      {},
      {
        fields : {'services.google.email' : 1}
      }
      );
  }
);

Meteor.publish(
  "projects",
  function(){
    userId = this.userId;
    if (userId){
      var user = Meteor.users.findOne(this.userId);
      return Projects.find({members : user.services.google.email});
    }
  }
);

Meteor.publish(
  "tests",
  function(currentProjectId){
    userId = this.userId;
    if (userId){
      var user = Meteor.users.findOne(this.userId);
      var projectIds = [];
      Projects.find({members : user.services.google.email}).forEach(
        function(project){
          projectIds.push(project._id);
        }
        );
      return Tests.find({projectId: currentProjectId, projectId: {$in: projectIds}});
    }
  }
);
