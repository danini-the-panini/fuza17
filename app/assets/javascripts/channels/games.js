const App = require('../cable');

$(document).on('turbolinks:load', () => {
  if (App.game) {
    App.game.unsubscribe();
  }

  const things = $('#things');

  if (things.length === 0) return;

  const gameId = things.data('game-id');
  App.game = App.cable.subscriptions.create({
    channel: 'GamesChannel',
    game_id: things.data('game-id')
  }, {
    connected() {},

    disconnected() {},

    received(data) {
      things.append(`<li>${data.message}</li>`)
    },

    doAThing(game_id) {
      return this.perform('do_a_thing', { game_id });
    }
  });
});
