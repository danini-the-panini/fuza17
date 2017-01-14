
$(document).on('turbolinks:load', () => {
  const things = $('#things');

  if (things.length === 0) return;

  const gameId = things.data('game-id');
  App.game = App.cable.subscriptions.create({
    channel: "GamesChannel",
    gameId: ''
  }, {
    connected() {},

    disconnected() {},

    received(data) {
      things.append(`<li>${data.message}</li>`)
    },

    doAThing(message, gameId) {
      return this.perform('do_a_thing', { game_id: gameId });
    }
  });
});
