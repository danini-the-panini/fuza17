
(function() {
  this.App || (this.App = {});

  App.cable = ActionCable.createConsumer();

}).call(window);

module.exports = window.App;
