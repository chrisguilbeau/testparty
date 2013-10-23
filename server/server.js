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
  function(){
    return Tests.find();
  }
);

Meteor.methods({
  createProject: function(name){
    Projects.insert({
      name: name,
      members: [Meteor.user().services.google.email]
      });
    return 0;
  }
});
